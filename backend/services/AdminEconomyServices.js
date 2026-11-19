const repo = require('../repositories/AdminEconomyRepositories');
const { CREDIT_TRANSACTION_TYPES, CREDIT_TRANSACTION_STATUSES } = require('../lib/CreditTransactionEnums');
const { STAFF_ROLE } = require('../lib/StaffEnums');

/**
 * Credits & Economy desk. Admin sees every wallet; Support Moderator (the only moderator
 * role allowed to adjust or hold credits) sees member and team wallets but never staff
 * wallets or ledger rows that touch one.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FLOW_DAYS = 30;
const LARGE_ADJUSTMENT = 10000;

const LEDGER_KINDS = [
  'adjustment',
  'grant',
  'deduction',
  'adjustment_unrecorded',
  'topup',
  'transfer',
  'escrow',
  'marketplace',
  'cashout',
  'cashout_open',
  'fees',
  'jobs',
  'dispute',
  'refunds',
  'reversal',
  'platform',
  'escrow_open',
  // The overview's credit-flow figures (same predicates as `fetchFlow`).
  'flow_volume',
  'flow_topups',
  'flow_platform_refunds',
  'flow_platform_payouts',
  'flow_fees',
  'flow_cashouts',
  'flow_other_collected',
  'flow_escrow_funded',
  'flow_escrow_released',
  'flow_escrow_refunded',
  'flow_transfers',
  'flow_sales',
  'flow_sale_refunds',
];
/** `settled` = Completed or Reversed: credits that actually moved, as the overview counts. */
const LEDGER_STATUSES = [...CREDIT_TRANSACTION_STATUSES, 'settled'];
const LEDGER_SORTS = ['newest', 'oldest', 'amount_desc', 'amount_asc'];
const MAX_WINDOW_HOURS = 24 * 3660;
const WALLET_SORTS = ['balance_desc', 'balance_asc', 'held_desc', 'hold_ending', 'name', 'newest'];
const WALLET_HOLDS = ['held', 'not_held', 'overdue', 'expiring', 'indefinite'];
const WALLET_BALANCES = ['empty', 'positive', 'negative'];
const ACCOUNT_TYPES = ['user', 'team', 'staff'];
/** Any status label the wallet list can show (the five usual ones, or a raw one). */
const ACCOUNT_STATUS_RE = /^[a-z][a-z _-]{0,39}$/i;
const REFERENCE_TABLE_RE = /^[a-z][a-z0-9_]{0,63}$/;
/** Linked rows shown per group in an entry's detail; the rest open in the ledger. */
const LINKED_LIMIT = 25;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

/** What the signed-in staff member may see and do on this desk. */
function economyScope(session) {
  const role = session?.role || null;
  const isAdmin = role === STAFF_ROLE.ADMIN;
  const allowed = isAdmin || role === STAFF_ROLE.SUPPORT_MODERATOR;
  return {
    role,
    isAdmin,
    includeStaff: isAdmin,
    canAdjust: allowed,
    canHold: allowed,
    canSeeStaffWallets: isAdmin,
    canOpenSettings: isAdmin,
  };
}

function pickEnum(value, allowed, label) {
  if (value == null || value === '' || value === 'all') return null;
  const match = allowed.find((option) => option.toLowerCase() === String(value).toLowerCase());
  if (!match) throw badRequest(`Unknown ${label}`);
  return match;
}

