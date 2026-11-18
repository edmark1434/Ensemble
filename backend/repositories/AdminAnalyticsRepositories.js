const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');
const { CLOSED_REPORT_STATUSES } = require('../lib/ReportEnums');

/**
 * Admin → Analytics reads. Every period query takes inclusive `YYYY-MM-DD` bounds and turns
 * them into `[from, to + 1 day)` in the database time zone. Members are `accounts.type =
 * 'User'` rows that are not deleted.
 *
 * Money definitions (keep the totals, the series and the list endpoints on the same rules):
 * - Top-ups: `payments.payment_type = 'TOPUP'` in a paid status, dated by `processed_at`.
 * - Subscription revenue: paid recurring invoices (`subscription_invoices`, Xendit status
 *   SUCCEEDED, or PAID from seed data) dated by `paid_at`, plus one-time upgrade payments
 *   (`payments.payment_type = 'SUBSCRIPTION'`). Invoice amounts written by the webhook before
 *   it stored cents were saved in pesos; `INVOICE_CENTS_SQL` scales those back up when the
 *   stored value is exactly the plan price / 100.
 * - Fee revenue: Completed fee rows minus Completed fee refunds, in credits.
 * - Cashouts: net PHP of SUCCEEDED rows, dated by request (`created_at`).
 */

const MEMBER = `a.type = 'User' AND a.deleted_at IS NULL`;
const FEE_TYPES = ['Fee', 'Job Posting Fee', 'Proposal Fee', 'Service Posting Fee'];
const FEE_REFUND_TYPES = ['Job Posting Fee Refund', 'Proposal Fee Refund'];

const TOPUP_STATUSES = {
  paid: ['PAID', 'COMPLETED', 'SUCCEEDED'],
  pending: ['PENDING'],
  failed: ['FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED', 'VOIDED'],
};
const INVOICE_STATUSES = {
  paid: ['SUCCEEDED', 'PAID'],
  failed: ['FAILED'],
  scheduled: ['SCHEDULED', 'PENDING'],
  cancelled: ['CANCELLED', 'CANCELED'],
};
const CASHOUT_STATUSES = {
  paid: ['SUCCEEDED', 'COMPLETED'],
  in_flight: ['PENDING', 'PROCESSING', 'ACCEPTED', 'REQUESTED'],
  failed: ['FAILED', 'REJECTED', 'REVERSED', 'CANCELLED', 'CANCELED', 'EXPIRED'],
};

const INVOICE_CENTS_SQL = `CASE
  WHEN si.amount_php_cents > 0 AND p.amount_php_cents > 0 AND si.amount_php_cents * 100 = p.amount_php_cents
    THEN si.amount_php_cents * 100
  ELSE COALESCE(si.amount_php_cents, 0)
END`;

/** Months per billing interval, for monthly recurring revenue. */
const MONTHLY_FACTOR_SQL = `CASE UPPER(COALESCE(p.billing_period, 'MONTH'))
  WHEN 'DAY' THEN 30.0
  WHEN 'WEEK' THEN 52.0 / 12
  WHEN 'YEAR' THEN 1.0 / 12
  ELSE 1.0
END`;

const CLOSED_REPORTS = CLOSED_REPORT_STATUSES.map((s) => `'${s}'`).join(', ');

