const crypto = require('crypto');
const { pool } = require('../lib/Database');
const { adjustAccountCredits } = require('./AdminUserTeamRepositories');

const CREDIT_TICKET_TYPES = new Set([
  'Credit Top-ups',
  'Withdrawing Earnings',
  'Billing and Payments',
  'Subscriptions and Plans',
  'Marketplace Refunds',
  'Purchase and Delivery',
  'Contracts and Milestones',
]);

const MARKETPLACE_PAYMENT_TYPES = new Set([
  'Asset Marketplace',
  'Purchase and Delivery',
  'Marketplace Refunds',
]);

const JOBS_PAYMENT_TYPES = new Set(['Contracts and Milestones']);

function normalizeTicketScreenshots(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, 4)) {
    const key = String(item?.key || item?.attachment_key || '').replace(/^\/+/, '').trim();
    if (!/^(?:ticket-attachments|chat-attachments)\/[A-Za-z0-9._/-]+$/.test(key) || key.includes('..')) continue;
    const name = String(item?.name || item?.attachment_name || 'screenshot').slice(0, 180);
    out.push({
      attachment_id: crypto.randomUUID(),
      attachment_type: 'image',
      attachment_key: key,
      attachment_url: key,
      attachment_name: name,
      attachment_size: Number(item?.size || item?.attachment_size || 0) || 0,
    });
  }
  return out;
}

function canViewTicketPayments(role, ticketType) {
  const label = String(role || '').toLowerCase();
  if (label === 'admin' || label === 'administrator' || label === 'support moderator') return true;
  if (label.includes('marketplace')) return MARKETPLACE_PAYMENT_TYPES.has(ticketType);
  if (label.includes('jobs')) return JOBS_PAYMENT_TYPES.has(ticketType);
  return false;
}

function canAdjustTicketCredits(role, ticketType) {
  const label = String(role || '').toLowerCase();
  const isHandler = label === 'admin' || label === 'administrator' || label === 'support moderator';
  return isHandler && CREDIT_TICKET_TYPES.has(ticketType);
}

