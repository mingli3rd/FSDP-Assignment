const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require('../models/authModel');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await authModel.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.Id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ id: user.Id, email: user.Email });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not log in' });
  }
}

async function staffLogin(req, res) {
  try {
    const { email, password } = req.body;
    const staff = await authModel.findStaffByEmail(email);
    if (!staff || !(await bcrypt.compare(password, staff.PasswordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: staff.Id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ id: staff.Id, email: staff.Email });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not log in' });
  }
}

module.exports = { login, staffLogin };