function inPeriod(column, fromIdx, toIdx) {
  return `${column} >= $${fromIdx}::date AND ${column} < ($${toIdx}::date + 1)`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function phpFromCents(value) {
  return Math.round(num(value)) / 100;
}

function isoDay(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

/** Escapes LIKE wildcards so a search for "50%" matches the text, not everything. */
function likePattern(search) {
  return `%${String(search).replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

// ── Calendar ────────────────────────────────────────────────────────────────

async function fetchCalendar() {
  const result = await pool.query(`
    SELECT
      CURRENT_DATE::text AS today,
      (SELECT MIN(a.created_at)::date::text FROM accounts a WHERE ${MEMBER}) AS first_signup
  `);
  const row = result.rows[0] || {};
  return { today: row.today, firstSignup: row.first_signup || null };
}

// ── Members ─────────────────────────────────────────────────────────────────

async function fetchMemberSummary() {
  const result = await pool.query(`
    WITH m AS (
      SELECT
        LOWER(COALESCE(a.status, 'active')) AS status,
        a.avatar_file_id IS NOT NULL AS has_avatar,
        NULLIF(BTRIM(COALESCE(a.tagline, '')), '') IS NOT NULL AS has_tagline,
        COALESCE(ver.verified, FALSE) AS verified,
        COALESCE(ver.pending, FALSE) AS pending
      FROM accounts a
      LEFT JOIN LATERAL (
        SELECT
          BOOL_OR(COALESCE(v.is_verified, FALSE)) AS verified,
          BOOL_OR(LOWER(COALESCE(vs.verification_status, '')) IN ('pending', 'in review', 'reverification_required')) AS pending
        FROM verifications v
        LEFT JOIN verification_sessions vs ON vs.verification_session_id = v.verification_session_id
        WHERE v.account_id = a.account_id
      ) ver ON TRUE
      WHERE ${MEMBER}
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status LIKE '%suspend%')::int AS suspended,
      COUNT(*) FILTER (WHERE status LIKE '%ban%')::int AS banned,
      COUNT(*) FILTER (WHERE status LIKE '%lock%')::int AS locked,
      COUNT(*) FILTER (WHERE status LIKE '%deactiv%')::int AS deactivated,
      COUNT(*) FILTER (WHERE verified)::int AS verified,
      COUNT(*) FILTER (WHERE NOT verified AND pending)::int AS pending_verification,
      COUNT(*) FILTER (WHERE has_avatar)::int AS with_avatar,
      COUNT(*) FILTER (WHERE has_tagline)::int AS with_tagline,
      COUNT(*) FILTER (WHERE has_avatar AND has_tagline)::int AS complete_profiles
    FROM m
  `);
  const r = result.rows[0] || {};
  const total = num(r.total);
  const active = num(r.active);
  const suspended = num(r.suspended);
  const banned = num(r.banned);
  const locked = num(r.locked);
  const deactivated = num(r.deactivated);
  return {
    total,
    status: {
      active,
      suspended,
      banned,
      locked,
      deactivated,
      other: Math.max(0, total - active - suspended - banned - locked - deactivated),
    },
    verification: {
      verified: num(r.verified),
      pending: num(r.pending_verification),
      unverified: Math.max(0, total - num(r.verified) - num(r.pending_verification)),
    },
    profile: {
      withAvatar: num(r.with_avatar),
      withTagline: num(r.with_tagline),
      complete: num(r.complete_profiles),
    },
  };
}

async function fetchNewestMembers(limit = 8) {
  const result = await pool.query(
    `
    SELECT
      a.account_id,
      a.handle,
      a.display_name,
      a.status,
      a.created_at,
      NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS full_name
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE ${MEMBER}
    ORDER BY a.created_at DESC, a.account_id DESC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows.map((r) => ({
    accountId: r.account_id,
    name: r.display_name || r.full_name || r.handle || 'Member',
    handle: r.handle || null,
    status: r.status || 'Active',
    joinedAt: r.created_at,
  }));
}

async function fetchEmailDomains(limit = 6) {
  const result = await pool.query(
    `
    SELECT LOWER(SPLIT_PART(u.email_address, '@', 2)) AS domain, COUNT(*)::int AS count
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
    WHERE ${MEMBER} AND u.email_address LIKE '%@%'
    GROUP BY 1
    ORDER BY count DESC, domain ASC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows.map((r) => ({ domain: r.domain, count: num(r.count) }));
}

async function fetchStaffRoles() {
  const result = await pool.query(`
    SELECT s.role::text AS role,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(a.status, '')) = 'active')::int AS active
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
    GROUP BY s.role
    ORDER BY count DESC, role ASC
  `);
  return result.rows.map((r) => ({ role: r.role, count: num(r.count), active: num(r.active) }));
}

// ── Period totals and series ────────────────────────────────────────────────

/**
 * Headline counts for one period: `$1`/`$2` are its bounds. Money uses the module rules.
 */
async function fetchPeriodTotals({ from, to }) {
  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM accounts a WHERE ${MEMBER} AND ${inPeriod('a.created_at', 1, 2)})::int AS signups,
      (SELECT COUNT(*) FROM tickets t WHERE t.deleted_at IS NULL AND ${inPeriod('t.created_at', 1, 2)})::int AS tickets,
      (SELECT COUNT(*) FROM reports r WHERE r.deleted_at IS NULL AND ${inPeriod('r.created_at', 1, 2)})::int AS reports,
      (SELECT COUNT(*) FROM disputes d WHERE ${inPeriod('d.created_at', 1, 2)})::int AS disputes,
      (SELECT COUNT(*) FROM marketplace_listings ml WHERE ${inPeriod('ml.created_at', 1, 2)})::int AS listings,
      (SELECT COUNT(*) FROM payments p
        WHERE p.payment_type = 'TOPUP' AND UPPER(COALESCE(p.status, '')) = ANY($3::text[])
          AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)})::int AS topup_count,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
        WHERE p.payment_type = 'TOPUP' AND UPPER(COALESCE(p.status, '')) = ANY($3::text[])
          AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)})::numeric(14,2) AS topup_php,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
        WHERE p.payment_type = 'SUBSCRIPTION' AND UPPER(COALESCE(p.status, '')) = ANY($3::text[])
          AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)})::numeric(14,2) AS upgrade_php,
      (SELECT COALESCE(SUM(${INVOICE_CENTS_SQL}), 0)
        FROM subscription_invoices si
        LEFT JOIN subscriptions s ON s.subscription_id = si.subscription_id
        LEFT JOIN plans p ON p.plan_id = s.plan_id
        WHERE UPPER(COALESCE(si.status, '')) = ANY($4::text[]) AND ${inPeriod('si.paid_at', 1, 2)})::bigint AS invoice_cents,
      (SELECT COALESCE(SUM(CASE WHEN ct.type::text = ANY($5::text[]) THEN ct.amount_credits ELSE -ct.amount_credits END), 0)
        FROM credit_transactions ct
        WHERE ct.status = 'Completed'
          AND (ct.type::text = ANY($5::text[]) OR ct.type::text = ANY($6::text[]))
          AND ${inPeriod('ct.created_at', 1, 2)})::bigint AS fee_credits,
      (SELECT COALESCE(SUM(c.net_amount_php_cents), 0) FROM cashouts c
        WHERE UPPER(COALESCE(c.status, '')) = ANY($7::text[]) AND ${inPeriod('c.created_at', 1, 2)})::bigint AS cashout_cents
    `,
    [from, to, TOPUP_STATUSES.paid, INVOICE_STATUSES.paid, FEE_TYPES, FEE_REFUND_TYPES, CASHOUT_STATUSES.paid]
  );
  const r = result.rows[0] || {};
  return {
    signups: num(r.signups),
    tickets: num(r.tickets),
    reports: num(r.reports),
    disputes: num(r.disputes),
    listings: num(r.listings),
    topupCount: num(r.topup_count),
    topupPhp: num(r.topup_php),
    subscriptionPhp: Math.round((num(r.upgrade_php) + phpFromCents(r.invoice_cents)) * 100) / 100,
    feeCredits: num(r.fee_credits),
    cashoutPhp: phpFromCents(r.cashout_cents),
  };
}

