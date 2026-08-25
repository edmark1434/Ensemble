const { randomUUID } = require('crypto');
const {
    createInboxRepositories,
    createOrGetInboxByContextRepositories,
    createMessageRepositories,
    createReplyRepositories,
    getMessageByIdRepositories,
    editMessageRepositories,
    deleteMessageRepositories,
    setMessageReactionRepositories,
    removeMessageReactionRepositories,
    markConversationMessagesReadRepositories,
    updateInboxRepositories,
    getInboxByIdRepositories,
    getInboxByContextRepositories,
    addInboxMemberRepositories,
    updateInboxMemberRepositories,
    pinMessageRepositories,
    unpinMessageRepositories,
    getConversationByConvoId,
    getInboxByAccountId,
    getInboxByTwoAccountIds,
} = require('../repositories/InboxRepositories');
const { getProposalByIdRepositories } = require('../repositories/JobRepositories');
const { getOrderByIdRepository } = require('../repositories/GigRepositories');
const { checkAccountIdService } = require('./AccountServices');
const { getProfileCurrentAvatarByAccountIdService } = require('./ProfileServices');
const { createNotificationServices } = require('./NotificationServices');
const { getAccountById } = require('../repositories/AccountRepositories');
const { pool } = require('../lib/Database');
const { createReport } = require('../repositories/ModeratorSharedRepositories');

const CONVERSATION_TYPES = [
    'direct',
    'engagement',
    'marketplace_job',
    'marketplace_gig',
    'group',
    'ticket',
    'dispute',
];
const MESSAGE_TYPES = ['text', 'image', 'video', 'audio', 'file', 'system'];
const ENGAGEMENT_CONTEXT_FIELDS = [
    'engagement_id',
    'contract_id',
    'job_id',
    'gig_id',
    'asset_id',
];
const activeCalls = new Map();
const activeCallsById = new Map();
const MAX_CALL_PARTICIPANTS = 8;
const CALL_RING_TIMEOUT_MS = 60_000;

function normalizeLinkedConversation(inbox) {
    if (!inbox) return inbox;
    if (inbox.ticket_id || inbox.support_ticket_id) {
        return { ...inbox, conversation_type: 'ticket' };
    }
    if (inbox.dispute_id) {
        return { ...inbox, conversation_type: 'dispute' };
    }
    return inbox;
}

async function normalizeLinkedConversations(inboxes) {
    await Promise.all(
        inboxes.map(async (inbox) => {
            const normalized = normalizeLinkedConversation(inbox);
            if (normalized.conversation_type !== inbox.conversation_type) {
                await updateInboxRepositories(String(inbox._id), {
                    $set: { conversation_type: normalized.conversation_type },
                });
            }
        })
    );
    const normalized = inboxes.map(normalizeLinkedConversation);
    const ticketIds = [
        ...new Set(
            normalized
                .map((inbox) => inbox.ticket_id || inbox.support_ticket_id)
                .filter(Boolean)
                .map(String)
        ),
    ];
    if (!ticketIds.length) return normalized;

    const ticketResult = await pool.query(
        `SELECT ticket_id, ticket_number, reason, type, priority, status
         FROM tickets
         WHERE ticket_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [ticketIds]
    );
    const ticketsById = new Map(
        ticketResult.rows.map((ticket) => [String(ticket.ticket_id), ticket])
    );
    return normalized.map((inbox) => {
        const ticketId = String(inbox.ticket_id || inbox.support_ticket_id || '');
        const ticket = ticketsById.get(ticketId);
        if (!ticket) return inbox;
        return {
            ...inbox,
            ticket_details: {
                ...inbox.ticket_details,
                ticket_number: ticket.ticket_number,
                subject: ticket.reason,
                type: ticket.type,
                priority: ticket.priority,
                status: ticket.status,
            },
        };
    });
}

class ChatServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

function requireValue(value, message) {
    if (value === undefined || value === null || value === '') {
        throw new ChatServiceError(message);
    }
    return value;
}

async function requireAccount(accountId) {
    requireValue(accountId, 'Account ID is required');
    if (!await checkAccountIdService(accountId)) {
        throw new ChatServiceError('Invalid account ID', 404);
    }
    return String(accountId);
}

function activeMember(inbox, accountId) {
    return inbox?.members?.find(
        (member) =>
            String(member.account_id) === String(accountId) &&
            !['left', 'removed'].includes(member.status)
    );
}

async function requireConversationMember(conversationId, accountId) {
    requireValue(conversationId, 'Conversation ID is required');
    const inbox = await getInboxByIdRepositories(conversationId);
    if (!inbox) {
        throw new ChatServiceError('Conversation not found', 404);
    }
    if (!activeMember(inbox, accountId)) {
        throw new ChatServiceError('You are not an active member of this conversation', 403);
    }
    return inbox;
}

async function requireMessageMember(messageId, accountId) {
    requireValue(messageId, 'Message ID is required');
    const message = await getMessageByIdRepositories(messageId);
    if (!message || message.is_deleted || message.deleted_at) {
        throw new ChatServiceError('Message not found', 404);
    }
    const inbox = await requireConversationMember(message.conversation_id, accountId);
    return { inbox, message };
}

const CHAT_REPORT_REASONS = new Set([
    'Harassment or Bullying',
    'Spam or Scam',
    'Inappropriate or Explicit Content',
    'Hate Speech or Violence',
    'Other',
]);

async function reportMessageServices(messageId, payload, accountId) {
    const { inbox, message } = await requireMessageMember(messageId, accountId);
    const reportedAccountId = String(message.sender_id || '');
    if (!reportedAccountId) {
        throw new ChatServiceError('The message sender could not be identified', 400);
    }
    if (reportedAccountId === String(accountId)) {
        throw new ChatServiceError('You cannot report your own message', 400);
    }

    const reason = String(payload?.reason || '').trim();
    const details = String(payload?.details || '').trim();
    if (!CHAT_REPORT_REASONS.has(reason)) {
        throw new ChatServiceError('Select a valid report reason', 400);
    }
    if (details.length > 2000) {
        throw new ChatServiceError('Report details must not exceed 2,000 characters', 400);
    }

    const exactMessage = String(message.message_content || '').trim();
    const attachmentSummary = (message.attachments || [])
        .map((attachment) =>
            attachment.attachment_name ||
            attachment.attachment_key ||
            attachment.attachment_url ||
            attachment.attachment_type ||
            'Attachment'
        )
        .join(', ');
    const messagePreview = String(exactMessage || '[Attachment]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
    const conversationId = String(inbox._id || message.conversation_id);
    const conversationType = String(inbox.conversation_type || 'conversation')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
    const conversationName = String(
        inbox.conversation_name || `${conversationType} Conversation`
    ).trim();
    const conversationContext = `${conversationType}: ${conversationName} - Chat Inbox`;
    const description = [
        details || 'No additional details provided.',
        `Conversation: ${conversationId}`,
        `Exact reported message:\n${exactMessage || '[No text content]'}`,
        attachmentSummary ? `Reported attachments:\n${attachmentSummary}` : null,
    ].filter(Boolean).join('\n\n');

    return createReport({
        reportNumber: `RPT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
        reporterAccountId: String(accountId),
        targetAccountId: reportedAccountId,
        targetType: 'chat_message',
        targetId: String(message._id),
        targetLabel: conversationContext,
        reason,
        description,
        referenceTable: 'messages',
        referencePrefix: 'inbox',
    });
}

