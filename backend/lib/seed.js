const pool = require('./database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

function cap(value, max) {
  if (value == null) return value;
  return String(value).slice(0, max);
}

function buildShortEmail(prefix) {
  const normalizedPrefix = cap(prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(), 20) || 'user';
  const suffix = faker.string.alphanumeric(6).toLowerCase();
  return `${normalizedPrefix}${suffix}@mail.com`;
}

async function ensurePasswordHashColumnCapacity() {
  const result = await pool.query(
    `SELECT table_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('users', 'staff')
       AND column_name = 'password_hash'`
  );

  for (const row of result.rows) {
    const tableName = row.table_name;
    const isTooShortVarchar = row.data_type === 'character varying' && row.character_maximum_length && row.character_maximum_length < 60;

    if (isTooShortVarchar && (tableName === 'users' || tableName === 'staff')) {
      await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN password_hash TYPE TEXT`);
      console.log(`ℹ️ Updated ${tableName}.password_hash to TEXT for bcrypt compatibility`);
    }
  }
}

async function seed() {
  try {
    console.log("🌱 Starting Seeding...");
    await ensurePasswordHashColumnCapacity();

    const roles = ['Admin', 'Support Moderator', 'Jobs N Gigs Moderator', 'Forum Moderator'];
    const saltRounds = 10;
    const staffPasswordHash = await bcrypt.hash('staff123', saltRounds);
    const userPasswordHash = await bcrypt.hash('user123', saltRounds);

    // 1. Seed STAFF (Specific Roles)
    for (const roleName of roles) {
      // Create Account entry first
      const staffFirstName = cap(faker.person.firstName(), 50);
      const staffLastName = cap(faker.person.lastName(), 50);
      const staffRole = cap(roleName, 50);
      const staffEmail = buildShortEmail(staffRole);

      const accountRes = await pool.query(
        `INSERT INTO ACCOUNTS (display_name, handle, type, merit_score, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING account_id`,
        [cap(roleName, 50), cap(roleName.toLowerCase().replace(/\s+/g, '_'), 50), 'Staff', 100, 'Active']
      );
      
      const accountId = accountRes.rows[0].account_id;

      // Create Staff entry
      await pool.query(
        `INSERT INTO STAFF (firebase_staff_uuid, first_name, last_name, role, email_address, password_hash, account_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          cap(faker.string.alphanumeric(28), 50),
          staffFirstName,
          staffLastName,
          staffRole,
          cap(staffEmail, 50),
          staffPasswordHash,
          accountId
        ]
      );
      console.log(`✅ Created Staff: ${roleName}`);
    }

    // 2. Seed Regular USERS (10 random users)
    for (let i = 0; i < 10; i++) {
      const firstName = cap(faker.person.firstName(), 50);
      const lastName = cap(faker.person.lastName(), 50);
      const userHandle = cap(faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'), 50);
      const userEmail = cap(buildShortEmail(`${firstName}${lastName}`), 50);

      const accountRes = await pool.query(
        `INSERT INTO ACCOUNTS (display_name, handle, type, merit_score, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING account_id`,
        [cap(`${firstName} ${lastName}`, 50), userHandle, 'User', 50, 'Active']
      );

      const accountId = accountRes.rows[0].account_id;

      await pool.query(
        `INSERT INTO USERS (firebase_user_uuid, xendit_customer_id, first_name, last_name, email_address, password_hash, account_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          cap(faker.string.alphanumeric(28), 50),
          cap(`cust_${faker.string.alphanumeric(15)}`, 50),
          firstName,
          lastName,
          userEmail,
          userPasswordHash,
          accountId
        ]
      );
    }

    console.log("✨ Seeding complete! 10 Users and 4 Staff members created.");
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    process.exit();
  }
}

seed();