/** Per-bucket series across the period (`bucket` is day, week or month). */
async function fetchSeries({ from, to, bucket }) {
  const result = await pool.query(
    `
    WITH spine AS (
      SELECT gs::timestamp AS b
      FROM generate_series(
        date_trunc($3::text, $1::date::timestamp),
        date_trunc($3::text, $2::date::timestamp),
        ('1 ' || $3::text)::interval
      ) AS gs
    ),
    signups AS (
      SELECT date_trunc($3::text, a.created_at::timestamp) AS b, COUNT(*)::int AS n
      FROM accounts a WHERE ${MEMBER} AND ${inPeriod('a.created_at', 1, 2)} GROUP BY 1
    ),
    tickets AS (
      SELECT date_trunc($3::text, t.created_at::timestamp) AS b, COUNT(*)::int AS n
      FROM tickets t WHERE t.deleted_at IS NULL AND ${inPeriod('t.created_at', 1, 2)} GROUP BY 1
    ),
    reports AS (
      SELECT date_trunc($3::text, r.created_at::timestamp) AS b, COUNT(*)::int AS n
      FROM reports r WHERE r.deleted_at IS NULL AND ${inPeriod('r.created_at', 1, 2)} GROUP BY 1
    ),
    listings AS (
      SELECT date_trunc($3::text, ml.created_at::timestamp) AS b, COUNT(*)::int AS n
      FROM marketplace_listings ml WHERE ${inPeriod('ml.created_at', 1, 2)} GROUP BY 1
    ),
    topups AS (
      SELECT date_trunc($3::text, COALESCE(p.processed_at, p.created_at)::timestamp) AS b,
        COUNT(*)::int AS n, COALESCE(SUM(p.amount), 0)::numeric(14,2) AS php
      FROM payments p
      WHERE p.payment_type = 'TOPUP' AND UPPER(COALESCE(p.status, '')) = ANY($4::text[])
        AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)}
      GROUP BY 1
    ),
    upgrades AS (
      SELECT date_trunc($3::text, COALESCE(p.processed_at, p.created_at)::timestamp) AS b,
        COALESCE(SUM(p.amount), 0)::numeric(14,2) AS php
      FROM payments p
      WHERE p.payment_type = 'SUBSCRIPTION' AND UPPER(COALESCE(p.status, '')) = ANY($4::text[])
        AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)}
      GROUP BY 1
    ),
    invoices AS (
      SELECT date_trunc($3::text, si.paid_at::timestamp) AS b, COALESCE(SUM(${INVOICE_CENTS_SQL}), 0)::bigint AS cents
      FROM subscription_invoices si
      LEFT JOIN subscriptions s ON s.subscription_id = si.subscription_id
      LEFT JOIN plans p ON p.plan_id = s.plan_id
      WHERE UPPER(COALESCE(si.status, '')) = ANY($5::text[]) AND ${inPeriod('si.paid_at', 1, 2)}
      GROUP BY 1
    ),
    fees AS (
      SELECT date_trunc($3::text, ct.created_at::timestamp) AS b,
        COALESCE(SUM(CASE WHEN ct.type::text = ANY($6::text[]) THEN ct.amount_credits ELSE -ct.amount_credits END), 0)::bigint AS credits
      FROM credit_transactions ct
      WHERE ct.status = 'Completed'
        AND (ct.type::text = ANY($6::text[]) OR ct.type::text = ANY($7::text[]))
        AND ${inPeriod('ct.created_at', 1, 2)}
      GROUP BY 1
    ),
    cashouts AS (
      SELECT date_trunc($3::text, c.created_at::timestamp) AS b, COALESCE(SUM(c.net_amount_php_cents), 0)::bigint AS cents
      FROM cashouts c
      WHERE UPPER(COALESCE(c.status, '')) = ANY($8::text[]) AND ${inPeriod('c.created_at', 1, 2)}
      GROUP BY 1
    )
    SELECT
      s.b,
      COALESCE(su.n, 0) AS signups,
      COALESCE(ti.n, 0) AS tickets,
      COALESCE(re.n, 0) AS reports,
      COALESCE(li.n, 0) AS listings,
      COALESCE(tu.n, 0) AS topup_count,
      COALESCE(tu.php, 0) AS topup_php,
      COALESCE(up.php, 0) AS upgrade_php,
      COALESCE(inv.cents, 0) AS invoice_cents,
      COALESCE(fe.credits, 0) AS fee_credits,
      COALESCE(co.cents, 0) AS cashout_cents
    FROM spine s
    LEFT JOIN signups su ON su.b = s.b
    LEFT JOIN tickets ti ON ti.b = s.b
    LEFT JOIN reports re ON re.b = s.b
    LEFT JOIN listings li ON li.b = s.b
    LEFT JOIN topups tu ON tu.b = s.b
    LEFT JOIN upgrades up ON up.b = s.b
    LEFT JOIN invoices inv ON inv.b = s.b
    LEFT JOIN fees fe ON fe.b = s.b
    LEFT JOIN cashouts co ON co.b = s.b
    ORDER BY s.b ASC
    `,
    [
      from,
      to,
      bucket,
      TOPUP_STATUSES.paid,
      INVOICE_STATUSES.paid,
      FEE_TYPES,
      FEE_REFUND_TYPES,
      CASHOUT_STATUSES.paid,
    ]
  );
  return result.rows.map((r) => ({
    start: isoDay(r.b),
    signups: num(r.signups),
    tickets: num(r.tickets),
    reports: num(r.reports),
    listings: num(r.listings),
    topupCount: num(r.topup_count),
    topupPhp: num(r.topup_php),
    subscriptionPhp: Math.round((num(r.upgrade_php) + phpFromCents(r.invoice_cents)) * 100) / 100,
    feeCredits: num(r.fee_credits),
    cashoutPhp: phpFromCents(r.cashout_cents),
  }));
}

// ── Engagement (account_active_days) ────────────────────────────────────────

async function fetchTrackingSince() {
  const result = await pool.query(`SELECT MIN(active_on)::text AS since FROM account_active_days`);
  return result.rows[0]?.since || null;
}

async function fetchActiveSeries({ from, to, bucket }) {
  const result = await pool.query(
    `
    SELECT date_trunc($3::text, d.active_on::timestamp) AS b, COUNT(DISTINCT d.account_id)::int AS n
    FROM account_active_days d
    INNER JOIN accounts a ON a.account_id = d.account_id
    WHERE ${MEMBER} AND d.active_on BETWEEN $1::date AND $2::date
    GROUP BY 1
    `,
    [from, to, bucket]
  );
  return new Map(result.rows.map((r) => [isoDay(r.b), num(r.n)]));
}

/**
 * Daily / weekly / monthly actives as of today, plus distinct actives in the period and the
 * previous period (`prevFrom`/`prevTo` may be null).
 */
async function fetchEngagementTotals({ from, to, prevFrom, prevTo }) {
  const result = await pool.query(
    `
    SELECT
      COUNT(DISTINCT d.account_id) FILTER (WHERE d.active_on = CURRENT_DATE)::int AS dau,
      COUNT(DISTINCT d.account_id) FILTER (WHERE d.active_on > CURRENT_DATE - 7)::int AS wau,
      COUNT(DISTINCT d.account_id) FILTER (WHERE d.active_on > CURRENT_DATE - 30)::int AS mau,
      COUNT(*) FILTER (WHERE d.active_on > CURRENT_DATE - 30)::int AS member_days_30,
      COUNT(DISTINCT d.account_id) FILTER (WHERE d.active_on BETWEEN $1::date AND $2::date)::int AS in_period,
      COUNT(*) FILTER (WHERE d.active_on BETWEEN $1::date AND $2::date)::int AS member_days_period,
      COUNT(DISTINCT d.account_id) FILTER (
        WHERE d.active_on BETWEEN $1::date AND $2::date AND a.created_at < $1::date
      )::int AS returning_in_period,
      COUNT(DISTINCT d.account_id) FILTER (WHERE d.active_on BETWEEN $3::date AND $4::date)::int AS in_previous
    FROM account_active_days d
    INNER JOIN accounts a ON a.account_id = d.account_id
    WHERE ${MEMBER}
      AND d.active_on >= LEAST($1::date, $3::date, CURRENT_DATE - 30)
    `,
    [from, to, prevFrom, prevTo]
  );
  const r = result.rows[0] || {};
  return {
    dau: num(r.dau),
    wau: num(r.wau),
    mau: num(r.mau),
    memberDays30: num(r.member_days_30),
    inPeriod: num(r.in_period),
    memberDaysInPeriod: num(r.member_days_period),
    returningInPeriod: num(r.returning_in_period),
    inPrevious: prevFrom ? num(r.in_previous) : null,
  };
}

