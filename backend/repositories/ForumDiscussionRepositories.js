const { getMongoClient, getDB } = require('../lib/MongoDb');
const { ObjectId } = require('mongodb');
// Lazy proxy so requiring this module does not touch MongoDB at import time.
const db = new Proxy({}, {
    get(_target, prop) {
        const realDb = getDB();
        const value = realDb[prop];
        return typeof value === 'function' ? value.bind(realDb) : value;
    }
});

function activeDiscussionFilter(filter = {}) {
    return {
        ...filter,
        deleted_at: null,
        $or: [
            { status: { $exists: false } },
            { status: 'active' },
        ],
    };
}

function feedScoreExpression(type) {
    const likes = { $size: { $ifNull: ['$likes', []] } };
    const comments = { $size: { $ifNull: ['$comments', []] } };
    const saves = { $size: { $ifNull: ['$saves', []] } };
    const engagement = {
        $add: [
            { $multiply: [likes, 3] },
            { $multiply: [comments, 2] },
            saves,
        ],
    };

    if (type === 'trending' || type === 'popular') return engagement;
    if (type === 'hot') {
        return {
            $add: [
                { $log10: { $max: [engagement, 1] } },
                { $divide: [{ $toLong: '$created_at' }, 45000000] },
            ],
        };
    }
    return { $toLong: '$created_at' };
}

async function getPaginatedForumDiscussions({
    filter = {},
    type = 'latest',
    cursor = null,
    limit = 10,
} = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const pipeline = [
            {
                $match: {
                    $and: [
                        filter,
                        { deleted_at: null },
                        {
                            $or: [
                                { status: { $exists: false } },
                                { status: 'active' },
                            ],
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'forum_groups',
                    let: { groupId: '$forum_group_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: [{ $toString: '$_id' }, { $toString: '$$groupId' }] } } },
                        { $match: { status: 'active', deleted_at: null } },
                    ],
                    as: '_activeGroup',
                },
            },
            { $match: { '_activeGroup.0': { $exists: true } } },
            {
                $addFields: {
                    _feedSticky: type === 'popular'
                        ? 0
                        : { $cond: [{ $eq: ['$is_sticky', true] }, 1, 0] },
                    _feedSort: feedScoreExpression(type),
                },
            },
        ];

        if (cursor) {
            pipeline.push({
                $match: {
                    $or: [
                        { _feedSticky: { $lt: cursor.sticky } },
                        { _feedSticky: cursor.sticky, _feedSort: { $lt: cursor.value } },
                        {
                            _feedSticky: cursor.sticky,
                            _feedSort: cursor.value,
                            _id: { $lt: new ObjectId(cursor.id) },
                        },
                    ],
                },
            });
        }

        pipeline.push(
            { $sort: { _feedSticky: -1, _feedSort: -1, _id: -1 } },
            { $limit: limit + 1 }
        );

        const rows = await forumDiscussionsCollection.aggregate(pipeline).toArray();
        const hasMore = rows.length > limit;
        return {
            discussions: hasMore ? rows.slice(0, limit) : rows,
            hasMore,
        };
    } catch (err) {
        console.error('Error fetching paginated forum discussions:', err);
        throw err;
    }
}

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
        return await forumDiscussionsCollection
            .find(activeDiscussionFilter({ forum_group_id: groupId }))
            .sort({ created_at: -1 })
            .toArray();
    } catch (err) {
        console.error('Error fetching forum discussion by group ID:', err);
        throw err;
    }
}

async function getForumDiscussionById(discussionId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        return await forumDiscussionsCollection.findOne(
            activeDiscussionFilter({ _id: new ObjectId(discussionId) })
        );
    } catch (err) {
        console.error('Error fetching forum discussion by ID:', err);
        throw err;
    }
}

async function getForumDiscussionsByUserId(userId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        return await forumDiscussionsCollection
            .find(activeDiscussionFilter({ user_id: userId }))
            .sort({ created_at: -1 })
            .toArray();
    } catch (err) {
        console.error('Error fetching forum discussions by user ID:', err);
        throw err;
    }
}

async function updateForumDiscussion(discussionId, updateFields = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            activeDiscussionFilter({ _id: new ObjectId(discussionId) }),
            updateFields
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return await getForumDiscussionById(discussionId);
    } catch (err) {
        console.error('Error updating forum discussion:', err);
        throw err;
    }
}

async function updateForumDiscussionComments({ discussionId, commentId, updateFields = {} }) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            activeDiscussionFilter({
                _id: new ObjectId(discussionId),
                'comments.comment_id': commentId,
            }),
            updateFields
        );
        if (result.matchedCount === 0) {
            return null;
        }
        return await getForumDiscussionById(discussionId);
    } catch (err) {
        console.error('Error updating forum discussion comments:', err);
        throw err;
    }
}

async function addForumDiscussionCommentRepository(discussionId, commentPayload = {}) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            activeDiscussionFilter({ _id: new ObjectId(discussionId) }),
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

async function softDeleteForumDiscussionComment(discussionId, commentId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            activeDiscussionFilter({
                _id: new ObjectId(discussionId),
                'comments.comment_id': commentId,
            }),
            {
                $set: {
                    'comments.$.comment': '[deleted]',
                    'comments.$.attachments': [],
                    'comments.$.deleted_at': new Date(),
                    'comments.$.updated_at': new Date(),
                    updated_at: new Date(),
                },
            }
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error soft deleting forum discussion comment:', err);
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
        const result = await forumDiscussionsCollection
            .find(activeDiscussionFilter({ 'saves.user_id': userId }))
            .sort({created_at: -1})
            .toArray();
        return result;
    }catch(err){
        console.error('Error fetching forum discussions saved by user ID:', err);
        throw err;
    }
}

async function deleteForumDiscussion(discussionId) {
    try {
        const forumDiscussionsCollection = db.collection('forum_discussions');
        const result = await forumDiscussionsCollection.updateOne(
            activeDiscussionFilter({ _id: new ObjectId(discussionId) }),
            {
                $set: {
                    deleted_at: new Date(),
                    updated_at: new Date(),
                },
            }
        );
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error deleting forum discussion:', err);
        throw err;
    }
}

module.exports = {
    createForumDiscussionRepositories,
    getPaginatedForumDiscussions,
    getForumDiscussionByGroupId,
    getForumDiscussionById,
    getForumDiscussionsByUserId,
    updateForumDiscussion,
    updateForumDiscussionComments,
    addForumDiscussionCommentRepository,
    softDeleteForumDiscussionComment,
    getForumDiscussionByDiscussionIdAndCommentId,
    getForumDiscussionSavedByUserId,
    deleteForumDiscussion,
}
