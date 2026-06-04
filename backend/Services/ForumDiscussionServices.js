const {
    createForumDiscussionRepositories,
    getForumDiscussionByGroupId: getForumDiscussionByGroupIdRepository,
    getForumDiscussionById: getForumDiscussionByIdRepository,
    getForumDiscussionsByUserId: getForumDiscussionsByUserIdRepository,
    updateForumDiscussion,
    updateForumDiscussionComments,
    addForumDiscussionCommentRepository,
} = require('../Repositories/ForumDiscussionRepositories');

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
        description,
        created_at,
        updated_at,
        deleted_at,
        tags,
        attachments,
        likes,
        saves,
        comments,
    } = payload;

    if (forum_group_id == null || forum_group_id === '') {
        errors.push('forum_group_id is required');
    }

    if (user_id == null || user_id === '') {
        errors.push('user_id is required');
    }

    if (title != null && typeof title !== 'string') {
        errors.push('title must be a string');
    }

    if (description != null && typeof description !== 'string') {
        errors.push('description must be a string');
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

            if (tag.forum_tag_id == null || tag.forum_tag_id === '') {
                errors.push(`tags[${index}].forum_tag_id is required`);
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

async function createForumDiscussionServices(discussionPayload) {
    const validationResult = discussionValidation(discussionPayload);

    if (!validationResult.valid) {
        throw new Error(`Invalid discussion payload: ${validationResult.errors.join(', ')}`);
    }

    return await createForumDiscussionRepositories(discussionPayload);
}

async function getForumDiscussionByGroupId(groupId) {
    if (!groupId) {
        throw new Error('groupId is required');
    }

    return await getForumDiscussionByGroupIdRepository(groupId);
}

async function getForumDiscussionByIdServices(discussionId) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    return await getForumDiscussionByIdRepository(discussionId);
}

async function getForumDiscussionsByUserIdServices(userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    return await getForumDiscussionsByUserIdRepository(userId);
}

async function updateForumDiscussionServices(discussionId, payload = {}) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('update payload must be an object');
    }

    const updateFields = {};
    const allowedFields = ['title', 'description', 'tags', 'attachments', 'likes', 'saves'];

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            updateFields[field] = payload[field];
        }
    });

    if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid discussion fields provided for update');
    }

    updateFields.updated_at = new Date();
    return await updateForumDiscussion(discussionId, updateFields);
}

async function updateForumDiscussionCommentsServices(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('update payload must be an object');
    }

    const { discussionId, commentId, userId } = payload;

    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    if (!commentId) {
        throw new Error('commentId is required');
    }

    if (!userId) {
        throw new Error('userId is required');
    }

    const updateFields = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'like')) {
        updateFields['comments.$.likes'] = payload.like;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'comment')) {
        updateFields['comments.$.comment'] = payload.comment;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'saved')) {
        updateFields['comments.$.saved'] = payload.saved;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'comment_reference_id')) {
        updateFields['comments.$.comment_reference_id'] = payload.comment_reference_id;
    }

    if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid comment fields provided for update');
    }

    updateFields['comments.$.updated_at'] = new Date();

    return await updateForumDiscussionComments({
        discussionId,
        commentId,
        userId,
        updateFields,
    });
}

async function addForumDiscussionCommentServices(discussionId, payload = {}) {
    if (!discussionId) {
        throw new Error('discussionId is required');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('comment payload must be an object');
    }

    if (payload.user_id == null || payload.user_id === '') {
        throw new Error('user_id is required');
    }

    if (typeof payload.comment !== 'string' || payload.comment.trim() === '') {
        throw new Error('comment is required');
    }

    if (payload.attachments != null && !Array.isArray(payload.attachments)) {
        throw new Error('attachments must be an array');
    }

    if (payload.likes != null && !Array.isArray(payload.likes)) {
        throw new Error('likes must be an array');
    }

    const commentPayload = {
        comment_id: payload.comment_id || uuid(),
        comment_reference_id: payload.comment_reference_id ?? null,
        user_id: payload.user_id,
        comment: payload.comment,
        created_at: payload.created_at || new Date(),
        updated_at: payload.updated_at || new Date(),
        deleted_at: payload.deleted_at ?? null,
        attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
        likes: Array.isArray(payload.likes) ? payload.likes : [],
    };

    return await addForumDiscussionCommentRepository(discussionId, commentPayload);
}

module.exports = {
    discussionPayload,
    discussionValidation,
    createForumDiscussionServices,
    getForumDiscussionByGroupId,
    getForumDiscussionByIdServices,
    getForumDiscussionsByUserIdServices,
    updateForumDiscussionServices,
    updateForumDiscussionCommentsServices,
    addForumDiscussionCommentServices,
}