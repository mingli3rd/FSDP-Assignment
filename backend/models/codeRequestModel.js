const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function createCodeRequestLog(userId, channel, flagged) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('userId', sql.Int, userId);
    request.input('channel', sql.NVarChar, channel);
    request.input('flagged', sql.Bit, flagged);
    await request.query(`
      INSERT INTO CodeRequestLogs (UserId, Channel, Flagged, CreatedAt)
      VALUES (@userId, @channel, @flagged, GETDATE())
    `);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { createCodeRequestLog };
