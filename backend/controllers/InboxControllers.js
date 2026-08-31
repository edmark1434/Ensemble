const {
    createInboxServices,
    createGroupServices,
    createEngagementChatServices,
    createMarketplaceChatServices,
    createRevisionChatServices,
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
    updateGroupMemberServices,
    removeGroupMemberServices,
    getConversationByConvoIdServices,
    getInboxByAccountIdServices,
    getAllInboxesByAccountIdServices,
    checkInboxByTwoAccountIdsServices,
    getInboxByTwoAccountIdsServices,
} = require('../services/InboxServices');
const { getIo } = require('../lib/WebSocket');

function accountId(req) {
    return req.session.account_id;
}

function sendError(res, error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
}

async function createInboxController(req, res) {
    try {
        const result = await createInboxServices(req.body, accountId(req));
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function createGroupController(req, res) {
    try {
        const result = await createGroupServices(req.body, accountId(req));
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function createEngagementChatController(req, res) {
    try {
        const result = await createEngagementChatServices(req.body, accountId(req));
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function createMarketplaceChatController(req, res) {
    try {
        const io = getIo();
        const result = await createMarketplaceChatServices(
            req.body,
            accountId(req),
            {
                onNotification: (recipientId, notification) =>
                    io.to(String(recipientId)).emit('notification', notification),
                onConversationCreated: (recipientId, inbox) =>
                    io.to(String(recipientId)).emit('conversationCreated', inbox),
            }
        );
        return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function createRevisionChatController(req, res) {
    try {
        const io = getIo();
        const result = await createRevisionChatServices(
            req.body,
            accountId(req),
            {
                onNotification: (recipientId, notification) =>
                    io.to(String(recipientId)).emit('notification', notification),
                onConversationCreated: (recipientId, inbox) =>
                    io.to(String(recipientId)).emit('conversationCreated', inbox),
            }
        );
        return res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function createMessageController(req, res) {
    try {
        const result = await createMessageServices(req.body, accountId(req));
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function replyMessageController(req, res) {
    try {
        const result = await replyMessageServices(
            req.params.messageId,
            req.body,
            accountId(req)
        );
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function reactMessageController(req, res) {
    try {
        const result = await reactMessageServices(
            req.params.messageId,
            req.body.react_type,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function removeMessageReactionController(req, res) {
    try {
        const result = await removeMessageReactionServices(
            req.params.messageId,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function reportMessageController(req, res) {
    try {
        const report = await reportMessageServices(
            req.params.messageId,
            req.body,
            accountId(req)
        );
        return res.status(201).json({
            success: true,
            message: 'Message report submitted successfully',
            report,
        });
    } catch (error) {
        return sendError(res, error);
    }
}

async function pinMessageController(req, res) {
    try {
        const result = await pinMessageServices(
            req.params.conversationId,
            req.params.messageId,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function unpinMessageController(req, res) {
    try {
        const result = await unpinMessageServices(
            req.params.conversationId,
            req.params.messageId,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function updateMessageController(req, res) {
    try {
        const result = await editMessageServices(
            req.params.messageId,
            req.body.message_content,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function deleteMessageController(req, res) {
    try {
        const result = await deleteMessageServices(req.params.messageId, accountId(req));
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function updateInboxController(req, res) {
    try {
        const result = await renameConversationServices(
            req.params.inboxId,
            req.body.conversation_name,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function updateGroupMemberController(req, res) {
    try {
        const result = await updateGroupMemberServices(
            req.params.inboxId,
            req.params.accountId,
            req.body,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function removeGroupMemberController(req, res) {
    try {
        const result = await removeGroupMemberServices(
            req.params.inboxId,
            req.params.accountId,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function getConversationByConvoIdController(req, res) {
    try {
        const result = await getConversationByConvoIdServices(
            req.params.convoId,
            accountId(req)
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function getInboxByAccountIdController(req, res) {
    try {
        const result = await getInboxByAccountIdServices(
            accountId(req),
            req.params.conversation_type
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function getAllInboxesByAccountIdController(req, res) {
    try {
        const result = await getAllInboxesByAccountIdServices(accountId(req));
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function checkInboxByTwoAccountIdsController(req, res) {
    try {
        const result = await checkInboxByTwoAccountIdsServices(req.body, accountId(req));
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

async function getInboxByTwoAccountIdsController(req, res) {
    try {
        const inbox = await getInboxByTwoAccountIdsServices(
            accountId(req),
            req.params.accountId
        );
        return res.status(200).json({
            message: 'Inbox retrieved successfully',
            inbox,
        });
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    createInboxController,
    createGroupController,
    createEngagementChatController,
    createMessageController,
    createMarketplaceChatController,
    createRevisionChatController,
    replyMessageController,
    reactMessageController,
    removeMessageReactionController,
    reportMessageController,
    pinMessageController,
    unpinMessageController,
    updateMessageController,
    deleteMessageController,
    updateInboxController,
    updateGroupMemberController,
    removeGroupMemberController,
    getConversationByConvoIdController,
    getInboxByAccountIdController,
    getAllInboxesByAccountIdController,
    checkInboxByTwoAccountIdsController,
    getInboxByTwoAccountIdsController,
};
