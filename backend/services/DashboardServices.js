const DashboardRepositories = require('../repositories/DashboardRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREELANCER_STATUSES = new Set(['progress', 'submitted_for_review']);
const CLIENT_STATUSES = new Set(['approval', 'revision_request', 'client_message']);

class DashboardActionError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

function requireUuid(value, label) {
    const normalized = String(value || '').trim();
    if (!UUID_PATTERN.test(normalized)) {
        throw new DashboardActionError(`A valid ${label} is required`);
    }
    return normalized;
}

function normalizeActionInput(payload, allowedStatuses) {
    const status = String(payload?.status || '').trim().toLowerCase();
    if (!allowedStatuses.has(status)) {
        throw new DashboardActionError('Invalid milestone action status');
    }

    const message = String(payload?.message || '').trim();
    if (message.length > 5000) {
        throw new DashboardActionError('Message must be 5,000 characters or fewer');
    }

    if (!Array.isArray(payload?.attachments || [])) {
        throw new DashboardActionError('Attachments must be an array');
    }
    const attachments = (payload.attachments || []).map((attachment) => {
        const value = String(attachment || '').trim();
        if (!value || value.length > 2048) {
            throw new DashboardActionError('An attachment reference is invalid');
        }
        return value;
    });
    if (attachments.length > 5) {
        throw new DashboardActionError('A maximum of 5 attachments is allowed');
    }

    if (
        (!message && attachments.length === 0 && status !== 'approval') ||
        (status === 'revision_request' && !message)
    ) {
        throw new DashboardActionError('A message or attachment is required');
    }

    return { status, message, attachments };
}

function safeIo() {
    try {
        return getIo();
    } catch (_error) {
        return null;
    }
}

async function notifyAndBroadcast({ task, actorId, recipientId, submission, milestone, action }) {
    const isFreelancerAction =
        String(actorId) === String(task.freelancer_account_id) ||
        task.user_role?.effective_role === 'freelancer';
    const actorName = isFreelancerAction ? task.freelancer_name : task.client_name;
    const milestoneName = milestone.name || 'milestone';
    const listingTitle = task.job_title || 'contract';
    const notificationMessages = {
        progress: `${actorName} sent an update for "${milestoneName}" in "${listingTitle}".`,
        submitted_for_review: `${actorName} requested a review for "${milestoneName}" in "${listingTitle}".`,
        revision_request: `${actorName} requested revisions for "${milestoneName}" in "${listingTitle}".`,
        approval: `${actorName} approved "${milestoneName}" in "${listingTitle}".`,
        client_message: `${actorName} sent a message regarding "${milestoneName}" in "${listingTitle}".`,
    };
    const prefixes = {
        progress: 'MILESTONE_UPDATE',
        submitted_for_review: 'MILESTONE_REVIEW_REQUESTED',
        revision_request: 'MILESTONE_REVISION_REQUESTED',
        approval: 'MILESTONE_APPROVED',
        client_message: 'MILESTONE_MESSAGE',
    };
    const isRecipientClient = String(recipientId) === String(task.client_account_id);
    const referencePath = isRecipientClient
        ? `/dashboard/review/${task.contract_id}`
        : `/dashboard/tasks/${task.contract_id}`;
    const io = safeIo();

    try {
        const notification = await createNotificationServices({
            message: notificationMessages[action],
            is_read: false,
            reference_table: 'milestone_submits',
            reference_prefix: prefixes[action],
            reference_path: referencePath,
            reference_id: submission.milestone_submit_id,
            account_id: recipientId,
        });
        const actorAvatar = isFreelancerAction ? task.freelancer_avatar : task.client_avatar;
        const enrichedNotification = {
            ...notification,
            userName: actorName,
            userAvatar: actorAvatar,
            chatMessage: submission?.message || null,
            chatAction: action,
            taskType: task.contract_type || 'job', // Fallback to 'job' if missing
        };
        if (io) io.to(String(recipientId)).emit('notification', enrichedNotification);
    } catch (error) {
        console.error('Unable to create milestone notification:', error.message);
    }

    if (io) {
        const event = {
            contract_id: String(task.contract_id),
            task,
            submission,
            action,
            actor_account_id: String(actorId),
            emitted_at: new Date().toISOString(),
        };
        const targetRooms = new Set(
            [
                String(task.client_account_id),
                String(task.freelancer_account_id),
                String(recipientId),
                String(actorId),
            ].filter(Boolean)
        );

        let broadcaster = io;
        for (const room of targetRooms) {
            broadcaster = broadcaster.to(room);
        }
        broadcaster.emit('dashboardTaskUpdated', event);

        // Also notify team contract workspaces if a team is involved
        if (task.user_role?.team_id) {
            io.emit('teamTaskWorkspaceUpdated', {
                team_id: String(task.user_role.team_id),
                contract_id: String(task.contract_id),
            });
        }
    }
}

async function submitMilestoneServices({ accountId, contractId, milestoneId, payload }) {
    const actorId = requireUuid(accountId, 'account ID');
    const normalizedContractId = requireUuid(contractId, 'contract ID');
    const normalizedMilestoneId = requireUuid(milestoneId, 'milestone ID');
    const input = normalizeActionInput(payload, FREELANCER_STATUSES);
    const task = await DashboardRepositories.getTaskById(normalizedContractId, actorId);

    if (!task || !task.user_role?.can_submit_milestone) {
        throw new DashboardActionError('Only the freelancer, team Project Leader, or team Owner/Admin can submit milestone work', 403);
    }

    const result = await DashboardRepositories.recordMilestoneAction({
        contractId: normalizedContractId,
        milestoneId: normalizedMilestoneId,
        message: input.message,
        attachments: input.attachments,
        submissionStatus: input.status,
        milestoneStatus:
            input.status === 'submitted_for_review' ? 'submitted_for_review' : null,
        allowedCurrentStatuses: [
            'active',
            'pending',
            'submitted_for_review',
            'revision_requested',
            'revisions_requested',
            'in_progress',
            'overdue',
            'stalled',
        ],
    });
    const updatedTask = await DashboardRepositories.getTaskById(
        normalizedContractId,
        actorId
    );

    await notifyAndBroadcast({
        task: updatedTask,
        actorId,
        recipientId: updatedTask.client_account_id,
        submission: result.submission,
        milestone: result.milestone,
        action: input.status,
    });

    return { submission: result.submission, task: updatedTask };
}

async function reviewMilestoneServices({ accountId, contractId, milestoneId, payload }) {
    const actorId = requireUuid(accountId, 'account ID');
    const normalizedContractId = requireUuid(contractId, 'contract ID');
    const normalizedMilestoneId = requireUuid(milestoneId, 'milestone ID');
    const input = normalizeActionInput(payload, CLIENT_STATUSES);
    const task = await DashboardRepositories.getTaskById(normalizedContractId, actorId);

    if (!task || !task.user_role?.can_review_milestone) {
        throw new DashboardActionError('Only the client, team Project Leader, or team Owner/Admin can review milestone submissions', 403);
    }

    const isClientMessage = input.status === 'client_message';
    const result = await DashboardRepositories.recordMilestoneAction({
        contractId: normalizedContractId,
        milestoneId: normalizedMilestoneId,
        message: input.message,
        attachments: input.attachments,
        submissionStatus: input.status,
        milestoneStatus: isClientMessage ? null : (input.status === 'approval' ? 'completed' : 'active'),
        unlockNext: !isClientMessage && input.status === 'approval',
        releaseOnContractCompletion: !isClientMessage && input.status === 'approval',
        allowedCurrentStatuses: isClientMessage
            ? [
                'active',
                'pending',
                'submitted_for_review',
                'revision_requested',
                'revisions_requested',
                'in_progress',
                'overdue',
                'stalled',
            ]
            : ['submitted_for_review'],
    });
    const updatedTask = await DashboardRepositories.getTaskById(
        normalizedContractId,
        actorId
    );

    await notifyAndBroadcast({
        task: updatedTask,
        actorId,
        recipientId: updatedTask.freelancer_account_id,
        submission: result.submission,
        milestone: result.milestone,
        action: input.status,
    });

    const activeRelease = result.milestoneRelease || (result.contractCompletion?.milestoneRelease || null);
    if (activeRelease) {
        const io = safeIo();
        if (io) {
            io.to(String(activeRelease.freelancerAccountId)).emit(
                'notification',
                activeRelease.notification
            );
            io.to(String(activeRelease.freelancerAccountId)).emit(
                'walletBalanceUpdated',
                {
                    balance_credits: activeRelease.accountBalanceCredits,
                    wallet_type: 'account wallets',
                    transaction_id: activeRelease.transaction.credit_transaction_id,
                }
            );
            io.to(String(activeRelease.freelancerAccountId)).emit(
                'escrowBalanceUpdated',
                {
                    balance_credits: activeRelease.escrowBalanceCredits,
                    wallet_type: 'escrow wallets',
                    transaction_id: activeRelease.transaction.credit_transaction_id,
                }
            );
        }
    }

    return {
        submission: result.submission,
        task: updatedTask,
        milestone_release: activeRelease
            ? {
                released_credits: activeRelease.releasedCredits,
                transaction_id: activeRelease.transaction.credit_transaction_id,
            }
            : null,
        contract_completion: result.contractCompletion
            ? {
                is_done: true,
                released_credits: activeRelease ? activeRelease.releasedCredits : 0,
                transaction_id: activeRelease ? activeRelease.transaction.credit_transaction_id : null,
            }
            : (activeRelease
                ? {
                    released_credits: activeRelease.releasedCredits,
                    transaction_id: activeRelease.transaction.credit_transaction_id,
                }
                : null),
    };
}

async function buyRevisionServices({ accountId, contractId, milestoneId, payload }) {
    const actorId = requireUuid(accountId, 'account ID');
    const normalizedContractId = requireUuid(contractId, 'contract ID');
    const normalizedMilestoneId = requireUuid(milestoneId, 'milestone ID');
    const idempotencyKey = requireUuid(payload?.idempotency_key, 'idempotency key');

    const purchase = await DashboardRepositories.buyRevision({
        clientAccountId: actorId,
        contractId: normalizedContractId,
        milestoneId: normalizedMilestoneId,
        idempotencyKey,
    });
    const task = await DashboardRepositories.getTaskById(normalizedContractId, actorId);
    if (!task) {
        throw new DashboardActionError('Task not found after revision purchase', 404);
    }

    if (!purchase.alreadyProcessed) {
        const io = safeIo();
        if (io) {
            io.to(String(purchase.freelancerAccountId)).emit(
                'notification',
                purchase.notification
            );
            io.to(String(purchase.clientAccountId)).emit('walletBalanceUpdated', {
                balance_credits: purchase.clientBalanceCredits,
                wallet_type: 'account wallets',
                transaction_id: purchase.transactionId,
            });
            io.to(String(purchase.freelancerAccountId)).emit('escrowBalanceUpdated', {
                balance_credits: purchase.freelancerEscrowBalanceCredits,
                wallet_type: 'escrow wallets',
                transaction_id: purchase.transactionId,
            });
            const purchaseRooms = new Set(
                [
                    String(purchase.clientAccountId),
                    String(purchase.freelancerAccountId),
                    String(actorId),
                ].filter(Boolean)
            );
            let purchaseBroadcaster = io;
            for (const room of purchaseRooms) {
                purchaseBroadcaster = purchaseBroadcaster.to(room);
            }
            purchaseBroadcaster.emit('dashboardTaskUpdated', {
                contract_id: normalizedContractId,
                task,
                action: 'revision_purchased',
                actor_account_id: actorId,
                transaction_id: purchase.transactionId,
                emitted_at: new Date().toISOString(),
            });
        }
    }

    return {
        task,
        transaction: {
            id: purchase.transactionId,
            amount_credits: purchase.priceCredits,
            already_processed: purchase.alreadyProcessed,
        },
    };
}

async function reviewContractServices({ contractId, accountId, rating, feedback }) {
    const normalizedContractId = requireUuid(contractId, 'contract ID');
    const actorId = requireUuid(accountId, 'account ID');

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        throw new DashboardActionError('Rating must be an integer between 1 and 5');
    }

    const trimmedFeedback = String(feedback || '').trim();
    if (!trimmedFeedback) {
        throw new DashboardActionError('Feedback cannot be empty');
    }
    if (trimmedFeedback.length > 5000) {
        throw new DashboardActionError('Feedback must be 5,000 characters or fewer');
    }

    const reviewResult = await DashboardRepositories.submitContractReview(
        normalizedContractId,
        actorId,
        numRating,
        trimmedFeedback
    );

    const task = await DashboardRepositories.getTaskById(normalizedContractId, actorId);

    const io = safeIo();
    if (io && task) {
        const clientAccId = String(task.client_account_id);
        const freeAccId = String(task.freelancer_account_id);
        const targetAccId = String(reviewResult.targetAccountId);

        const rooms = new Set([clientAccId, freeAccId, actorId].filter(Boolean));
        let broadcaster = io;
        for (const room of rooms) {
            broadcaster = broadcaster.to(room);
        }
        broadcaster.emit('dashboardTaskUpdated', {
            contract_id: normalizedContractId,
            task,
            action: 'contract_reviewed',
            actor_account_id: actorId,
            contract_status: task.contract_status,
            contract_completed: reviewResult.contractCompleted,
            emitted_at: new Date().toISOString(),
        });

        try {
            const reviewerName = reviewResult.isClient ? task.client_name : task.freelancer_name;
            const reviewerAvatar = reviewResult.isClient ? task.client_avatar : task.freelancer_avatar;
            const notif = await createNotificationServices({
                message: `${reviewerName || 'A user'} left you a ${numRating}-star review for "${task.job_title || 'contract'}".`,
                is_read: false,
                reference_table: 'ratings',
                reference_prefix: 'CONTRACT_REVIEW',
                reference_path: `/profile/${targetAccId}`,
                reference_id: reviewResult.rating.rating_id,
                account_id: targetAccId,
            });
            notif.reviewerName = reviewerName;
            notif.reviewerAvatar = reviewerAvatar;
            notif.reviewFeedback = trimmedFeedback;
            notif.reviewStars = numRating;
            io.to(targetAccId).emit('notification', notif);
        } catch (notifErr) {
            console.error('Unable to create review notification:', notifErr.message);
        }
    }

    return {
        review: reviewResult.rating,
        contractCompleted: reviewResult.contractCompleted,
        task,
    };
}

module.exports = {
    DashboardActionError,
    submitMilestoneServices,
    reviewMilestoneServices,
    buyRevisionServices,
    reviewContractServices,
};
