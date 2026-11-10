const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Map the AI's 3 levels onto the ContentChecks.risk_level column
const RISK_LEVEL = { likely_scam: "high", some_signs: "medium", no_common_signs: "low" };
const LEVEL_FROM_RISK = { high: "likely_scam", medium: "some_signs", low: "no_common_signs" };

// Save one check. Only the MASKED text is stored, never the original.
// Uploaded images are not stored (media_url stays null) to keep personal data out of the database.
async function createCheck({ userId, mediaType, source, maskedText, result }) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("user_id", sql.Int, userId);
    request.input("media_type", sql.VarChar, mediaType);
    request.input("source", sql.VarChar, source || null);
    request.input("transcript", sql.NVarChar, maskedText || null);
    request.input("ai_score", sql.Decimal(5, 2), Math.round(result.confidence * 10000) / 100); // confidence as 0-100
    request.input("risk_level", sql.VarChar, RISK_LEVEL[result.level]);
    request.input("scam_type", sql.VarChar, result.scam_type);
    request.input(
      "signals",
      sql.NVarChar,
      JSON.stringify({ tricks: result.tricks, extracted: result.extracted, ai_indicators: result.ai_indicators })
    );
    request.input(
      "explanation",
      sql.NVarChar,
      JSON.stringify({
        claimed_identity: result.claimed_identity,
        requested_action: result.requested_action,
        safe_actions: result.safe_actions,
      })
    );

    const res = await request.query(`
      INSERT INTO ContentChecks (user_id, media_type, source, transcript, ai_score, risk_level, scam_type, signals, explanation)
      VALUES (@user_id, @media_type, @source, @transcript, @ai_score, @risk_level, @scam_type, @signals, @explanation);
      SELECT SCOPE_IDENTITY() AS id;
    `);
    return res.recordset[0].id;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// Turns a database row back into the same result format the API returns
function rowToCheck(row) {
  const signals = row.signals ? JSON.parse(row.signals) : {};
  const explanation = row.explanation ? JSON.parse(row.explanation) : {};
  return {
    id: row.id,
    media_type: row.media_type,
    source: row.source,
    text: row.transcript,
    created_at: row.created_at,
    result: {
      level: LEVEL_FROM_RISK[row.risk_level],
      confidence: row.ai_score === null ? null : Number(row.ai_score) / 100,
      claimed_identity: explanation.claimed_identity || "",
      requested_action: explanation.requested_action || "",
      tricks: signals.tricks || [],
      extracted: signals.extracted || { links: [], phone_numbers: [], bank_accounts: [] },
      scam_type: row.scam_type,
      ai_indicators: signals.ai_indicators || {},
      safe_actions: explanation.safe_actions || [],
    },
  };
}

// A customer's own checks, newest first
async function getChecksByUser(userId) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("user_id", sql.Int, userId);
    const res = await request.query(`
      SELECT TOP 50 id, media_type, source, transcript, ai_score, risk_level, scam_type, signals, explanation, created_at
      FROM ContentChecks
      WHERE user_id = @user_id
      ORDER BY created_at DESC
    `);
    return res.recordset.map(rowToCheck);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// One check, scoped to its owner so customers can't read each other's checks
async function getCheckById(checkId, userId) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, checkId);
    request.input("user_id", sql.Int, userId);
    const res = await request.query(`
      SELECT id, media_type, source, transcript, ai_score, risk_level, scam_type, signals, explanation, created_at
      FROM ContentChecks
      WHERE id = @id AND user_id = @user_id
    `);
    return res.recordset[0] ? rowToCheck(res.recordset[0]) : null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = {
  createCheck,
  getChecksByUser,
  getCheckById,
  rowToCheck,
};
