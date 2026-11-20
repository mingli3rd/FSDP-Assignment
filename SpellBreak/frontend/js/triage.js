// P8 Employee Triage Dashboard (staff portal).
// Cases come from the API (SCRUM-25). Every action is saved with an audit trail (SCRUM-27).
//   GET  /api/employee/cases               all cases + the numbers for the tiles and tabs
//   GET  /api/employee/cases/:id           one case + its audit trail
//   POST /api/employee/cases/:id/actions   { action, note } -> updated case + audit trail
// Needs an employee login. Customers and logged-out visitors see a message instead.

let cases = [];
let events = null; // null = still loading the audit trail for the selected case
let summary = { bands: { all: 0, high: 0, med: 0, low: 0 }, open: 0, highOpen: 0, amountAtStake: 0, medianTriageMinutes: null };
let filter = "all";
let query = "";
let selectedId = null;
let busy = false;

const riskBand = (r) => (r >= 80 ? "high" : r >= 50 ? "med" : "low");
const riskLevel = (r) => ({ high: "scam", med: "signs", low: "clear" }[riskBand(r)]);
const riskLabel = (r) => ({ high: "High", med: "Med", low: "Low" }[riskBand(r)]);
const money = (c) => (c.amount === null ? "Account" : `S$${c.amount.toLocaleString("en-SG")}`);
const STATUS_CLASS = { New: "info", "In review": "signs", Escalated: "scam", "Marked scam": "scam", Released: "clear" };

// The four buttons that change a case. "note" is handled separately because it never changes the status.
const ACTION_BUTTONS = [
  { act: "contact", label: "Contact customer", icon: "phone", style: "btn-secondary" },
  { act: "escalate", label: "Escalate", icon: "alert", style: "btn-secondary" },
  { act: "mark_scam", label: "Mark as scam", icon: "x", style: "btn-primary" },
  { act: "release", label: "Mark safe and release", icon: "check", style: "btn-ghost" },
];
const ACTION_DONE = {
  contact: "customer contact logged",
  escalate: "escalated",
  mark_scam: "marked as scam",
  release: "released",
  note: "note added",
};

