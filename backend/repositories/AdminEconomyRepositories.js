const { pool } = require('../lib/Database');
const { DEFAULT_SETTINGS, getSectionValue } = require('./AdminSettingsRepositories');

/**
 * Staff Credits & Economy desk (Admin + Support Moderator).
 *
 * Balances: `balance_credits` is spendable, `frozen_balance_credits` is a staff hold. Both
 * belong to the member, so supply counts both. Movement math counts Completed and Reversed
 * rows (a reversed row still moved its credits; its compensating row moves them back).
 *
 * Staff adjustments are self-transfers (source = destination, unsigned amount). Their sign,
 * reason and actor live on the CREDITS_ADJUSTED account_activity row that references the
 * ledger row. Rows written before that audit existed have no sign and are reported as such.
 *
 * `includeStaff = false` (Support Moderator) hides staff wallets and every ledger row that
 * touches one: staff accounts are Admin's to inspect.
 */

const MOVED_STATUSES = `('Completed', 'Reversed')`;
const FEE_TYPES = `('Fee', 'Job Posting Fee', 'Proposal Fee', 'Service Posting Fee')`;
const REFUND_TYPES = `('Escrow Refund', 'Asset Refund', 'Cashout Refund', 'Job Posting Fee Refund', 'Proposal Fee Refund')`;

