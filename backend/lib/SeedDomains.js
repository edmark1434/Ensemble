const { pool } = require('./Database');
const { faker } = require('@faker-js/faker');

function cap(value, max) {
  if (value == null) return value;
  return String(value).slice(0, max);
}

async function tableExists(tableName) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rows.length > 0;
}

async function loadSeedContext(userAccountIds) {
  const users = (
    await pool.query(
      `SELECT u.user_id, u.account_id, a.handle, a.display_name
       FROM users u
       INNER JOIN accounts a ON a.account_id = u.account_id
       WHERE u.account_id = ANY($1::uuid[])
       ORDER BY u.user_id`,
      [userAccountIds]
    )
  ).rows;

  const files = (await pool.query(`SELECT file_id, name FROM files ORDER BY name LIMIT 12`)).rows;
  const tags = (await pool.query(`SELECT tag_id, name FROM tags ORDER BY name LIMIT 20`)).rows;
  const purposes = (await pool.query(`SELECT plpu_id, purpose_name FROM platform_purpose ORDER BY purpose_name`)).rows;
  const survey = (await pool.query(`SELECT survey_id FROM surveys ORDER BY created_at LIMIT 1`)).rows[0];
  const questions = survey
    ? (
        await pool.query(
          `SELECT q.question_id, q.question_type,
                  (SELECT option_id FROM question_options qo
                   WHERE qo.question_id = q.question_id
                   ORDER BY display_order LIMIT 1) AS option_id
           FROM questions q
           WHERE q.survey_id = $1
           ORDER BY display_order`,
          [survey.survey_id]
        )
      ).rows
    : [];
  const plans = (await pool.query(`SELECT plan_id, name FROM plans ORDER BY name`)).rows;
  const subscriptions = (
    await pool.query(
      `SELECT subscription_id, user_id, plan_id, status
       FROM subscriptions
       WHERE user_id = ANY($1::uuid[])
       ORDER BY created_at`,
      [users.map((u) => u.user_id)]
    )
  ).rows;

  return { users, files, tags, purposes, survey, questions, plans, subscriptions };
}

async function seedBadges(userAccountIds) {
  await pool.query(`DELETE FROM account_badges`);
  await pool.query(`DELETE FROM badges`);
  await pool.query(`DELETE FROM badge_categories`);

  const catRes = await pool.query(
    `INSERT INTO badge_categories (name, description)
     VALUES
       ('Milestones', 'Progress and completion achievements'),
       ('Community', 'Participation and collaboration badges'),
       ('Marketplace', 'Buying and selling milestones')
     RETURNING badge_category_id, name`
  );

  const cats = catRes.rows;
  const badgeDefs = [
    ['acc-alpha', 'Alpha Tester', 'Granted to core ecosystem pioneers who tested the platform during its early alpha stages.', 'alpha_access', 'boolean', 1, cats[0].badge_category_id],
    ['acc-beta', 'Beta Tester', 'Granted to core ecosystem pioneers who tested the platform during its early beta stages.', 'beta_access', 'boolean', 1, cats[0].badge_category_id],
    ['acc-freelance-1', 'Fresh Freelancer', 'Granted to users who have newly started becoming a freelancer on this platform.', 'gig_completed', 'count', 1, cats[0].badge_category_id],
    ['acc-freelance-2', 'Rising Freelancer', 'Granted to active freelancers establishing a consistent workspace pipeline.', 'gig_completed', 'count', 10, cats[0].badge_category_id],
    ['acc-freelance-3', 'Elite Freelancer', 'Granted to high-tier freelancers delivering premium-grade production deliverables.', 'gig_completed', 'count', 50, cats[0].badge_category_id],
    ['acc-freelance-4', 'Grand Freelancer', 'The absolute pinnacle of freelance production excellence across the platform ecosystem.', 'gig_completed', 'count', 100, cats[0].badge_category_id],
    ['acc-client-1', 'Fresh Client', 'Granted to users who have successfully become a Client for the first time.', 'contract_funded', 'count', 1, cats[0].badge_category_id],
    ['acc-client-2', 'Rising Client', 'Granted to clients expanding their workforce layout and regular contract deployments.', 'contract_funded', 'count', 10, cats[0].badge_category_id],
    ['acc-client-3', 'Elite Client', 'Granted to trusted high-volume spenders and milestone managers inside the hub.', 'contract_funded', 'count', 50, cats[0].badge_category_id],
    ['acc-client-4', 'Grand Client', 'Ecosystem power client commanding substantial studio pipelines and commercial arrays.', 'contract_funded', 'count', 100, cats[0].badge_category_id],
    ['acc-asset-1', 'Fresh Creator', 'Granted to users who have successfully uploaded their first production asset.', 'asset_published', 'count', 1, cats[2].badge_category_id],
    ['acc-asset-2', 'Rising Creator', 'Granted to assets creators with growing distribution tracking metrics.', 'asset_published', 'count', 10, cats[2].badge_category_id],
    ['acc-asset-3', 'Elite Creator', 'Granted to top-tier library authors crafting high-fidelity design standards.', 'asset_published', 'count', 50, cats[2].badge_category_id],
    ['acc-asset-4', 'Grand Creator', 'Legendary library architect setting the structural baseline style across the global market.', 'asset_published', 'count', 100, cats[2].badge_category_id],
  ];

  const badgeIds = [];
  let alphaBadgeId = null;

  for (const b of badgeDefs) {
    const res = await pool.query(
      `INSERT INTO badges (
         registry_id, name, description, is_secret, trigger_event_code, condition_type, condition_value, badge_category_id
       ) VALUES ($1,$2,$3,false,$4,$5,$6,$7)
       RETURNING badge_id, registry_id`,
      b
    );
    badgeIds.push(res.rows[0].badge_id);
    if (res.rows[0].registry_id === 'acc-alpha') {
      alphaBadgeId = res.rows[0].badge_id;
    }
  }

  // Grant the Alpha Badge to all seeded users
  if (alphaBadgeId) {
    for (const accountId of userAccountIds) {
      await pool.query(
        `INSERT INTO account_badges (badge_id, account_id, display_order)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [alphaBadgeId, accountId, 1] // Display order 1 by default
      );
    }
  }

  console.log(`✅ Seeded ${cats.length} badge categories, ${badgeIds.length} badges`);
}

async function seedProfileExtras(ctx) {
  const { users, files, tags, purposes, survey, questions } = ctx;

  for (let i = 0; i < Math.min(6, users.length); i++) {
    const user = users[i];
    await pool.query(
      `INSERT INTO account_link (platform, account_id, url)
       VALUES ($1, $2, $3)`,
      [
        ['Portfolio', 'Behance', 'GitHub', 'LinkedIn', 'YouTube', 'Instagram'][i],
        user.account_id,
        `https://example.com/${user.handle}`,
      ]
    );

    if (files[i]) {
      await pool.query(
        `INSERT INTO account_profile_files (file_id, account_id)
         VALUES ($1, $2)`,
        [files[i].file_id, user.account_id]
      );
    }

    if (tags.length) {
      const tag = tags[i % tags.length];
      await pool.query(
        `INSERT INTO user_tags (user_id, tag_id, proficiency, years)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [user.user_id, tag.tag_id, ['Beginner', 'Intermediate', 'Expert'][i % 3], 1 + (i % 5)]
      );
    }

    if (purposes.length) {
      await pool.query(
        `INSERT INTO user_platform_purpose (plpu_id, user_id)
         VALUES ($1, $2)`,
        [purposes[i % purposes.length].plpu_id, user.user_id]
      );
    }

    if (survey && questions.length) {
      for (const q of questions) {
        await pool.query(
          `INSERT INTO user_survey_responses (survey_id, question_id, option_id, response_text, user_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            survey.survey_id,
            q.question_id,
            q.option_id || null,
            q.option_id ? null : 'Looking to freelance and collaborate',
            user.user_id,
          ]
        );
      }
    }
  }

  console.log('✅ Seeded profile links, tags, purposes, and survey responses');
}

