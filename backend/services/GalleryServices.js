const GalleryRepositories = require('../repositories/GalleryRepositories');

async function getUserGalleries(accountId) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    return await GalleryRepositories.getUserGalleries(accountId);
}

async function createGalleryItem(accountId, fileId, title, description) {
    if (!accountId || !fileId || !title) {
        throw new Error('Account ID, File ID, and Title are required');
    }
    return await GalleryRepositories.createGalleryItem(accountId, fileId, title, description);
}

async function deleteGalleryItem(galleryId, accountId) {
    if (!galleryId || !accountId) {
        throw new Error('Gallery ID and Account ID are required');
    }
    
    // Check if gallery item exists and belongs to the account
    const item = await GalleryRepositories.getGalleryItem(galleryId);
    if (!item) {
        throw new Error('Gallery item not found');
    }
    if (item.account_id !== accountId) {
        throw new Error('Unauthorized to delete this gallery item');
    }
    
    return await GalleryRepositories.deleteGalleryItem(galleryId, accountId);
}

module.exports = {
    getUserGalleries,
    createGalleryItem,
    deleteGalleryItem
};