function normalizeMembers(members, ownerId) {
    const byAccountId = new Map();
    byAccountId.set(String(ownerId), {
        account_id: String(ownerId),
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
    });

    for (const member of members || []) {
        const accountId = String(member.account_id || member);
        if (!accountId || accountId === 'undefined') continue;
        byAccountId.set(accountId, {
            account_id: accountId,
            role: member.role === 'admin' ? 'admin' : 'member',
            status: 'active',
            joined_at: new Date(),
        });
    }
    return [...byAccountId.values()];
}

async function validateMemberAccounts(members) {
    await Promise.all(members.map((member) => requireAccount(member.account_id)));
}

function validateConversationType(conversationType) {
    if (!CONVERSATION_TYPES.includes(conversationType)) {
        throw new ChatServiceError('Invalid conversation type');
    }
}

function validateAttachments(attachments = []) {
    if (!Array.isArray(attachments)) {
        throw new ChatServiceError('attachments must be an array');
    }
    for (const attachment of attachments) {
        const key = attachment?.attachment_key ?? attachment?.attachment_url ?? attachment?.key;
        if (!key || typeof key !== 'string' || /^(?:data:|blob:|https?:\/\/)/i.test(key)) {
            throw new ChatServiceError('Attachments must contain S3 object keys only');
        }
    }
    return attachments;
}

async function actorDisplayName(accountId) {
    try {
        const account = await getAccountById(accountId);
        return account?.display_name || account?.handle || 'Someone';
    } catch (_error) {
        return 'Someone';
    }
}

async function persistChatNotifications({
    inbox,
    actorId,
    recipientIds,
    message,
    prefix,
    onNotification,
    referencePath,
}) {
    const activeRecipientIds = new Set(
        (inbox.members || [])
            .filter((member) => !['left', 'removed'].includes(member.status || 'active'))
            .map((member) => String(member.account_id))
    );
    const recipients = new Set(
        (recipientIds || inbox.members || [])
            .map((member) => String(member.account_id || member))
            .filter((accountId) =>
                accountId &&
                accountId !== String(actorId) &&
                activeRecipientIds.has(accountId)
            )
    );
    if (!recipients.size) return;

    const actorName = await actorDisplayName(actorId);
    return (await Promise.all([...recipients].map(async (accountId) => {
        try {
            const notification = await createNotificationServices({
                account_id: accountId,
                message: `${actorName} ${message}`,
                is_read: false,
                reference_table: 'inbox',
                reference_prefix: prefix,
                reference_path: referencePath || `/inbox/direct?conversation=${inbox._id}`,
                reference_id: randomUUID(),
            });
            if (onNotification) await onNotification(accountId, notification);
            return notification;
        } catch (error) {
            console.error('Error creating chat notification:', error);
            return null;
        }
    }))).filter(Boolean);
}

async function createGroupServices(payload, accountId) {
    const ownerId = await requireAccount(accountId);
    const conversationName = String(payload.conversation_name || '').trim();
    if (!conversationName) {
        throw new ChatServiceError('conversation_name is required');
    }

    const members = normalizeMembers(payload.members, ownerId);
    if (members.length < 2) {
        throw new ChatServiceError('A group requires at least two members');
    }
    await validateMemberAccounts(members);

    const now = new Date();
    const result = await createInboxRepositories({
        conversation_name: conversationName,
        conversation_type: 'group',
        members,
        pinned_messages: [],
        created_at: now,
        updated_at: now,
        deleted_at: null,
    });
    const inbox = await getInboxByIdRepositories(result.insertedId);
    await persistChatNotifications({
        inbox,
        actorId: ownerId,
        message: `added you to "${conversationName}".`,
        prefix: 'CHAT_GROUP_ADDED',
    });
    return inbox;
}

async function createEngagementChatServices(payload, accountId) {
    const ownerId = await requireAccount(accountId);
    const contextEntry = ENGAGEMENT_CONTEXT_FIELDS
        .map((field) => [field, payload[field]])
        .find(([, value]) => value);
    if (!contextEntry) {
        throw new ChatServiceError('An engagement context ID is required');
    }

    const [contextField, contextValue] = contextEntry;
    const existing = await getInboxByContextRepositories('engagement', {
        [contextField]: String(contextValue),
    });
    if (existing) {
        if (!activeMember(existing, ownerId)) {
            throw new ChatServiceError('You are not a member of this engagement chat', 403);
        }
        return existing;
    }

    const members = normalizeMembers(payload.members, ownerId);
    if (members.length < 2) {
        throw new ChatServiceError('An engagement chat requires at least two members');
    }
    await validateMemberAccounts(members);

    const now = new Date();
    const result = await createInboxRepositories({
        conversation_name: String(payload.conversation_name || payload.title || 'Engagement'),
        conversation_type: 'engagement',
        [contextField]: String(contextValue),
        listing_type: payload.listing_type || null,
        listing_title: payload.listing_title || payload.title || null,
        listing_preview: payload.listing_preview || null,
        listing_path: payload.listing_path || null,
        members,
        pinned_messages: [],
        created_at: now,
        updated_at: now,
        deleted_at: null,
    });
    const inbox = await getInboxByIdRepositories(result.insertedId);
    await persistChatNotifications({
        inbox,
        actorId: ownerId,
        message: 'started an engagement conversation with you.',
        prefix: 'CHAT_ENGAGEMENT_CREATED',
    });
    return inbox;
}

