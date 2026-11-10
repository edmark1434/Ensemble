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
} = require('../repositories/DisputeFinancialRepositories');

function requireNotes(resolutionNotes) {
  const notes = String(resolutionNotes || '').trim();
  if (notes.length < 8) {
    throw domainError('Resolution notes must be at least 8 characters.', 400);
  }
  return notes;
}

function parseNonNegInt(value, field) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw domainError(`${field} must be a non-negative integer.`, 400);
  }
  return num;
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

async function applyFinancialResolution(disputeId, body, staffSession) {
  const action = String(body?.action || '').trim().toLowerCase();
  const notes = requireNotes(body?.resolutionNotes ?? body?.resolution_notes);
  const { staff } = await assertCanAct(disputeId, staffSession);
  const staffId = staff.staff_id;

  let result;
  if (action === 'settle_escrow') {
    const clientCredits = parseNonNegInt(
      body?.clientCredits ?? body?.client_credits ?? 0,
      'clientCredits'
    );
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
    });
  } else if (action === 'reverse_transaction') {
    const creditTransactionId =
      body?.creditTransactionId || body?.credit_transaction_id || null;
    if (!creditTransactionId) {
      throw domainError('creditTransactionId is required.', 400);
    }
    const amountRaw = body?.amount;
    const amount =
      amountRaw == null || amountRaw === ''
        ? null
        : parseNonNegInt(amountRaw, 'amount');
    if (amount === 0) {
      throw domainError('amount must be at least 1 when provided.', 400);
    }
    result = await reverseTransaction({
      disputeId,
      staffId,
      creditTransactionId,
      amount,
      resolutionNotes: notes,
    });
  } else {
    throw domainError(
      'action must be settle_escrow or reverse_transaction.',
      400
    );
  }

  // Settling or reversing auto-closes the case, so both parties' views must hear about it.
  const { emitDisputeState } = require('../repositories/DisputeChatRepositories');
  await emitDisputeState(disputeId);

  const detail = await getDisputeDetail(disputeId, staffSession);
  return { ...detail, financialResult: result };
}

module.exports = {
  applyFinancialResolution,
};
