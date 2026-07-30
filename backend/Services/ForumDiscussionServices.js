const {
    createForumDiscussionRepositories,
    getPaginatedForumDiscussions,
    getForumDiscussionByGroupId: getForumDiscussionByGroupIdRepository,
    getForumDiscussionById: getForumDiscussionByIdRepository,
    getForumDiscussionsByUserId: getForumDiscussionsByUserIdRepository,
    updateForumDiscussion,
    updateForumDiscussionComments,
    addForumDiscussionCommentRepository,
    softDeleteForumDiscussionComment,
    getForumDiscussionByDiscussionIdAndCommentId,
    getForumDiscussionSavedByUserId,
    deleteForumDiscussion,
} = require('../Repositories/ForumDiscussionRepositories');
const { lazyCollection } = require('../lib/mongodb');
const { ObjectId } = require('mongodb');
const { getForumGroupById } = require('../Repositories/ForumGroupRepositories');
const { randomUUID } = require('crypto');
const { emitForumEvent, getIo } = require('../lib/websocket');
const { createNotificationServices } = require('./NotificationServices');
const { getAccountByHandle } = require('../Repositories/AccountRepositories');
const { getUserById } = require('../Repositories/UserRepositories');

const forumDiscussionsCollection = lazyCollection('forum_discussions');