async function recordTicketEvent({
  ticketId,
  eventType,
  summary,
  actorStaffId = null,
  actorAccountId = null,
  metadata = null,
}) {
  if (!ticketId || !eventType || !summary) return;
  try {
    await pool.query(
      `INSERT INTO ticket_events (
         ticket_id, event_type, summary, actor_staff_id, actor_account_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        String(eventType).slice(0, 40),
        String(summary).slice(0, 2000),
        actorStaffId || null,
        actorAccountId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.warn('ticket_events insert skipped:', err.message);
  }
}

async function listTicketTimeline(ticketId, accountId, since) {
  const events = await pool
    .query(
      `SELECT e.ticket_event_id, e.event_type, e.summary, e.metadata, e.created_at,
              COALESCE(sa.display_name, st.first_name || ' ' || st.last_name, aa.display_name, 'Member') AS actor_name,
              st.role AS actor_role
       FROM ticket_events e
       LEFT JOIN staff st ON st.staff_id = e.actor_staff_id
       LEFT JOIN accounts sa ON sa.account_id = st.account_id
       LEFT JOIN accounts aa ON aa.account_id = e.actor_account_id
       WHERE e.ticket_id = $1
       ORDER BY e.created_at DESC
       LIMIT 40`,
      [ticketId]
    )
    .catch(() => ({ rows: [] }));

  const activity = accountId
    ? await pool
        .query(
          `SELECT aa.account_activity_id, aa.action, aa.event_code, aa.created_at,
                  COALESCE(sa.display_name, st.first_name || ' ' || st.last_name, 'Staff') AS actor_name,
                  st.role AS actor_role
           FROM account_activity aa
           LEFT JOIN staff st ON st.staff_id = aa.actor_staff_id
           LEFT JOIN accounts sa ON sa.account_id = st.account_id
           WHERE aa.account_id = $1
             AND aa.created_at >= COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           ORDER BY aa.created_at DESC
           LIMIT 20`,
          [accountId, since || null]
        )
        .catch(() => ({ rows: [] }))
    : { rows: [] };

  const timeline = [
    ...events.rows.map((row) => ({
      id: `event-${row.ticket_event_id}`,
      kind: 'ticket',
      eventType: row.event_type,
      summary: row.summary,
      actorName: row.actor_name,
      actorRole: row.actor_role || null,
      createdAt: row.created_at,
    })),
    ...activity.rows.map((row) => ({
      id: `account-${row.account_activity_id}`,
      kind: 'account',
      eventType: row.event_code,
      summary: row.action,
      actorName: row.actor_name,
      actorRole: row.actor_role || null,
      createdAt: row.created_at,
    })),
  ];
  timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return timeline.slice(0, 40);
}

async function listTicketArticles(ticketType) {
  const params = [];
  let where = 'deleted_at IS NULL';
  if (ticketType) {
    params.push(ticketType);
    where += ` AND ticket_type = $1`;
  }
  const result = await pool
    .query(
      `SELECT article_id, ticket_type, title, body, updated_at
       FROM ticket_articles
       WHERE ${where}
       ORDER BY ticket_type, title`,
      params
    )
    .catch(() => ({ rows: [] }));
  return result.rows.map((row) => ({
    id: row.article_id,
    ticketType: row.ticket_type,
    title: row.title,
    body: row.body,
    updatedAt: row.updated_at,
  }));
}

async function saveTicketArticle({ articleId, ticketType, title, body, staffId }) {
  const type = String(ticketType || '').trim();
  const articleTitle = String(title || '').trim();
  const articleBody = String(body || '').trim();
  if (!type || !articleTitle || !articleBody) throw new Error('Type, title, and body are required');
  if (articleId) {
    const updated = await pool.query(
      `UPDATE ticket_articles
       SET ticket_type = $2, title = $3, body = $4, updated_at = NOW()
       WHERE article_id = $1 AND deleted_at IS NULL
       RETURNING article_id`,
      [articleId, type.slice(0, 80), articleTitle.slice(0, 160), articleBody]
    );
    if (!updated.rows.length) throw new Error('Article not found');
    return updated.rows[0].article_id;
  }
  const inserted = await pool.query(
    `INSERT INTO ticket_articles (ticket_type, title, body, created_by_staff_id)
     VALUES ($1, $2, $3, $4)
     RETURNING article_id`,
    [type.slice(0, 80), articleTitle.slice(0, 160), articleBody, staffId || null]
  );
  return inserted.rows[0].article_id;
}

async function deleteTicketArticle(articleId) {
  const result = await pool.query(
    `UPDATE ticket_articles SET deleted_at = NOW(), updated_at = NOW()
     WHERE article_id = $1 AND deleted_at IS NULL
     RETURNING article_id`,
    [articleId]
  );
  return Boolean(result.rows.length);
}

async function listTicketPaymentEvidence(accountId) {
  if (!accountId) return { payments: [], credits: [], cashouts: [] };
  const [payments, credits, cashouts] = await Promise.all([
    pool
      .query(
        `SELECT p.id, p.reference_id, p.amount, p.currency, p.status, p.payment_type,
                p.credits, p.created_at, p.processed_at
         FROM payments p
         INNER JOIN users u ON u.user_id = p.user_id
         WHERE u.account_id = $1
         ORDER BY p.created_at DESC
         LIMIT 8`,
        [accountId]
      )
      .catch(() => ({ rows: [] })),
    pool
      .query(
        `SELECT ct.credit_transaction_id, ct.type, ct.amount_credits, ct.status, ct.created_at
         FROM credit_transactions ct
         INNER JOIN account_wallets aw
           ON aw.wallet_id = ct.source_wallet_id OR aw.wallet_id = ct.destination_wallet_id
         WHERE aw.account_id = $1
         ORDER BY ct.created_at DESC
         LIMIT 8`,
        [accountId]
      )
      .catch(() => ({ rows: [] })),
    pool
      .query(
        `SELECT c.cashout_id, c.status, c.amount_credits, c.failure_code, c.xendit_channel_code,
                c.created_at, c.refunded_at, RIGHT(c.account_no, 4) AS account_last4
         FROM cashouts c
         INNER JOIN users u ON u.user_id = c.user_id
         WHERE u.account_id = $1
         ORDER BY c.created_at DESC
         LIMIT 8`,
        [accountId]
      )
      .catch(() => ({ rows: [] })),
  ]);
  return {
    payments: payments.rows.map((row) => ({
      id: row.id,
      reference: row.reference_id,
      amount: Number(row.amount),
      currency: row.currency || 'PHP',
      status: row.status,
      type: row.payment_type,
      credits: Number(row.credits || 0),
      createdAt: row.created_at,
      processedAt: row.processed_at,
    })),
    credits: credits.rows.map((row) => ({
      id: row.credit_transaction_id,
      type: row.type,
      amount: Number(row.amount_credits || 0),
      status: row.status,
      createdAt: row.created_at,
    })),
    cashouts: cashouts.rows.map((row) => ({
      id: row.cashout_id,
      status: row.status,
      credits: Number(row.amount_credits || 0),
      channel: row.xendit_channel_code,
      failureCode: row.failure_code,
      accountLast4: row.account_last4,
      createdAt: row.created_at,
      refundedAt: row.refunded_at,
    })),
  };
}

async function submitTicketSatisfaction(ticketId, accountId, score, comment) {
  const rating = Number(score);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Score must be a whole number from 1 to 5');
  }
  const note = comment ? String(comment).trim().slice(0, 1000) : null;
  const result = await pool.query(
    `UPDATE tickets
     SET satisfaction_score = $3,
         satisfaction_comment = $4,
         satisfaction_at = NOW(),
         updated_at = NOW()
     WHERE ticket_id = $1
       AND account_id = $2
       AND deleted_at IS NULL
       AND status IN ('Resolved', 'Closed')
       AND satisfaction_score IS NULL
     RETURNING ticket_id, ticket_number, satisfaction_score`,
    [ticketId, accountId, rating, note]
  );
  if (!result.rows.length) {
    throw new Error('This ticket cannot be rated yet, or it was already rated');
  }
  await recordTicketEvent({
    ticketId,
    eventType: 'satisfaction',
    summary: `Requester rated the ticket ${rating} out of 5`,
    actorAccountId: accountId,
    metadata: { score: rating },
  });
  return result.rows[0];
}

async function adjustTicketCredits({ ticketId, amount, note, staffId, staffRole, actorAccountId }) {
  const ticket = await pool.query(
    `SELECT ticket_id, ticket_number, type, account_id
     FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticket.rows.length) return null;
  const row = ticket.rows[0];
  if (!canAdjustTicketCredits(staffRole, row.type)) {
    throw new Error('Credit changes on this ticket are limited to Admin and Support on payment tickets');
  }
  const reason = String(note || '').trim();
  if (reason.length < 8) throw new Error('Add a note of at least 8 characters for the credit change');
  const result = await adjustAccountCredits(row.account_id, amount, reason, staffId);
  const summary = `${Number(amount) > 0 ? 'Granted' : 'Deducted'} ${Math.abs(Number(amount))} credits. ${reason}`;
  await recordTicketEvent({
    ticketId,
    eventType: 'credit',
    summary,
    actorStaffId: staffId,
    actorAccountId,
    metadata: { amount: Number(amount), balance: result.balanceCredits },
  });
  return { ticketNumber: row.ticket_number, ...result, note: reason };
}

module.exports = {
  CREDIT_TICKET_TYPES,
  normalizeTicketScreenshots,
  canViewTicketPayments,
  canAdjustTicketCredits,
  recordTicketEvent,
  listTicketTimeline,
  listTicketArticles,
  saveTicketArticle,
  deleteTicketArticle,
  listTicketPaymentEvidence,
  submitTicketSatisfaction,
  adjustTicketCredits,
};
