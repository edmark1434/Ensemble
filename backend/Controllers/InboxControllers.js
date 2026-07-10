const {
    createInboxServices,
    createMessageServices,
    updateMessageServices,
    updateInboxServices,
    getConversationByConvoIdServices,
    getInboxByAccountIdServices,
    checkInboxByTwoAccountIdsServices
} = require("../Services/InboxServices");

async function createInboxController(req, res) {
    try {
        const result = await createInboxServices(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function createMessageController(req, res) {
    try {
        const result = await createMessageServices(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function updateMessageController(req, res) {
    try {
        const { messageId } = req.params;
        const result = await updateMessageServices(messageId, req.body);
        if (result) {
            res.status(200).json({ message: "Message updated successfully" });
        } else {
            res.status(404).json({ error: "Message not found" });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function updateInboxController(req, res) {
    try {
        const { inboxId } = req.params;
        const result = await updateInboxServices(inboxId, req.body);
        if (result) {
            res.status(200).json({ message: "Inbox updated successfully" });
        }
        else {
            res.status(404).json({ error: "Inbox not found" });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function getConversationByConvoIdController(req, res) {
    try {
        const { convoId } = req.params;
        const result = await getConversationByConvoIdServices(convoId);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function getInboxByAccountIdController(req, res) {
    try {
        const { account_id } = req.session;
        const conversation_type = req.params.conversation_type; // Get the conversation_type from route parameters
        console.log('Received account_id:', account_id); // Debug log
        const result = await getInboxByAccountIdServices(account_id,conversation_type);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function checkInboxByTwoAccountIdsController(req, res) {
    try {
        const { account_id } = req.session;
        const messagePayload = req.body;
        const result = await checkInboxByTwoAccountIdsServices(messagePayload, account_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

module.exports = {
    createInboxController,
    createMessageController,
    updateMessageController,
    updateInboxController,
    getConversationByConvoIdController,
    getInboxByAccountIdController,
    checkInboxByTwoAccountIdsController
}