function extractMentionHandles(content) {
    const handles = new Set();
    const mentionPattern = /(?:^|[\s(])@([a-zA-Z0-9_]{1,50})\b/g;
    let match;
    while ((match = mentionPattern.exec(content)) !== null && handles.size < 10) {
        handles.add(match[1].toLowerCase());
    }
    return [...handles];
}

async function persistForumNotification(notificationData) {
    try {
        const notification = await createNotificationServices(notificationData);
        try {
            getIo().to(notification.account_id).emit('notification', notification);
        } catch (_error) {
            // PostgreSQL persistence remains authoritative when Socket.IO is unavailable.
        }
        return notification;
    } catch (error) {
        console.error('Error creating forum notification:', error);
        return null;
    }
}

async function createForumCommentNotifications({
    actorId,
    discussion,
    parentComment,
    comment,
}) {
    const actor = await getUserById(actorId);
    if (!actor) return;

    const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ') || 'Someone';
    const notifiedAccountIds = new Set([String(actor.account_id)]);
    const referencePath = `/forums/discussion/${discussion._id}`;
    const commonData = {
        is_read: false,
        reference_table: 'forum_discussions',
        reference_prefix: parentComment ? 'FORUM_REPLY' : 'FORUM_COMMENT',
        reference_path: referencePath,
        reference_id: comment.comment_id,
    };
    const primaryRecipientId = parentComment?.user_id ?? discussion.user_id;

    if (primaryRecipientId && String(primaryRecipientId) !== String(actorId)) {
        const notification = await persistForumNotification({
            ...commonData,
            user_id: primaryRecipientId,
            message: parentComment
                ? `${actorName} replied to your comment.`
                : `${actorName} commented on your discussion "${discussion.title}".`,
        });
        if (notification?.account_id) {
            notifiedAccountIds.add(String(notification.account_id));
        }
    }

    for (const handle of extractMentionHandles(comment.comment)) {
        try {
            const account = await getAccountByHandle(handle);
            if (!account || notifiedAccountIds.has(String(account.account_id))) continue;

            const notification = await persistForumNotification({
                ...commonData,
                account_id: account.account_id,
                reference_prefix: 'FORUM_MENTION',
                message: `${actorName} mentioned you in a forum ${parentComment ? 'reply' : 'comment'}.`,
            });
            if (notification?.account_id) {
                notifiedAccountIds.add(String(notification.account_id));
            }
        } catch (error) {
            console.error(`Error resolving forum mention @${handle}:`, error);
        }
    }
}

async function createForumReactionNotification({ actorId, targetUserId, discussion, commentId, kind }) {
    if (!targetUserId || String(actorId) === String(targetUserId)) return;
    const actor = await getUserById(actorId);
    if (!actor) return;
    const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ') || 'Someone';
    const targetLabel = commentId ? 'comment' : 'discussion';
    await persistForumNotification({
        user_id: targetUserId,
        message: `${actorName} ${kind === 'save' ? 'saved' : 'liked'} your forum ${targetLabel}.`,
        is_read: false,
        reference_table: 'forum_discussions',
        reference_prefix: kind === 'save' ? 'FORUM_SAVE' : 'FORUM_LIKE',
        reference_path: `/forums/discussion/${discussion._id}`,
        reference_id: commentId || String(discussion._id),
    });
}

const discussionPayload = {
    forum_group_id: null,
    user_id: null,
    title: null,
    description: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    tags: [],
    attachments: [],
    likes: [],
    saves: [],
    comments: [
        {
            user_id: null,
            comment: null,
            comment_id: null,
            comment_reference_id: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            attachments: [],
            likes: [
                { user_id: null },
            ],
        },
    ],
};

function isValidDateValue(value) {
    if (value == null) {
        return true;
    }

    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

function discussionValidation(payload = {}) {
    const errors = [];

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            valid: false,
            errors: ['discussion payload must be an object'],
        };
    }

    const {
        forum_group_id,
        user_id,
        title,
        content,
        description,
        created_at,
        updated_at,
        deleted_at,
        tags,
        attachments,
        likes,
        saves,
        comments,
        imageKeys,
    } = payload;

    if (forum_group_id == null || forum_group_id === '') {
        errors.push('forum_group_id is required');
    }

    if (user_id == null || user_id === '') {
        errors.push('user_id is required');
    }

    if (typeof title !== 'string' || title.trim() === '') {
        errors.push('title is required');
    }

    if (typeof content !== 'string' || content.trim() === '') {
        errors.push('content is required');
    }

    if (description != null && typeof description !== 'string') {
        errors.push('description must be a string');
    }

    if (imageKeys != null && (
        !Array.isArray(imageKeys)
        || imageKeys.some((key) => typeof key !== 'string' || key.trim() === '')
    )) {
        errors.push('imageKeys must be an array of S3 object keys');
    }

    if (!isValidDateValue(created_at)) {
        errors.push('created_at must be a valid date');
    }

    if (!isValidDateValue(updated_at)) {
        errors.push('updated_at must be a valid date');
    }

    if (!isValidDateValue(deleted_at)) {
        errors.push('deleted_at must be a valid date or null');
    }

    if (tags != null && !Array.isArray(tags)) {
        errors.push('tags must be an array');
    } else if (Array.isArray(tags)) {
        tags.forEach((tag, index) => {
            if (!tag || typeof tag !== 'object' || Array.isArray(tag)) {
                errors.push(`tags[${index}] must be an object`);
                return;
            }

            if (tag.tag_id == null || tag.tag_id === '') {
                errors.push(`tags[${index}].tag_id is required`);
            }
            if (tag.tag_name == null || tag.tag_name === '') {
                errors.push(`tags[${index}].tag_name is required`);
            }
        });
    }

    if (attachments != null && !Array.isArray(attachments)) {
        errors.push('attachments must be an array');
    } else if (Array.isArray(attachments)) {
        attachments.forEach((attachment, index) => {
            if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
                errors.push(`attachments[${index}] must be an object`);
                return;
            }

            if (typeof attachment.file_path !== 'string' || attachment.file_path.trim() === '') {
                errors.push(`attachments[${index}].file_path is required`);
            }
        });
    }

    if (likes != null && !Array.isArray(likes)) {
        errors.push('likes must be an array');
    } else if (Array.isArray(likes)) {
        likes.forEach((like, index) => {
            if (!like || typeof like !== 'object' || Array.isArray(like)) {
                errors.push(`likes[${index}] must be an object`);
                return;
            }

            if (like.user_id == null || like.user_id === '') {
                errors.push(`likes[${index}].user_id is required`);
            }
        });
    }

    if (saves != null && !Array.isArray(saves)) {
        errors.push('saves must be an array');
    } else if (Array.isArray(saves)) {
        saves.forEach((save, index) => {
            if (!save || typeof save !== 'object' || Array.isArray(save)) {
                errors.push(`saves[${index}] must be an object`);
                return;
            }

            if (save.user_id == null || save.user_id === '') {
                errors.push(`saves[${index}].user_id is required`);
            }
        });
    }

    if (comments != null && !Array.isArray(comments)) {
        errors.push('comments must be an array');
    } else if (Array.isArray(comments)) {
        comments.forEach((commentItem, commentIndex) => {
            if (!commentItem || typeof commentItem !== 'object' || Array.isArray(commentItem)) {
                errors.push(`comments[${commentIndex}] must be an object`);
                return;
            }

            if (commentItem.user_id == null || commentItem.user_id === '') {
                errors.push(`comments[${commentIndex}].user_id is required`);
            }

            if (typeof commentItem.comment !== 'string' || commentItem.comment.trim() === '') {
                errors.push(`comments[${commentIndex}].comment is required`);
            }

            if (
                commentItem.comment_id != null
                && commentItem.comment_id !== ''
                && typeof commentItem.comment_id !== 'string'
                && typeof commentItem.comment_id !== 'number'
            ) {
                errors.push(`comments[${commentIndex}].comment_id must be a string, number, or null`);
            }

            if (
                commentItem.comment_reference_id != null
                && commentItem.comment_reference_id !== ''
                && typeof commentItem.comment_reference_id !== 'string'
                && typeof commentItem.comment_reference_id !== 'number'
            ) {
                errors.push(`comments[${commentIndex}].comment_reference_id must be a string, number, or null`);
            }

            if (!isValidDateValue(commentItem.created_at)) {
                errors.push(`comments[${commentIndex}].created_at must be a valid date`);
            }

            if (!isValidDateValue(commentItem.updated_at)) {
                errors.push(`comments[${commentIndex}].updated_at must be a valid date`);
            }

            if (!isValidDateValue(commentItem.deleted_at)) {
                errors.push(`comments[${commentIndex}].deleted_at must be a valid date or null`);
            }

            if (commentItem.attachments != null && !Array.isArray(commentItem.attachments)) {
                errors.push(`comments[${commentIndex}].attachments must be an array`);
            } else if (Array.isArray(commentItem.attachments)) {
                commentItem.attachments.forEach((attachment, attachmentIndex) => {
                    if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
                        errors.push(`comments[${commentIndex}].attachments[${attachmentIndex}] must be an object`);
                        return;
                    }

                    if (typeof attachment.file_path !== 'string' || attachment.file_path.trim() === '') {
                        errors.push(`comments[${commentIndex}].attachments[${attachmentIndex}].file_path is required`);
                    }
                });
            }

            if (commentItem.likes != null && !Array.isArray(commentItem.likes)) {
                errors.push(`comments[${commentIndex}].likes must be an array`);
            } else if (Array.isArray(commentItem.likes)) {
                commentItem.likes.forEach((like, likeIndex) => {
                    if (!like || typeof like !== 'object' || Array.isArray(like)) {
                        errors.push(`comments[${commentIndex}].likes[${likeIndex}] must be an object`);
                        return;
                    }

                    if (like.user_id == null || like.user_id === '') {
                        errors.push(`comments[${commentIndex}].likes[${likeIndex}].user_id is required`);
                    }
                });
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

function getActorId(session = {}) {
    return session.userId || session.account_id || null;
}

function isStaffModerator(session = {}) {
    return session.type === 'Staff'
        && ['Admin', 'Forum Moderator'].includes(session.role);
}

function hasGroupManagementRole(group, actorId) {
    return group?.members?.some((member) =>
        String(member.userId) === String(actorId)
        && !member.is_banned
        && ['Admin', 'Moderator'].includes(member.role)
    );
}

async function requireActiveGroupMember(groupId, actorId) {
    if (!ObjectId.isValid(groupId)) {
        throw new Error('forum_group_id must be a valid MongoDB ObjectId');
    }

    const group = await getForumGroupById(groupId);
    if (!group || group.deleted_at || group.status !== 'active') {
        throw new Error('Forum group not found or inactive');
    }

    const isMember = group.members?.some(
        (member) => String(member.userId) === String(actorId) && !member.is_banned
    );
    if (!isMember) {
        throw new Error('You must be a group member to create a discussion');
    }

    return group;
}

async function requireDiscussionManager(discussion, session) {
    const actorId = getActorId(session);
    if (!actorId) {
        throw new Error('Authenticated user is required');
    }

    if (String(discussion.user_id) === String(actorId) || isStaffModerator(session)) {
        return actorId;
    }

    const group = await getForumGroupById(discussion.forum_group_id);
    if (hasGroupManagementRole(group, actorId)) {
        return actorId;
    }

    throw new Error('Not authorized to modify this discussion');
}

async function createForumDiscussionServices(discussionPayload, session = {}) {
    const actorId = getActorId(session);
    if (!actorId) {
        throw new Error('Authenticated user is required');
    }

    await requireActiveGroupMember(discussionPayload.forum_group_id, actorId);

    const normalizedPayload = {
        ...discussionPayload,
        user_id: actorId,
        content: discussionPayload.content ?? discussionPayload.description ?? '',
        imageKeys: Array.isArray(discussionPayload.imageKeys)
            ? discussionPayload.imageKeys
            : [],
    };
    delete normalizedPayload.description;
    delete normalizedPayload.images;

    const validationResult = discussionValidation(normalizedPayload);

    if (!validationResult.valid) {
        throw new Error(`Invalid discussion payload: ${validationResult.errors.join(', ')}`);
    }

    const createdDiscussion = {
        ...normalizedPayload,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        attachments: Array.isArray(normalizedPayload.attachments) ? normalizedPayload.attachments : [],
        tags: Array.isArray(normalizedPayload.tags) ? normalizedPayload.tags : [],
        likes: [],
        saves: [],
        comments: [],
    };
    const insertedId = await createForumDiscussionRepositories(createdDiscussion);
    const discussion = { ...createdDiscussion, _id: insertedId };
    emitForumEvent('discussion.created', {
        groupId: String(discussion.forum_group_id),
        discussionId: String(insertedId),
        discussion,
    });
    return discussion;
}

async function getForumDiscussionByGroupId(groupId) {
    if (!groupId) {
        throw new Error('groupId is required');
    }

    return await getForumDiscussionByGroupIdRepository(groupId);
}

const FEED_TYPES = new Set(['latest', 'trending', 'hot']);

function decodeFeedCursor(cursor) {
    if (!cursor) return null;
    try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (
            ![0, 1].includes(decoded.sticky)
            ||
            typeof decoded.value !== 'number'
            || !Number.isFinite(decoded.value)
            || !ObjectId.isValid(decoded.id)
        ) {
            throw new Error();
        }
        return decoded;
    } catch (_error) {
        throw new Error('Invalid pagination cursor');
    }
}

function encodeFeedCursor(discussion) {
    if (!discussion) return null;
    return Buffer.from(JSON.stringify({
        sticky: discussion._feedSticky,
        value: discussion._feedSort,
        id: String(discussion._id),
    })).toString('base64url');
}

async function getForumDiscussionFeedServices({
    type = 'latest',
    cursor,
    limit,
    groupIds,
    userId,
    savedByUserId,
} = {}) {
    const normalizedType = String(type).toLowerCase();
    if (!FEED_TYPES.has(normalizedType)) {
        throw new Error('Feed type must be latest, trending, or hot');
    }

    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
    const filter = {};
    if (Array.isArray(groupIds) && groupIds.length) {
        filter.forum_group_id = { $in: groupIds.map(String) };
    }
    if (userId) filter.user_id = userId;
    if (savedByUserId) filter['saves.user_id'] = savedByUserId;

    const result = await getPaginatedForumDiscussions({
        filter,
        type: normalizedType,
        cursor: decodeFeedCursor(cursor),
        limit: normalizedLimit,
    });
    const discussions = result.discussions.map((discussion) => {
        const { _feedSort, _feedSticky, _activeGroup, ...publicDiscussion } = discussion;
        return publicDiscussion;
    });
    const lastDiscussion = result.discussions[result.discussions.length - 1];

    return {
        discussions,
        pagination: {
            nextCursor: result.hasMore ? encodeFeedCursor(lastDiscussion) : null,
            hasMore: result.hasMore,
        },
    };
}

async function getForumDiscussionByGroupIdPaginated(groupId, options = {}) {
    if (!groupId) throw new Error('groupId is required');
    return getForumDiscussionFeedServices({ ...options, groupIds: [groupId] });
}

async function getForumDiscussionByIdServices(discussionId) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) return null;
    const group = await getForumGroupById(discussion.forum_group_id);
    return group ? discussion : null;
}