async function seedBillingAndMoney(ctx) {
  const { users, subscriptions, plans } = ctx;
  if (!users.length) return;

  const premium = plans.find((p) => /premium/i.test(p.name)) || plans[1] || plans[0];
  const targetUser = users[0];

  if (premium && subscriptions[0]) {
    await pool.query(
      `UPDATE subscriptions
       SET plan_id = $2, status = 'ACTIVE', updated_at = NOW()
       WHERE subscription_id = $1`,
      [subscriptions[0].subscription_id, premium.plan_id]
    );
    await pool.query(
      `INSERT INTO subscription_invoices (
         xendit_cycle_id, xendit_plan_id, amount_php_cents, status, attempt_count,
         billing_period_start, billing_period_end, paid_at, subscription_id
       ) VALUES ($1,$2,$3,'PAID',1, NOW() - interval '30 days', NOW(), NOW() - interval '29 days', $4)`,
      [
        `cycle_seed_${Date.now()}`,
        `plan_seed_${premium.plan_id.slice(0, 8)}`,
        49900,
        subscriptions[0].subscription_id,
      ]
    );
  }

  const paymentRows = [
    {
      userId: targetUser.user_id,
      referenceId: `topup_seed_${Date.now()}_1`,
      paymentId: `pay_seed_${Date.now()}_1`,
      amount: 500.0,
      credits: 500,
      status: 'PAID',
      type: 'TOPUP',
      channel: 'GCASH',
    },
    {
      userId: users[1]?.user_id || targetUser.user_id,
      referenceId: `topup_seed_${Date.now()}_2`,
      paymentId: `pay_seed_${Date.now()}_2`,
      amount: 1000.0,
      credits: 1000,
      status: 'PAID',
      type: 'TOPUP',
      channel: 'PAYMAYA',
    },
    {
      userId: users[2]?.user_id || targetUser.user_id,
      referenceId: `sub_seed_${Date.now()}_3`,
      paymentId: `pay_seed_${Date.now()}_3`,
      amount: 499.0,
      credits: 0,
      status: 'PENDING',
      type: 'SUBSCRIPTION',
      channel: 'CARD',
    },
  ];

  for (const p of paymentRows) {
    await pool.query(
      `INSERT INTO payments (
         user_id, reference_id, payment_id, channel_code, amount, currency, status,
         credits, payment_type, description, processed_at
       ) VALUES ($1,$2,$3,$4,$5,'PHP',$6,$7,$8,$9,$10)`,
      [
        p.userId,
        p.referenceId,
        p.paymentId,
        p.channel,
        p.amount,
        p.status,
        p.credits,
        p.type,
        `${p.type} seed payment`,
        p.status === 'PAID' ? new Date() : null,
      ]
    );
  }

  await pool.query(
    `INSERT INTO payment_methods (
       user_id, payment_token_id, channel_code, type, status, is_default,
       display_name, card_brand, masked_card_number, card_exp_month, card_exp_year
     ) VALUES
       ($1, $2, 'CARD', 'CREDIT_CARD', 'ACTIVE', true, 'Primary Visa', 'VISA', '**** 4242', '12', '2030'),
       ($3, $4, 'GCASH', 'EWALLET', 'ACTIVE', false, 'GCash wallet', NULL, NULL, NULL, NULL)`,
    [
      targetUser.user_id,
      `tok_seed_${faker.string.alphanumeric(12)}`,
      users[1]?.user_id || targetUser.user_id,
      `tok_seed_${faker.string.alphanumeric(12)}`,
    ]
  );

  for (let i = 0; i < Math.min(3, users.length); i++) {
    const user = users[i];
    await pool.query(
      `INSERT INTO cashouts (
         reference_id, idempotency_key, xendit_disbursement_id, xendit_channel_code, account_no, account_name,
         amount_credits, fee_php_cents, net_amount_php_cents, status, user_id
       ) VALUES ($1,$2,$3,'PH_BDO',$4,$5,$6,2500,$7,$8,$9)`,
      [
        `ref_seed_${faker.string.alphanumeric(10)}`,
        `idem_seed_${faker.string.alphanumeric(10)}`,
        `disb_seed_${faker.string.alphanumeric(10)}`,
        `00${faker.string.numeric(10)}`,
        cap(user.display_name, 50),
        faker.number.int({ min: 500, max: 3000 }),
        faker.number.int({ min: 45000, max: 295000 }),
        ['PENDING', 'SUCCEEDED', 'FAILED'][i % 3],
        user.user_id,
      ]
    );
  }

  console.log('✅ Seeded payments, topups, payment methods, invoices, cashouts');
}

