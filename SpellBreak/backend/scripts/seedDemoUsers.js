// Creates the two demo login accounts listed in the README (synthetic people only).
// Run once after schema.sql and seed.sql:   npm run seed:demo
// Safe to run again: accounts that already exist are skipped.

const dotenv = require("dotenv");
dotenv.config();

const bcrypt = require("bcrypt");
const sql = require("mssql");
const userModel = require("../models/userModel");

const DEMO_USERS = [
  { name: "Alex Lim", email: "alex.lim@spellbreak.test", password: "Demo@1234", role: "customer" },
  { name: "Nur Aisyah", email: "nur.aisyah@spellbreak.test", password: "Staff@1234", role: "employee" },
];

async function main() {
  for (const user of DEMO_USERS) {
    const existing = await userModel.getUserAuthByEmail(user.email);
    if (existing) {
      console.log(`Skipped ${user.email} (already exists)`);
      continue;
    }
    const passwordHash = await bcrypt.hash(user.password, 10);
    const id = await userModel.createUser(user.name, user.email, passwordHash);
    if (user.role !== "customer") await userModel.setUserRole(id, user.role);
    console.log(`Created ${user.role} ${user.email}`);
  }
}

main()
  .then(() => console.log("Demo accounts ready."))
  .catch((error) => {
    console.error("Could not create demo accounts. Check backend/.env and that schema.sql has been run.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sql.close());