async function getForumDiscussionsByUserIdServices(userId, options = {}) {
    if (!userId) {
        throw new Error('userId is required');
    }
    return getForumDiscussionFeedServices({
        userId,
        type: options.type,
        cursor: options.cursor,
        limit: options.limit,
    });
}

async function updateForumDiscussionServices(discussionId, payload = {}, session = {}) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }
    
    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) {
        throw new Error('Discussion not found');
    }
    
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('update payload must be an object');
    }

    const setFields = {};
    const pushFields = {};
    const pullFields = {};
    const addToSetFields = {};
    const actorId = getActorId(session);
    const contentFields = ['title', 'content', 'description', 'tags', 'images', 'imageKeys'];
    const changesContent = Object.keys(payload).some((field) => contentFields.includes(field));

    if (changesContent) {
        await requireDiscussionManager(discussion, session);
    }

    if (payload.title != null && (
        typeof payload.title !== 'string'
        || payload.title.trim() === ''
    )) {
        throw new Error('title must be a non-empty string');
    }
    const nextContent = payload.content ?? payload.description;
    if (nextContent != null && (
        typeof nextContent !== 'string'
        || nextContent.trim() === ''
    )) {
        throw new Error('content must be a non-empty string');
    }
    if (payload.imageKeys != null && (
        !Array.isArray(payload.imageKeys)
        || payload.imageKeys.some((key) => typeof key !== 'string' || key.trim() === '')
    )) {
        throw new Error('imageKeys must be an array of S3 object keys');
    }

    // Process each field
    for (const [field, value] of Object.entries(payload)) {
        
        // Handle LIKES - toggle add/remove
        if (field === 'likes') {
            if (!actorId) throw new Error('Authenticated user is required');
            if (value.action === 'remove') {
                pullFields.likes = { user_id: actorId };
            } else {
                const alreadyLiked = discussion.likes?.some(like => String(like.user_id) === String(actorId));
                if (!alreadyLiked) {
                    pushFields.likes = { 
                        user_id: actorId,
                        created_at: new Date() 
                    };
                }
            }
        }
        
        // Handle SAVES - toggle add/remove
        else if (field === 'saves') {
            if (!actorId) throw new Error('Authenticated user is required');
            if (value.action === 'remove') {
                pullFields.saves = { user_id: actorId };
            } else {
                const alreadySaved = discussion.saves?.some(save => String(save.user_id) === String(actorId));
                if (!alreadySaved) {
                    pushFields.saves = { 
                        user_id: actorId,
                        created_at: new Date() 
                    };
                }
            }
        }
        
        // Handle TAGS - add/remove/replace
        else if (field === 'tags') {
            if (value.action === 'remove' && value.tag_id) {
                pullFields.tags = { tag_id: value.tag_id };
            } else if (value.action === 'remove-multiple' && Array.isArray(value.tag_ids)) {
                pullFields.tags = { tag_id: { $in: value.tag_ids } };
            } else if (value.action === 'add' && value.tag) {
                addToSetFields.tags = value.tag;
            } else if (Array.isArray(value)) {
                setFields.tags = value;
            } else if (value.tag_id && value.tag_name) {
                addToSetFields.tags = value;
            }
        }
        
        // Handle ATTACHMENTS - add/remove
        else if (field === 'images') {
            if (value.action === 'remove' && value.file_path) {
                pullFields.attachments = { file_path: value.file_path };
            } else if (value.action === 'remove-multiple' && Array.isArray(value.file_paths)) {
                pullFields.attachments = { file_path: { $in: value.file_paths } };
            } else if (Array.isArray(value)) {
                pushFields.attachments = { 
                    $each: value.map(att => ({
                        ...att,
                        uploaded_at: new Date()
                    }))
                };
            } else if (value.file_path) {
                pushFields.attachments = {
                    ...value,
                    uploaded_at: new Date()
                };
            }
        }

        else if (field === 'imageKeys' && Array.isArray(value)) {
            setFields.imageKeys = value;
        }
        
        // Handle COMMENTS - remove and edit
        else if (field === 'comments') {
            throw new Error('Use the authenticated comment endpoint for comment updates');
            
            // FIXED: Remove a comment (hard delete - completely remove from array)
            if (value.action === 'remove' && value.comment_id) {
                // Use $pull to remove the comment completely
                const result = await forumDiscussionsCollection.updateOne(
                    { _id: new ObjectId(discussionId) },
                    { $pull: { comments: { comment_id: value.comment_id } } }
                );
                console.log(`Remove comment result:`, result);
                console.log(`Removed ${result.modifiedCount} comment(s)`);
                continue;
            }
            
            // FIXED: Soft delete (mark as deleted but keep in array)
            else if (value.action === 'soft-delete' && value.comment_id) {
                const result = await forumDiscussionsCollection.updateOne(
                    { 
                        _id: new ObjectId(discussionId),
                        "comments.comment_id": value.comment_id
                    },
                    {
                        $set: {
                            "comments.$.deleted_at": new Date(),
                            "comments.$.comment": "[deleted]",
                            "comments.$.updated_at": new Date()
                        }
                    }
                );
                console.log(`Soft delete result:`, result);
                continue;
            }
            
            // Hard delete (completely remove from array) - same as remove
            else if (value.action === 'hard-delete' && value.comment_id) {
                const result = await forumDiscussionsCollection.updateOne(
                    { _id: new ObjectId(discussionId) },
                    { $pull: { comments: { comment_id: value.comment_id } } }
                );
                console.log(`Hard delete result:`, result);
                continue;
            }
            
            // FIXED: Remove all comments by a user
            else if (value.action === 'remove-by-user' && value.user_id) {
                const result = await forumDiscussionsCollection.updateOne(
                    { _id: new ObjectId(discussionId) },
                    { $pull: { comments: { user_id: value.user_id } } }
                );
                console.log(`Removed ${result.modifiedCount} comments by user ${value.user_id}`);
                continue;
            }
            
            // Edit/Update a comment
            else if (value.action === 'edit' && value.comment_id && value.comment) {
                const commentToEdit = discussion.comments?.find(c => c.comment_id === value.comment_id);
                if (!commentToEdit) {
                    throw new Error('Comment not found');
                }
                
                if (commentToEdit.user_id !== value.user_id && !value.isAdmin) {
                    throw new Error('Not authorized to edit this comment');
                }
                
                if (commentToEdit.deleted_at) {
                    throw new Error('Cannot edit deleted comment');
                }
                
                const result = await forumDiscussionsCollection.updateOne(
                    { 
                        _id: new ObjectId(discussionId),
                        "comments.comment_id": value.comment_id
                    },
                    {
                        $set: {
                            "comments.$.comment": value.comment,
                            "comments.$.updated_at": new Date(),
                            "comments.$.is_edited": true
                        }
                    }
                );
                console.log(`Edit result:`, result);
                continue;
            }
            
            // Like/Unlike a comment
            else if (value.action === 'like' && value.comment_id && value.user_id) {
                const comment = discussion.comments?.find(c => c.comment_id === value.comment_id);
                const alreadyLiked = comment?.likes?.some(like => like.user_id === value.user_id);
                
                if (alreadyLiked) {
                    await forumDiscussionsCollection.updateOne(
                        { 
                            _id: new ObjectId(discussionId),
                            "comments.comment_id": value.comment_id
                        },
                        {
                            $pull: {
                                "comments.$.likes": { user_id: value.user_id }
                            }
                        }
                    );
                } else {
                    await forumDiscussionsCollection.updateOne(
                        { 
                            _id: new ObjectId(discussionId),
                            "comments.comment_id": value.comment_id
                        },
                        {
                            $push: {
                                "comments.$.likes": { user_id: value.user_id, created_at: new Date() }
                            }
                        }
                    );
                }
                continue;
            }
        }
        
        // Handle regular fields
        else if (field === 'content' || field === 'description') {
            setFields.content = value;
        }
        else if (field === 'title') {
            setFields.title = value;
        }
    }

    // Always update the timestamp
    setFields.updated_at = new Date();

    // Build the update document
    const updateDoc = {};
    
    if (Object.keys(setFields).length > 0) {
        updateDoc.$set = setFields;
    }
    
    if (Object.keys(pushFields).length > 0) {
        updateDoc.$push = pushFields;
    }
    
    if (Object.keys(pullFields).length > 0) {
        updateDoc.$pull = pullFields;
    }
    
    if (Object.keys(addToSetFields).length > 0) {
        updateDoc.$addToSet = addToSetFields;
    }

    // If no operations, throw error
    if (Object.keys(updateDoc).length === 0) {
        throw new Error('No valid discussion fields provided for update');
    }

    console.log("Final updateDoc:", JSON.stringify(updateDoc, null, 2));
    
    // Update and return success status
    const updatedDiscussion = await updateForumDiscussion(discussionId, updateDoc);
    if (payload.likes && payload.likes.action !== 'remove'
        && !discussion.likes?.some((like) => String(like.user_id) === String(actorId))) {
        await createForumReactionNotification({
            actorId, targetUserId: discussion.user_id, discussion, kind: 'like',
        });
    }
    if (payload.saves && payload.saves.action !== 'remove'
        && !discussion.saves?.some((save) => String(save.user_id) === String(actorId))) {
        await createForumReactionNotification({
            actorId, targetUserId: discussion.user_id, discussion, kind: 'save',
        });
    }
    const eventPayload = {
        groupId: String(discussion.forum_group_id),
        discussionId: String(discussionId),
        discussion: updatedDiscussion,
        actorId,
    };
    if (payload.likes) {
        emitForumEvent('discussion.like_updated', eventPayload);
    }
    if (payload.saves) {
        emitForumEvent('discussion.save_updated', eventPayload);
    }
    if (!payload.likes && !payload.saves) {
        emitForumEvent('discussion.updated', eventPayload);
    }
    return updatedDiscussion;
}

