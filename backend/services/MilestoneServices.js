/**
 * MilestoneServices.js
 *
 * Business logic layer for milestone lifecycle events.
 * Called by background cron jobs and the MilestoneControllers.
 *
 * Notification conventions used:
 *   reference_table  = 'contract_milestones'
 *   reference_path   = '/contracts/<contractId>'   (takes user to the contract page)
 *   reference_id     = contract_milestone_id
 */

const {
    getActiveMilestonesNowOverdue,
    markMilestoneOverdue,
    getOverdueMilestonesNowStalled,
    markMilestoneStalled,
    getStalledMilestonesNowAbandoned,
    markMilestoneAbandoned,
    getSubmissionsReadyForAutoApproval,
    autoApproveMilestoneSubmit,
    getApproachingDeadlineMilestones,
    getSubmissionsNeedingReviewReminder,
    cancelMilestoneAndRefund,
    cancelContractAndRefundUnfinishedMilestones,
    extendMilestoneDeadline,
    extendContractDeadline,
    approveMilestoneSubmit,
    requestMilestoneRevision,
    getMilestoneWithParties,
} = require('../repositories/MilestoneRepositories');

const { createNotification } = require('../repositories/NotificationRepositories');
const { getIo } = require('../lib/WebSocket');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Send an in-app notification and immediately push it via Socket.IO.
 */
async function notify({ accountId, message, referencePrefix, referencePath, referenceId, referenceTable = 'contract_milestones' }) {
    const notification = await createNotification({
        account_id: accountId,
        message,
        is_read: false,
        reference_table: referenceTable,
        reference_prefix: referencePrefix,
        reference_path: referencePath,
        reference_id: referenceId,
    });

    const io = getIo();
    if (io && notification) {
        io.to(String(accountId)).emit('notification', notification);
    }

    return notification;
}

/**
 * Notify both client and freelancer with different messages.
 */
async function notifyBoth({ clientAccountId, freelancerAccountId, clientMessage, freelancerMessage, referencePrefix, contractId, milestoneId }) {
    const path = `/contracts/${contractId}`;
    await Promise.all([
        notify({ accountId: clientAccountId,     message: clientMessage,     referencePrefix, referencePath: path, referenceId: milestoneId }),
        notify({ accountId: freelancerAccountId, message: freelancerMessage, referencePrefix, referencePath: path, referenceId: milestoneId }),
    ]);
}

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

/**
 * JOB 1 — Overdue Detector (runs every hour :00)
 * Flags active milestones past their deadline and notifies both parties.
 */
async function reconcileOverdueMilestonesServices() {
    const milestones = await getActiveMilestonesNowOverdue();
    if (!milestones.length) return { flagged: 0 };

    let flagged = 0;
    for (const m of milestones) {
        try {
            await markMilestoneOverdue(m.contract_milestone_id);
            await notifyBoth({
                clientAccountId:     m.client_account_id,
                freelancerAccountId: m.freelancer_account_id,
                clientMessage:       `Your freelancer missed the deadline for milestone "${m.milestone_name}". You can extend the deadline, cancel for a full refund, or open a dispute.`,
                freelancerMessage:   `⚠️ You missed the deadline for milestone "${m.milestone_name}" on "${m.contract_title}". Submit your work ASAP or your client may cancel.`,
                referencePrefix: 'MILESTONE_OVERDUE',
                contractId:  m.contract_id,
                milestoneId: m.contract_milestone_id,
            });
            flagged++;
        } catch (err) {
            console.error(`Overdue detection failed for milestone ${m.contract_milestone_id}:`, err.message);
        }
    }

    return { flagged };
}

/**
 * JOB 2 — Stalled Escalator (runs every hour :15)
 * Escalates overdue milestones with no submission after 7 days.
 */
async function reconcileStalledMilestonesServices() {
    const milestones = await getOverdueMilestonesNowStalled();
    if (!milestones.length) return { escalated: 0 };

    let escalated = 0;
    for (const m of milestones) {
        try {
            await markMilestoneStalled(m.contract_milestone_id);
            await notifyBoth({
                clientAccountId:     m.client_account_id,
                freelancerAccountId: m.freelancer_account_id,
                clientMessage:       `🚨 Milestone "${m.milestone_name}" has been stalled for 7+ days with no submission. Cancel for a full refund or extend the deadline.`,
                freelancerMessage:   `🚨 Milestone "${m.milestone_name}" is now stalled. Your client may cancel at any time. Submit your work immediately.`,
                referencePrefix: 'MILESTONE_STALLED',
                contractId:  m.contract_id,
                milestoneId: m.contract_milestone_id,
            });
            escalated++;
        } catch (err) {
            console.error(`Stalled escalation failed for milestone ${m.contract_milestone_id}:`, err.message);
        }
    }

    return { escalated };
}