const MARKETPLACE_CONTEXT_TYPES = new Set(['job_proposal', 'gig_order']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, message) {
    const normalized = String(value || '').trim();
    if (!UUID_PATTERN.test(normalized)) {
        throw new ChatServiceError(message);
    }
    return normalized;
}

function marketplacePreview(value) {
    const preview = String(value || '').trim();
    return preview ? preview.slice(0, 320) : null;
}

function marketplaceMembers(clientAccountId, freelancerAccountId) {
    const now = new Date();
    const accountIds = [...new Set([
        String(clientAccountId || ''),
        String(freelancerAccountId || ''),
    ].filter(Boolean))];

    if (accountIds.length !== 2) {
        throw new ChatServiceError('Marketplace conversation participants are invalid', 409);
    }

    return accountIds.map((memberAccountId) => ({
        account_id: memberAccountId,
        role: 'member',
        status: 'active',
        joined_at: now,
    }));
}

async function resolveMarketplaceContext(contextType, contextId, accountId) {
    if (contextType === 'job_proposal') {
        const proposal = await getProposalByIdRepositories(contextId, accountId);
        if (!proposal) {
            throw new ChatServiceError('Proposal not found', 404);
        }
        if (String(proposal.status || '').toLowerCase() !== 'shortlisted') {
            throw new ChatServiceError(
                'A proposal discussion is available after the proposal is shortlisted',
                409
            );
        }

        const members = marketplaceMembers(
            proposal.client_account_id,
            proposal.freelancer_account_id
        );
        await validateMemberAccounts(members);

        return {
            conversationType: 'marketplace_job',
            context: { proposal_id: String(proposal.proposal_id) },
            notificationMessage: `opened a discussion for "${proposal.job_title || 'Job proposal'}".`,
            inboxPayload: {
                conversation_name: proposal.job_title || 'Job proposal',
                conversation_type: 'marketplace_job',
                proposal_id: String(proposal.proposal_id),
                job_id: String(proposal.job_id),
                client_account_id: String(proposal.client_account_id),
                freelancer_account_id: String(proposal.freelancer_account_id),
                listing_type: 'job',
                listing_title: proposal.job_title || 'Job proposal',
                listing_preview: marketplacePreview(proposal.letter),
                listing_path: `/jobs/postings/${proposal.job_id}`,
                client_context_path: `/jobs/proposals/received/${proposal.proposal_id}`,
                freelancer_context_path: `/jobs/proposals/sent/${proposal.proposal_id}`,
                marketplace_status: proposal.status || null,
                marketplace_amount_credits: Number(proposal.rate_credits) || 0,
                members,
            },
        };
    }

    const order = await getOrderByIdRepository(contextId, accountId);
    if (!order) {
        throw new ChatServiceError('Gig order not found', 404);
    }

    const members = marketplaceMembers(
        order.client_account_id,
        order.freelancer_account_id
    );
    await validateMemberAccounts(members);

    return {
        conversationType: 'marketplace_gig',
        context: { gig_request_id: String(order.id) },
        notificationMessage: `opened a discussion for "${order.gig_title || 'Gig order'}".`,
        inboxPayload: {
            conversation_name: order.gig_title || 'Gig order',
            conversation_type: 'marketplace_gig',
            gig_request_id: String(order.id),
            gig_id: String(order.gig_id),
            client_account_id: String(order.client_account_id),
            freelancer_account_id: String(order.freelancer_account_id),
            listing_type: 'gig',
            listing_title: order.gig_title || 'Gig order',
            listing_preview: marketplacePreview(order.project_brief),
            listing_path: `/gigs/services/${order.gig_id}/page`,
            client_context_path: `/gigs/orders/sent/${order.id}`,
            freelancer_context_path:
                `/gigs/orders/incoming/${order.gig_id}/order/${order.id}`,
            marketplace_status: order.status || null,
            marketplace_amount_credits: Number(order.price) || 0,
            members,
        },
    };
}

async function createMarketplaceChatServices(payload, accountId, callbacks = {}) {
    const actorId = await requireAccount(accountId);
    const contextType = String(payload?.context_type || '').trim();
    if (!MARKETPLACE_CONTEXT_TYPES.has(contextType)) {
        throw new ChatServiceError('Invalid marketplace context type');
    }
    const contextId = requireUuid(
        payload?.context_id,
        'A valid marketplace context ID is required'
    );

    const resolved = await resolveMarketplaceContext(contextType, contextId, actorId);
    const now = new Date();
    const { inbox, created } = await createOrGetInboxByContextRepositories(
        resolved.conversationType,
        resolved.context,
        {
            ...resolved.inboxPayload,
            pinned_messages: [],
            created_at: now,
            updated_at: now,
            deleted_at: null,
        }
    );

    if (!inbox) {
        throw new ChatServiceError('Unable to create marketplace conversation', 500);
    }
    if (!activeMember(inbox, actorId)) {
        throw new ChatServiceError(
            'You are not a member of this marketplace conversation',
            403
        );
    }

    if (created) {
        await persistChatNotifications({
            inbox,
            actorId,
            message: resolved.notificationMessage,
            prefix: 'CHAT_MARKETPLACE_CREATED',
            referencePath: `/inbox/marketplace?conversation=${inbox._id}`,
            onNotification: callbacks.onNotification,
        });

        if (callbacks.onConversationCreated) {
            await Promise.allSettled(
                inbox.members.map((member) =>
                    callbacks.onConversationCreated(String(member.account_id), inbox)
                )
            );
        }
    }

    return { inbox, created };
}
async function createInboxServices(payload, accountId) {
    if (payload.conversation_type === 'group') {
        return await createGroupServices(payload, accountId);
    }
    if (payload.conversation_type === 'engagement') {
        return await createEngagementChatServices(payload, accountId);
    }
    if (payload.conversation_type === 'direct') {
        return await createOrReuseDirectChatServices(payload, accountId);
    }
    throw new ChatServiceError('Use an existing ticket or dispute workflow for this conversation type');
}