const ADJUSTMENT_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT aa.metadata, aa.actor_staff_id, aa.created_at
    FROM account_activity aa
    WHERE aa.event_code = 'CREDITS_ADJUSTED'
      AND aa.reference_id = ct.credit_transaction_id::text
    ORDER BY aa.created_at DESC
    LIMIT 1
  ) adj ON ct.source_wallet_id = ct.destination_wallet_id`;

/** Owner of a wallet: the account it belongs to, or the contract an escrow wallet serves. */
function partyLateral(alias, walletColumn) {
  return `
  LEFT JOIN LATERAL (
    SELECT
      a.account_id,
      a.handle,
      a.display_name,
      CASE
        WHEN EXISTS (SELECT 1 FROM users u WHERE u.account_id = a.account_id) THEN 'User'
        WHEN EXISTS (SELECT 1 FROM staff s WHERE s.account_id = a.account_id) THEN 'Staff'
        WHEN EXISTS (SELECT 1 FROM teams t WHERE t.account_id = a.account_id) THEN 'Team'
        ELSE a.type
      END AS account_kind,
      EXISTS (SELECT 1 FROM staff s WHERE s.account_id = a.account_id) AS is_staff
    FROM account_wallets aw
    INNER JOIN accounts a ON a.account_id = aw.account_id
    WHERE aw.wallet_id = ${walletColumn}
    LIMIT 1
  ) ${alias} ON TRUE
  LEFT JOIN LATERAL (
    SELECT ew.contract_id FROM escrow_wallets ew WHERE ew.wallet_id = ${walletColumn} LIMIT 1
  ) ${alias}_ew ON TRUE`;
}

function walletTypeLabel(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'account wallets') return 'Account';
  if (value === 'escrow wallets') return 'Escrow';
  if (value === 'platform wallets') return 'Platform';
  return type || 'Wallet';
}

function mapParty(row, prefix) {
  const walletType = row[`${prefix}_wallet_type`];
  const isPlatform = String(walletType || '').toLowerCase() === 'platform wallets';
  const accountId = row[`${prefix}_account_id`] || null;
  const contractId = row[`${prefix}_contract_id`] || null;
  let name = row[`${prefix}_display_name`] || row[`${prefix}_handle`] || null;
  if (!name) name = isPlatform ? 'Platform wallet' : contractId ? 'Contract escrow' : 'Unknown wallet';
  return {
    walletId: row[`${prefix}_wallet_id`] || null,
    walletType: walletTypeLabel(walletType),
    accountId,
    name,
    handle: row[`${prefix}_handle`] || null,
    accountType: isPlatform ? 'Platform' : row[`${prefix}_account_kind`] || null,
    isStaff: Boolean(row[`${prefix}_is_staff`]),
    contractId,
  };
}

function ledgerCategory(row) {
  const type = String(row.type || '');
  const isSelf = String(row.source_wallet_id) === String(row.destination_wallet_id);
  if (isSelf && type === 'Fund Transfer') return 'Staff adjustment';
  if (row.reference_table === 'payments') return 'Top-up';
  if (row.related_dispute_id || row.reference_table === 'disputes') return 'Dispute';
  if (type.startsWith('Escrow')) return 'Escrow';
  if (type.startsWith('Asset')) return 'Marketplace';
  if (type.startsWith('Cashout')) return 'Cashout';
  if (type.startsWith('Job Posting') || type.startsWith('Proposal') || type === 'Service Posting Fee') {
    return 'Jobs & gigs';
  }
  if (type === 'Fee') return 'Platform fee';
  return 'Transfer';
}

function staffName(first, last, fallback = null) {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || fallback;
}

function mapLedgerRow(row, { walletId = null, accountId = null } = {}) {
  const amount = Math.abs(Number(row.amount_credits || 0));
  const source = mapParty(row, 'src');
  const destination = mapParty(row, 'dst');
  const isAdjustment = String(row.source_wallet_id) === String(row.destination_wallet_id) && row.type === 'Fund Transfer';
  const meta = row.adj_metadata || null;
  const delta = meta && Number.isFinite(Number(meta.delta)) ? Number(meta.delta) : null;

  let direction = null;
  let signedAmount = null;
  if (isAdjustment) {
    direction = delta == null ? 'unknown' : delta > 0 ? 'in' : 'out';
    signedAmount = delta;
  } else if (walletId) {
    const into = String(row.destination_wallet_id) === String(walletId);
    direction = into ? 'in' : 'out';
    signedAmount = into ? amount : -amount;
  } else if (accountId) {
    const into = String(destination.accountId) === String(accountId);
    const outOf = String(source.accountId) === String(accountId);
    direction = into && outOf ? 'internal' : into ? 'in' : 'out';
    signedAmount = into && outOf ? 0 : into ? amount : -amount;
  }

  return {
    id: row.credit_transaction_id,
    type: row.type,
    category: ledgerCategory(row),
    status: row.status,
    amount,
    signedAmount,
    direction,
    createdAt: row.created_at,
    source,
    destination,
    isAdjustment,
    adjustment: isAdjustment
      ? {
          recorded: Boolean(meta),
          delta,
          reason: meta?.reason || null,
          balanceAfter: meta?.balanceAfter != null ? Number(meta.balanceAfter) : null,
          actorStaffId: row.adj_actor_staff_id || null,
          actorName: staffName(row.adj_staff_first, row.adj_staff_last, row.adj_actor_staff_id ? 'Staff member' : null),
          actorRole: row.adj_staff_role || null,
        }
      : null,
    referenceTable: row.reference_table || null,
    referenceId: row.reference_id || null,
    relatedDisputeId: row.related_dispute_id || null,
    reversesTransactionId: row.reverses_credit_transaction_id || null,
    feeTransactionId: row.fee_transaction_id || null,
  };
}

const LEDGER_SELECT = `
  SELECT
    ct.credit_transaction_id,
    ct.type::text AS type,
    ct.status::text AS status,
    ct.amount_credits,
    ct.created_at,
    ct.source_wallet_id,
    ct.destination_wallet_id,
    ct.reference_table,
    ct.reference_id,
    ct.related_dispute_id,
    ct.reverses_credit_transaction_id,
    ct.fee_transaction_id,
    sw.wallet_id AS src_wallet_id,
    sw.type AS src_wallet_type,
    src.account_id AS src_account_id,
    src.handle AS src_handle,
    src.display_name AS src_display_name,
    src.account_kind AS src_account_kind,
    src.is_staff AS src_is_staff,
    src_ew.contract_id AS src_contract_id,
    dw.wallet_id AS dst_wallet_id,
    dw.type AS dst_wallet_type,
    dst.account_id AS dst_account_id,
    dst.handle AS dst_handle,
    dst.display_name AS dst_display_name,
    dst.account_kind AS dst_account_kind,
    dst.is_staff AS dst_is_staff,
    dst_ew.contract_id AS dst_contract_id,
    adj.metadata AS adj_metadata,
    adj.actor_staff_id AS adj_actor_staff_id,
    adjs.first_name AS adj_staff_first,
    adjs.last_name AS adj_staff_last,
    adjs.role::text AS adj_staff_role,
    COUNT(*) OVER() AS total_count
  FROM credit_transactions ct
  LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
  LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
  ${partyLateral('src', 'ct.source_wallet_id')}
  ${partyLateral('dst', 'ct.destination_wallet_id')}
  ${ADJUSTMENT_LATERAL}
  LEFT JOIN staff adjs ON adjs.staff_id = adj.actor_staff_id`;

const LEDGER_KIND_SQL = {
  adjustment: `(ct.source_wallet_id = ct.destination_wallet_id AND ct.type::text = 'Fund Transfer')`,
  topup: `(ct.reference_table = 'payments')`,
  transfer: `(ct.type::text = 'Fund Transfer' AND ct.source_wallet_id <> ct.destination_wallet_id AND COALESCE(ct.reference_table, '') <> 'payments')`,
  escrow: `(ct.type::text LIKE 'Escrow%')`,
  marketplace: `(ct.type::text LIKE 'Asset%')`,
  cashout: `(ct.type::text LIKE 'Cashout%')`,
  fees: `(ct.type::text IN ${FEE_TYPES})`,
  jobs: `(ct.type::text LIKE 'Job Posting%' OR ct.type::text LIKE 'Proposal%' OR ct.type::text = 'Service Posting Fee')`,
  dispute: `(ct.related_dispute_id IS NOT NULL OR ct.reference_table = 'disputes')`,
  refunds: `(ct.type::text IN ${REFUND_TYPES})`,
};

const LEDGER_SORT_SQL = {
  newest: 'ct.created_at DESC, ct.credit_transaction_id DESC',
  oldest: 'ct.created_at ASC, ct.credit_transaction_id ASC',
  amount_desc: 'ct.amount_credits DESC, ct.created_at DESC, ct.credit_transaction_id DESC',
  amount_asc: 'ct.amount_credits ASC, ct.created_at DESC, ct.credit_transaction_id DESC',
};

/**
 * One page of the credit ledger. Filters are validated by the service; every value is
 * parameterized here.
 */
async function listLedger({
  search = '',
  type = null,
  status = null,
  kind = null,
  direction = null,
  walletId = null,
  accountId = null,
  from = null,
  to = null,
  minAmount = null,
  maxAmount = null,
  sort = 'newest',
  limit = 50,
  offset = 0,
  includeStaff = true,
} = {}) {
  const params = [];
  const where = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (!includeStaff) {
    where.push('NOT COALESCE(src.is_staff, FALSE) AND NOT COALESCE(dst.is_staff, FALSE)');
  }
  if (walletId) {
    const p = add(walletId);
    where.push(`(ct.source_wallet_id = ${p}::uuid OR ct.destination_wallet_id = ${p}::uuid)`);
    if (direction === 'in') {
      where.push(`(ct.destination_wallet_id = ${p}::uuid AND (ct.source_wallet_id <> ${p}::uuid OR (adj.metadata->>'delta')::numeric > 0))`);
    } else if (direction === 'out') {
      where.push(`(ct.source_wallet_id = ${p}::uuid AND (ct.destination_wallet_id <> ${p}::uuid OR (adj.metadata->>'delta')::numeric < 0))`);
    }
  }
  if (accountId) {
    const p = add(accountId);
    where.push(`(src.account_id = ${p}::uuid OR dst.account_id = ${p}::uuid)`);
  }
  if (type) where.push(`ct.type::text = ${add(type)}`);
  if (status) where.push(`ct.status::text = ${add(status)}`);
  if (kind && LEDGER_KIND_SQL[kind]) where.push(LEDGER_KIND_SQL[kind]);
  if (from) where.push(`ct.created_at >= ${add(from)}::date`);
  if (to) where.push(`ct.created_at < (${add(to)}::date + 1)`);
  if (minAmount != null) where.push(`ct.amount_credits >= ${add(minAmount)}`);
  if (maxAmount != null) where.push(`ct.amount_credits <= ${add(maxAmount)}`);
  const q = String(search || '').trim();
  if (q) {
    const p = add(`%${q}%`);
    where.push(`(
      src.handle ILIKE ${p} OR src.display_name ILIKE ${p}
      OR dst.handle ILIKE ${p} OR dst.display_name ILIKE ${p}
      OR ct.credit_transaction_id::text ILIKE ${p}
      OR ct.reference_id::text ILIKE ${p}
      OR ct.source_wallet_id::text ILIKE ${p}
      OR ct.destination_wallet_id::text ILIKE ${p}
      OR COALESCE(adj.metadata->>'reason', '') ILIKE ${p}
    )`);
  }

  const orderBy = LEDGER_SORT_SQL[sort] || LEDGER_SORT_SQL.newest;
  const limitParam = add(limit);
  const offsetParam = add(offset);
  const result = await pool.query(
    `${LEDGER_SELECT}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ${orderBy}
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return {
    items: result.rows.map((row) => mapLedgerRow(row, { walletId, accountId })),
    total: Number(result.rows[0]?.total_count || 0),
    limit,
    offset,
  };
}

