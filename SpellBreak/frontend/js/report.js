// P7 Report and Evidence Locker: choose what to include, then send or download.

const evidenceBoxes = document.querySelectorAll("#evidence input[type=checkbox]");
const evCount = document.getElementById("evCount");

function updateCount() {
  const on = [...evidenceBoxes].filter((b) => b.checked).length;
  evCount.textContent = `${on} of ${evidenceBoxes.length} items`;
}
evidenceBoxes.forEach((b) => b.addEventListener("change", updateCount));
updateCount();

document.getElementById("sendCase").addEventListener("click", (e) => {
  e.currentTarget.disabled = true;
  e.currentTarget.lastChild.textContent = " Sent to OCBC";
  showToast("Sent to OCBC. The triage team will contact you within 1 working day.");
});

document.getElementById("downloadCase").addEventListener("click", () => {
  window.print(); // the print stylesheet turns this page into a clean case summary PDF
});
