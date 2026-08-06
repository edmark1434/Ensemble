const { lazyCollection } = require('../lib/MongoDb');
const { ObjectId } = require('mongodb');
const MessageCollection = lazyCollection('messages');
const InboxCollection = lazyCollection('inbox');

function inboxObjectId(inboxId) {
    return new ObjectId(String(inboxId));
}

function activeMessageFilter(filter = {}) {
    return {
        ...filter,
        is_deleted: { $ne: true },
        deleted_at: null,
    };
}

function messagePreview(message) {
    if (!message) return null;
    if (message.message_content) return message.message_content;
    const attachmentCount = message.attachments?.length || 0;
    if (!attachmentCount) return '';
    return attachmentCount === 1
        ? 'Sent an attachment'
        : `Sent ${attachmentCount} attachments`;
}

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
        await refreshLatestMessagePreview(messagePayload.conversation_id);
        return result.insertedId;
    }catch(err){
        console.error('Error creating message:', err);
        throw err;
    }
}

async function updateMessageRepositories(messageId, action, payload) {
  try {
    const updatedMessage = await MessageCollection.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        [`$${action}`]: payload,
      },
      {
        returnDocument: "after", // MongoDB Node Driver v4+
        // returnOriginal: false, // if using an older driver
      }
    );

    return updatedMessage;
  } catch (err) {
    console.error("Error updating message:", err);
    throw err;
  }
}

async function createReplyRepositories(conversationId, parentMessageId, messagePayload = {}) {
    return await createMessageRepositories({
        ...messagePayload,
        conversation_id: String(conversationId),
        message_id_reply: String(parentMessageId),
    });
}

async function getMessageByIdRepositories(messageId) {
    try {
        return await MessageCollection.findOne({ _id: inboxObjectId(messageId) });
    } catch (err) {
        console.error('Error fetching message:', err);
        throw err;
    }
}

async function editMessageRepositories(messageId, messageContent, updatedAt = new Date()) {
    try {
        const updatedMessage = await MessageCollection.findOneAndUpdate(
            activeMessageFilter({ _id: inboxObjectId(messageId) }),
            {
                $set: {
                    message_content: messageContent,
                    is_edited: true,
                    updated_at: updatedAt,
                },
            },
            { returnDocument: 'after' }
        );

        if (updatedMessage) {
            await refreshLatestMessagePreview(updatedMessage.conversation_id);
        }
        return updatedMessage;
    } catch (err) {
        console.error('Error editing message:', err);
        throw err;
    }
}

async function deleteMessageRepositories(messageId, deletedAt = new Date()) {
    try {
        const deletedMessage = await MessageCollection.findOneAndUpdate(
            activeMessageFilter({ _id: inboxObjectId(messageId) }),
            {
                $set: {
                    is_deleted: true,
                    deleted_at: deletedAt,
                    updated_at: deletedAt,
                },
            },
            { returnDocument: 'after' }
        );

        if (deletedMessage) {
            await refreshLatestMessagePreview(deletedMessage.conversation_id);
        }
        return deletedMessage;
    } catch (err) {
        console.error('Error deleting message:', err);
        throw err;
    }
}

