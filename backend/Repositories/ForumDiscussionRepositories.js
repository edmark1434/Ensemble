const { getMongoClient,getDB } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const db = getDB();
async function createForumDiscussionRepositories(discussionPayload = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.insertOne(discussionPayload);
        return result.insertedId;
    } catch (err) {
        console.error('Error creating forum discussion:', err);
        throw err;
    }
}

async function getForumDiscussionByGroupId(groupId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        return await forumDiscussionsCollection.find({ forum_group_id: groupId }).sort({ created_at: -1 }).toArray();
    } catch (err) {
        console.error('Error fetching forum discussion by group ID:', err);
        throw err;
    }
}

async function getForumDiscussionById(discussionId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        return await forumDiscussionsCollection.findOne({ _id: new ObjectId(discussionId) });
    } catch (err) {
        console.error('Error fetching forum discussion by ID:', err);
        throw err;
    }
}

async function getForumDiscussionsByUserId(userId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        return await forumDiscussionsCollection.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
    } catch (err) {
        console.error('Error fetching forum discussions by user ID:', err);
        throw err;
    }
}

async function updateForumDiscussion(discussionId, updateFields = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            { _id: new ObjectId(discussionId) },
            updateFields
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error updating forum discussion:', err);
        throw err;
    }
}

async function updateForumDiscussionComments({ discussionId, commentId, updateFields = {} }) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            { _id: new ObjectId(discussionId), 'comments.comment_id': commentId,},
            updateFields
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error updating forum discussion comments:', err);
        throw err;
    }
}

async function addForumDiscussionCommentRepository(discussionId, commentPayload = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            { _id: new ObjectId(discussionId) },
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

async function getForumDiscussionByDiscussionIdAndCommentId(discussionId, commentId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const discussion = await forumDiscussionsCollection.findOne(
            { 'comments.user_id': userId, 'comments.comment_id': commentId }
        );
        return discussion;
    } catch (err) {
        console.error('Error fetching forum discussion by user ID and comment ID:', err);
        throw err;
    }
}

async function getForumDiscussionSavedByUserId(userId) {
    try{
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.find({ 'saves.user_id': userId }).sort({created_at: -1}).toArray();
        return result;
    }catch(err){
        console.error('Error fetching forum discussions saved by user ID:', err);
        throw err;
    }
}

async function deleteForumDiscussion(discussionId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.deleteOne({ _id: new ObjectId(discussionId) });
        return result.deletedCount > 0;
    } catch (err) {
        console.error('Error deleting forum discussion:', err);
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
    getForumDiscussionByDiscussionIdAndCommentId,
    getForumDiscussionSavedByUserId,
    deleteForumDiscussion,
}
