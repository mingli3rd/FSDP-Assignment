// P2 Quick Scam Check
// 1. Tries the real AI: POST /api/checks (to be built, returns the scamSchema JSON)
// 2. If that route isn't there yet, runs a local demo check so the page still works.
//    Demo results are labelled as such on screen.

const form = document.getElementById("checkForm");
const checkBtn = document.getElementById("checkBtn");
const messageEl = document.getElementById("message");
const previewEl = document.getElementById("flagPreview");
const hintEl = document.getElementById("flagHint");
const resultEmpty = document.getElementById("resultEmpty");
const resultBody = document.getElementById("resultBody");

let mode = "text";

// ---------- Tabs ----------
document.querySelectorAll("[data-mode]").forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    document.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== mode));
  });
});

// ---------- Source chips (pick one) ----------
const sourceChips = document.querySelectorAll("#sources .chip");
sourceChips.forEach((chip) =>
  chip.addEventListener("click", () => sourceChips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip))))
);
const selectedSource = () => document.querySelector('#sources .chip[aria-pressed="true"]')?.textContent || "";

// ---------- File pickers ----------
function wireFile(inputId, nameId) {
  const input = document.getElementById(inputId);
  const name = document.getElementById(nameId);
  input.addEventListener("change", () => {
    const file = input.files[0];
    name.hidden = !file;
    if (file) name.textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  });
  return input;
}
const imageInput = wireFile("imageFile", "imageName");
const mediaInput = wireFile("mediaFile", "mediaName");

// Going back to editing hides the highlighted preview
previewEl.addEventListener("click", (e) => {
  if (e.target.matches("mark.flag")) return;
  previewEl.hidden = true;
  messageEl.hidden = false;
  messageEl.focus();
});

// ---------- Submit ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageEl.value.trim();
  const file = mode === "image" ? imageInput.files[0] : mode === "voice" ? mediaInput.files[0] : null;

  if (mode === "text" && !text) return showToast("Paste a message or link first");
  if (mode !== "text" && !file) return showToast(mode === "image" ? "Choose a screenshot or QR code first" : "Choose a voice note or video first");

  checkBtn.disabled = true;
  checkBtn.textContent = "Ollie is checking…";

  let result = await checkWithApi({ text, file });
  let isDemo = false;
  if (!result) {
    result = demoCheck(mode, text);
    isDemo = true;
    await new Promise((r) => setTimeout(r, 650)); // feels like real work
  }

  renderResult(result, isDemo);
  if (mode === "text") showFlags(text);

  checkBtn.disabled = false;
  checkBtn.textContent = "Check again";
});

async function checkWithApi({ text, file }) {
  try {
    const body = new FormData();
    body.append("mode", mode);
    body.append("source", selectedSource());
    if (text && mode === "text") body.append("text", text);
    if (file) body.append("file", file);

    const response = await fetch(`${apiBaseUrl}/api/checks`, { method: "POST", credentials: "include", body });
    if (!response.ok) return null;
    const data = await response.json();
    return data.final || data; // accept { final: {...} } or the result itself
  } catch (error) {
    return null; // API not running or route not built yet
  }
}

// ---------- Demo checker (rules that mirror the AI prompt) ----------
const RULES = [
  { name: "Urgency", re: /\b(urgent(ly)?|immediately|right now|within \d+\s?(minutes?|mins?|hours?)|before \d{1,2}\s?(am|pm)|today only|asap)\b/i, why: "Scammers rush you so you don’t stop to check." },
  { name: "Fake link", re: /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/i, why: null, isLink: true },
  { name: "Secrecy", re: /(do not share[^.]*|don'?t tell [a-z]+|keep (?:this|it) (?:secret|confidential)|don'?t loop in [a-z]+)/i, why: "Being told to keep quiet stops you from asking someone who could warn you." },
  { name: "Threat", re: /\b(has been suspended|suspended|closure|will be (?:closed|frozen|locked)|frozen|legal action|arrest)\b/i, why: "Threats make you panic. OCBC won’t close your account by SMS." },
  { name: "Asks for codes", re: /\b(otp|one-time password|login code|pin|password|verify your (?:details|identity))\b/i, why: "No real bank asks for your OTP, PIN or password." },
  { name: "Money request", re: /\b(transfer|top[- ]?up|deposit|pay ?now|send (?:me )?\$?\d)|\$\s?\d[\d,]*/i, why: "Unexpected requests to move money are the end goal of most scams." },
  { name: "Too good to be true", re: /\b(guaranteed?|\d+% (?:monthly )?returns?|easy money|earn \$?\d+|commission)\b/i, why: "Guaranteed high returns don’t exist." },
];

