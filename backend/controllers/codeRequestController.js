const codeRequestModel = require('../models/codeRequestModel');

async function check(req, res) {
  try {
    const { channel, message } = req.body;
    const flagged = /otp|login code|verification code/i.test(message || '');
    await codeRequestModel.createCodeRequestLog(req.user?.id ?? null, channel, flagged);
    res.json({ flagged });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not check code request' });
  }
}

module.exports = { check };
