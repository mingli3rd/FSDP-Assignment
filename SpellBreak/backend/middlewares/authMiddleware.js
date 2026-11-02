const jwt = require("jsonwebtoken");

// Verifies the JWT stored in the "token" cookie. Any logged-in user passes.
// Attaches the decoded payload to req.user -> { id, email, role }
function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

// Use AFTER verifyToken on routes only bank staff can use
// (e.g. Employee Triage Dashboard)
function requireEmployee(req, res, next) {
  if (!req.user || req.user.role !== "employee") {
    return res.status(403).json({ error: "Access denied. Employee account required." });
  }
  next();
}

// Use AFTER verifyToken on customer-only routes (e.g. transfers)
function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ error: "Access denied. Customer account required." });
  }
  next();
}

module.exports = {
  verifyToken,
  requireEmployee,
  requireCustomer,
};