/** Weekly signup cohorts (last `weeks` weeks) and how many were active in each later week. */
async function fetchWeeklyCohorts(weeks = 8) {
  const result = await pool.query(
    `
    WITH cohort AS (
      SELECT a.account_id, date_trunc('week', a.created_at::timestamp)::date AS cw
      FROM accounts a
      WHERE ${MEMBER}
        AND a.created_at >= date_trunc('week', CURRENT_DATE::timestamp) - make_interval(weeks => $1::int - 1)
    ),
    activity AS (
      SELECT DISTINCT c.account_id, c.cw,
        ((date_trunc('week', d.active_on::timestamp)::date - c.cw) / 7)::int AS wk
      FROM cohort c
      INNER JOIN account_active_days d ON d.account_id = c.account_id
      WHERE d.active_on >= c.cw
    )
    SELECT c.cw::text AS cohort_start,
      COUNT(DISTINCT c.account_id)::int AS size,
      COALESCE((
        SELECT json_object_agg(x.wk, x.n)
        FROM (SELECT wk, COUNT(*)::int AS n FROM activity WHERE activity.cw = c.cw GROUP BY wk) x
      ), '{}'::json) AS weeks
    FROM cohort c
    GROUP BY c.cw
    ORDER BY c.cw ASC
    `,
    [weeks]
  );
  return result.rows.map((r) => ({
    cohortStart: r.cohort_start,
    size: num(r.size),
    activeByWeek: Object.fromEntries(Object.entries(r.weeks || {}).map(([k, v]) => [Number(k), num(v)])),
  }));
}

// ── Money ───────────────────────────────────────────────────────────────────

async function fetchTopupBreakdown({ from, to }) {
  const [statusRes, channelRes] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($3::text[]))::int AS paid_count,
        COALESCE(SUM(p.amount) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($3::text[])), 0)::numeric(14,2) AS paid_php,
        COALESCE(SUM(p.credits) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($3::text[])), 0)::bigint AS credits,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($4::text[]))::int AS pending_count,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($5::text[]))::int AS failed_count,
        COUNT(DISTINCT p.user_id) FILTER (WHERE UPPER(COALESCE(p.status, '')) = ANY($3::text[]))::int AS buyers
      FROM payments p
      WHERE p.payment_type = 'TOPUP' AND ${inPeriod('p.created_at', 1, 2)}
      `,
      [from, to, TOPUP_STATUSES.paid, TOPUP_STATUSES.pending, TOPUP_STATUSES.failed]
    ),
    pool.query(
      `
      SELECT COALESCE(NULLIF(UPPER(p.channel_code), ''), 'UNKNOWN') AS channel,
        COUNT(*)::int AS count, COALESCE(SUM(p.amount), 0)::numeric(14,2) AS php
      FROM payments p
      WHERE p.payment_type = 'TOPUP' AND UPPER(COALESCE(p.status, '')) = ANY($3::text[])
        AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)}
      GROUP BY 1
      ORDER BY php DESC, channel ASC
      LIMIT 8
      `,
      [from, to, TOPUP_STATUSES.paid]
    ),
  ]);
  const r = statusRes.rows[0] || {};
  return {
    // Counts here are by order date; the headline revenue uses the paid date.
    paidCount: num(r.paid_count),
    paidPhp: num(r.paid_php),
    creditsIssued: num(r.credits),
    buyers: num(r.buyers),
    pendingCount: num(r.pending_count),
    failedCount: num(r.failed_count),
    byChannel: channelRes.rows.map((c) => ({ channel: c.channel, count: num(c.count), php: num(c.php) })),
  };
}

async function fetchSubscriptionBreakdown({ from, to }) {
  const [planRes, periodRes] = await Promise.all([
    pool.query(`
      WITH live AS (
        SELECT DISTINCT ON (s.user_id)
          s.user_id, s.plan_id, s.cancel_at_period_end, s.trial_ends_at
        FROM subscriptions s
        WHERE UPPER(COALESCE(s.status, '')) = 'ACTIVE'
        ORDER BY s.user_id, s.created_at DESC
      )
      SELECT
        p.plan_id,
        p.name,
        p.billing_period,
        p.amount_php_cents,
        COUNT(l.user_id)::int AS members,
        COUNT(l.user_id) FILTER (WHERE l.cancel_at_period_end)::int AS canceling,
        COUNT(l.user_id) FILTER (WHERE l.trial_ends_at > NOW())::int AS trialing,
        COALESCE(SUM(p.amount_php_cents * ${MONTHLY_FACTOR_SQL}) FILTER (WHERE l.user_id IS NOT NULL), 0)::numeric(16,2) AS mrr_cents
      FROM plans p
      LEFT JOIN live l ON l.plan_id = p.plan_id
      WHERE p.deleted_at IS NULL
      GROUP BY p.plan_id, p.name, p.billing_period, p.amount_php_cents
      ORDER BY p.amount_php_cents ASC, p.name ASC
    `),
    pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM subscriptions s INNER JOIN plans p ON p.plan_id = s.plan_id
          WHERE p.amount_php_cents > 0 AND ${inPeriod('s.created_at', 1, 2)})::int AS started,
        (SELECT COUNT(*) FROM subscriptions s INNER JOIN plans p ON p.plan_id = s.plan_id
          WHERE p.amount_php_cents > 0 AND ${inPeriod('s.canceled_at', 1, 2)})::int AS canceled,
        (SELECT COUNT(*) FROM subscription_invoices si
          WHERE UPPER(COALESCE(si.status, '')) = ANY($3::text[]) AND ${inPeriod('si.paid_at', 1, 2)})::int AS paid_invoices,
        (SELECT COUNT(*) FROM subscription_invoices si
          WHERE UPPER(COALESCE(si.status, '')) = ANY($4::text[])
            AND ${inPeriod('COALESCE(si.failed_at, si.updated_at)', 1, 2)})::int AS failed_invoices,
        (SELECT COUNT(*) FROM payments p
          WHERE p.payment_type = 'SUBSCRIPTION' AND UPPER(COALESCE(p.status, '')) = ANY($5::text[])
            AND ${inPeriod('COALESCE(p.processed_at, p.created_at)', 1, 2)})::int AS upgrade_payments
      `,
      [from, to, INVOICE_STATUSES.paid, INVOICE_STATUSES.failed, TOPUP_STATUSES.paid]
    ),
  ]);

  const plans = planRes.rows.map((p) => ({
    planId: p.plan_id,
    name: p.name,
    billingPeriod: p.billing_period || 'MONTH',
    pricePhp: phpFromCents(p.amount_php_cents),
    paid: num(p.amount_php_cents) > 0,
    members: num(p.members),
    canceling: num(p.canceling),
    trialing: num(p.trialing),
    mrrPhp: phpFromCents(p.mrr_cents),
  }));
  const paidPlans = plans.filter((p) => p.paid);
  const r = periodRes.rows[0] || {};
  return {
    activePaid: paidPlans.reduce((s, p) => s + p.members, 0),
    canceling: paidPlans.reduce((s, p) => s + p.canceling, 0),
    trialing: paidPlans.reduce((s, p) => s + p.trialing, 0),
    freeMembers: plans.filter((p) => !p.paid).reduce((s, p) => s + p.members, 0),
    mrrPhp: Math.round(paidPlans.reduce((s, p) => s + p.mrrPhp, 0) * 100) / 100,
    plans,
    period: {
      started: num(r.started),
      canceled: num(r.canceled),
      paidInvoices: num(r.paid_invoices),
      failedInvoices: num(r.failed_invoices),
      upgradePayments: num(r.upgrade_payments),
    },
  };
}