async function seedProjectsAndEditor(ctx) {
  const { users } = ctx;
  if (users.length < 2) return [];

  const projectRes = await pool.query(
    `INSERT INTO projects (name, status)
     VALUES
       ('Brand Reel Q3', 'active'),
       ('Product Launch Cut', 'active'),
       ('Archive Demo', 'archived')
     RETURNING project_id, name`
  );
  const projects = projectRes.rows;

  const colors = ['#E4572E', '#29335C', '#F3A712', '#A8C686'];
  for (let i = 0; i < projects.length; i++) {
    const members = users.slice(i, i + 3);
    for (let m = 0; m < members.length; m++) {
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, role, cursor_color)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [
          projects[i].project_id,
          members[m].user_id,
          m === 0 ? 'Owner' : 'Editor',
          colors[(i + m) % colors.length],
        ]
      );
    }

    await pool.query(
      `INSERT INTO blocks (name, resolution_width, resolution_height, color_space, frame_rate, project_id)
       VALUES
         ($1, 1920, 1080, 'Rec.709', 24, $2),
         ($3, 3840, 2160, 'Rec.709', 30, $2)`,
      [
        cap(`${projects[i].name} Main`, 50),
        projects[i].project_id,
        cap(`${projects[i].name} B-roll`, 50),
      ]
    );
  }

  console.log(`✅ Seeded ${projects.length} projects with members and blocks`);
  return projects;
}

