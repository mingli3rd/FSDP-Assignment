const healthDot = document.getElementById("healthDot");
const healthText = document.getElementById("healthText");

async function checkSystem() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`);
    const data = await response.json();

    if (response.status === 200 && data.status === "ok") {
      healthDot.className = "status-dot is-ok";
      healthText.textContent = `Server and database are running (${data.scenarios} scenarios loaded).`;
    } else {
      healthDot.className = "status-dot is-error";
      healthText.textContent = `Server error: ${data.message || "health check failed"}`;
    }
  } catch (error) {
    console.error("Health check failed:", error);
    healthDot.className = "status-dot is-error";
    healthText.textContent = "Cannot reach the server. Is it running on port 3000?";
  }
}

checkSystem();