async function fetchFeeBreakdown({ from, to }) {
  const result = await pool.query(
    `
    SELECT ct.type::text AS type, COUNT(*)::int AS count, COALESCE(SUM(ct.amount_credits), 0)::bigint AS credits
    FROM credit_transactions ct
    WHERE ct.status = 'Completed'
      AND (ct.type::text = ANY($3::text[]) OR ct.type::text = ANY($4::text[]))
      AND ${inPeriod('ct.created_at', 1, 2)}
    GROUP BY ct.type
    `,
    [from, to, FEE_TYPES, FEE_REFUND_TYPES]
  );
  const byType = new Map(result.rows.map((r) => [r.type, { count: num(r.count), credits: num(r.credits) }]));
  const rows = FEE_TYPES.map((type) => {
    const gross = byType.get(type) || { count: 0, credits: 0 };
    const refund = byType.get(`${type} Refund`) || { count: 0, credits: 0 };
    return {
      type,
      count: gross.count,
      grossCredits: gross.credits,
      refundedCredits: refund.credits,
      refundCount: refund.count,
      netCredits: gross.credits - refund.credits,
    };
  });
  return {
    netCredits: rows.reduce((s, r) => s + r.netCredits, 0),
    grossCredits: rows.reduce((s, r) => s + r.grossCredits, 0),
    refundedCredits: rows.reduce((s, r) => s + r.refundedCredits, 0),
    byType: rows,
  };
}

async function fetchCashoutBreakdown({ from, to }) {
  const [periodRes, flightRes] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE UPPER(c.status) = ANY($3::text[]))::int AS paid_count,
        COALESCE(SUM(c.amount_credits) FILTER (WHERE UPPER(c.status) = ANY($3::text[])), 0)::bigint AS paid_credits,
        COALESCE(SUM(c.net_amount_php_cents) FILTER (WHERE UPPER(c.status) = ANY($3::text[])), 0)::bigint AS paid_net_cents,
        COALESCE(SUM(c.fee_php_cents) FILTER (WHERE UPPER(c.status) = ANY($3::text[])), 0)::bigint AS fee_cents,
        COUNT(*) FILTER (WHERE UPPER(c.status) = ANY($4::text[]))::int AS failed_count,
        COALESCE(SUM(c.amount_credits) FILTER (WHERE UPPER(c.status) = ANY($4::text[])), 0)::bigint AS failed_credits,
        COUNT(DISTINCT c.user_id) FILTER (WHERE UPPER(c.status) = ANY($3::text[]))::int AS earners
      FROM cashouts c
      WHERE ${inPeriod('c.created_at', 1, 2)}
      `,
      [from, to, CASHOUT_STATUSES.paid, CASHOUT_STATUSES.failed]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS count,
        COALESCE(SUM(c.amount_credits), 0)::bigint AS credits,
        COALESCE(SUM(c.net_amount_php_cents), 0)::bigint AS net_cents,
        COUNT(*) FILTER (WHERE c.created_at < NOW() - INTERVAL '24 hours')::int AS stale,
        MIN(c.created_at) AS oldest_at
      FROM cashouts c
      WHERE UPPER(c.status) = ANY($1::text[])
      `,
      [CASHOUT_STATUSES.in_flight]
    ),
  ]);
  const p = periodRes.rows[0] || {};
  const f = flightRes.rows[0] || {};
  const paidCount = num(p.paid_count);
  const paidPhp = phpFromCents(p.paid_net_cents);
  return {
    paidCount,
    paidCredits: num(p.paid_credits),
    paidPhp,
    feesPhp: phpFromCents(p.fee_cents),
    averagePhp: paidCount ? Math.round((paidPhp / paidCount) * 100) / 100 : 0,
    earners: num(p.earners),
    failedCount: num(p.failed_count),
    failedCredits: num(p.failed_credits),
    inFlight: {
      count: num(f.count),
      credits: num(f.credits),
      php: phpFromCents(f.net_cents),
      stale: num(f.stale),
      oldestAt: f.oldest_at || null,
    },
  };
}

// ── Operations ──────────────────────────────────────────────────────────────

async function fetchTicketStats({ from, to }) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE LOWER(COALESCE(t.status, 'open')) NOT IN ('closed', 'resolved'))::int AS open_count,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(t.status, 'open')) NOT IN ('closed', 'resolved') AND t.handled_by_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(t.status, 'open')) NOT IN ('closed', 'resolved') AND t.priority = 'High'
      )::int AS high_priority,
      MIN(t.created_at) FILTER (WHERE LOWER(COALESCE(t.status, 'open')) NOT IN ('closed', 'resolved')) AS oldest_open_at,
      COUNT(*) FILTER (WHERE ${inPeriod('t.created_at', 1, 2)})::int AS opened,
      COUNT(*) FILTER (WHERE ${inPeriod('t.resolved_at', 1, 2)})::int AS resolved,
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (t.first_staff_reply_at - t.created_at::timestamptz)) / 3600.0
      ) FILTER (WHERE t.first_staff_reply_at IS NOT NULL AND ${inPeriod('t.created_at', 1, 2)}) AS median_first_reply_hours,
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600.0
      ) FILTER (WHERE t.resolved_at IS NOT NULL AND ${inPeriod('t.resolved_at', 1, 2)}) AS median_resolution_hours,
      ROUND(AVG(t.satisfaction_score) FILTER (
        WHERE t.satisfaction_score IS NOT NULL AND ${inPeriod('t.satisfaction_at', 1, 2)}
      )::numeric, 2) AS satisfaction,
      COUNT(*) FILTER (WHERE t.satisfaction_score IS NOT NULL AND ${inPeriod('t.satisfaction_at', 1, 2)})::int AS ratings
    FROM tickets t
    WHERE t.deleted_at IS NULL
    `,
    [from, to]
  );
  const r = result.rows[0] || {};
  const hours = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
  return {
    open: num(r.open_count),
    unassigned: num(r.unassigned),
    highPriority: num(r.high_priority),
    oldestOpenAt: r.oldest_open_at || null,
    opened: num(r.opened),
    resolved: num(r.resolved),
    medianFirstReplyHours: hours(r.median_first_reply_hours),
    medianResolutionHours: hours(r.median_resolution_hours),
    satisfaction: r.satisfaction == null ? null : Number(r.satisfaction),
    ratings: num(r.ratings),
  };
}

async function fetchQueueCounts() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM reports r
        WHERE r.deleted_at IS NULL AND LOWER(COALESCE(r.status, 'open')) NOT IN (${CLOSED_REPORTS}))::int AS open_reports,
      (SELECT COUNT(*) FROM disputes d WHERE d.status <> 'closed')::int AS open_disputes,
      (SELECT COUNT(*) FROM marketplace_listings ml WHERE LOWER(COALESCE(ml.status, '')) = 'pending')::int AS pending_listings,
      (SELECT COUNT(*) FROM violations v
        WHERE v.deleted_at IS NULL
          AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open')
          AND (v.expires_at IS NULL OR v.expires_at > NOW()))::int AS active_violations,
      (SELECT COUNT(*) FROM teams)::int AS teams
  `);
  const r = result.rows[0] || {};
  return {
    openReports: num(r.open_reports),
    openDisputes: num(r.open_disputes),
    pendingListings: num(r.pending_listings),
    activeViolations: num(r.active_violations),
    teams: num(r.teams),
  };
}

