const messageCheckModel = require('../models/messageCheckModel');
const scamAnalysisService = require('../services/ai/scamAnalysisService');

async function analyze(req, res) {
  try {
    const { content } = req.body;
    const result = await scamAnalysisService.analyzeText(content);
    await messageCheckModel.createMessageCheck(req.user?.id ?? null, content, result.verdict);
    res.json(result);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not complete message check' });
  }
}

module.exports = { analyze };
