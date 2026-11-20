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

// --- Spellbreak AI check (SCRUM-17) ---
const checkController = require("./controllers/checkController");
const { validateCheck } = require("./middlewares/checkValidation");
const { uploadCheckImage } = require("./middlewares/uploadImage");

// --- Cases (one-tap report + Employee Triage Dashboard: SCRUM-25, 26, 27) ---
const caseController = require("./controllers/caseController");
const { validateCreateCase, validateCaseAction, validateCaseId } = require("./middlewares/caseValidation");

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

// ===================== SPELLBREAK AI CHECK (SCRUM-17) =====================
// Logged-in customers only. uploadCheckImage runs first to read the multipart form
// (text fields + optional image), then validation, then the AI check.
app.post("/api/checks", verifyToken, requireCustomer, uploadCheckImage, validateCheck, checkController.createCheck);
app.get("/api/checks/mine", verifyToken, requireCustomer, checkController.getMyChecks);
app.get("/api/checks/:id", verifyToken, requireCustomer, checkController.getCheck);

// ===================== CASE ROUTES (customer) =====================
// SCRUM-26 one-tap report: saves a case for OCBC staff to triage
app.post("/api/cases", verifyToken, requireCustomer, validateCreateCase, caseController.createCase);

// ===================== EMPLOYEE TRIAGE ROUTES (SCRUM-25, SCRUM-27) =====================
app.get("/api/employee/cases", verifyToken, requireEmployee, caseController.listCases);
app.get("/api/employee/cases/:id", verifyToken, requireEmployee, validateCaseId, caseController.getCase);
app.post("/api/employee/cases/:id/actions", verifyToken, requireEmployee, validateCaseId, validateCaseAction, caseController.applyAction);

// Mobile banking demo (extension screens) on port 4000 - see mobile-server.js
require("./mobile-server");

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