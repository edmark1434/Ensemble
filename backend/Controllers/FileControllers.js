const {
    getAllProfileFilesServices,
    generateUploadUrl
} = require('../Services/FileServices');

async function getAllProfileFilesController(req, res) {
    try {
        const files = await getAllProfileFilesServices();
        res.status(200).json({ success: true, files });
    } catch (err) {
        console.error('Error in getAllProfileFilesController:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function generateUploadUrlController(req, res) {
    const { folder, filename, contentType } = req.body;
    try {
        const { uploadUrl, key } = await generateUploadUrl(folder, filename, contentType);
        res.status(200).json({ success: true, uploadUrl, key });
    } catch (err) {
        console.error('Error in generateUploadUrlController:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getAllProfileFilesController,
    generateUploadUrlController
};