const { pool } = require('./Database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { ensureDefaultSettings } = require('../repositories/AdminSettingsRepositories');
const { seedDomainExamples } = require('./SeedDomains');
const { CREDIT_TRANSACTION_TYPES } = require('./CreditTransactionEnums');
const { seedSampleJobs } = require('./SeedJobs');

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
async function seedDefaultTOS() {
  // 1. Seed Default TOS
  await pool.query(`
    INSERT INTO terms_of_service (
      terms_id, terms_title, terms_description, terms_type, is_default
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000001',
      'Standard Platform TOS',
      '1. All deliverables remain property of the creator until final milestone payout.\\n2. Source files delivered upon project completion.\\n3. Communication conducted via platform inbox.\\n4. Additional revisions outside milestone quotas billed at agreed additional work rate.',
      'jobs',
      TRUE
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      'Strict IP Transfer TOS',
      '1. Full IP transfer granted immediately upon each milestone approval.\\n2. Raw media and project files transferred after step sign-off.\\n3. Non-disclosure agreement applies to all unreleased media.',
      'jobs',
      TRUE
    )
    ON CONFLICT (terms_id) DO NOTHING;
  `);
}

async function resetSeedTables() {
  // Prefer clearing portal + auth + demo domain tables. CASCADE handles FKs.
  // Keep migration catalogs (plans, tags, surveys, ticket_*_catalog, files/system_files).
  // Support tickets, disputes, and reports are not seeded. Account reset still clears rows that reference those accounts.
  try {
    await pool.query(`
      TRUNCATE TABLE
        credit_transactions,
        marketplace_listings,
        configuration,
        violations,
        restrictions,
        pardons,
        account_activity,
        notifications,
        cashouts,
        topups,
        payment_methods,
        payments,
        subscription_invoices,
        market_project_assets,
        market_media_assets,
        market_asset_tags,
        asset_replies,
        asset_comments,
        market_assets,
        media_assets,
        escrow_wallets,
        gig_response_attachments,
        gig_responses,
        gig_request_addons,
        gig_requests,
        gig_requirement_choices,
        gig_requirements,
        gig_tier_features,
        gig_tiers,
        gig_features,
        gig_addons,
        gig_milestones,
        gig_attachments,
        gig_tags,
        gig_contracts,
        gigs,
        submit_replies,
        submit_comments,
        submit_attachments,
        milestone_submits,
        contract_milestones,
        job_contracts,
        ratings,
        interview_messages,
        interviews,
        proposal_milestones,
        proposals,
        job_attachments,
        job_tags,
        jobs,
        contracts,
        project_members,
        blocks,
        projects,
        account_badges,
        badges,
        badge_categories,
        account_link,
        account_profile_files,
        user_tags,
        user_platform_purpose,
        user_survey_responses,
        verification_sessions,
        staff,
        users,
        accounts
      CASCADE
    `);
  } catch (err) {
    console.warn('ℹ️ Full truncate failed, falling back to accounts cascade:', err.message);
    await pool.query('TRUNCATE TABLE staff, users, accounts CASCADE');
  }
}

async function seedMarketplaceListings(userAccountIds, staffByRole) {
  const marketplaceStaffId = staffByRole['Marketplace Moderator'] || null;
  const categories = ['3D Models', 'UI Kits', 'Audio', 'Stock Photos', 'Templates', 'Icons'];
  const statuses = ['pending', 'pending', 'approved', 'approved', 'rejected', 'pending', 'approved', 'rejected'];

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const isReviewed = status !== 'pending';
    const listingNumber = `LST-${30000 + i}`;
    await pool.query(
      `INSERT INTO marketplace_listings (
        listing_number, submitted_by_account_id, title, description, category,
        price_credits, thumbnail_url, status, rejection_reason,
        reviewed_by_staff_id, reviewed_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW() - ($12 || ' hours')::interval)`,
      [
        listingNumber,
        userAccountIds[i % userAccountIds.length],
        cap(faker.commerce.productName(), 255),
        faker.commerce.productDescription(),
        categories[i % categories.length],
        faker.number.int({ min: 50, max: 5000 }),
        faker.image.urlPicsumPhotos(),
        status,
        status === 'rejected' ? 'Asset preview did not match final deliverable.' : null,
        isReviewed ? marketplaceStaffId : null,
        isReviewed ? new Date() : null,
        String(faker.number.int({ min: 2, max: 200 })),
      ]
    );
  }

  console.log(`✅ Seeded ${statuses.length} marketplace listings`);
}