async function seedJobsDomain(ctx) {
  return { jobs: [], contracts: [] };
  const { users, tags, files } = ctx;
  if (users.length < 4) return null;

  const client = users[0];
  const freelancers = users.slice(1, 4);

  const jobRes = await pool.query(
    `INSERT INTO jobs (
       title, description, payment_type, experience_level, no_of_hires,
       rough_deadline, rough_duration_hrs, rough_no_of_revisions,
       rate_credits_min, rate_credits_max, weekly_hrs_max, status, client_account_id
     ) VALUES
       ($1, $2, 'fixed', 'Intermediate', 1, NOW() + interval '21 days', 40, 2, 1500, 3500, 20, 'Open', $3),
       ($4, $5, 'hourly', 'Expert', 1, NOW() + interval '45 days', 80, 3, 80, 150, 30, 'Open', $3),
       ($6, $7, 'fixed', 'Beginner', 2, NOW() + interval '14 days', 20, 1, 400, 900, 10, 'Closed', $8),
       ($9, $10, 'fixed', 'Intermediate', 1, NOW() + interval '30 days', 35, 2, 1200, 2800, 15, 'Paused', $3)
     RETURNING job_id, title, status`,
    [
      cap('Edit product launch video', 50),
      'Need a polished 60s product launch cut with captions and color grade.',
      client.account_id,
      cap('Ongoing YouTube editor', 50),
      'Weekly editing for a tech channel. Motion graphics experience preferred.',
      cap('Social media short pack', 50),
      'Create 5 vertical shorts from existing footage.',
      users[2].account_id,
      cap('Brand documentary assembly', 50),
      'Assemble a 8–10 minute brand documentary from existing interview footage. Needs pacing notes and temp score.',
    ]
  );
  const jobs = jobRes.rows;

  if (files[0]) {
    await pool.query(
      `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1,$2,0)
       ON CONFLICT DO NOTHING`,
      [jobs[0].job_id, files[0].file_id]
    );
  }
  if (tags[0]) {
    await pool.query(
      `INSERT INTO job_tags (job_id, tag_id) VALUES ($1,$2), ($1,$3)
       ON CONFLICT DO NOTHING`,
      [jobs[0].job_id, tags[0].tag_id, tags[1]?.tag_id || tags[0].tag_id]
    );
  }

  const proposalIds = [];
  for (let i = 0; i < freelancers.length; i++) {
    const status = i === 0 ? 'accepted' : i === 1 ? 'pending' : 'rejected';
    const res = await pool.query(
      `INSERT INTO proposals (
         letter, rate_credits, weekly_hrs_max, revision_price_credits, status,
         job_id, freelancer_account_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING proposal_id`,
      [
        `Hi ${client.display_name}, I can deliver a clean cut with captions and sound design.`,
        2200 + i * 200,
        20,
        150,
        status,
        jobs[0].job_id,
        freelancers[i].account_id,
      ]
    );
    proposalIds.push(res.rows[0].proposal_id);

    await pool.query(
      `INSERT INTO proposal_milestones (
         index, name, description, duration_hrs, no_of_revisions_max, proposal_id
       ) VALUES
         (1, 'Rough cut', 'Assembly with temp audio', 12, 1, $1),
         (2, 'Final delivery', 'Color, captions, export', 16, 2, $1)`,
      [res.rows[0].proposal_id]
    );
  }

  const acceptedProposalId = proposalIds[0];
  const interviewRes = await pool.query(
    `INSERT INTO interviews (
       session_code, scheduled_at, status, started_at, ended_at, expired_at, proposal_id
     ) VALUES (
       $1, NOW() + interval '2 days', 'scheduled',
       NOW() + interval '2 days', NOW() + interval '2 days 1 hour',
       NOW() + interval '3 days', $2
     ) RETURNING interview_id`,
    [`INT-${faker.string.alphanumeric(8).toUpperCase()}`, acceptedProposalId]
  );
  await pool.query(
    `INSERT INTO interview_messages (message, interview_id, account_id)
     VALUES
       ('Looking forward to reviewing your reel samples.', $1, $2),
       ('I will bring two style options for the opening.', $1, $3)`,
    [interviewRes.rows[0].interview_id, client.account_id, freelancers[0].account_id]
  );

  const contractRes = await pool.query(
    `INSERT INTO contracts (
       contract_type, payment_type, starts_at, rate_credits, weekly_hrs_max,
       total_hrs, revision_price_credits, status, is_private
     ) VALUES
       ('job', 'fixed', NOW() - interval '5 days', 2400, 20, 40, 150, 'active', false),
       ('job', 'fixed', NOW() - interval '40 days', 800, 10, 20, 50, 'completed', false)
     RETURNING contract_id, status`
  );
  const [activeContract, completedContract] = contractRes.rows;

  await pool.query(
    `INSERT INTO job_contracts (contract_id, proposal_id) VALUES ($1,$2)`,
    [activeContract.contract_id, acceptedProposalId]
  );

  await pool.query(
    `INSERT INTO job_contracts (contract_id, proposal_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [completedContract.contract_id, proposalIds[2] || proposalIds[0]]
  );

  const milestoneRes = await pool.query(
    `INSERT INTO contract_milestones (
       index, name, description, deadline, no_of_revisions_max, status, contract_id
     ) VALUES
       (1, 'Rough cut', 'First assembly for review', 7, 1, 'approved', $1),
       (2, 'Final delivery', 'Final graded export', 14, 2, 'submitted', $1),
       (1, 'Delivery', 'Completed social pack', 7, 1, 'approved', $2)
     RETURNING contract_milestone_id, status, contract_id`,
    [activeContract.contract_id, completedContract.contract_id]
  );

  const submitted = milestoneRes.rows.find((m) => m.status === 'submitted') || milestoneRes.rows[0];
  const submitRes = await pool.query(
    `INSERT INTO milestone_submits (index, status, contract_milestone_id, responded_at)
     VALUES
       (1, 'pending_review', $1, NULL),
       (1, 'approved', $2, NOW())
     RETURNING milestone_submit_id, status`,
    [submitted.contract_milestone_id, milestoneRes.rows[0].contract_milestone_id]
  );

  if (files[1]) {
    await pool.query(
      `INSERT INTO submit_attachments (milestone_submit_id, file_id, index)
       VALUES ($1,$2,0) ON CONFLICT DO NOTHING`,
      [submitRes.rows[0].milestone_submit_id, files[1].file_id]
    );
  }

  const commentRes = await pool.query(
    `INSERT INTO submit_comments (comment, milestone_submit_id, account_id)
     VALUES ($1,$2,$3)
     RETURNING submit_comment_id`,
    [
      'Please tighten the first 5 seconds and raise music bed.',
      submitRes.rows[0].milestone_submit_id,
      client.account_id,
    ]
  );
  await pool.query(
    `INSERT INTO submit_replies (reply, submit_comment_id, account_id)
     VALUES ($1,$2,$3)`,
    ['Will revise and re-upload tonight.', commentRes.rows[0].submit_comment_id, freelancers[0].account_id]
  );

  await pool.query(
    `INSERT INTO ratings (stars_out_of_five, feedback, contract_id, account_id)
     VALUES (5, 'Clean delivery and great communication.', $1, $2)`,
    [completedContract.contract_id, client.account_id]
  );

  const escrowWallet = await pool.query(
    `INSERT INTO wallets (type, status, balance_credits, frozen_balance_credits)
     VALUES ('escrow wallets', 'active', 2400, 2400)
     RETURNING wallet_id`
  );
  await pool.query(
    `INSERT INTO escrow_wallets (wallet_id, contract_id) VALUES ($1,$2)`,
    [escrowWallet.rows[0].wallet_id, activeContract.contract_id]
  );

  console.log(`✅ Seeded ${jobs.length} jobs with proposals, interview, contracts, escrow`);
  return { jobs, contracts: contractRes.rows };
}

async function seedGigsDomain(ctx) {
  const { users, tags, files } = ctx;
  if (users.length < 4) return null;

  const getSeller = (index) => users[(index % (users.length - 1)) + 1].account_id;

  const gigTemplates = [
    {
      title: "I will edit your YouTube gaming highlights",
      description: "Fast-paced, engaging edits for your Twitch VODs or gaming footage. I add memes, sound effects, subtitles, and zooms to retain audience retention and maximize watch time on your channel.",
      category: "YouTube",
      status: "Open",
      slots: 10,
      tiers: [
        { title: "Basic - Short Highlight", desc: "Up to 5 mins of edited gameplay from a 30 min VOD.", price: 500, days: 2, revs: 1 },
        { title: "Standard - Standard Vid", desc: "Up to 10 mins of highly edited gameplay from 1 hr VOD.", price: 1200, days: 4, revs: 2 },
        { title: "Premium - Full Stream", desc: "Up to 20 mins of premium editing from a 4 hour stream.", price: 2500, days: 7, revs: 4 }
      ]
    },
    {
      title: "I can create cinematic wedding video edits",
      description: "Turn your special day into a cinematic masterpiece. I handle color grading, audio synchronization, slow-motion enhancements, and emotional storytelling to create a beautiful wedding film.",
      category: "Events",
      status: "Open",
      slots: 5,
      tiers: [
        { title: "Basic - Teaser Video", desc: "A 1-minute cinematic teaser trailer of the wedding.", price: 1000, days: 4, revs: 1 },
        { title: "Standard - Highlight Film", desc: "A 5-8 minute cinematic highlight film with color grading.", price: 3000, days: 10, revs: 3 },
        { title: "Premium - Documentary", desc: "Full 20+ minute documentary style film + highlight video.", price: 6000, days: 21, revs: 5 }
      ]
    },
    {
      title: "I will edit your corporate promotional videos",
      description: "Professional and sleek edits for your business. Perfect for product launches, brand overviews, and internal communications. Includes royalty-free music, lower thirds, and brand coloring.",
      category: "Corporate",
      status: "Open",
      slots: 8,
      tiers: [
        { title: "Basic - Simple Promo", desc: "Up to 2 mins with basic cuts, text, and music.", price: 800, days: 3, revs: 2 },
        { title: "Standard - Brand Story", desc: "Up to 5 mins with advanced B-roll integration and grading.", price: 1800, days: 7, revs: 4 },
        { title: "Premium - Full Campaign", desc: "Multiple cuts for different platforms + source files.", price: 3500, days: 14, revs: 6 }
      ]
    },
    {
      title: "I can produce engaging TikTok and Reels",
      description: "Maximize your viral potential on TikTok, IG Reels, and YouTube Shorts. I provide Alex Hormozi-style captions, fast cuts, engaging sound design, and trend-focused editing.",
      category: "Social",
      status: "Open",
      slots: 10,
      tiers: [
        { title: "Basic - Single Short", desc: "1 fully edited short-form video up to 60 seconds.", price: 200, days: 2, revs: 1 },
        { title: "Standard - Weekly Pack", desc: "5 edited short-form videos with animated captions.", price: 900, days: 7, revs: 2 },
        { title: "Premium - Monthly Viral", desc: "20 short-form videos optimized for multi-platform posting.", price: 3000, days: 21, revs: 5 }
      ]
    },
    {
      title: "I will color grade your short films or ads",
      description: "Professional color correction and grading using DaVinci Resolve. I ensure shot matching, skin tone preservation, and cinematic look development tailored to your narrative.",
      category: "Corporate",
      status: "Open",
      slots: 4,
      tiers: [
        { title: "Basic - Color Correction", desc: "Basic balancing and exposure matching up to 2 mins.", price: 400, days: 3, revs: 1 },
        { title: "Standard - Cinematic Grade", desc: "Advanced look development and grading up to 5 mins.", price: 1200, days: 6, revs: 3 },
        { title: "Premium - Feature Film", desc: "Full workflow for short films up to 20 minutes.", price: 3500, days: 14, revs: 5 }
      ]
    },
    {
      title: "I can edit your travel vlog dynamically",
      description: "Bring your travel memories to life. I use dynamic transitions, speed ramps, immersive soundscapes, and vibrant color grading to make your travel vlog stand out.",
      category: "YouTube",
      status: "Open",
      slots: 6,
      tiers: [
        { title: "Basic - Simple Vlog", desc: "Up to 5 minutes of clean cuts and background music.", price: 300, days: 3, revs: 1 },
        { title: "Standard - Dynamic Edit", desc: "Up to 10 mins with speed ramps and sound design.", price: 800, days: 6, revs: 2 },
        { title: "Premium - Cinematic Vlog", desc: "Up to 20 mins of premium editing and advanced grading.", price: 1800, days: 10, revs: 4 }
      ]
    },
    {
      title: "I will mix and master your video audio",
      description: "Bad audio ruins good video. I will clean up dialogue, remove background noise, add Foley and sound effects, and master the final mix to industry broadcast standards.",
      category: "Corporate",
      status: "Open",
      slots: 8,
      tiers: [
        { title: "Basic - Noise Removal", desc: "Clean up dialogue and remove hums/hisses up to 5 mins.", price: 200, days: 2, revs: 1 },
        { title: "Standard - Audio Mix", desc: "Full sound design, music mixing, and dialogue cleanup (10 min).", price: 600, days: 4, revs: 2 },
        { title: "Premium - Pro Master", desc: "Broadcast-ready mastering and spatial audio for short films.", price: 1500, days: 7, revs: 4 }
      ]
    },
    {
      title: "I can add VFX and motion graphics",
      description: "Take your project to the next level with custom After Effects work. I offer green screen keying, rotoscoping, object removal, 3D tracking, and custom motion graphics.",
      category: "Corporate",
      status: "Open",
      slots: 5,
      tiers: [
        { title: "Basic - Simple VFX", desc: "Basic screen replacements or simple green screen keying (3 shots).", price: 500, days: 4, revs: 2 },
        { title: "Standard - Motion Pack", desc: "Custom lower thirds, title animations, and object tracking.", price: 1500, days: 8, revs: 3 },
        { title: "Premium - Advanced Comp", desc: "Complex rotoscoping, 3D camera tracking, and heavy VFX.", price: 4000, days: 15, revs: 5 }
      ]
    },
    {
      title: "I will edit professional talking head videos",
      description: "Perfect for online courses, interviews, and corporate messaging. I ensure crisp cuts, remove dead air, and add supporting B-roll or text overlays to keep viewers engaged.",
      category: "Corporate",
      status: "Open",
      slots: 10,
      tiers: [
        { title: "Basic - Clean Cuts", desc: "Up to 10 mins of removing mistakes and dead air.", price: 300, days: 2, revs: 1 },
        { title: "Standard - Engaging Edit", desc: "Up to 15 mins with B-roll, text pop-ups, and audio fix.", price: 700, days: 5, revs: 2 },
        { title: "Premium - Course Module", desc: "Up to 30 mins of highly polished educational content.", price: 1500, days: 8, revs: 3 }
      ]
    },
    {
      title: "I can create a dynamic logo reveal",
      description: "Make a strong first impression with a custom logo animation. No templates used—100% custom motion graphics tailored to your brand's style and guidelines.",
      category: "Social",
      status: "Open",
      slots: 8,
      tiers: [
        { title: "Basic - Simple Reveal", desc: "Clean and minimal 2D logo animation (up to 5 secs).", price: 200, days: 3, revs: 1 },
        { title: "Standard - Dynamic Intro", desc: "Complex 2D motion graphics with custom sound design.", price: 600, days: 5, revs: 2 },
        { title: "Premium - 3D Logo Reveal", desc: "Fully modeled 3D logo reveal with premium textures.", price: 1500, days: 10, revs: 4 }
      ]
    },
    {
      title: "I will edit your music video to the beat",
      description: "High-energy music video editing. I sync multicam footage, apply creative coloring, add flashy transitions, and edit perfectly on the beat to match the song's energy.",
      category: "Events",
      status: "Open",
      slots: 5,
      tiers: [
        { title: "Basic - Performance Cut", desc: "Simple multicam sync and cuts for up to 3 minutes.", price: 600, days: 5, revs: 2 },
        { title: "Standard - Visual Edit", desc: "Added transitions, stylized color grading, and effects.", price: 1500, days: 10, revs: 3 },
        { title: "Premium - Director's Cut", desc: "Heavy VFX, glitch effects, intense grading, and source files.", price: 3500, days: 15, revs: 5 }
      ]
    },
    {
      title: "I can add animated subtitles and lower thirds",
      description: "Make your videos accessible and engaging. I manually transcribe and design highly readable, beautifully animated subtitles and custom lower thirds for any video format.",
      category: "Social",
      status: "Close",
      slots: 10,
      tiers: [
        { title: "Basic - Standard Subs", desc: "Up to 5 minutes of standard SRT/burned-in subtitles.", price: 100, days: 2, revs: 1 },
        { title: "Standard - Animated Subs", desc: "Up to 10 minutes of styled, animated word-by-word subs.", price: 350, days: 4, revs: 2 }
      ]
    },
    {
      title: "I will do a green screen compositing",
      description: "Professional chroma keying and compositing. I will remove your green/blue screen flawlessly, fix edge spill, and composite the subject seamlessly into a new background.",
      category: "Corporate",
      status: "Close",
      slots: 7,
      tiers: [
        { title: "Basic - Simple Key", desc: "Keying out a well-lit green screen up to 1 minute.", price: 150, days: 2, revs: 1 },
        { title: "Standard - Full Composite", desc: "Keying + matching lighting/color to new background (3 min).", price: 500, days: 5, revs: 3 }
      ]
    }
  ];

  let gigsToReturn = [];
  let sellerAccounts = new Set();

  for (let i = 0; i < gigTemplates.length; i++) {
    const template = gigTemplates[i];
    const sellerAccountId = getSeller(i);
    sellerAccounts.add(sellerAccountId);

    const gigRes = await pool.query(
      `INSERT INTO gigs (
         title, description, category, payment_type, no_of_concurrent_max, status, freelancer_account_id
       ) VALUES ($1, $2, $3, 'fixed', $4, $5, $6)
       RETURNING gig_id, title, freelancer_account_id`,
      [cap(template.title, 50), template.description, template.category, template.slots, template.status, sellerAccountId]
    );
    const gig = gigRes.rows[0];
    gigsToReturn.push(gig);

    // Tiers
    for (const tier of template.tiers) {
      await pool.query(
        `INSERT INTO gig_tiers (title, description, rate_credits, delivery_days, no_of_revisions_max, gig_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tier.title, tier.desc, tier.price, tier.days, tier.revs, gig.gig_id]
      );
    }

    // Milestones
    await pool.query(
      `INSERT INTO gig_milestones (index, name, description, gig_id) VALUES
       (1, 'Project Kickoff & Asset Delivery', 'Transferring footage and discussing the creative direction.', $1),
       (2, 'First Draft / Rough Cut', 'Delivering the initial assembly and structural edit for review.', $1),
       (3, 'Final Polish & Color', 'Applying VFX, color grading, sound design, and final export.', $1)`,
      [gig.gig_id]
    );

    // Images
    const gigFileRes = await pool.query(
      `INSERT INTO files (name, path, mime_type, size_bytes) VALUES ($1, $2, 'image/png', 0) RETURNING file_id`,
      ['placeholder.png', 'https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/120ffbd6-72f6-4da9-98bd-ddf780450a66/placeholder_1787070142838_f09d8787.png']
    );
    const gigPlaceholderId = gigFileRes.rows[0].file_id;

    for (let j = 0; j < 4; j++) {
      await pool.query(
        `INSERT INTO gig_attachments (gig_id, file_id, index) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [gig.gig_id, gigPlaceholderId, j]
      );
    }

    // Questionnaire
    await pool.query(
      `INSERT INTO gig_requirements (type, question, is_required, gig_id) VALUES
       ('text', 'What is the target audience for this video?', true, $1),
       ('file', 'Attach a link or file for a reference video.', false, $1)`,
      [gig.gig_id]
    );

    // Tags
    for(let j=0; j < Math.min(4, tags.length); j++) {
      if (tags[j]) {
        await pool.query(
          `INSERT INTO gig_tags (gig_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [gig.gig_id, tags[j].tag_id]
        );
      }
    }
  }

  // Insert Terms of Service for the sellers
  for (const accountId of sellerAccounts) {
    await pool.query(
      `INSERT INTO terms_of_service (terms_title, terms_description, terms_type, is_default, account_id)
       VALUES ($1, $2, 'gigs', false, $3)`,
      ['Video Editing Terms of Service', '1. Client must provide all raw footage before the deadline starts.\n2. Revisions do not cover completely new creative directions.\n3. Final project files (Premiere/Resolve) are provided upon completion.', accountId]
    );
  }

  console.log(`✅ Seeded ${gigsToReturn.length} customized video gigs with tiers (0 orders)`);
  return { gigs: gigsToReturn, requests: [] };
}

