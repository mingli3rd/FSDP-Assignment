const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function createTransferReview(userId, amount, recipient, riskLevel) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('userId', sql.Int, userId);
    request.input('amount', sql.Decimal(18, 2), amount);
    request.input('recipient', sql.NVarChar, recipient);
    request.input('riskLevel', sql.NVarChar, riskLevel);
    await request.query(`
      INSERT INTO TransferReviews (UserId, Amount, Recipient, RiskLevel, CreatedAt)
      VALUES (@userId, @amount, @recipient, @riskLevel, GETDATE())
    `);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { createTransferReview };
