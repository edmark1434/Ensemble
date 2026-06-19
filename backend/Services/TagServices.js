const {
    getAllTagsRepositories,
    getTagByIdRepositories,
    getAllTagsByUserIdRepositories,
    createUserTagRepositories,
    deleteUserTagRepositories,
    checkUserTagExistsRepositories
} = require('../Repositories/TagRepositories');

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

async function getAllTagsByUserIdServices(userId) {
    try {
        return await getAllTagsByUserIdRepositories(userId);
    } catch (err) {
        console.error(`Error in getAllTagsByUserIdServices for userId ${userId}:`, err);
        throw err;
    }
}

async function createUserTagServices(userId, tagId) {
    try {
        return await createUserTagRepositories(userId, tagId);
    } catch (err) {
        console.error(`Error in createUserTagServices for userId ${userId} and tagId ${tagId}:`, err);
        throw err;
    }
}

async function deleteUserTagServices(userId, tagId) {
    try {
        return await deleteUserTagRepositories(userId, tagId);
    } catch (err) {
        console.error(`Error in deleteUserTagServices for userId ${userId} and tagId ${tagId}:`, err);
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
module.exports = {
    getAllTagsServices,
    getTagByIdServices,
    getAllTagsByUserIdServices,
    createUserTagServices,
    deleteUserTagServices,
    checkUserTagExistsServices
};