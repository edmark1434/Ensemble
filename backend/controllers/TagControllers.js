// controllers/TagControllers.js
const {
    getAllTagsServices,
    getTagByIdServices,
    getAllTagsByUserIdServices,
    checkUserTagExistsServices,
    updateUserSkillsServices,
    getUserSkillsServices,
    checkUserHasSkillServices
} = require('../services/TagServices');

// ============= EXISTING CONTROLLERS (KEPT AS IS) =============

async function getAllTagsController(req, res) {
    try {
        const tags = await getAllTagsServices();
        return res.status(200).json({
            success: true,
            data: tags
        });
    } catch (err) {
        console.error('Error in getAllTagsController:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tags',
            error: err.message
        });
    }
}

async function getTagByIdController(req, res) {
    try {
        const { tagId } = req.params;
        const tag = await getTagByIdServices(tagId);
        
        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Tag not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: tag
        });
    } catch (err) {
        console.error('Error in getTagByIdController:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tag',
            error: err.message
        });
    }
}

async function getAllTagsByUserIdController(req, res) {
    const { accountId } = req.params;
    try {
        const accountId = req.params.accountId;
        if (!accountId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Account ID not found'
            });
        }
        
        const tags = await getAllTagsByUserIdServices(accountId);
        return res.status(200).json({
            success: true,
            data: tags
        });
    } catch (err) {
        console.error('Error in getAllTagsByUserIdController:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user tags',
            error: err.message
        });
    }
}

async function checkUserTagExistsController(req, res) {
    try {
        const userId = req.session?.userId;
        const { tagId } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User ID not found in session'
            });
        }
        
        const exists = await checkUserTagExistsServices(userId, tagId);
        return res.status(200).json({
            success: true,
            data: { exists }
        });
    } catch (err) {
        console.error('Error in checkUserTagExistsController:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to check user tag',
            error: err.message
        });
    }
}

// ============= NEW CONTROLLERS FOR SKILLS MANAGEMENT =============

/**
 * Update user skills
 * Expects: { originalSkills: [], updatedSkills: [] }
 */
async function updateSkillsController(req, res) {
    try {
        // Get user ID from session
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: User ID not found in session' 
            });
        }

        const { originalSkills, updatedSkills } = req.body;

        if (!originalSkills || !updatedSkills) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: originalSkills and updatedSkills'
            });
        }

        // Validate skills
        if (!Array.isArray(originalSkills) || !Array.isArray(updatedSkills)) {
            return res.status(400).json({
                success: false,
                message: 'originalSkills and updatedSkills must be arrays'
            });
        }

        // Update skills
        const result = await updateUserSkillsServices(userId, originalSkills, updatedSkills);

        return res.status(200).json({
            success: true,
            message: 'Skills updated successfully',
            data: {
                added: result.added,
                removed: result.removed,
                modified: result.modified,
                totalSkills: updatedSkills.length
            }
        });

    } catch (error) {
        console.error('Error updating skills:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update skills',
            error: error.message || 'Unknown error'
        });
    }
}

/**
 * Get user skills with details
 */
async function getUserSkillsController(req, res) {
    try {
        // Get user ID from session
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: User ID not found in session' 
            });
        }

        const skills = await getUserSkillsServices(userId);

        return res.status(200).json({
            success: true,
            data: skills
        });

    } catch (error) {
        console.error('Error fetching skills:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch skills',
            error: error.message || 'Unknown error'
        });
    }
}

/**
 * Check if user has a specific skill
 */
async function hasSkillController(req, res) {
    try {
        // Get user ID from session
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: User ID not found in session' 
            });
        }

        const { tagId } = req.params;

        if (!tagId) {
            return res.status(400).json({
                success: false,
                message: 'Missing tagId parameter'
            });
        }

        const hasSkill = await checkUserHasSkillServices(userId, Number(tagId));

        return res.status(200).json({
            success: true,
            data: { hasSkill }
        });

    } catch (error) {
        console.error('Error checking skill:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check skill',
            error: error.message || 'Unknown error'
        });
    }
}

module.exports = {
    // Existing exports
    getAllTagsController,
    getTagByIdController,
    getAllTagsByUserIdController,
    checkUserTagExistsController,
    
    // New exports
    updateSkillsController,
    getUserSkillsController,
    hasSkillController
};