// ── Community (MongoDB) ─────────────────────────────────────────────────────

const toDate = (field) => ({ $convert: { input: field, to: 'date', onError: null, onNull: null } });

async function forumDb() {
  let client = getMongoClient();
  if (!client) client = await connectMongoDB();
  return client ? client.db('ensemble') : null;
}

/**
 * Whole-collection aggregates (the old version summed the 30 newest groups and called it a
 * total). Banned group members and deleted comments are not counted.
 */
async function fetchCommunityStats({ from, to, prevFrom, prevTo }) {
  const db = await forumDb();
  if (!db) return null;

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const prevStart = prevFrom ? new Date(`${prevFrom}T00:00:00`) : null;
  const prevEnd = prevTo ? new Date(`${prevTo}T00:00:00`) : null;
  if (prevEnd) prevEnd.setDate(prevEnd.getDate() + 1);
  const inRange = (field) => ({ [field]: { $gte: start, $lt: end } });

  const [groupFacet] = await db
    .collection('forum_groups')
    .aggregate([
      { $match: { deleted_at: null } },
      {
        $project: {
          group_name: 1,
          status: 1,
          tags: { $ifNull: ['$tags', []] },
          created: toDate('$created_at'),
          memberCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$members', []] },
                as: 'm',
                cond: { $ne: ['$$m.is_banned', true] },
              },
            },
          },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                memberships: { $sum: '$memberCount' },
              },
            },
          ],
          sizes: [
            {
              $bucket: {
                groupBy: '$memberCount',
                boundaries: [0, 1, 3, 6, 11, 51],
                default: 'large',
                output: { count: { $sum: 1 } },
              },
            },
          ],
          top: [
            { $match: { status: 'active' } },
            { $sort: { memberCount: -1, created: -1 } },
            { $limit: 8 },
            { $project: { group_name: 1, memberCount: 1, status: 1 } },
          ],
          tags: [
            { $unwind: '$tags' },
            {
              $group: {
                _id: {
                  $toLower: {
                    $ifNull: [{ $convert: { input: '$tags', to: 'string', onError: null, onNull: null } }, ''],
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: '' } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 10 },
          ],
          created: [{ $match: inRange('created') }, { $count: 'n' }],
        },
      },
    ])
    .toArray();

  const [discussionFacet] = await db
    .collection('forum_discussions')
    .aggregate([
      { $match: { deleted_at: null } },
      {
        $project: {
          title: 1,
          user_id: 1,
          created: toDate('$created_at'),
          likes: { $size: { $ifNull: ['$likes', []] } },
          comments: {
            $filter: {
              input: { $ifNull: ['$comments', []] },
              as: 'c',
              cond: { $eq: [{ $ifNull: ['$$c.deleted_at', null] }, null] },
            },
          },
        },
      },
      {
        $facet: {
          total: [{ $count: 'n' }],
          inRange: [{ $match: inRange('created') }, { $count: 'n' }],
          previous: prevStart
            ? [{ $match: { created: { $gte: prevStart, $lt: prevEnd } } }, { $count: 'n' }]
            : [{ $match: { _id: { $exists: false } } }],
          comments: [
            { $unwind: '$comments' },
            { $project: { c: toDate('$comments.created_at'), u: '$comments.user_id' } },
            { $match: { c: { $gte: start, $lt: end } } },
            { $group: { _id: '$u', n: { $sum: 1 } } },
            { $group: { _id: null, n: { $sum: '$n' }, people: { $sum: 1 } } },
          ],
          posters: [
            { $match: inRange('created') },
            { $group: { _id: '$user_id' } },
            { $count: 'n' },
          ],
          top: [
            { $match: inRange('created') },
            { $project: { title: 1, user_id: 1, created: 1, likes: 1, commentCount: { $size: '$comments' } } },
            { $sort: { commentCount: -1, likes: -1, created: -1 } },
            { $limit: 8 },
          ],
        },
      },
    ])
    .toArray();

  const first = (rows, key = 'n') => num(rows?.[0]?.[key]);
  const totals = groupFacet?.totals?.[0] || {};
  const groupTotal = num(totals.total);
  const sizeCounts = new Map((groupFacet?.sizes || []).map((b) => [String(b._id), num(b.count)]));
  const SIZE_BUCKETS = [
    ['0', 'No members'],
    ['1', '1–2'],
    ['3', '3–5'],
    ['6', '6–10'],
    ['11', '11–50'],
    ['large', '51+'],
  ];

  return {
    groups: {
      total: groupTotal,
      active: num(totals.active),
      inactive: Math.max(0, groupTotal - num(totals.active)),
      memberships: num(totals.memberships),
      averageSize: groupTotal ? Math.round((num(totals.memberships) / groupTotal) * 10) / 10 : 0,
      createdInPeriod: first(groupFacet?.created),
      sizeDistribution: SIZE_BUCKETS.map(([key, label]) => ({ label, count: sizeCounts.get(key) || 0 })),
      top: (groupFacet?.top || []).map((g) => ({
        id: String(g._id),
        name: g.group_name || 'Unnamed group',
        members: num(g.memberCount),
        status: g.status || 'unknown',
      })),
      tags: (groupFacet?.tags || []).map((t) => ({ tag: t._id, count: num(t.count) })),
    },
    discussions: {
      total: first(discussionFacet?.total),
      inPeriod: first(discussionFacet?.inRange),
      previous: prevStart ? first(discussionFacet?.previous) : null,
      commentsInPeriod: first(discussionFacet?.comments),
      commentersInPeriod: first(discussionFacet?.comments, 'people'),
      postersInPeriod: first(discussionFacet?.posters),
      top: (discussionFacet?.top || []).map((d) => ({
        id: String(d._id),
        title: d.title || 'Untitled discussion',
        authorId: d.user_id ? String(d.user_id) : null,
        comments: num(d.commentCount),
        likes: num(d.likes),
        createdAt: d.created || null,
      })),
    },
  };
}

/** Forum author ids are member user ids or account ids; resolves either to a display name. */
async function fetchAuthorNames(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!unique.length) return new Map();
  const result = await pool.query(
    `
    SELECT u.user_id::text AS user_id, a.account_id::text AS account_id, a.handle, a.display_name
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE a.account_id::text = ANY($1::text[]) OR u.user_id::text = ANY($1::text[])
    `,
    [unique]
  );
  const names = new Map();
  for (const r of result.rows) {
    const value = { name: r.display_name || r.handle || 'Member', handle: r.handle || null };
    if (r.user_id) names.set(r.user_id, value);
    names.set(r.account_id, value);
  }
  return names;
}

