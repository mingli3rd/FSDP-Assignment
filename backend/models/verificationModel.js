const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function getOfficialChannels() {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    const result = await request.query('SELECT * FROM OfficialChannels');
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { getOfficialChannels };