// ---------- API ----------
async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // no JSON body
  }

  if (!response.ok) {
    const err = new Error((data && data.error) || `Something went wrong (${response.status}).`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// ---------- Small helpers ----------
const byId = (id) => cases.find((c) => c.id === id);

function upsertCase(updated) {
  const i = cases.findIndex((c) => c.id === updated.id);
  if (i === -1) cases.push(updated);
  else cases[i] = updated;
}

function formatWhen(value) {
  const d = new Date(value);
  if (isNaN(d)) return { date: "", time: "" };
  return {
    date: d.toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" }),
  };
}

function formatMinutes(m) {
  if (m === null || m === undefined) return "-";
  return m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`;
}

// ---------- Tiles, tabs and the case list ----------
function renderKpis() {
  document.getElementById("kpiOpen").textContent = summary.open;
  document.getElementById("kpiHigh").textContent = summary.highOpen;
  document.getElementById("kpiAmount").textContent = `S$${summary.amountAtStake.toLocaleString("en-SG")}`;
  document.getElementById("kpiTriage").textContent = formatMinutes(summary.medianTriageMinutes);
  document.getElementById("kpiHint").textContent = summary.bands.all
    ? `${summary.bands.all} reported ${summary.bands.all === 1 ? "case" : "cases"}. Open cases come first, highest risk on top.`
    : "No cases have been reported yet.";

  const names = { all: "All", high: "High", med: "Medium", low: "Low" };
  document.querySelectorAll("#riskFilter [data-risk]").forEach((tab) => {
    tab.textContent = `${names[tab.dataset.risk]} (${summary.bands[tab.dataset.risk]})`;
  });
}

function renderRows() {
  const tbody = document.getElementById("caseRows");
  const rows = cases
    .filter((c) => filter === "all" || riskBand(c.risk) === filter)
    .filter((c) => `${c.ref} ${c.id} ${c.type} ${c.customer} ${c.looksLike}`.toLowerCase().includes(query));

  if (!rows.length) {
    const text = cases.length
      ? `No cases match “${escapeHtml(query || filter)}”. Try a case number like ${escapeHtml(cases[0].ref)}.`
      : "No cases have been reported yet. New reports from customers will show up here.";
    tbody.innerHTML = `<tr><td colspan="5" class="empty">${text}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (c) => `<tr data-id="${c.id}" tabindex="0"${c.id === selectedId ? ' aria-selected="true"' : ""}>
        <td><strong>${escapeHtml(c.ref)}</strong></td>
        <td>${escapeHtml(c.type)}</td>
        <td><span class="badge ${riskLevel(c.risk)} num">${riskLabel(c.risk)} ${c.risk}</span></td>
        <td class="right num">${money(c)}</td>
        <td><span class="badge ${STATUS_CLASS[c.statusLabel] || "neutral"} plain">${escapeHtml(c.statusLabel)}</span></td>
      </tr>`
    )
    .join("");
}

// ---------- Case detail ----------
function renderDetail() {
  const panel = document.getElementById("caseDetail");
  const c = byId(selectedId);

  if (!c) {
    panel.innerHTML = `<div class="panel-head"><h2>No case selected</h2></div>
      <p class="muted">Pick a case from the list to see the evidence and decide what to do.</p>`;
    return;
  }

  const closed = c.status === "closed";
  const needsReason = riskBand(c.risk) === "high" && c.allowedActions.includes("release");
  const when = formatWhen(c.createdAt);

  panel.innerHTML = `
    <div class="panel-head">
      <h2>Case ${escapeHtml(c.ref)}</h2>
      <span class="badge ${riskLevel(c.risk)} num">${riskLabel(c.risk)} ${c.risk}</span>
    </div>
    ${meterHtml(riskLevel(c.risk))}
    <dl class="facts" style="margin-top:18px">
      <div><dt>Customer</dt><dd>${escapeHtml(c.customer)}</dd></div>
      <div><dt>Amount</dt><dd class="num">${escapeHtml(c.amountNote || money(c))}</dd></div>
      <div><dt>Looks like</dt><dd>${escapeHtml(c.looksLike)}</dd></div>
      <div><dt>Came from</dt><dd>${escapeHtml(c.source)}</dd></div>
      <div><dt>Reported</dt><dd>${escapeHtml(`${when.date}, ${when.time}`)}</dd></div>
      <div><dt>Handled by</dt><dd>${c.assignedTo ? escapeHtml(c.assignedTo) : '<span class="muted">Not picked up yet</span>'}</dd></div>
    </dl>
    <p class="section-label">Evidence</p>
    <blockquote class="evidence-quote">${escapeHtml(c.evidence)}</blockquote>
    <div class="chip-row">${c.signals.map((s) => `<span class="badge signs plain">${escapeHtml(s)}</span>`).join("")}</div>
    <p class="section-label">Status: <span class="badge ${STATUS_CLASS[c.statusLabel] || "neutral"} plain">${escapeHtml(c.statusLabel)}</span></p>

    <label class="section-label" for="caseNote">Note for the audit trail</label>
    <textarea class="textarea case-note" id="caseNote" maxlength="1000" placeholder="${closed ? "Add a note to this closed case" : "What did you find, or why are you doing this?"}"></textarea>
    <p class="hint" style="margin-top:6px">${needsReason ? "A short reason is required to release a high-risk case." : "Optional. Saved with your name and the time."}</p>

    <div class="detail-actions">
      ${ACTION_BUTTONS.map(
        (b) => `<button type="button" class="btn ${b.style}" data-act="${b.act}" data-icon="${b.icon}"${c.allowedActions.includes(b.act) ? "" : " disabled"}> ${b.label}</button>`
      ).join("")}
      <button type="button" class="btn btn-ghost note-btn" data-act="note" data-icon="chat"> Add note only</button>
    </div>
    ${closed ? '<p class="hint" style="margin-top:8px">This case is closed. You can still add notes.</p>' : ""}

    <p class="section-label">Audit trail</p>
    <div id="auditTrail"></div>`;

  renderIcons(panel);
  renderAudit();
}

function renderAudit() {
  const el = document.getElementById("auditTrail");
  if (!el) return;

  if (events === null) {
    el.innerHTML = '<p class="hint">Loading history...</p>';
    return;
  }
  if (!events.length) {
    el.innerHTML = '<p class="hint">No activity recorded yet.</p>';
    return;
  }

  el.innerHTML = `<ol class="timeline audit">${events
    .map((e) => {
      const w = formatWhen(e.at);
      const tone = e.action === "mark_scam" ? "bad" : e.action === "release" ? "good" : "";
      return `<li class="${tone}">
        <time class="num">${escapeHtml(w.date)}<br>${escapeHtml(w.time)}</time>
        <span>${escapeHtml(e.label)}<span class="audit-who">${escapeHtml(e.actor)}</span>${e.note ? `<span class="audit-note">${escapeHtml(e.note)}</span>` : ""}</span>
      </li>`;
    })
    .join("")}</ol>`;
}

// Disable the buttons while a request is running, and any the case's status doesn't allow
function syncButtons() {
  const c = byId(selectedId);
  document.querySelectorAll("#caseDetail [data-act]").forEach((btn) => {
    const allowed = btn.dataset.act === "note" || (c && c.allowedActions.includes(btn.dataset.act));
    btn.disabled = busy || !allowed;
  });
}

// ---------- Loading data ----------
async function refreshList() {
  const data = await api("/api/employee/cases");
  cases = data.cases;
  summary = data.summary;
  renderKpis();
  renderRows();
}

async function loadDetail(id) {
  try {
    const data = await api(`/api/employee/cases/${id}`);
    if (id !== selectedId) return; // the user already clicked another case

    const before = byId(id);
    const statusChanged = !before || before.status !== data.case.status;
    upsertCase(data.case);
    events = data.events;

    if (statusChanged) {
      renderRows();
      renderDetail(); // also draws the audit trail
    } else {
      renderAudit(); // leave a note the user is typing alone
    }
  } catch (error) {
    if (id !== selectedId) return;
    const el = document.getElementById("auditTrail");
    if (el) el.innerHTML = `<p class="hint">Couldn't load the history. ${escapeHtml(error.message)}</p>`;
  }
}

function selectCase(id) {
  selectedId = id;
  events = null;
  renderRows();
  renderDetail();
  loadDetail(id);
}

// ---------- Actions ----------
async function runAction(c, action, note) {
  busy = true;
  syncButtons();

  try {
    const data = await api(`/api/employee/cases/${c.id}/actions`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    });

    busy = false;
    upsertCase(data.case);
    events = data.events;
    renderRows();
    renderDetail();
    showToast(`${data.case.ref}: ${ACTION_DONE[action]}`);

    refreshList().catch((error) => console.error("List refresh failed:", error)); // tiles, tabs and order
  } catch (error) {
    showToast(error.message, "error");
    if (error.status === 409) {
      // someone else got there first, or the status rules say no: show the latest state
      refreshList().catch(() => {});
      loadDetail(c.id);
    }
  } finally {
    busy = false;
    syncButtons();
  }
}