// ── Finance lists (server-paged, also used for CSV export) ──────────────────

function pageClause(params, limit, offset) {
  params.push(limit, offset);
  return `LIMIT $${params.length - 1} OFFSET $${params.length}`;
}

async function listTopups({ status, channel, search, from, to, limit, offset }) {
  const where = [`p.payment_type = 'TOPUP'`];
  const params = [];
  if (status && TOPUP_STATUSES[status]) {
    params.push(TOPUP_STATUSES[status]);
    where.push(`UPPER(COALESCE(p.status, '')) = ANY($${params.length}::text[])`);
  }
  if (channel) {
    params.push(channel.toUpperCase());
    where.push(`UPPER(COALESCE(p.channel_code, '')) = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`p.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    where.push(`p.created_at < ($${params.length}::date + 1)`);
  }
  if (search) {
    params.push(likePattern(search));
    const i = params.length;
    where.push(`(
      p.reference_id ILIKE $${i} OR COALESCE(p.payment_id, '') ILIKE $${i} OR p.id::text ILIKE $${i}
      OR COALESCE(a.handle, '') ILIKE $${i} OR COALESCE(a.display_name, '') ILIKE $${i}
      OR COALESCE(u.email_address, '') ILIKE $${i}
    )`);
  }
  const from_ = `
    FROM payments p
    LEFT JOIN users u ON u.user_id = p.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    WHERE ${where.join(' AND ')}`;
  const countParams = [...params];
  const [countRes, listRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(p.amount), 0)::numeric(14,2) AS php ${from_}`, countParams),
    pool.query(
      `
      SELECT p.id, p.reference_id, p.payment_id, p.channel_code, p.amount, p.credits, p.currency, p.status,
        p.created_at, p.processed_at, a.account_id, a.handle, a.display_name, u.email_address
      ${from_}
      ORDER BY p.created_at DESC, p.id DESC
      ${pageClause(params, limit, offset)}
      `,
      params
    ),
  ]);
  return {
    total: num(countRes.rows[0]?.total),
    sumPhp: num(countRes.rows[0]?.php),
    items: listRes.rows.map((r) => ({
      id: r.id,
      referenceId: r.reference_id,
      paymentId: r.payment_id || null,
      channel: r.channel_code || null,
      amountPhp: num(r.amount),
      credits: num(r.credits),
      currency: r.currency || 'PHP',
      status: r.status || 'PENDING',
      createdAt: r.created_at,
      processedAt: r.processed_at || null,
      member: { accountId: r.account_id || null, name: r.display_name || r.handle || 'Member', handle: r.handle || null },
      email: r.email_address || null,
    })),
  };
}

async function listSubscriptionInvoices({ status, planId, search, from, to, limit, offset }) {
  const where = ['TRUE'];
  const params = [];
  if (status && INVOICE_STATUSES[status]) {
    params.push(INVOICE_STATUSES[status]);
    where.push(`UPPER(COALESCE(si.status, '')) = ANY($${params.length}::text[])`);
  }
  if (planId) {
    params.push(planId);
    where.push(`p.plan_id = $${params.length}::uuid`);
  }
  const dated = 'COALESCE(si.paid_at, si.failed_at, si.created_at)';
  if (from) {
    params.push(from);
    where.push(`${dated} >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    where.push(`${dated} < ($${params.length}::date + 1)`);
  }
  if (search) {
    params.push(likePattern(search));
    const i = params.length;
    where.push(`(
      COALESCE(a.handle, '') ILIKE $${i} OR COALESCE(a.display_name, '') ILIKE $${i}
      OR COALESCE(u.email_address, '') ILIKE $${i} OR COALESCE(si.xendit_cycle_id, '') ILIKE $${i}
    )`);
  }
  const from_ = `
    FROM subscription_invoices si
    LEFT JOIN subscriptions s ON s.subscription_id = si.subscription_id
    LEFT JOIN plans p ON p.plan_id = s.plan_id
    LEFT JOIN users u ON u.user_id = s.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    WHERE ${where.join(' AND ')}`;
  const countParams = [...params];
  const [countRes, listRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(${INVOICE_CENTS_SQL}), 0)::bigint AS cents ${from_}`, countParams),
    pool.query(
      `
      SELECT si.subscription_invoice_id, si.xendit_cycle_id, si.status, si.attempt_count,
        si.billing_period_start, si.billing_period_end, si.paid_at, si.failed_at, si.created_at,
        ${INVOICE_CENTS_SQL} AS amount_cents,
        p.name AS plan_name, a.account_id, a.handle, a.display_name, u.email_address
      ${from_}
      ORDER BY ${dated} DESC, si.subscription_invoice_id DESC
      ${pageClause(params, limit, offset)}
      `,
      params
    ),
  ]);
  return {
    total: num(countRes.rows[0]?.total),
    sumPhp: phpFromCents(countRes.rows[0]?.cents),
    items: listRes.rows.map((r) => ({
      id: r.subscription_invoice_id,
      cycleId: r.xendit_cycle_id || null,
      plan: r.plan_name || '—',
      amountPhp: phpFromCents(r.amount_cents),
      status: r.status || 'UNKNOWN',
      attempts: num(r.attempt_count),
      periodStart: r.billing_period_start || null,
      periodEnd: r.billing_period_end || null,
      paidAt: r.paid_at || null,
      failedAt: r.failed_at || null,
      createdAt: r.created_at,
      member: { accountId: r.account_id || null, name: r.display_name || r.handle || 'Member', handle: r.handle || null },
      email: r.email_address || null,
    })),
  };
}

const SUBSCRIPTION_FILTERS = {
  active: `UPPER(COALESCE(s.status, '')) = 'ACTIVE' AND NOT COALESCE(s.cancel_at_period_end, FALSE)`,
  canceling: `UPPER(COALESCE(s.status, '')) = 'ACTIVE' AND COALESCE(s.cancel_at_period_end, FALSE)`,
  trial: `UPPER(COALESCE(s.status, '')) = 'ACTIVE' AND s.trial_ends_at > NOW()`,
  ended: `UPPER(COALESCE(s.status, '')) <> 'ACTIVE'`,
};

async function listSubscriptions({ status, planId, search, includeFree, limit, offset }) {
  const where = [];
  const params = [];
  if (!includeFree && !planId) where.push('p.amount_php_cents > 0');
  if (status && SUBSCRIPTION_FILTERS[status]) where.push(SUBSCRIPTION_FILTERS[status]);
  if (planId) {
    params.push(planId);
    where.push(`p.plan_id = $${params.length}::uuid`);
  }
  if (search) {
    params.push(likePattern(search));
    const i = params.length;
    where.push(`(
      COALESCE(a.handle, '') ILIKE $${i} OR COALESCE(a.display_name, '') ILIKE $${i}
      OR COALESCE(u.email_address, '') ILIKE $${i}
    )`);
  }
  const from_ = `
    FROM subscriptions s
    INNER JOIN plans p ON p.plan_id = s.plan_id
    LEFT JOIN users u ON u.user_id = s.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
  const countParams = [...params];
  const [countRes, listRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${from_}`, countParams),
    pool.query(
      `
      SELECT s.subscription_id, s.status, s.cancel_at_period_end, s.canceled_at, s.trial_ends_at,
        s.current_period_end, s.next_billing_at, s.created_at,
        p.name AS plan_name, p.amount_php_cents, p.billing_period,
        a.account_id, a.handle, a.display_name, u.email_address,
        COALESCE((
          SELECT SUM(CASE
            WHEN si.amount_php_cents > 0 AND p.amount_php_cents > 0 AND si.amount_php_cents * 100 = p.amount_php_cents
              THEN si.amount_php_cents * 100
            ELSE COALESCE(si.amount_php_cents, 0)
          END)
          FROM subscription_invoices si
          WHERE si.subscription_id = s.subscription_id AND UPPER(COALESCE(si.status, '')) IN ('SUCCEEDED', 'PAID')
        ), 0)::bigint AS billed_cents
      ${from_}
      ORDER BY s.created_at DESC, s.subscription_id DESC
      ${pageClause(params, limit, offset)}
      `,
      params
    ),
  ]);
  return {
    total: num(countRes.rows[0]?.total),
    items: listRes.rows.map((r) => ({
      id: r.subscription_id,
      plan: r.plan_name,
      pricePhp: phpFromCents(r.amount_php_cents),
      billingPeriod: r.billing_period || 'MONTH',
      status: r.status || 'UNKNOWN',
      cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
      canceledAt: r.canceled_at || null,
      trialEndsAt: r.trial_ends_at || null,
      currentPeriodEnd: r.current_period_end || null,
      nextBillingAt: r.next_billing_at || null,
      startedAt: r.created_at,
      billedPhp: phpFromCents(r.billed_cents),
      member: { accountId: r.account_id || null, name: r.display_name || r.handle || 'Member', handle: r.handle || null },
      email: r.email_address || null,
    })),
  };
}

function maskAccountNumber(value) {
  const digits = String(value || '').replace(/\s+/g, '');
  if (!digits) return null;
  return digits.length <= 4 ? '••••' : `•••• ${digits.slice(-4)}`;
}

async function listCashouts({ status, channel, search, from, to, limit, offset }) {
  const where = ['TRUE'];
  const params = [];
  if (status && CASHOUT_STATUSES[status]) {
    params.push(CASHOUT_STATUSES[status]);
    where.push(`UPPER(c.status) = ANY($${params.length}::text[])`);
  }
  if (channel) {
    params.push(channel.toUpperCase());
    where.push(`UPPER(c.xendit_channel_code) = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`c.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    where.push(`c.created_at < ($${params.length}::date + 1)`);
  }
  if (search) {
    params.push(likePattern(search));
    const i = params.length;
    where.push(`(
      c.reference_id ILIKE $${i} OR c.cashout_id::text ILIKE $${i}
      OR COALESCE(a.handle, '') ILIKE $${i} OR COALESCE(a.display_name, '') ILIKE $${i}
      OR COALESCE(c.account_name, '') ILIKE $${i}
    )`);
  }
  const from_ = `
    FROM cashouts c
    LEFT JOIN users u ON u.user_id = c.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    WHERE ${where.join(' AND ')}`;
  const countParams = [...params];
  const [countRes, listRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(c.net_amount_php_cents), 0)::bigint AS cents ${from_}`, countParams),
    pool.query(
      `
      SELECT c.cashout_id, c.reference_id, c.xendit_channel_code, c.account_no, c.account_name,
        c.amount_credits, c.fee_php_cents, c.net_amount_php_cents, c.status, c.failure_code,
        c.created_at, c.updated_at, a.account_id, a.handle, a.display_name
      ${from_}
      ORDER BY c.created_at DESC, c.cashout_id DESC
      ${pageClause(params, limit, offset)}
      `,
      params
    ),
  ]);
  return {
    total: num(countRes.rows[0]?.total),
    sumPhp: phpFromCents(countRes.rows[0]?.cents),
    items: listRes.rows.map((r) => ({
      id: r.cashout_id,
      referenceId: r.reference_id,
      channel: r.xendit_channel_code || null,
      // Full payout account numbers stay out of analytics; the last four identify it.
      accountNumber: maskAccountNumber(r.account_no),
      accountName: r.account_name || null,
      credits: num(r.amount_credits),
      feePhp: phpFromCents(r.fee_php_cents),
      netPhp: phpFromCents(r.net_amount_php_cents),
      status: r.status,
      failureCode: r.failure_code || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at || null,
      member: { accountId: r.account_id || null, name: r.display_name || r.handle || 'Member', handle: r.handle || null },
    })),
  };
}