/**
 * JOB 3 — Abandoned Marker (runs daily at 02:30)
 * Marks milestones abandoned after 30 days of zero action.
 */
async function reconcileAbandonedMilestonesServices() {
    const milestones = await getStalledMilestonesNowAbandoned();
    if (!milestones.length) return { abandoned: 0 };

    let abandoned = 0;
    for (const m of milestones) {
        try {
            await markMilestoneAbandoned(m.contract_milestone_id);
            // Automatically refund remaining escrow to the client
            const refundResult = await cancelMilestoneAndRefund({
                milestoneId:         m.contract_milestone_id,
                clientAccountId:     m.client_account_id,
                freelancerAccountId: m.freelancer_account_id,
            });

            const creditsRefunded = refundResult?.refundedCredits || m.credits || 0;
            await notifyBoth({
                clientAccountId:     m.client_account_id,
                freelancerAccountId: m.freelancer_account_id,
                clientMessage:       `Milestone "${m.milestone_name}" was abandoned due to extended inactivity. ${creditsRefunded} credits were automatically refunded to your wallet.`,
                freelancerMessage:   `Milestone "${m.milestone_name}" was cancelled due to inactivity. Unearned escrow funds have been refunded to the client.`,
                referencePrefix: 'MILESTONE_ABANDONED',
                contractId:  m.contract_id,
                milestoneId: m.contract_milestone_id,
            });
            abandoned++;
        } catch (err) {
            console.error(`Abandoned refund failed for milestone ${m.contract_milestone_id}:`, err.message);
        }
    }

    return { abandoned };
}

/**
 * JOB 4 — Auto-Approve Resolver (runs every hour :30)
 * Releases payment for submissions the client has ignored for 5 days (3 for gigs).
 */
async function reconcileAutoApprovalServices() {
    const submissions = await getSubmissionsReadyForAutoApproval();
    if (!submissions.length) return { approved: 0 };

    let approved = 0;
    for (const s of submissions) {
        try {
            const result = await autoApproveMilestoneSubmit({
                milestoneSubmitId: s.milestone_submit_id,
                milestoneId:       s.contract_milestone_id,
                contractId:        s.contract_id,
                milestoneIndex:    s.milestone_index,
                milestoneCredits:  Number(s.credits),
                freelancerAccountId: s.freelancer_account_id,
            });

            if (!result) continue; // Already handled concurrently

            await notifyBoth({
                clientAccountId:     s.client_account_id,
                freelancerAccountId: s.freelancer_account_id,
                clientMessage:       `Milestone "${s.milestone_name}" was auto-approved after ${s.contract_type === 'gig' ? 3 : 5} days with no response. Credits were released to the freelancer.`,
                freelancerMessage:   `🎉 Milestone "${s.milestone_name}" was auto-approved! ${s.credits} credits have been released to your wallet.`,
                referencePrefix: 'MILESTONE_AUTO_APPROVED',
                contractId:  s.contract_id,
                milestoneId: s.contract_milestone_id,
            });

            approved++;
        } catch (err) {
            console.error(`Auto-approval failed for submission ${s.milestone_submit_id}:`, err.message);
        }
    }

    return { approved };
}

/**
 * JOB 5 — Reminder Sender (runs every hour :45)
 * Two sub-tasks:
 *   A. Warn freelancer 48 hours before deadline
 *   B. Remind client to review submission (day 3 of 5 / day 2 of 3 for gigs)
 */
