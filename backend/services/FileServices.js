// Services/FileServices.js
const {
    getAllProfileFilesRepositories,
    createFileRepository
} = require('../repositories/FileRepositories');
const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require('../lib/AmazonS3');
const dotenv = require('dotenv');
dotenv.config();

// Read from environment variables with defaults
const ALLOWED_FOLDERS = process.env.UPLOAD_ALLOWED_FOLDERS 
    ? process.env.UPLOAD_ALLOWED_FOLDERS.split(',').map(f => f.trim())
    : ['profile', 'documents', 'assets', 'forum'];

const ALLOWED_CONTENT_TYPES = process.env.UPLOAD_ALLOWED_TYPES 
    ? process.env.UPLOAD_ALLOWED_TYPES.split(',').map(t => t.trim())
    : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'application/pdf'];

const MAX_FILE_SIZE = process.env.UPLOAD_MAX_FILE_SIZE 
    ? parseInt(process.env.UPLOAD_MAX_FILE_SIZE) 
    : 5 * 1024 * 1024; // 5MB default

const URL_EXPIRY = process.env.UPLOAD_URL_EXPIRY 
    ? parseInt(process.env.UPLOAD_URL_EXPIRY) 
    : 300; // 5 minutes default

// Hardcoded for security - these should NEVER be allowed
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'js', 'jar', 'war', 'ear', 'php', 'asp', 'jsp', 'py', 'rb', 'pl'];

async function getAllProfileFilesServices() {
    try {
        const files = await getAllProfileFilesRepositories();
        return files;
    } catch (err) {
        console.error('Error in getAllProfileFilesServices:', err);
        throw err;
    }
}

async function generateUploadUrl(folder, filename, contentType, cacheControl = "public, max-age=86400") {
    try {
        // 1. Validate folder
        if (!ALLOWED_FOLDERS.includes(folder)) {
            throw new Error(`Folder "${folder}" is not allowed. Allowed: ${ALLOWED_FOLDERS.join(', ')}`);
        }

        // 2. Validate content type
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
            throw new Error(`Content type "${contentType}" is not allowed. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`);
        }

        // 3. Validate filename
        if (!filename || filename.length === 0) {
            throw new Error('Filename is required');
        }

        if (filename.length > 255) {
            throw new Error('Filename is too long (max 255 characters)');
        }

        // 4. Check for dangerous patterns in filename
        const dangerousPatterns = [
            /\.\./, // Path traversal
            /[<>"']/, // HTML/XML injection
            /[;&|]/, // Command injection
            /\\/, // Backslash (Windows path)
            /^\s+|\s+$/, // Leading/trailing whitespace
            /[\x00-\x1f]/, // Control characters
            /\/\*/, // SQL comment
            /--/, // SQL comment
            /\%/, // URL encoding
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(filename)) {
                throw new Error(`Filename contains invalid characters: "${filename}"`);
            }
        }

        // 5. Check for forbidden extensions
        const extension = filename.split('.').pop()?.toLowerCase();
        if (extension && FORBIDDEN_EXTENSIONS.includes(extension)) {
            throw new Error(`File extension "${extension}" is not allowed`);
        }

        // 6. Sanitize filename
        const sanitizedFilename = filename
            .replace(/[^a-zA-Z0-9.\-_\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .slice(0, 50); // Limit length

        // 7. Generate unique filename with timestamp and UUID
        const timestamp = Date.now();
        const uuid = crypto.randomUUID().slice(0, 8);
        const safeExtension = extension || 'jpg';
        const nameWithoutExt = sanitizedFilename.replace(/\.[^.]+$/, '');
        const uniqueFilename = `${nameWithoutExt}_${timestamp}_${uuid}.${safeExtension}`;

        // 8. Create S3 key
        const key = `${folder}/${uniqueFilename}`;

        // 9. Generate pre-signed URL with security restrictions
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
            CacheControl: cacheControl
        });

        const uploadUrl = await getSignedUrl(s3, command, { 
            expiresIn: URL_EXPIRY 
        });

        console.log('📝 Generated upload URL:', {
            folder,
            key,
            contentType,
            expiresIn: `${URL_EXPIRY} seconds`,
            fileSizeLimit: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
            allowedTypes: ALLOWED_CONTENT_TYPES.length
        });

        return {
            uploadUrl,
            key,
            expiresIn: URL_EXPIRY,
            maxFileSize: MAX_FILE_SIZE,
            allowedTypes: ALLOWED_CONTENT_TYPES,
            allowedFolders: ALLOWED_FOLDERS
        };

    } catch (err) {
        console.error('Error in generateUploadUrl:', err);
        throw err;
    }
}

// This function is only used for server-side uploads (not pre-signed URL flow)
async function uploadFileToS3(uploadUrl, file) {
    try {
        if (!uploadUrl) {
            throw new Error('Upload URL is required');
        }

        if (!file) {
            throw new Error('File is required');
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        }

        // Validate file type
        if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
            throw new Error(`File type "${file.mimetype}" is not allowed`);
        }

        // Validate file name
        if (file.originalname) {
            const ext = file.originalname.split('.').pop()?.toLowerCase();
            if (ext && FORBIDDEN_EXTENSIONS.includes(ext)) {
                throw new Error(`File extension "${ext}" is not allowed`);
            }
        }

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": file.mimetype,
                "Content-Length": file.size.toString(),
            },
            body: file.buffer || file,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        return uploadResponse;
    } catch (err) {
        console.error('Error in uploadFileToS3:', err);
        throw err;
    }
}

// Optional: Export config for monitoring/debugging
function getUploadConfig() {
    return {
        allowedFolders: ALLOWED_FOLDERS,
        allowedTypes: ALLOWED_CONTENT_TYPES,
        maxFileSize: MAX_FILE_SIZE,
        urlExpiry: URL_EXPIRY,
        forbiddenExtensions: FORBIDDEN_EXTENSIONS
    };
}

async function registerFileService(name, path, mimeType, sizeBytes) {
    return await createFileRepository(name, path, mimeType, sizeBytes);
}

module.exports = {
    getAllProfileFilesServices,
    generateUploadUrl,
    uploadFileToS3,
    getUploadConfig,
    registerFileService
};