const AI_STYLE = /\b(dear (?:valued )?customer|we detected|to avoid|kindly|verify your details|valued customer)\b/i;

function findFlags(text) {
  const flags = [];
  RULES.forEach((rule) => {
    const m = rule.re.exec(text);
    if (!m) return;
    if (rule.isLink) {
      const host = m[0].replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      if (/(^|\.)ocbc\.com$/.test(host)) return; // the real OCBC site is fine
      flags.push({ name: rule.name, start: m.index, end: m.index + m[0].length, quote: m[0], why: `${host} is not an OCBC website. Real OCBC messages never ask you to log in through a link.` });
      return;
    }
    flags.push({ name: rule.name, start: m.index, end: m.index + m[0].length, quote: m[0], why: rule.why });
  });
  return flags.sort((a, b) => a.start - b.start);
}

function demoCheck(currentMode, text) {
  if (currentMode === "image") {
    return {
      verdict: "scam",
      confidence: 0.88,
      tricks: ["Threat: says your account will be suspended", "Fake link: the web address is not ocbc.com", "Secrecy: asks you not to share the message"],
      ai_generated_signs: ["Logo edges look slightly blurred, a common sign of an edited or generated image"],
      scam_type: "ai_phishing_message",
      safe_actions: ["Call OCBC on an official number", "Report it"],
    };
  }
  if (currentMode === "voice") {
    return {
      verdict: "scam",
      confidence: 0.86,
      tricks: ["Family emergency: “Ma, I got into an accident”", "Money request: $3,000 now", "Secrecy: “don’t tell Dad”"],
      ai_generated_signs: ["Words match a common voice-clone script", "Audio not checked acoustically - transcript only"],
      scam_type: "voice_clone_family",
      safe_actions: ["Call your family member on the number saved in your phone", "Report it"],
    };
  }

  const flags = findFlags(text);
  const n = flags.length;
  const verdict = n >= 3 ? "scam" : n >= 1 ? "suspicious" : "safe";
  const names = flags.map((f) => f.name);

  let next = "Nothing here matches the common scam patterns we check. If the sender later asks for money or codes, check again.";
  if (names.includes("Fake link") && (names.includes("Asks for codes") || names.includes("Threat"))) {
    next = "This looks like a phishing scam. The link opens a fake OCBC login page that steals your password and OTP, and then your account is emptied.";
  } else if (names.includes("Too good to be true")) {
    next = "This looks like an investment scam. Small early “profits” build trust, then you’re asked to deposit more and can’t withdraw.";
  } else if (names.includes("Money request")) {
    next = "Someone may be pretending to be a person you trust. Once money is sent, it is very hard to get back.";
  } else if (n) {
    next = "Some parts of this match scam patterns. Verify with OCBC or the sender on a number you already have before doing anything.";
  }

  return {
    verdict,
    confidence: verdict === "scam" ? Math.min(0.7 + 0.06 * n, 0.96) : verdict === "suspicious" ? 0.6 + 0.08 * n : 0.85,
    tricks: flags.map((f) => `${f.name}: “${f.quote}”`),
    ai_generated_signs: AI_STYLE.test(text) || n >= 3 ? ["Polished, generic wording often seen in AI-written phishing"] : [],
    scam_type: verdict === "safe" ? "none" : "ai_phishing_message",
    what_next: next,
    safe_actions:
      verdict === "scam" ? ["Call OCBC on an official number", "Report it", "Freeze my card"]
      : verdict === "suspicious" ? ["Verify with OCBC first", "Report it"]
      : ["Check again if they ask for money or codes"],
  };
}