async function createOrReuseDirectChatServices(payload, accountId) {
    const senderId = await requireAccount(accountId);
    const recipientId = await requireAccount(payload.recipientId);

    let inbox = await getInboxByTwoAccountIds(senderId, recipientId, 'direct');
    if (!inbox) {
        const now = new Date();
        const result = await createInboxRepositories({
            conversation_name: '',
            conversation_type: 'direct',
            members: senderId === recipientId
                ? [
                    {
                        account_id: senderId,
                        role: 'member',
                        status: 'active',
                        joined_at: now,
                    },
                ]
                : [
                    { account_id: senderId, role: 'member', status: 'active', joined_at: now },
                    { account_id: recipientId, role: 'member', status: 'active', joined_at: now },
                ],
            pinned_messages: [],
            created_at: now,
            updated_at: now,
            deleted_at: null,
        });
        inbox = await getInboxByIdRepositories(result.insertedId);
    }
    return inbox;
}

async function buildMessage(payload, accountId) {
    const senderId = await requireAccount(accountId);
    const conversationId = String(requireValue(payload.conversation_id, 'conversation_id is required'));
    const inbox = await requireConversationMember(conversationId, senderId);
    const messageType = payload.message_type || 'text';
    if (!MESSAGE_TYPES.includes(messageType) || messageType === 'system') {
        throw new ChatServiceError('Invalid message type');
    }

    const attachments = validateAttachments(payload.attachments || []);
    const messageContent = typeof payload.message_content === 'string'
        ? payload.message_content.trim()
        : '';
    if (!messageContent && !attachments.length) {
        throw new ChatServiceError('Message content or an attachment is required');
    }

    const now = new Date();
    const senderName = await actorDisplayName(senderId);
    return {
        inbox,
        document: {
            conversation_id: conversationId,
            sender_id: senderId,
            author_type: 'user',
            author_name: senderName,
            message_type: messageType,
            message_content: messageContent,
            message_id_reply: null,
            attachments,
            links: Array.isArray(payload.links) ? payload.links : [],
            message_react: [],
            read_by: [{ account_id: senderId, read_at: now }],
            is_edited: false,
            is_deleted: false,
            deleted_at: null,
            created_at: now,
            updated_at: now,
        },
    };
}

async function createMessageServices(payload, accountId, options = {}) {
    const { inbox, document } = await buildMessage(payload, accountId);
    const insertedId = await createMessageRepositories(document);
    const message = await getMessageByIdRepositories(insertedId);
    if (!options.suppressNotifications) {
        await persistChatNotifications({
            inbox,
            actorId: accountId,
            message: 'sent you a message.',
            prefix: 'CHAT_MESSAGE',
            onNotification: options.onNotification,
        });
    }
    return message;
}

async function replyMessageServices(parentMessageId, payload, accountId, options = {}) {
    const { inbox, message: parent } = await requireMessageMember(parentMessageId, accountId);
    if (payload.conversation_id && String(payload.conversation_id) !== String(parent.conversation_id)) {
        throw new ChatServiceError('Reply conversation does not match the parent message');
    }

    const built = await buildMessage({
        ...payload,
        conversation_id: parent.conversation_id,
    }, accountId);
    const insertedId = await createReplyRepositories(
        parent.conversation_id,
        parentMessageId,
        built.document
    );
    const reply = await getMessageByIdRepositories(insertedId);
    await persistChatNotifications({
        inbox,
        actorId: accountId,
        recipientIds: [parent.sender_id],
        message: 'replied to your message.',
        prefix: 'CHAT_REPLY',
        onNotification: options.onNotification,
    });
    return reply;
}

async function reactMessageServices(messageId, reactType, accountId, options = {}) {
    const { inbox, message } = await requireMessageMember(messageId, accountId);
    const reaction = String(reactType || '').trim();
    if (!reaction || reaction.length > 32) {
        throw new ChatServiceError('A valid reaction is required');
    }
    const updated = await setMessageReactionRepositories(messageId, {
        account_id: accountId,
        react_type: reaction,
    });
    await persistChatNotifications({
        inbox,
        actorId: accountId,
        recipientIds: [message.sender_id],
        message: `reacted ${reaction} to your message.`,
        prefix: 'CHAT_REACTION',
        onNotification: options.onNotification,
    });
    return updated;
}

async function removeMessageReactionServices(messageId, accountId) {
    await requireMessageMember(messageId, accountId);
    return await removeMessageReactionRepositories(messageId, accountId);
}

async function pinMessageServices(conversationId, messageId, accountId) {
    const inbox = await requireConversationMember(conversationId, accountId);
    const message = await getMessageByIdRepositories(messageId);
    if (
        !message ||
        message.is_deleted ||
        message.deleted_at ||
        String(message.conversation_id) !== String(conversationId)
    ) {
        throw new ChatServiceError('Message not found in this conversation', 404);
    }
    return await pinMessageRepositories(conversationId, {
        message_id: String(messageId),
        pinned_by: String(accountId),
        pinned_at: new Date(),
    });
}

async function unpinMessageServices(conversationId, messageId, accountId) {
    await requireConversationMember(conversationId, accountId);
    return await unpinMessageRepositories(conversationId, messageId);
}

async function editMessageServices(messageId, messageContent, accountId) {
    const { message } = await requireMessageMember(messageId, accountId);
    if (String(message.sender_id) !== String(accountId)) {
        throw new ChatServiceError('You can only edit your own messages', 403);
    }
    const content = String(messageContent || '').trim();
    if (!content) {
        throw new ChatServiceError('message_content is required');
    }
    return await editMessageRepositories(messageId, content);
}