async function seedMarketplaceCatalog(ctx, projects) {
  const { users, files, tags } = ctx;
  if (!users.length || files.length < 3) {
    console.log('ℹ️ Skipping market catalog seed (need users + files)');
    return;
  }

  await pool.query(`DELETE FROM asset_replies`);
  await pool.query(`DELETE FROM asset_comments`);
  await pool.query(`DELETE FROM market_project_assets`);
  await pool.query(`DELETE FROM market_media_assets`);
  await pool.query(`DELETE FROM market_asset_tags`);
  await pool.query(`DELETE FROM market_assets`);
  await pool.query(`DELETE FROM media_asset_bundle_files`);
  await pool.query(`DELETE FROM media_assets`);

  const mediaIds = [];
  for (let i = 0; i < 3; i++) {
    const owner = users[i % users.length];
    const fileA = files[i % files.length];
    const fileB = files[(i + 1) % files.length];
    const fileC = files[(i + 2) % files.length];
    const res = await pool.query(
      `INSERT INTO media_assets (
         name, type, width, height, duration_seconds, is_marketed,
         owner_user_id, proxy_file_id, thumbnail_file_id
       ) VALUES ($1,'video',1920,1080,$2,true,$3,$4,$5)
       RETURNING media_asset_id`,
      [
        cap(`Demo Clip ${i + 1}`, 50),
        15 + i * 5,
        owner.user_id,
        fileB.file_id,
        fileC.file_id,
      ]
    );
    await pool.query(
      `INSERT INTO media_asset_bundle_files
         (media_asset_id, file_id, preview_file_id, position)
       VALUES ($1, $2, $3, 0)`,
      [res.rows[0].media_asset_id, fileA.file_id, fileB.file_id]
    );
    mediaIds.push(res.rows[0].media_asset_id);
  }

  const assetDefs = [
    ['Urban LUT Pack', 'Cinematic LUT pack for city footage.', 1200, 'published'],
    ['Lower Third Kit', 'Clean lower thirds for interviews.', 900, 'published'],
    ['Grain Overlay Set', 'Subtle 35mm grain overlays.', 650, 'draft'],
  ];

  const marketIds = [];
  for (let i = 0; i < assetDefs.length; i++) {
    const [name, description, price, status] = assetDefs[i];
    const res = await pool.query(
      `INSERT INTO market_assets (name, description, price_credits, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4, NOW() - ($5 || ' days')::interval, NOW())
       RETURNING market_asset_id`,
      [cap(name, 50), description, price, status, String(3 + i)]
    );
    marketIds.push(res.rows[0].market_asset_id);

    if (tags[i]) {
      await pool.query(
        `INSERT INTO market_asset_tags (market_asset_id, tag_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [res.rows[0].market_asset_id, tags[i].tag_id]
      );
    }
    await pool.query(
      `INSERT INTO market_media_assets (market_asset_id, media_asset_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [res.rows[0].market_asset_id, mediaIds[i]]
    );
    if (projects?.[i]) {
      await pool.query(
        `INSERT INTO market_project_assets (market_asset_id, project_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [res.rows[0].market_asset_id, projects[i].project_id]
      );
    }
  }

  const commentRes = await pool.query(
    `INSERT INTO asset_comments (comment, market_asset_id, account_id)
     VALUES ($1,$2,$3)
     RETURNING asset_comment_id`,
    ['Great pack — works well on night footage.', marketIds[0], users[1].account_id]
  );
  await pool.query(
    `INSERT INTO asset_replies (reply, asset_comment_id, account_id)
     VALUES ($1,$2,$3)`,
    ['Thanks! Try the Cool Night preset first.', commentRes.rows[0].asset_comment_id, users[0].account_id]
  );

  console.log(`✅ Seeded ${marketIds.length} market assets with media, tags, comments`);
}

async function seedModerationExtras(userAccountIds, staffByRole) {
  const adminStaffId = staffByRole.Admin;
  const supportStaffId = staffByRole['Support Moderator'];

  const violation = (
    await pool.query(
      `SELECT violation_id, account_id FROM violations ORDER BY created_at DESC LIMIT 1`
    )
  ).rows[0];

  if (violation) {
    await pool.query(
      `INSERT INTO restrictions (type, module, starts_at, ends_at, violation_id, account_id, staff_id)
       VALUES
         ('posting_mute', 'forums', NOW() - interval '1 day', NOW() + interval '6 days', $1, $2, $3),
         ('marketplace_hold', 'marketplace', NOW() - interval '2 days', NULL, $1, $2, $4)`,
      [violation.violation_id, violation.account_id, supportStaffId, adminStaffId]
    );
  }

  // Restriction without a linked violation (direct account limit)
  if (userAccountIds[1]) {
    await pool.query(
      `INSERT INTO restrictions (type, module, starts_at, ends_at, violation_id, account_id, staff_id)
       VALUES ('feature_hold', 'jobs', NOW(), NOW() + interval '3 days', NULL, $1, $2)`,
      [userAccountIds[1], adminStaffId]
    );
  }

  await pool.query(
    `INSERT INTO pardons (account_id, staff_id)
     VALUES ($1, $2)`,
    [userAccountIds[0], adminStaffId]
  );

  // Sample account_activity timeline (mirrors real moderation events)
  const activitySamples = [
    [
      userAccountIds[3],
      'Violation issued: Spam posting',
      'VIOLATION_ISSUED',
      'violations',
      'VIO',
      supportStaffId,
      JSON.stringify({ type: 'Spam posting', points: 2 }),
    ],
    [
      userAccountIds[0],
      'Warning issued: Harassment warning',
      'ACCOUNT_WARNED',
      'violations',
      'VIO',
      supportStaffId,
      JSON.stringify({ type: 'Harassment warning', points: 3 }),
    ],
    [
      userAccountIds[0],
      'Account pardoned — violations cleared and status restored',
      'ACCOUNT_PARDONED',
      'pardons',
      'PAR',
      adminStaffId,
      JSON.stringify({ status: 'Active' }),
    ],
    [
      userAccountIds[1],
      'Restriction applied: feature_hold',
      'RESTRICTION_ISSUED',
      'restrictions',
      'RST',
      adminStaffId,
      JSON.stringify({ type: 'feature_hold', module: 'jobs' }),
    ],
    [
      userAccountIds[3],
      'Account restriction status set to Suspended',
      'ACCOUNT_STATUS_CHANGED',
      'accounts',
      'ACC',
      adminStaffId,
      JSON.stringify({ status: 'Suspended', source: 'seed' }),
    ],
  ];

  for (const row of activitySamples) {
    if (!row[0]) continue;
    await pool.query(
      `INSERT INTO account_activity (
         account_id, action, event_code,
         reference_table, reference_prefix, reference_id,
         actor_staff_id, metadata
       ) VALUES ($1,$2,$3,$4,$5,$1,$6,$7::jsonb)`,
      row
    );
  }

  for (let i = 0; i < Math.min(5, userAccountIds.length); i++) {
    await pool.query(
      `INSERT INTO notifications (
         message, is_read, reference_table, reference_prefix, reference_id, account_id
       ) VALUES ($1,$2,'tickets','TKT',$3,$4)`,
      [
        cap(
          ['New ticket reply', 'Dispute updated', 'Payout processed', 'Listing approved', 'Welcome aboard'][i],
          50
        ),
        i % 2 === 0,
        userAccountIds[i],
        userAccountIds[i],
      ]
    );
  }

  console.log('✅ Seeded restrictions, pardons, notifications, account activity');
}

async function seedVerificationDemos(userAccountIds, staffByRole) {
  const adminAccount = (
    await pool.query(`SELECT account_id FROM staff WHERE staff_id = $1`, [staffByRole.Admin])
  ).rows[0]?.account_id;
  const files = (await pool.query(`SELECT file_id FROM files ORDER BY name LIMIT 3`)).rows;

  const statusPlan = [
    ['verified', userAccountIds[0]],
    ['pending', userAccountIds[1]],
    ['rejected', userAccountIds[2]],
    ['unverified', userAccountIds[3]],
  ];

  for (const [status, accountId] of statusPlan) {
    if (!accountId) continue;
    await pool.query(
      `UPDATE account_verification
       SET status = $2::varchar(50),
           verified_by_staff_id = CASE
             WHEN $2::text = 'verified' THEN $3::uuid
             ELSE NULL
           END,
           updated_at = NOW()
       WHERE account_id = $1`,
      [accountId, status, staffByRole.Admin]
    );
  }

  const sessionRes = await pool.query(
    `INSERT INTO account_verification_sessions (
       account_id, didit_session_id, verification_url, kyc_status, verification_status,
       verified_by_account_id, expires_at
     ) VALUES
       ($1, $2, $3, 'Approved', 'Approved', $4, NOW() + interval '7 days'),
       ($5, $6, $7, 'In Progress', 'Pending', NULL, NOW() + interval '2 days'),
       ($8, $9, $10, 'Declined', 'Rejected', $4, NOW() + interval '1 day')
     RETURNING verification_session_id, account_id, verification_status`,
    [
      userAccountIds[0],
      `didit_seed_${faker.string.alphanumeric(10)}`,
      'https://verify.example.com/session/approved',
      adminAccount || null,
      userAccountIds[1],
      `didit_seed_${faker.string.alphanumeric(10)}`,
      'https://verify.example.com/session/pending',
      userAccountIds[2],
      `didit_seed_${faker.string.alphanumeric(10)}`,
      'https://verify.example.com/session/rejected',
    ]
  );

  for (const session of sessionRes.rows) {
    const isVerified = session.verification_status === 'Approved';
    await pool.query(
      `UPDATE verifications
       SET verification_session_id = $2,
           is_verified = $3,
           verified_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE account_id = $1`,
      [session.account_id, session.verification_session_id, isVerified]
    );
  }

  if ((await tableExists('verification_attachments')) && files[0]) {
    const verification = (
      await pool.query(
        `SELECT verification_id
         FROM verifications
         WHERE account_id = $1
         LIMIT 1`,
        [userAccountIds[1]]
      )
    ).rows[0];
    if (verification) {
      await pool.query(
        `INSERT INTO verification_attachments (
           verification_id,
           file_id,
           document_type,
           index
         )
         VALUES ($1, $2, 'Identity document', 0)
         ON CONFLICT DO NOTHING`,
        [verification.verification_id, files[0].file_id]
      );
    }
  }

  console.log('✅ Seeded verification sessions and status variety');
}

async function seedConfigurationSamples() {
  if (!(await tableExists('configuration'))) return;

  await pool.query(
    `INSERT INTO configuration (
       configuration_key, name, description, current_value_literal, default_value_literal
     ) VALUES
       ('support_sla_hours', 'Support SLA hours', 'Target first-response SLA', '24', '24')
     ON CONFLICT (configuration_key) DO UPDATE
       SET current_value_literal = EXCLUDED.current_value_literal,
           updated_at = CURRENT_TIMESTAMP`
  );
  console.log('✅ Seeded configuration samples');
}

/**
 * Seed example rows across product domains not covered by the moderator portal seed.
 * Catalog tables (plans/tags/surveys/ticket catalogs/files) come from migrations.
 */
async function seedDomainExamples(userAccountIds, staffByRole) {
  const ctx = await loadSeedContext(userAccountIds);
  if (ctx.users.length < 3) {
    console.log('ℹ️ Not enough users for domain seed');
    return;
  }

  await seedBadges(userAccountIds);
  await seedProfileExtras(ctx);
  await seedBillingAndMoney(ctx);
  const projects = await seedProjectsAndEditor(ctx);
  await seedJobsDomain(ctx);
  await seedGigsDomain(ctx);
  await seedMarketplaceCatalog(ctx, projects);
  await seedModerationExtras(userAccountIds, staffByRole);
  await seedVerificationDemos(userAccountIds, staffByRole);
  await seedConfigurationSamples();

  console.log('✅ Domain example data loaded');
}

module.exports = {
  seedDomainExamples,
  seedJobsDomain,
};
