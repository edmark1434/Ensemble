const { client } = require('./database');

async function seed() {
  for (let i = 0; i < 10; i++) {
    const user = faker.internet.username();
    const repo = faker.company.name();
    const message = faker.git.commitMessage();

    await pool.query(
      "INSERT INTO events(username, repo, message) VALUES($1,$2,$3)",
      [user, repo, message]
    );

    console.log(`Inserted: ${user}`);
  }

  console.log("✅ Seeding done!");
  process.exit();
}

seed();