function validateCommentAttachments(attachments) {
    if (attachments == null) return [];
    if (!Array.isArray(attachments)) {
        throw new Error('attachments must be an array');
    }

    return attachments.map((attachment) => {
        const filePath = attachment?.file_path;
        if (
            typeof filePath !== 'string'
            || filePath.trim() === ''
            || filePath.startsWith('blob:')
            || /^https?:\/\//i.test(filePath)
        ) {
            throw new Error('attachments must contain S3 object keys');
        }
        return { file_path: filePath };
    });
}

async function canManageComment(discussion, comment, session) {
    const actorId = getActorId(session);
    if (!actorId) {
        throw new Error('Authenticated user is required');
    }
    if (String(comment.user_id) === String(actorId)) {
        return true;
    }

    try {
        await requireDiscussionManager(discussion, session);
        return true;
    } catch (_error) {
        return false;
    }
}

async function updateForumDiscussionCommentsServices(payload = {}, session = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('update payload must be object');
    }

    const { discussionId, commentId } = payload;
    const actorId = getActorId(session);
    if (!discussionId) throw new Error('discussionId is required');
    if (!commentId) throw new Error('commentId is required');
    if (!actorId) throw new Error('Authenticated user is required');

    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) throw new Error('Discussion not found');
    if (payload.likes) {
        await requireActiveGroupMember(discussion.forum_group_id, actorId);
    }

    const commentToUpdate = discussion.comments?.find(
        (comment) => comment.comment_id === commentId
    );
    if (!commentToUpdate) throw new Error('Comment not found');

    if (payload.remove || payload.softDelete) {
        if (!await canManageComment(discussion, commentToUpdate, session)) {
            throw new Error('Not authorized to delete this comment');
        }
        if (commentToUpdate.deleted_at) {
            return { success: true, action: 'soft-deleted' };
        }

        const deleted = await softDeleteForumDiscussionComment(discussionId, commentId);
        const updatedDiscussion = deleted
            ? await getForumDiscussionByIdRepository(discussionId)
            : discussion;
        emitForumEvent(
            commentToUpdate.comment_reference_id ? 'reply.deleted' : 'comment.deleted',
            {
                groupId: String(discussion.forum_group_id),
                discussionId: String(discussionId),
                commentId,
                discussion: updatedDiscussion,
            }
        );
        return { success: deleted, action: 'soft-deleted' };
    }

    const updateDoc = { $set: { 'comments.$.updated_at': new Date() } };

    if (payload.comment) {
        if (!await canManageComment(discussion, commentToUpdate, session)) {
            throw new Error('Not authorized to edit this comment');
        }
        if (commentToUpdate.deleted_at) {
            throw new Error('Cannot edit deleted comment');
        }

        const nextComment = payload.comment.comment ?? payload.comment;
        if (typeof nextComment !== 'string' || nextComment.trim() === '') {
            throw new Error('comment must be a non-empty string');
        }
        updateDoc.$set['comments.$.comment'] = nextComment.trim();
        updateDoc.$set['comments.$.is_edited'] = true;
    }

    if (payload.attachments != null) {
        if (!await canManageComment(discussion, commentToUpdate, session)) {
            throw new Error('Not authorized to edit this comment');
        }
        updateDoc.$set['comments.$.attachments'] = validateCommentAttachments(payload.attachments);
    }

    const commentWasLiked = commentToUpdate.likes?.some(
        (like) => String(like.user_id) === String(actorId)
    );
    if (payload.likes) {
        const alreadyLiked = commentWasLiked;
        if (payload.likes.action === 'remove') {
            updateDoc.$pull = { 'comments.$.likes': { user_id: actorId } };
        } else if (!alreadyLiked) {
            updateDoc.$push = {
                'comments.$.likes': { user_id: actorId, created_at: new Date() },
            };
        }
    }

    if (
        Object.keys(updateDoc.$set).length === 1
        && !updateDoc.$pull
        && !updateDoc.$push
    ) {
        throw new Error('No valid comment fields provided for update');
    }

    const updatedDiscussion = await updateForumDiscussionComments({
        discussionId,
        commentId,
        updateFields: updateDoc,
    });
    if (payload.likes && payload.likes.action !== 'remove' && !commentWasLiked) {
        await createForumReactionNotification({
            actorId,
            targetUserId: commentToUpdate.user_id,
            discussion,
            commentId,
            kind: 'like',
        });
    }
    const isReply = Boolean(commentToUpdate.comment_reference_id);
    const eventType = payload.likes
        ? `${isReply ? 'reply' : 'comment'}.like_updated`
        : `${isReply ? 'reply' : 'comment'}.updated`;
    emitForumEvent(eventType, {
        groupId: String(discussion.forum_group_id),
        discussionId: String(discussionId),
        commentId,
        discussion: updatedDiscussion,
        actorId,
    });
    return updatedDiscussion;
}