const WALLET_BASE = `
  SELECT
    w.wallet_id,
    w.balance_credits,
    w.frozen_balance_credits,
    w.status AS wallet_status,
    w.frozen_at,
    w.frozen_until,
    w.frozen_reason,
    w.frozen_by_staff_id,
    w.created_at AS wallet_created_at,
    a.account_id,
    a.handle,
    a.display_name,
    a.status AS account_status,
    a.created_at AS account_created_at,
    COALESCE(u.first_name, s.first_name) AS first_name,
    COALESCE(u.last_name, s.last_name) AS last_name,
    COALESCE(u.email_address, s.email_address) AS email_address,
    s.role::text AS staff_role,
    t.team_id,
    CASE
      WHEN u.user_id IS NOT NULL THEN 'User'
      WHEN s.staff_id IS NOT NULL THEN 'Staff'
      WHEN t.team_id IS NOT NULL THEN 'Team'
      ELSE COALESCE(a.type, 'User')
    END AS account_kind,
    (s.staff_id IS NOT NULL) AS is_staff
  FROM wallets w
  INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
  INNER JOIN accounts a ON a.account_id = aw.account_id AND a.deleted_at IS NULL
  LEFT JOIN users u ON u.account_id = a.account_id
  LEFT JOIN staff s ON s.account_id = a.account_id
  LEFT JOIN teams t ON t.account_id = a.account_id
  WHERE w.type = 'account wallets'`;

const WALLET_SORT_SQL = {
  balance_desc: '(b.balance_credits + b.frozen_balance_credits) DESC, b.wallet_id',
  balance_asc: '(b.balance_credits + b.frozen_balance_credits) ASC, b.wallet_id',
  held_desc: 'b.frozen_balance_credits DESC, b.wallet_id',
  hold_ending: 'b.frozen_until ASC NULLS LAST, b.frozen_at ASC NULLS LAST, b.wallet_id',
  name: 'LOWER(COALESCE(NULLIF(b.display_name, \'\'), b.handle, \'\')) ASC, b.wallet_id',
  newest: 'b.account_created_at DESC, b.wallet_id',
};

const WALLET_HOLD_SQL = {
  held: 'b.frozen_balance_credits > 0',
  not_held: 'b.frozen_balance_credits = 0',
  overdue: 'b.frozen_balance_credits > 0 AND b.frozen_until IS NOT NULL AND b.frozen_until < NOW()',
  expiring: "b.frozen_balance_credits > 0 AND b.frozen_until >= NOW() AND b.frozen_until < NOW() + INTERVAL '7 days'",
  indefinite: 'b.frozen_balance_credits > 0 AND b.frozen_until IS NULL',
};

const WALLET_BALANCE_SQL = {
  empty: '(b.balance_credits + b.frozen_balance_credits) = 0',
  positive: '(b.balance_credits + b.frozen_balance_credits) > 0',
  negative: '(b.balance_credits < 0 OR b.frozen_balance_credits < 0)',
};

function normalizeAccountStatus(status) {
  if (!status) return 'Active';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  if (s.includes('lock')) return 'Locked';
  if (s.includes('deactiv')) return 'Deactivated';
  return status;
}

function mapWalletRow(row) {
  const spendable = Number(row.balance_credits || 0);
  const held = Number(row.frozen_balance_credits || 0);
  const name =
    row.display_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.handle ||
    'Unknown';
  const holdActive = held > 0;
  const until = row.frozen_until ? new Date(row.frozen_until) : null;
  return {
    walletId: row.wallet_id,
    accountId: row.account_id,
    name,
    username: row.handle || '',
    email: row.email_address || '',
    accountType: row.account_kind,
    staffRole: row.staff_role || null,
    accountStatus: normalizeAccountStatus(row.account_status),
    walletStatus: row.wallet_status || 'active',
    spendableCredits: spendable,
    heldCredits: held,
    totalCredits: spendable + held,
    hold: holdActive
      ? {
          credits: held,
          reason: row.frozen_reason || null,
          frozenAt: row.frozen_at || null,
          frozenUntil: row.frozen_until || null,
          overdue: Boolean(until && until.getTime() < Date.now()),
          byStaffId: row.frozen_by_staff_id || null,
          byStaffName: staffName(row.hold_staff_first, row.hold_staff_last, row.frozen_by_staff_id ? 'Staff member' : null),
          byStaffRole: row.hold_staff_role || null,
        }
      : null,
    createdAt: row.account_created_at || row.wallet_created_at || null,
    lastActivityAt: row.last_activity_at || null,
    transactionCount: row.tx_count != null ? Number(row.tx_count) : null,
  };
}

