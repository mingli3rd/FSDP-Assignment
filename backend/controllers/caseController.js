const caseModel = require('../models/caseModel');

async function list(req, res) {
  try {
    const cases = await caseModel.getCases();
    res.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not load cases' });
  }
}

async function getById(req, res) {
  try {
    const caseRecord = await caseModel.getCaseById(req.params.id);
    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(caseRecord);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Could not load case' });
  }
}

module.exports = { list, getById };
