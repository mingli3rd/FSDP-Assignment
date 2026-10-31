const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function findUserByEmail(email) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('email', sql.NVarChar, email);
    const result = await request.query('SELECT * FROM Users WHERE Email = @email');
    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

async function findStaffByEmail(email) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input('email', sql.NVarChar, email);
    const result = await request.query('SELECT * FROM StaffUsers WHERE Email = @email');
    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = { findUserByEmail, findStaffByEmail };
