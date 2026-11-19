/**
 * ContractDisputeHoldServices.js
 *
 * What a contract does during and after a dispute.
 *
 *   Dispute open                → contract on hold: escrow frozen, clock stopped (deadline,
 *                                 auto-approve, reminder and auto-cancel jobs skip it).
 *   Escrow settlement ruled     → contract ends at once (Closed / Cancelled); credits are paid on
 *                                 the ruling's date. Withdrawing the ruling restores it, on hold.
 *   Reversal ruled              → stays on hold until that payout is paid, then resumes.
 *   Outcome only (resolve, dismiss, convict) → resumes at once.
 *   Resuming moves every clock forward by the time spent on hold, and tells both parties.
 *
 * `syncHoldForDispute` runs after every dispute state change (from emitDisputeState, before the
 * broadcast) and the reconcile job catches anything else (e.g. a deleted case) every few minutes.
 */

const {
    syncContractDisputeHold,
    listContractsNeedingHoldSync,
    listLiveContractsWithStandingSettlement,
    getContractHoldContext,
    getDisputeContractId,
} = require('../repositories/ContractDisputeHoldRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');
const { getIo } = require('../lib/WebSocket');
const { pool } = require('../lib/Database');

function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hour${hours === 1 ? '' : 's'}` : ''}`;
    if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const minutes = Math.max(1, Math.floor(total / 60));
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

async function notifyParties(context, { message, referencePrefix }) {
    const accountIds = [...new Set([context.client_account_id, context.freelancer_account_id].filter(Boolean).map(String))];
    const io = getIo();
    for (const accountId of accountIds) {
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
            if (io && notification) io.to(accountId).emit('notification', notification);
        } catch (error) {
            console.warn('Contract hold notice failed:', error.message);
        }
    }
    // Open contract pages and workspaces refetch on this.
    if (io) {
        io.emit('milestoneStatusUpdated', {
            contract_id: String(context.contract_id),
            team_id: null,
            action: referencePrefix === 'CONTRACT_RESUMED' ? 'dispute_hold_lifted' : 'dispute_settlement_ended',
        });
    }
}

async function announceResumed(result) {
    if (result?.state !== 'resumed' || !result.pausedSeconds) return;
    const context = await getContractHoldContext(result.contractId);
    if (!context) return;
    await notifyParties(context, {
        referencePrefix: 'CONTRACT_RESUMED',
        message: `"${context.contract_title}" is active again now that its dispute is closed. Its deadlines moved forward by ${formatDuration(result.pausedSeconds)}, the time it was on hold.`,
    });
}

/** Sync one contract's hold and tell both parties if it resumed. */
async function syncHoldForContract(contractId) {
    const result = await syncContractDisputeHold(contractId);
    await announceResumed(result);
    return result;
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
        // Before migration 1829900000000 the hold column is missing; stay quiet until it runs.
        if (error.code !== '42703') console.warn('Contract dispute hold sync failed:', error.message);
        return null;
    }
}

/**
 * Background job (every 5 minutes):
 *  1. End live contracts whose escrow settlement ruling still stands (rulings made before a
 *     settlement ended the contract at once).
 *  2. Bring every live contract's hold mark in line with its disputes, resuming those whose
 *     hold lifted without a dispute event (e.g. a deleted case).
 */
async function reconcileContractDisputeHoldsServices() {
    let ended = 0;
    let synced = 0;

    const { endContractAfterSettlement } = require('../repositories/DisputeFinancialRepositories');
    const standing = await listLiveContractsWithStandingSettlement();
    for (const item of standing) {
        const client = await pool.connect();
        let result = null;
        try {
            await client.query('BEGIN');
            result = await endContractAfterSettlement(client, item.contract_id, { disputeId: item.dispute_id });
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            console.error(`Ending settled contract ${item.contract_id} failed:`, error.message);
            continue;
        } finally {
            client.release();
        }
        if (result && !result.alreadyEnded) {
            ended++;
            const context = await getContractHoldContext(item.contract_id);
            if (context) {
                await notifyParties(context, {
                    referencePrefix: 'CONTRACT_ENDED_BY_DISPUTE',
                    message: `"${context.contract_title}" has ended under the ruling on ${
                        item.dispute_number ? `dispute ${item.dispute_number}` : 'its dispute'
                    }. Its escrow is paid out as ruled, and unfinished milestones were cancelled.`,
                });
            }
        }
    }

    const contractIds = await listContractsNeedingHoldSync();
    for (const contractId of contractIds) {
        try {
            const result = await syncHoldForContract(contractId);
            if (result && (result.state === 'resumed' || result.started)) synced++;
        } catch (error) {
            console.error(`Contract dispute hold sync failed for ${contractId}:`, error.message);
        }
    }

    return { ended, synced };
}

module.exports = {
    syncHoldForContract,
    syncHoldForDispute,
    reconcileContractDisputeHoldsServices,
};
