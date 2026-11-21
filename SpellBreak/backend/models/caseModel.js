const sql = require("mssql");
const dbConfig = require("../dbConfig");

// A case with the reporter's and the handling employee's names
const CASE_SELECT = `
  SELECT c.id, c.reporter_id, c.assigned_to, c.status, c.priority, c.summary, c.risk_score, c.amount,
         c.amount_note, c.scam_type, c.looks_like, c.source, c.evidence, c.signals, c.resolution,
         c.created_at, c.updated_at, r.name AS reporter_name, a.name AS assignee_name
  FROM Cases c
  JOIN Users r ON r.id = c.reporter_id
  LEFT JOIN Users a ON a.id = c.assigned_to
`;

async function rollbackQuietly(transaction) {
  try {
    await transaction.rollback();
  } catch (error) {
    // already rolled back by the driver, nothing more to do
  }
}

// SCRUM-26: one-tap report. Saves the case and its first audit-trail event together,
// so a case can never exist without a "created" entry.
async function createCase(reporterId, data, priority) {
  const connection = await sql.connect(dbConfig);
  const transaction = new sql.Transaction(connection);
  await transaction.begin();

  try {
    const insertCase = new sql.Request(transaction);
    insertCase.input("reporter_id", sql.Int, reporterId);
    insertCase.input("priority", sql.VarChar, priority);
    insertCase.input("summary", sql.NVarChar(sql.MAX), data.summary || null);
    insertCase.input("risk_score", sql.Int, data.risk_score);
    insertCase.input("amount", sql.Decimal(12, 2), data.amount === undefined ? null : data.amount);
    insertCase.input("amount_note", sql.NVarChar(150), data.amount_note || null);
    insertCase.input("scam_type", sql.VarChar(50), data.scam_type);
    insertCase.input("looks_like", sql.NVarChar(150), data.looks_like);
    insertCase.input("source", sql.NVarChar(100), data.source);
    insertCase.input("evidence", sql.NVarChar(sql.MAX), data.evidence);
    insertCase.input("signals", sql.NVarChar(sql.MAX), JSON.stringify(data.signals || []));

    const created = await insertCase.query(`
      INSERT INTO Cases (reporter_id, status, priority, summary, risk_score, amount, amount_note,
                         scam_type, looks_like, source, evidence, signals)
      OUTPUT INSERTED.id
      VALUES (@reporter_id, 'new', @priority, @summary, @risk_score, @amount, @amount_note,
              @scam_type, @looks_like, @source, @evidence, @signals)
    `);
    const caseId = created.recordset[0].id;

    const insertEvent = new sql.Request(transaction);
    insertEvent.input("case_id", sql.Int, caseId);
    insertEvent.input("actor_user_id", sql.Int, reporterId);
    insertEvent.input("details", sql.NVarChar(sql.MAX), JSON.stringify({ action: "report", note: "Customer sent this case to OCBC" }));
    await insertEvent.query(`
      INSERT INTO CaseEvents (case_id, actor_user_id, event_type, details)
      VALUES (@case_id, @actor_user_id, 'created', @details)
    `);

    await transaction.commit();
    return caseId;
  } catch (error) {
    await rollbackQuietly(transaction);
    console.error("Database error:", error);
    throw error;
  }
}

// SCRUM-25: all cases for the dashboard. Open cases first, then by risk, then by amount.
async function listCases() {
  try {
    const connection = await sql.connect(dbConfig);
    const result = await connection.request().query(`
      SELECT TOP 500 * FROM (${CASE_SELECT}) AS cases
      ORDER BY CASE WHEN status = 'closed' THEN 1 ELSE 0 END,
               risk_score DESC, ISNULL(amount, 0) DESC, created_at DESC
    `);
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// Seconds from "reported" to the first real triage step, one number per triaged case.
// A note does not count as triage, only contacting, escalating, releasing or marking scam.
async function getTriageSeconds() {
  try {
    const connection = await sql.connect(dbConfig);
    const result = await connection.request().query(`
      SELECT DATEDIFF(SECOND, c.created_at, MIN(e.created_at)) AS seconds
      FROM Cases c
      JOIN CaseEvents e ON e.case_id = c.id AND e.event_type IN ('status_change', 'escalated')
      GROUP BY c.id, c.created_at
    `);
    return result.recordset.map((row) => row.seconds);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

async function getCaseById(id) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, id);
    const result = await request.query(`${CASE_SELECT} WHERE c.id = @id`);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// SCRUM-27: the audit trail, oldest first
async function getCaseEvents(caseId) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("case_id", sql.Int, caseId);
    const result = await request.query(`
      SELECT e.id, e.event_type, e.details, e.created_at, u.name AS actor_name
      FROM CaseEvents e
      LEFT JOIN Users u ON u.id = e.actor_user_id
      WHERE e.case_id = @case_id
      ORDER BY e.created_at, e.id
    `);
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// SCRUM-27: change the case and write the audit-trail entry in ONE transaction,
// so a status can never change without a record of who did it.
// The update only matches if the status is still what the employee saw. If someone
// else changed it first, nothing is written and { conflict: true } comes back.
async function applyAction(caseId, employeeId, plan) {
  const connection = await sql.connect(dbConfig);
  const transaction = new sql.Transaction(connection);
  await transaction.begin();

  try {
    const update = new sql.Request(transaction);
    update.input("id", sql.Int, caseId);
    update.input("employee_id", sql.Int, employeeId);
    update.input("from_status", sql.VarChar, plan.from);
    update.input("to_status", sql.VarChar, plan.to);
    update.input("resolution", sql.VarChar, plan.resolution);

    // A note leaves the status alone. Every other action sets it and takes ownership.
    const result = await update.query(
      plan.event === "note"
        ? `UPDATE Cases SET updated_at = SYSDATETIME() WHERE id = @id`
        : `UPDATE Cases
           SET status = @to_status,
               resolution = @resolution,
               assigned_to = COALESCE(assigned_to, @employee_id),
               updated_at = SYSDATETIME()
           WHERE id = @id AND status = @from_status`
    );

    if (result.rowsAffected[0] === 0) {
      await rollbackQuietly(transaction);
      return { conflict: true };
    }

    const insertEvent = new sql.Request(transaction);
    insertEvent.input("case_id", sql.Int, caseId);
    insertEvent.input("actor_user_id", sql.Int, employeeId);
    insertEvent.input("event_type", sql.VarChar, plan.event);
    insertEvent.input("details", sql.NVarChar(sql.MAX), JSON.stringify(plan.details));
    await insertEvent.query(`
      INSERT INTO CaseEvents (case_id, actor_user_id, event_type, details)
      VALUES (@case_id, @actor_user_id, @event_type, @details)
    `);

    await transaction.commit();
    return { conflict: false };
  } catch (error) {
    await rollbackQuietly(transaction);
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = {
  createCase,
  listCases,
  getTriageSeconds,
  getCaseById,
  getCaseEvents,
  applyAction,
};
