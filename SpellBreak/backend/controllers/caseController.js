const caseModel = require("../models/caseModel");
const caseRules = require("../services/caseRules");

// SCRUM-26: a customer sends a report. Saves it as a new case for staff to triage.
async function createCase(req, res) {
  try {
    const priority = caseRules.priorityFromRisk(req.body.risk_score);
    const id = await caseModel.createCase(req.user.id, req.body, priority);

    res.status(201).json({
      id,
      ref: caseRules.caseRef(id),
      message: "Sent to OCBC. The triage team will review your case.",
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error sending your report" });
  }
}

// SCRUM-25: every reported case, plus the numbers for the tiles and tabs
async function listCases(req, res) {
  try {
    const [rows, triageSeconds] = await Promise.all([caseModel.listCases(), caseModel.getTriageSeconds()]);
    const cases = rows.map(caseRules.formatCase);

    res.status(200).json({ cases, summary: caseRules.summarise(cases, triageSeconds) });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error retrieving cases" });
  }
}

// SCRUM-25 + SCRUM-27: one case with its full audit trail
async function getCase(req, res) {
  try {
    const id = parseInt(req.params.id);
    const row = await caseModel.getCaseById(id);
    if (!row) {
      return res.status(404).json({ error: "Case not found" });
    }

    const events = await caseModel.getCaseEvents(id);
    res.status(200).json({ case: caseRules.formatCase(row), events: events.map(caseRules.formatEvent) });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error retrieving case" });
  }
}

// SCRUM-27: contact / escalate / mark scam / release / add a note, each written to the audit trail
async function applyAction(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { action, note } = req.body;

    const row = await caseModel.getCaseById(id);
    if (!row) {
      return res.status(404).json({ error: "Case not found" });
    }

    const plan = caseRules.planAction({ status: row.status, risk: row.risk_score || 0 }, action, note);
    if (!plan.ok) {
      return res.status(plan.status).json({ error: plan.error });
    }

    const result = await caseModel.applyAction(id, req.user.id, plan);
    if (result.conflict) {
      return res.status(409).json({ error: "Someone just updated this case. Refresh to see the latest status." });
    }

    const [updated, events] = await Promise.all([caseModel.getCaseById(id), caseModel.getCaseEvents(id)]);
    res.status(200).json({ case: caseRules.formatCase(updated), events: events.map(caseRules.formatEvent) });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error updating case" });
  }
}

module.exports = {
  createCase,
  listCases,
  getCase,
  applyAction,
};
