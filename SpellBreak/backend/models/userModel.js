const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Create a new user. Everyone registers as a customer; employee accounts are
// promoted manually in the database:
//   UPDATE Users SET role = 'employee' WHERE email = '...';
async function createUser(name, email, passwordHash) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("name", sql.VarChar, name);
    request.input("email", sql.VarChar, email);
    request.input("password_hash", sql.VarChar, passwordHash);

    const result = await request.query(`
      INSERT INTO Users (name, email, password_hash, role)
      VALUES (@name, @email, @password_hash, 'customer');
      SELECT SCOPE_IDENTITY() AS id;
    `);
    return result.recordset[0].id;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// Used by login only - includes password_hash, so never send this to the frontend
async function getUserAuthByEmail(email) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("email", sql.VarChar, email);
    const result = await request.query(`
      SELECT id, name, email, password_hash, role
      FROM Users
      WHERE email = @email
    `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// Safe version for the frontend (no password_hash)
async function getUserById(id) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, id);
    const result = await request.query(`
      SELECT id, name, email, role, created_at
      FROM Users
      WHERE id = @id
    `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

// Used by scripts/seedDemoUsers.js to make the demo staff account
async function setUserRole(id, role) {
  try {
    const connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, id);
    request.input("role", sql.VarChar, role);
    await request.query(`UPDATE Users SET role = @role WHERE id = @id`);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

module.exports = {
  createUser,
  setUserRole,
  getUserAuthByEmail,
  getUserById,
};
