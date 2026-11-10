// P8 Employee Triage Dashboard (staff portal). All cases are synthetic sample data.
// Later: load from GET /api/employee/cases and save actions with PUT /api/employee/cases/:id/status

const CASES = [
  { id: "RC-2041", type: "E-commerce", risk: 91, amount: 4800, status: "New", customer: "Alex Lim (synthetic)", amountNote: "S$4,800 to new payee", looks: "E-commerce scam", source: "Extension, Smart Pause", evidence: "“2 VIP tickets for Saturday, S$4,800. Many people waiting, pay now by PayNow…”", signals: ["Pressure", "Pay first", "AI-made photo"] },
  { id: "RC-2039", type: "Impersonation", risk: 89, amount: 12000, status: "Contacting", customer: "Priya Nair (synthetic)", amountNote: "S$12,000 to new payee", looks: "Voice-clone boss", source: "Platform, Call Context Check", evidence: "“It’s David. Board meeting, can’t talk. Process the vendor payment before 5pm, keep it between us.”", signals: ["Urgency", "Secrecy", "Voice clone"] },
  { id: "RC-2037", type: "Investment", risk: 88, amount: 20500, status: "Escalated", customer: "Marcus Ong (synthetic)", amountNote: "S$20,500 over 3 transfers", looks: "Deepfake investment ad", source: "Extension, Smart Pause", evidence: "“As seen with our CEO on video: guaranteed 30% monthly returns. Top up to unlock withdrawals.”", signals: ["Too good to be true", "Deepfake video", "Top-up to withdraw"] },
  { id: "RC-2036", type: "Login code", risk: 86, amount: null, status: "Blocked", customer: "Siti Rahman (synthetic)", amountNote: "Account access", looks: "Fake bank officer", source: "Extension, Login Code Guard", evidence: "Login attempt from a new device in another country while the customer was on a call with “OCBC”.", signals: ["Asked for OTP", "New device", "Overseas login"] },
  { id: "RC-2035", type: "Phishing", risk: 67, amount: 420, status: "New", customer: "Daniel Koh (synthetic)", amountNote: "S$420", looks: "AI-written phishing SMS", source: "Platform, Quick Scam Check", evidence: "“Your parcel is on hold. Pay S$4.20 redelivery fee at sg-post-track.co within 24 hours.”", signals: ["Fake link", "Urgency"] },
  { id: "RC-2031", type: "Job scam", risk: 61, amount: 300, status: "New", customer: "Mei Ling (synthetic)", amountNote: "S$300 top-up", looks: "Task-based job scam", source: "Platform, Chat with Ollie", evidence: "“Complete 10 more tasks to unlock your S$480 commission. Top up S$300 first.”", signals: ["Pay to work", "Small payout first"] },
  { id: "RC-2028", type: "QR payment", risk: 32, amount: 0, status: "Released", customer: "Hafiz Ali (synthetic)", amountNote: "S$0", looks: "QR mismatch, resolved", source: "Extension, QR payment check", evidence: "Hawker QR paid to a personal account. Customer confirmed the stall owner’s own account.", signals: ["Account type mismatch"] },
];

const riskBand = (r) => (r >= 80 ? "high" : r >= 50 ? "med" : "low");
const riskLevel = (r) => ({ high: "scam", med: "signs", low: "clear" }[riskBand(r)]);
const riskLabel = (r) => ({ high: "High", med: "Med", low: "Low" }[riskBand(r)]);
const money = (c) => (c.amount === null ? "Account" : `S$${c.amount.toLocaleString("en-SG")}`);
const STATUS_CLASS = { New: "info", Contacting: "signs", Escalated: "scam", Blocked: "scam", Released: "clear", "Marked scam": "scam" };

let filter = "all";
let query = "";
let selectedId = CASES[0].id;

function renderRows() {
  const rows = CASES.filter((c) => filter === "all" || riskBand(c.risk) === filter).filter((c) =>
    `${c.id} ${c.type} ${c.customer} ${c.looks}`.toLowerCase().includes(query)
  );
  const tbody = document.getElementById("caseRows");
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (c) => `<tr data-id="${c.id}" tabindex="0"${c.id === selectedId ? ' aria-selected="true"' : ""}>
            <td><strong>${c.id}</strong></td>
            <td>${escapeHtml(c.type)}</td>
            <td><span class="badge ${riskLevel(c.risk)} num">${riskLabel(c.risk)} ${c.risk}</span></td>
            <td class="right num">${money(c)}</td>
            <td><span class="badge ${STATUS_CLASS[c.status] || "neutral"} plain">${c.status}</span></td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No cases match “${escapeHtml(query)}”. Try a case number like RC-2041.</td></tr>`;
}

function renderDetail() {
  const c = CASES.find((x) => x.id === selectedId);
  const panel = document.getElementById("caseDetail");
  panel.innerHTML = `
    <div class="panel-head">
      <h2>Case ${c.id}</h2>
      <span class="badge ${riskLevel(c.risk)} num">${riskLabel(c.risk)} ${c.risk}</span>
    </div>
    ${meterHtml(riskLevel(c.risk))}
    <dl class="facts" style="margin-top:18px">
      <div><dt>Customer</dt><dd>${escapeHtml(c.customer)}</dd></div>
      <div><dt>Amount</dt><dd class="num">${escapeHtml(c.amountNote)}</dd></div>
      <div><dt>Looks like</dt><dd>${escapeHtml(c.looks)}</dd></div>
      <div><dt>Came from</dt><dd>${escapeHtml(c.source)}</dd></div>
    </dl>
    <p class="section-label">Evidence</p>
    <blockquote class="evidence-quote">${escapeHtml(c.evidence)}</blockquote>
    <div class="chip-row">${c.signals.map((s) => `<span class="badge signs plain">${escapeHtml(s)}</span>`).join("")}</div>
    <p class="section-label">Status: <span class="badge ${STATUS_CLASS[c.status] || "neutral"} plain">${c.status}</span></p>
    <div class="detail-actions">
      <button type="button" class="btn btn-secondary" data-act="Contacting" data-icon="phone"> Contact customer</button>
      <button type="button" class="btn btn-secondary" data-act="Escalated" data-icon="alert"> Escalate</button>
      <button type="button" class="btn btn-primary" data-act="Marked scam" data-icon="x"> Mark as scam</button>
      <button type="button" class="btn btn-ghost" data-act="Released" data-icon="check"> Mark safe and release</button>
    </div>`;
  renderIcons(panel);
  panel.querySelectorAll("[data-act]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (btn.dataset.act === "Released" && c.risk >= 80 && !confirmRelease(c)) return;
      c.status = btn.dataset.act;
      renderRows();
      renderDetail();
      showToast(`${c.id}: ${c.status}`);
    })
  );
}

// Releasing a high-risk case is the one action that can lose a customer money,
// so it needs a second click instead of a browser pop-up.
function confirmRelease(c) {
  if (confirmRelease.pending === c.id) { confirmRelease.pending = null; return true; }
  confirmRelease.pending = c.id;
  showToast(`${c.id} is high risk. Click “Mark safe and release” again to confirm.`);
  return false;
}

document.getElementById("caseRows").addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (!row) return;
  selectedId = row.dataset.id;
  renderRows();
  renderDetail();
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

renderRows();
renderDetail();
