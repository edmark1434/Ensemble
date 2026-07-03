const {
    discussionPayload,
    createForumDiscussionServices,
    getForumDiscussionByGroupId,
    getForumDiscussionByIdServices,
    getForumDiscussionsByUserIdServices,
    updateForumDiscussionServices,
    updateForumDiscussionCommentsServices,
    addForumDiscussionCommentServices,
    getForumDiscussionSavedByUserIdServices,
    deleteForumDiscussionServices
} = require('../Services/ForumDiscussionServices');

async function createForumDiscussionController(req, res) {
    try {
        const discussion = await createForumDiscussionServices(req.body);
        res.status(201).json(discussion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getForumDiscussionByGroupIdController(req, res) {
    try {
        const discussion = await getForumDiscussionByGroupId(req.params.groupId);
        res.status(200).json(discussion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getForumDiscussionByIdController(req, res) {
    try {
        const discussion = await getForumDiscussionByIdServices(req.params.discussionId);
        res.status(200).json(discussion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getForumDiscussionsByUserIdController(req, res) {
    try {
        const { userId } = req.session;
        const discussions = await getForumDiscussionsByUserIdServices(userId);
        res.status(200).json(discussions);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function updateForumDiscussionController(req, res) {
    try {
        const updated = await updateForumDiscussionServices(req.params.discussionId, req.body);
        res.status(200).json({ updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function updateForumDiscussionCommentsController(req, res) {
    try {
        const payload = {
            ...req.body,
            discussionId: req.params.discussionId,
            commentId: req.params.commentId,
            userId: req.body.userId || req.session?.userId,
        };

        const updated = await updateForumDiscussionCommentsServices(payload);
        res.status(200).json({ updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function addForumDiscussionCommentController(req, res) {
    try {
        const comment = await addForumDiscussionCommentServices(req.params.discussionId, req.body);
        res.status(201).json(comment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getForumDiscussionSavedByUserIdController(req, res) {
    try {
        const userId = req.session?.userId;
        const savedDiscussions = await getForumDiscussionSavedByUserIdServices(userId);
        res.status(200).json(savedDiscussions);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function deleteForumDiscussionController(req, res) {
    try {
        const deleted = await deleteForumDiscussionServices(req.params.discussionId);
        if (deleted) {
            res.status(200).json({ message: 'Discussion deleted successfully' });
        }
        else {
            res.status(404).json({ message: 'Discussion not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = {
    discussionPayload,
    createForumDiscussionController,
    getForumDiscussionByGroupIdController,
    getForumDiscussionByIdController,
    getForumDiscussionsByUserIdController,
    updateForumDiscussionController,
    updateForumDiscussionCommentsController,
    addForumDiscussionCommentController,
    getForumDiscussionSavedByUserIdController,
    deleteForumDiscussionController
};