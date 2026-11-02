const loginForm = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    messageDiv.textContent = "Email and password are required.";
    messageDiv.className = "form-message is-warning";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 200) {
      const data = await response.json();
      messageDiv.textContent = `Welcome back, ${data.user.name}! Redirecting...`;
      messageDiv.className = "form-message is-success";

      // Customers go to the home page, employees to their dashboard
      const destination = data.user.role === "employee" ? "employee-dashboard.html" : "index.html";
      setTimeout(() => {
        window.location.href = destination;
      }, 700);
      return;
    }

    // 400 (validation), 401 (wrong credentials), 500: show the API's message as-is
    let errorMessage = `Unexpected status: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error) errorMessage = errorBody.error;
    } catch (parseError) {
      // response had no JSON body, keep the generic message
    }
    messageDiv.textContent = errorMessage;
    messageDiv.className = response.status >= 500 ? "form-message is-error" : "form-message is-warning";

  } catch (error) {
    console.error("Error logging in:", error);
    messageDiv.textContent = `Failed to log in: ${error.message}`;
    messageDiv.className = "form-message is-error";

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});
