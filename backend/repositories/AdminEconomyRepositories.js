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
/** Cashouts the payout provider has not settled yet (same set as the in-flight panel). */
const OPEN_CASHOUT_STATUSES = `('PENDING', 'PROCESSING', 'ACCEPTED', 'REQUESTED')`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Start of a pasted id (the desk shows ids shortened to 8 characters). */
const ID_PREFIX_RE = /^[0-9a-f]{4}[0-9a-f-]{0,31}$/i;

/** Escape LIKE wildcards so a typed `%` or `_` matches itself. */
function escapeLike(text) {
  return String(text).replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Search text as staff type it: trimmed, without the `@` people put before a handle. */
function normalizeSearch(value) {
  return String(value || '').trim().replace(/^@+/, '').trim();
}

/**
 * Start of a calendar day in the viewer's time zone, as a wall-clock value in the
 * database session zone (the zone `created_at` was written in), so the index still applies.
 * `tzOffset` is the browser's `getTimezoneOffset()` (minutes, UTC minus local). Without it
 * the day is the database's own day.
 */
function dayStartSql(dateParam, offsetParam, plusDays = 0) {
  const day = plusDays ? `(${dateParam}::date + ${plusDays})` : `${dateParam}::date`;
  if (!offsetParam) return day;
  return `(((${day})::timestamp + make_interval(mins => ${offsetParam}::int)) AT TIME ZONE 'UTC')::timestamp`;
}

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
function partyLateral(alias, walletColumn, { escrow = true } = {}) {
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
  ) ${alias} ON TRUE${
    escrow
      ? `
  LEFT JOIN LATERAL (
    SELECT ew.contract_id FROM escrow_wallets ew WHERE ew.wallet_id = ${walletColumn} LIMIT 1
  ) ${alias}_ew ON TRUE`
      : ''
  }`;
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
    // Links in both directions, so neither side has to be searched for.
    fee: row.fee_id
      ? { id: row.fee_id, amount: Math.abs(Number(row.fee_amount || 0)), status: row.fee_status || null }
      : null,
    feeFor: row.fee_for_id
      ? { id: row.fee_for_id, type: row.fee_for_type || null, amount: Math.abs(Number(row.fee_for_amount || 0)) }
      : null,
    reverses: row.reverses_credit_transaction_id
      ? { id: row.reverses_credit_transaction_id, type: row.reverses_type || null, status: row.reverses_status || null }
      : null,
    reversedBy: row.reversed_by_id ? { id: row.reversed_by_id, status: row.reversed_by_status || null } : null,
    cashout: row.cashout_id
      ? { id: row.cashout_id, reference: row.cashout_reference || null, status: row.cashout_status || null }
      : null,
  };
}

/** Every column the desk shows for a ledger row; joined only for the rows being returned. */
const LEDGER_COLUMNS = `
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
    fee.credit_transaction_id AS fee_id,
    fee.amount_credits AS fee_amount,
    fee.status::text AS fee_status,
    fee_for.credit_transaction_id AS fee_for_id,
    fee_for.type AS fee_for_type,
    fee_for.amount_credits AS fee_for_amount,
    orig.type::text AS reverses_type,
    orig.status::text AS reverses_status,
    rev_by.credit_transaction_id AS reversed_by_id,
    rev_by.status AS reversed_by_status,
    co.cashout_id,
    co.reference_id AS cashout_reference,
    co.status AS cashout_status`;

const LEDGER_JOINS = `
  LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
  LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
  ${partyLateral('src', 'ct.source_wallet_id')}
  ${partyLateral('dst', 'ct.destination_wallet_id')}
  ${ADJUSTMENT_LATERAL}
  LEFT JOIN staff adjs ON adjs.staff_id = adj.actor_staff_id
  LEFT JOIN credit_transactions fee ON fee.credit_transaction_id = ct.fee_transaction_id
  LEFT JOIN LATERAL (
    SELECT p.credit_transaction_id, p.type::text AS type, p.amount_credits
    FROM credit_transactions p
    WHERE ct.type::text = 'Fee' AND p.fee_transaction_id = ct.credit_transaction_id
    ORDER BY p.created_at ASC
    LIMIT 1
  ) fee_for ON TRUE
  LEFT JOIN credit_transactions orig ON orig.credit_transaction_id = ct.reverses_credit_transaction_id
  LEFT JOIN LATERAL (
    SELECT r.credit_transaction_id, r.status::text AS status
    FROM credit_transactions r
    WHERE r.reverses_credit_transaction_id = ct.credit_transaction_id
    ORDER BY (r.status::text IN ('Completed', 'Pending')) DESC, r.created_at DESC
    LIMIT 1
  ) rev_by ON TRUE
  LEFT JOIN cashouts co ON ct.reference_table = 'cashouts' AND co.cashout_id = ct.reference_id`;

const ADJUSTMENT_ROW = `(ct.source_wallet_id = ct.destination_wallet_id AND ct.type::text = 'Fund Transfer')`;
const IS_SELF = '(ct.source_wallet_id = ct.destination_wallet_id)';
/** Wallet types of the two sides (`sw` / `dw` are `wallets` joined on the row's wallets). */
const S_TYPE = `COALESCE(sw.type, '')`;
const D_TYPE = `COALESCE(dw.type, '')`;
const TO_MEMBER = `${S_TYPE} = 'platform wallets' AND ${D_TYPE} <> 'platform wallets'`;
const TO_PLATFORM = `${D_TYPE} = 'platform wallets' AND ${S_TYPE} <> 'platform wallets'`;
const SETTLED = `ct.status::text IN ${MOVED_STATUSES}`;

/** True when either side is a staff member's wallet (hidden from Support Moderator). */
const STAFF_TOUCH_SQL = `EXISTS (
  SELECT 1 FROM account_wallets saw INNER JOIN staff ss ON ss.account_id = saw.account_id
  WHERE saw.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
)`;

/**
 * The overview's credit-flow figures, one predicate each. `fetchFlow` sums exactly these and
 * the ledger filters by exactly these (`kind=flow_*`), so a figure and the rows it opens
 * always agree. Together with `grant` / `deduction` below they make Issued and Collected.
 */
const FLOW_KIND_SQL = {
  flow_volume: `(NOT ${IS_SELF})`,
  // Issued: platform → member wallets.
  flow_topups: `(${TO_MEMBER} AND ct.reference_table = 'payments')`,
  flow_platform_refunds: `(${TO_MEMBER} AND COALESCE(ct.reference_table, '') <> 'payments' AND ct.type::text IN ${REFUND_TYPES})`,
  flow_platform_payouts: `(${TO_MEMBER} AND COALESCE(ct.reference_table, '') <> 'payments' AND ct.type::text NOT IN ${REFUND_TYPES})`,
  // Collected: member wallets → platform.
  flow_fees: `(${TO_PLATFORM} AND ct.type::text IN ${FEE_TYPES})`,
  flow_cashouts: `(${TO_PLATFORM} AND ct.type::text = 'Cashout')`,
  flow_other_collected: `(${TO_PLATFORM} AND ct.type::text NOT IN ${FEE_TYPES} AND ct.type::text <> 'Cashout')`,
  // Between members: member and escrow wallets only, so nothing here is also Issued or
  // Collected (a platform-paid refund is "returned by the platform", not a member refund).
  flow_escrow_funded: `(${D_TYPE} = 'escrow wallets' AND ${S_TYPE} = 'account wallets')`,
  flow_escrow_released: `(${S_TYPE} = 'escrow wallets' AND ${D_TYPE} = 'account wallets' AND ct.type::text <> 'Escrow Refund')`,
  flow_escrow_refunded: `(${S_TYPE} = 'escrow wallets' AND ${D_TYPE} = 'account wallets' AND ct.type::text = 'Escrow Refund')`,
  flow_transfers: `(${S_TYPE} = 'account wallets' AND ${D_TYPE} = 'account wallets' AND NOT ${IS_SELF} AND ct.type::text = 'Fund Transfer')`,
  flow_sales: `(${S_TYPE} = 'account wallets' AND ${D_TYPE} = 'account wallets' AND ct.type::text = 'Asset Purchase')`,
  flow_sale_refunds: `(${S_TYPE} = 'account wallets' AND ${D_TYPE} = 'account wallets' AND ct.type::text = 'Asset Refund')`,
};

const LEDGER_KIND_SQL = {
  ...FLOW_KIND_SQL,
  platform: `(${S_TYPE} = 'platform wallets' OR ${D_TYPE} = 'platform wallets')`,
  escrow_open: `(EXISTS (
    SELECT 1 FROM wallets ew
    WHERE ew.type = 'escrow wallets' AND ew.balance_credits > 0
      AND ew.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
  ))`,
  adjustment: ADJUSTMENT_ROW,
  grant: `(${ADJUSTMENT_ROW} AND (adj.metadata->>'delta')::numeric > 0)`,
  deduction: `(${ADJUSTMENT_ROW} AND (adj.metadata->>'delta')::numeric < 0)`,
  adjustment_unrecorded: `(${ADJUSTMENT_ROW} AND adj.metadata IS NULL)`,
  topup: `(ct.reference_table = 'payments')`,
  transfer: `(ct.type::text = 'Fund Transfer' AND ct.source_wallet_id <> ct.destination_wallet_id AND COALESCE(ct.reference_table, '') <> 'payments')`,
  escrow: `(ct.type::text LIKE 'Escrow%')`,
  marketplace: `(ct.type::text LIKE 'Asset%')`,
  cashout: `(ct.type::text LIKE 'Cashout%')`,
  cashout_open: `(ct.type::text = 'Cashout' AND ct.reference_table = 'cashouts' AND EXISTS (
    SELECT 1 FROM cashouts c WHERE c.cashout_id = ct.reference_id AND UPPER(c.status) IN ${OPEN_CASHOUT_STATUSES}
  ))`,
  fees: `(ct.type::text IN ${FEE_TYPES})`,
  jobs: `(ct.type::text LIKE 'Job Posting%' OR ct.type::text LIKE 'Proposal%' OR ct.type::text = 'Service Posting Fee')`,
  dispute: `(ct.related_dispute_id IS NOT NULL OR ct.reference_table = 'disputes')`,
  refunds: `(ct.type::text IN ${REFUND_TYPES})`,
  reversal: `(ct.reverses_credit_transaction_id IS NOT NULL)`,
};

/** Categories that read the adjustment audit row, and those that read wallet types. */
const ADJUSTMENT_KINDS = new Set(['grant', 'deduction', 'adjustment_unrecorded']);
const WALLET_TYPE_KINDS = new Set(
  Object.keys(LEDGER_KIND_SQL).filter((k) => LEDGER_KIND_SQL[k].includes('sw.type') || LEDGER_KIND_SQL[k].includes('dw.type'))
);

/** Wallets of a contract's escrow. */
const contractWalletsSelect = (p) => `SELECT ew.wallet_id FROM escrow_wallets ew WHERE ew.contract_id = ${p}::uuid`;
const contractWalletsSql = (p) => `(${contractWalletsSelect(p)})`;

const LEDGER_SORT_SQL = {
  newest: 'ct.created_at DESC, ct.credit_transaction_id DESC',
  oldest: 'ct.created_at ASC, ct.credit_transaction_id ASC',
  amount_desc: 'ct.amount_credits DESC, ct.created_at DESC, ct.credit_transaction_id DESC',
  amount_asc: 'ct.amount_credits ASC, ct.created_at DESC, ct.credit_transaction_id DESC',
};

/**
 * One page of the credit ledger. Filters are validated by the service; every value is
 * parameterized here.
 *
 * Two steps: the filter query joins only what the filters read (party, adjustment audit)
 * and returns one page of ids with the total; the display columns are then joined for
 * those rows alone. Before, every join ran for every matching row because of the
 * window count.
 *
 * Search: a full UUID matches any id on the row exactly (transaction, wallets, account,
 * reference, dispute, contract, fee and reversal links). Other text matches names,
 * handles, member name and email, the adjustment reason and author, the reference type,
 * a cashout reference, and the start of any id (the desk shows ids shortened).
 */
async function listLedger({
  search = '',
  type = null,
  status = null,
  kind = null,
  direction = null,
  walletId = null,
  accountId = null,
  referenceId = null,
  referenceTable = null,
  disputeId = null,
  contractId = null,
  from = null,
  to = null,
  tzOffset = null,
  sinceHours = null,
  olderThanHours = null,
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

  const q = normalizeSearch(search);
  const exactId = q && UUID_RE.test(q) ? q : null;
  const textSearch = q && !exactId ? q : null;
  const needsParties = Boolean(accountId) || Boolean(textSearch);
  const needsAdjustment = Boolean(walletId && direction) || ADJUSTMENT_KINDS.has(kind) || Boolean(textSearch);
  const needsWalletTypes = WALLET_TYPE_KINDS.has(kind);

  if (!includeStaff) where.push(`NOT ${STAFF_TOUCH_SQL}`);
  // Rolling windows, the same clock the overview and its alerts count with.
  if (sinceHours != null) where.push(`ct.created_at >= LOCALTIMESTAMP - make_interval(hours => ${add(sinceHours)}::int)`);
  if (olderThanHours != null) where.push(`ct.created_at < LOCALTIMESTAMP - make_interval(hours => ${add(olderThanHours)}::int)`);
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
  if (referenceId) {
    where.push(`ct.reference_id = ${add(referenceId)}::uuid`);
    if (referenceTable) where.push(`ct.reference_table = ${add(referenceTable)}`);
  }
  if (disputeId) {
    const p = add(disputeId);
    where.push(`(ct.related_dispute_id = ${p}::uuid OR (ct.reference_table = 'disputes' AND ct.reference_id = ${p}::uuid))`);
  }
  if (contractId) {
    const p = add(contractId);
    where.push(`(
      ct.reference_id = ${p}::uuid
      OR ct.source_wallet_id IN ${contractWalletsSql(p)}
      OR ct.destination_wallet_id IN ${contractWalletsSql(p)}
    )`);
  }
  if (type) where.push(`ct.type::text = ${add(type)}`);
  // "settled" = credits actually moved (Completed or Reversed), as the overview counts them.
  if (status === 'settled') where.push(SETTLED);
  else if (status) where.push(`ct.status::text = ${add(status)}`);
  if (kind && LEDGER_KIND_SQL[kind]) where.push(LEDGER_KIND_SQL[kind]);
  const offsetParam = (from || to) && tzOffset != null ? add(tzOffset) : null;
  if (from) where.push(`ct.created_at >= ${dayStartSql(add(from), offsetParam)}`);
  if (to) where.push(`ct.created_at < ${dayStartSql(add(to), offsetParam, 1)}`);
  if (minAmount != null) where.push(`ct.amount_credits >= ${add(minAmount)}`);
  if (maxAmount != null) where.push(`ct.amount_credits <= ${add(maxAmount)}`);

  if (exactId) {
    const p = add(exactId);
    const ownWallets = `(
      SELECT aw.wallet_id FROM account_wallets aw WHERE aw.account_id = ${p}::uuid
      UNION ALL ${contractWalletsSelect(p)}
    )`;
    where.push(`(
      ct.credit_transaction_id = ${p}::uuid
      OR ct.reference_id = ${p}::uuid
      OR ct.source_wallet_id = ${p}::uuid
      OR ct.destination_wallet_id = ${p}::uuid
      OR ct.related_dispute_id = ${p}::uuid
      OR ct.fee_transaction_id = ${p}::uuid
      OR ct.reverses_credit_transaction_id = ${p}::uuid
      OR ct.source_wallet_id IN ${ownWallets}
      OR ct.destination_wallet_id IN ${ownWallets}
    )`);
  } else if (textSearch) {
    const p = add(`%${escapeLike(textSearch)}%`);
    const idMatch = ID_PREFIX_RE.test(textSearch)
      ? (() => {
          const ip = add(`${escapeLike(textSearch.toLowerCase())}%`);
          return `
      OR ct.credit_transaction_id::text LIKE ${ip}
      OR ct.reference_id::text LIKE ${ip}
      OR ct.source_wallet_id::text LIKE ${ip}
      OR ct.destination_wallet_id::text LIKE ${ip}
      OR ct.related_dispute_id::text LIKE ${ip}`;
        })()
      : '';
    where.push(`(
      src.handle ILIKE ${p} OR src.display_name ILIKE ${p}
      OR dst.handle ILIKE ${p} OR dst.display_name ILIKE ${p}
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.account_id IN (src.account_id, dst.account_id)
          AND (CONCAT_WS(' ', u.first_name, u.last_name) ILIKE ${p} OR u.email_address ILIKE ${p})
      )
      OR COALESCE(adj.metadata->>'reason', '') ILIKE ${p}
      OR EXISTS (
        SELECT 1 FROM staff st
        WHERE st.staff_id = adj.actor_staff_id AND CONCAT_WS(' ', st.first_name, st.last_name) ILIKE ${p}
      )
      OR COALESCE(ct.reference_table, '') ILIKE ${p}
      OR (ct.reference_table = 'cashouts' AND EXISTS (
        SELECT 1 FROM cashouts c WHERE c.cashout_id = ct.reference_id AND c.reference_id ILIKE ${p}
      ))${idMatch}
    )`);
  }

  const orderBy = LEDGER_SORT_SQL[sort] || LEDGER_SORT_SQL.newest;
  const limitParam = add(limit);
  const pageOffsetParam = add(offset);
  const filterJoins = [
    needsWalletTypes ? 'LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id' : '',
    needsWalletTypes ? 'LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id' : '',
    needsParties ? partyLateral('src', 'ct.source_wallet_id', { escrow: false }) : '',
    needsParties ? partyLateral('dst', 'ct.destination_wallet_id', { escrow: false }) : '',
    needsAdjustment ? ADJUSTMENT_LATERAL : '',
  ].join('\n');

  const result = await pool.query(
    `
    WITH page AS (
      SELECT
        ct.credit_transaction_id,
        COUNT(*) OVER() AS total_count,
        SUM(ABS(ct.amount_credits)) OVER() AS total_credits,
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS rn
      FROM credit_transactions ct
      ${filterJoins}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${orderBy}
      LIMIT ${limitParam} OFFSET ${pageOffsetParam}
    )
    SELECT ${LEDGER_COLUMNS}, page.total_count, page.total_credits
    FROM page
    INNER JOIN credit_transactions ct ON ct.credit_transaction_id = page.credit_transaction_id
    ${LEDGER_JOINS}
    ORDER BY page.rn
    `,
    params
  );

  return {
    items: result.rows.map((row) => mapLedgerRow(row, { walletId, accountId })),
    total: Number(result.rows[0]?.total_count || 0),
    // Credits across every matching row, so a filtered ledger can be checked against a figure.
    totalCredits: Number(result.rows[0]?.total_credits || 0),
    limit,
    offset,
  };
}

/** Ledger rows by id (one entry and the entries it links to), oldest first. */
async function fetchLedgerEntriesByIds(ids) {
  const list = [...new Set((ids || []).filter((id) => id && UUID_RE.test(String(id))).map(String))];
  if (!list.length) return [];
  const result = await pool.query(
    `
    SELECT ${LEDGER_COLUMNS}
    FROM credit_transactions ct
    ${LEDGER_JOINS}
    WHERE ct.credit_transaction_id = ANY($1::uuid[])
    ORDER BY ct.created_at ASC, ct.credit_transaction_id ASC
    `,
    [list]
  );
  return result.rows.map((row) => mapLedgerRow(row));
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

/**
 * The same grouping as `normalizeAccountStatus`, in SQL and lower case, so the status
 * filter matches exactly the labels the status dropdown lists.
 */
const NORMALIZED_ACCOUNT_STATUS_SQL = `(CASE
  WHEN b.account_status IS NULL OR LOWER(b.account_status) = 'active' THEN 'active'
  WHEN LOWER(b.account_status) LIKE '%suspend%' THEN 'suspended'
  WHEN LOWER(b.account_status) LIKE '%ban%' THEN 'banned'
  WHEN LOWER(b.account_status) LIKE '%lock%' THEN 'locked'
  WHEN LOWER(b.account_status) LIKE '%deactiv%' THEN 'deactivated'
  ELSE LOWER(b.account_status)
END)`;

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
  if (accountStatus) where.push(`${NORMALIZED_ACCOUNT_STATUS_SQL} = ${add(String(accountStatus).toLowerCase())}`);
  const q = normalizeSearch(search);
  if (q && UUID_RE.test(q)) {
    const p = add(q);
    where.push(`(b.wallet_id = ${p}::uuid OR b.account_id = ${p}::uuid)`);
  } else if (q) {
    const p = add(`%${escapeLike(q)}%`);
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
 * Credit movement over the last `days` days (a rolling window: now minus days × 24 hours),
 * classified by wallet type so new transaction types are counted without code changes.
 *
 * Every figure is a `FLOW_KIND_SQL` / `LEDGER_KIND_SQL` predicate over settled rows
 * (Completed or Reversed), summed by amount. The ledger opened from a figure uses the same
 * predicate, status `settled` and `sinceHours`, so its entry count and credit total match.
 * Support Moderator figures leave out rows that touch a staff wallet, as its ledger does.
 */
async function fetchFlow({ days = 30, includeStaff = true } = {}) {
  const hours = days * 24;
  const staffFilter = includeStaff ? '' : `AND NOT ${STAFF_TOUCH_SQL}`;
  const sum = (predicate) => `COALESCE(SUM(ABS(ct.amount_credits)) FILTER (WHERE ${SETTLED} AND ${predicate}), 0)::bigint`;
  const K = LEDGER_KIND_SQL;
  const from = `
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      ${ADJUSTMENT_LATERAL}`;

  const [result, series] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total_rows,
        COUNT(*) FILTER (WHERE ct.status::text = 'Completed')::int AS completed_rows,
        COUNT(*) FILTER (WHERE ct.status::text = 'Pending')::int AS pending_rows,
        COUNT(*) FILTER (WHERE ct.status::text = 'Failed')::int AS failed_rows,
        COUNT(*) FILTER (WHERE ct.status::text = 'Reversed')::int AS reversed_rows,
        ${sum(K.flow_volume)} AS volume,
        ${sum(K.flow_topups)} AS topups,
        ${sum(K.flow_platform_refunds)} AS platform_refunds,
        ${sum(K.flow_platform_payouts)} AS platform_payouts,
        ${sum(K.grant)} AS grants,
        ${sum(K.flow_fees)} AS fees,
        ${sum(K.flow_cashouts)} AS cashouts,
        ${sum(K.flow_other_collected)} AS other_collected,
        ${sum(K.deduction)} AS deductions,
        ${sum(K.flow_escrow_funded)} AS escrow_funded,
        ${sum(K.flow_escrow_released)} AS escrow_released,
        ${sum(K.flow_escrow_refunded)} AS escrow_refunded,
        ${sum(K.flow_transfers)} AS transfers,
        ${sum(K.flow_sales)} AS sales,
        ${sum(K.flow_sale_refunds)} AS sale_refunds,
        COUNT(*) FILTER (WHERE ${SETTLED} AND ${K.adjustment})::int AS adjustment_rows,
        COUNT(*) FILTER (WHERE ${SETTLED} AND ${K.adjustment_unrecorded})::int AS unsigned_adjustments
      ${from}
      WHERE ct.created_at >= LOCALTIMESTAMP - make_interval(hours => $1::int)
        ${staffFilter}
      `,
      [hours]
    ),
    // Daily chart (database calendar days), from the same predicates.
    pool.query(
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
          ${sum(K.flow_volume)} AS volume,
          ${sum(`(${K.flow_topups} OR ${K.flow_platform_refunds} OR ${K.flow_platform_payouts} OR ${K.grant})`)} AS issued,
          ${sum(`(${K.flow_fees} OR ${K.flow_cashouts} OR ${K.flow_other_collected} OR ${K.deduction})`)} AS collected,
          COUNT(*) FILTER (WHERE ${SETTLED})::int AS rows
        ${from}
        WHERE ct.created_at >= (CURRENT_DATE - ($1::int - 1))
          ${staffFilter}
        GROUP BY ct.created_at::date
      )
      SELECT d.day, COALESCE(m.volume, 0) AS volume, COALESCE(m.issued, 0) AS issued,
             COALESCE(m.collected, 0) AS collected, COALESCE(m.rows, 0) AS rows
      FROM days d
      LEFT JOIN moved m ON m.day = d.day
      ORDER BY d.day
      `,
      [days]
    ),
  ]);

  const r = result.rows[0] || {};
  const n = (key) => Number(r[key] || 0);
  const issued = n('topups') + n('platform_refunds') + n('platform_payouts') + n('grants');
  const collected = n('fees') + n('cashouts') + n('other_collected') + n('deductions');
  return {
    days,
    hours,
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
      platformRefunds: n('platform_refunds'),
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
    between: {
      escrowFunded: n('escrow_funded'),
      escrowReleased: n('escrow_released'),
      escrowRefunded: n('escrow_refunded'),
      transfers: n('transfers'),
      sales: n('sales'),
      saleRefunds: n('sale_refunds'),
    },
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

/**
 * Credits that have not settled: pending ledger rows, cashouts and dispute payouts. The
 * ledger counts use the same clock and staff scope as the ledger filters they link to.
 */
async function fetchInFlight({ includeStaff = true } = {}) {
  const staffFilter = includeStaff ? '' : `AND NOT ${STAFF_TOUCH_SQL}`;
  const [ledger, cashouts, payouts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ct.status::text = 'Pending')::int AS count,
        COALESCE(SUM(ABS(ct.amount_credits)) FILTER (WHERE ct.status::text = 'Pending'), 0)::bigint AS credits,
        COUNT(*) FILTER (
          WHERE ct.status::text = 'Pending' AND ct.created_at < LOCALTIMESTAMP - INTERVAL '24 hours'
        )::int AS stale_count,
        MIN(ct.created_at) FILTER (WHERE ct.status::text = 'Pending') AS oldest_at,
        COUNT(*) FILTER (
          WHERE ct.status::text = 'Failed' AND ct.created_at >= LOCALTIMESTAMP - INTERVAL '168 hours'
        )::int AS failed_week
      FROM credit_transactions ct
      WHERE ct.status::text IN ('Pending', 'Failed')
        ${staffFilter}
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(ABS(ct.amount_credits)), 0)::bigint AS credits,
        COUNT(*) FILTER (WHERE ct.created_at < LOCALTIMESTAMP - INTERVAL '24 hours')::int AS stale_count,
        MIN(ct.created_at) AS oldest_at,
        (SELECT COUNT(*)::int FROM cashouts
          WHERE UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED')
            AND created_at >= NOW() - INTERVAL '7 days') AS failed_week
      FROM credit_transactions ct
      INNER JOIN cashouts c ON c.cashout_id = ct.reference_id
      WHERE ct.type::text = 'Cashout'
        AND ct.reference_table = 'cashouts'
        AND UPPER(c.status) IN ${OPEN_CASHOUT_STATUSES}
        ${staffFilter}
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
  fetchLedgerEntriesByIds,
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
