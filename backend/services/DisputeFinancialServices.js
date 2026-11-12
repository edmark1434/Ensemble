const {
  resolveDisputeStaffId,
  buildDisputePermissions,
  loadDisputeRow,
  getDisputeDetail,
} = require('../repositories/AdminTicketsRepositories');
const {
  domainError,
  settleEscrow,
  reverseTransaction,
  releaseDisputePayouts,
  rescheduleDisputePayouts,
  cancelDisputePayouts,
  releaseDuePayouts,
  loadAccountLabels,
} = require('../repositories/DisputeFinancialRepositories');
const {
  emitDisputeState,
  postDisputeSystemMessage,
  notifyDisputeAccount,
  notifyDisputeHandler,
} = require('../repositories/DisputeChatRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const {
  buildDisputeSettlementMessage,
  buildDisputeReversalMessage,
  buildDisputePayoutUpdateMessage,
  formatPayoutDate,
  DISPUTE_PAYOUT_DEFAULT_DAYS,
  DISPUTE_PAYOUT_MAX_DAYS,
} = require('../lib/DisputeResolutions');

const DAY_MS = 24 * 60 * 60 * 1000;

function requireNotes(resolutionNotes, label = 'Resolution notes') {
  const notes = String(resolutionNotes || '').trim();
  if (notes.length < 8) {
    throw domainError(`${label} must be at least 8 characters.`, 400);
  }
  if (notes.length > 2000) throw domainError(`${label} are too long.`, 400);
  return notes;
}

function parseNonNegInt(value, field) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw domainError(`${field} must be a non-negative integer.`, 400);
  }
  return num;
}

/**
 * When a ruling's credits are paid. Default: 7 days from now. `releaseMode: "now"` pays at
 * once; otherwise `releaseAt` (ISO date) picks a date between now and 90 days ahead.
 */
function parseReleaseTiming(body, { allowNow = true } = {}) {
  const mode = String(body?.releaseMode ?? body?.release_mode ?? 'scheduled').toLowerCase().trim();
  if (mode === 'now' || mode === 'immediate') {
    if (!allowNow) throw domainError('Use Pay now to release the payout immediately.', 400);
    return { immediate: true, releaseAt: null };
  }
  if (!['scheduled', 'default', 'date', ''].includes(mode)) {
    throw domainError('releaseMode must be now or scheduled.', 400);
  }
  const raw = body?.releaseAt ?? body?.release_at;
  const now = Date.now();
  const releaseAt =
    raw == null || raw === '' ? new Date(now + DISPUTE_PAYOUT_DEFAULT_DAYS * DAY_MS) : new Date(raw);
  if (Number.isNaN(releaseAt.getTime())) throw domainError('Pick a valid payout date.', 400);
  if (releaseAt.getTime() <= now + 60 * 1000) {
    throw domainError('Pick a payout date in the future, or choose Pay now.', 400);
  }
  if (releaseAt.getTime() > now + DISPUTE_PAYOUT_MAX_DAYS * DAY_MS) {
    throw domainError(`Payouts can be scheduled up to ${DISPUTE_PAYOUT_MAX_DAYS} days ahead.`, 400);
  }
  return { immediate: false, releaseAt };
}

async function assertCanAct(disputeId, staffSession) {
  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) {
    throw domainError('Could not match your login to a staff profile.', 403);
  }
  const row = await loadDisputeRow(disputeId);
  if (!row) throw domainError('Dispute not found', 404);
  const permissions = buildDisputePermissions(row, staff, staffSession);
  if (!permissions.canAct) {
    throw domainError(
      'Only Admin or the assigned Support handler can settle or reverse money on this dispute.',
      403
    );
  }
  return { staff, row, permissions };
}

/**
 * Where a party's notification should open: the public page, or their dispute list. On a
 * private case the disputee sees the outcome there only while a money ruling stands, so a
 * withdrawn ruling sends them to their wallet history instead.
 */
function memberPath(row, accountId, { rulingStands = true } = {}) {
  if (row.visibility) return `/disputes/${row.dispute_id}`;
  if (String(row.by_account_id) === String(accountId)) return '/contracts/disputes';
  if (String(row.for_account_id) === String(accountId) && rulingStands) return '/contracts/disputes';
  return '/transactions';
}

/** A hidden case is readable only by its filer, so rulings go to them; otherwise both parties. */
function rulingAudience(row) {
  return row.visibility ? 'parties' : 'disputer';
}

async function postRuling(row, body) {
  try {
    await postDisputeSystemMessage(row, body, { audience: rulingAudience(row) });
  } catch (err) {
    console.error('Dispute ruling saved without a discussion message:', err.message);
  }
}

