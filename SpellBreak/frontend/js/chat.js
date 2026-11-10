// P5 Chat with Ollie.
// Ollie is one friendly face; each reply says which specialist agent helped.
// For now replies come from simple keyword rules. Later, swap getReply() for
// a call to the chatbot agent on the backend (e.g. POST /api/chat).

document.getElementById("chatOllie").innerHTML = ollie(48);

const messagesEl = document.getElementById("messages");
const input = document.getElementById("chatInput");

const REPLIES = [
  {
    match: /job|task|tiktok|like videos|top ?up|commission/i,
    agent: "Explainer",
    text: "This looks like a job scam. Small payouts first build your trust, then you are asked to “top up”. Real jobs never ask you to pay to work.",
    actions: [["Check the chat with Spellbreak", "scam-check.html"], ["Report this account", "report.html"], ["Learn about job scams", null]],
  },
  {
    match: /what should i do|what now|next/i,
    agent: "Report",
    text: "Don’t pay the top-up and stop replying. I can save this chat as evidence and send a report to OCBC. If you shared your bank details, freeze your card now.",
    actions: [["Save as evidence and report", "report.html"], ["Freeze my card", null]],
  },
  {
    match: /sms|text message|link|ocbc.*real|real.*ocbc/i,
    agent: "Spellbreak",
    text: "Paste the SMS into Quick Scam Check and I’ll underline any red flags. Quick tip: real OCBC messages never ask you to log in through a link.",
    actions: [["Open Quick Scam Check", "scam-check.html"]],
  },
  {
    match: /son|daughter|mum|dad|family|new number|voice/i,
    agent: "Verify",
    text: "AI can copy a voice from a short video online. Before you send anything, call your son on the number already saved in your phone, or ask him something only he would know.",
    actions: [["Verify the requester", "verify.html"], ["Check the call", "call-check.html"]],
  },
  {
    match: /qr|scan|paynow/i,
    agent: "Guard",
    text: "Before paying by QR, check the name that shows up matches who you expect. If a “shop” QR pays to a personal account, stop. With the extension on, I’ll pause it for you.",
    actions: [["Set up the extension", "extension.html"]],
  },
];

const FALLBACK = {
  agent: "Explainer",
  text: "I can help with suspicious messages, calls, QR codes and payments. Tell me what happened, or paste the message into Quick Scam Check.",
  actions: [["Open Quick Scam Check", "scam-check.html"], ["Is this really OCBC?", "verify.html"]],
};

function getReply(text) {
  return REPLIES.find((r) => r.match.test(text)) || FALLBACK;
}

function addUser(text) {
  messagesEl.insertAdjacentHTML("beforeend", `<div class="msg user"><p>${escapeHtml(text)}</p></div>`);
  scrollDown();
}

function addOllie(reply) {
  const actions = (reply.actions || [])
    .map(([label, href]) =>
      href
        ? `<a class="chip" href="${href}">${escapeHtml(label)}</a>`
        : `<button type="button" class="chip" data-toast="${escapeHtml(label)}">${escapeHtml(label)}</button>`
    )
    .join("");
  messagesEl.insertAdjacentHTML(
    "beforeend",
    `<div class="msg bot">${ollie(36)}<div>
       <span class="msg-from">Ollie, with the ${reply.agent} Agent</span>
       <p>${escapeHtml(reply.text)}</p>
       ${actions ? `<div class="chip-row msg-actions">${actions}</div>` : ""}
     </div></div>`
  );
  highlightAgent(reply.agent);
  scrollDown();
}

function addTyping() {
  messagesEl.insertAdjacentHTML("beforeend", `<div class="msg bot typing" id="typing">${ollie(36)}<div><p><span></span><span></span><span></span></p></div></div>`);
  scrollDown();
}

function scrollDown() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function highlightAgent(name) {
  document.querySelectorAll("#agents li").forEach((li) => li.classList.toggle("active", li.dataset.agent === name));
}

function send(text) {
  if (!text.trim()) return;
  addUser(text);
  addTyping();
  setTimeout(() => {
    document.getElementById("typing")?.remove();
    addOllie(getReply(text));
  }, 700);
}

document.getElementById("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  send(input.value);
  input.value = "";
});

document.querySelectorAll("#tryList .chip").forEach((chip) => chip.addEventListener("click", () => send(chip.textContent)));

messagesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toast]");
  if (!btn) return;
  if (/freeze/i.test(btn.dataset.toast)) showToast("Card freeze requested. OCBC will confirm by SMS (demo).");
  else if (/learn/i.test(btn.dataset.toast)) send("Tell me about job scams");
});

// Example conversation from the wireframe, so the page isn't empty on first visit
addUser("Someone on Telegram offered me a job liking TikTok videos. They paid me $8, and now they want me to top up $200 to unlock more tasks. Is this legit?");
addOllie(REPLIES[0]);
addUser("What should I do now?");
addOllie(REPLIES[1]);
