// SpellBreak extension: mobile banking demo (wireframe screens E1-E10).
// A tiny router swaps screens inside the phone. All data is synthetic.
//
// Flows:
//   Transfer:   a deepfake "boss" on a video call asks for an urgent payment:
//               transfer (E2) -> Smart Pause sheet (E3) -> verify (E4: the call recording) -> deepfake scan (E5)
//   QR payment: scan (E6) -> purpose sheet -> qr-mismatch (E7)
//   Login:      onetoken (E8)
//   Statements: statements (E9) -> purpose sheet -> statement-stop (E10)
//   Setup:      security (E1)

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);

function escapeHtml(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7v-3M17 21v-3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17.5v.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3Z"/>',
  play: '<path d="M8 5v14l11-7Z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

// Same Ollie as the platform (port 3000)
function ollieSvg() {
  return `<svg viewBox="0 0 64 64" role="img" aria-label="Ollie">
  <path d="M13 21 L17 6 L27 15 Z" fill="#a00c17"/><path d="M51 21 L47 6 L37 15 Z" fill="#a00c17"/>
  <path d="M32 11 C48 11 56 23 56 37 C56 51 46 61 32 61 C18 61 8 51 8 37 C8 23 16 11 32 11 Z" fill="#d2101e"/>
  <path d="M22 50 Q32 57 42 50" stroke="#fff" stroke-opacity="0.35" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M25 55 Q32 60 39 55" stroke="#fff" stroke-opacity="0.25" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="22.5" cy="31" r="10" fill="#fff"/><circle cx="41.5" cy="31" r="10" fill="#fff"/>
  <circle cx="23.5" cy="32" r="4.6" fill="#1e2533"/><circle cx="40.5" cy="32" r="4.6" fill="#1e2533"/>
  <circle cx="25" cy="30.4" r="1.5" fill="#fff"/><circle cx="42" cy="30.4" r="1.5" fill="#fff"/>
  <g class="lids" style="transform-box: fill-box; transform-origin: top"><rect x="12.5" y="21" width="20" height="20" rx="10" fill="#d2101e"/><rect x="31.5" y="21" width="20" height="20" rx="10" fill="#d2101e"/></g>
  <path d="M29 39 L35 39 L32 44 Z" fill="#f5a524"/></svg>`;
}
const ollie = () => `<span class="ollie">${ollieSvg()}</span>`;
const tip = (text, from) =>
  `<div class="ollie-tip">${ollie()}<div class="bubble">${from ? `<span class="from">${from}</span>` : ""}${text}</div></div>`;

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------- State (remembered in this browser) ----------
const DEFAULT_STATE = {
  on: false,
  features: { pause: true, spellbreak: true, qr: true, login: true, statement: true },
};
let state = load();

function load() {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem("sb_mobile") || "{}") };
  } catch (e) {
    return structuredClone(DEFAULT_STATE);
  }
}
function save() {
  try { localStorage.setItem("sb_mobile", JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}
const active = (f) => state.on && state.features[f];

// ---------- Screens ----------
// Each screen: { title, back, tab, code (wireframe id), render() -> html, mount(view) }
const SCREENS = {
  home: {
    title: "Good morning, Alex",
    tab: "home",
    render: () => `
      <div class="account-card">
        <div class="label">360 Account</div>
        <div class="balance num">S$7,950.12</div>
        <div class="acct num">601-234567-001</div>
      </div>
      <div class="quick">
        <button type="button" data-go="transfer"><span class="q-icon">${icon("send")}</span>Transfer</button>
        <button type="button" data-go="scan"><span class="q-icon">${icon("qr")}</span>Scan & pay</button>
        <button type="button" data-go="onetoken"><span class="q-icon">${icon("key")}</span>OneToken</button>
        <button type="button" data-go="statements"><span class="q-icon">${icon("doc")}</span>Statements</button>
      </div>
      ${state.on
        ? `<button type="button" class="promo" data-go="security">${ollie()}<span><strong>Ollie is protecting you</strong><span>5 scam checks are on. Tap to change them.</span></span></button>`
        : `<button type="button" class="promo" data-go="security">${ollie()}<span><strong>Turn on scam protection</strong><span>Ollie pauses unusual payments so you can check first.</span></span></button>`}
      <p class="section-title">Recent transactions</p>
      <div class="card">
        <div class="row"><div class="grow"><div class="title">NTUC FairPrice</div><div class="meta">Yesterday</div></div><span class="num">-S$42.80</span></div>
        <div class="row"><div class="grow"><div class="title">Salary, Acme Pte Ltd</div><div class="meta">1 Nov</div></div><span class="num" style="color:var(--clear)">+S$5,200.00</span></div>
        <div class="row"><div class="grow"><div class="title">SP Group bill</div><div class="meta">29 Oct</div></div><span class="num">-S$118.35</span></div>
      </div>`,
  },

  more: {
    title: "More",
    tab: "more",
    render: () => `
      <div class="card">
        <button type="button" class="row" style="width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left" data-go="security"><span class="tile-icon">${icon("shield")}</span><span class="grow"><span class="title">Security</span><br><span class="meta">Scam protection extension</span></span><span class="badge ${state.on ? "clear" : "neutral"}">${state.on ? "On" : "Off"}</span></button>
        <button type="button" class="row" style="width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left" data-go="statements"><span class="tile-icon">${icon("doc")}</span><span class="grow"><span class="title">e-Statements</span></span></button>
        <button type="button" class="row" style="width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left" data-go="onetoken"><span class="tile-icon">${icon("key")}</span><span class="grow"><span class="title">OneToken</span></span></button>
      </div>`,
  },

  // E1
  security: {
    code: "E1",
    title: "Security extension",
    back: "more",
    tab: "more",
    render: () => `
      <div class="meet">${ollie()}<h2>Meet Ollie</h2><p>Extra scam protection inside the app. Turn it off anytime.</p></div>
      <div class="card" style="margin-top:16px">
        ${[
          ["pause", "Smart Pause", "Pauses unusual transfers"],
          ["spellbreak", "Spellbreak in payments", "Check a message before you pay"],
          ["qr", "QR payment check", "Checks who a QR really pays"],
          ["login", "Login Code Guard", "Hides codes until you confirm"],
          ["statement", "Statement Shield", "Asks who a statement is for"],
        ]
          .map(
            ([key, name, sub]) => `<label class="feature"><span class="grow"><strong>${name}</strong><span class="sub">${sub}</span></span>
            <span class="switch"><input type="checkbox" data-feature="${key}" ${state.features[key] ? "checked" : ""} aria-label="${name}" /><span class="track"></span></span></label>`
          )
          .join("")}
      </div>
      <div class="privacy">${icon("info")}<span>It only checks the action you are taking, using data the bank already has. It never reads your chats.</span></div>
      <div class="btn-stack">
        ${state.on
          ? `<button type="button" class="btn btn-secondary" id="turnOff">Turn off the extension</button>`
          : `<button type="button" class="btn btn-primary" id="turnOn">Turn on the extension</button>`}
      </div>`,
    mount(view) {
      view.querySelectorAll("[data-feature]").forEach((box) =>
        box.addEventListener("change", () => { state.features[box.dataset.feature] = box.checked; save(); })
      );
      $("#turnOn", view)?.addEventListener("click", () => { state.on = true; save(); toast("Ollie is on. Try a transfer to a new payee."); go("home"); });
      $("#turnOff", view)?.addEventListener("click", () => { state.on = false; save(); toast("Extension turned off"); go("security"); });
    },
  },

  // E2  (scenario: a deepfake "boss" on a WhatsApp video call asks for an urgent vendor payment)
  transfer: {
    code: "E2",
    title: "Transfer",
    back: "home",
    tab: "pay",
    render: () => `
      <div class="card">
        <div class="field-label">To</div>
        <div class="payee" style="margin-top:8px"><span class="avatar">AT</span><div class="grow"><div class="title" style="font-weight:700">Apex Trading Pte Ltd</div><div class="meta num">UOB ••• 2291</div></div><span class="badge signs">New payee</span></div>
      </div>
      <div class="card">
        <div class="field-label">Amount</div>
        <div class="amount num">S$4,800.00</div>
      </div>
      <div class="card">
        <div class="row"><div class="grow"><div class="field-label">From</div><div class="title">360 Account</div></div><div class="meta num" style="text-align:right">Available<br>S$7,950.12</div></div>
        <div class="row"><div class="grow"><div class="field-label">Reference</div><div class="title">Vendor payment for David</div></div></div>
      </div>
      ${state.on ? `<div class="guard-note">${ollie()}<span>Ollie checks unusual transfers before they go.</span></div>` : ""}
      <div class="btn-stack"><button type="button" class="btn btn-primary" id="transferNow">Transfer now</button></div>`,
    mount(view) {
      $("#transferNow", view).addEventListener("click", () => {
        if (active("pause")) openSheet(smartPauseSheet());
        else go("sent");
      });
    },
  },

  // E4  Verify first: the customer shares the screen recording of the video call
  verify: {
    code: "E4",
    title: "Verify first",
    back: "transfer",
    tab: "pay",
    render: () => `
      ${tip("Got this request on a call? Share the recording and I’ll check if the face or voice was made by AI.")}
      <div class="chips" role="group" aria-label="What are you checking?" style="margin-top:16px" id="kinds">
        <button type="button" class="chip" aria-pressed="false" data-kind="text">Text or link</button>
        <button type="button" class="chip" aria-pressed="false" data-kind="image">Screenshot</button>
        <button type="button" class="chip" aria-pressed="false" data-kind="voice">Voice note</button>
        <button type="button" class="chip" aria-pressed="true" data-kind="video">Video call</button>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="video-card" id="videoCard">
          <div class="thumb">${frameSvg("none")}<span class="play">${icon("play")}</span><span class="duration num">0:42</span></div>
          <div class="grow"><div class="title">WhatsApp video call with “David”</div><div class="meta">Screen recording, 0:42</div></div>
        </div>
        <div class="paste-src" style="margin-top:14px">What happened</div>
        <div class="paste">My boss David video called me on WhatsApp and asked me to pay a vendor S$4,800 urgently. He said he’d pay me back tomorrow.</div>
      </div>
      <div id="checkArea">
        <div class="btn-stack"><button type="button" class="btn btn-primary" id="checkIt">Check the video</button></div>
      </div>`,
    mount(view) {
      view.querySelectorAll("#kinds .chip").forEach((chip) =>
        chip.addEventListener("click", () => {
          if (chip.dataset.kind !== "video") return toast("This demo shows the video call check");
        })
      );
      $("#checkIt", view).addEventListener("click", () => runDeepfakeScan($("#checkArea", view)));
    },
  },

  // E5  Deepfake scan result
  result: {
    code: "E5",
    title: "Deepfake scan",
    back: "verify",
    tab: "pay",
    render: () => {
      const r = DEEPFAKE_RESULT;
      return `
        <div class="verdict scam"><span class="v-icon">${icon("x")}</span><div><div class="v-title">Likely scam</div><div class="v-sub">Deepfake video call</div></div></div>
        <div class="meter">${["No common signs", "Some signs", "Likely scam"].map((l, i) => `<span class="on ${i === 2 ? "active" : ""}">${l}</span>`).join("")}</div>
        <div style="margin-top:16px">${tip(r.ollieTip)}</div>

        <p class="section-title">What the deepfake scan found</p>
        <div class="card scan-rows">
          ${r.scan.map((row) => `
            <div class="scan-row">
              <div class="scan-top"><span class="scan-name">${icon(row.icon)}${row.name}</span><span class="badge ${row.level}">${row.label}</span></div>
              <div class="scan-bar"><i class="${row.level}" style="width:${row.strength}%"></i></div>
            </div>`).join("")}
        </div>

        <p class="section-title">Moments flagged in the video</p>
        <div class="frames">
          ${r.moments.map((m) => `
            <figure class="frame">
              <div class="frame-img">${frameSvg(m.kind)}<span class="stamp num">${m.time}</span></div>
              <figcaption>${m.text}</figcaption>
            </figure>`).join("")}
        </div>

        <p class="section-title">Voice</p>
        <div class="card"><ul class="voice-signs">${r.voiceSigns.map((v) => `<li>${icon("mic")}<span>${v}</span></li>`).join("")}</ul></div>

        <p class="section-title">What “David” said</p>
        <div class="card">
          <blockquote class="said">${r.transcript}</blockquote>
          <ol class="tricks" style="margin-top:12px">${r.tricks.map((t) => `<li><span><strong>${t.name}</strong><br>${t.quote}</span></li>`).join("")}</ol>
        </div>

        <div class="btn-stack">
          <button type="button" class="btn btn-primary" id="cancelReport">${icon("report")}Cancel and report</button>
          <button type="button" class="btn btn-secondary" data-toast="Calling David on the number saved in your phone (demo)">${icon("phone")}Call David on his saved number</button>
          <button type="button" class="btn btn-ghost" id="continueAnyway">Continue anyway</button>
        </div>
        <p class="small muted" style="text-align:center;margin-top:8px">Demo result. The live deepfake scan connects in Sprint 2.</p>`;
    },
    mount(view) {
      $("#cancelReport", view).addEventListener("click", () => go("reported"));
      $("#continueAnyway", view).addEventListener("click", () => go("sent"));
    },
  },

  // E6
  scan: {
    code: "E6",
    title: "Scan and pay",
    back: "home",
    tab: "pay",
    render: () => `
      <div class="card qr-scanned"><span class="qr-art" aria-hidden="true"></span><div><div class="title" style="font-weight:700">QR scanned</div><div class="meta">PayNow QR, S$180.00</div>
      ${active("qr") ? `<span class="badge signs" style="margin-top:6px">You haven’t paid this payee before</span>` : ""}</div></div>
      ${active("qr")
        ? `<div class="btn-stack"><button type="button" class="btn btn-primary" id="qrNext">Continue</button></div>`
        : `<div class="card"><div class="row"><div class="grow"><div class="field-label">Pay to</div><div class="title">TAN AH KOW</div></div><span class="num title">S$180.00</span></div></div>
           <div class="btn-stack"><button type="button" class="btn btn-primary" data-go="sent">Pay S$180.00</button></div>`}`,
    mount(view) {
      $("#qrNext", view)?.addEventListener("click", () => openSheet(qrPurposeSheet()));
      if (active("qr")) openSheet(qrPurposeSheet());
    },
  },

  // E7
  "qr-mismatch": {
    code: "E7",
    title: "Scan and pay",
    back: "scan",
    tab: "pay",
    render: () => `
      <div class="card">
        <div class="row"><div class="grow"><div class="field-label">Pay to</div><div class="title">TAN AH KOW</div><div class="meta">Personal account, PayNow</div></div><span class="num title">S$180.00</span></div>
      </div>
      <div class="card" style="border-color:#f3c3c7">
        <div class="pause-head">${ollie()}<div><div class="eyebrow">Smart Pause, QR check</div><h2 style="font-size:1.15rem">This QR pays a person, not a government agency</h2></div></div>
        <p style="margin-top:10px;color:var(--ink-2)">You said this is a ${escapeHtml(session.qrPurpose || "government fine")}, but this QR pays a personal account. Government fines are never paid to individuals.</p>
        <div class="compare"><div><span>You said</span><strong>${escapeHtml(session.qrPurposeShort || "Government fine")}</strong></div><div><span>This QR pays</span><strong>Personal account</strong></div></div>
      </div>
      <div class="btn-stack">
        <button type="button" class="btn btn-primary" data-go="home" data-toast="Payment cancelled. Nothing was sent.">Cancel payment</button>
        <button type="button" class="btn btn-secondary" data-go="reported-qr">${icon("report")}Report this QR</button>
      </div>
      <button type="button" class="text-btn" data-go="sent">Pay anyway</button>`,
  },

  // E8
  onetoken: {
    code: "E8",
    title: "OneToken",
    back: "home",
    tab: "home",
    render: () => active("login")
      ? `
      <div class="card">
        <div class="pause-head">${ollie()}<div><div class="eyebrow">Login Code Guard</div><h2 style="font-size:1.15rem">A device is trying to log in to your account</h2></div></div>
        <dl class="facts" style="margin-top:14px">
          <div><dt>Location</dt><dd class="alert">Phnom Penh, Cambodia</dd></div>
          <div><dt>Device</dt><dd>Android, Chrome</dd></div>
          <div><dt>Time</dt><dd>Today, 9:41 pm</dd></div>
        </dl>
        <div class="hidden-code" id="codeBox"><div class="dots">••••••</div><span>Code hidden until you confirm</span></div>
        <ul class="warn-list">
          <li>${icon("alert")}No friend or family member ever needs your bank code.</li>
          <li>${icon("alert")}If someone told you to ignore this screen, that’s part of the scam.</li>
        </ul>
      </div>
      <p class="section-title" style="text-align:center">Is this you?</p>
      <div class="btn-stack" style="margin-top:0" id="codeActions">
        <button type="button" class="btn btn-secondary" id="itsMe">Yes, this is me</button>
        <button type="button" class="btn btn-primary" id="notMe">No, someone asked me for it</button>
      </div>`
      : `<div class="card" style="text-align:center"><p class="field-label">Your OneToken code</p><div class="amount num" style="letter-spacing:0.12em">${code()}</div><p class="meta">Expires in 30 seconds</p></div>
         <p class="small muted" style="margin-top:12px;text-align:center">Turn on Login Code Guard in Security to see where a login comes from before the code shows.</p>`,
    mount(view) {
      $("#itsMe", view)?.addEventListener("click", () => {
        $("#codeBox", view).innerHTML = `<div class="code num">${code()}</div><span>Only enter this on a login you started yourself</span>`;
        $("#codeActions", view).innerHTML = `<button type="button" class="btn btn-secondary" data-go="home">Done</button>`;
      });
      $("#notMe", view)?.addEventListener("click", () => go("login-blocked"));
    },
  },

  // E9
  statements: {
    code: "E9",
    title: "e-Statements",
    back: "home",
    tab: "more",
    render: () => `
      <div class="card">
        ${["October 2026", "September 2026", "August 2026"]
          .map((m) => `<div class="row"><span class="tile-icon">${icon("doc")}</span><div class="grow"><div class="title">${m}</div><div class="meta">360 Account</div></div><button type="button" class="btn btn-secondary" style="width:auto;min-height:38px;padding:6px 14px" data-month="${m}">${icon("download")}Download</button></div>`)
          .join("")}
      </div>`,
    mount(view) {
      view.querySelectorAll("[data-month]").forEach((btn) =>
        btn.addEventListener("click", () => {
          session.month = btn.dataset.month;
          if (active("statement")) openSheet(statementSheet());
          else toast(`${session.month} statement downloaded`);
        })
      );
    },
  },

  // E10
  "statement-stop": {
    code: "E10",
    title: "e-Statements",
    back: "statements",
    tab: "more",
    render: () => `
      <div class="card" style="border-color:#f3c3c7">
        <div class="eyebrow">Statement Shield</div>
        <h2 style="font-size:1.25rem;margin-top:4px">Recruiters don’t need your bank statements to hire you</h2>
        <p style="margin-top:8px;color:var(--ink-2)">Fake recruiters use real statements to make fake identities look real, and to open accounts or loans in your name.</p>
      </div>
      <div style="margin-top:14px">${tip("A real employer won’t ask for statements over WhatsApp or Telegram.")}</div>
      <div class="btn-stack">
        <button type="button" class="btn btn-primary" data-go="statements" data-toast="Download cancelled">Cancel download</button>
        <button type="button" class="btn btn-secondary" data-go="reported-request">${icon("report")}Report this request</button>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="title" style="font-weight:700">Need to share it for a real reason?</div>
        <p class="meta" style="margin-top:4px">Get a safer copy: watermarked for one company, account number masked, balance summary only.</p>
        <button type="button" class="btn btn-dark" style="margin-top:12px" data-toast="Safer copy downloaded (watermarked, masked)">${icon("download")}Download safer copy</button>
      </div>`,
  },

  // ---- Outcome screens ----
  sent: {
    title: "Transfer",
    back: "home",
    tab: "pay",
    render: () => `
      <div class="done bad"><span class="big-icon">${icon("send")}</span><h2>Payment sent</h2>
      <p>${state.on ? "Ollie has saved what he found in case you need to report it later." : "Tip: turn on the scam protection extension so Ollie can pause unusual payments."}</p></div>
      <div class="btn-stack"><button type="button" class="btn btn-secondary" data-go="home">Back to home</button>${state.on ? "" : `<button type="button" class="btn btn-primary" data-go="security">Turn on scam protection</button>`}</div>`,
  },
  reported: {
    title: "Transfer cancelled",
    back: "home",
    tab: "pay",
    render: () => `
      <div class="done good"><span class="big-icon">${icon("check")}</span><h2>Your money is safe</h2>
      <p>The transfer was cancelled and the case was sent to the OCBC triage team with the evidence you checked.</p>
      <span class="case-ref num">Case RC-2041</span></div>
      <div style="margin-top:18px">${tip("You did the right thing. Your money did not leave your account.")}</div>
      <div class="btn-stack"><button type="button" class="btn btn-secondary" data-go="home">Back to home</button></div>`,
  },
  "reported-qr": {
    title: "QR reported",
    back: "home",
    tab: "pay",
    render: () => `
      <div class="done good"><span class="big-icon">${icon("check")}</span><h2>QR reported, payment cancelled</h2>
      <p>Thanks. Other customers will be warned before paying this QR.</p><span class="case-ref num">Case RC-2042</span></div>
      <div class="btn-stack"><button type="button" class="btn btn-secondary" data-go="home">Back to home</button></div>`,
  },
  "reported-request": {
    title: "Request reported",
    back: "statements",
    tab: "more",
    render: () => `
      <div class="done good"><span class="big-icon">${icon("check")}</span><h2>Request reported</h2>
      <p>Your statement was not downloaded. If you already sent one, call the bank so they can watch your account.</p><span class="case-ref num">Case RC-2043</span></div>
      <div class="btn-stack"><button type="button" class="btn btn-secondary" data-go="home">Back to home</button></div>`,
  },
  "login-blocked": {
    title: "Login blocked",
    back: "home",
    tab: "home",
    render: () => `
      <div class="done good"><span class="big-icon">${icon("lock")}</span><h2>We blocked that login</h2>
      <p>The code was never shown. Hang up on anyone asking for it, and don’t share any codes that arrive next.</p><span class="case-ref num">Case RC-2044</span></div>
      <div class="btn-stack"><button type="button" class="btn btn-primary" data-toast="Calling the bank's official hotline (demo)">${icon("phone")}Call the bank</button><button type="button" class="btn btn-secondary" data-go="home">Back to home</button></div>`,
  },
};

// ---------- Bottom sheets ----------

// E3 Smart Pause
function smartPauseSheet() {
  return {
    code: "E3",
    html: `
      <div class="pause-head">${ollie()}<div><div class="eyebrow">Smart Pause</div><h2 id="sheetTitle">Let’s pause for a moment</h2></div></div>
      <p style="margin-top:12px;color:var(--ink-2)">This transfer is different from your usual ones:</p>
      <ul class="reasons">
        <li>${icon("alert")}Apex Trading Pte Ltd was added as a payee 3 minutes ago</li>
        <li>${icon("alert")}S$4,800 is much more than you usually send</li>
        <li>${icon("alert")}It is 60% of your available balance</li>
      </ul>
      <div class="btn-stack">
        ${active("spellbreak") ? `<button type="button" class="btn btn-primary" data-go="verify">Verify first</button>` : `<button type="button" class="btn btn-primary" data-go="home" data-toast="Transfer cancelled">Cancel transfer</button>`}
        <button type="button" class="btn btn-ghost" data-go="sent">I know what I’m doing</button>
      </div>`,
  };
}

// E6 purpose question
function qrPurposeSheet() {
  const opts = [
    ["gov", "Government fine", "For example URA, LTA or HDB"],
    ["charity", "Charity", "A donation"],
    ["shop", "Shop or merchant", "Buying something"],
    ["person", "A person", "Friend, family or seller"],
  ];
  return {
    code: "E6",
    html: `
      <h2 id="sheetTitle" style="font-size:1.25rem">What are you paying for?</h2>
      <p class="muted small" style="margin:4px 0 14px">One tap, so we can check the QR matches.</p>
      <div class="options" role="radiogroup" aria-labelledby="sheetTitle" id="qrOptions">
        ${opts.map(([v, t, s]) => `<button type="button" class="option" role="radio" aria-checked="false" data-v="${v}" data-label="${t}"><span class="radio"></span><span class="grow"><strong>${t}</strong><span class="sub">${s}</span></span></button>`).join("")}
      </div>
      <div class="btn-stack"><button type="button" class="btn btn-primary" id="qrContinue" disabled>Continue</button></div>`,
    mount(sheet) {
      let picked = null;
      sheet.querySelectorAll(".option").forEach((o) =>
        o.addEventListener("click", () => {
          picked = o;
          sheet.querySelectorAll(".option").forEach((x) => x.setAttribute("aria-checked", String(x === o)));
          $("#qrContinue", sheet).disabled = false;
        })
      );
      $("#qrContinue", sheet).addEventListener("click", () => {
        session.qrPurposeShort = picked.dataset.label;
        session.qrPurpose = picked.dataset.v === "gov" ? "URA fine" : picked.dataset.label.toLowerCase();
        // The QR pays a personal account: only a mismatch for government, charity or shop payments
        if (picked.dataset.v === "person") { closeSheet(); go("sent"); }
        else go("qr-mismatch");
      });
    },
  };
}

// E9 who is the statement for?
function statementSheet() {
  const who = ["Myself", "Government agency", "Bank or licensed lender", "Landlord or property agent", "Employer or recruiter", "Someone I met online"];
  return {
    code: "E9",
    html: `
      <h2 id="sheetTitle" style="font-size:1.25rem">Who is this document for?</h2>
      <p class="muted small" style="margin:4px 0 12px">${escapeHtml(session.month || "")} statement</p>
      <div class="options" role="radiogroup" aria-labelledby="sheetTitle" id="whoOptions">
        ${who.map((w) => `<button type="button" class="option" role="radio" aria-checked="false" data-who="${w}"><span class="radio"></span><span class="grow"><strong>${w}</strong></span></button>`).join("")}
      </div>
      <p class="section-title" id="howLabel">How did they ask for it?</p>
      <div class="options" role="radiogroup" aria-labelledby="howLabel" id="howOptions">
        <button type="button" class="option" role="radio" aria-checked="false" data-how="official"><span class="radio"></span><span class="grow"><strong>Email, in person or website</strong></span></button>
        <button type="button" class="option" role="radio" aria-checked="false" data-how="chat"><span class="radio"></span><span class="grow"><strong>WhatsApp, Telegram or chat</strong></span></button>
      </div>
      <div class="btn-stack"><button type="button" class="btn btn-primary" id="stmtContinue" disabled>Continue</button></div>`,
    mount(sheet) {
      let whoPick = null;
      let howPick = null;
      const update = () => ($("#stmtContinue", sheet).disabled = !(whoPick && (whoPick === "Myself" || howPick)));
      sheet.querySelectorAll("#whoOptions .option").forEach((o) =>
        o.addEventListener("click", () => {
          whoPick = o.dataset.who;
          sheet.querySelectorAll("#whoOptions .option").forEach((x) => x.setAttribute("aria-checked", String(x === o)));
          update();
        })
      );
      sheet.querySelectorAll("#howOptions .option").forEach((o) =>
        o.addEventListener("click", () => {
          howPick = o.dataset.how;
          sheet.querySelectorAll("#howOptions .option").forEach((x) => x.setAttribute("aria-checked", String(x === o)));
          update();
        })
      );
      $("#stmtContinue", sheet).addEventListener("click", () => {
        const risky = ["Employer or recruiter", "Someone I met online"].includes(whoPick) || (howPick === "chat" && whoPick !== "Myself");
        if (risky) go("statement-stop");
        else { closeSheet(); toast(`${session.month} statement downloaded`); }
      });
    },
  };
}

// ---------- Deepfake scan (demo data until the scan service connects in Sprint 2) ----------
const session = {};

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

function runDeepfakeScan(area) {
  area.innerHTML = `<div class="card scan-progress" aria-live="polite"><ul>${SCAN_STEPS.map((step) => `<li><span class="dot"></span>${step}</li>`).join("")}</ul></div>`;
  area.scrollIntoView({ behavior: "smooth", block: "end" });
  const items = area.querySelectorAll("li");
  let i = 0;
  const tick = () => {
    if (i > 0) items[i - 1].className = "done";
    if (i === items.length) return setTimeout(() => go("result"), 350);
    items[i].className = "active";
    i += 1;
    setTimeout(tick, 650);
  };
  tick();
}

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

const code = () => String(Math.floor(100000 + Math.random() * 900000)).replace(/(\d{3})(\d{3})/, "$1 $2");

// ---------- Router ----------
const view = $("#view");
const appbar = $("#appbar");
let current = "home";

function go(name) {
  const screen = SCREENS[name];
  if (!screen) return;
  current = name;
  closeSheet(true);

  appbar.innerHTML = `
    ${screen.back ? `<button type="button" class="icon-btn" data-go="${screen.back}" aria-label="Back">${icon("back")}</button>` : ""}
    <h1>${screen.title}</h1>
    <button type="button" class="ollie-pill ${state.on ? "" : "off"}" data-go="security" aria-label="Scam protection ${state.on ? "on" : "off"}">${ollie()}Ollie ${state.on ? "on" : "off"}</button>`;

  view.innerHTML = screen.render();
  view.scrollTop = 0;
  screen.mount?.(view);

  document.querySelectorAll("#tabbar [data-tab]").forEach((t) => {
    if (t.dataset.tab === screen.tab) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  markRail(screen.code || name);
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
}

function openSheet(sheet) {
  const el = $("#sheet");
  el.innerHTML = sheet.html;
  el.hidden = false;
  $("#sheetBackdrop").hidden = false;
  sheet.mount?.(el);
  markRail(sheet.code);
  el.querySelector("button")?.focus({ preventScroll: true });
}

function closeSheet(silent) {
  $("#sheet").hidden = true;
  $("#sheetBackdrop").hidden = true;
  if (!silent) markRail(SCREENS[current].code || current);
}

$("#sheetBackdrop").addEventListener("click", () => closeSheet());
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

// One click handler for every [data-go] / [data-toast] button in the app
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-go], [data-toast], [data-soon], [data-scenario]");
  if (!el) return;
  if (el.dataset.soon !== undefined) return toast("Not part of this demo");
  if (el.dataset.scenario) return runScenario(el.dataset.scenario);
  if (el.dataset.toast) toast(el.dataset.toast);
  if (el.dataset.go) go(el.dataset.go);
});

// ---------- Desktop scenario rail ----------
const RAIL = [
  ["Set up", [["E1", "Turn on the extension", "security"]]],
  ["Deepfake boss on a video call", [["E2", "Urgent transfer for “David”", "transfer"], ["E3", "Smart Pause pop-up", "pause"], ["E4", "Verify first: the video call", "verify"], ["E5", "Deepfake scan result", "result"]]],
  ["QR payment", [["E6", "What are you paying for?", "scan"], ["E7", "QR mismatch pause", "qr-mismatch"]]],
  ["Login code", [["E8", "Login Code Guard", "onetoken"]]],
  ["Statements", [["E9", "Who is this for?", "statements"], ["E10", "Statement Shield: stop", "statement-stop"]]],
];

$("#railNav").innerHTML = RAIL.map(
  ([group, items]) => `<div class="rail-group"><strong>${group}</strong>${items
    .map(([c, label, target]) => `<button type="button" data-scenario="${target}" data-code="${c}"><code>${c}</code>${label}</button>`)
    .join("")}</div>`
).join("");
$("#railOllie").innerHTML = ollieSvg();

function runScenario(target) {
  if (!state.on) { state.on = true; save(); } // scenarios need the extension on
  if (target === "pause") { go("transfer"); openSheet(smartPauseSheet()); return; }
  go(target);
}

function markRail(codeId) {
  document.querySelectorAll("#railNav [data-code]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.code === codeId)));
}

$("#resetDemo").addEventListener("click", () => {
  state = structuredClone(DEFAULT_STATE);
  save();
  go("home");
  toast("Demo reset. The extension is off.");
});

// Tab bar icons
document.querySelectorAll("#tabbar [data-icon]").forEach((s) => (s.innerHTML = icon(s.dataset.icon)));

// Start on the screen in the URL (e.g. http://localhost:4000/#scan), or Home
go(SCREENS[location.hash.slice(1)] ? location.hash.slice(1) : "home");
