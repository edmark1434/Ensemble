// controllers/FileController.js
const {
    getAllProfileFilesServices,
    generateUploadUrl,
    uploadFileToS3,
    registerFileService
} = require('../services/FileServices');

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
    try {
        // 1. Check authentication
        const userId = req.user?.account_id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated'
            });
        }

        // 2. Get parameters
        const { folder, filename, contentType } = req.body;

        // 3. Validate required fields
        if (!folder || !filename || !contentType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: folder, filename, contentType'
            });
        }

        // 4. Generate upload URL with security
        const result = await generateUploadUrl(folder, filename, contentType);

        // 5. Return success with additional info
        res.status(200).json({
            success: true,
            uploadUrl: result.uploadUrl,
            key: result.key,
            expiresIn: result.expiresIn,
            maxFileSize: result.maxFileSize,
            allowedTypes: result.allowedTypes
        });

    } catch (err) {
        console.error('Error in generateUploadUrlController:', err);
        
        // Handle specific validation errors
        const validationErrors = [
            'not allowed',
            'Filename is required',
            'Filename is too long',
            'Filename contains invalid characters',
            'File extension'
        ];

        if (validationErrors.some(msg => err.message.includes(msg))) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to generate upload URL'
        });
    }
}

async function uploadFileToS3Controller(req, res) {
    try {
        // 1. Check authentication
        const userId = req.user?.account_id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated'
            });
        }

        // 2. Get upload URL and file
        const { uploadUrl } = req.body;
        const file = req.file;

        if (!uploadUrl) {
            return res.status(400).json({
                success: false,
                message: 'Upload URL is required'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // 3. Upload file
        const uploadResponse = await uploadFileToS3(uploadUrl, file);

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully'
        });

    } catch (err) {
        console.error('Error in uploadFileToS3Controller:', err);
        
        // Handle specific errors
        if (err.message.includes('exceeds')) {
            return res.status(413).json({
                success: false,
                message: err.message
            });
        }

        if (err.message.includes('not allowed')) {
            return res.status(415).json({
                success: false,
                message: err.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload file'
        });
    }
}

async function registerFileController(req, res) {
    try {
        const userId = req.user?.account_id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { name, path, mimeType, sizeBytes } = req.body;
        if (!name || !path) {
            return res.status(400).json({ success: false, message: 'Missing name or path' });
        }

        const fileId = await registerFileService(name, path, mimeType, sizeBytes);
        res.status(200).json({ success: true, fileId });
    } catch (err) {
        console.error('Error in registerFileController:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getAllProfileFilesController,
    generateUploadUrlController,
    uploadFileToS3Controller,
    registerFileController
};