async function listFinanceFilterOptions() {
  const [plans, topupChannels, cashoutChannels] = await Promise.all([
    pool.query(`SELECT plan_id, name, amount_php_cents FROM plans WHERE deleted_at IS NULL ORDER BY amount_php_cents ASC, name ASC`),
    pool.query(`
      SELECT DISTINCT UPPER(channel_code) AS channel FROM payments
      WHERE payment_type = 'TOPUP' AND COALESCE(channel_code, '') <> ''
      ORDER BY 1 LIMIT 30
    `),
    pool.query(`
      SELECT DISTINCT UPPER(xendit_channel_code) AS channel FROM cashouts
      WHERE COALESCE(xendit_channel_code, '') <> ''
      ORDER BY 1 LIMIT 30
    `),
  ]);
  return {
    plans: plans.rows.map((p) => ({ planId: p.plan_id, name: p.name, paid: num(p.amount_php_cents) > 0 })),
    topupChannels: topupChannels.rows.map((r) => r.channel),
    cashoutChannels: cashoutChannels.rows.map((r) => r.channel),
  };
}

module.exports = {
  TOPUP_STATUSES,
  INVOICE_STATUSES,
  CASHOUT_STATUSES,
  fetchCalendar,
  fetchMemberSummary,
  fetchNewestMembers,
  fetchEmailDomains,
  fetchStaffRoles,
  fetchPeriodTotals,
  fetchSeries,
  fetchTrackingSince,
  fetchActiveSeries,
  fetchEngagementTotals,
  fetchWeeklyCohorts,
  fetchTopupBreakdown,
  fetchSubscriptionBreakdown,
  fetchFeeBreakdown,
  fetchCashoutBreakdown,
  fetchTicketStats,
  fetchQueueCounts,
  fetchCommunityStats,
  fetchAuthorNames,
  listTopups,
  listSubscriptionInvoices,
  listSubscriptions,
  listCashouts,
  listFinanceFilterOptions,
};