// ---------- Render ----------
function splitTrick(t) {
  const i = t.indexOf(":");
  return i > 0 ? [t.slice(0, i), t.slice(i + 1).trim()] : [t, ""];
}

function renderResult(r, isDemo) {
  const level = levelFromVerdict(r.verdict);
  const tip =
    level.key === "scam" ? "Don’t click the link or reply. Real OCBC messages never ask you to log in through a link."
    : level.key === "signs" ? "Some parts of this worry me. Let’s verify before you do anything."
    : "I didn’t find common scam signs. Stay alert if they later ask for money or codes.";

  const tricks = r.tricks.length
    ? `<p class="section-label">Scam tricks found</p>
       <ol class="tricks">${r.tricks.map((t) => { const [a, b] = splitTrick(t); return `<li><div><strong>${escapeHtml(a)}</strong>${b ? `<span>${escapeHtml(b)}</span>` : ""}</div></li>`; }).join("")}</ol>`
    : "";

  const aiSigns = r.ai_generated_signs.length
    ? `<p class="section-label">AI signs</p><ul class="ai-signs">${r.ai_generated_signs.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
    : "";

  const next = r.what_next ? `<p class="section-label">What usually happens next</p><p class="next-text">${escapeHtml(r.what_next)}</p>` : "";

  const actions = r.safe_actions
    .map((a, i) => {
      const cls = i === 0 && level.key !== "clear" ? "btn btn-primary" : "btn btn-secondary";
      return `<button type="button" class="${cls}" data-action="${escapeHtml(a)}">${icon(safeActionIcon(a))}<span>${escapeHtml(a)}</span></button>`;
    })
    .join("");

  resultBody.innerHTML = `
    <div data-ollie>${escapeHtml(tip)}</div>
    <div class="result-main">
      ${verdictHtml(level.key, r.confidence)}
      ${meterHtml(level.key)}
      ${tricks}
      ${aiSigns}
      ${next}
      <p class="section-label">Safe actions</p>
      <div class="safe-actions">${actions}</div>
      ${isDemo ? `<p class="demo-note">${icon("info")}Demo result. Connect <code>/api/checks</code> to use the real AI.</p>` : ""}
    </div>`;

  resultEmpty.hidden = true;
  resultBody.hidden = false;
  renderOllieTips();
  resultBody.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => doAction(btn.dataset.action)));

  if (window.matchMedia("(max-width: 1080px)").matches) {
    document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function doAction(action) {
  if (/report/i.test(action)) window.location.href = "report.html";
  else if (/call|verify|hotline/i.test(action)) window.location.href = "verify.html";
  else if (/freeze/i.test(action)) showToast("Card freeze requested. OCBC will confirm by SMS (demo).");
  else showToast("Noted");
}

// Underline the red flags inside the pasted text
function showFlags(text) {
  const flags = findFlags(text);
  if (!flags.length) {
    previewEl.hidden = true;
    messageEl.hidden = false;
    hintEl.textContent = "No red flags found in the text.";
    return;
  }
  let html = "";
  let pos = 0;
  flags.forEach((f) => {
    if (f.start < pos) return; // skip overlaps
    html += escapeHtml(text.slice(pos, f.start));
    html += `<mark class="flag" tabindex="0" title="${escapeHtml(f.name + ": " + f.why)}">${escapeHtml(text.slice(f.start, f.end))}</mark>`;
    pos = f.end;
  });
  html += escapeHtml(text.slice(pos));
  previewEl.innerHTML = html;
  previewEl.hidden = false;
  messageEl.hidden = true;
  hintEl.textContent = "Underlined parts are red flags. Hover or tap one to see why. Click the text to edit it.";

  previewEl.querySelectorAll("mark.flag").forEach((m) =>
    m.addEventListener("click", () => showToast(m.title))
  );
}
