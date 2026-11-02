const apiBaseUrl = "http://localhost:3000";

// Returns the logged-in user ({ id, name, email, role, created_at }) or null
async function getCurrentUser() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });
    if (response.status === 200) {
      return await response.json();
    }
  } catch (error) {
    console.error("Session check failed:", error);
  }
  return null;
}

async function logout() {
  try {
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Error logging out:", error);
  } finally {
    window.location.href = "index.html";
  }
}

// Fills <div id="navAuth"> with "Hi, <name> | Log out" or "Log in | Register"
async function renderNav() {
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return null;

  const user = await getCurrentUser();

  if (user) {
    navAuth.innerHTML = "";

    const greeting = document.createElement("span");
    greeting.textContent = `Hi, ${user.name}`; // textContent so a name can't inject HTML

    const sep = document.createElement("span");
    sep.className = "nav-sep";
    sep.textContent = "|";

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "nav-link-btn";
    logoutBtn.textContent = "Log out";
    logoutBtn.addEventListener("click", logout);

    navAuth.append(greeting, sep, logoutBtn);
  } else {
    navAuth.innerHTML = `
      <a href="login.html">Log in</a>
      <span class="nav-sep">|</span>
      <a href="register.html">Register</a>
    `;
  }

  return user;
}

renderNav();
