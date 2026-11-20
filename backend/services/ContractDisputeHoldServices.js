/**
 * ContractDisputeHoldServices.js
 *
 * What a contract does during and after a dispute.
 *
 *   Dispute open                → on hold: escrow frozen, clock stopped (deadline, auto-approve,
 *                                 reminder and auto-cancel jobs skip it).
 *   Escrow settlement ruled     → the contract ends at once (Closed / Cancelled); credits are paid
 *                                 on the ruling's date. Withdrawing the ruling restores it, on hold.
 *   Reversal ruled              → stays on hold until that payout is paid.
 *   Case closed, nothing waiting (resolve, dismiss, convict, a reversal once paid)
 *                               → both parties are asked to continue or end the contract, still
 *                                 on hold (`contract_dispute_decisions`):
 *                                   both continue         → resumes; a new dispute round starts
 *                                   either ends it        → cancelled under the cancellation rules
 *                                   nobody ends it in 72h → continues
 *   Resuming moves every clock forward by the time spent on hold.
 *
 * `syncHoldForDispute` runs after every dispute state change (from emitDisputeState, before the
 * broadcast); the reconcile job catches the rest, settles expired questions and sends reminders.
 */

const {
    syncContractDisputeHold,
    applyDecisionChoice,
    autoContinueDecision,
    listExpiredDecisions,
    claimDecisionsNeedingReminder,
    listContractsNeedingHoldSync,
    listLiveContractsWithStandingSettlement,
    getContractHoldContext,
    getDecisionDispute,
    getDisputeContractId,
    getPendingDecision,
} = require('../repositories/ContractDisputeHoldRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');
const { getIo } = require('../lib/WebSocket');
const { formatPayoutDate } = require('../lib/DisputeResolutions');

// Errors that mean a hold migration has not run yet: stay quiet until it does.
const MISSING_SCHEMA_CODES = new Set(['42703', '42P01']);

function serviceError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hour${hours === 1 ? '' : 's'}` : ''}`;
    if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const minutes = Math.max(1, Math.floor(total / 60));
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function partyIds(context) {
    return [...new Set([context.client_account_id, context.freelancer_account_id].filter(Boolean).map(String))];
}