document.getElementById("caseDetail").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.disabled || busy) return;

  const c = byId(selectedId);
  if (!c) return;

  const action = btn.dataset.act;
  const noteBox = document.getElementById("caseNote");
  const note = noteBox.value.trim();

  // The server checks these too. Checking here just saves a round trip.
  if (action === "note" && !note) {
    showToast("Write a note first.", "error");
    noteBox.focus();
    return;
  }
  if (action === "release" && riskBand(c.risk) === "high" && note.length < 5) {
    showToast("Write a short reason before releasing a high-risk case.", "error");
    noteBox.focus();
    return;
  }

  runAction(c, action, note);
});

// ---------- List interactions ----------
document.getElementById("caseRows").addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (!row) return;
  const id = Number(row.dataset.id);
  if (id !== selectedId) selectCase(id);
});
document.getElementById("caseRows").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("tr[data-id]")) e.target.click();
});

document.querySelectorAll("#riskFilter [data-risk]").forEach((tab) =>
  tab.addEventListener("click", () => {
    filter = tab.dataset.risk;
    document.querySelectorAll("#riskFilter [data-risk]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    renderRows();
  })
);

document.getElementById("caseSearch").addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  renderRows();
});

// Pick up new reports when the staff member comes back to this tab
window.addEventListener("focus", () => {
  if (!busy && cases.length) refreshList().catch(() => {});
});

// ---------- Start ----------
function renderLoadError(error) {
  let message = `Couldn't load the cases. ${escapeHtml(error.message)}`;
  if (error.status === 401) message = 'Log in with an OCBC staff account to see reported cases. <a href="login.html">Go to log in</a>';
  else if (error.status === 403) message = "This page is for OCBC staff accounts only.";
  else if (error.status === undefined) message = "Couldn't reach the server. Check that it is running, then reload this page.";

  document.getElementById("caseRows").innerHTML = `<tr><td colspan="5" class="empty">${message}</td></tr>`;
  document.getElementById("caseDetail").innerHTML = `<div class="panel-head"><h2>No cases to show</h2></div>`;
  document.getElementById("kpiHint").textContent = "";
}

async function init() {
  try {
    await refreshList();
    if (cases.length) selectCase(cases[0].id);
    else renderDetail();
  } catch (error) {
    renderLoadError(error);
  }
}

init();
