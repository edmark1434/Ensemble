const DashboardRepositories = require('../repositories/DashboardRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREELANCER_STATUSES = new Set(['progress', 'submitted_for_review']);
const CLIENT_STATUSES = new Set(['approval', 'revision_request']);

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
    const isFreelancerAction = String(actorId) === String(task.freelancer_account_id);
    const actorName = isFreelancerAction ? task.freelancer_name : task.client_name;
    const milestoneName = milestone.name || 'milestone';
    const listingTitle = task.job_title || 'contract';
    const notificationMessages = {
        progress: `${actorName} sent an update for "${milestoneName}" in "${listingTitle}".`,
        submitted_for_review: `${actorName} requested a review for "${milestoneName}" in "${listingTitle}".`,
        revision_request: `${actorName} requested revisions for "${milestoneName}" in "${listingTitle}".`,
        approval: `${actorName} approved "${milestoneName}" in "${listingTitle}".`,
    };
    const prefixes = {
        progress: 'MILESTONE_UPDATE',
        submitted_for_review: 'MILESTONE_REVIEW_REQUESTED',
        revision_request: 'MILESTONE_REVISION_REQUESTED',
        approval: 'MILESTONE_APPROVED',
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
        if (io) io.to(String(recipientId)).emit('notification', notification);
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
        io.to([
            String(task.client_account_id),
            String(task.freelancer_account_id),
        ]).emit('dashboardTaskUpdated', event);
    }
}

async function submitMilestoneServices({ accountId, contractId, milestoneId, payload }) {
    const actorId = requireUuid(accountId, 'account ID');
    const normalizedContractId = requireUuid(contractId, 'contract ID');
    const normalizedMilestoneId = requireUuid(milestoneId, 'milestone ID');
    const input = normalizeActionInput(payload, FREELANCER_STATUSES);
    const task = await DashboardRepositories.getTaskById(normalizedContractId, actorId);

    if (!task || String(task.freelancer_account_id) !== actorId) {
        throw new DashboardActionError('Task not found or unauthorized', 403);
    }

    const result = await DashboardRepositories.recordMilestoneAction({
        contractId: normalizedContractId,
        milestoneId: normalizedMilestoneId,
        message: input.message,
        attachments: input.attachments,
        submissionStatus: input.status,
        milestoneStatus:
            input.status === 'submitted_for_review' ? 'submitted_for_review' : null,
        allowedCurrentStatuses: ['active'],
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

    if (!task || String(task.client_account_id) !== actorId) {
        throw new DashboardActionError('Task not found or unauthorized', 403);
    }

    const result = await DashboardRepositories.recordMilestoneAction({
        contractId: normalizedContractId,
        milestoneId: normalizedMilestoneId,
        message: input.message,
        attachments: input.attachments,
        submissionStatus: input.status,
        milestoneStatus: input.status === 'approval' ? 'completed' : 'active',
        unlockNext: input.status === 'approval',
        allowedCurrentStatuses: ['submitted_for_review'],
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

    return { submission: result.submission, task: updatedTask };
}

module.exports = {
    DashboardActionError,
    submitMilestoneServices,
    reviewMilestoneServices,
};