/** "dispute DIS-123456" for someone who may see the case, else "the dispute". */
function disputeLabelFor(dispute, accountId) {
    if (!dispute?.dispute_number) return 'the dispute';
    const visible = Boolean(dispute.visibility) || String(dispute.by_account_id) === String(accountId);
    return visible ? `dispute ${dispute.dispute_number}` : 'the dispute';
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Send one notice per account (`messageFor(accountId)`), then nudge open contract views. */
async function notifyContractParties(context, { accountIds = null, referencePrefix, messageFor }) {
    const io = getIo();
    const recipients = accountIds || partyIds(context);
    for (const accountId of recipients) {
        const message = messageFor(accountId);
        if (!message) continue;
        try {
            const notification = await createNotification({
                account_id: accountId,
                message,
                is_read: false,
                reference_table: 'contracts',
                reference_prefix: referencePrefix,
                reference_path: `/contracts/${context.contract_id}`,
                reference_id: context.contract_id,
            });
            if (io && notification) io.to(String(accountId)).emit('notification', notification);
        } catch (error) {
            console.warn('Contract hold notice failed:', error.message);
        }
    }
    emitContractUpdate(context);
}

/** Open contract pages refetch on this (and on `notification`). */
function emitContractUpdate(context, extra = {}) {
    const io = getIo();
    if (!io) return;
    const rooms = [`contract_${context.contract_id}`, ...partyIds(context)];
    io.to(rooms).emit(`contract:${context.contract_id}:update`, { contractId: String(context.contract_id), ...extra });
}

/** Tell both parties what a hold sync changed. */
async function announceSyncResult(result) {
    if (!result) return;
    if (result.state === 'decision_opened') {
        const context = await getContractHoldContext(result.contractId);
        if (!context) return;
        const dispute = await getDecisionDispute(result.disputeId);
        const pending = await getPendingDecision(null, result.contractId);
        const by = pending ? formatPayoutDate(pending.decide_by) : 'the deadline';
        await notifyContractParties(context, {
            referencePrefix: 'CONTRACT_DECISION_NEEDED',
            messageFor: (accountId) =>
                `${capitalize(disputeLabelFor(dispute, accountId))} on "${context.contract_title}" is closed. Do you want to continue the contract? Choose on the contract page by ${by}. If neither of you ends it by then, it continues.`,
        });
        return;
    }
    if (result.state === 'held' && result.supersededDecisionId) {
        // The case was reopened (or a new ruling is waiting) while the parties were answering.
        const context = await getContractHoldContext(result.contractId);
        if (!context) return;
        await notifyContractParties(context, {
            referencePrefix: 'CONTRACT_DECISION_WITHDRAWN',
            messageFor: () =>
                `The question about continuing "${context.contract_title}" was withdrawn because its dispute was reopened. The contract stays on hold, and you'll be asked again once the case is decided.`,
        });
        return;
    }
    if (result.state === 'resumed' && result.pausedSeconds) {
        const context = await getContractHoldContext(result.contractId);
        if (!context) return;
        await notifyContractParties(context, {
            referencePrefix: 'CONTRACT_RESUMED',
            messageFor: () =>
                `"${context.contract_title}" is active again. Its deadlines moved forward by ${formatDuration(result.pausedSeconds)}, the time it was on hold.`,
        });
    }
}

/** Sync one contract's hold and tell both parties about any change. */
async function syncHoldForContract(contractId) {
    const result = await syncContractDisputeHold(contractId);
    await announceSyncResult(result);
    return result;
}

/**
 * Sync a contract after something outside the dispute flow changed it (e.g. the client approved
 * the last milestone while a question was pending, which completes the contract). Never throws;
 * the reconcile job retries.
 */
async function syncHoldForContractQuietly(contractId) {
    try {
        return await syncHoldForContract(contractId);
    } catch (error) {
        if (!MISSING_SCHEMA_CODES.has(error.code)) console.warn('Contract dispute hold sync failed:', error.message);
        return null;
    }
}

/**
 * Sync the hold of the contract a dispute belongs to. Never throws: a failure here must not stop
 * the dispute broadcast, and the reconcile job retries.
 */
async function syncHoldForDispute(disputeId) {
    try {
        const contractId = await getDisputeContractId(disputeId);
        if (!contractId) return null;
        return await syncHoldForContract(contractId);
    } catch (error) {
        if (!MISSING_SCHEMA_CODES.has(error.code)) console.warn('Contract dispute hold sync failed:', error.message);
        return null;
    }
}

/**
 * A party answers "continue or end this contract?" after its dispute closed.
 * `actorAccountIds`: the accounts the signed-in member may act for (personal + teams).
 * Continuing needs both parties; ending needs one.
 */
async function chooseAfterDisputeService({ contractId, actorAccountIds, personalAccountId, choice }) {
    const normalized = String(choice || '').trim().toLowerCase();
    if (!['continue', 'end'].includes(normalized)) {
        throw serviceError('choice must be "continue" or "end".', 400, 'INVALID_CHOICE');
    }
    const context = await getContractHoldContext(contractId);
    if (!context) throw serviceError('Contract not found', 404, 'CONTRACT_NOT_FOUND');

    const actors = new Set((actorAccountIds || []).map(String));
    const side = actors.has(String(context.client_account_id))
        ? 'client'
        : actors.has(String(context.freelancer_account_id))
            ? 'freelancer'
            : null;
    if (!side) throw serviceError('Only the two parties to this contract can decide.', 403, 'NOT_A_PARTY');

    const result = await applyDecisionChoice({
        contractId,
        side,
        choice: normalized,
        actorAccountId: personalAccountId,
        clientAccountId: context.client_account_id,
        freelancerAccountId: context.freelancer_account_id,
    });

    if (result.outcome === 'stale') {
        // Committed: the question is closed. Tell the member why nothing else happened.
        throw serviceError(
            result.reason === 'contract_ended'
                ? 'This contract has already ended, so there is nothing left to decide.'
                : 'The dispute on this contract was reopened, so this question was withdrawn. You will be asked again once the case is decided.',
            409,
            'DECISION_NOT_PENDING'
        );
    }

    const sideLabel = side === 'client' ? 'The client' : 'The freelancer';
    const otherId = String(side === 'client' ? context.freelancer_account_id : context.client_account_id);
    const dispute = await getDecisionDispute(result.decision?.dispute_id);

    if (result.outcome === 'ended') {
        const cancel = result.cancel || {};
        const refunded = Number(cancel.refundedCredits || 0);
        await notifyContractParties(context, {
            referencePrefix: 'CONTRACT_ENDED_AFTER_DISPUTE',
            messageFor: (accountId) => {
                const who = String(accountId) === String(otherId) ? sideLabel : 'You';
                const money = refunded > 0
                    ? ` ${refunded.toLocaleString()} credits for unfinished milestones go back to the client; approved milestones stay paid.`
                    : ' Approved milestones stay paid.';
                return `${who} ended "${context.contract_title}" after ${disputeLabelFor(dispute, accountId)}.${money}`;
            },
        });
        const io = getIo();
        if (io && refunded > 0 && cancel.newClientBalance != null) {
            io.to(String(context.client_account_id)).emit('walletBalanceUpdated', {
                balance_credits: cancel.newClientBalance,
                wallet_type: 'account wallets',
                transaction_id: cancel.transactionId,
            });
        }
        if (io) {
            io.to([`contract_${contractId}`, ...partyIds(context)]).emit('contract_status_updated', {
                contractId,
                status: cancel.contractStatus,
            });
        }
    } else if (result.outcome === 'continued') {
        const paused = formatDuration(result.resumed?.pausedSeconds);
        const withdrawn = result.resumed?.withdrawnRequests
            ? ' The cancellation request from before the dispute was withdrawn.'
            : '';
        await notifyContractParties(context, {
            referencePrefix: 'CONTRACT_RESUMED',
            messageFor: () =>
                `You both chose to continue "${context.contract_title}". It is active again, its deadlines moved forward by ${paused}, and either of you can file a new dispute if something goes wrong.${withdrawn}`,
        });
    } else {
        await notifyContractParties(context, {
            accountIds: [otherId],
            referencePrefix: 'CONTRACT_DECISION_NEEDED',
            messageFor: () =>
                `${sideLabel} wants to continue "${context.contract_title}". Choose on the contract page by ${formatPayoutDate(result.decision.decide_by)}; if you don't end it by then, it continues.`,
        });
    }

    return {
        outcome: result.outcome,
        side,
        choice: normalized,
        contractStatus: result.cancel?.contractStatus || null,
        refundedCredits: result.cancel?.refundedCredits ?? null,
        pausedSeconds: result.resumed?.pausedSeconds ?? null,
    };
}

/** Questions nobody ended in time: the contract continues. */
async function settleExpiredDecisions() {
    let continued = 0;
    for (const item of await listExpiredDecisions()) {
        try {
            const result = await autoContinueDecision(item.decision_id, item.contract_id);
            if (!result) continue;
            continued++;
            const context = await getContractHoldContext(item.contract_id);
            if (!context) continue;
            await notifyContractParties(context, {
                referencePrefix: 'CONTRACT_RESUMED',
                messageFor: () =>
                    `Nobody ended "${context.contract_title}" after its dispute, so it continues. Its deadlines moved forward by ${formatDuration(result.resumed?.pausedSeconds)}, the time it was on hold.`,
            });
        } catch (error) {
            console.error(`Continuing contract ${item.contract_id} after its dispute failed:`, error.message);
        }
    }
    return continued;
}

/** One reminder to each party who has not answered, close to the deadline. */
async function remindPendingDecisions() {
    let reminded = 0;
    for (const decision of await claimDecisionsNeedingReminder()) {
        try {
            const context = await getContractHoldContext(decision.contract_id);
            if (!context) continue;
            const waiting = [];
            if (!decision.client_choice) waiting.push(String(context.client_account_id));
            if (!decision.freelancer_choice) waiting.push(String(context.freelancer_account_id));
            if (!waiting.length) continue;
            await notifyContractParties(context, {
                accountIds: waiting,
                referencePrefix: 'CONTRACT_DECISION_REMINDER',
                messageFor: () =>
                    `Reminder: choose whether to continue "${context.contract_title}" by ${formatPayoutDate(decision.decide_by)}. If neither of you ends it by then, it continues.`,
            });
            reminded += waiting.length;
        } catch (error) {
            console.error(`Decision reminder failed for contract ${decision.contract_id}:`, error.message);
        }
    }
    return reminded;
}

/**
 * Background job (every 5 minutes):
 *  1. End live contracts whose escrow settlement ruling still stands (rulings made before a
 *     settlement ended the contract at once).
 *  2. Continue contracts whose question expired, and remind parties close to the deadline.
 *  3. Bring every contract's hold in line with its disputes (open questions, resume after a
 *     deleted case, supersede questions of reopened cases or ended contracts).
 */
async function reconcileContractDisputeHoldsServices() {
    let ended = 0;
    let synced = 0;

    const { endContractForStandingSettlement } = require('../repositories/DisputeFinancialRepositories');
    for (const item of await listLiveContractsWithStandingSettlement()) {
        let result = null;
        try {
            result = await endContractForStandingSettlement(item.contract_id, item.dispute_id);
        } catch (error) {
            console.error(`Ending settled contract ${item.contract_id} failed:`, error.message);
            continue;
        }
        if (!result || result.alreadyEnded) continue;
        ended++;
        const context = await getContractHoldContext(item.contract_id);
        const dispute = await getDecisionDispute(item.dispute_id);
        if (context) {
            await notifyContractParties(context, {
                referencePrefix: 'CONTRACT_ENDED_BY_DISPUTE',
                messageFor: (accountId) =>
                    `"${context.contract_title}" has ended under the ruling on ${disputeLabelFor(dispute, accountId)}. Its escrow is paid out as ruled, and unfinished milestones were cancelled.`,
            });
        }
    }

    const continued = await settleExpiredDecisions();
    const reminded = await remindPendingDecisions();

    for (const contractId of await listContractsNeedingHoldSync()) {
        try {
            const result = await syncHoldForContract(contractId);
            if (result && ['resumed', 'decision_opened'].includes(result.state)) synced++;
            if (result?.started || result?.supersededDecisionId) synced++;
        } catch (error) {
            console.error(`Contract dispute hold sync failed for ${contractId}:`, error.message);
        }
    }

    return { ended, synced, continued, reminded };
}

module.exports = {
    syncHoldForContract,
    syncHoldForContractQuietly,
    syncHoldForDispute,
    chooseAfterDisputeService,
    reconcileContractDisputeHoldsServices,
};