async function seedTicketsAndDisputes(userAccountIds, staffByRole) {
  const supportStaffId = staffByRole['Support Moderator'];
  const adminStaffId = staffByRole.Admin;
  const violations = [
    ['VIO-21034', userAccountIds[3], 'Spam posting', 'Automated flag: duplicate promo links.', 2, adminStaffId],
    ['VIO-21035', userAccountIds[0], 'Harassment warning', 'Substantiated harassment report — first warning.', 3, supportStaffId],
  ];

  for (const v of violations) {
    const points = v[4];
    await pool.query(
      `INSERT INTO violations (
        violation_number, account_id, type, reason, points,
        status, staff_id, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,'active',$6,
        NOW() + (GREATEST($5::int, 1) * INTERVAL '30 days')
      )`,
      v
    );
  }

}

async function seedTeams(userAccountIds) {
  if (userAccountIds.length < 4) return;

  const usersResult = await pool.query(
    `SELECT u.user_id, u.account_id, a.handle, a.display_name
     FROM users u
     INNER JOIN accounts a ON a.account_id = u.account_id
     WHERE u.account_id = ANY($1::uuid[])
     ORDER BY u.user_id`,
    [userAccountIds]
  );
  const users = usersResult.rows;
  if (users.length < 4) return;

  const teamDefs = [
    { name: 'RavenLabs LLC', handle: 'ravenlabs', leaderIdx: 0, memberIdxs: [0, 1, 2] },
    { name: 'FrameForge Collective', handle: 'frameforge', leaderIdx: 3, memberIdxs: [3, 4, 5].filter((i) => i < users.length) },
  ];

  for (const def of teamDefs) {
    const accountRes = await pool.query(
      `INSERT INTO accounts (display_name, handle, type, status, created_at)
       VALUES ($1, $2, 'Team', 'Active', NOW())
       RETURNING account_id`,
      [cap(def.name, 50), cap(def.handle, 50)]
    );
    const teamAccountId = accountRes.rows[0].account_id;

    const teamRes = await pool.query(
      `INSERT INTO teams (account_id) VALUES ($1) RETURNING team_id`,
      [teamAccountId]
    );
    const teamId = teamRes.rows[0].team_id;

    for (const idx of def.memberIdxs) {
      const member = users[idx];
      if (!member) continue;
      await pool.query(
        `INSERT INTO team_members (team_id, user_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'active', NOW())
         ON CONFLICT (team_id, user_id) DO NOTHING`,
        [teamId, member.user_id, idx === def.leaderIdx ? 'Team Leader' : 'Member']
      );
    }

    // Give the team wallet a small balance for admin economy views
    await pool.query(
      `UPDATE wallets w
       SET balance_credits = $2
       FROM account_wallets aw
       WHERE aw.account_id = $1
         AND aw.wallet_id = w.wallet_id
         AND w.type = 'account wallets'`,
      [teamAccountId, faker.number.int({ min: 500, max: 8000 })]
    );
  }

  // Seed user wallet balances + one of each CREDIT_TRANSACTION type for economy audit
  const sampleTxTypes = [...CREDIT_TRANSACTION_TYPES];
  for (let i = 0; i < Math.min(sampleTxTypes.length, users.length); i++) {
    const balance = faker.number.int({ min: 100, max: 5000 });
    const walletRes = await pool.query(
      `SELECT w.wallet_id
       FROM wallets w
       INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
       WHERE aw.account_id = $1 AND w.type = 'account wallets'
       LIMIT 1`,
      [users[i].account_id]
    );
    if (!walletRes.rows.length) continue;
    const walletId = walletRes.rows[0].wallet_id;
    await pool.query(`UPDATE wallets SET balance_credits = $2 WHERE wallet_id = $1`, [
      walletId,
      balance,
    ]);

    // Platform fee wallet as counterparty if available; otherwise self-transfer style record
    const platformWallet = await pool.query(
      `SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1`
    );
    const otherWalletId = platformWallet.rows[0]?.wallet_id || walletId;
    const txType = sampleTxTypes[i];
    const amount = faker.number.int({ min: 50, max: Math.max(50, Math.floor(balance / 2)) });
    await pool.query(
      `INSERT INTO credit_transactions (type, amount_credits, status, source_wallet_id, destination_wallet_id)
       VALUES ($1, $2, 'completed', $3, $4)`,
      [txType, amount, otherWalletId, walletId]
    );
  }

  console.log(`✅ Seeded ${teamDefs.length} teams with members and sample wallet activity`);
}