function amountLabel(amount) {
  return `${Number(amount || 0).toLocaleString('en-US')} credit${Number(amount) === 1 ? '' : 's'}`;
}

function sumByRecipient(payouts) {
  const totals = new Map();
  for (const payout of payouts || []) {
    const key = String(payout.recipient_account_id || '');
    if (!key) continue;
    totals.set(key, (totals.get(key) || 0) + Number(payout.amount_credits || 0));
  }
  return totals;
}

function payoutLines(payouts, labels) {
  return [...sumByRecipient(payouts).entries()].map(
    ([accountId, amount]) => `${labels.get(accountId) || 'A member'} receives ${amountLabel(amount)}.`
  );
}

async function announceSettlement(row, result, notes) {
  const clientId = result.payouts.find((p) => p.recipient_role === 'client')?.recipient_account_id;
  const freelancerId = result.payouts.find((p) => p.recipient_role === 'freelancer')?.recipient_account_id;
  const labels = await loadAccountLabels([clientId, freelancerId, row.by_account_id, row.for_account_id]);
  const releaseAt = result.releaseAt;
  await postRuling(
    row,
    buildDisputeSettlementMessage({
      client: labels.get(String(clientId)) || 'The client',
      freelancer: labels.get(String(freelancerId)) || 'The freelancer',
      clientCredits: result.clientCredits,
      freelancerCredits: result.freelancerCredits,
      immediate: result.immediate,
      releaseAt,
      notes,
      disputeNumber: row.dispute_number || null,
    })
  );

  const number = row.dispute_number || 'your dispute';
  const totals = sumByRecipient(result.payouts);
  const recipients = new Set([row.by_account_id, row.for_account_id, clientId, freelancerId].filter(Boolean).map(String));
  for (const accountId of recipients) {
    const amount = totals.get(accountId) || 0;
    const message = amount
      ? result.immediate
        ? `Dispute ${number} is settled. ${amountLabel(amount)} have been paid to your Account Wallet.`
        : `Dispute ${number} is settled. ${amountLabel(amount)} will be paid to your Account Wallet on ${formatPayoutDate(releaseAt)}.`
      : `Dispute ${number} is settled. The escrow on the contract goes to the other party${
          result.immediate ? '.' : ` on ${formatPayoutDate(releaseAt)}.`
        }`;
    await notifyDisputeAccount(accountId, row.dispute_id, { message, path: memberPath(row, accountId) });
  }
}

async function announceReversal(row, result, notes) {
  const labels = await loadAccountLabels([result.fromAccountId, result.recipientAccountId]);
  const to = labels.get(String(result.recipientAccountId)) || 'the original sender';
  const from = result.fromAccountId ? labels.get(String(result.fromAccountId)) : null;
  const transactionLabel = String(result.reversedTransactionType || 'transaction').toLowerCase();
  await postRuling(
    row,
    buildDisputeReversalMessage({
      from,
      to,
      amount: result.amount,
      transactionLabel,
      immediate: result.immediate,
      releaseAt: result.releaseAt,
      notes,
      disputeNumber: row.dispute_number || null,
    })
  );
  const number = row.dispute_number || 'your dispute';
  if (result.fromAccountId) {
    await notifyDisputeAccount(result.fromAccountId, row.dispute_id, {
      message: `Dispute ${number}: staff took back ${amountLabel(result.amount)} from the ${transactionLabel} you received. They go to ${to}${
        result.immediate ? '.' : ` on ${formatPayoutDate(result.releaseAt)}.`
      }`,
      path: memberPath(row, result.fromAccountId),
    });
  }
  if (result.recipientAccountId) {
    await notifyDisputeAccount(result.recipientAccountId, row.dispute_id, {
      message: result.immediate
        ? `Dispute ${number}: ${amountLabel(result.amount)} have been paid to your Account Wallet.`
        : `Dispute ${number}: ${amountLabel(result.amount)} will be paid to your Account Wallet on ${formatPayoutDate(result.releaseAt)}.`,
      path: memberPath(row, result.recipientAccountId),
    });
  }
}

async function announcePaid(row, paid, { auto = false } = {}) {
  if (!paid?.length) return;
  const labels = await loadAccountLabels(paid.map((p) => p.recipient_account_id));
  await postRuling(
    row,
    buildDisputePayoutUpdateMessage('released', {
      lines: payoutLines(paid, labels).map((line) => line.replace(' receives ', ' received ')),
      disputeNumber: row.dispute_number || null,
    })
  );
  const number = row.dispute_number || 'your dispute';
  for (const [accountId, amount] of sumByRecipient(paid)) {
    await notifyDisputeAccount(accountId, row.dispute_id, {
      message: `${amountLabel(amount)} from dispute ${number} ${auto ? 'are now' : 'were paid early and are now'} in your Account Wallet.`,
      path: '/transactions',
    });
  }
}

