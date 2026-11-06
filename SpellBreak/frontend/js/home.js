// P1 Home: Ollie's 5-step welcome tour.
// Each step highlights the part of the page Ollie is talking about.

document.getElementById("welcomeOllie").innerHTML = ollie(132);

const TOUR = [
  {
    title: "Hi, I’m Ollie. I help you spot AI scams before you pay.",
    text: "I check messages, calls and payments, explain the risks in plain words, and help you verify with OCBC. Let me show you around, then you can turn on the extension in your OCBC app.",
  },
  {
    target: "scam-check",
    title: "Got a message that feels off? Show it to me.",
    text: "Paste the text or link, or upload a screenshot, QR code, voice note or video. I’ll point out the scam tricks, any signs it was made by AI, and what to do next.",
  },
  {
    target: "call-check",
    title: "Just had a strange call? Tell me how it went.",
    text: "Answer 3 or 4 quick taps about the call and I’ll match it to known scam patterns. I never record your call or your voice.",
  },
  {
    target: "verify",
    title: "Not sure it’s really OCBC? Check for free, any time.",
    text: "Scammers can fake caller ID and copy voices. I give you a code a real OCBC officer can read back, and safe ways to call the bank yourself.",
  },
  {
    target: "extension",
    title: "Last step: let me guard your payments too.",
    text: "Turn on the extension in your OCBC app, and I’ll pause unusual transfers so you can check before your money leaves. You can switch any feature off.",
  },
];

let step = 0;
const els = {
  step: document.getElementById("tourStep"),
  title: document.getElementById("tourTitle"),
  text: document.getElementById("tourText"),
  next: document.getElementById("tourNext"),
  skip: document.getElementById("tourSkip"),
  dots: document.querySelectorAll("#tourDots span"),
  welcome: document.querySelector(".welcome"),
};

function renderStep() {
  const s = TOUR[step];
  els.step.textContent = `Tour, step ${step + 1} of ${TOUR.length}`;
  els.title.textContent = s.title;
  els.text.textContent = s.text;
  els.dots.forEach((d, i) => d.classList.toggle("on", i <= step));

  const isLast = step === TOUR.length - 1;
  els.next.textContent = step === 0 ? "Start the 1-minute tour" : isLast ? "Set up the extension" : "Next";
  els.skip.textContent = step === 0 ? "Skip for now" : "End tour";

  document.querySelectorAll("[data-tour]").forEach((el) => {
    el.classList.toggle("tour-focus", el.dataset.tour === s.target);
  });
  if (s.target) {
    document.querySelector(`[data-tour="${s.target}"]`).scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function endTour() {
  document.querySelectorAll(".tour-focus").forEach((el) => el.classList.remove("tour-focus"));
  try { localStorage.setItem("sb_tour_done", "1"); } catch (e) { /* storage blocked: fine */ }
  els.step.textContent = "Welcome back";
  els.title.textContent = "What would you like me to check today?";
  els.text.textContent = "Pick an option below, or ask me anything in Chat with Ollie.";
  els.dots.forEach((d) => d.classList.add("on"));
  els.next.textContent = "Chat with Ollie";
  els.skip.textContent = "Replay the tour";
  step = -1;
}

els.next.addEventListener("click", () => {
  if (step === -1) { window.location.href = "chat.html"; return; }
  if (step === TOUR.length - 1) { window.location.href = "extension.html"; return; }
  step += 1;
  renderStep();
});

els.skip.addEventListener("click", () => {
  if (step === -1) { step = 0; renderStep(); return; }
  endTour();
});

// Returning visitors skip straight to the short greeting
let tourDone = false;
try { tourDone = localStorage.getItem("sb_tour_done") === "1"; } catch (e) { /* ignore */ }
if (tourDone) endTour();
