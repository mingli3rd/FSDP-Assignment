// Shared pieces for showing a scam result the same way everywhere:
// the 3-level meter, the verdict banner, and the mapping from the AI's
// JSON (services/ai/scamSchema.js) to what the customer sees.

// The AI returns verdict: "scam" | "suspicious" | "safe"
// The UI uses the 3 flowchart levels below.
const LEVELS = {
  clear: { key: "clear", label: "No common scam signs", short: "No common signs", icon: "check" },
  signs: { key: "signs", label: "Some scam signs", short: "Some signs", icon: "alert" },
  scam: { key: "scam", label: "Likely scam", short: "Likely scam", icon: "x" },
};

function levelFromVerdict(verdict) {
  if (verdict === "scam") return LEVELS.scam;
  if (verdict === "suspicious") return LEVELS.signs;
  return LEVELS.clear;
}

function meterHtml(levelKey) {
  const order = ["clear", "signs", "scam"];
  const idx = order.indexOf(levelKey);
  return `<div class="meter" role="img" aria-label="Risk level: ${LEVELS[levelKey].label}">
    ${order
      .map((k, i) => `<span class="${i <= idx ? "on" : ""} ${i === idx ? "active" : ""}">${LEVELS[k].short}</span>`)
      .join("")}
  </div>`;
}

function verdictHtml(levelKey, confidence) {
  const level = LEVELS[levelKey];
  const conf = typeof confidence === "number" ? `${Math.round(confidence * 100)}% confidence` : "";
  return `<div class="verdict ${level.key}">
    <span class="v-icon">${icon(level.icon)}</span>
    <div><div class="v-title">${level.label}</div><div class="v-sub num">${conf}</div></div>
  </div>`;
}

const SAFE_ACTION_ICONS = [
  [/report/i, "report"],
  [/call|hotline|phone/i, "phone"],
  [/freeze|card|block/i, "lock"],
  [/verify|check/i, "verify"],
];

function safeActionIcon(text) {
  const hit = SAFE_ACTION_ICONS.find(([re]) => re.test(text));
  return hit ? hit[1] : "check";
}