/** Last ledger activity and row count for a page of wallets (two index lookups per wallet). */
async function fetchWalletActivity(walletIds) {
  if (!walletIds.length) return new Map();
  const result = await pool.query(
    `
    SELECT wallet_id, COUNT(*)::int AS tx_count, MAX(created_at) AS last_activity_at
    FROM (
      SELECT ct.destination_wallet_id AS wallet_id, ct.created_at
      FROM credit_transactions ct
      WHERE ct.destination_wallet_id = ANY($1::uuid[])
      UNION ALL
      SELECT ct.source_wallet_id AS wallet_id, ct.created_at
      FROM credit_transactions ct
      WHERE ct.source_wallet_id = ANY($1::uuid[])
        AND ct.source_wallet_id <> ct.destination_wallet_id
    ) moves
    GROUP BY wallet_id
    `,
    [walletIds]
  );
  return new Map(result.rows.map((row) => [String(row.wallet_id), row]));
}

async function listWallets({
  search = '',
  accountType = null,
  hold = null,
  accountStatus = null,
  balance = null,
  walletId = null,
  sort = 'balance_desc',
  limit = 50,
  offset = 0,
  includeStaff = true,
} = {}) {
  const params = [];
  const where = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (!includeStaff) where.push('NOT b.is_staff');
  if (walletId) where.push(`b.wallet_id = ${add(walletId)}::uuid`);
  if (accountType) where.push(`LOWER(b.account_kind) = ${add(String(accountType).toLowerCase())}`);
  if (hold && WALLET_HOLD_SQL[hold]) where.push(WALLET_HOLD_SQL[hold]);
  if (balance && WALLET_BALANCE_SQL[balance]) where.push(WALLET_BALANCE_SQL[balance]);
  if (accountStatus) where.push(`LOWER(COALESCE(b.account_status, 'active')) LIKE ${add(`${String(accountStatus).toLowerCase().slice(0, 6)}%`)}`);
  const q = String(search || '').trim();
  if (q) {
    const p = add(`%${q}%`);
    where.push(`(
      b.display_name ILIKE ${p} OR b.handle ILIKE ${p}
      OR COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '') ILIKE ${p}
      OR COALESCE(b.email_address, '') ILIKE ${p}
      OR b.wallet_id::text ILIKE ${p}
      OR b.account_id::text ILIKE ${p}
      OR COALESCE(b.frozen_reason, '') ILIKE ${p}
    )`);
  }

  const orderBy = WALLET_SORT_SQL[sort] || WALLET_SORT_SQL.balance_desc;
  const limitParam = add(limit);
  const offsetParam = add(offset);
  const result = await pool.query(
    `
    WITH b AS (${WALLET_BASE})
    SELECT
      b.*,
      hs.first_name AS hold_staff_first,
      hs.last_name AS hold_staff_last,
      hs.role::text AS hold_staff_role,
      COUNT(*) OVER() AS total_count
    FROM b
    LEFT JOIN staff hs ON hs.staff_id = b.frozen_by_staff_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}
    LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    params
  );

  const activity = await fetchWalletActivity(result.rows.map((r) => r.wallet_id));
  return {
    items: result.rows.map((row) => mapWalletRow({ ...row, ...(activity.get(String(row.wallet_id)) || {}) })),
    total: Number(result.rows[0]?.total_count || 0),
    limit,
    offset,
  };
}

/** Distinct account statuses present on wallets, for the status filter. */
async function listWalletAccountStatuses({ includeStaff = true } = {}) {
  const result = await pool.query(
    `
    WITH b AS (${WALLET_BASE})
    SELECT DISTINCT COALESCE(b.account_status, 'Active') AS status FROM b
    ${includeStaff ? '' : 'WHERE NOT b.is_staff'}
    `
  );
  const set = new Set(result.rows.map((r) => normalizeAccountStatus(r.status)));
  return [...set].sort();
}

/** Account wallets, escrow and platform balances, and hold health. */
async function fetchSupply({ includeStaff = true } = {}) {
  const [accounts, system, concentration] = await Promise.all([
    pool.query(
      `
      WITH b AS (${WALLET_BASE})
      SELECT
        COUNT(*)::int AS wallet_count,
        COALESCE(SUM(b.balance_credits), 0)::bigint AS spendable,
        COALESCE(SUM(b.frozen_balance_credits), 0)::bigint AS held,
        COUNT(*) FILTER (WHERE b.frozen_balance_credits > 0)::int AS held_wallets,
        COUNT(*) FILTER (WHERE b.balance_credits + b.frozen_balance_credits = 0)::int AS empty_wallets,
        COUNT(*) FILTER (WHERE b.balance_credits < 0 OR b.frozen_balance_credits < 0)::int AS negative_wallets,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY b.balance_credits + b.frozen_balance_credits), 0)::float AS median_balance,
        COUNT(*) FILTER (WHERE b.frozen_balance_credits > 0 AND b.frozen_until IS NOT NULL AND b.frozen_until < NOW())::int AS overdue_holds,
        COUNT(*) FILTER (
          WHERE b.frozen_balance_credits > 0 AND b.frozen_until >= NOW() AND b.frozen_until < NOW() + INTERVAL '7 days'
        )::int AS expiring_holds,
        COUNT(*) FILTER (WHERE b.frozen_balance_credits > 0 AND b.frozen_until IS NULL)::int AS indefinite_holds,
        COUNT(*) FILTER (WHERE b.account_kind = 'User')::int AS user_wallets,
        COUNT(*) FILTER (WHERE b.account_kind = 'Team')::int AS team_wallets,
        COUNT(*) FILTER (WHERE b.account_kind = 'Staff')::int AS staff_wallets
      FROM b
      ${includeStaff ? '' : 'WHERE NOT b.is_staff'}
      `
    ),
    pool.query(`
      SELECT
        type,
        COUNT(*)::int AS wallet_count,
        COALESCE(SUM(balance_credits), 0)::bigint AS balance,
        COUNT(*) FILTER (WHERE balance_credits > 0)::int AS funded_count
      FROM wallets
      WHERE type IN ('escrow wallets', 'platform wallets')
      GROUP BY type
    `),
    pool.query(
      `
      WITH b AS (${WALLET_BASE})
      SELECT COALESCE(SUM(total), 0)::bigint AS top_ten
      FROM (
        SELECT b.balance_credits + b.frozen_balance_credits AS total
        FROM b
        ${includeStaff ? '' : 'WHERE NOT b.is_staff'}
        ORDER BY total DESC
        LIMIT 10
      ) top
      `
    ),
  ]);

  const row = accounts.rows[0] || {};
  const byType = Object.fromEntries(system.rows.map((r) => [r.type, r]));
  const spendable = Number(row.spendable || 0);
  const held = Number(row.held || 0);
  const walletCount = Number(row.wallet_count || 0);
  const circulating = spendable + held;
  return {
    walletCount,
    userWallets: Number(row.user_wallets || 0),
    teamWallets: Number(row.team_wallets || 0),
    staffWallets: Number(row.staff_wallets || 0),
    spendable,
    held,
    circulating,
    escrow: Number(byType['escrow wallets']?.balance || 0),
    fundedEscrowWallets: Number(byType['escrow wallets']?.funded_count || 0),
    platform: Number(byType['platform wallets']?.balance || 0),
    averageBalance: walletCount ? Math.round(circulating / walletCount) : 0,
    medianBalance: Math.round(Number(row.median_balance || 0)),
    emptyWallets: Number(row.empty_wallets || 0),
    negativeWallets: Number(row.negative_wallets || 0),
    topTenShare: circulating > 0 ? Number(concentration.rows[0]?.top_ten || 0) / circulating : 0,
    holds: {
      wallets: Number(row.held_wallets || 0),
      credits: held,
      overdue: Number(row.overdue_holds || 0),
      expiringSoon: Number(row.expiring_holds || 0),
      indefinite: Number(row.indefinite_holds || 0),
    },
  };
}

/**
 * Credit movement over the last `days` days, classified by wallet type so new transaction
 * types are counted without code changes: platform → member wallets is issued, member →
 * platform is collected, and signed staff adjustments are reported on their own.
 */
async function fetchFlow({ days = 30 } = {}) {
  const result = await pool.query(
    `
    WITH moves AS (
      SELECT
        ct.created_at,
        ct.type::text AS type,
        ct.status::text AS status,
        ct.amount_credits::bigint AS amount,
        ct.reference_table,
        (ct.source_wallet_id = ct.destination_wallet_id) AS is_self,
        COALESCE(sw.type, '') AS s_type,
        COALESCE(dw.type, '') AS d_type,
        (adj.metadata->>'delta')::numeric AS adj_delta
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      ${ADJUSTMENT_LATERAL}
      WHERE ct.created_at >= NOW() - make_interval(days => $1::int)
    ),
    moved AS (
      SELECT * FROM moves WHERE status IN ${MOVED_STATUSES}
    )
    SELECT
      (SELECT COUNT(*)::int FROM moves) AS total_rows,
      (SELECT COUNT(*) FILTER (WHERE status = 'Completed')::int FROM moves) AS completed_rows,
      (SELECT COUNT(*) FILTER (WHERE status = 'Pending')::int FROM moves) AS pending_rows,
      (SELECT COUNT(*) FILTER (WHERE status = 'Failed')::int FROM moves) AS failed_rows,
      (SELECT COUNT(*) FILTER (WHERE status = 'Reversed')::int FROM moves) AS reversed_rows,
      COALESCE(SUM(amount) FILTER (WHERE NOT is_self), 0)::bigint AS volume,
      COALESCE(SUM(amount) FILTER (WHERE s_type = 'platform wallets' AND d_type <> 'platform wallets' AND reference_table = 'payments'), 0)::bigint AS topups,
      COALESCE(SUM(amount) FILTER (WHERE s_type = 'platform wallets' AND d_type <> 'platform wallets' AND COALESCE(reference_table, '') <> 'payments'), 0)::bigint AS platform_payouts,
      COALESCE(SUM(adj_delta) FILTER (WHERE is_self AND adj_delta > 0), 0)::bigint AS grants,
      COALESCE(-SUM(adj_delta) FILTER (WHERE is_self AND adj_delta < 0), 0)::bigint AS deductions,
      COUNT(*) FILTER (WHERE is_self AND type = 'Fund Transfer')::int AS adjustment_rows,
      COUNT(*) FILTER (WHERE is_self AND type = 'Fund Transfer' AND adj_delta IS NULL)::int AS unsigned_adjustments,
      COALESCE(SUM(amount) FILTER (WHERE d_type = 'platform wallets' AND s_type <> 'platform wallets' AND type IN ${FEE_TYPES}), 0)::bigint AS fees,
      COALESCE(SUM(amount) FILTER (WHERE d_type = 'platform wallets' AND s_type <> 'platform wallets' AND type = 'Cashout'), 0)::bigint AS cashouts,
      COALESCE(SUM(amount) FILTER (WHERE d_type = 'platform wallets' AND s_type <> 'platform wallets' AND type NOT IN ${FEE_TYPES} AND type <> 'Cashout'), 0)::bigint AS other_collected,
      COALESCE(SUM(amount) FILTER (WHERE d_type = 'escrow wallets' AND s_type <> 'escrow wallets'), 0)::bigint AS escrow_funded,
      COALESCE(SUM(amount) FILTER (WHERE s_type = 'escrow wallets' AND d_type <> 'escrow wallets'), 0)::bigint AS escrow_paid_out,
      COALESCE(SUM(amount) FILTER (WHERE type = 'Asset Purchase'), 0)::bigint AS marketplace,
      COALESCE(SUM(amount) FILTER (WHERE type IN ${REFUND_TYPES}), 0)::bigint AS refunds
    FROM moved
    `,
    [days]
  );

  const series = await pool.query(
    `
    WITH days AS (
      SELECT generate_series(
        (CURRENT_DATE - ($1::int - 1))::timestamp,
        CURRENT_DATE::timestamp,
        INTERVAL '1 day'
      )::date AS day
    ),
    moved AS (
      SELECT
        ct.created_at::date AS day,
        ct.amount_credits::bigint AS amount,
        (ct.source_wallet_id = ct.destination_wallet_id) AS is_self,
        COALESCE(sw.type, '') AS s_type,
        COALESCE(dw.type, '') AS d_type,
        (adj.metadata->>'delta')::numeric AS adj_delta
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      ${ADJUSTMENT_LATERAL}
      WHERE ct.created_at >= (CURRENT_DATE - ($1::int - 1))
        AND ct.status IN ${MOVED_STATUSES}
    )
    SELECT
      d.day,
      COALESCE(SUM(m.amount) FILTER (WHERE NOT m.is_self), 0)::bigint AS volume,
      COALESCE(SUM(m.amount) FILTER (WHERE m.s_type = 'platform wallets' AND m.d_type <> 'platform wallets'), 0)::bigint
        + COALESCE(SUM(m.adj_delta) FILTER (WHERE m.is_self AND m.adj_delta > 0), 0)::bigint AS issued,
      COALESCE(SUM(m.amount) FILTER (WHERE m.d_type = 'platform wallets' AND m.s_type <> 'platform wallets'), 0)::bigint
        + COALESCE(-SUM(m.adj_delta) FILTER (WHERE m.is_self AND m.adj_delta < 0), 0)::bigint AS collected,
      COUNT(m.amount)::int AS rows
    FROM days d
    LEFT JOIN moved m ON m.day = d.day
    GROUP BY d.day
    ORDER BY d.day
    `,
    [days]
  );

  const r = result.rows[0] || {};
  const n = (key) => Number(r[key] || 0);
  const issued = n('topups') + n('platform_payouts') + n('grants');
  const collected = n('fees') + n('cashouts') + n('other_collected') + n('deductions');
  return {
    days,
    rows: {
      total: n('total_rows'),
      completed: n('completed_rows'),
      pending: n('pending_rows'),
      failed: n('failed_rows'),
      reversed: n('reversed_rows'),
    },
    volume: n('volume'),
    issued: {
      total: issued,
      topups: n('topups'),
      platformPayouts: n('platform_payouts'),
      staffGrants: n('grants'),
    },
    collected: {
      total: collected,
      fees: n('fees'),
      cashouts: n('cashouts'),
      other: n('other_collected'),
      staffDeductions: n('deductions'),
    },
    net: issued - collected,
    escrowFunded: n('escrow_funded'),
    escrowPaidOut: n('escrow_paid_out'),
    marketplace: n('marketplace'),
    refunds: n('refunds'),
    adjustments: {
      rows: n('adjustment_rows'),
      unsigned: n('unsigned_adjustments'),
    },
    series: series.rows.map((row) => ({
      day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
      volume: Number(row.volume || 0),
      issued: Number(row.issued || 0),
      collected: Number(row.collected || 0),
      rows: Number(row.rows || 0),
    })),
  };
}

/** Credits that have not settled: pending ledger rows, cashouts and dispute payouts. */
async function fetchInFlight() {
  const [ledger, cashouts, payouts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_credits), 0)::bigint AS credits,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '24 hours')::int AS stale_count,
        MIN(created_at) AS oldest_at,
        (SELECT COUNT(*)::int FROM credit_transactions
          WHERE status = 'Failed' AND created_at >= NOW() - INTERVAL '7 days') AS failed_week
      FROM credit_transactions
      WHERE status = 'Pending'
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_credits), 0)::bigint AS credits,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '24 hours')::int AS stale_count,
        MIN(created_at) AS oldest_at,
        (SELECT COUNT(*)::int FROM cashouts
          WHERE UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED')
            AND created_at >= NOW() - INTERVAL '7 days') AS failed_week
      FROM cashouts
      WHERE UPPER(status) IN ('PENDING', 'PROCESSING', 'ACCEPTED', 'REQUESTED')
    `).catch(() => ({ rows: [{}] })),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled_count,
        COALESCE(SUM(amount_credits) FILTER (WHERE status = 'scheduled'), 0)::bigint AS scheduled_credits,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
        COALESCE(SUM(amount_credits) FILTER (WHERE status = 'failed'), 0)::bigint AS failed_credits,
        MIN(release_at) FILTER (WHERE status = 'scheduled') AS next_release_at
      FROM dispute_payouts
      WHERE status IN ('scheduled', 'failed')
    `).catch(() => ({ rows: [{}] })),
  ]);
  const l = ledger.rows[0] || {};
  const c = cashouts.rows[0] || {};
  const p = payouts.rows[0] || {};
  return {
    pendingLedger: {
      count: Number(l.count || 0),
      credits: Number(l.credits || 0),
      stale: Number(l.stale_count || 0),
      oldestAt: l.oldest_at || null,
      failedThisWeek: Number(l.failed_week || 0),
    },
    cashouts: {
      count: Number(c.count || 0),
      credits: Number(c.credits || 0),
      stale: Number(c.stale_count || 0),
      oldestAt: c.oldest_at || null,
      failedThisWeek: Number(c.failed_week || 0),
    },
    disputePayouts: {
      scheduled: Number(p.scheduled_count || 0),
      scheduledCredits: Number(p.scheduled_credits || 0),
      failed: Number(p.failed_count || 0),
      failedCredits: Number(p.failed_credits || 0),
      nextReleaseAt: p.next_release_at || null,
    },
  };
}

function mapAccountTotal(row) {
  return {
    accountId: row.account_id,
    walletId: row.wallet_id || null,
    name: row.display_name || row.handle || 'Unknown',
    username: row.handle || '',
    accountType: row.account_kind || 'User',
    credits: Number(row.credits || 0),
    transactions: row.tx_count != null ? Number(row.tx_count) : null,
  };
}

/**
 * Leaderboards: biggest balances, and the accounts that actually spent or earned the most
 * credits in the window (never listing prices or balances standing in for them).
 */
async function fetchLeaders({ days = 30, includeStaff = true, limit = 10 } = {}) {
  const staffFilter = includeStaff ? '' : 'AND NOT COALESCE(party.is_staff, FALSE)';
  const [holders, spenders, earners] = await Promise.all([
    pool.query(
      `
      WITH b AS (${WALLET_BASE})
      SELECT b.account_id, b.wallet_id, b.display_name, b.handle, b.account_kind,
             (b.balance_credits + b.frozen_balance_credits)::bigint AS credits, NULL::int AS tx_count
      FROM b
      ${includeStaff ? '' : 'WHERE NOT b.is_staff'}
      ORDER BY credits DESC, b.wallet_id
      LIMIT $1
      `,
      [limit]
    ),
    pool.query(
      `
      SELECT party.account_id, party.display_name, party.handle, party.account_kind,
             MIN(ct.source_wallet_id::text)::uuid AS wallet_id,
             SUM(ct.amount_credits)::bigint AS credits, COUNT(*)::int AS tx_count
      FROM credit_transactions ct
      INNER JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id AND sw.type = 'account wallets'
      ${partyLateral('party', 'ct.source_wallet_id')}
      ${partyLateral('other', 'ct.destination_wallet_id')}
      WHERE ct.created_at >= NOW() - make_interval(days => $1::int)
        AND ct.status IN ${MOVED_STATUSES}
        AND ct.source_wallet_id <> ct.destination_wallet_id
        AND ct.type::text NOT IN ('Cashout')
        AND party.account_id IS NOT NULL
        AND (other.account_id IS NULL OR other.account_id <> party.account_id OR ct.type::text = 'Escrow Hold')
        ${staffFilter}
      GROUP BY party.account_id, party.display_name, party.handle, party.account_kind
      ORDER BY credits DESC
      LIMIT $2
      `,
      [days, limit]
    ),
    pool.query(
      `
      SELECT party.account_id, party.display_name, party.handle, party.account_kind,
             MIN(ct.destination_wallet_id::text)::uuid AS wallet_id,
             SUM(ct.amount_credits)::bigint AS credits, COUNT(*)::int AS tx_count
      FROM credit_transactions ct
      INNER JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id AND dw.type = 'account wallets'
      INNER JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id AND sw.type IN ('account wallets', 'escrow wallets')
      ${partyLateral('party', 'ct.destination_wallet_id')}
      ${partyLateral('other', 'ct.source_wallet_id')}
      WHERE ct.created_at >= NOW() - make_interval(days => $1::int)
        AND ct.status IN ${MOVED_STATUSES}
        AND ct.source_wallet_id <> ct.destination_wallet_id
        AND ct.type::text NOT IN ${REFUND_TYPES}
        AND party.account_id IS NOT NULL
        AND (other.account_id IS NULL OR other.account_id <> party.account_id)
        ${staffFilter}
      GROUP BY party.account_id, party.display_name, party.handle, party.account_kind
      ORDER BY credits DESC
      LIMIT $2
      `,
      [days, limit]
    ),
  ]);
  return {
    holders: holders.rows.map(mapAccountTotal),
    spenders: spenders.rows.map(mapAccountTotal),
    earners: earners.rows.map(mapAccountTotal),
  };
}

/** Staff grants and deductions, newest first, from their audit rows. */
async function listAdjustments({ accountId = null, limit = 10, includeStaff = true, sinceHours = null } = {}) {
  const params = [];
  const where = [`aa.event_code = 'CREDITS_ADJUSTED'`];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (accountId) where.push(`aa.account_id = ${add(accountId)}::uuid`);
  if (!includeStaff) where.push('NOT EXISTS (SELECT 1 FROM staff ts WHERE ts.account_id = aa.account_id)');
  if (sinceHours) where.push(`aa.created_at >= NOW() - make_interval(hours => ${add(sinceHours)}::int)`);
  const limitParam = add(limit);
  const result = await pool.query(
    `
    SELECT
      aa.account_activity_id,
      aa.account_id,
      aa.metadata,
      aa.reference_id,
      aa.created_at,
      a.display_name,
      a.handle,
      s.staff_id AS actor_staff_id,
      s.first_name AS actor_first,
      s.last_name AS actor_last,
      s.role::text AS actor_role
    FROM account_activity aa
    LEFT JOIN accounts a ON a.account_id = aa.account_id
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    WHERE ${where.join(' AND ')}
    ORDER BY aa.created_at DESC
    LIMIT ${limitParam}
    `,
    params
  );
  return result.rows.map((row) => {
    const meta = row.metadata || {};
    return {
      id: row.account_activity_id,
      accountId: row.account_id,
      walletId: meta.walletId || null,
      name: row.display_name || row.handle || 'Unknown',
      username: row.handle || '',
      delta: Number(meta.delta || 0),
      reason: meta.reason || null,
      balanceAfter: meta.balanceAfter != null ? Number(meta.balanceAfter) : null,
      creditTransactionId: meta.creditTransactionId || row.reference_id || null,
      sourceTable: meta.sourceTable || null,
      sourceId: meta.sourceId || null,
      actorName: staffName(row.actor_first, row.actor_last, row.actor_staff_id ? 'Staff member' : 'System'),
      actorRole: row.actor_role || null,
      createdAt: row.created_at,
    };
  });
}

/** Lifetime movement, pending credits, escrow, holds and cashouts for one wallet. */
async function fetchWalletInsights({ walletId, accountId }) {
  const [moves, adjustments, escrow, payouts, holdHistory, cashouts] = await Promise.all([
    pool.query(
      `
      SELECT
        COALESCE(SUM(amount_credits) FILTER (WHERE destination_wallet_id = $1::uuid AND status IN ${MOVED_STATUSES}), 0)::bigint AS credits_in,
        COALESCE(SUM(amount_credits) FILTER (WHERE source_wallet_id = $1::uuid AND status IN ${MOVED_STATUSES}), 0)::bigint AS credits_out,
        COALESCE(SUM(amount_credits) FILTER (WHERE destination_wallet_id = $1::uuid AND status = 'Pending'), 0)::bigint AS pending_in,
        COALESCE(SUM(amount_credits) FILTER (WHERE source_wallet_id = $1::uuid AND status = 'Pending'), 0)::bigint AS pending_out,
        COUNT(*)::int AS tx_count,
        MIN(created_at) AS first_at,
        MAX(created_at) AS last_at
      FROM credit_transactions
      WHERE (source_wallet_id = $1::uuid OR destination_wallet_id = $1::uuid)
        AND source_wallet_id <> destination_wallet_id
      `,
      [walletId]
    ),
    pool.query(
      `
      SELECT
        COUNT(*)::int AS self_rows,
        COUNT(adj.metadata)::int AS signed_rows,
        COALESCE(SUM((adj.metadata->>'delta')::numeric) FILTER (WHERE (adj.metadata->>'delta')::numeric > 0), 0)::bigint AS granted,
        COALESCE(-SUM((adj.metadata->>'delta')::numeric) FILTER (WHERE (adj.metadata->>'delta')::numeric < 0), 0)::bigint AS deducted,
        MAX(ct.created_at) AS last_at
      FROM credit_transactions ct
      ${ADJUSTMENT_LATERAL}
      WHERE ct.source_wallet_id = $1::uuid
        AND ct.destination_wallet_id = $1::uuid
        AND ct.type::text = 'Fund Transfer'
        AND ct.status IN ${MOVED_STATUSES}
      `,
      [walletId]
    ),
    pool.query(
      `
      SELECT COUNT(*)::int AS wallets, COALESCE(SUM(w.balance_credits), 0)::bigint AS credits
      FROM account_wallets aw
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'escrow wallets'
      WHERE aw.account_id = $1::uuid AND w.balance_credits > 0
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
        COALESCE(SUM(amount_credits) FILTER (WHERE status = 'scheduled'), 0)::bigint AS scheduled_credits,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        MIN(release_at) FILTER (WHERE status = 'scheduled') AS next_release_at
      FROM dispute_payouts
      WHERE recipient_account_id = $1::uuid AND status IN ('scheduled', 'failed')
      `,
      [accountId]
    ).catch(() => ({ rows: [{}] })),
    pool.query(
      `
      SELECT aa.account_activity_id, aa.event_code, aa.action, aa.metadata, aa.created_at,
             s.first_name, s.last_name, s.role::text AS role, aa.actor_staff_id
      FROM account_activity aa
      LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
      WHERE aa.account_id = $1::uuid
        AND aa.event_code IN ('CREDITS_FROZEN', 'CREDITS_UNFROZEN')
      ORDER BY aa.created_at DESC
      LIMIT 10
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT c.cashout_id, c.reference_id, c.amount_credits, c.status, c.created_at, c.xendit_channel_code
      FROM cashouts c
      INNER JOIN users u ON u.user_id = c.user_id
      WHERE u.account_id = $1::uuid
      ORDER BY c.created_at DESC
      LIMIT 5
      `,
      [accountId]
    ).catch(() => ({ rows: [] })),
  ]);

  const m = moves.rows[0] || {};
  const a = adjustments.rows[0] || {};
  const e = escrow.rows[0] || {};
  const p = payouts.rows[0] || {};
  const creditsIn = Number(m.credits_in || 0);
  const creditsOut = Number(m.credits_out || 0);
  const granted = Number(a.granted || 0);
  const deducted = Number(a.deducted || 0);
  const unsigned = Number(a.self_rows || 0) - Number(a.signed_rows || 0);
  return {
    creditsIn,
    creditsOut,
    pendingIn: Number(m.pending_in || 0),
    pendingOut: Number(m.pending_out || 0),
    transactionCount: Number(m.tx_count || 0) + Number(a.self_rows || 0),
    firstActivityAt: m.first_at || null,
    lastActivityAt:
      [m.last_at, a.last_at]
        .filter(Boolean)
        .sort((x, y) => new Date(x).getTime() - new Date(y).getTime())
        .pop() || null,
    staffGranted: granted,
    staffDeducted: deducted,
    unsignedAdjustments: unsigned,
    ledgerNet: creditsIn - creditsOut + granted - deducted,
    escrow: { wallets: Number(e.wallets || 0), credits: Number(e.credits || 0) },
    disputePayouts: {
      scheduled: Number(p.scheduled || 0),
      scheduledCredits: Number(p.scheduled_credits || 0),
      failed: Number(p.failed || 0),
      nextReleaseAt: p.next_release_at || null,
    },
    holdHistory: holdHistory.rows.map((row) => ({
      id: row.account_activity_id,
      kind: row.event_code === 'CREDITS_FROZEN' ? 'hold' : 'release',
      action: row.action,
      credits: Number(row.metadata?.amount || 0),
      reason: row.metadata?.reason || null,
      until: row.metadata?.frozenUntil || null,
      source: row.metadata?.source || null,
      actorName: staffName(row.first_name, row.last_name, row.actor_staff_id ? 'Staff member' : 'System'),
      actorRole: row.role || null,
      createdAt: row.created_at,
    })),
    cashouts: cashouts.rows.map((row) => ({
      id: row.cashout_id,
      referenceId: row.reference_id,
      credits: Number(row.amount_credits || 0),
      status: row.status,
      channel: row.xendit_channel_code || null,
      createdAt: row.created_at,
    })),
  };
}

async function loadEconomySettings() {
  try {
    return (await getSectionValue('economy')) || DEFAULT_SETTINGS.economy;
  } catch {
    return DEFAULT_SETTINGS.economy;
  }
}

module.exports = {
  listLedger,
  listWallets,
  listWalletAccountStatuses,
  fetchSupply,
  fetchFlow,
  fetchInFlight,
  fetchLeaders,
  listAdjustments,
  fetchWalletInsights,
  loadEconomySettings,
};
