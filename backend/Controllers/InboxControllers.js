const {
    createInboxServices,
    createMessageServices,
    updateMessageServices,
    updateInboxServices,
    getConversationByConvoIdServices,
    getConversationByAccountIdServices
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

async function getConversationByAccountIdController(req, res) {
    try {
        const { account_id } = req.session;
        console.log('Received account_id:', account_id); // Debug log
        const result = await getConversationByAccountIdServices(account_id);
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
    getConversationByAccountIdController
}