async function reconcileMilestoneRemindersServices() {
    let reminded = 0;

    // A. Approaching deadline → notify freelancer
    const approaching = await getApproachingDeadlineMilestones();
    for (const m of approaching) {
        try {
            await notify({
                accountId: m.freelancer_account_id,
                message:   `⏰ Milestone "${m.milestone_name}" on "${m.contract_title}" is due in 2 days. Submit your work now.`,
                referencePrefix: 'MILESTONE_DUE_SOON',
                referencePath:   `/contracts/${m.contract_id}`,
                referenceId:     m.contract_milestone_id,
            });
            reminded++;
        } catch (err) {
            console.error(`Deadline reminder failed for milestone ${m.contract_milestone_id}:`, err.message);
        }
    }

    // B. Review reminder → notify client
    const pendingReviews = await getSubmissionsNeedingReviewReminder();
    for (const s of pendingReviews) {
        try {
            const daysLeft = s.contract_type === 'gig' ? 1 : 2;
            await notify({
                accountId: s.client_account_id,
                message:   `⚠️ Reminder: Milestone "${s.milestone_name}" will auto-approve in ${daysLeft} day${daysLeft > 1 ? 's' : ''} if you take no action. Review it now.`,
                referencePrefix: 'MILESTONE_REVIEW_REMINDER',
                referencePath:   `/contracts/${s.contract_id}`,
                referenceId:     s.contract_milestone_id,
                referenceTable:  'milestone_submits',
            });
            reminded++;
        } catch (err) {
            console.error(`Review reminder failed for submission ${s.milestone_submit_id}:`, err.message);
        }
    }

    return { reminded };
}

// ─── Service wrappers for controller actions ──────────────────────────────────

/**
 * Client cancels a milestone and receives a credit refund.
 */
async function cancelMilestoneService(milestoneId, callerAccountId) {
    const milestone = await getMilestoneWithParties(milestoneId);
    if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });

    if (String(milestone.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can cancel a milestone'), { statusCode: 403 });
    }

    if (!['overdue', 'stalled', 'abandoned'].includes(milestone.status)) {
        throw Object.assign(
            new Error(`Milestone cannot be cancelled in status: ${milestone.status}. It must be overdue, stalled, or abandoned.`),
            { statusCode: 400 }
        );
    }

    const result = await cancelMilestoneAndRefund({
        milestoneId,
        clientAccountId:     milestone.client_account_id,
        freelancerAccountId: milestone.freelancer_account_id,
    });

    await notifyBoth({
        clientAccountId:     milestone.client_account_id,
        freelancerAccountId: milestone.freelancer_account_id,
        clientMessage:       `Milestone "${milestone.milestone_name}" was cancelled. ${milestone.credits} credits have been refunded to your wallet.`,
        freelancerMessage:   `Milestone "${milestone.milestone_name}" was cancelled by the client due to no submission. No payment was released.`,
        referencePrefix: 'MILESTONE_CANCELLED',
        contractId:  milestone.contract_id,
        milestoneId: milestone.contract_milestone_id,
    });

    return result;
}

/**
 * Client cancels the contract and receives a refund for all unfinished milestones.
 * Completed milestones remain with the freelancer.
 */
