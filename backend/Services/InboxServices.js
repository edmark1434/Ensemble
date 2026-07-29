const {
    createInboxRepositories,
    createMessageRepositories,
    updateMessageRepositories,
    updateInboxRepositories,
    getConversationByConvoId,
    checkInboxExists,
    getInboxByAccountId,
    getInboxByTwoAccountIds
} = require("../Repositories/InboxRepositories");
const {
    checkAccountIdService,
    
} = require("../services/AccountServices");

const {
    getProfileCurrentAvatarByAccountIdService
} = require('../Services/ProfileServices');
function dataValidation(payload = {}) {
    const ErrorMessages = [];
    console.log("Validating payload:", payload);
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

async function getInboxByAccountIdServices(accountId, conversation_type){
    if(!checkAccountIdService(accountId)){
        throw new Error('Invalid account ID');
    }
    return await getInboxByAccountId(accountId, conversation_type);
}

async function checkInboxByTwoAccountIdsServices(messagePayload, account_id) {
    console.log("Checking inbox for accounts:", account_id, messagePayload.recipientId);
    if(!checkAccountIdService(account_id) || !checkAccountIdService(messagePayload.recipientId)){
        throw new Error('Invalid account ID(s)');
    }
     try{
        const { recipientId, conversation_type } = messagePayload;
        let inbox = await getInboxByTwoAccountIds(account_id, recipientId, conversation_type);
        if(!inbox){
            inbox = await createInboxServices({
                conversation_name: "",
                conversation_type: conversation_type,
                members: [
                    { account_id: account_id, role: "member", joined_at: new Date() },
                    { account_id: recipientId, role: "member", joined_at: new Date() }
                ],
                pinned_messages: [],
                created_at: new Date(),
                updated_at: new Date()
            });
            console.log(`New inbox created for accounts ${account_id} and ${recipientId}:`, inbox);
        }
        return inbox.insertedId ? inbox.insertedId : inbox._id; // Return the new inbox ID or existing inbox ID
    }catch(err){
        console.error("Error handling direct message:", err);
    }
}

async function getInboxByTwoAccountIdsServices(accountId1, accountId2, conversation_type) { 
    try {
        if (!checkAccountIdService(accountId1) || !checkAccountIdService(accountId2)) {
            throw new Error('Invalid account ID(s)');
        }
        const inbox = await getInboxByTwoAccountIds(accountId1, accountId2, conversation_type);
        if (!inbox) {
            throw new Error('Inbox not found for the given account IDs');
        }
        const avatarPayload = {};
        for (const member of inbox.members) {
            const avatar = await getProfileCurrentAvatarByAccountIdService(member.account_id);
            avatarPayload[member.account_id] = avatar ? avatar.path : null;
        }
        return { ...inbox, avatarPayload };
    }catch (err) {
        console.error("Error checking inbox by two account IDs:", err);
        throw err;
    }
}




module.exports = {
    createInboxServices,
    createMessageServices,
    updateMessageServices,
    updateInboxServices,
    getConversationByConvoIdServices,
    getInboxByAccountIdServices,
    checkInboxByTwoAccountIdsServices,
    getInboxByTwoAccountIdsServices
};