async function seed() {
  try {
    console.log("🌱 Starting Seeding...");
    console.log("🗑️ Clearing existing accounts, users, and staff...");
    await resetSeedTables();
    await ensurePasswordHashColumnCapacity();

    const STAFF_SEED = [
      {
        role: 'Admin',
        handle: 'admin',
        email: 'admin@ensemble.dev',
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Admin',
      },
      {
        role: 'Support Moderator',
        handle: 'maya_reyes',
        email: 'maya.reyes@ensemble.dev',
        firstName: 'Maya',
        lastName: 'Reyes',
        displayName: 'Maya Reyes',
      },
      {
        role: 'Marketplace Moderator',
        handle: 'noah_patel',
        email: 'noah.patel@ensemble.dev',
        firstName: 'Noah',
        lastName: 'Patel',
        displayName: 'Noah Patel',
      },
      {
        role: 'Jobs N Gigs Moderator',
        handle: 'lena_brooks',
        email: 'lena.brooks@ensemble.dev',
        firstName: 'Lena',
        lastName: 'Brooks',
        displayName: 'Lena Brooks',
      },
      {
        role: 'Forum Moderator',
        handle: 'owen_park',
        email: 'owen.park@ensemble.dev',
        firstName: 'Owen',
        lastName: 'Park',
        displayName: 'Owen Park',
      },
    ];
    const staffByRole = {};
    const userAccountIds = [];
    const saltRounds = 10;
    const staffPasswordHash = await bcrypt.hash('staff123', saltRounds);
    const userPasswordHash = await bcrypt.hash('user123', saltRounds);

    // 1. Seed STAFF (fixed named moderators — always the same after seed)
    for (const staff of STAFF_SEED) {
      const accountRes = await pool.query(
        `INSERT INTO ACCOUNTS (display_name, handle, type, status, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING account_id`,
        [cap(staff.displayName, 50), cap(staff.handle, 50), 'Staff', 'Active']
      );

      const accountId = accountRes.rows[0].account_id;

      const staffRes = await pool.query(
        `INSERT INTO STAFF (firebase_staff_uuid, first_name, last_name, role, email_address, password_hash, account_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING staff_id`,
        [
          cap(faker.string.alphanumeric(28), 50),
          cap(staff.firstName, 50),
          cap(staff.lastName, 50),
          cap(staff.role, 50),
          cap(staff.email, 50),
          staffPasswordHash,
          accountId,
        ]
      );
      staffByRole[staff.role] = staffRes.rows[0].staff_id;
    }

    // 2. Seed Regular USERS (10 random users)
    for (let i = 0; i < 10; i++) {
      const firstName = cap(faker.person.firstName(), 50);
      const lastName = cap(faker.person.lastName(), 50);
      const userHandle = cap(faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'), 50);
      const userEmail = cap(buildShortEmail(`${firstName}${lastName}`), 50);

      const accountRes = await pool.query(
        `INSERT INTO ACCOUNTS (display_name, handle, type, status, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING account_id`,
        [cap(`${firstName} ${lastName}`, 50), userHandle, 'User', 'Active']
      );

      const accountId = accountRes.rows[0].account_id;
      userAccountIds.push(accountId);

      await pool.query(
        `INSERT INTO USERS (firebase_user_uuid, first_name, last_name, email_address, password_hash, account_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cap(faker.string.alphanumeric(28), 50),
          firstName,
          lastName,
          userEmail,
          userPasswordHash,
          accountId
        ]
      );
    }
    await pool.query(
      `INSERT INTO wallets (type, status, balance_credits, frozen_balance_credits)
       VALUES ('platform wallets', 'active', 1000000, 0)`
    );
    await ensureDefaultSettings();
    await seedTicketsAndDisputes(userAccountIds, staffByRole);
    await seedMarketplaceListings(userAccountIds, staffByRole);
    await seedTeams(userAccountIds);
    await seedDomainExamples(userAccountIds, staffByRole);
    await seedDefaultTOS();
    await seedSampleJobs(userAccountIds);

    console.log('\n========================================================================');
    console.log('  [1/4] CORE PLATFORM & STAFF SEED');
    console.log('========================================================================');
    console.log(`  ✔ Seeded ${userAccountIds.length} core user accounts, platform escrow wallets & settings`);
    console.log(`  ✔ Seeded ${STAFF_SEED.length} staff accounts (password: staff123):`);
    for (const staff of STAFF_SEED) {
      console.log(`    • ${staff.role.padEnd(22)} @${staff.handle.padEnd(16)} (${staff.email})`);
    }
    console.log('  ✔ Support portal catalogs, domain samples & TOS templates initialized');
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    process.exit();
  }
}

seed();
