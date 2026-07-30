const { pool } = require('./database');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { ensureDefaultSettings } = require('../Repositories/AdminSettingsRepositories');
const { connectMongoDB, getMongoClient } = require('./mongodb');
const {
  createInboxRepositories,
  createMessageRepositories,
} = require('../Repositories/InboxRepositories');
const { CONVERSATION_TYPE: DISPUTE_CHAT_TYPE } = require('../Repositories/DisputeChatRepositories');

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
        dispute_chats,
        credit_transactions,
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

/** Freeze credits on the respondent wallet and link a Dispute Hold transaction. */
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
     ) VALUES ('Dispute Hold', $1, $2, $3, $4, $5)
     RETURNING credit_transaction_id`,
    [amount, status, walletId, platformWalletId, disputeId]
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
      // Assigned to Maya; Admin has requested takeover — open as Admin to Accept / Force takeover.
      number: 'DIS-TAKE01',
      title: 'Escrow release stalled after revision',
      reason: 'Buyer asked for revisions after approving the milestone; seller wants escrow released.',
      status: 'open',
      visibility: 'public',
      priority: 'high',
      initiatorIdx: 0,
      respondentIdx: 4,
      entityType: 'contract',
      entityId: 'CTR-TAKE-01',
      assigneeId: supportStaffId,
      credits: 6500,
      hold: true,
      approved: true,
      outcome: null,
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: null,
      daysAgo: 3,
      takeoverByStaffId: adminStaffId,
      takeoverNote: 'Need Admin review — credits at risk and both parties escalated in chat.',
      chatKey: 'takeover',
    },
    {
      // Pending but already with Support — Admin is view-only until self-assign / takeover.
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
      status: 'sanctioned',
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
      title: 'Feedback dispute after delivery',
      reason: 'Buyer contested quality rating on a completed gig; parties settled.',
      status: 'resolved',
      visibility: 'public',
      priority: 'medium',
      initiatorIdx: 1,
      respondentIdx: 3,
      entityType: 'job',
      entityId: 'JOB-8821',
      assigneeId: adminStaffId,
      credits: 2500,
      hold: true,
      holdStatus: 'released',
      approved: true,
      outcome: 'resolved',
      sanctionType: null,
      sanctionNotes: null,
      resolutionNotes: 'Partial credit return agreed; rating adjusted.',
      daysAgo: 45,
    },
    {
      number: 'DIS-DSSM01',
      title: 'Refund window expired',
      reason: 'Buyer requested a refund outside the marketplace refund window.',
      status: 'dismissed',
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
        takeover_requested_by_staff_id, takeover_requested_at, takeover_request_note,
        type, by_account_id, for_account_id, resolved_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        NOW() - ($13 || ' days')::interval, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22,
        $23, $7, $8, $24
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
        d.takeoverByStaffId || null,
        d.takeoverByStaffId ? new Date(Date.now() - 6 * 3600000) : null,
        d.takeoverNote || null,
        d.entityType || 'general',
        ['resolved', 'sanctioned', 'dismissed', 'withdrawn', 'closed'].includes(d.status)
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
      const takeover = disputeByNumber['DIS-TAKE01'];

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

      if (takeover) {
        await seedDisputeChatThread(takeover.dispute_id, takeover, supportAccountId, [
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
            senderId: takeover.initiator_account_id,
          },
          {
            body: 'Internal: Admin requested takeover — keep hold in place until handoff.',
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
    ['TKT-50006', 'Marketplace listing rejected', 'Asset Marketplace', 'Medium', 'Open', 'web', userAccountIds[7], marketplaceStaffId, reportIds[2], null, 'user', null],
    ['TKT-50007', 'Two-factor not receiving codes', 'Account Verification', 'High', 'Open', 'web', userAccountIds[1], null, null, null, 'user', null],
    ['TKT-50008', 'Dispute escalation request', 'Contracts and Milestones', 'High', 'In Progress', 'web', userAccountIds[5], null, null, disputeByNumber['DIS-21126']?.dispute_id || null, 'user', 'Jobs N Gigs Moderator'],
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
  console.log('   Demo disputes:');
  console.log('   DIS-PEND01  pending + unassigned     → Admin/Maya: Assign myself, then Approve');
  console.log('   DIS-PEND02  pending + Maya owns      → Admin: view-only / Force takeover / assign');
  console.log('   DIS-TAKE01  public + takeover req    → Admin: Accept takeover or Force takeover');
  console.log('   DIS-OPEN01  public + private reply    → middleman chat sample');
  console.log('   DIS-WAIT01  awaiting disputee reply  → prompt message sample');
  console.log('   DIS-REVW01  under review + publish   → private + published party comments');
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
    await pool.query(`INSERT INTO wallets (type, balance_credits) VALUES ('platform wallets', 1000000)`);
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