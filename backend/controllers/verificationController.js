const verificationModel = require('../models/verificationModel');

async function listChannels(req, res) {
  try {
    const channels = await verificationModel.getOfficialChannels();
    res.json(channels);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not load official channels' });
  }
}

module.exports = { listChannels };