async function announceRescheduled(row, payouts, releaseAt, notes) {
  const labels = await loadAccountLabels(payouts.map((p) => p.recipient_account_id));
  await postRuling(
    row,
    buildDisputePayoutUpdateMessage('rescheduled', {
      lines: payoutLines(payouts, labels),
      releaseAt,
      notes,
      disputeNumber: row.dispute_number || null,
    })
  );
  const number = row.dispute_number || 'your dispute';
  for (const [accountId, amount] of sumByRecipient(payouts)) {
    await notifyDisputeAccount(accountId, row.dispute_id, {
      message: `The payout of ${amountLabel(amount)} from dispute ${number} now lands on ${formatPayoutDate(releaseAt)}.`,
      path: memberPath(row, accountId),
    });
  }
}

async function announceCancelled(row, result, notes) {
  const labels = await loadAccountLabels(result.cancelled.map((p) => p.recipient_account_id));
  await postRuling(
    row,
    buildDisputePayoutUpdateMessage('cancelled', {
      lines: payoutLines(result.cancelled, labels).map((line) =>
        line.replace(' receives ', ' will not receive ')
      ),
      notes,
      disputeNumber: row.dispute_number || null,
    })
  );
  const number = row.dispute_number || 'your dispute';
  const recipients = new Set(
    [row.by_account_id, row.for_account_id, ...result.cancelled.map((p) => p.recipient_account_id)]
      .filter(Boolean)
      .map(String)
  );
  for (const accountId of recipients) {
    await notifyDisputeAccount(accountId, row.dispute_id, {
      message: `Staff withdrew the payout ruling on dispute ${number}. No credits were paid, and the case is being reviewed again.`,
      path: memberPath(row, accountId, { rulingStands: false }),
    });
  }
}

async function announceFailure(row, failed, error) {
  const labels = await loadAccountLabels(failed.map((p) => p.recipient_account_id));
  await postRuling(
    row,
    buildDisputePayoutUpdateMessage('failed', {
      lines: payoutLines(failed, labels).map((line) => line.replace(' receives ', ' is owed ')),
      disputeNumber: row.dispute_number || null,
    })
  );
  await notifyDisputeHandler(row, {
    message: `A payout on dispute ${row.dispute_number || ''} could not be completed: ${String(error || '').slice(0, 160)}`,
    path: `/disputes/${row.dispute_id}`,
  });
}

async function logActivity(row, staffId, eventCode, action, metadata) {
  await recordAccountActivity({
    accountId: row.by_account_id || row.for_account_id,
    action: `Dispute ${row.dispute_number || row.dispute_id}: ${action}`,
    eventCode,
    referenceTable: 'disputes',
    referencePrefix: 'DIS',
    referenceId: row.dispute_id,
    actorStaffId: staffId || null,
    metadata,
  });
}

/**
 * Staff money actions on a dispute.
 *   settle_escrow        { clientCredits, freelancerCredits, resolutionNotes, releaseMode?, releaseAt? }
 *   reverse_transaction  { creditTransactionId, amount?, resolutionNotes, releaseMode?, releaseAt? }
 *   release_payouts      pay every waiting payout now
 *   reschedule_payouts   { releaseAt, resolutionNotes? }
 *   cancel_payouts       { resolutionNotes } — case must be reopened first
 */
