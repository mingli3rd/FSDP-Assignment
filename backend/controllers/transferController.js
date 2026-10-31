const transferModel = require('../models/transferModel');
const riskService = require('../services/riskService');

async function review(req, res) {
  try {
    const { amount, recipient, recipientIsNew, recentScamSignal } = req.body;
    const { score, requiresFriction } = riskService.assessTransferRisk({
      amount,
      recipientIsNew,
      recentScamSignal,
    });
    const riskLevel = requiresFriction ? 'high' : 'low';
    await transferModel.createTransferReview(req.user?.id ?? null, amount, recipient, riskLevel);
    res.json({ score, requiresFriction, riskLevel });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not review transfer' });
  }
}

module.exports = { review };
