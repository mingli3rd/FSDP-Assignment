const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

// Register a new customer account
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existing = await userModel.getUserAuthByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await userModel.createUser(name, email, passwordHash);

    res.status(201).json({ id: userId, message: "Account created. You can now log in." });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error creating account" });
  }
}

// Shared login for customers and employees. The role comes from the Users
// table, so the same login page works for both.
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await userModel.getUserAuthByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Same approach as BED: JWT stored in an HTTP-only cookie named "token"
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      message: "Logged in",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error logging in" });
  }
}

function logout(req, res) {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out" });
}

// Returns the logged-in user (req.user is set by verifyToken)
async function getCurrentUser(req, res) {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error loading user" });
  }
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};
