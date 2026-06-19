const {
    createForumDiscussionRepositories,
    getForumDiscussionByGroupId: getForumDiscussionByGroupIdRepository,
    getForumDiscussionById: getForumDiscussionByIdRepository,
    getForumDiscussionsByUserId: getForumDiscussionsByUserIdRepository,
    updateForumDiscussion,
    updateForumDiscussionComments,
    addForumDiscussionCommentRepository,
    getForumDiscussionByDiscussionIdAndCommentId,
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

async function createForumDiscussionServices(discussionPayload) {
    const validationResult = discussionValidation(discussionPayload);

    if (!validationResult.valid) {
        throw new Error(`Invalid discussion payload: ${validationResult.errors.join(', ')}`);
    }

    return await createForumDiscussionRepositories({
        ...discussionPayload,
        created_at: discussionPayload.created_at || new Date(),
        updated_at: discussionPayload.updated_at || new Date(),
        deleted_at: discussionPayload.deleted_at ?? null,
        attachments: Array.isArray(discussionPayload.attachments) ? discussionPayload.attachments : [],
        tags: Array.isArray(discussionPayload.tags) ? discussionPayload.tags : [],
        likes: Array.isArray(discussionPayload.likes) ? discussionPayload.likes : [],
        saves: Array.isArray(discussionPayload.saves) ? discussionPayload.saves : [],
        comments: Array.isArray(discussionPayload.comments) ? discussionPayload.comments : [],
    });
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

    // Process each field
    for (const [field, value] of Object.entries(payload)) {
        
        // Handle LIKES - toggle add/remove
        if (field === 'likes') {
            if (value.action === 'remove' && value.user_id) {
                pullFields.likes = { user_id: value.user_id };
            } else if (value.user_id) {
                const alreadyLiked = discussion.likes?.some(like => like.user_id === value.user_id);
                if (!alreadyLiked) {
                    pushFields.likes = { 
                        user_id: value.user_id, 
                        created_at: new Date() 
                    };
                }
            }
        }
        
        // Handle SAVES - toggle add/remove
        else if (field === 'saves') {
            if (value.action === 'remove' && value.user_id) {
                pullFields.saves = { user_id: value.user_id };
            } else if (value.user_id) {
                const alreadySaved = discussion.saves?.some(save => save.user_id === value.user_id);
                if (!alreadySaved) {
                    pushFields.saves = { 
                        user_id: value.user_id, 
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
        else if (field === 'attachments') {
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
        
        // Handle COMMENTS - remove and edit
        else if (field === 'comments') {
            
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
        else if (['title', 'description'].includes(field)) {
            setFields[field] = value;
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
    return await updateForumDiscussion(discussionId, updateDoc);
}

async function updateForumDiscussionCommentsServices(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('update payload must be object');
    }

    const { discussionId, commentId, userId, action } = payload;

    if (!discussionId) throw new Error('discussionId is required');
    if (!commentId) throw new Error('commentId is required');
    if (!userId) throw new Error('userId is required');
    console.log(`Updating comment ${commentId} in discussion ${discussionId} by user ${userId} with action ${action}`);
    const discussion = await getForumDiscussionByIdRepository(discussionId);
    if (!discussion) throw new Error('Discussion not found');

    const commentToUpdate = discussion.comments?.find(c => c.comment_id === commentId);
    console.log(commentToUpdate);
    if (!commentToUpdate) throw new Error('Comment not found');

    const pullFields = {};
    const pushFields = {};
    const setFields = {};

    for (const [field, value] of Object.entries(payload)) {
        
        // Handle likes
        if (field === 'likes') {
            if (value.action === 'remove' && value.user_id) {
                // Check if user actually liked it
                const isLiked = commentToUpdate.likes?.some(like => like.user_id === value.user_id);
                if (isLiked) {
                    pullFields['comments.$.likes'] = { user_id: value.user_id };
                }
            } else if (value.user_id) {
                // Check if not already liked
                const alreadyLiked = commentToUpdate.likes?.some(like => like.user_id === value.user_id);
                if (!alreadyLiked) {
                    pushFields['comments.$.likes'] = { 
                        user_id: value.user_id, 
                        created_at: new Date() 
                    };
                }
            }
        }
        
        // Handle comment edit
        else if (field === 'comment') {
            // Check authorization
            if (commentToUpdate.user_id !== userId && !payload.isAdmin) {
                throw new Error('Not authorized to edit this comment');
            }
            
            if (commentToUpdate.deleted_at) {
                throw new Error('Cannot edit deleted comment');
            }
            
            if (value.action === 'edit' && value.comment) {
                setFields['comments.$.comment'] = value.comment;
                setFields['comments.$.is_edited'] = true;
            } else if (value.comment) {
                setFields['comments.$.comment'] = value.comment;
                setFields['comments.$.is_edited'] = true;
            }
        }
        
        // Handle attachments
        else if (field === 'attachments') {
            if (value.action === 'remove' && value.file_path) {
                pullFields['comments.$.attachments'] = { file_path: value.file_path };
            } else if (Array.isArray(value)) {
                pushFields['comments.$.attachments'] = { 
                    $each: value.map(att => ({
                        ...att,
                        uploaded_at: new Date()
                    }))
                };
            } else if (value.file_path) {
                pushFields['comments.$.attachments'] = {
                    ...value,
                    uploaded_at: new Date()
                };
            }
        }
        
        // Handle remove entire comment
        else if (field === 'remove') {
            if (commentToUpdate.user_id !== userId && !payload.isAdmin) {
                throw new Error('Not authorized to delete this comment');
            }
            
            // Hard delete
            const result = await forumDiscussionsCollection.updateOne(
                { _id: new ObjectId(discussionId) },
                { $pull: { comments: { comment_id: commentId } } }
            );
            return { success: result.modifiedCount > 0, action: 'removed' };
        }
        
        // Handle soft delete
        else if (field === 'softDelete') {
            if (commentToUpdate.user_id !== userId && !payload.isAdmin) {
                throw new Error('Not authorized to delete this comment');
            }
            
            const result = await forumDiscussionsCollection.updateOne(
                { 
                    _id: new ObjectId(discussionId),
                    "comments.comment_id": commentId
                },
                {
                    $set: {
                        "comments.$.deleted_at": new Date(),
                        "comments.$.comment": "[deleted]",
                        "comments.$.updated_at": new Date()
                    }
                }
            );
            return { success: result.modifiedCount > 0, action: 'soft-deleted' };
        }
    }

    // Build update document
    const updateDoc = {};
    if (Object.keys(setFields).length > 0) updateDoc.$set = setFields;
    if (Object.keys(pushFields).length > 0) updateDoc.$push = pushFields;
    if (Object.keys(pullFields).length > 0) updateDoc.$pull = pullFields;
    
    // Always update timestamp
    if (updateDoc.$set) {
        updateDoc.$set['comments.$.updated_at'] = new Date();
    } else {
        updateDoc.$set = { 'comments.$.updated_at': new Date() };
    }

    // If no operations, return early
    if (Object.keys(updateDoc).length === 0) {
        throw new Error('No valid fields to update');
    }
    console.log("Final updateDoc for comment update:", JSON.stringify(updateDoc, null, 2));
    return await updateForumDiscussionComments({ discussionId, commentId, updateFields: updateDoc });
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
};