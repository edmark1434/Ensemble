const { pool } = require('./Database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { ensureDefaultSettings } = require('../repositories/AdminSettingsRepositories');
const { connectMongoDB, getMongoClient } = require('./MongoDb');
const {
  createInboxRepositories,
  createMessageRepositories,
} = require('../repositories/InboxRepositories');
const { CONVERSATION_TYPE: DISPUTE_CHAT_TYPE } = require('../repositories/DisputeChatRepositories');
const { seedDomainExamples } = require('./SeedDomains');
const { CREDIT_TRANSACTION_TYPES, CREDIT_TRANSACTION_TYPE } = require('./CreditTransactionEnums');

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
  try {
    await pool.query(`
      TRUNCATE TABLE
        ticket_chats,
        dispute_chats,
        credit_transactions,
        tickets,
        reports,
        marketplace_listings,
        platform_settings,
        disputes,
        violations,
        restrictions,
        pardons,
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
        account_verification_sessions,
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

async function getAccountWalletId(accountId) {
  const result = await pool.query(
    `SELECT w.wallet_id
     FROM wallets w
     INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE aw.account_id = $1 AND w.type = 'account wallets'
     LIMIT 1`,
    [accountId]
  );
  return result.rows[0]?.wallet_id || null;
}

async function ensurePlatformWalletId() {
  const existing = await pool.query(
    `SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1`
  );
  if (existing.rows[0]?.wallet_id) return existing.rows[0].wallet_id;
  const created = await pool.query(
    `INSERT INTO wallets (type, status, balance_credits, frozen_balance_credits)
     VALUES ('platform wallets', 'active', 0, 0)
     RETURNING wallet_id`
  );
  return created.rows[0].wallet_id;
}

/** Freeze credits on the respondent wallet and link an Escrow Hold transaction. */
async function seedDisputeCreditHold(disputeId, respondentAccountId, amount, status = 'held') {
  const walletId = await getAccountWalletId(respondentAccountId);
  const platformWalletId = await ensurePlatformWalletId();
  if (!walletId) return null;

  await pool.query(
    `UPDATE wallets
     SET balance_credits = GREATEST(balance_credits, $2),
         frozen_balance_credits = CASE
           WHEN $3 = 'held' THEN GREATEST(frozen_balance_credits, $2)
           ELSE frozen_balance_credits
         END
     WHERE wallet_id = $1`,
    [walletId, amount, status]
  );

  const tx = await pool.query(
    `INSERT INTO credit_transactions (
       type, amount_credits, status, source_wallet_id, destination_wallet_id, related_dispute_id
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING credit_transaction_id`,
    [CREDIT_TRANSACTION_TYPE.ESCROW_HOLD, amount, status, walletId, platformWalletId, disputeId]
  );
  const txId = tx.rows[0].credit_transaction_id;
  await pool.query(
    `UPDATE disputes SET related_credit_transaction_id = $1 WHERE dispute_id = $2`,
    [txId, disputeId]
  );
  return txId;
}

async function seedDisputeChatThread(disputeId, disputeRow, staffAccountId, messages) {
  if (!getMongoClient()) return;

  const members = [];
  const seen = new Set();
  const addMember = (accountId, role) => {
    if (!accountId || seen.has(String(accountId))) return;
    seen.add(String(accountId));
    members.push({ account_id: String(accountId), role, joined_at: new Date() });
  };
  addMember(disputeRow.initiator_account_id, 'member');
  addMember(disputeRow.respondent_account_id, 'member');
  addMember(staffAccountId, 'admin');

  const insertResult = await createInboxRepositories({
    conversation_name: `Dispute ${disputeRow.dispute_number}`,
    conversation_type: DISPUTE_CHAT_TYPE,
    dispute_id: String(disputeId),
    members,
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
  });
  const chatId = String(insertResult.insertedId);

  await pool.query(
    `INSERT INTO dispute_chats (dispute_id, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (dispute_id) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, deleted_at = NULL, created_at = CURRENT_TIMESTAMP`,
    [disputeId, chatId]
  );

  let offsetMinutes = messages.length * 12;
  for (const msg of messages) {
    const createdAt = new Date(Date.now() - offsetMinutes * 60 * 1000);
    offsetMinutes -= 12;
    const audience = msg.audience || (msg.isInternal ? 'staff' : 'parties');
    await createMessageRepositories({
      conversation_id: chatId,
      sender_id: msg.senderId || null,
      message_type: 'text',
      message_content: msg.body,
      message_id_reply: null,
      attachments: [],
      links: [],
      message_react: [],
      read_by: msg.senderId ? [{ account_id: String(msg.senderId), read_at: createdAt }] : [],
      is_edited: false,
      is_deleted: false,
      is_internal: Boolean(msg.isInternal) || audience === 'staff',
      author_type: msg.authorType || 'staff',
      author_name: msg.authorName || 'Staff',
      author_role: msg.authorRole || 'staff',
      audience,
      published_at: audience === 'parties' && msg.authorRole && msg.authorRole !== 'staff' ? createdAt : null,
      created_at: createdAt,
      updated_at: createdAt,
    });
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

  // Platform report samples for every staff desk.
  // Specialist queues filter by target_type; Support + Admin see all.
  // Tuple: [number, reporterIdx, targetType, targetId, targetLabel, reason, description, status, priority, prefix, assigneeRole]
  const reportBlueprints = [
    // ── Forum queue ──────────────────────────────────────────────────────
    [0, 'member', 'u-forum-01', '@noisy_creator', 'Harassment', 'Repeated hostile messages in a critique thread after feedback.', 'open', 'high', 'forum', null],
    [2, 'group', 'fg-12', 'Design Critique Hub', 'Spam', 'Group flooded with promotional invite links.', 'in_review', 'medium', 'forum', 'Forum Moderator'],
    [5, 'discussion', 'd-44', 'Late delivery thread', 'Misinformation', 'Discussion spreads false claims about another editor.', 'open', 'low', 'forum', null],
    [3, 'member', 'u-forum-02', '@quiet_dev', 'Harassment', 'Threats referenced in forum chat and DMs.', 'open', 'high', 'forum', 'Forum Moderator'],
    [1, 'comment', 'cmt-901', 'Reply on Showcase #18', 'Hate speech', 'Comment insults another member with slurs.', 'open', 'high', 'forum', null],
    [4, 'post', 'post-220', 'Weekly reel dump', 'Spam', 'Same promotional post pasted across three groups.', 'dismissed', 'medium', 'forum', 'Admin'],
    [0, 'thread', 'thr-77', 'Client rate debate', 'Other', 'Off-topic personal attacks derailing the thread.', 'resolved', 'low', 'forum', 'Forum Moderator'],

    // ── Marketplace queue ────────────────────────────────────────────────
    [1, 'listing', 'LST-204', 'Neon LUT Pack', 'Scam', 'Buyer paid credits but never received the asset files.', 'open', 'high', 'marketplace', null],
    [4, 'seller', 'u-9', '@asset_booth', 'Copyright', 'Seller reuploads stolen marketplace packs as originals.', 'in_review', 'high', 'marketplace', 'Marketplace Moderator'],
    [2, 'listing', 'LST-318', 'Cinematic SFX Bundle', 'Misleading', 'Preview audio does not match delivered files.', 'open', 'medium', 'marketplace', null],
    [5, 'purchase', 'ORD-8821', 'Order #8821', 'Non-delivery', 'Purchase stuck in pending delivery for 9 days.', 'open', 'high', 'marketplace', 'Marketplace Moderator'],
    [3, 'asset', 'AST-55', 'Grain Overlay Pack v2', 'Quality', 'Corrupt zip and missing license file after download.', 'resolved', 'medium', 'marketplace', 'Admin'],
    [0, 'marketplace', 'mkt-policy', 'Marketplace policy', 'Other', 'General complaint about fake “verified seller” badges.', 'dismissed', 'low', 'marketplace', 'Support Moderator'],

    // ── Jobs & Gigs queue ────────────────────────────────────────────────
    [0, 'job', 'JOB-118', 'Need motion editor ASAP', 'Inappropriate', 'Job post includes abusive requirements and contact spam.', 'open', 'medium', 'jobs', null],
    [2, 'gig', 'GIG-55', 'Thumbnail design in 24h', 'Misleading', 'Gig promises impossible delivery and uses fake samples.', 'open', 'high', 'jobs', 'Jobs N Gigs Moderator'],
    [1, 'contract', 'CTR-440', 'Wedding film contract', 'Harassment', 'Client left hostile comments after milestone rejection.', 'in_review', 'high', 'jobs', null],
    [4, 'application', 'APP-903', 'Proposal on JOB-90', 'Spam', 'Applicant mass-sent identical proposals with phishing links.', 'open', 'medium', 'jobs', 'Jobs N Gigs Moderator'],
    [5, 'gig', 'GIG-201', 'Color grade overnight', 'Scam', 'Gig asks for off-platform payment before starting.', 'open', 'high', 'jobs', null],
    [3, 'feedback', 'FB-66', 'Unfair feedback on CTR-12', 'Other', 'Reported as retaliatory 1-star after a resolved dispute.', 'resolved', 'low', 'jobs', 'Admin'],

    // ── Support / Admin cross-cutting (not in specialist scopes) ─────────
    [4, 'team', 'team-2', 'Graphitee', 'Impersonation', 'Member posing as official Ensemble support in team chat.', 'open', 'high', 'support', 'Support Moderator'],
    [1, 'account', 'acc-user-7', '@seller_x', 'Account abuse', 'Multiple ban-evasion accounts linked to the same person.', 'in_review', 'high', 'support', 'Admin'],
    [2, 'profile', 'prof-18', '@mirror_edit', 'Impersonation', 'Profile photo and bio copy a known creator brand.', 'open', 'medium', 'support', null],
    [0, 'team', 'team-9', 'Nightshift Collective', 'Harassment', 'Team owner bullying members after leaving a contract.', 'open', 'high', 'support', 'Support Moderator'],
    [5, 'account', 'acc-user-3', '@alt_spam', 'Spam', 'Account used only to mass-DM promotional links.', 'resolved', 'medium', 'support', 'Admin'],
  ];

  const assigneeByRole = {
    Admin: adminStaffId,
    'Support Moderator': supportStaffId,
    'Forum Moderator': forumStaffId,
    'Marketplace Moderator': marketplaceStaffId,
    'Jobs N Gigs Moderator': jobsStaffId,
    'Jobs Moderator': jobsStaffId,
  };

  const reports = reportBlueprints.map((row, i) => {
    const [
      reporterIdx,
      targetType,
      targetId,
      targetLabel,
      reason,
      description,
      status,
      priority,
      prefix,
      assigneeRole,
    ] = row;
    return {
      number: `RPT-${String(10001 + i).padStart(5, '0')}`,
      reporterAccountId: userAccountIds[reporterIdx % userAccountIds.length],
      targetAccountId: userAccountIds[(reporterIdx + 2) % userAccountIds.length],
      targetType,
      targetId,
      targetLabel,
      reason,
      description,
      status,
      priority,
      prefix,
      assigneeId:
        status === 'resolved' || status === 'dismissed'
          ? assigneeByRole[assigneeRole] || adminStaffId
          : assigneeRole
            ? assigneeByRole[assigneeRole] || null
            : null,
    };
  });

  const reportIds = [];
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const res = await pool.query(
      `INSERT INTO reports (
        report_number, by_account_id, for_account_id,
        target_type, target_id, target_label,
        reason, description, status, priority, assigned_staff_id, created_at,
        type, reference_table, reference_prefix, reference_id, is_created_by_bot,
        resolved_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NOW() - ($12 || ' hours')::interval,
        $4, $4, $13, $14, false,
        $15
      )
      RETURNING report_id`,
      [
        r.number,
        r.reporterAccountId,
        r.targetAccountId,
        r.targetType,
        r.targetId,
        r.targetLabel,
        r.reason,
        r.description,
        r.status,
        r.priority,
        r.assigneeId,
        String(4 + i * 3),
        r.prefix,
        String(r.targetId).slice(0, 50),
        r.status === 'resolved' || r.status === 'dismissed' ? new Date() : null,
      ]
    );
    reportIds.push(res.rows[0].report_id);
  }

  console.log(
    `✅ Seeded ${reports.length} reports (forum / marketplace / jobs / support+admin samples)`
  );

  const disputes = [
    {
      number: 'DIS-PEND01',
      title: 'Milestone payment withheld',
      reason: 'Buyer filed a dispute after the final milestone was marked complete but credits were not released.',
      status: 'pending_review',
      visibility: 'pending',
      priority: 'high',
      initiatorIdx: 1,
      respondentIdx: 3,
      entityType: 'contract',
      entityId: 'CTR-PEND-01',
      assigneeId: null,
      credits: 3500,
      hold: true,
      approved: false,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 1,
    },
    {
      number: 'DIS-OPEN01',
      title: 'Payment not released from escrow',
      reason: 'Seller claims buyer abandoned milestone review after delivery.',
      status: 'open',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 4,
      respondentIdx: 0,
      entityType: 'contract',
      entityId: 'CTR-4410',
      assigneeId: supportStaffId,
      credits: 12000,
      hold: true,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 5,
      chatKey: 'open',
    },
    {
      number: 'DIS-WAIT01',
      title: 'Deliverable quality dispute',
      reason: 'Disputer says the gig delivery does not match the agreed brief.',
      status: 'awaiting_response',
      visibility: 'public',
      priority: 'medium',
      initiatorIdx: 2,
      respondentIdx: 5,
      entityType: 'gig',
      entityId: 'GIG-771',
      assigneeId: supportStaffId,
      credits: 2000,
      hold: true,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 4,
      chatKey: 'wait',
    },
    {
      number: 'DIS-REVW01',
      title: 'Asset license disagreement',
      reason: 'Marketplace buyer disputes commercial usage rights on a purchased pack.',
      status: 'under_review',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 2,
      respondentIdx: 6,
      entityType: 'marketplace',
      entityId: 'LST-992',
      assigneeId: supportStaffId,
      credits: 4500,
      hold: true,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 8,
      chatKey: 'review',
    },
    {
      // Assigned to Maya — Admin is view-only until Designated handler reassign / Assign myself when free.
      number: 'DIS-OPEN02',
      title: 'Escrow release stalled after revision',
      reason: 'Buyer asked for revisions after approving the milestone; seller wants escrow released.',
      status: 'open',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 0,
      respondentIdx: 4,
      entityType: 'contract',
      entityId: 'CTR-OPEN-02',
      assigneeId: supportStaffId,
      credits: 6500,
      hold: true,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 3,
      chatKey: 'open2',
    },
    {
      // Pending but already with Support — Admin is view-only until self-assign / reassign.
      number: 'DIS-PEND02',
      title: 'Unauthorized account credit transfer',
      reason: 'User claims credits were moved from their wallet without consent after a shared-team dispute.',
      status: 'pending_review',
      visibility: 'pending',
      priority: 'high',
      initiatorIdx: 6,
      respondentIdx: 1,
      entityType: 'team',
      entityId: 'team-2',
      assigneeId: supportStaffId,
      credits: 5200,
      hold: true,
      approved: false,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 2,
    },
    {
      number: 'DIS-SANC01',
      title: 'Repeated late delivery pattern',
      reason: 'Buyer documented three late milestones on the same seller within 30 days.',
      status: 'closed',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 7,
      respondentIdx: 8,
      entityType: 'job',
      entityId: 'JOB-5501',
      assigneeId: supportStaffId,
      credits: 900,
      hold: false,
      approved: true,
      outcome: 'sanctioned',
      sanctionType: 'warn',
      sanctionNotes: 'Formal warning issued to respondent for repeated SLA breaches.',
      resolutionNotes: 'Sanction applied after both parties were heard.',
      daysAgo: 20,
    },
    {
      number: 'DIS-RSLV01',
      title: 'Unfair contract feedback after delivery',
      reason:
        'Freelancer disputes a 1-star contract rating as retaliatory and factually inaccurate after milestone acceptance.',
      status: 'closed',
      visibility: 'public',
      priority: 'medium',
      initiatorIdx: 1,
      respondentIdx: 3,
      entityType: 'feedback',
      entityId: 'CTR-FEED-8821',
      assigneeId: adminStaffId,
      credits: 2500,
      hold: true,
      holdStatus: 'released',
      approved: true,
      outcome: 'resolved',
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: 'Rating adjusted after review; partial credit return agreed.',
      daysAgo: 45,
    },
    {
      // Open unfair-feedback dispute on a completed contract — Admin/Maya can handle.
      number: 'DIS-FEED01',
      title: 'Retaliatory feedback on closed contract',
      reason:
        'Client left unfair written feedback after accepting the final deliverable; freelancer requests review and rating correction.',
      status: 'under_review',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 4,
      respondentIdx: 0,
      entityType: 'feedback',
      entityId: 'CTR-FEED-1102',
      assigneeId: supportStaffId,
      credits: 1800,
      hold: false,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 4,
      chatKey: 'feedback',
    },
    {
      number: 'DIS-DSSM01',
      title: 'Refund window expired',
      reason: 'Buyer requested a refund outside the marketplace refund window.',
      status: 'closed',
      visibility: 'public',
      priority: 'low',
      initiatorIdx: 8,
      respondentIdx: 9,
      entityType: 'marketplace',
      entityId: 'LST-118',
      assigneeId: supportStaffId,
      credits: 800,
      hold: false,
      approved: true,
      outcome: 'dismissed',
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: 'Dismissed — purchase was outside the refund policy window.',
      daysAgo: 30,
    },
    // Legacy-style samples for Jobs / Marketplace queues
    {
      number: 'DIS-21126',
      title: 'Team revenue split',
      reason: 'Members disagree on credit distribution.',
      status: 'open',
      visibility: 'public',
      priority: 'medium',
      initiatorIdx: 5,
      respondentIdx: 7,
      entityType: 'team',
      entityId: 'team-1',
      assigneeId: adminStaffId,
      credits: 8000,
      hold: false,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 12,
    },
  ];

  const supportAccountRes = await pool.query(
    `SELECT account_id FROM staff WHERE staff_id = $1`,
    [supportStaffId]
  );
  const supportAccountId = supportAccountRes.rows[0]?.account_id || null;

  const disputeIds = [];
  const disputeByNumber = {};

  for (const d of disputes) {
    const initiatorId = userAccountIds[d.initiatorIdx % userAccountIds.length];
    const respondentId = userAccountIds[d.respondentIdx % userAccountIds.length];
    const res = await pool.query(
      `INSERT INTO disputes (
        dispute_number, title, reason, status, priority, visibility,
        initiator_account_id, respondent_account_id,
        related_entity_type, related_entity_id, assigned_staff_id,
        credit_amount_involved, opened_at, resolution_notes,
        approved_at, approved_by_staff_id, outcome, sanction_type, sanction_notes,
        type, by_account_id, for_account_id, resolved_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        NOW() - ($13 || ' days')::interval, $14,
        $15, $16, $17, $18, $19,
        $20, $7, $8, $21
      )
      RETURNING dispute_id, dispute_number, initiator_account_id, respondent_account_id`,
      [
        d.number,
        d.title,
        d.reason,
        d.status,
        d.priority,
        d.visibility,
        initiatorId,
        respondentId,
        d.entityType,
        d.entityId,
        d.assigneeId,
        d.credits,
        String(d.daysAgo),
        d.resolutionNotes,
        d.approved ? new Date(Date.now() - (d.daysAgo - 0.5) * 86400000) : null,
        d.approved ? (d.assigneeId || supportStaffId) : null,
        d.outcome,
        d.sanctionType,
        d.sanctionNotes,
        d.entityType || 'general',
        ['closed'].includes(d.status)
          ? new Date(Date.now() - (d.daysAgo - 1) * 86400000)
          : null,
      ]
    );
    const row = res.rows[0];
    disputeIds.push(row.dispute_id);
    disputeByNumber[d.number] = { ...row, ...d };

    if (d.hold) {
      await seedDisputeCreditHold(row.dispute_id, respondentId, d.credits, d.holdStatus || 'held');
    }
  }

  // Mongo middleman threads for key demo disputes (skip if Mongo unavailable)
  try {
    await connectMongoDB();
    if (getMongoClient()) {
      const open = disputeByNumber['DIS-OPEN01'];
      const wait = disputeByNumber['DIS-WAIT01'];
      const review = disputeByNumber['DIS-REVW01'];
      const open2 = disputeByNumber['DIS-OPEN02'];

      if (open) {
        await seedDisputeChatThread(open.dispute_id, open, supportAccountId, [
          {
            body: 'Dispute approved. Both parties can now participate. Please summarize your positions.',
            audience: 'parties',
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
          {
            body: 'I delivered the milestone files on time and the buyer stopped responding.',
            audience: 'author_and_staff',
            authorRole: 'disputer',
            authorName: 'Disputer',
            authorType: 'user',
            senderId: open.initiator_account_id,
          },
        ]);
      }

      if (wait) {
        await seedDisputeChatThread(wait.dispute_id, wait, supportAccountId, [
          {
            body: 'What do you have to say about this dispute against you?',
            audience: 'parties',
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
        ]);
      }

      if (review) {
        await seedDisputeChatThread(review.dispute_id, review, supportAccountId, [
          {
            body: 'What do you have to say about this dispute against you?',
            audience: 'parties',
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
          {
            body: 'The listing clearly said personal use only. Commercial rights were never included.',
            audience: 'author_and_staff',
            authorRole: 'disputee',
            authorName: 'Disputee',
            authorType: 'user',
            senderId: review.respondent_account_id,
          },
          {
            body: 'The product page title said “commercial pack” — I bought it for a client project.',
            audience: 'author_and_staff',
            authorRole: 'disputer',
            authorName: 'Disputer',
            authorType: 'user',
            senderId: review.initiator_account_id,
          },
          {
            body: 'Internal: listing copy is ambiguous; check screenshot attachments before ruling.',
            audience: 'staff',
            isInternal: true,
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
          {
            body: 'I am willing to refund half the credits if commercial rights stay revoked.',
            audience: 'parties',
            authorRole: 'disputee',
            authorName: 'Disputee',
            authorType: 'user',
            senderId: review.respondent_account_id,
          },
        ]);
      }

      if (open2) {
        await seedDisputeChatThread(open2.dispute_id, open2, supportAccountId, [
          {
            body: 'Case is public. Please keep replies private until I publish them to the other party.',
            audience: 'parties',
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
          {
            body: 'Buyer approved the milestone in writing, then asked for free extras. Please release escrow.',
            audience: 'author_and_staff',
            authorRole: 'disputer',
            authorName: 'Disputer',
            authorType: 'user',
            senderId: open2.initiator_account_id,
          },
          {
            body: 'Internal: Keep hold in place until both parties agree on the revision scope.',
            audience: 'staff',
            isInternal: true,
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
        ]);
      }

      const feedback = disputeByNumber['DIS-FEED01'];
      if (feedback) {
        await seedDisputeChatThread(feedback.dispute_id, feedback, supportAccountId, [
          {
            body: 'We’re reviewing the contract rating and written feedback. Please keep replies factual.',
            audience: 'parties',
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
          {
            body: 'The client accepted the final files, then left a 1-star review calling the work incomplete. That is unfair.',
            audience: 'author_and_staff',
            authorRole: 'disputer',
            authorName: 'Disputer',
            authorType: 'user',
            senderId: feedback.initiator_account_id,
          },
          {
            body: 'Internal: Check contract acceptance timestamps vs rating created_at before deciding.',
            audience: 'staff',
            isInternal: true,
            authorRole: 'staff',
            authorName: 'Maya Reyes',
            authorType: 'staff',
            senderId: supportAccountId,
          },
        ]);
      }
      console.log('✅ Seeded dispute chat threads in MongoDB');
    } else {
      console.log('ℹ️ MongoDB unavailable — dispute chat threads skipped');
    }
  } catch (err) {
    console.warn('ℹ️ Dispute chat seed skipped:', err.message);
  }

  const tickets = [
    // ticket_number, reason, type, priority, status, channel, account_id, handled_by, related_report, related_dispute, lastAuthor, escalatedTo
    ['TKT-50001', 'Cannot verify payment method', 'Credit Top-ups', 'High', 'Open', 'web', userAccountIds[0], supportStaffId, reportIds[0], null, 'user', null],
    ['TKT-50002', 'Account locked after password reset', 'Account Access', 'High', 'In Progress', 'web', userAccountIds[3], supportStaffId, null, null, 'user', null],
    ['TKT-50003', 'Credits missing after package purchase', 'Credit Top-ups', 'High', 'Open', 'web', userAccountIds[4], adminStaffId, null, disputeByNumber['DIS-OPEN01']?.dispute_id || null, 'staff', null],
    ['TKT-50004', 'Forum group ownership transfer', 'Forums', 'Medium', 'In Progress', 'web', userAccountIds[2], forumStaffId, reportIds[1], null, 'user', null],
    ['TKT-50005', 'How to invite team members?', 'Other', 'Low', 'Resolved', 'web', userAccountIds[6], supportStaffId, null, null, 'staff', null],
    ['TKT-50006', 'Marketplace listing rejected', 'Asset Marketplace', 'Medium', 'Open', 'web', userAccountIds[7], marketplaceStaffId, reportIds[7], null, 'user', null],
    ['TKT-50007', 'Two-factor not receiving codes', 'Account Verification', 'High', 'Open', 'web', userAccountIds[1], null, null, null, 'user', null],
    ['TKT-50008', 'Dispute escalation request', 'Contracts and Milestones', 'High', 'In Progress', 'web', userAccountIds[5], null, null, disputeByNumber['DIS-21126']?.dispute_id || null, 'user', 'Jobs N Gigs Moderator'],
    ['TKT-50009', 'Asset purchase never delivered', 'Asset Marketplace', 'High', 'In Progress', 'web', userAccountIds[9], marketplaceStaffId, null, null, 'staff', null],
    ['TKT-50010', 'Gig milestone stuck in review', 'Jobs and Gigs', 'High', 'Open', 'web', userAccountIds[0], jobsStaffId, null, null, 'user', null],
    ['TKT-50011', 'Freelancer proposal spam', 'Jobs and Gigs', 'Medium', 'In Progress', 'web', userAccountIds[4], jobsStaffId, null, null, 'staff', null],
    ['TKT-50012', 'Refund status check', 'Credit Top-ups', 'Medium', 'Open', 'web', userAccountIds[2], supportStaffId, null, null, 'user', null],
    ['TKT-50013', 'Cannot upload portfolio', 'Account Access', 'Low', 'Open', 'web', userAccountIds[8], supportStaffId, null, null, 'user', null],
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
  try {
    await connectMongoDB();
    if (getMongoClient() && ticketIds.length) {
      const sampleTicketIndexes = [0, 2, 11];
      for (const idx of sampleTicketIndexes) {
        const ticketId = ticketIds[idx];
        if (!ticketId) continue;
        const ticketMeta = tickets[idx];
        const requesterAccountId = ticketMeta[6];
        const handledByStaffId = ticketMeta[7];
        let staffAccountId = supportAccountId;
        if (handledByStaffId) {
          const sa = await pool.query(`SELECT account_id FROM staff WHERE staff_id = $1`, [handledByStaffId]);
          staffAccountId = sa.rows[0]?.account_id || supportAccountId;
        }

        const members = [];
        const seen = new Set();
        const addMember = (accountId, role) => {
          if (!accountId || seen.has(String(accountId))) return;
          seen.add(String(accountId));
          members.push({ account_id: String(accountId), role, joined_at: new Date() });
        };
        addMember(requesterAccountId, 'member');
        addMember(staffAccountId, 'admin');

        const insertResult = await createInboxRepositories({
          conversation_name: `Ticket ${ticketMeta[0]}`,
          conversation_type: 'group',
          ticket_id: String(ticketId),
          support_ticket_id: String(ticketId),
          members,
          pinned_messages: [],
          created_at: new Date(),
          updated_at: new Date(),
        });
        const chatId = String(insertResult.insertedId);
        await pool.query(
          `INSERT INTO ticket_chats (ticket_id, chat_id)
           VALUES ($1, $2)
           ON CONFLICT (ticket_id) DO UPDATE
             SET chat_id = EXCLUDED.chat_id, deleted_at = NULL, created_at = CURRENT_TIMESTAMP`,
          [ticketId, chatId]
        );
        await createMessageRepositories({
          conversation_id: chatId,
          sender_id: requesterAccountId,
          message_type: 'text',
          message_content: `Hi, I need help with: ${ticketMeta[1]}`,
          message_id_reply: null,
          attachments: [],
          links: [],
          message_react: [],
          read_by: [],
          is_edited: false,
          is_deleted: false,
          is_internal: false,
          author_type: 'user',
          author_name: 'Requester',
          created_at: new Date(Date.now() - 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 60 * 60 * 1000),
        });
        if (staffAccountId) {
          await createMessageRepositories({
            conversation_id: chatId,
            sender_id: staffAccountId,
            message_type: 'text',
            message_content: 'Thanks for reaching out — looking into this now.',
            message_id_reply: null,
            attachments: [],
            links: [],
            message_react: [],
            read_by: [],
            is_edited: false,
            is_deleted: false,
            is_internal: false,
            author_type: 'staff',
            author_name: 'Support',
            created_at: new Date(Date.now() - 30 * 60 * 1000),
            updated_at: new Date(Date.now() - 30 * 60 * 1000),
          });
        }
      }
      console.log('✅ Seeded sample ticket chat threads in MongoDB');
    }
  } catch (err) {
    console.warn('ℹ️ Ticket chat seed skipped:', err.message);
  }

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
  console.log('   Demo disputes:');
  console.log('   DIS-PEND01  pending + unassigned     → Admin/Maya: Assign myself, then Approve');
  console.log('   DIS-PEND02  pending + Maya owns      → Admin: view-only / reassign via Designated handler');
  console.log('   DIS-OPEN02  public + Maya owns       → Admin: view-only / reassign via Designated handler');
  console.log('   DIS-OPEN01  public + private reply    → middleman chat sample');
  console.log('   DIS-WAIT01  awaiting disputee reply  → prompt message sample');
  console.log('   DIS-REVW01  under review + publish   → private + published party comments');
  console.log('   DIS-FEED01  unfair feedback (contract) → under review sample');
  console.log('   DIS-SANC01 / DIS-RSLV01 / DIS-DSSM01 → closed outcome samples');
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
