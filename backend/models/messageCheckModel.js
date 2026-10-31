const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function createMessageCheck(userId, content, verdict) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('userId', sql.Int, userId);
    request.input('content', sql.NVarChar, content);
    request.input('verdict', sql.NVarChar, verdict);
    await request.query(`
      INSERT INTO MessageChecks (UserId, Content, Verdict, CreatedAt)
      VALUES (@userId, @content, @verdict, GETDATE())
    `);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { createMessageCheck };
