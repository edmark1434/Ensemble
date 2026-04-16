const client = require('./database');

async function clean() {
  try {
    console.log("🗑️ Cleaning database...");

    // Reset data and identities without relying on sequence names.
    await client.query("TRUNCATE TABLE staff, users, accounts RESTART IDENTITY CASCADE");

    console.log("✅ Database cleaned and sequences reset.");
  } catch (err) {
    console.error("❌ Cleaning Error:", err);
  } finally {
    process.exit();
  }
}

clean();