async function cancelContractService(contractId, callerAccountId) {
    const { getContractWithParties } = require('../repositories/ContractRepositories');
    const contract = await getContractWithParties(contractId);
    if (!contract) {
        throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    }

    if (String(contract.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can cancel a contract'), { statusCode: 403 });
    }

    if (!['Active', 'Waiting'].includes(contract.status)) {
        throw Object.assign(new Error(`Contract cannot be cancelled in status: ${contract.status}`), { statusCode: 400 });
    }

    const result = await cancelContractAndRefundUnfinishedMilestones({
        contractId,
        clientAccountId: contract.client_account_id,
        freelancerAccountId: contract.freelancer_account_id,
    });

    const isPartial = result.isPartial;
    await notifyBoth({
        clientAccountId: contract.client_account_id,
        freelancerAccountId: contract.freelancer_account_id,
        clientMessage: isPartial
            ? `Contract "${contract.contract_title}" closed. ${result.refundedCredits} credits for unfinished milestones were refunded to your wallet.`
            : `Contract "${contract.contract_title}" cancelled. ${result.refundedCredits} credits were refunded to your wallet.`,
        freelancerMessage: isPartial
            ? `Contract "${contract.contract_title}" was closed by the client. You retained payment for completed milestones. Unfinished milestone funds were refunded.`
            : `Contract "${contract.contract_title}" was cancelled by the client. No unearned funds were released.`,
        referencePrefix: isPartial ? 'CONTRACT_CLOSED' : 'CONTRACT_CANCELLED',
        contractId: contract.contract_id,
        milestoneId: null,
    });

    return result;
}

/**
 * Client extends the overall contract deadline.
 * Extends the contract's deadline_at by extensionDays, along with any active/overdue/stalled milestones.
 */
async function extendContractDeadlineService(contractId, callerAccountId, extensionDays) {
    if (!extensionDays || isNaN(Number(extensionDays)) || Number(extensionDays) < 1 || Number(extensionDays) > 90) {
        throw Object.assign(new Error('extensionDays must be between 1 and 90 days'), { statusCode: 400 });
    }

    const { getContractWithParties } = require('../repositories/ContractRepositories');
    const contract = await getContractWithParties(contractId);
    if (!contract) {
        throw Object.assign(new Error('Contract not found'), { statusCode: 404 });
    }

    if (String(contract.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can extend a contract deadline'), { statusCode: 403 });
    }

    const updated = await extendContractDeadline({ contractId, extensionDays: Number(extensionDays) });

    await notifyBoth({
        clientAccountId:     contract.client_account_id,
        freelancerAccountId: contract.freelancer_account_id,
        clientMessage:       `You extended the contract deadline for "${contract.contract_title}" by ${extensionDays} day(s).`,
        freelancerMessage:   `Good news! Your client extended the contract deadline for "${contract.contract_title}" by ${extensionDays} day(s). Submit your work before the new deadline.`,
        referencePrefix:     'CONTRACT_EXTENDED',
        contractId:          contract.contract_id,
        milestoneId:         updated.extendedMilestones?.[0]?.contract_milestone_id || null,
    });

    return updated;
}

/**
 * Client extends the deadline on an overdue or stalled milestone.
 * Delegates to extending the overall contract deadline.
 */
async function extendMilestoneService(milestoneId, callerAccountId, extensionDays) {
    const milestone = await getMilestoneWithParties(milestoneId);
    if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });

    if (String(milestone.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can extend a deadline'), { statusCode: 403 });
    }

    return await extendContractDeadlineService(milestone.contract_id, callerAccountId, extensionDays);
}

/**
 * Client manually approves a submitted milestone.
 */
async function approveMilestoneService(milestoneId, callerAccountId) {
    const milestone = await getMilestoneWithParties(milestoneId);
    if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });

    if (String(milestone.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can approve a milestone'), { statusCode: 403 });
    }

    const result = await approveMilestoneSubmit({
        milestoneId:         milestone.contract_milestone_id,
        contractId:          milestone.contract_id,
        milestoneIndex:      milestone.index,
        milestoneCredits:    Number(milestone.credits),
        freelancerAccountId: milestone.freelancer_account_id,
    });

    await notifyBoth({
        clientAccountId:     milestone.client_account_id,
        freelancerAccountId: milestone.freelancer_account_id,
        clientMessage:       `You approved milestone "${milestone.milestone_name}". Credits released to the freelancer.`,
        freelancerMessage:   `🎉 Milestone "${milestone.milestone_name}" was approved! ${milestone.credits} credits have been released to your wallet.`,
        referencePrefix: 'MILESTONE_APPROVED',
        contractId:  milestone.contract_id,
        milestoneId: milestone.contract_milestone_id,
    });

    return result;
}

/**
 * Client requests a revision on the current submission.
 */
async function requestRevisionService(milestoneId, callerAccountId, revisionNote) {
    const milestone = await getMilestoneWithParties(milestoneId);
    if (!milestone) throw Object.assign(new Error('Milestone not found'), { statusCode: 404 });

    if (String(milestone.client_account_id) !== String(callerAccountId)) {
        throw Object.assign(new Error('Only the client can request a revision'), { statusCode: 403 });
    }

    const result = await requestMilestoneRevision({ milestoneId, revisionNote });

    const revisionsLeft = result.revisionsMax - result.revisionsUsed;
    await notifyBoth({
        clientAccountId:     milestone.client_account_id,
        freelancerAccountId: milestone.freelancer_account_id,
        clientMessage:       `You requested a revision on "${milestone.milestone_name}". The freelancer has been notified.`,
        freelancerMessage:   `Your client requested a revision on "${milestone.milestone_name}". ${revisionsLeft} revision(s) remaining. Please resubmit when ready.`,
        referencePrefix: 'MILESTONE_REVISION',
        contractId:  milestone.contract_id,
        milestoneId: milestone.contract_milestone_id,
    });

    return result;
}

module.exports = {
    // Cron services
    reconcileOverdueMilestonesServices,
    reconcileStalledMilestonesServices,
    reconcileAbandonedMilestonesServices,
    reconcileAutoApprovalServices,
    reconcileMilestoneRemindersServices,
    // Controller services
    cancelMilestoneService,
    cancelContractService,
    extendMilestoneService,
    extendContractDeadlineService,
    approveMilestoneService,
    requestRevisionService,
};
