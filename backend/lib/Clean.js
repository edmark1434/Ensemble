const { pool } = require('./Database');

async function clean() {
  try {
    console.log("🗑️ Cleaning database...");

    // Reset data and identities without relying on sequence names.
    await pool.query("TRUNCATE TABLE staff, users, accounts RESTART IDENTITY CASCADE");

    console.log("✅ Database cleaned and sequences reset.");
  } catch (err) {
    console.error("❌ Cleaning Error:", err);
  } finally {
    process.exit();
  }
}

clean();