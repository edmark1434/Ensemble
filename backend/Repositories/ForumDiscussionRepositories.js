const { client } = require('../lib/mongodb');

const db = client.db('ensemble');
const forumDiscussionsCollection = db.collection('forum_discussions');
async function createForumDiscussionRepositories(discussionPayload = {}) {
    try {
        const result = await forumDiscussionsCollection.insertOne(discussionPayload);
        return result.insertedId;
    } catch (err) {
        console.error('Error creating forum discussion:', err);
        throw err;
    }
}

async function getForumDiscussionByGroupId(groupId) {
    try {
        return await forumDiscussionsCollection.findOne({ forum_group_id: groupId });
    } catch (err) {
        console.error('Error fetching forum discussion by group ID:', err);
        throw err;
    }
}

async function getForumDiscussionById(discussionId) {
    try {
        return await forumDiscussionsCollection.findOne({ _id: discussionId });
    } catch (err) {
        console.error('Error fetching forum discussion by ID:', err);
        throw err;
    }
}

async function getForumDiscussionsByUserId(userId) {
    try {
        return await forumDiscussionsCollection.find({ user_id: userId }).toArray();
    } catch (err) {
        console.error('Error fetching forum discussions by user ID:', err);
        throw err;
    }
}

async function updateForumDiscussion(discussionId, updateFields = {}) { 
    try {
        const result = await forumDiscussionsCollection.updateOne(
            { _id: discussionId },
            { $set: updateFields }
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error updating forum discussion:', err);
        throw err;
    }
}

async function updateForumDiscussionComments({ discussionId, commentId, userId, updateFields = {} }) {
    try {
        const result = await forumDiscussionsCollection.updateOne(
            { _id: discussionId, 'comments.comment_id': commentId, 'comments.user_id': userId },
            { $set: updateFields }
        );
        return result.modifiedCount > 0;
    } catch (err) { 
        console.error('Error updating forum discussion comments:', err);
        throw err;
    }
}

async function addForumDiscussionCommentRepository(discussionId, commentPayload = {}) {
    try {
        const result = await forumDiscussionsCollection.updateOne(
            { _id: discussionId },
            {
                $push: { comments: commentPayload },
                $set: { updated_at: new Date() },
            }
        );

        return result.modifiedCount > 0 ? commentPayload : null;
    } catch (err) {
        console.error('Error adding forum discussion comment:', err);
        throw err;
    }
}


module.exports = {
    createForumDiscussionRepositories,
    getForumDiscussionByGroupId,
    getForumDiscussionById,
    getForumDiscussionsByUserId,
    updateForumDiscussion,
    updateForumDiscussionComments,
    addForumDiscussionCommentRepository,
}