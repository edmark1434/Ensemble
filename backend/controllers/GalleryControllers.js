const GalleryServices = require('../services/GalleryServices');

async function getUserGalleries(req, res) {
    try {
        const { accountId } = req.params;
        const galleries = await GalleryServices.getUserGalleries(accountId);
        res.status(200).json(galleries);
    } catch (err) {
        console.error('getUserGalleries error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch galleries' });
    }
}

async function createGalleryItem(req, res) {
    try {
        // Assume req.user contains the authenticated account details
        const accountId = req.user.account_id; 
        const { file_id, title, description } = req.body;
        
        if (!accountId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const item = await GalleryServices.createGalleryItem(accountId, file_id, title, description);
        res.status(201).json(item);
    } catch (err) {
        console.error('createGalleryItem error:', err);
        if (err.message === 'Gallery upload limit reached (max 5 items)') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Failed to create gallery item' });
    }
}

async function deleteGalleryItem(req, res) {
    try {
        const accountId = req.user.account_id;
        const { galleryId } = req.params;

        if (!accountId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await GalleryServices.deleteGalleryItem(galleryId, accountId);
        res.status(200).json({ success: true, message: 'Gallery item deleted successfully' });
    } catch (err) {
        console.error('deleteGalleryItem error:', err);
        if (err.message === 'Gallery item not found' || err.message === 'Unauthorized to delete this gallery item') {
            return res.status(403).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Failed to delete gallery item' });
    }
}

async function updateGalleryItem(req, res) {
    try {
        const accountId = req.user.account_id;
        const { galleryId } = req.params;
        const { title, description } = req.body;
        
        const item = await GalleryServices.updateGalleryItem(galleryId, accountId, title, description);
        res.status(200).json(item);
    } catch (err) {
        console.error('updateGalleryItem error:', err);
        if (err.message === 'Gallery item not found' || err.message === 'Unauthorized to update this gallery item') {
            return res.status(403).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Failed to update gallery item' });
    }
}

module.exports = {
    getUserGalleries,
    createGalleryItem,
    deleteGalleryItem,
    updateGalleryItem
};
