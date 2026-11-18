// Shared UI for every SpellBreak page: Ollie, icons, sidebar, top bar, toasts.
// Load AFTER main.js (uses apiBaseUrl, getCurrentUser, logout).
//
// Each page sets on <body>:
//   data-page="home"            which nav item is active
//   data-crumb="Quick Scam Check"
//   data-crumb-parent="Spellbreak"   (optional)
//   data-shell="staff"          (optional, staff portal nav)

// ---------- Small helpers ----------
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${icon("check")}<span>${escapeHtml(message)}</span>`;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ---------- Ollie (original mascot: a little guardian owl) ----------
function ollieSvg() {
  return `
<svg viewBox="0 0 64 64" role="img" aria-label="Ollie">
  <path d="M13 21 L17 6 L27 15 Z" fill="#a00c17"/>
  <path d="M51 21 L47 6 L37 15 Z" fill="#a00c17"/>
  <path d="M32 11 C48 11 56 23 56 37 C56 51 46 61 32 61 C18 61 8 51 8 37 C8 23 16 11 32 11 Z" fill="#d2101e"/>
  <path d="M22 50 Q32 57 42 50" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M25 55 Q32 60 39 55" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="22.5" cy="31" r="10" fill="#ffffff"/>
  <circle cx="41.5" cy="31" r="10" fill="#ffffff"/>
  <circle cx="23.5" cy="32" r="4.6" fill="#1e2533"/>
  <circle cx="40.5" cy="32" r="4.6" fill="#1e2533"/>
  <circle cx="25" cy="30.4" r="1.5" fill="#ffffff"/>
  <circle cx="42" cy="30.4" r="1.5" fill="#ffffff"/>
  <g class="lids" style="transform-box: fill-box; transform-origin: top">
    <rect x="12.5" y="21" width="20" height="20" rx="10" fill="#d2101e"/>
    <rect x="31.5" y="21" width="20" height="20" rx="10" fill="#d2101e"/>
  </g>
  <path d="M29 39 L35 39 L32 44 Z" fill="#f5a524"/>
</svg>`;
}

function ollie(size = 44) {
  const rem = size / 16; // scales with the fluid base font size
  return `<span class="ollie" style="width:${rem}rem;height:${rem}rem">${ollieSvg()}</span>`;
}

// <div class="ollie-tip" data-ollie>Text</div> gets Ollie + bubble automatically
function renderOllieTips() {
  document.querySelectorAll("[data-ollie]").forEach((el) => {
    if (el.dataset.rendered) return;
    const from = el.dataset.from ? `<span class="from">${escapeHtml(el.dataset.from)}</span>` : "";
    el.innerHTML = `${ollie(44)}<div class="bubble">${from}${el.innerHTML}</div>`;
    el.classList.add("ollie-tip");
    el.dataset.rendered = "1";
  });
}

// ---------- Icons (24px stroke icons) ----------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  scan: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  verify: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  extension: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3Z"/>',
  play: '<path d="M8 5v14l11-7Z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7v-3M17 21v-3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

// ---------- Sidebar + top bar ----------
const CUSTOMER_NAV = [
  { id: "home", label: "Home", href: "index.html", icon: "home" },
  { group: "Spellbreak" },
  { id: "scam-check", label: "Quick Scam Check", href: "scam-check.html", icon: "scan" },
  { id: "call-check", label: "Call Context Check", href: "call-check.html", icon: "phone" },
  { group: "Stay safe" },
  { id: "verify", label: "Verify with OCBC", href: "verify.html", icon: "verify" },
  { id: "chat", label: "Chat with Ollie", href: "chat.html", icon: "chat" },
  { id: "report", label: "Reports", href: "report.html", icon: "report" },
  { id: "extension", label: "Extension", href: "extension.html", icon: "extension" },
];

const STAFF_NAV = [
  { group: "Triage" },
  { id: "triage", label: "Reported cases", href: "employee-dashboard.html", icon: "report" },
  { id: "customer-view", label: "Customer view", href: "index.html", icon: "users" },
];

function renderShell() {
  const body = document.body;
  const page = body.dataset.page;
  const isStaff = body.dataset.shell === "staff";
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");
  if (!sidebar || !topbar) return;

  const nav = (isStaff ? STAFF_NAV : CUSTOMER_NAV)
    .map((item) =>
      item.group
        ? `<div class="nav-group">${item.group}</div>`
        : `<a href="${item.href}"${item.id === page ? ' aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`
    )
    .join("");

  sidebar.innerHTML = `
    <a class="brand" href="${isStaff ? "employee-dashboard.html" : "index.html"}">
      ${ollie(38)}
      <span><span class="brand-name">SpellBreak</span><span class="brand-sub">${isStaff ? "OCBC staff portal" : "AI scam protection"}</span></span>
    </a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <div class="sidebar-foot">
      <div class="user-chip" id="userChip">
        <span class="avatar">${isStaff ? "NA" : "AL"}</span>
        <span class="who"><strong>${isStaff ? "Nur Aisyah" : "Alex Lim"}</strong><span>${isStaff ? "Demo triage officer" : "Demo user"}</span></span>
      </div>
    </div>`;

  const parent = body.dataset.crumbParent
    ? `<span class="crumb-parent">${escapeHtml(body.dataset.crumbParent)} / </span>`
    : "";
  topbar.innerHTML = `
    <button class="menu-btn" type="button" aria-label="Open menu" id="menuBtn">${icon("menu")}</button>
    <div class="crumbs">${parent}<strong>${escapeHtml(body.dataset.crumb || "")}</strong></div>
    <div class="spacer"></div>
    ${isStaff ? "" : `<a class="verify-pill" href="verify.html" aria-label="Is this really OCBC?">${icon("verify")}<span class="label-long">Is this really OCBC?</span></a>`}`;

  const shell = document.querySelector(".shell");
  document.getElementById("menuBtn").addEventListener("click", () => shell.classList.toggle("nav-open"));
  shell.addEventListener("click", (e) => {
    if (shell.classList.contains("nav-open") && !sidebar.contains(e.target) && !e.target.closest("#menuBtn")) {
      shell.classList.remove("nav-open");
    }
  });

  fillUserChip();
}

// Shows the real logged-in user if there is one, otherwise the demo persona
async function fillUserChip() {
  const chip = document.getElementById("userChip");
  if (!chip || typeof getCurrentUser !== "function") return;
  const user = await getCurrentUser();
  if (user) {
    const initials = user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    chip.innerHTML = `
      <span class="avatar">${escapeHtml(initials)}</span>
      <span class="who"><strong>${escapeHtml(user.name)}</strong><span>${user.role === "employee" ? "OCBC staff" : "Customer"}</span></span>
      <button class="link-btn" type="button" id="logoutBtn">Log out</button>`;
    document.getElementById("logoutBtn").addEventListener("click", logout);
  } else {
    chip.insertAdjacentHTML("beforeend", `<a class="link-btn" href="login.html">Log in</a>`);
  }
}

// <span data-icon="scan"></span> gets that icon
function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.iconDone) return;
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
    el.dataset.iconDone = "1";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  renderOllieTips();
  renderIcons();
});
