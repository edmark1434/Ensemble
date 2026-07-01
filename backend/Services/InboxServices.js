const {
    createInboxRepositories,
    createMessageRepositories,
    updateMessageRepositories,
    updateInboxRepositories,
    getConversationByConvoId,
    getConversationByAccountId,
    checkInboxExists
} = require("../Repositories/InboxRepositories");
const {
    checkAccountIdService
} = require("../services/AccountServices");


function dataValidation(payload = {}) {
    const ErrorMessages = [];

    // Conversation Validation
    if (
        payload.conversation_name !== undefined &&
        typeof payload.conversation_name !== "string"
    ) {
        ErrorMessages.push("conversation_name must be a string");
    }

    if (
        payload.conversation_type !== undefined &&
        !["direct", "group"].includes(payload.conversation_type)
    ) {
        ErrorMessages.push("conversation_type must be either direct or group");
    }

    if (payload.members !== undefined) {
        if (!Array.isArray(payload.members)) {
            ErrorMessages.push("members must be an array");
        } else {
            payload.members.forEach((member, index) => {
                if (!member.account_id) {
                    ErrorMessages.push(
                        `members[${index}].account_id is required`
                    );
                }

                if (
                    member.role &&
                    !["owner", "admin", "member"].includes(member.role)
                ) {
                    ErrorMessages.push(
                        `members[${index}].role is invalid`
                    );
                }
            });
        }
    }

    if (payload.pinned_messages !== undefined) {
        if (!Array.isArray(payload.pinned_messages)) {
            ErrorMessages.push("pinned_messages must be an array");
        }
    }

    // Message Validation
    if (
        payload.conversation_id !== undefined &&
        typeof payload.conversation_id !== "string"
    ) {
        ErrorMessages.push("conversation_id must be a string");
    }

    if (
        payload.sender_id !== undefined &&
        typeof payload.sender_id !== "string"
    ) {
        ErrorMessages.push("sender_id must be a string");
    }

    if (
        payload.message_content !== undefined &&
        typeof payload.message_content !== "string"
    ) {
        ErrorMessages.push("message_content must be a string");
    }

    if (
        payload.message_type !== undefined &&
        ![
            "text",
            "image",
            "video",
            "audio",
            "file",
            "system"
        ].includes(payload.message_type)
    ) {
        ErrorMessages.push("invalid message_type");
    }

    if (
        payload.message_id_reply !== undefined &&
        payload.message_id_reply !== null &&
        typeof payload.message_id_reply !== "string"
    ) {
        ErrorMessages.push("message_id_reply must be a string");
    }

    if (
        payload.attachments !== undefined &&
        !Array.isArray(payload.attachments)
    ) {
        ErrorMessages.push("attachments must be an array");
    }

    if (
        payload.links !== undefined &&
        !Array.isArray(payload.links)
    ) {
        ErrorMessages.push("links must be an array");
    }

    if (
        payload.message_react !== undefined &&
        !Array.isArray(payload.message_react)
    ) {
        ErrorMessages.push("message_react must be an array");
    }

    if (
        payload.read_by !== undefined &&
        !Array.isArray(payload.read_by)
    ) {
        ErrorMessages.push("read_by must be an array");
    }

    if (
        payload.is_edited !== undefined &&
        typeof payload.is_edited !== "boolean"
    ) {
        ErrorMessages.push("is_edited must be a boolean");
    }

    if (
        payload.is_deleted !== undefined &&
        typeof payload.is_deleted !== "boolean"
    ) {
        ErrorMessages.push("is_deleted must be a boolean");
    }

    if (ErrorMessages.length > 0) {
        throw new Error(ErrorMessages.join(", "));
    }

    return true;
}

async function createInboxServices(inboxPayload){
    dataValidation(inboxPayload);
    return await createInboxRepositories(inboxPayload);
}

async function createMessageServices(messagePayload){
    dataValidation(messagePayload);
    return await createMessageRepositories(messagePayload);
}

async function updateMessageServices(messageId, updateFields){
    dataValidation(updateFields);
    return await updateMessageRepositories(messageId, updateFields);
}

async function updateInboxServices(inboxId, updateFields){
    dataValidation(updateFields);
    return await updateInboxRepositories(inboxId, updateFields);
}

async function getConversationByConvoIdServices(convoId){
    if(!convoId){
        throw new Error('Conversation ID is required');
    }
    if(!checkInboxExists(convoId)){
        throw new Error('Conversation not found');
    }
    return await getConversationByConvoId(convoId);
}

async function getConversationByAccountIdServices(accountId){
    if(!checkAccountIdService(accountId)){
        throw new Error('Invalid account ID');
    }
    return await getConversationByAccountId(accountId);
}

module.exports = {
    createInboxServices,
    createMessageServices,
    updateMessageServices,
    updateInboxServices,
    getConversationByConvoIdServices,
    getConversationByAccountIdServices
};

