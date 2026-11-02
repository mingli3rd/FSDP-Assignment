const registerForm = document.getElementById("registerForm");
const messageDiv = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password || !confirmPassword) {
    messageDiv.textContent = "Name, email and password are required.";
    messageDiv.className = "form-message is-warning";
    return;
  }

  if (password !== confirmPassword) {
    messageDiv.textContent = "Passwords do not match.";
    messageDiv.className = "form-message is-warning";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    if (response.status === 201) {
      messageDiv.textContent = "Account created! Redirecting to login...";
      messageDiv.className = "form-message is-success";
      registerForm.reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
      return;
    }

    // 400 (validation), 409 (email taken), 500: show the API's message as-is
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
    console.error("Error registering:", error);
    messageDiv.textContent = `Failed to register: ${error.message}`;
    messageDiv.className = "form-message is-error";

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