async function setMessageReactionRepositories(messageId, reaction, updatedAt = new Date()) {
    try {
        return await MessageCollection.findOneAndUpdate(
            activeMessageFilter({ _id: inboxObjectId(messageId) }),
            [{
                $set: {
                    message_react: {
                        $concatArrays: [
                            {
                                $filter: {
                                    input: { $ifNull: ['$message_react', []] },
                                    as: 'reaction',
                                    cond: {
                                        $ne: ['$$reaction.account_id', String(reaction.account_id)],
                                    },
                                },
                            },
                            [{
                                account_id: String(reaction.account_id),
                                react_type: reaction.react_type,
                            }],
                        ],
                    },
                    updated_at: updatedAt,
                },
            }],
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error setting message reaction:', err);
        throw err;
    }
}

async function removeMessageReactionRepositories(messageId, accountId, updatedAt = new Date()) {
    try {
        return await MessageCollection.findOneAndUpdate(
            activeMessageFilter({ _id: inboxObjectId(messageId) }),
            {
                $pull: {
                    message_react: { account_id: String(accountId) },
                },
                $set: { updated_at: updatedAt },
            },
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error removing message reaction:', err);
        throw err;
    }
}

async function markConversationMessagesReadRepositories(
    conversationId,
    accountId,
    readAt = new Date()
) {
    try {
        return await MessageCollection.updateMany(
            activeMessageFilter({
                conversation_id: String(conversationId),
                sender_id: { $ne: String(accountId) },
                'read_by.account_id': { $ne: String(accountId) },
            }),
            {
                $push: {
                    read_by: {
                        account_id: String(accountId),
                        read_at: readAt,
                    },
                },
                $set: { updated_at: readAt },
            }
        );
    } catch (err) {
        console.error('Error marking conversation messages as read:', err);
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

async function deleteInboxRepositories(inboxId, deletedAt = new Date()) {
    try {
        return await InboxCollection.findOneAndUpdate(
            { _id: inboxObjectId(inboxId), deleted_at: null },
            {
                $set: {
                    deleted_at: deletedAt,
                    updated_at: deletedAt,
                },
            },
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error deleting inbox:', err);
        throw err;
    }
}

async function getInboxByIdRepositories(inboxId) {
    try {
        return await InboxCollection.findOne({
            _id: inboxObjectId(inboxId),
            deleted_at: null,
        });
    } catch (err) {
        console.error('Error fetching inbox:', err);
        throw err;
    }
}

async function getInboxByContextRepositories(conversationType, context = {}) {
    try {
        return await InboxCollection.findOne({
            conversation_type: conversationType,
            deleted_at: null,
            ...context,
        });
    } catch (err) {
        console.error('Error fetching inbox by context:', err);
        throw err;
    }
}

async function getInboxMembersRepositories(inboxId) {
    try {
        const inbox = await InboxCollection.findOne(
            { _id: inboxObjectId(inboxId) },
            { projection: { members: 1 } }
        );
        return inbox?.members || [];
    } catch (err) {
        console.error('Error fetching inbox members:', err);
        throw err;
    }
}

async function addInboxMemberRepositories(inboxId, member, updatedAt = new Date()) {
    try {
        return await InboxCollection.findOneAndUpdate(
            {
                _id: inboxObjectId(inboxId),
                'members.account_id': { $ne: String(member.account_id) },
            },
            {
                $push: {
                    members: {
                        ...member,
                        account_id: String(member.account_id),
                    },
                },
                $set: { updated_at: updatedAt },
            },
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error adding inbox member:', err);
        throw err;
    }
}

async function updateInboxMemberRepositories(inboxId, accountId, memberFields, updatedAt = new Date()) {
    try {
        const memberUpdates = Object.fromEntries(
            Object.entries(memberFields).map(([key, value]) => [`members.$.${key}`, value])
        );

        return await InboxCollection.findOneAndUpdate(
            {
                _id: inboxObjectId(inboxId),
                'members.account_id': String(accountId),
            },
            {
                $set: {
                    ...memberUpdates,
                    updated_at: updatedAt,
                },
            },
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error updating inbox member:', err);
        throw err;
    }
}

async function removeInboxMemberRepositories(inboxId, accountId, updatedAt = new Date()) {
    return await updateInboxMemberRepositories(
        inboxId,
        accountId,
        { status: 'removed', removed_at: updatedAt },
        updatedAt
    );
}

async function pinMessageRepositories(inboxId, pinnedMessage, updatedAt = new Date()) {
    try {
        return await InboxCollection.findOneAndUpdate(
            { _id: inboxObjectId(inboxId) },
            [{
                $set: {
                    pinned_messages: {
                        $concatArrays: [
                            {
                                $filter: {
                                    input: { $ifNull: ['$pinned_messages', []] },
                                    as: 'pinned',
                                    cond: {
                                        $ne: ['$$pinned.message_id', String(pinnedMessage.message_id)],
                                    },
                                },
                            },
                            [{
                                ...pinnedMessage,
                                message_id: String(pinnedMessage.message_id),
                                pinned_by: String(pinnedMessage.pinned_by),
                            }],
                        ],
                    },
                    updated_at: updatedAt,
                },
            }],
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error pinning message:', err);
        throw err;
    }
}

async function unpinMessageRepositories(inboxId, messageId, updatedAt = new Date()) {
    try {
        return await InboxCollection.findOneAndUpdate(
            { _id: inboxObjectId(inboxId) },
            {
                $pull: {
                    pinned_messages: { message_id: String(messageId) },
                },
                $set: { updated_at: updatedAt },
            },
            { returnDocument: 'after' }
        );
    } catch (err) {
        console.error('Error unpinning message:', err);
        throw err;
    }
}

async function refreshLatestMessagePreview(conversationId) {
    if (!conversationId) return null;

    const latestMessage = await MessageCollection.findOne(
        {
            conversation_id: String(conversationId),
            ...activeMessageFilter(),
        },
        { sort: { created_at: -1, _id: -1 } }
    );

    const preview = latestMessage
        ? {
            last_message: messagePreview(latestMessage),
            last_message_id: String(latestMessage._id),
            last_message_sender_id: latestMessage.sender_id,
            last_message_time: latestMessage.created_at || latestMessage.updated_at,
            updated_at: latestMessage.created_at || latestMessage.updated_at,
        }
        : {
            last_message: null,
            last_message_id: null,
            last_message_sender_id: null,
            last_message_time: null,
        };

    await InboxCollection.updateOne(
        { _id: inboxObjectId(conversationId) },
        { $set: preview }
    );
    return latestMessage;
}

async function getConversationByConvoId(convoId) {
    try{
        const [Inbox, Messages] = await Promise.all([
            InboxCollection.findOne({ _id: inboxObjectId(convoId), deleted_at: null }),
            MessageCollection.find(activeMessageFilter({
                conversation_id: String(convoId),
            })).sort({ created_at: 1, _id: 1 }).toArray()
        ]);
        return { Inbox, Messages };
    }catch(err){
        console.error('Error fetching conversation:', err);
        throw err;
    }
}


async function checkInboxExists(inboxId) {
    try{
        const inbox = await InboxCollection.findOne({
            _id: inboxObjectId(inboxId),
            deleted_at: null,
        });
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
                    members: {
                        $elemMatch: {
                            account_id: String(account_id),
                            ...(conversation_type === 'group'
                                ? {}
                                : { status: { $nin: ['left', 'removed'] } }),
                        },
                    },
                    conversation_type,
                    deleted_at: null,
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
                                    $and: [
                                        { $eq: ["$conversation_id", "$$conversationId"] },
                                        { $ne: ["$is_deleted", true] },
                                        { $eq: [{ $ifNull: ["$deleted_at", null] }, null] }
                                    ]
                                }
                            }
                        },
                        {
                            $sort: { created_at: -1, _id: -1 }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: "latestMessage"
                }
            },
            {
                $set: {
                    last_message: {
                        $ifNull: [
                            {
                                $let: {
                                    vars: {
                                        latest: { $arrayElemAt: ["$latestMessage", 0] }
                                    },
                                    in: {
                                        $cond: [
                                            { $gt: [{ $strLenCP: { $ifNull: ["$$latest.message_content", ""] } }, 0] },
                                            "$$latest.message_content",
                                            {
                                                $cond: [
                                                    { $gt: [{ $size: { $ifNull: ["$$latest.attachments", []] } }, 1] },
                                                    {
                                                        $concat: [
                                                            "Sent ",
                                                            { $toString: { $size: { $ifNull: ["$$latest.attachments", []] } } },
                                                            " attachments"
                                                        ]
                                                    },
                                                    {
                                                        $cond: [
                                                            { $eq: [{ $size: { $ifNull: ["$$latest.attachments", []] } }, 1] },
                                                            "Sent an attachment",
                                                            null
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            "$last_message"
                        ]
                    },
                    last_message_id: {
                        $ifNull: [
                            { $toString: { $arrayElemAt: ["$latestMessage._id", 0] } },
                            "$last_message_id"
                        ]
                    },
                    last_message_sender_id: {
                        $ifNull: [
                            { $arrayElemAt: ["$latestMessage.sender_id", 0] },
                            "$last_message_sender_id"
                        ]
                    },
                    last_message_time: {
                        $ifNull: [
                            { $arrayElemAt: ["$latestMessage.created_at", 0] },
                            "$last_message_time"
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: {
                        conversationId: { $toString: "$_id" },
                        readerAccountId: String(account_id),
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$conversation_id", "$$conversationId"] },
                                        { $ne: ["$sender_id", "$$readerAccountId"] },
                                        { $ne: ["$is_deleted", true] },
                                        { $eq: [{ $ifNull: ["$deleted_at", null] }, null] },
                                        {
                                            $not: [{
                                                $in: [
                                                    "$$readerAccountId",
                                                    {
                                                        $map: {
                                                            input: { $ifNull: ["$read_by", []] },
                                                            as: "reader",
                                                            in: "$$reader.account_id",
                                                        },
                                                    },
                                                ],
                                            }],
                                        },
                                    ],
                                },
                            },
                        },
                        { $count: "count" },
                    ],
                    as: "unreadMessages",
                },
            },
            {
                $set: {
                    unread_count: {
                        $ifNull: [
                            { $arrayElemAt: ["$unreadMessages.count", 0] },
                            0,
                        ],
                    },
                },
            },
            {
                $project: { latestMessage: 0, unreadMessages: 0 }
            },
            {
                $sort: { last_message_time: -1, updated_at: -1 }
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
        const firstAccountId = String(accountId1);
        const secondAccountId = String(accountId2);
        const requestedMembers = firstAccountId === secondAccountId
            ? [firstAccountId]
            : [firstAccountId, secondAccountId];
        const inbox = await InboxCollection.findOne({
            conversation_type,
            deleted_at: null,
            members: {
                $all: requestedMembers.map((accountId) => ({
                    $elemMatch: {
                        account_id: accountId,
                        status: { $nin: ['left', 'removed'] },
                    },
                })),
            },
            ...(conversation_type === 'direct' && {
                $expr: {
                    $eq: [
                        {
                            $size: {
                                $filter: {
                                    input: '$members',
                                    as: 'member',
                                    cond: {
                                        $not: [{
                                            $in: [
                                                { $ifNull: ['$$member.status', 'active'] },
                                                ['left', 'removed'],
                                            ],
                                        }],
                                    },
                                },
                            },
                        },
                        firstAccountId === secondAccountId ? 1 : 2,
                    ],
                },
            }),
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
    createReplyRepositories,
    getMessageByIdRepositories,
    updateMessageRepositories,
    editMessageRepositories,
    deleteMessageRepositories,
    setMessageReactionRepositories,
    removeMessageReactionRepositories,
    markConversationMessagesReadRepositories,
    updateInboxRepositories,
    deleteInboxRepositories,
    getInboxByIdRepositories,
    getInboxByContextRepositories,
    getInboxMembersRepositories,
    addInboxMemberRepositories,
    updateInboxMemberRepositories,
    removeInboxMemberRepositories,
    pinMessageRepositories,
    unpinMessageRepositories,
    refreshLatestMessagePreview,
    getConversationByConvoId,
    checkInboxExists,
    getInboxByAccountId,
    getInboxByTwoAccountIds
}
