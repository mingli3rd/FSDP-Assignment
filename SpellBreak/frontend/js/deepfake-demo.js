// Deepfake video-call demo for the Quick Scam Check "Voice or video" tab.
// Scenario: a deepfake "boss" (David) on a WhatsApp video call asks for an urgent
// S$4,800 vendor payment. Same story as the mobile demo (port 4000, E2-E5).
//
// Hard-coded until the deepfake scan service connects in Sprint 2 (SCRUM-55).
// The video frames are drawn shapes, not a real person.
// Load AFTER app.js and risk.js (uses icon, escapeHtml, verdictHtml, meterHtml, renderOllieTips).

const DEEPFAKE_RESULT = {
  ollieTip: "This looks like a deepfake of your boss. Hang up and call David on the number saved in your phone before you pay anything.",
  // strength = how strong the signs are (bar length). Shown as words, not percentages.
  scan: [
    { name: "Face", icon: "video", level: "scam", label: "Strong AI signs", strength: 92 },
    { name: "Voice", icon: "mic", level: "scam", label: "Likely cloned", strength: 86 },
    { name: "Lip sync", icon: "play", level: "signs", label: "Out of sync 3 times", strength: 64 },
  ],
  moments: [
    { time: "0:07", kind: "edge", text: "Edges of the face blur when he turns his head" },
    { time: "0:15", kind: "lips", text: "Lips don’t match the words for about half a second" },
    { time: "0:22", kind: "eyes", text: "Doesn’t blink for over 20 seconds" },
    { time: "0:31", kind: "light", text: "Light on his face doesn’t match the room" },
  ],
  voiceSigns: [
    "Flat tone with no breathing pauses",
    "“Keep this between us” is repeated in exactly the same tone",
    "Completely silent background, unlike a real meeting room",
  ],
  transcript: "“Alex, it’s David. I’m stuck in a board meeting in Hong Kong and my corporate card is blocked. Please pay Apex Trading S$4,800 now, before 5pm, and I’ll pay you back tomorrow. Keep this between us for now.”",
  tricks: [
    { name: "Urgency", quote: "“now, before 5pm”" },
    { name: "Secrecy", quote: "“Keep this between us”" },
    { name: "Unusual payment", quote: "“pay Apex Trading… I’ll pay you back tomorrow”" },
    { name: "Avoids checks", quote: "“stuck in a board meeting”" },
  ],
};

// The steps SpellBreak's agents run on a video, shown live so the demo explains the multi-agent design
const SCAN_STEPS = [
  "Pulling key frames from the video",
  "Face agent: checking for an AI-made face",
  "Voice agent: checking for a cloned voice",
  "Text agent: reading what was said",
  "Explainer: combining the findings",
];

// Stylised video frame (no real person). kind marks where the scan found a problem.
function frameSvg(kind) {
  const boxes = {
    edge: '<rect x="58" y="40" width="44" height="28" rx="4"/>',
    lips: '<rect x="69" y="44" width="22" height="13" rx="4"/>',
    eyes: '<rect x="63" y="27" width="34" height="13" rx="4"/>',
    light: '<rect x="61" y="15" width="38" height="46" rx="6"/>',
  };
  const glow = kind === "light" ? '<path d="M80 17 a19 23 0 0 1 0 46 Z" fill="#f5a524" opacity="0.35"/>' : "";
  const box = boxes[kind] ? `<g fill="none" stroke="#ff4d5a" stroke-width="2" stroke-dasharray="4 3">${boxes[kind]}</g>` : "";
  return `<svg viewBox="0 0 160 90" aria-hidden="true">
    <rect width="160" height="90" fill="#2a303b"/>
    <rect x="0" y="0" width="160" height="58" fill="#343b48"/>
    <rect x="18" y="12" width="34" height="26" rx="2" fill="#3e4656"/>
    <path d="M44 90 C46 70 60 64 80 64 C100 64 114 70 116 90 Z" fill="#596173"/>
    <ellipse cx="80" cy="40" rx="17" ry="22" fill="#8a909c"/>
    ${glow}
    <path d="M63 34 Q80 14 97 34 Q96 20 80 17 Q64 20 63 34 Z" fill="#4a4f5a"/>
    ${box}
  </svg>`;
}

// Thumbnail for the sample recording card
function sampleThumbHtml() {
  return `${frameSvg("none")}<span class="play">${icon("play")}</span><span class="duration num">0:42</span>`;
}

// Shows each agent step ticking off inside `area`, then calls onDone()
function runDeepfakeScan(area, onDone) {
  area.innerHTML = `
    <div data-ollie>Checking the video call. This takes a few seconds.</div>
    <div class="scan-progress" aria-live="polite"><ul>${SCAN_STEPS.map((step) => `<li><span class="dot"></span>${step}</li>`).join("")}</ul></div>`;
  renderOllieTips();
  const items = area.querySelectorAll(".scan-progress li");
  const stepMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 650;
  let i = 0;
  const tick = () => {
    if (i > 0) items[i - 1].className = "done";
    if (i === items.length) return setTimeout(onDone, 350);
    items[i].className = "active";
    i += 1;
    setTimeout(tick, stepMs);
  };
  tick();
}

// The full deepfake result, using the same verdict + meter as every other check
function deepfakeResultHtml() {
  const r = DEEPFAKE_RESULT;
  return `
    <div data-ollie>${escapeHtml(r.ollieTip)}</div>
    <div class="result-main">
      <div class="verdict scam">
        <span class="v-icon">${icon("x")}</span>
        <div><div class="v-title">${LEVELS.scam.label}</div><div class="v-sub">Deepfake video call</div></div>
      </div>
      ${meterHtml("scam")}

      <p class="section-label">What the deepfake scan found</p>
      <div class="scan-rows">
        ${r.scan.map((row) => `
          <div class="scan-row">
            <div class="scan-top"><span class="scan-name">${icon(row.icon)}${row.name}</span><span class="badge ${row.level}">${row.label}</span></div>
            <div class="scan-bar"><i class="${row.level}" style="width:${row.strength}%"></i></div>
          </div>`).join("")}
      </div>

      <p class="section-label">Moments flagged in the video</p>
      <div class="frames">
        ${r.moments.map((m) => `
          <figure class="frame">
            <div class="frame-img">${frameSvg(m.kind)}<span class="stamp num">${m.time}</span></div>
            <figcaption>${m.text}</figcaption>
          </figure>`).join("")}
      </div>

      <p class="section-label">Voice</p>
      <ul class="voice-signs">${r.voiceSigns.map((v) => `<li>${icon("mic")}<span>${v}</span></li>`).join("")}</ul>

      <p class="section-label">What “David” said</p>
      <blockquote class="said">${r.transcript}</blockquote>
      <ol class="tricks">${r.tricks.map((t) => `<li><div><strong>${t.name}</strong><span>${t.quote}</span></div></li>`).join("")}</ol>

      <p class="section-label">Safe actions</p>
      <div class="safe-actions">
        <a class="btn btn-primary" href="verify.html?who=boss">${icon("phone")}<span>Call David on his saved number</span></a>
        <a class="btn btn-secondary" href="report.html">${icon("report")}<span>Report it</span></a>
      </div>
      <p class="demo-note">${icon("info")}<span>Demo result. The live deepfake scan connects in Sprint 2.</span></p>
    </div>`;
}