async function applyFinancialResolution(disputeId, body, staffSession) {
  const action = String(body?.action || '').trim().toLowerCase();
  const { staff, row } = await assertCanAct(disputeId, staffSession);
  const staffId = staff.staff_id;
  const notesInput = body?.resolutionNotes ?? body?.resolution_notes;

  let result;
  let reason = action;
  if (action === 'settle_escrow') {
    const notes = requireNotes(notesInput);
    const timing = parseReleaseTiming(body);
    const clientCredits = parseNonNegInt(body?.clientCredits ?? body?.client_credits ?? 0, 'clientCredits');
    const freelancerCredits = parseNonNegInt(
      body?.freelancerCredits ?? body?.freelancer_credits ?? 0,
      'freelancerCredits'
    );
    result = await settleEscrow({
      disputeId,
      staffId,
      clientCredits,
      freelancerCredits,
      resolutionNotes: notes,
      ...timing,
    });
    await logActivity(row, staffId, 'DISPUTE_ESCROW_SETTLED', 'escrow settled', {
      clientCredits,
      freelancerCredits,
      immediate: timing.immediate,
      releaseAt: timing.releaseAt,
    });
    await announceSettlement(row, result, notes);
  } else if (action === 'reverse_transaction') {
    const notes = requireNotes(notesInput);
    const timing = parseReleaseTiming(body);
    const creditTransactionId = body?.creditTransactionId || body?.credit_transaction_id || null;
    if (!creditTransactionId) {
      throw domainError('creditTransactionId is required.', 400);
    }
    const amountRaw = body?.amount;
    const amount = amountRaw == null || amountRaw === '' ? null : parseNonNegInt(amountRaw, 'amount');
    if (amount === 0) {
      throw domainError('amount must be at least 1 when provided.', 400);
    }
    result = await reverseTransaction({
      disputeId,
      staffId,
      creditTransactionId,
      amount,
      resolutionNotes: notes,
      ...timing,
    });
    await logActivity(row, staffId, 'DISPUTE_TRANSACTION_REVERSED', 'transaction reversed', {
      creditTransactionId,
      amount: result.amount,
      recipientRole: result.recipientRole,
      immediate: timing.immediate,
      releaseAt: timing.releaseAt,
    });
    await announceReversal(row, result, notes);
  } else if (action === 'release_payouts') {
    result = await releaseDisputePayouts({ disputeId, staffId });
    reason = 'payout_released';
    await logActivity(row, staffId, 'DISPUTE_PAYOUT_RELEASED', 'payout released early', {
      payouts: result.paid.map((p) => ({ id: p.dispute_payout_id, amount: p.amount_credits })),
    });
    await announcePaid(row, result.paid);
  } else if (action === 'reschedule_payouts') {
    const timing = parseReleaseTiming(body, { allowNow: false });
    const notes = String(notesInput || '').trim().slice(0, 2000) || null;
    result = await rescheduleDisputePayouts({ disputeId, releaseAt: timing.releaseAt });
    reason = 'payout_rescheduled';
    await logActivity(row, staffId, 'DISPUTE_PAYOUT_RESCHEDULED', 'payout date changed', {
      releaseAt: timing.releaseAt,
      note: notes,
    });
    await announceRescheduled(row, result.payouts, timing.releaseAt, notes);
  } else if (action === 'cancel_payouts') {
    const notes = requireNotes(notesInput, 'A reason');
    result = await cancelDisputePayouts({ disputeId, staffId, reason: notes });
    reason = 'payout_cancelled';
    await logActivity(row, staffId, 'DISPUTE_PAYOUT_CANCELLED', 'money ruling withdrawn', {
      payouts: result.cancelled.map((p) => ({ id: p.dispute_payout_id, amount: p.amount_credits })),
      returned: result.returned.length,
      reason: notes,
    });
    await announceCancelled(row, result, notes);
  } else {
    throw domainError(
      'action must be settle_escrow, reverse_transaction, release_payouts, reschedule_payouts or cancel_payouts.',
      400
    );
  }

  // Every money action changes what both parties and every open staff view should show.
  await emitDisputeState(disputeId, { reason });

  const detail = await getDisputeDetail(disputeId, staffSession);
  return { ...detail, financialResult: summarizeResult(result) };
}

/** Keep raw ledger rows out of the HTTP response; the detail payload has the full picture. */
function summarizeResult(result) {
  if (!result) return null;
  const { payouts, paid, cancelled, returned, ...rest } = result;
  const count = (list) => (Array.isArray(list) ? list.length : undefined);
  return {
    ...rest,
    payoutCount: count(payouts),
    paidCount: count(paid),
    cancelledCount: count(cancelled),
    returnedCount: count(returned),
  };
}

/** Background job: pay out every due ruling of a closed case and tell everyone. */
async function releaseDueDisputePayoutsServices() {
  const results = await releaseDuePayouts();
  let released = 0;
  let failed = 0;
  for (const item of results) {
    const row = await loadDisputeRow(item.disputeId);
    if (!row) continue;
    if (item.paid?.length) {
      released += item.paid.length;
      await announcePaid(row, item.paid, { auto: true });
      await emitDisputeState(item.disputeId, { reason: 'payout_released' });
    } else if (item.failed?.length) {
      failed += item.failed.length;
      // Say it once; hourly retries stay quiet until someone acts.
      if (item.firstFailure) await announceFailure(row, item.failed, item.error);
      await emitDisputeState(item.disputeId, { reason: 'payout_failed' });
    }
  }
  return { released, failed };
}

module.exports = {
  applyFinancialResolution,
  releaseDueDisputePayoutsServices,
  parseReleaseTiming,
};
