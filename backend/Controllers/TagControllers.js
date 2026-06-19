const {
    getAllTagsServices,
    getTagByIdServices,
    getAllTagsByUserIdServices,
    createUserTagServices,
    deleteUserTagServices,
    checkUserTagExistsServices
} = require('../Services/TagServices');


async function getAllTagsController(req, res) {
    try {
        const tags = await getAllTagsServices();
        res.status(200).json({ message: 'Tags fetched successfully', tags });
    } catch (err) {
        console.error('Error in getAllTagsController:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getTagByIdController(req, res) {
    const { tagId } = req.params;
    try {
        const tag = await getTagByIdServices(tagId);
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        res.status(200).json({ message: 'Tag fetched successfully', tag });
    } catch (err) {
        console.error(`Error in getTagByIdController for tagId ${tagId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getAllTagsByUserIdController(req, res) { 
    const { userId } = req.params;
    try {
        const tags = await getAllTagsByUserIdServices(userId);
        res.status(200).json({ message: 'User tags fetched successfully', tags });
    } catch (err) {
        console.error(`Error in getAllTagsByUserIdController for userId ${userId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createUserTagController(req, res) { 
    const { userId, tagId } = req.body;
    try {
        const success = await createUserTagServices(userId, tagId);
        if (success) {
            res.status(201).json({ message: 'User tag created successfully' });
        } else {
            res.status(400).json({ error: 'Failed to create user tag' });
        }
    } catch (err) {
        console.error(`Error in createUserTagController for userId ${userId} and tagId ${tagId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteUserTagController(req, res) {
    const { userId, tagId } = req.body;
    try {
        const success = await deleteUserTagServices(userId, tagId);
        if (success) {
            res.status(200).json({ message: 'User tag deleted successfully' });
        } else {
            res.status(400).json({ error: 'Failed to delete user tag' });
        }
    } catch (err) {
        console.error(`Error in deleteUserTagController for userId ${userId} and tagId ${tagId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getAllTagsController,
    getTagByIdController,
    getAllTagsByUserIdController,
    createUserTagController,
    deleteUserTagController,
};