async function deleteMessageServices(messageId, accountId) {
    const { message } = await requireMessageMember(messageId, accountId);
    if (String(message.sender_id) !== String(accountId)) {
        throw new ChatServiceError('You can only delete your own messages', 403);
    }
    return await deleteMessageRepositories(messageId);
}

async function renameConversationServices(conversationId, conversationName, accountId) {
    const inbox = await requireConversationMember(conversationId, accountId);
    const member = activeMember(inbox, accountId);
    if (
        inbox.conversation_type !== 'group' &&
        !['owner', 'admin'].includes(member.role)
    ) {
        throw new ChatServiceError('Only conversation owners and admins can rename it', 403);
    }
    const name = String(conversationName || '').trim();
    if (!name) {
        throw new ChatServiceError('conversation_name is required');
    }
    await updateInboxRepositories(conversationId, {
        $set: { conversation_name: name, updated_at: new Date() },
    });
    return await getInboxByIdRepositories(conversationId);
}

async function updateGroupProfileImageServices(conversationId, imageKey, accountId) {
    const inbox = await requireConversationMember(conversationId, accountId);
    if (inbox.conversation_type !== 'group') {
        throw new ChatServiceError('Profile images are only available for group chats');
    }
    activeMember(inbox, accountId);
    const key = String(imageKey || '').trim();
    if (
        !key ||
        /^https?:\/\//i.test(key) ||
        key.startsWith('data:') ||
        key.startsWith('blob:')
    ) {
        throw new ChatServiceError('A valid S3 object key is required');
    }
    await updateInboxRepositories(conversationId, {
        $set: {
            conversation_image_key: key,
            updated_at: new Date(),
        },
        $unset: {
            conversation_image_url: '',
        },
    });
    return await getInboxByIdRepositories(conversationId);
}

async function updateGroupMemberServices(conversationId, targetAccountId, payload, accountId) {
    const inbox = await requireConversationMember(conversationId, accountId);
    if (inbox.conversation_type !== 'group') {
        throw new ChatServiceError('Member management is only available for group chats');
    }
    const actor = activeMember(inbox, accountId);
    const targetId = await requireAccount(targetAccountId);
    const requestedStatus = payload.status || 'active';
    const existing = inbox.members.find(
        (member) => String(member.account_id) === targetId
    );
    const requestedRole = payload.role || existing?.role || 'member';
    const isSelfLeaving =
        targetId === String(accountId) && requestedStatus === 'left';
    const isPrivilegedActor = ['owner', 'admin'].includes(actor.role);
    const isAddingMember =
        requestedStatus === 'active' &&
        requestedRole === 'member' &&
        (!existing || ['left', 'removed'].includes(existing.status || 'active'));
    if (!isSelfLeaving && !isPrivilegedActor && !isAddingMember) {
        throw new ChatServiceError('Only group owners and admins can manage members', 403);
    }

    if (
        existing?.role === 'admin' &&
        actor.role !== 'owner' &&
        requestedRole !== 'admin'
    ) {
        throw new ChatServiceError('Only the group owner can change an admin role', 403);
    }
    if (!['owner', 'admin', 'member'].includes(requestedRole)) {
        throw new ChatServiceError('Invalid member role');
    }
    if (!['active', 'left', 'removed'].includes(requestedStatus)) {
        throw new ChatServiceError('Invalid member status');
    }
    if (requestedRole === 'owner' && existing?.role !== 'owner') {
        throw new ChatServiceError('Group ownership transfer is not supported');
    }
    if (actor.role !== 'owner' && requestedRole === 'admin') {
        throw new ChatServiceError('Only the group owner can assign admins', 403);
    }
    if (existing?.role === 'owner' && requestedStatus !== 'active') {
        throw new ChatServiceError('The group owner cannot be removed');
    }

    const now = new Date();
    if (existing) {
        await updateInboxMemberRepositories(conversationId, targetId, {
            role: requestedRole,
            status: requestedStatus,
            ...(requestedStatus === 'active'
                ? { rejoined_at: now, removed_at: null }
                : { removed_at: now }),
        }, now);
    } else {
        if (requestedStatus !== 'active') {
            throw new ChatServiceError('A new member must be active');
        }
        await addInboxMemberRepositories(conversationId, {
            account_id: targetId,
            role: requestedRole,
            status: 'active',
            joined_at: now,
        }, now);
    }
    const updatedInbox = await getInboxByIdRepositories(conversationId);
    let membershipEventMessage = null;
    if (
        existing &&
        existing.status !== requestedStatus &&
        ['left', 'removed'].includes(requestedStatus)
    ) {
        const memberName = await actorDisplayName(targetId);
        const now = new Date();
        const insertedId = await createMessageRepositories({
            conversation_id: String(conversationId),
            sender_id: String(accountId),
            message_type: 'system',
            message_content:
                requestedStatus === 'left'
                    ? `${memberName} left the group chat.`
                    : `${memberName} was removed from the group chat.`,
            message_id_reply: null,
            attachments: [],
            links: [],
            message_react: [],
            read_by: [{ account_id: String(accountId), read_at: now }],
            is_edited: false,
            is_deleted: false,
            deleted_at: null,
            created_at: now,
            updated_at: now,
        });
        membershipEventMessage = await getMessageByIdRepositories(insertedId);
    }
    return {
        ...updatedInbox,
        membership_event_message: membershipEventMessage,
    };
}

async function removeGroupMemberServices(conversationId, targetAccountId, accountId) {
    return await updateGroupMemberServices(
        conversationId,
        targetAccountId,
        { status: 'removed' },
        accountId
    );
}

async function getConversationByConvoIdServices(conversationId, accountId) {
    const inbox = await getInboxByIdRepositories(conversationId);
    if (
        !inbox ||
        !inbox.members.some(
            (member) => String(member.account_id) === String(accountId)
        )
    ) {
        throw new ChatServiceError('Conversation access denied', 403);
    }
    const conversation = await getConversationByConvoId(conversationId);
    const [normalizedInbox] = await normalizeLinkedConversations([
        conversation.Inbox,
    ]);
    return {
        ...conversation,
        Inbox: normalizedInbox,
    };
}

