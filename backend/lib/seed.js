const { pool } = require('./database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { ensureDefaultSettings } = require('../Repositories/AdminSettingsRepositories');

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

async function resetSeedTables() {
  // Prefer clearing portal + auth tables. CASCADE handles FKs; UUID tables ignore RESTART IDENTITY.
  try {
    await pool.query(`
      TRUNCATE TABLE
        ticket_chats,
        tickets,
        reports,
        marketplace_listings,
        platform_settings,
        disputes,
        violations,
        staff,
        users,
        accounts
      CASCADE
    `);
  } catch {
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
  const marketplaceStaffId = staffByRole['Marketplace Moderator'] || supportStaffId;
  const jobsStaffId = staffByRole['Jobs N Gigs Moderator'] || staffByRole['Jobs Moderator'] || supportStaffId;
  const forumStaffId = staffByRole['Forum Moderator'] || supportStaffId;

  const reports = [
    ['RPT-10001', userAccountIds[0], 'member', 'u-3', '@noisy_creator', 'Harassment', 'Repeated hostile messages in forum thread.', 'open', 'high'],
    ['RPT-10002', userAccountIds[2], 'group', 'fg-12', 'Design Critique Hub', 'Spam', 'Group flooded with promotional links.', 'in_review', 'medium'],
    ['RPT-10003', userAccountIds[4], 'team', 'team-2', 'Graphitee', 'Impersonation', 'Member posing as official support.', 'open', 'high'],
    ['RPT-10004', userAccountIds[1], 'member', 'u-7', '@seller_x', 'Scam', 'Marketplace listing never delivered after payment.', 'resolved', 'high'],
    ['RPT-10005', userAccountIds[5], 'discussion', 'd-44', 'Late delivery thread', 'Other', 'Misleading project timeline claims.', 'open', 'low'],
    ['RPT-10006', userAccountIds[3], 'member', 'u-2', '@quiet_dev', 'Harassment', 'Off-platform threats referenced in chat.', 'open', 'high'],
  ];

  const reportIds = [];
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const targetAccountId = userAccountIds[(i + 1) % userAccountIds.length];
    const res = await pool.query(
      `INSERT INTO reports (
        report_number, by_account_id, for_account_id,
        target_type, target_id, target_label,
        reason, description, status, priority, assigned_staff_id, created_at,
        type, reference_table, reference_prefix, reference_id, is_created_by_bot
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NOW() - ($12 || ' hours')::interval,
        $4, $4, $13, $14, false
      )
      RETURNING report_id`,
      [
        r[0],
        r[1],
        targetAccountId,
        r[2],
        r[3],
        r[4],
        r[5],
        r[6],
        r[7],
        r[8],
        r[7] === 'resolved' ? adminStaffId : supportStaffId,
        String(faker.number.int({ min: 2, max: 120 })),
        String(r[3] || 'id').slice(0, 50),
        String(r[3] || 'unknown').slice(0, 50),
      ]
    );
    reportIds.push(res.rows[0].report_id);
  }

  const disputes = [
    ['DIS-21123', 'Feedback dispute after delivery', 'Buyer contests quality rating on completed gig.', 'resolved', 'medium', userAccountIds[1], userAccountIds[3], 'job', 'JOB-8821', adminStaffId, 2500],
    ['DIS-21124', 'Payment not released from escrow', 'Seller claims buyer abandoned milestone review.', 'open', 'high', userAccountIds[4], userAccountIds[0], 'contract', 'CTR-4410', adminStaffId, 12000],
    ['DIS-21125', 'Asset license disagreement', 'Marketplace buyer disputes commercial usage rights.', 'under_review', 'high', userAccountIds[2], userAccountIds[6], 'marketplace', 'LST-992', adminStaffId, 4500],
    ['DIS-21126', 'Team revenue split', 'Members disagree on credit distribution.', 'open', 'medium', userAccountIds[5], userAccountIds[7], 'team', 'team-1', adminStaffId, 8000],
    ['DIS-21127', 'Refund window expired', 'Buyer requests refund outside policy window.', 'resolved', 'low', userAccountIds[8], userAccountIds[9], 'marketplace', 'LST-118', supportStaffId, 900],
  ];

  const disputeIds = [];
  for (const d of disputes) {
    const res = await pool.query(
      `INSERT INTO disputes (
        dispute_number, title, reason, status, priority,
        initiator_account_id, respondent_account_id,
        related_entity_type, related_entity_id, assigned_staff_id,
        credit_amount_involved, opened_at, resolution_notes,
        type, by_account_id, for_account_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW() - ($12 || ' days')::interval, $13, $14, $6, $7)
      RETURNING dispute_id`,
      [
        ...d.slice(0, 11),
        String(faker.number.int({ min: 3, max: 90 })),
        d[3] === 'resolved' ? 'Resolved per platform policy.' : null,
        d[7] || 'general',
      ]
    );
    disputeIds.push(res.rows[0].dispute_id);
  }

  const tickets = [
    // ticket_number, reason, type, priority, status, channel, account_id, handled_by, related_report, related_dispute, lastAuthor, escalatedTo
    ['TKT-50001', 'Cannot verify payment method', 'Credit Top-ups', 'High', 'Open', 'web', userAccountIds[0], supportStaffId, reportIds[0], null, 'user', null],
    ['TKT-50002', 'Account locked after password reset', 'Account Access', 'High', 'In Progress', 'web', userAccountIds[3], supportStaffId, null, null, 'user', null],
    ['TKT-50003', 'Credits missing after package purchase', 'Credit Top-ups', 'High', 'Open', 'web', userAccountIds[4], adminStaffId, null, disputeIds[1], 'staff', null],
    ['TKT-50004', 'Forum group ownership transfer', 'Forums', 'Medium', 'In Progress', 'web', userAccountIds[2], forumStaffId, reportIds[1], null, 'user', null],
    ['TKT-50005', 'How to invite team members?', 'Other', 'Low', 'Resolved', 'web', userAccountIds[6], supportStaffId, null, null, 'staff', null],
    ['TKT-50006', 'Marketplace listing rejected', 'Asset Marketplace', 'Medium', 'Open', 'web', userAccountIds[7], marketplaceStaffId, reportIds[2], null, 'user', null],
    ['TKT-50007', 'Two-factor not receiving codes', 'Account Verification', 'High', 'Open', 'web', userAccountIds[1], null, null, null, 'user', null],
    ['TKT-50008', 'Dispute escalation request', 'Contracts and Milestones', 'High', 'In Progress', 'web', userAccountIds[5], null, null, disputeIds[3], 'user', 'Jobs N Gigs Moderator'],
    ['TKT-50009', 'Asset purchase never delivered', 'Asset Marketplace', 'High', 'In Progress', 'web', userAccountIds[9], marketplaceStaffId, null, null, 'staff', null],
    ['TKT-50010', 'Gig milestone stuck in review', 'Jobs and Gigs', 'High', 'Open', 'web', userAccountIds[0], jobsStaffId, null, null, 'user', null],
    ['TKT-50011', 'Freelancer proposal spam', 'Jobs and Gigs', 'Medium', 'In Progress', 'web', userAccountIds[4], jobsStaffId, null, null, 'staff', null],
    ['TKT-50012', 'Live chat: refund status check', 'Credit Top-ups', 'Medium', 'Open', 'chat', userAccountIds[2], supportStaffId, null, null, 'user', null],
    ['TKT-50013', 'Live chat: cannot upload portfolio', 'Account Access', 'Low', 'Open', 'chat', userAccountIds[8], supportStaffId, null, null, 'user', null],
    ['TKT-50014', 'Cancel annual subscription', 'Subscriptions and Plans', 'Medium', 'Open', 'web', userAccountIds[1], supportStaffId, null, null, 'staff', null],
    ['TKT-50015', 'Payout not arriving', 'Withdrawing Earnings', 'High', 'Open', 'web', userAccountIds[5], null, null, null, 'user', 'Support Moderator'],
    ['TKT-50016', 'Timeline editor crash on export', 'Video Editor', 'Medium', 'In Progress', 'web', userAccountIds[6], supportStaffId, null, null, 'user', null],
  ];

  const ticketIds = [];
  for (const t of tickets) {
    const escalatedTo = t[11];
    const res = await pool.query(
      `INSERT INTO tickets (
        ticket_number, reason, type, priority, status, channel,
        account_id, handled_by_staff_id,
        related_report_id, related_dispute_id,
        last_message_author_type, message_count, last_message_at,
        escalated_to_role, escalated_by_staff_id,
        created_at, resolved_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12, NOW() - ($13 || ' hours')::interval,
        $14,$15,
        NOW() - ($16 || ' hours')::interval, $17
      )
      RETURNING ticket_id`,
      [
        t[0],
        t[1],
        t[2],
        t[3],
        t[4],
        t[5],
        t[6],
        t[7],
        t[8],
        t[9],
        t[10],
        faker.number.int({ min: 1, max: 8 }),
        String(faker.number.int({ min: 1, max: 48 })),
        escalatedTo,
        escalatedTo ? adminStaffId : null,
        String(faker.number.int({ min: 4, max: 200 })),
        t[4] === 'Resolved' || t[4] === 'Closed' ? new Date() : null,
      ]
    );
    ticketIds.push(res.rows[0].ticket_id);
  }

  // Ticket chat threads live in MongoDB (inbox + messages), linked via ticket_chats.
  // Seed does not require Mongo — chats are created when a moderator/user first replies.

  const violations = [
    ['VIO-21034', userAccountIds[3], 'Spam posting', 'Automated flag: duplicate promo links.', 2, adminStaffId],
    ['VIO-21035', userAccountIds[0], 'Harassment warning', 'Report RPT-10001 substantiated — first warning.', 3, supportStaffId],
  ];

  for (const v of violations) {
    await pool.query(
      `INSERT INTO violations (
        violation_number, account_id, title, reason, points, issued_by_staff_id,
        type, status, staff_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$3,'active',$6)`,
      v
    );
  }

  console.log(`✅ Seeded ${tickets.length} tickets, ${disputes.length} disputes, ${reports.length} reports`);
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
      `INSERT INTO accounts (display_name, handle, type, merit_score, status, created_at)
       VALUES ($1, $2, 'Team', 75, 'Active', NOW())
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

  // Seed a few user wallet balances + credit transactions for economy audit
  for (let i = 0; i < Math.min(5, users.length); i++) {
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
    await pool.query(
      `INSERT INTO credit_transactions (type, amount_credits, status, source_wallet_id, destination_wallet_id)
       VALUES ('Credit Adjustment', $1, 'completed', $2, $3)`,
      [balance, otherWalletId, walletId]
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
        `INSERT INTO ACCOUNTS (display_name, handle, type, merit_score, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING account_id`,
        [cap(staff.displayName, 50), cap(staff.handle, 50), 'Staff', 100, 'Active']
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
      console.log(`✅ Created ${staff.displayName} — ${staff.role} (${staff.email} / @${staff.handle})`);
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

    await ensureDefaultSettings();
    await seedTicketsAndDisputes(userAccountIds, staffByRole);
    await seedMarketplaceListings(userAccountIds, staffByRole);
    await seedTeams(userAccountIds);

    console.log('');
    console.log('🔑 Staff login (password: staff123):');
    for (const staff of STAFF_SEED) {
      console.log(`   ${staff.role.padEnd(24)} ${staff.email}  /  @${staff.handle}  (${staff.displayName})`);
    }
    console.log(`✨ Seeding complete! ${userAccountIds.length} users, ${STAFF_SEED.length} staff, tickets & settings loaded.`);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    process.exit();
  }
}

seed();