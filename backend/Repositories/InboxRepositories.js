const { lazyCollection } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const MessageCollection = lazyCollection('messages');
const InboxCollection = lazyCollection('inbox');


async function createInboxRepositories(inboxPayload = {}) {
    try{
        const result = await InboxCollection.insertOne(inboxPayload);
        return result;
    }catch(err){
        console.error('Error creating inbox:', err);
        throw err;
    }
}

async function createMessageRepositories(messagePayload = {}) {
    try{
        const result = await MessageCollection.insertOne(messagePayload);
        return result.insertedId;
    }catch(err){
        console.error('Error creating message:', err);
        throw err;
    }
}

async function updateMessageRepositories(messageId, updateFields = {}) {
    try{
        const result = await MessageCollection.updateOne(
            { _id: new ObjectId(messageId) },
            updateFields
        );
        return result.modifiedCount > 0;
    }catch(err){
        console.error('Error updating message:', err);
        throw err;
    }
}

async function updateInboxRepositories(inboxId, updateFields = {}) {
    try{
        const result = await InboxCollection.updateOne(
            { _id: new ObjectId(inboxId) },
            updateFields
        );
        return result.modifiedCount > 0;
    }catch(err){
        console.error('Error updating inbox:', err);
        throw err;
    }
}

async function getConversationByConvoId(convoId) {
    try{
        const [Inbox, Messages] = await Promise.all([
            InboxCollection.findOne({ _id: new ObjectId(convoId) }),
            MessageCollection.find({ conversation_id: convoId }).toArray()
        ]);
        return { Inbox, Messages };
    }catch(err){
        console.error('Error fetching conversation:', err);
        throw err;
    }
}


async function checkInboxExists(inboxId) {
    try{
        const inbox = await InboxCollection.findOne({ _id: new ObjectId(inboxId) });
        return !!inbox;
    }catch(err){
        console.error('Error checking inbox existence:', err);
        throw err;
    }
}

async function getInboxByAccountId(account_id, conversation_type) {
    try {
        const inboxes = await InboxCollection.aggregate([
            {
                $match: {
                    "members.account_id": account_id,
                    conversation_type
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: {
                        conversationId: { $toString: "$_id" }
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        "$conversation_id",
                                        "$$conversationId"
                                    ]
                                }
                            }
                        },
                        {
                            $limit: 1 // We only need to know if at least one message exists
                        }
                    ],
                    as: "messageExists"
                }
            },
            {
                $match: {
                    "messageExists.0": { $exists: true }
                }
            },
            {
                $project: {
                    messageExists: 0
                }
            }
        ]).toArray();

        return inboxes;
    } catch (err) {
        console.error("Error fetching inbox by account ID:", err);
        throw err;
    }
}

async function getInboxByTwoAccountIds(accountId1, accountId2, conversation_type) {
    try{
        const inbox = await InboxCollection.findOne({
            "members.account_id": { $all: [String(accountId1), String(accountId2)] },
            conversation_type: conversation_type
        });
        return inbox;
    }catch(err){
        console.error('Error fetching inbox by two account IDs:', err);
        throw err;
    }
}

module.exports = {
    createInboxRepositories,
    createMessageRepositories,
    updateMessageRepositories,
    updateInboxRepositories,
    getConversationByConvoId,
    checkInboxExists,
    getInboxByAccountId,
    getInboxByTwoAccountIds
}