async function getConversationSummaryServices(conversationId, accountId) {
    return await requireConversationMember(conversationId, accountId);
}

async function authorizeConversationServices(conversationId, accountId) {
    return await requireConversationMember(conversationId, accountId);
}

async function authorizeSocketRoomServices(roomId, accountId) {
    requireValue(roomId, 'Room ID is required');
    if (String(roomId) === String(accountId)) {
        return { room_type: 'account', room_id: String(roomId), members: [String(accountId)] };
    }
    const inbox = await requireConversationMember(roomId, accountId);
    return {
        room_type: 'conversation',
        room_id: String(inbox._id),
        members: inbox.members
            .filter((member) => !['left', 'removed'].includes(member.status))
            .map((member) => String(member.account_id)),
    };
}

async function typingEventServices(conversationId, isTyping, accountId) {
    await requireConversationMember(conversationId, accountId);
    if (typeof isTyping !== 'boolean') {
        throw new ChatServiceError('is_typing must be a boolean');
    }
    return {
        conversation_id: String(conversationId),
        account_id: String(accountId),
        is_typing: isTyping,
        emitted_at: new Date(),
    };
}

async function markConversationReadServices(conversationId, accountId) {
    await requireConversationMember(conversationId, accountId);
    const readAt = new Date();
    const result = await markConversationMessagesReadRepositories(
        conversationId,
        accountId,
        readAt
    );
    return {
        conversation_id: String(conversationId),
        account_id: String(accountId),
        read_at: readAt,
        modified_count: result.modifiedCount,
    };
}

