require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// --- Auth ---
const authController = require('./controllers/authController');
app.post('/api/auth/login', authController.login);
app.post('/api/auth/staff-login', authController.staffLogin);

// --- Message / Image Check ---
const messageCheckController = require('./controllers/messageCheckController');
app.post('/api/message-check', messageCheckController.analyze);

// --- Transfer (Friction 1) ---
const transferController = require('./controllers/transferController');
app.post('/api/transfer/review', transferController.review);

// --- Code Request (Friction 2) ---
const codeRequestController = require('./controllers/codeRequestController');
app.post('/api/code-request/check', codeRequestController.check);

// --- Verification ---
const verificationController = require('./controllers/verificationController');
app.get('/api/verification/channels', verificationController.listChannels);

// --- Case (Trust Desk) ---
const caseController = require('./controllers/caseController');
app.get('/api/cases', caseController.list);
app.get('/api/cases/:id', caseController.getById);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SpellBreak backend listening on port ${PORT}`);
});

module.exports = app;
