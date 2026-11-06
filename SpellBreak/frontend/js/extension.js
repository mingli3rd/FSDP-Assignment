// P6 Extension settings: feature toggles, which signals count, and how many
// signals must stack up before Smart Pause steps in.
// Saved in the browser for now; later this can POST to the backend.

const SETTINGS_KEY = "sb_extension_settings";
const thresholdBtns = document.querySelectorAll("#threshold [data-n]");
const hint = document.getElementById("thresholdHint");
const preview = document.getElementById("pausePreview");

const HINTS = {
  1: "Most cautious: you may see a pause on some normal payments. A reported payee always pauses.",
  2: "We suggest 2. A reported payee always pauses.",
  3: "Fewest pauses: only clearly unusual transfers. A reported payee always pauses.",
};
const PREVIEWS = {
  1: "With 1 signal, I’d pause any transfer to a new payee so you can check first.",
  2: "With 2 signals, I’d pause a transfer to a new payee that’s far above your usual amount.",
  3: "With 3 signals, I’d only pause a large, unusual transfer to a new payee, like most scam payments.",
};

let threshold = 2;

function setThreshold(n) {
  threshold = n;
  thresholdBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.n) === n)));
  hint.textContent = HINTS[n];
  const bubble = preview.querySelector(".bubble");
  if (bubble) bubble.textContent = PREVIEWS[n];
}

thresholdBtns.forEach((b) => b.addEventListener("click", () => setThreshold(Number(b.dataset.n))));

// Restore saved settings
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  if (saved) {
    document.querySelectorAll("[data-feature]").forEach((el) => {
      if (el.dataset.feature in saved.features) el.checked = saved.features[el.dataset.feature];
    });
    document.addEventListener("DOMContentLoaded", () => setThreshold(saved.threshold || 2));
  }
} catch (e) { /* storage blocked: use defaults */ }

document.getElementById("saveExt").addEventListener("click", () => {
  const features = {};
  document.querySelectorAll("[data-feature]").forEach((el) => (features[el.dataset.feature] = el.checked));
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ features, threshold })); } catch (e) { /* ignore */ }
  const on = Object.values(features).filter(Boolean).length;
  showToast(`Changes saved. ${on} features on, pausing at ${threshold} signal${threshold > 1 ? "s" : ""}.`);
});
