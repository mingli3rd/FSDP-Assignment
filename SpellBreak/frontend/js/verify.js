// P4 Official verification: one-time code + countdown, safe call-back channels,
// and "verify the requester" for boss / family / friend money requests.

const CODE_SECONDS = 300;
let secondsLeft = CODE_SECONDS;

const codeEl = document.getElementById("verifyCode");
const timerEl = document.getElementById("codeTimer");
const barEl = document.getElementById("timerBar");

function newCode() {
  const n = String(Math.floor(100000 + Math.random() * 900000));
  codeEl.textContent = `${n.slice(0, 3)} ${n.slice(3)}`;
  secondsLeft = CODE_SECONDS;
  tick();
}

function tick() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const s = String(secondsLeft % 60).padStart(2, "0");
  timerEl.textContent = `Expires in ${m}:${s}`;
  barEl.style.width = `${(secondsLeft / CODE_SECONDS) * 100}%`;
}

setInterval(() => {
  secondsLeft -= 1;
  if (secondsLeft <= 0) {
    newCode(); // a fresh code every 5 minutes
    return;
  }
  tick();
}, 1000);
tick();

// ---------- Outcome of the code check ----------
const outcome = document.getElementById("codeOutcome");
const msg = document.getElementById("outcomeMsg");

document.getElementById("codeMatch").addEventListener("click", () => {
  msg.className = "outcome-msg clear";
  msg.innerHTML = `${icon("check")}<div><strong>This is a real OCBC officer.</strong> You can continue the call. They will still never ask for your OTP, PIN or password.</div>`;
  outcome.hidden = true;
  msg.hidden = false;
});

document.getElementById("codeNoMatch").addEventListener("click", () => {
  msg.className = "outcome-msg scam";
  msg.innerHTML = `${icon("x")}<div><strong>Hang up now. This is not OCBC.</strong> Don’t share any codes or move money. <a href="report.html">Report the call</a> so OCBC can warn others.</div>`;
  outcome.hidden = true;
  msg.hidden = false;
});

// ---------- Demo buttons (calls, mail, branches) ----------
document.querySelectorAll("[data-demo]").forEach((btn) =>
  btn.addEventListener("click", () => showToast(btn.dataset.demo))
);

// ---------- Verify the requester ----------
const CONTACTS = {
  boss: { name: "David Tan (Manager)", num: "Saved contact, +65 8••• ••47" },
  family: { name: "Mum", num: "Saved contact, +65 9••• ••12" },
  friend: { name: "Jia Hui", num: "Saved contact, +65 9••• ••80" },
};
let who = "family";

document.querySelectorAll("#reqTabs [data-who]").forEach((tab) => {
  tab.addEventListener("click", () => {
    who = tab.dataset.who;
    document.querySelectorAll("#reqTabs [data-who]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    const c = CONTACTS[who];
    document.getElementById("contactName").textContent = c.name;
    document.getElementById("contactNum").textContent = c.num;
    document.getElementById("contactInitial").textContent = c.name[0];
  });
});

// verify.html?who=boss opens on that contact (used by the deepfake demo result)
const whoParam = new URLSearchParams(location.search).get("who");
if (CONTACTS[whoParam]) document.querySelector(`#reqTabs [data-who="${whoParam}"]`).click();

document.getElementById("callSaved").addEventListener("click", () =>
  showToast(`Calling ${CONTACTS[who].name} on the number you saved (demo)`)
);
document.getElementById("msgOther").addEventListener("click", () =>
  showToast(`Ask ${CONTACTS[who].name} on a different app if they really sent the request (demo)`)
);
