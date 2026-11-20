// P7 Report and Evidence Locker: choose what to include, then send or download.
// "Send to OCBC" saves a case with POST /api/cases (SCRUM-26). Staff then see it on the triage dashboard.

const evidenceBoxes = document.querySelectorAll("#evidence input[type=checkbox]");
const evCount = document.getElementById("evCount");

function updateCount() {
  const on = [...evidenceBoxes].filter((b) => b.checked).length;
  evCount.textContent = `${on} of ${evidenceBoxes.length} items`;
}
evidenceBoxes.forEach((b) => b.addEventListener("change", updateCount));
updateCount();

// The details shown on this page are a demo case. Until Spellbreak results are saved
// (ContentChecks), these demo values are what gets sent with the evidence the customer ticks.
const DEMO_CASE = {
  scam_type: "E-commerce",
  looks_like: "E-commerce scam",
  risk_score: 91,
  amount: 4800,
  amount_note: "S$4,800 to new payee (transfer cancelled)",
  source: "Extension, Smart Pause",
  signals: ["Pressure", "Pay first", "AI-made photo"],
  summary: "Customer cancelled a S$4,800 transfer after Spellbreak flagged the seller.",
};

// Only the items the customer ticked are sent: "Title: detail" per line
function chosenEvidence() {
  return [...document.querySelectorAll("#evidence .list-row.ev")]
    .filter((row) => row.querySelector("input").checked)
    .map((row) => {
      const title = row.querySelector(".title").textContent.trim();
      const meta = row.querySelector(".meta").textContent.trim();
      return `${title}: ${meta}`;
    })
    .join("\n");
}

const sendButton = document.getElementById("sendCase");

sendButton.addEventListener("click", async () => {
  sendButton.disabled = true;

  try {
    const response = await fetch(`${apiBaseUrl}/api/cases`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...DEMO_CASE, evidence: chosenEvidence() }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        response.status === 401 ? "Log in as a customer to send this case to OCBC." : data.error || "Could not send your case. Please try again.";
      showToast(message, "error");
      sendButton.disabled = false;
      return;
    }

    sendButton.lastChild.textContent = " Sent to OCBC";
    showToast(`Sent to OCBC as ${data.ref}. The triage team will review it.`);
  } catch (error) {
    console.error("Send failed:", error);
    showToast("Could not reach the server. Please try again.", "error");
    sendButton.disabled = false;
  }
});

document.getElementById("downloadCase").addEventListener("click", () => {
  window.print(); // the print stylesheet turns this page into a clean case summary PDF
});