async function callSignalServices(payload, accountId) {
    const conversationId = String(
        requireValue(payload.conversation_id, 'conversation_id is required')
    );
    const inbox = await requireConversationMember(conversationId, accountId);
    const signalType = String(payload.signal_type || '').toLowerCase();
    if (!['offer', 'answer', 'ice-candidate', 'media-state', 'end', 'end-for-everyone', 'reject', 'resume'].includes(signalType)) {
        throw new ChatServiceError('Invalid call signal type');
    }

    const targetAccountId = payload.target_account_id
        ? String(payload.target_account_id)
        : null;
    if (targetAccountId && !activeMember(inbox, targetAccountId)) {
        throw new ChatServiceError('Call target is not a conversation member', 403);
    }
    if (targetAccountId === String(accountId)) {
        throw new ChatServiceError('Call target cannot be the sender');
    }
    if (!targetAccountId && inbox.conversation_type !== 'group') {
        throw new ChatServiceError('target_account_id is required');
    }

    const callerId = String(accountId);
    const callId = String(payload.call_id || randomUUID());
    const existingTargetCall = targetAccountId && inbox.conversation_type !== 'group'
        ? activeCalls.get(targetAccountId)
        : null;
    const existingCallerCall = activeCalls.get(callerId);
    let call = activeCallsById.get(callId) || existingCallerCall || null;
    let recipientAccountIds = targetAccountId ? [targetAccountId] : [];
    let emittedSignalType = signalType;

    if (signalType === 'offer') {
        const isActiveCallRenegotiation =
            call?.call_id === callId &&
            call.participant_ids.includes(callerId) &&
            targetAccountId &&
            call.participant_ids.includes(targetAccountId);
        if ((existingTargetCall || existingCallerCall) && !isActiveCallRenegotiation) {
            return {
                conversation_id: conversationId,
                call_id: existingCallerCall?.call_id || callId,
                account_id: targetAccountId,
                target_account_id: callerId,
                recipient_account_id: callerId,
                signal_type: 'busy',
                signal: null,
                emitted_at: new Date(),
            };
        }
        if (!isActiveCallRenegotiation) {
            const activeMembers = inbox.members
                .filter((member) => !['left', 'removed'].includes(member.status))
                .map((member) => String(member.account_id));
            const invitedIds = inbox.conversation_type === 'group'
                ? activeMembers.filter((memberId) => memberId !== callerId)
                : [targetAccountId];
            const now = new Date();
            const callerAvatar = await getProfileCurrentAvatarByAccountIdService(callerId)
                .catch(() => null);
            call = {
                call_id: callId,
                conversation_id: conversationId,
                caller_id: callerId,
                conversation_type: inbox.conversation_type,
                conversation_name: inbox.conversation_name || null,
                conversation_image_key: inbox.conversation_image_key || null,
                caller_name: await actorDisplayName(callerId),
                caller_avatar: callerAvatar?.path || null,
                invited_ids: invitedIds,
                participant_ids: [callerId],
                media_states: {
                    [callerId]: { video: false, audio: false },
                },
                status: 'ringing',
                started_at: now,
                expires_at: new Date(now.getTime() + CALL_RING_TIMEOUT_MS),
            };
            activeCallsById.set(callId, call);
            [callerId, ...invitedIds].forEach((memberId) =>
                activeCalls.set(memberId, call)
            );
            recipientAccountIds = invitedIds;
        }
    } else {
        if (
            !call ||
            call.call_id !== callId ||
            call.conversation_id !== conversationId
        ) {
            throw new ChatServiceError('Call is no longer active', 409);
        }
        call.participant_ids = Array.from(new Set(call.participant_ids.map(String)));
        call.invited_ids = Array.from(new Set(call.invited_ids.map(String)));
        if (
            targetAccountId &&
            !call.participant_ids.includes(targetAccountId) &&
            !call.invited_ids.includes(targetAccountId)
        ) {
            if (call.conversation_type === 'group') {
                return {
                    conversation_id: conversationId,
                    call_id: callId,
                    account_id: targetAccountId,
                    target_account_id: callerId,
                    recipient_account_id: callerId,
                    recipient_account_ids: [callerId],
                    signal_type: 'participant-left',
                    signal: null,
                    conversation_type: call.conversation_type,
                    conversation_name: call.conversation_name,
                    conversation_image_key: call.conversation_image_key,
                    caller_id: call.caller_id,
                    caller_name: call.caller_name,
                    caller_avatar: call.caller_avatar,
                    participant_ids: [...call.participant_ids],
                    started_at: call.started_at,
                    expires_at: null,
                    emitted_at: new Date(),
                };
            }
            throw new ChatServiceError('Invalid call recipient', 403);
        }
        const isGroupJoin =
            call.conversation_type === 'group' && signalType === 'answer';
        if (
            !isGroupJoin &&
            !call.participant_ids.includes(callerId) &&
            !call.invited_ids.includes(callerId)
        ) {
            throw new ChatServiceError('You are not invited to this call', 403);
        }
        if (signalType === 'answer' && !call.participant_ids.includes(callerId)) {
            if (call.participant_ids.length >= MAX_CALL_PARTICIPANTS) {
                throw new ChatServiceError('This video call already has 8 participants.', 409);
            }
            recipientAccountIds = [...call.participant_ids];
            call.participant_ids.push(callerId);
            activeCalls.set(callerId, call);
            call.media_states ||= {};
            call.media_states[callerId] ||= { video: false, audio: false };
            call.status = 'active';
        }
        if (signalType === 'media-state') {
            if (!call.participant_ids.includes(callerId)) {
                throw new ChatServiceError('Only a call participant can update media state', 403);
            }
            const mediaState = payload.signal || {};
            call.media_states ||= {};
            call.media_states[callerId] = {
                video: Boolean(mediaState.video),
                audio: Boolean(mediaState.audio),
            };
            recipientAccountIds = call.conversation_type === 'group'
                ? call.participant_ids.filter((participantId) => participantId !== callerId)
                : [targetAccountId];
            return {
                conversation_id: conversationId,
                call_id: callId,
                account_id: callerId,
                target_account_id: targetAccountId,
                recipient_account_id: targetAccountId,
                recipient_account_ids: recipientAccountIds,
                signal_type: 'media-state',
                signal: call.media_states[callerId],
                conversation_type: call.conversation_type,
                participant_ids: [...call.participant_ids],
                media_states: { ...call.media_states },
                emitted_at: new Date(),
            };
        }
        if (signalType === 'resume') {
            recipientAccountIds = call.participant_ids.filter(
                (participantId) => participantId !== callerId
            );
        }
        if (['end', 'end-for-everyone'].includes(signalType) && !call.participant_ids.includes(callerId)) {
            throw new ChatServiceError('Only a call participant can end the call', 403);
        }
        if (signalType === 'end-for-everyone') {
            if (call.conversation_type !== 'group') {
                throw new ChatServiceError('End for everyone is only available for group calls');
            }
            if (call.caller_id !== callerId) {
                throw new ChatServiceError('Only the call starter can end the call for everyone', 403);
            }
            recipientAccountIds = Array.from(new Set([
                ...call.invited_ids,
                ...call.participant_ids,
            ])).filter((memberId) => memberId !== callerId);
            call.participant_ids = [];
            call.status = 'ended';
            emittedSignalType = 'end';
            activeCallsById.delete(call.call_id);
            [call.caller_id, ...call.invited_ids, ...recipientAccountIds].forEach(
                (memberId) => activeCalls.delete(memberId)
            );
        }
        if (signalType === 'end' && call.conversation_type === 'group') {
            call.participant_ids = call.participant_ids.filter(
                (participantId) => participantId !== callerId
            );
            call.invited_ids = call.invited_ids.filter(
                (memberId) => memberId !== callerId
            );
            activeCalls.delete(callerId);
            if (call.media_states) delete call.media_states[callerId];
            recipientAccountIds = [...call.participant_ids];
            if (call.participant_ids.length > 0) {
                call.status = 'active';
                emittedSignalType = 'participant-left';
            } else {
                emittedSignalType = 'end';
                activeCallsById.delete(call.call_id);
                call.invited_ids.forEach((memberId) => activeCalls.delete(memberId));
                recipientAccountIds = [...call.invited_ids];
            }
        } else if (signalType === 'reject' && call.conversation_type === 'group') {
            call.invited_ids = call.invited_ids.filter(
                (memberId) => memberId !== callerId
            );
            activeCalls.delete(callerId);
            if (call.media_states) delete call.media_states[callerId];
            recipientAccountIds = [];
        } else if (['end', 'reject'].includes(signalType)) {
            recipientAccountIds = Array.from(new Set([
                ...call.invited_ids,
                ...call.participant_ids,
            ])).filter((memberId) => memberId !== callerId);
            activeCallsById.delete(call.call_id);
            [call.caller_id, ...call.invited_ids].forEach((memberId) =>
                activeCalls.delete(memberId)
            );
        }
    }

    const signal = payload.signal ?? null;
    if (signal && JSON.stringify(signal).length > 100000) {
        throw new ChatServiceError('Call signal payload is too large');
    }
    const [callerName, callerAvatar] = await Promise.all([
        actorDisplayName(callerId),
        getProfileCurrentAvatarByAccountIdService(callerId).catch(() => null),
    ]);
    return {
        conversation_id: conversationId,
        call_id: callId,
        account_id: callerId,
        target_account_id: targetAccountId,
        recipient_account_id: targetAccountId,
        recipient_account_ids: recipientAccountIds,
        signal_type: emittedSignalType,
        signal,
        actor_name: callerName,
        actor_avatar: callerAvatar?.path || null,
        conversation_type: call?.conversation_type || inbox.conversation_type,
        conversation_name: call?.conversation_name || inbox.conversation_name || null,
        conversation_image_key:
            call?.conversation_image_key || inbox.conversation_image_key || null,
        caller_id: call?.caller_id || callerId,
        caller_name: call?.caller_name || callerName,
        caller_avatar: call?.caller_avatar || callerAvatar?.path || null,
        participant_ids: call?.participant_ids || [callerId],
        media_states: call?.media_states || {},
        started_at: call?.started_at || new Date(),
        expires_at: call?.expires_at || null,
        emitted_at: new Date(),
    };
}

