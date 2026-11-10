const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();
const dbConfig = require("./dbConfig");

// --- Auth (register / login / logout, shared by customers + employees) ---
const authController = require("./controllers/authController");
const { validateRegister, validateLogin } = require("./middlewares/authValidation");
const { verifyToken, requireEmployee, requireCustomer } = require("./middlewares/authMiddleware");

const analysisController = require("./controllers/analysisController");
const { validateAnalyseText } = require("./middlewares/analysisValidation");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ===================== HEALTH CHECK =====================
app.get("/api/health", async (req, res) => {
  try {
    const connection = await sql.connect(dbConfig);
    const result = await connection.request().query("SELECT COUNT(*) AS scenarios FROM Scenarios");
    res.status(200).json({ status: "ok", scenarios: result.recordset[0].scenarios });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ===================== AUTH ROUTES =====================
app.post("/api/auth/register", validateRegister, authController.register);
app.post("/api/auth/login", validateLogin, authController.login);
app.post("/api/auth/logout", authController.logout);
app.get("/api/auth/me", verifyToken, authController.getCurrentUser);

// Mobile banking demo (extension screens) on port 4000 - see mobile-server.js
require("./mobile-server");

// ===================== ANALYSIS ROUTES =====================
app.post("/api/analyse-text", verifyToken, requireCustomer, validateAnalyseText, analysisController.analyseText);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`→ http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  console.log("Server is gracefully shutting down");
  await sql.close();
  console.log("Database connections closed");
  process.exit(0);
});