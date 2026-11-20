// Business rules for the Employee Triage Dashboard (SCRUM-25, SCRUM-27).
// Pure functions only: no database, no Express. That keeps the rules in one place
// and easy to test. Models do the SQL, controllers call these.

const HIGH_RISK = 80;
const MEDIUM_RISK = 50;
const MIN_REASON_LENGTH = 5;

// What each button on the dashboard does.
//   event:      which CaseEvents.event_type is written to the audit trail
//   to:         the new Cases.status (omitted = status does not change)
//   resolution: set when the case is closed
const ACTIONS = {
  contact: { event: "status_change", to: "in_review", label: "Contacted customer" },
  escalate: { event: "escalated", to: "escalated", label: "Escalated to a senior reviewer" },
  mark_scam: { event: "status_change", to: "closed", resolution: "scam", label: "Marked as scam" },
  release: { event: "status_change", to: "closed", resolution: "released", label: "Marked safe and released" },
  note: { event: "note", label: "Added a note" },
};

// Which status-changing actions are allowed from each status.
// A closed case is final. Staff can still add notes to it.
const ALLOWED_FROM = {
  new: ["contact", "escalate", "mark_scam", "release"],
  in_review: ["escalate", "mark_scam", "release"],
  escalated: ["mark_scam", "release"],
  closed: [],
};

const STATUS_LABELS = {
  new: "New",
  in_review: "In review",
  escalated: "Escalated",
};

// "RC-0041" style reference shown to staff and customers
function caseRef(id) {
  return `RC-${String(id).padStart(4, "0")}`;
}

function riskBand(score) {
  if (score >= HIGH_RISK) return "high";
  if (score >= MEDIUM_RISK) return "med";
  return "low";
}

// Cases.priority only allows low / medium / high
function priorityFromRisk(score) {
  const band = riskBand(score);
  return band === "med" ? "medium" : band;
}

function statusLabel(status, resolution) {
  if (status === "closed") return resolution === "scam" ? "Marked scam" : "Released";
  return STATUS_LABELS[status] || status;
}

function allowedActions(status) {
  return ALLOWED_FROM[status] || [];
}

// Decide what happens when staff press a button.
// current: { status, risk }.  Returns { ok: true, ... } or { ok: false, status, error }
function planAction(current, action, note) {
  const def = ACTIONS[action];
  if (!def) {
    return { ok: false, status: 400, error: "Unknown action." };
  }

  const text = typeof note === "string" ? note.trim() : "";

  if (action === "note") {
    if (!text) return { ok: false, status: 400, error: "Write a note first." };
    return { ok: true, event: def.event, from: current.status, to: current.status, resolution: null, details: { action, note: text } };
  }

  if (current.status === "closed") {
    return { ok: false, status: 409, error: "This case is already closed. You can still add a note." };
  }

  if (!allowedActions(current.status).includes(action)) {
    return {
      ok: false,
      status: 409,
      error: `This case is already “${statusLabel(current.status)}”, so “${def.label}” isn't available. Add a note instead.`,
    };
  }

  // Releasing a high-risk case is the one action that can lose a customer money,
  // so it needs a written reason in the audit trail.
  if (action === "release" && riskBand(current.risk) === "high" && text.length < MIN_REASON_LENGTH) {
    return { ok: false, status: 400, error: "Write a short reason before releasing a high-risk case." };
  }

  const details = { action, from: current.status, to: def.to };
  if (def.resolution) details.resolution = def.resolution;
  if (text) details.note = text;

  return { ok: true, event: def.event, from: current.status, to: def.to, resolution: def.resolution || null, details };
}

function parseJson(text, fallback) {
  if (typeof text !== "string" || text === "") return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

// One audit-trail row from the database -> what the dashboard shows
function formatEvent(row) {
  const parsed = parseJson(row.details, null);
  // Older or hand-typed rows may hold plain text instead of JSON
  const details = parsed && typeof parsed === "object" ? parsed : { note: row.details || "" };

  let action = details.action;
  if (!action) action = row.event_type === "created" ? "report" : row.event_type;

  const labels = { report: "Customer sent this case to OCBC", ...Object.fromEntries(Object.entries(ACTIONS).map(([k, v]) => [k, v.label])) };

  return {
    id: row.id,
    action,
    label: labels[action] || "Updated the case",
    note: details.note || "",
    actor: row.actor_name || (row.event_type === "created" ? "Customer" : "OCBC staff"),
    at: row.created_at,
  };
}

// One case row from the database -> API shape
function formatCase(row) {
  return {
    id: row.id,
    ref: caseRef(row.id),
    type: row.scam_type || "Other",
    risk: row.risk_score === null || row.risk_score === undefined ? 0 : row.risk_score,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    amountNote: row.amount_note || "",
    looksLike: row.looks_like || "",
    source: row.source || "",
    evidence: row.evidence || "",
    signals: parseJson(row.signals, []),
    summary: row.summary || "",
    status: row.status,
    resolution: row.resolution || null,
    statusLabel: statusLabel(row.status, row.resolution),
    allowedActions: allowedActions(row.status),
    customer: row.reporter_name,
    assignedTo: row.assignee_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function median(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Numbers for the four tiles and the risk tabs.
// triageSeconds: seconds from "reported" to the first status change, one per triaged case
function summarise(cases, triageSeconds) {
  const open = cases.filter((c) => c.status !== "closed");
  const m = median(triageSeconds);

  return {
    bands: {
      all: cases.length,
      high: cases.filter((c) => riskBand(c.risk) === "high").length,
      med: cases.filter((c) => riskBand(c.risk) === "med").length,
      low: cases.filter((c) => riskBand(c.risk) === "low").length,
    },
    open: open.length,
    highOpen: open.filter((c) => riskBand(c.risk) === "high").length,
    amountAtStake: open.reduce((sum, c) => sum + (c.amount || 0), 0),
    medianTriageMinutes: m === null ? null : Math.max(1, Math.round(m / 60)),
  };
}

module.exports = {
  HIGH_RISK,
  MEDIUM_RISK,
  MIN_REASON_LENGTH,
  ACTIONS,
  caseRef,
  riskBand,
  priorityFromRisk,
  statusLabel,
  allowedActions,
  planAction,
  formatEvent,
  formatCase,
  median,
  summarise,
};
