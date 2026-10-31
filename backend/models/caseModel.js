const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function getCases() {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    const result = await request.query('SELECT * FROM Cases ORDER BY CreatedAt DESC');
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

async function getCaseById(id) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('id', sql.Int, id);
    const result = await request.query('SELECT * FROM Cases WHERE Id = @id');
    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { getCases, getCaseById };