function releaseCallsForAccountServices(accountId) {
    return activeCalls.get(String(accountId)) || null;
}

function getActiveCallForAccountServices(accountId) {
    const call = activeCalls.get(String(accountId));
    if (!call) return null;
    if (call.status === 'ringing' && new Date(call.expires_at).getTime() <= Date.now()) {
        expireCallServices(call.call_id);
        return null;
    }
    return {
        call_id: call.call_id,
        conversation_id: call.conversation_id,
        conversation_type: call.conversation_type,
        conversation_name: call.conversation_name,
        conversation_image_key: call.conversation_image_key,
        caller_id: call.caller_id,
        caller_name: call.caller_name,
        caller_avatar: call.caller_avatar,
        participant_ids: [...call.participant_ids],
        media_states: { ...(call.media_states || {}) },
        call_status: call.status,
        status: call.participant_ids.includes(String(accountId))
            ? call.status
            : 'ringing',
        started_at: call.started_at,
        expires_at: call.status === 'ringing' ? call.expires_at : null,
    };
}

function expireCallServices(callId) {
    const call = activeCallsById.get(String(callId));
    if (!call || call.status !== 'ringing') return null;
    activeCallsById.delete(call.call_id);
    [call.caller_id, ...call.invited_ids].forEach((memberId) =>
        activeCalls.delete(memberId)
    );
    return call;
}

async function getActiveGroupCallServices(conversationId, accountId) {
    const inbox = await requireConversationMember(conversationId, accountId);
    if (inbox.conversation_type !== 'group') return null;
    const call = [...activeCallsById.values()].find(
        (item) =>
            item.conversation_type === 'group' &&
            item.conversation_id === String(conversationId)
    );
    if (!call) return null;
    call.participant_ids = Array.from(new Set(call.participant_ids.map(String)));
    const participantProfiles = await Promise.all(
        call.participant_ids.map(async (participantId) => {
            const [name, avatar] = await Promise.all([
                actorDisplayName(participantId),
                getProfileCurrentAvatarByAccountIdService(participantId).catch(() => null),
            ]);
            return {
                account_id: participantId,
                display_name: name,
                avatar_key: avatar?.path || null,
            };
        })
    );
    return {
        call_id: call.call_id,
        conversation_id: call.conversation_id,
        conversation_name: call.conversation_name,
        conversation_image_key: call.conversation_image_key,
        caller_id: call.caller_id,
        caller_name: call.caller_name,
        caller_avatar: call.caller_avatar,
        participant_ids: [...call.participant_ids],
        participant_names: participantProfiles.map((participant) => participant.display_name),
        participant_profiles: participantProfiles,
        media_states: { ...(call.media_states || {}) },
        status: call.status,
        started_at: call.started_at,
    };
}

async function getInboxByAccountIdServices(accountId, conversationType) {
    await requireAccount(accountId);
    validateConversationType(conversationType);
    const inboxes = await getInboxByAccountId(accountId, conversationType);
    return await normalizeLinkedConversations(inboxes);
}

async function getAllInboxesByAccountIdServices(accountId) {
    await requireAccount(accountId);
    const conversations = await Promise.all(
        CONVERSATION_TYPES.map((type) => getInboxByAccountId(accountId, type))
    );
    const normalizedConversations = await normalizeLinkedConversations(
        conversations.flat()
    );
    return normalizedConversations.sort((left, right) => {
        const leftTime = new Date(left.last_message_time || left.updated_at || 0);
        const rightTime = new Date(right.last_message_time || right.updated_at || 0);
        return rightTime - leftTime;
    });
}

async function checkInboxByTwoAccountIdsServices(payload, accountId) {
    const inbox = await createOrReuseDirectChatServices(payload, accountId);
    return inbox._id;
}

async function getInboxByTwoAccountIdsServices(accountId, recipientId) {
    await requireAccount(accountId);
    await requireAccount(recipientId);
    const inbox = await getInboxByTwoAccountIds(accountId, recipientId, 'direct');
    if (!inbox) {
        throw new ChatServiceError('Inbox not found for the given account IDs', 404);
    }

    const avatarEntries = await Promise.all(inbox.members.map(async (member) => {
        const avatar = await getProfileCurrentAvatarByAccountIdService(member.account_id);
        return [member.account_id, avatar?.path || null];
    }));
    return { ...inbox, avatarPayload: Object.fromEntries(avatarEntries) };
}

// Backward-compatible service names now route through explicit authorized operations.
async function updateMessageServices(messageId, action, updateFields, accountId) {
    if (action !== 'set' || typeof updateFields?.message_content !== 'string') {
        throw new ChatServiceError('Unsupported message update');
    }
    return await editMessageServices(messageId, updateFields.message_content, accountId);
}

async function updateInboxServices(inboxId, updateFields, accountId) {
    const conversationName =
        updateFields?.conversation_name ?? updateFields?.$set?.conversation_name;
    return await renameConversationServices(inboxId, conversationName, accountId);
}

module.exports = {
    ChatServiceError,
    createInboxServices,
    createGroupServices,
    createEngagementChatServices,
    createMarketplaceChatServices,
    createOrReuseDirectChatServices,
    createMessageServices,
    replyMessageServices,
    reactMessageServices,
    removeMessageReactionServices,
    reportMessageServices,
    pinMessageServices,
    unpinMessageServices,
    editMessageServices,
    deleteMessageServices,
    renameConversationServices,
    updateGroupProfileImageServices,
    updateGroupMemberServices,
    removeGroupMemberServices,
    updateMessageServices,
    updateInboxServices,
    authorizeConversationServices,
    authorizeSocketRoomServices,
    typingEventServices,
    markConversationReadServices,
    callSignalServices,
    releaseCallsForAccountServices,
    getActiveCallForAccountServices,
    expireCallServices,
    getActiveGroupCallServices,
    getConversationByConvoIdServices,
    getConversationSummaryServices,
    getInboxByAccountIdServices,
    getAllInboxesByAccountIdServices,
    checkInboxByTwoAccountIdsServices,
    getInboxByTwoAccountIdsServices,
};
