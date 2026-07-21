// services/TagServices.js
const {
    getAllTagsRepositories,
    getTagByIdRepositories,
    getAllTagsByUserIdRepositories,
    checkTagExistsRepositories,
    checkUserTagExistsRepositories,
    addUserTagsRepositories,
    removeUserTagsRepositories,
    updateUserTagsRepositories,
    hasUserTagRepositories,
    getUserTagsWithDetailsRepositories
} = require('../repositories/TagRepositories');

// ============= EXISTING FUNCTIONS (KEPT AS IS) =============

async function getAllTagsServices() {
    try {
        return await getAllTagsRepositories();
    } catch (err) {
        console.error('Error in getAllTagsServices:', err);
        throw err;
    }
}

async function getTagByIdServices(tagId) {
    try {
        return await getTagByIdRepositories(tagId);
    } catch (err) {
        console.error(`Error in getTagByIdServices for tagId ${tagId}:`, err);
        throw err;
    }
}

async function getAllTagsByUserIdServices(accountId) {
    try {
        return await getAllTagsByUserIdRepositories(accountId);
    } catch (err) {
        console.error(`Error in getAllTagsByUserIdServices for accountId ${accountId}:`, err);
        throw err;
    }
}

async function checkUserTagExistsServices(userId, tagId) {
    try {
        return await checkUserTagExistsRepositories(userId, tagId);
    } catch (err) {
        console.error(`Error in checkUserTagExistsServices for userId ${userId} and tagId ${tagId}:`, err);
        throw err;
    }
}

// ============= NEW FUNCTIONS FOR SKILLS MANAGEMENT =============

/**
 * Compare original and updated skills to find differences
 */
function compareSkills(originalSkills, updatedSkills) {
    // Find added skills (in updated but not in original)
    const added = updatedSkills.filter(
        updated => !originalSkills.some(original => original.tag_id === updated.tag_id)
    );

    // Find removed skills (in original but not in updated)
    const removed = originalSkills.filter(
        original => !updatedSkills.some(updated => updated.tag_id === original.tag_id)
    );

    // Find modified skills (in both but with different proficiency or years)
    const modified = updatedSkills.filter(updated => {
        const original = originalSkills.find(o => o.tag_id === updated.tag_id);
        if (!original) return false;
        return original.proficiency !== updated.proficiency || original.years !== updated.years;
    });

    return { added, removed, modified };
}

/**
 * Update user skills based on comparison
 */
async function updateUserSkillsServices(userId, originalSkills, updatedSkills) {
    try {
        const comparison = compareSkills(originalSkills, updatedSkills);

        console.log('📊 Skills Comparison:', {
            added: comparison.added.length,
            removed: comparison.removed.length,
            modified: comparison.modified.length
        });

        let addedCount = 0;
        let removedCount = 0;
        let modifiedCount = 0;

        // Handle removed skills
        if (comparison.removed.length > 0) {
            const tagIds = comparison.removed.map(skill => skill.tag_id);
            removedCount = await removeUserTagsRepositories(userId, tagIds);
            console.log('🗑️ Removed skills:', comparison.removed.map(s => s.name).join(', '));
        }

        // Handle added skills
        if (comparison.added.length > 0) {
            const tagsToAdd = comparison.added.map(skill => ({
                tag_id: skill.tag_id,
                proficiency: skill.proficiency,
                years: skill.years
            }));
            await addUserTagsRepositories(userId, tagsToAdd);
            addedCount = comparison.added.length;
            console.log('✅ Added skills:', comparison.added.map(s => s.name).join(', '));
        }

        // Handle modified skills
        if (comparison.modified.length > 0) {
            const tagsToUpdate = comparison.modified.map(skill => ({
                tag_id: skill.tag_id,
                proficiency: skill.proficiency,
                years: skill.years
            }));
            modifiedCount = await updateUserTagsRepositories(userId, tagsToUpdate);
            console.log('🔄 Modified skills:', comparison.modified.map(s => s.name).join(', '));
        }

        return {
            added: addedCount,
            removed: removedCount,
            modified: modifiedCount
        };
    } catch (err) {
        console.error(`Error in updateUserSkillsServices for userId ${userId}:`, err);
        throw err;
    }
}

/**
 * Get user skills with details
 */
async function getUserSkillsServices(userId) {
    try {
        return await getUserTagsWithDetailsRepositories(userId);
    } catch (err) {
        console.error(`Error in getUserSkillsServices for userId ${userId}:`, err);
        throw err;
    }
}

/**
 * Check if user has a specific skill
 */
async function checkUserHasSkillServices(userId, tagId) {
    try {
        return await hasUserTagRepositories(userId, tagId);
    } catch (err) {
        console.error(`Error in checkUserHasSkillServices for userId ${userId} and tagId ${tagId}:`, err);
        throw err;
    }
}

module.exports = {
    // Existing exports
    getAllTagsServices,
    getTagByIdServices,
    getAllTagsByUserIdServices,
    checkUserTagExistsServices,
    
    // New exports
    updateUserSkillsServices,
    getUserSkillsServices,
    checkUserHasSkillServices
};