function pickInt(value, { min, max, fallback, label }) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${label} must be a whole number from ${min} to ${max}`);
  }
  return n;
}

function pickUuid(value, label) {
  if (value == null || value === '') return null;
  if (!UUID_RE.test(String(value))) throw badRequest(`${label} is not a valid id`);
  return String(value);
}

function pickDate(value, label) {
  if (value == null || value === '') return null;
  const text = String(value);
  if (!DATE_RE.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw badRequest(`${label} must be a date (YYYY-MM-DD)`);
  }
  return text;
}

function pickSearch(value) {
  return String(value || '').trim().slice(0, 120);
}

function pickAccountStatus(value) {
  if (value == null || value === '' || value === 'all') return null;
  const text = String(value).trim();
  if (!ACCOUNT_STATUS_RE.test(text)) throw badRequest('Unknown account status');
  return text.toLowerCase();
}

function pickReferenceTable(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!REFERENCE_TABLE_RE.test(text)) throw badRequest('Unknown reference type');
  return text;
}

function parseLedgerQuery(query = {}) {
  const from = pickDate(query.from, 'From date');
  const to = pickDate(query.to, 'To date');
  if (from && to && from > to) throw badRequest('The From date must be on or before the To date');
  const minAmount = pickInt(query.minAmount, { min: 0, max: 100000000, fallback: null, label: 'Minimum amount' });
  const maxAmount = pickInt(query.maxAmount, { min: 0, max: 100000000, fallback: null, label: 'Maximum amount' });
  if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
    throw badRequest('The minimum amount must not exceed the maximum');
  }
  const walletId = pickUuid(query.walletId, 'Wallet');
  const referenceId = pickUuid(query.referenceId, 'Reference');
  return {
    search: pickSearch(query.search),
    type: pickEnum(query.type, CREDIT_TRANSACTION_TYPES, 'transaction type'),
    status: pickEnum(query.status, LEDGER_STATUSES, 'transaction status'),
    kind: pickEnum(query.kind, LEDGER_KINDS, 'ledger category'),
    // In / out is relative to one wallet; without one it has no meaning.
    direction: walletId ? pickEnum(query.direction, ['in', 'out'], 'direction') : null,
    walletId,
    accountId: pickUuid(query.accountId, 'Account'),
    referenceId,
    referenceTable: referenceId ? pickReferenceTable(query.referenceTable) : null,
    disputeId: pickUuid(query.disputeId, 'Dispute'),
    contractId: pickUuid(query.contractId, 'Contract'),
    from,
    to,
    // The viewer's UTC offset, so From / To are the viewer's calendar days.
    tzOffset: pickInt(query.tzOffset, { min: -840, max: 840, fallback: null, label: 'Time zone offset' }),
    // Rolling windows ("last 24 hours", "older than 24 hours"), on the overview's clock.
    sinceHours: pickInt(query.sinceHours, { min: 1, max: MAX_WINDOW_HOURS, fallback: null, label: 'Window' }),
    olderThanHours: pickInt(query.olderThanHours, { min: 1, max: MAX_WINDOW_HOURS, fallback: null, label: 'Age' }),
    minAmount,
    maxAmount,
    sort: pickEnum(query.sort, LEDGER_SORTS, 'sort') || 'newest',
    limit: pickInt(query.limit, { min: 1, max: 100, fallback: 50, label: 'Page size' }),
    offset: pickInt(query.offset, { min: 0, max: 1000000, fallback: 0, label: 'Offset' }),
  };
}

function parseWalletQuery(query = {}, scope) {
  const accountType = pickEnum(query.accountType, ACCOUNT_TYPES, 'account type');
  if (accountType === 'staff' && !scope.includeStaff) {
    const error = new Error('Staff wallets are visible to Admin only');
    error.statusCode = 403;
    throw error;
  }
  return {
    search: pickSearch(query.search),
    accountType,
    hold: pickEnum(query.hold, WALLET_HOLDS, 'hold filter'),
    balance: pickEnum(query.balance, WALLET_BALANCES, 'balance filter'),
    accountStatus: pickAccountStatus(query.accountStatus),
    sort: pickEnum(query.sort, WALLET_SORTS, 'sort') || 'balance_desc',
    limit: pickInt(query.limit, { min: 1, max: 200, fallback: 50, label: 'Page size' }),
    offset: pickInt(query.offset, { min: 0, max: 1000000, fallback: 0, label: 'Offset' }),
  };
}

/** Each alert says what is wrong and where on the desk to look (`action`). */
function buildAlerts({ supply, flow, inFlight, recentAdjustments }) {
  const alerts = [];
  const push = (alert) => alerts.push(alert);

  if (supply.negativeWallets > 0) {
    push({
      id: 'negative-wallets',
      severity: 'error',
      title: `${supply.negativeWallets} wallet${supply.negativeWallets === 1 ? ' has' : 's have'} a negative balance`,
      detail: 'Balances should never go below zero. Investigate the ledger for these wallets.',
      action: { tab: 'wallets', filters: { balance: 'negative' } },
    });
  }
  if (inFlight.disputePayouts.failed > 0) {
    push({
      id: 'failed-dispute-payouts',
      severity: 'error',
      title: `${inFlight.disputePayouts.failed} dispute payout${inFlight.disputePayouts.failed === 1 ? '' : 's'} failed`,
      detail: `${inFlight.disputePayouts.failedCredits.toLocaleString()} credits are still locked in escrow. Retry them from the dispute desk.`,
      action: null,
    });
  }
  if (supply.holds.overdue > 0) {
    push({
      id: 'overdue-holds',
      severity: 'warning',
      title: `${supply.holds.overdue} hold${supply.holds.overdue === 1 ? ' is' : 's are'} past the release date`,
      detail: 'The release job should have returned these credits. Release them manually and check the job.',
      action: { tab: 'holds', filters: { hold: 'overdue' } },
    });
  }
  if (inFlight.pendingLedger.stale > 0) {
    push({
      id: 'stale-pending',
      severity: 'warning',
      title: `${inFlight.pendingLedger.stale} ledger entr${inFlight.pendingLedger.stale === 1 ? 'y has' : 'ies have'} been Pending for over 24 hours`,
      detail: `${inFlight.pendingLedger.credits.toLocaleString()} credits pending in total.`,
      action: { tab: 'ledger', filters: { status: 'Pending', olderThanHours: '24', sort: 'oldest' } },
    });
  }
  if (inFlight.pendingLedger.failedThisWeek > 0) {
    push({
      id: 'failed-ledger',
      severity: 'warning',
      title: `${inFlight.pendingLedger.failedThisWeek} failed transaction${inFlight.pendingLedger.failedThisWeek === 1 ? '' : 's'} in the last 7 days`,
      detail: 'Check whether members were charged or need a manual correction.',
      action: { tab: 'ledger', filters: { status: 'Failed', sinceHours: '168' } },
    });
  }
  if (inFlight.cashouts.stale > 0) {
    push({
      id: 'stale-cashouts',
      severity: 'warning',
      title: `${inFlight.cashouts.stale} cashout${inFlight.cashouts.stale === 1 ? '' : 's'} unpaid after 24 hours`,
      detail: 'The payout provider has not confirmed them yet.',
      action: { tab: 'ledger', filters: { kind: 'cashout_open', olderThanHours: '24', sort: 'oldest' } },
    });
  }
  const large = recentAdjustments.filter((a) => Math.abs(a.delta) >= LARGE_ADJUSTMENT);
  if (large.length > 0) {
    push({
      id: 'large-adjustments',
      severity: 'warning',
      title: `${large.length} staff adjustment${large.length === 1 ? '' : 's'} of ${LARGE_ADJUSTMENT.toLocaleString()}+ credits in 24 hours`,
      detail: 'Large manual changes should match a ticket or a documented reason.',
      action: {
        tab: 'ledger',
        filters: { kind: 'adjustment', minAmount: String(LARGE_ADJUSTMENT), sinceHours: '24', sort: 'amount_desc' },
      },
    });
  }
  if (supply.holds.expiringSoon > 0) {
    push({
      id: 'expiring-holds',
      severity: 'info',
      title: `${supply.holds.expiringSoon} hold${supply.holds.expiringSoon === 1 ? '' : 's'} release within 7 days`,
      detail: 'Extend them now if the investigation is still open.',
      action: { tab: 'holds', filters: { hold: 'expiring' } },
    });
  }
  if (supply.holds.indefinite > 0) {
    push({
      id: 'indefinite-holds',
      severity: 'info',
      title: `${supply.holds.indefinite} hold${supply.holds.indefinite === 1 ? ' waits' : 's wait'} for staff review`,
      detail: 'These have no end date and stay until someone releases them.',
      action: { tab: 'holds', filters: { hold: 'indefinite' } },
    });
  }
  if (flow.adjustments.unsigned > 0) {
    push({
      id: 'unsigned-adjustments',
      severity: 'info',
      title: `${flow.adjustments.unsigned} adjustment${flow.adjustments.unsigned === 1 ? '' : 's'} in the last ${FLOW_DAYS} days ${flow.adjustments.unsigned === 1 ? 'has' : 'have'} no recorded direction`,
      detail: 'Written before adjustments were audited, so it is unknown whether they granted or deducted credits.',
      action: { tab: 'ledger', filters: { kind: 'adjustment_unrecorded', status: 'settled', sinceHours: String(FLOW_DAYS * 24) } },
    });
  }
  if (supply.circulating > 0 && supply.topTenShare >= 0.5 && supply.walletCount > 20) {
    push({
      id: 'concentration',
      severity: 'info',
      title: `Top 10 wallets hold ${Math.round(supply.topTenShare * 100)}% of all credits`,
      detail: 'Check the largest balances for unusual inflows.',
      action: { tab: 'wallets', filters: { sort: 'balance_desc' } },
    });
  }
  if (!alerts.length) {
    push({
      id: 'ok',
      severity: 'success',
      title: 'Nothing needs attention',
      detail: 'No negative balances, stuck transactions, overdue holds, or failed payouts.',
      action: null,
    });
  }
  return alerts;
}

async function getEconomyOverview(session) {
  const scope = economyScope(session);
  const { includeStaff } = scope;
  const [supply, flow, inFlight, leaders, adjustments, recentAdjustments, recentLedger, statuses, settings] =
    await Promise.all([
      repo.fetchSupply({ includeStaff }),
      repo.fetchFlow({ days: FLOW_DAYS, includeStaff }),
      repo.fetchInFlight({ includeStaff }),
      repo.fetchLeaders({ days: FLOW_DAYS, includeStaff }),
      repo.listAdjustments({ limit: 8, includeStaff }),
      repo.listAdjustments({ limit: 50, includeStaff, sinceHours: 24 }),
      repo.listLedger({ limit: 8, includeStaff }),
      repo.listWalletAccountStatuses({ includeStaff }),
      repo.loadEconomySettings(),
    ]);

  const creditValuePhp = Number(settings?.creditValuePhp) > 0 ? Number(settings.creditValuePhp) : null;
  return {
    lastUpdated: new Date().toISOString(),
    viewer: scope,
    creditValuePhp,
    supply,
    flow,
    inFlight,
    leaders,
    recentAdjustments: adjustments,
    recentLedger: recentLedger.items,
    facets: {
      accountStatuses: statuses,
      transactionTypes: CREDIT_TRANSACTION_TYPES,
      transactionStatuses: CREDIT_TRANSACTION_STATUSES,
      ledgerKinds: LEDGER_KINDS,
    },
    alerts: buildAlerts({ supply, flow, inFlight, recentAdjustments }),
  };
}

async function listEconomyWallets(session, query) {
  const scope = economyScope(session);
  const filters = parseWalletQuery(query, scope);
  return repo.listWallets({ ...filters, includeStaff: scope.includeStaff });
}

async function listEconomyLedger(session, query) {
  const scope = economyScope(session);
  const filters = parseLedgerQuery(query);
  return repo.listLedger({ ...filters, includeStaff: scope.includeStaff });
}

/**
 * One ledger entry with everything it is tied to, so staff never search for the other side:
 * - `links`: the rows it points at or that point at it (its platform fee, the sale a fee was
 *   charged on, the row it reverses, the row that reversed it);
 * - `groups`: the rest of the same story, each one a ledger filter (the contract's escrow,
 *   the same reference, the same dispute). `filters` opens the full list in the ledger with
 *   the same scope, so the counts match. Each group includes the entry itself.
 * Support never sees a row that touches a staff wallet, here or in the ledger.
 */
async function getEconomyLedgerEntry(session, transactionId) {
  const scope = economyScope(session);
  const id = pickUuid(transactionId, 'Transaction');
  if (!id) throw badRequest('Transaction ID is required');
  const visible = (e) => scope.includeStaff || !(e.source.isStaff || e.destination.isStaff);

  const [entry] = await repo.fetchLedgerEntriesByIds([id]);
  // Support gets the same 404 for staff rows as for missing ones.
  if (!entry || !visible(entry)) throw notFound('Ledger entry not found');

  const direct = [
    entry.fee && { relation: 'fee', id: entry.fee.id },
    entry.feeFor && { relation: 'fee_for', id: entry.feeFor.id },
    entry.reverses && { relation: 'reverses', id: entry.reverses.id },
    entry.reversedBy && { relation: 'reversed_by', id: entry.reversedBy.id },
  ].filter(Boolean);

  const groupDefs = [];
  const escrow = [entry.source, entry.destination].find((p) => p.walletType === 'Escrow' && p.walletId);
  if (escrow) {
    groupDefs.push({
      relation: 'same_escrow',
      filters: escrow.contractId ? { contractId: escrow.contractId } : { walletId: escrow.walletId },
    });
  }
  if (entry.referenceId && entry.referenceTable && !(escrow?.contractId && entry.referenceId === escrow.contractId)) {
    groupDefs.push({
      relation: 'same_reference',
      filters: { referenceId: entry.referenceId, referenceTable: entry.referenceTable },
    });
  }
  if (entry.relatedDisputeId) {
    groupDefs.push({ relation: 'same_dispute', filters: { disputeId: entry.relatedDisputeId } });
  }

  const [linked, ...pages] = await Promise.all([
    repo.fetchLedgerEntriesByIds(direct.map((d) => d.id)),
    ...groupDefs.map((g) =>
      repo.listLedger({ ...g.filters, sort: 'oldest', limit: LINKED_LIMIT, offset: 0, includeStaff: scope.includeStaff })
    ),
  ]);
  const byId = new Map(linked.filter(visible).map((e) => [String(e.id), e]));

  return {
    entry,
    links: direct
      .map((d) => ({ relation: d.relation, entry: byId.get(String(d.id)) || null }))
      .filter((l) => l.entry),
    groups: groupDefs.map((g, i) => ({
      relation: g.relation,
      filters: { ...g.filters, sort: 'oldest' },
      total: pages[i].total,
      items: pages[i].items,
    })),
    viewer: scope,
  };
}

async function getEconomyWalletDetail(session, walletId) {
  const scope = economyScope(session);
  const id = pickUuid(walletId, 'Wallet');
  if (!id) throw badRequest('Wallet ID is required');
  const page = await repo.listWallets({ walletId: id, limit: 1, offset: 0, includeStaff: scope.includeStaff });
  const wallet = page.items[0];
  // Support gets the same 404 for staff wallets as for missing ones.
  if (!wallet) throw notFound('Wallet not found');

  const [insights, adjustments] = await Promise.all([
    repo.fetchWalletInsights({ walletId: wallet.walletId, accountId: wallet.accountId }),
    repo.listAdjustments({ accountId: wallet.accountId, limit: 10, includeStaff: scope.includeStaff }),
  ]);
  return {
    wallet,
    insights: {
      ...insights,
      // Positive: the balance holds more than the ledger explains (seeded or pre-ledger credits).
      unexplainedCredits: wallet.totalCredits - insights.ledgerNet,
    },
    adjustments,
    viewer: scope,
  };
}

module.exports = {
  economyScope,
  getEconomyOverview,
  listEconomyWallets,
  listEconomyLedger,
  getEconomyLedgerEntry,
  getEconomyWalletDetail,
};
