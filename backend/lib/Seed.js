const { pool } = require('./Database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { ensureDefaultSettings } = require('../repositories/AdminSettingsRepositories');
const { seedDomainExamples } = require('./SeedDomains');
const { CREDIT_TRANSACTION_TYPES } = require('./CreditTransactionEnums');

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

async function seedSampleJobs(userAccountIds) {
  if (userAccountIds.length === 0) return;
  const clientAccountId = userAccountIds[0];

  const sampleJobs = [
    {
      id: "JP001",
      title: "Wedding Video Edit - Romantic Style",
      description: "Looking for an experienced editor to create a 10-minute wedding highlight reel. Must be proficient in color grading and narrative storytelling. Raw footage provided is around 50GB in 4K.\\n\\nRequirements:\\n• Advanced Multi-cam editing\\n• Dynamic Audio syncing & sound design\\n• High-end cinematic color grading matching log profiles.",
      status: "Open",
      category: "Events",
      difficulty: "Intermediate",
      priceRange: "28,000 ~ 36,000",
      minBudget: 28000,
      positionsNeeded: 3,
      timeline: "3-5 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Multi-cam Editing", "Color Grading", "DaVinci Resolve", "Audio Sync"],
    },
    {
      id: "JP002",
      title: "YouTube Channel Intro Animation",
      description: "Need a 10-second animated intro for a tech review channel. Should include clean typography, slick sound effects, and source project delivery file formats.",
      status: "Open",
      category: "YouTube",
      difficulty: "Beginner",
      priceRange: "12,000 ~ 14,000",
      minBudget: 12000,
      positionsNeeded: 1,
      timeline: "1-3 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["After Effects", "Motion Graphics", "Sound Design", "Typography"],
    },
    {
      id: "JP003",
      title: "Corporate Brand Identity Video",
      description: "Seeking a professional video creator to craft a high-end promotional commercial sequence highlighting global enterprise logistics infrastructure updates.",
      status: "Open",
      category: "Corporate",
      difficulty: "Expert",
      priceRange: "45,000 ~ 60,000",
      minBudget: 45000,
      positionsNeeded: 2,
      timeline: "1-2 Weeks",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Premiere Pro", "Branding", "Commercial Edit", "4K Rendering"],
    },
    {
      id: "JP004",
      title: "TikTok & Reels Content Repurposing",
      description: "Looking for an editor to turn long-form podcast episodes into engaging short-form vertical videos for TikTok and Instagram Reels. Captions, hook framing, and quick transitions required.",
      status: "Open",
      category: "Social",
      difficulty: "Intermediate",
      priceRange: "15,000 ~ 20,000",
      minBudget: 15000,
      positionsNeeded: 2,
      timeline: "5-7 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Short-form Video", "CapCut", "Subtitles & Captions", "Social Media"],
    },
    {
      id: "JP005",
      title: "E-Commerce Product Commercial Edit",
      description: "Editing footage for 3 sleek 30-second product ads for an upcoming smartwatch release. Must add motion graphics callouts for product specs and energetic music sync.",
      status: "Open",
      category: "Corporate",
      difficulty: "Intermediate",
      priceRange: "22,000 ~ 30,000",
      minBudget: 22000,
      positionsNeeded: 1,
      timeline: "3-5 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Product Ads", "Motion Callouts", "Sound Sync", "Color Correction"],
    },
    {
      id: "JP006",
      title: "Music Video Color Grading & VAX Effects",
      description: "Need an expert colorist and VFX artist to grade an indie alt-rock music video. Dark moody tones, grain pass, and subtle neon light glows required.",
      status: "Open",
      category: "Events",
      difficulty: "Expert",
      priceRange: "35,000 ~ 50,000",
      minBudget: 35000,
      positionsNeeded: 1,
      timeline: "1 Week",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["VFX", "DaVinci Resolve", "Colorist", "Glow Effects"],
    },
    {
      id: "JP007",
      title: "Gaming Channel Montage Edit",
      description: "Looking for an editor to create a fast-paced 5-minute Valorant highlights video with meme edits, sound effects, and clean 60fps slow-motion velocity curve syncing.",
      status: "Closed",
      category: "YouTube",
      difficulty: "Beginner",
      priceRange: "8,000 ~ 10,000",
      minBudget: 8000,
      positionsNeeded: 1,
      timeline: "1-2 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Velocity Sync", "Gaming Montage", "Sound SFX", "Meme Edits"],
    },
    {
      id: "JP008",
      title: "Real Estate Property Walkthrough",
      description: "Editing drone footage and interior camera pans for a luxury beachfront villa listing in Bantayan. Require smooth speed ramps and minimalist lower thirds.",
      status: "Open",
      category: "Corporate",
      difficulty: "Intermediate",
      priceRange: "18,000 ~ 25,000",
      minBudget: 18000,
      positionsNeeded: 2,
      timeline: "2-4 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Drone Footage", "Speed Ramping", "Lower Thirds", "Real Estate"],
    },
    {
      id: "JP009",
      title: "Documentary Short Film Audio Cleanup",
      description: "Seeking a sound engineer/editor to clean up noisy dialogue tracks from a street documentary recorded outdoors. Wind noise reduction and audio mastering required.",
      status: "Open",
      category: "Events",
      difficulty: "Expert",
      priceRange: "30,000 ~ 40,000",
      minBudget: 30000,
      positionsNeeded: 1,
      timeline: "1 Week",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Audio Cleanup", "iZotope RX", "Noise Reduction", "Audio Mastering"],
    },
    {
      id: "JP10",
      title: "Fitness App Workout Demo Videos",
      description: "Editing a series of 15 short exercise instruction clips. Requires side-by-side timer overlays, muscle target highlights, and royalty-free background music sync.",
      status: "Open",
      category: "Social",
      difficulty: "Beginner",
      priceRange: "10,000 ~ 15,000",
      minBudget: 10000,
      positionsNeeded: 3,
      timeline: "3-5 Days",
      thumbnail: "https://d2dl0agwn9kque.cloudfront.net/jobs/placeholder_1785849579361_08797edc.png",
      skills: ["Timer Overlay", "Batch Editing", "Video Trimming", "Fitness Edits"],
    }
  ];

  for (const job of sampleJobs) {
    const minBudget = job.minBudget || 0;
    let maxBudget = minBudget;
    if (job.priceRange) {
      const parts = job.priceRange.split('~');
      if (parts.length > 1) {
        maxBudget = parseInt(parts[1].replace(/,/g, '').trim()) || minBudget;
      } else {
        maxBudget = parseInt(parts[0].replace(/,/g, '').trim()) || minBudget;
      }
    }

    let timelineMin = 1;
    let timelineMax = 5;
    if (job.timeline.includes('Days')) {
       const parts = job.timeline.replace('Days', '').trim().split('-');
       timelineMin = parseInt(parts[0]) || 1;
       timelineMax = parseInt(parts[1]) || 5;
    } else if (job.timeline.includes('Week')) {
       timelineMin = 7;
       timelineMax = 14;
    }

    // 1. Insert job
    const jobRes = await pool.query(
      `INSERT INTO jobs (
        client_account_id, title, description, category, payment_type, experience_level,
        no_of_hires, rate_credits_min, rate_credits_max, timeline_min, timeline_max,
        status, rough_deadline, rough_no_of_revisions, posted_as
      ) VALUES ($1, $2, $3, $4, 'fixed', $5, $6, $7, $8, $9, $10, $11, NOW() + interval '14 days', 0, 'self')
      RETURNING job_id`,
      [
        clientAccountId,
        job.title,
        job.description,
        job.category,
        job.difficulty,
        job.positionsNeeded,
        minBudget,
        maxBudget,
        timelineMin,
        timelineMax,
        job.status
      ]
    );
    const jobId = jobRes.rows[0].job_id;

    // 2. Insert thumbnail file and link
    const fileRes = await pool.query(
      `INSERT INTO files (name, path, mime_type, size_bytes) VALUES ($1, $2, 'image/png', 0) RETURNING file_id`,
      ['thumbnail.png', 'jobs/placeholder_1785849579361_08797edc.png']
    );
    await pool.query(
      `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, 0)`,
      [jobId, fileRes.rows[0].file_id]
    );

    // 3. Insert tags and link
    if (job.skills) {
      for (const tag of job.skills) {
        let tagId;
        const existingTag = await pool.query(`SELECT tag_id FROM tags WHERE LOWER(name) = LOWER($1)`, [tag]);
        if (existingTag.rows.length > 0) {
          tagId = existingTag.rows[0].tag_id;
        } else {
          const newTag = await pool.query(`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`, [tag]);
          tagId = newTag.rows[0].tag_id;
        }
        await pool.query(`INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [jobId, tagId]);
      }
    }
  }
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

    console.log('');
    console.log('🔑 Staff login (password: staff123):');
    for (const staff of STAFF_SEED) {
      console.log(`   ${staff.role.padEnd(24)} ${staff.email}  /  @${staff.handle}  (${staff.displayName})`);
    }
    console.log(`✨ Seeding complete! ${userAccountIds.length} users, ${STAFF_SEED.length} staff, portal + domain examples loaded.`);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    process.exit();
  }
}

seed();
