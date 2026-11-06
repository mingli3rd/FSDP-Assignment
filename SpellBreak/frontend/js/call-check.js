// P3 Call Context Check: 4 quick taps, then a match against known scam patterns.
// No audio is recorded - only the answers.

const PATTERNS = [
  {
    id: "bank",
    name: "Fake bank officer",
    who: ["bank"],
    asks: ["otp", "money", "app"],
    story: "Someone pretends to be from your bank, says your account is at risk, and asks for your OTP to “secure” it. With your OTP they log in and move your money.",
    actions: ["Call OCBC on an official number", "Report this call"],
  },
  {
    id: "boss",
    name: "Fake boss",
    who: ["boss"],
    asks: ["money", "details"],
    story: "A cloned voice or deepfake video of your boss asks for an urgent, confidential payment to a “new vendor”. The money goes straight to the scammer.",
    actions: ["Call your boss on the number you saved", "Report this call"],
  },
  {
    id: "gov",
    name: "Fake government official",
    who: ["gov"],
    asks: ["money", "details", "app"],
    story: "A “police officer” or “MAS official” says you’re linked to a crime and must move money to a “safety account” to clear your name. Real officers never ask for transfers.",
    actions: ["Hang up and call the ScamShield helpline 1799", "Report this call"],
  },
  {
    id: "family",
    name: "Voice-clone family member",
    who: ["family"],
    asks: ["money"],
    story: "AI copies a family member’s voice from a short clip online. “They” are in trouble, need money now, and ask you not to tell anyone.",
    actions: ["Call them on the number saved in your phone", "Report this call"],
  },
  {
    id: "seller",
    name: "Fake company or seller",
    who: ["seller"],
    asks: ["money", "details"],
    story: "A “seller” or “courier” calls about an order or parcel and asks for payment or your details to release it.",
    actions: ["Check with the company on its official website", "Report this call"],
  },
];

const answers = { who: null, ask: [], pressure: null, callback: null };
const questions = [...document.querySelectorAll(".question")];
let current = 0;

const countEl = document.getElementById("qCount");
const dots = document.querySelectorAll("#qDots span");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

// ---------- Choices ----------
questions.forEach((q) => {
  const key = q.dataset.q;
  const multi = q.hasAttribute("data-multi");
  q.querySelectorAll(".choice").forEach((choice) => {
    choice.addEventListener("click", () => {
      if (multi) {
        const on = choice.getAttribute("aria-pressed") !== "true";
        choice.setAttribute("aria-pressed", String(on));
        answers[key] = [...q.querySelectorAll('.choice[aria-pressed="true"]')].map((c) => c.dataset.value);
      } else {
        q.querySelectorAll(".choice").forEach((c) => c.setAttribute("aria-checked", String(c === choice)));
        answers[key] = choice.dataset.value;
      }
      updateNav();
      renderLive();
    });
  });
});

function answered(i) {
  const v = answers[questions[i].dataset.q];
  return Array.isArray(v) ? v.length > 0 : v !== null;
}

function updateNav() {
  countEl.textContent = `Question ${current + 1} of ${questions.length}`;
  dots.forEach((d, i) => d.classList.toggle("on", i <= current));
  backBtn.disabled = current === 0;
  nextBtn.disabled = !answered(current);
  nextBtn.textContent = current === questions.length - 1 ? "See result" : "Next";
}

function go(to) {
  current = to;
  questions.forEach((q, i) => (q.hidden = i !== current));
  updateNav();
  questions[current].querySelector("h2").focus?.();
}

backBtn.addEventListener("click", () => go(current - 1));
nextBtn.addEventListener("click", () => {
  if (current < questions.length - 1) go(current + 1);
  else showResult();
});

// ---------- Scoring ----------
function score(p) {
  let s = 0;
  if (p.who.includes(answers.who)) s += 45;
  const askHits = answers.ask.filter((a) => p.asks.includes(a)).length;
  s += Math.min(askHits * 18, 30);
  if (answers.ask.includes("otp")) s += 5; // asking for codes is always a strong sign
  s += { both: 15, rush: 8, secret: 8, no: 0 }[answers.pressure] || 0;
  if (answers.callback === "yes") s += 5;
  return Math.min(s, 97);
}

function ranked() {
  return PATTERNS.map((p) => ({ ...p, pct: score(p) })).sort((a, b) => b.pct - a.pct);
}

// Live list of patterns while answering (shows which ones are rising)
function renderLive() {
  const list = document.getElementById("patternList");
  if (!list) return;
  list.innerHTML = ranked()
    .map((p) => `<li><span>${p.name}</span><span class="bar"><i style="width:${p.pct}%"></i></span></li>`)
    .join("");
}

function showResult() {
  const [top, ...others] = ranked();
  const levelKey = top.pct >= 70 ? "scam" : top.pct >= 40 ? "signs" : "clear";
  const body = document.getElementById("patternBody");

  const title = levelKey === "clear" ? "No strong match" : top.name;
  const story = levelKey === "clear"
    ? "Your answers don’t match the common scam patterns we check. If they call again and ask for money or codes, check again."
    : top.story;

  body.innerHTML = `
    <div class="pattern-card ${levelKey}">
      <p class="section-label" style="margin-top:0">Pattern match</p>
      <div class="pattern-title"><h2>${title}</h2>${levelKey !== "clear" ? `<span class="badge ${levelKey} num">${top.pct}% match</span>` : ""}</div>
      <p>${story}</p>
    </div>
    ${meterHtml(levelKey)}
    <p class="section-label">Other patterns we check</p>
    <ul class="pattern-list">${others
      .map((p) => `<li><span>${p.name}</span><span class="bar"><i style="width:${p.pct}%"></i></span></li>`)
      .join("")}</ul>
    <p class="section-label">Safe actions</p>
    <div class="safe-actions">
      ${(levelKey === "clear" ? ["Check another call"] : top.actions)
        .map((a, i) => `<a class="btn ${i === 0 ? "btn-primary" : "btn-secondary"}" href="${/report/i.test(a) ? "report.html" : /another/i.test(a) ? "call-check.html" : "verify.html"}">${icon(safeActionIcon(a))}<span>${a}</span></a>`)
        .join("")}
    </div>`;

  if (window.matchMedia("(max-width: 1080px)").matches) {
    document.getElementById("callResult").scrollIntoView({ behavior: "smooth" });
  }
}

renderLive();
updateNav();