async function addForumDiscussionCommentServices(discussionId, payload = {}, session = {}) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('comment payload must be an object');
    }

    const actorId = getActorId(session);
    if (!actorId) throw new Error('Authenticated user is required');

    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) throw new Error('Discussion not found');
    await requireActiveGroupMember(discussion.forum_group_id, actorId);
    if (discussion.is_locked) {
        try {
            await requireDiscussionManager(discussion, session);
        } catch (_error) {
            throw new Error('Discussion is locked');
        }
    }

    if (typeof payload.comment !== 'string') {
        throw new Error('comment must be a string');
    }
    const attachments = validateCommentAttachments(payload.attachments);
    if (payload.comment.trim() === '' && attachments.length === 0) {
        throw new Error('comment or attachment is required');
    }

    const parentCommentId = payload.comment_reference_id ?? null;
    if (parentCommentId) {
        const parentComment = discussion.comments?.find(
            (comment) => comment.comment_id === parentCommentId
        );
        if (!parentComment) {
            throw new Error('Parent comment not found in this discussion');
        }
    }

    const commentPayload = {
        comment_id: randomUUID(),
        comment_reference_id: parentCommentId,
        user_id: actorId,
        comment: payload.comment.trim(),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        attachments,
        likes: [],
    };

    const created = await addForumDiscussionCommentRepository(discussionId, commentPayload);
    if (!created) throw new Error('Discussion not found');
    await createForumCommentNotifications({
        actorId,
        discussion,
        parentComment: parentCommentId
            ? discussion.comments?.find((comment) => comment.comment_id === parentCommentId)
            : null,
        comment: created,
    });
    emitForumEvent(parentCommentId ? 'reply.created' : 'comment.created', {
        groupId: String(discussion.forum_group_id),
        discussionId: String(discussionId),
        commentId: created.comment_id,
        comment: created,
    });
    return created;
}

async function getForumDiscussionSavedByUserIdServices(userId, options = {}) {
    if (!userId) {
        throw new Error('userId is required');
    }
    return getForumDiscussionFeedServices({
        savedByUserId: userId,
        type: options.type,
        cursor: options.cursor,
        limit: options.limit,
    });
}

async function deleteForumDiscussionServices(discussionId, session = {}) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }
    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) {
        return false;
    }
    await requireDiscussionManager(discussion, session);
    const deleted = await deleteForumDiscussion(discussionId);
    if (deleted) {
        emitForumEvent('discussion.deleted', {
            groupId: String(discussion.forum_group_id),
            discussionId: String(discussionId),
            discussion,
        });
    }
    return deleted;
}

module.exports = {
    discussionPayload,
    discussionValidation,
    getForumDiscussionFeedServices,
    getForumDiscussionByGroupIdPaginated,
    createForumDiscussionServices,
    getForumDiscussionByGroupId,
    getForumDiscussionByIdServices,
    getForumDiscussionsByUserIdServices,
    updateForumDiscussionServices,
    updateForumDiscussionCommentsServices,
    addForumDiscussionCommentServices,
    getForumDiscussionSavedByUserIdServices,
    deleteForumDiscussionServices
};
