// Services/FileServices.js
const {
    getAllProfileFilesRepositories,
    createUploadIntentRepository,
    getUploadIntentForOwnerRepository,
    claimUploadIntentRepository,
    releaseUploadIntentRepository,
    consumeUploadIntentRepository
} = require('../repositories/FileRepositories');
const crypto = require("crypto");
const { PutObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require('../lib/AmazonS3');
const dotenv = require('dotenv');
dotenv.config();

// Read from environment variables with defaults
const ALLOWED_FOLDERS = process.env.UPLOAD_ALLOWED_FOLDERS 
    ? process.env.UPLOAD_ALLOWED_FOLDERS.split(',').map(f => f.trim())
    : ['profile', 'documents', 'assets', 'asset-originals', 'forum', 'gallery', 'jobs', 'chat-attachments', 'forum-discussions', 'forum-group', 'forum-covers', 'gig_orders', 'gig_thumbnails', 'gig_galleries'];

const ALLOWED_CONTENT_TYPES = (process.env.UPLOAD_ALLOWED_TYPES
    ? process.env.UPLOAD_ALLOWED_TYPES.split(',').map(t => t.trim())
    : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf', 'video/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'])
    .filter(type => type !== 'image/svg+xml');

const CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
    'application/pdf': ['pdf'],
    'video/mp4': ['mp4'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/x-wav': ['wav'],
    'audio/ogg': ['ogg', 'oga'],
};

const ABSOLUTE_MAX_FILE_SIZE = process.env.UPLOAD_ABSOLUTE_MAX_FILE_SIZE
    ? parseInt(process.env.UPLOAD_ABSOLUTE_MAX_FILE_SIZE)
    : 100 * 1024 * 1024;

const MB = 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
const UPLOAD_POLICIES = {
    profile: { types: IMAGE_TYPES, imageLimit: 5 * MB },
    gallery: { types: [...IMAGE_TYPES, 'video/mp4'], imageLimit: 20 * MB, videoLimit: 25 * MB },
    forum: { types: IMAGE_TYPES, imageLimit: 8 * MB },
    'forum-discussions': { types: [...IMAGE_TYPES, 'application/pdf'], imageLimit: 8 * MB, pdfLimit: 15 * MB },
    'forum-group': { types: IMAGE_TYPES, imageLimit: 8 * MB },
    'forum-covers': { types: IMAGE_TYPES, imageLimit: 8 * MB },
    'chat-attachments': { types: [...IMAGE_TYPES, 'application/pdf'], imageLimit: 10 * MB, pdfLimit: 20 * MB },
    documents: { types: [...IMAGE_TYPES, 'application/pdf'], imageLimit: 10 * MB, pdfLimit: 25 * MB },
    jobs: { types: [...IMAGE_TYPES, 'application/pdf'], imageLimit: 10 * MB, pdfLimit: 25 * MB },
    assets: { types: [...IMAGE_TYPES, 'video/mp4', ...AUDIO_TYPES], imageLimit: 25 * MB, videoLimit: 100 * MB, audioLimit: 50 * MB },
    'asset-originals': { types: [...IMAGE_TYPES, 'video/mp4', ...AUDIO_TYPES], imageLimit: 25 * MB, videoLimit: 100 * MB, audioLimit: 50 * MB },
    gig_thumbnails: { types: IMAGE_TYPES, imageLimit: 5 * MB },
    gig_galleries: { types: [...IMAGE_TYPES, 'video/mp4'], imageLimit: 20 * MB, videoLimit: 25 * MB },
    gig_orders: { types: [...IMAGE_TYPES, 'video/mp4', ...AUDIO_TYPES, 'application/pdf'], imageLimit: 20 * MB, videoLimit: 50 * MB, audioLimit: 25 * MB, pdfLimit: 20 * MB },
};

function getUploadPolicy(folder, contentType) {
    const policy = UPLOAD_POLICIES[folder];
    if (!policy || !policy.types.includes(contentType) || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
        throw new Error(`Content type "${contentType}" is not allowed for folder "${folder}"`);
    }
    const categoryLimit = contentType === 'application/pdf'
        ? policy.pdfLimit
        : contentType.startsWith('video/')
            ? policy.videoLimit
            : contentType.startsWith('audio/')
                ? policy.audioLimit
                : policy.imageLimit;
    return {
        allowedTypes: policy.types.filter(type => ALLOWED_CONTENT_TYPES.includes(type)),
        maxFileSize: Math.min(categoryLimit || ABSOLUTE_MAX_FILE_SIZE, ABSOLUTE_MAX_FILE_SIZE),
    };
}

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

async function generateStandaloneUploadUrl(folder, filename, contentType, cacheControl = "public, max-age=86400", signUrl = true) {
    try {
        // 1. Validate folder
        if (!ALLOWED_FOLDERS.includes(folder)) {
            throw new Error(`Folder "${folder}" is not allowed. Allowed: ${ALLOWED_FOLDERS.join(', ')}`);
        }

        // 2. Validate the MIME type for this upload purpose and select its size limit.
        const uploadPolicy = getUploadPolicy(folder, contentType);

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
        const validExtensions = CONTENT_TYPE_EXTENSIONS[contentType];
        if (!extension || !validExtensions?.includes(extension)) {
            throw new Error(`File extension does not match content type "${contentType}"`);
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

        const uploadUrl = signUrl
            ? await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY })
            : null;

        console.log('📝 Generated upload URL:', {
            folder,
            key,
            contentType,
            expiresIn: `${URL_EXPIRY} seconds`,
            fileSizeLimit: `${uploadPolicy.maxFileSize / MB}MB`,
            allowedTypes: uploadPolicy.allowedTypes.length
        });

        return {
            uploadUrl,
            key,
            expiresIn: URL_EXPIRY,
            maxFileSize: uploadPolicy.maxFileSize,
            allowedTypes: uploadPolicy.allowedTypes,
            allowedFolders: ALLOWED_FOLDERS
        };

    } catch (err) {
        console.error('Error in generateUploadUrl:', err);
        throw err;
    }
}

async function generateUploadUrl(accountId, folder, filename, contentType) {
    const safeAccountId = String(accountId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(safeAccountId)) throw new Error('Invalid upload owner');
    // Reuse the common validation/key preparation without signing an unused URL.
    const prepared = await generateStandaloneUploadUrl(folder, filename, contentType, 'private, no-store', false);
    const basename = prepared.key.slice(`${folder}/`.length);
    const intentToken = crypto.randomUUID();
    const stagingKey = `_uploads/${safeAccountId}/${intentToken}/${basename}`;
    const finalKey = `${folder}/${safeAccountId}/${basename}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: stagingKey,
        ContentType: contentType,
        CacheControl: 'private, no-store'
    });
    const expiresAt = new Date(Date.now() + URL_EXPIRY * 1000);
    const [intent, uploadUrl] = await Promise.all([
        createUploadIntentRepository({
            accountId: safeAccountId,
            originalName: filename,
            stagingKey,
            finalKey,
            expectedMimeType: contentType,
            maxSizeBytes: prepared.maxFileSize,
            expiresAt,
        }),
        getSignedUrl(s3, command, { expiresIn: URL_EXPIRY }),
    ]);
    return {
        uploadUrl,
        uploadIntentId: intent.upload_intent_id,
        expiresIn: URL_EXPIRY,
        maxFileSize: prepared.maxFileSize,
        allowedTypes: prepared.allowedTypes,
    };
}

async function generateOnboardingAvatarUploadUrl(userId, filename, contentType) {
    const safeUserId = String(userId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(safeUserId)) throw new Error('Invalid onboarding upload owner');

    const result = await generateStandaloneUploadUrl('profile', filename, contentType, 'private, max-age=0, no-cache');
    const basename = result.key.slice('profile/'.length);
    const key = `profile/onboarding/${safeUserId}/${basename}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: 'private, max-age=0, no-cache'
    });
    return {
        ...result,
        key,
        uploadUrl: await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY })
    };
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
        if (file.size > ABSOLUTE_MAX_FILE_SIZE) {
            throw new Error(`File size exceeds ${ABSOLUTE_MAX_FILE_SIZE / MB}MB limit`);
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
        maxFileSize: ABSOLUTE_MAX_FILE_SIZE,
        urlExpiry: URL_EXPIRY,
        forbiddenExtensions: FORBIDDEN_EXTENSIONS
    };
}

async function finalizeUploadService(accountId, uploadIntentId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(uploadIntentId || ''))) {
        const error = new Error('Invalid upload intent'); error.statusCode = 400; throw error;
    }
    const existing = await getUploadIntentForOwnerRepository(uploadIntentId, accountId);
    if (!existing) { const error = new Error('Upload intent not found'); error.statusCode = 404; throw error; }
    if (existing.consumed_at || existing.status === 'consumed') { const error = new Error('Upload intent has already been used'); error.statusCode = 409; throw error; }
    if (new Date(existing.expires_at).getTime() <= Date.now()) { const error = new Error('Upload intent has expired'); error.statusCode = 410; throw error; }
    const intent = await claimUploadIntentRepository(uploadIntentId, accountId);
    if (!intent) { const error = new Error('Upload intent is already being finalized'); error.statusCode = 409; throw error; }

    let copied = false;
    try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: intent.staging_key }));
        const size = Number(head.ContentLength);
        const actualType = String(head.ContentType || '').split(';')[0].trim().toLowerCase();
        if (!Number.isSafeInteger(size) || size <= 0 || size > intent.max_size_bytes) {
            const error = new Error('Uploaded file size is invalid'); error.statusCode = 422; throw error;
        }
        if (actualType !== String(intent.expected_mime_type).toLowerCase()) {
            const error = new Error('Uploaded file type does not match the upload intent'); error.statusCode = 422; throw error;
        }
        const copySource = encodeURIComponent(`${process.env.AWS_BUCKET_NAME}/${intent.staging_key}`).replace(/%2F/g, '/');
        const isProtectedAssetOriginal = intent.final_key.startsWith('asset-originals/');
        await s3.send(new CopyObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: intent.final_key,
            CopySource: copySource,
            ContentType: actualType,
            CacheControl: isProtectedAssetOriginal ? 'private, no-store' : 'public, max-age=86400',
            MetadataDirective: 'REPLACE',
        }));
        copied = true;
        const result = await consumeUploadIntentRepository(uploadIntentId, accountId, {
            name: intent.original_name,
            mimeType: actualType,
            sizeBytes: size,
        });
        // Cleanup is not part of the user-visible critical path. The verified final
        // object and database record already exist, so deletion can finish in the background.
        void s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: intent.staging_key }))
            .catch(() => undefined);
        return result;
    } catch (error) {
        if (copied) await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: intent.final_key })).catch(() => undefined);
        await releaseUploadIntentRepository(uploadIntentId, accountId).catch(() => undefined);
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) error.statusCode = 422;
        throw error;
    }
}

async function generateProtectedAssetUrl(path, filename, contentType, disposition) {
    const key = String(path || '').trim();
    if (!key.startsWith('asset-originals/') && !key.startsWith('assets/')) {
        const error = new Error('Invalid protected asset path');
        error.statusCode = 400;
        throw error;
    }
    if (key.includes('..') || key.includes('\\')) {
        const error = new Error('Invalid protected asset path');
        error.statusCode = 400;
        throw error;
    }
    const safeFilename = String(filename || 'asset-download')
        .replace(/[^a-zA-Z0-9._ -]/g, '_')
        .slice(0, 150) || 'asset-download';
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ResponseContentType: contentType || 'application/octet-stream',
        ResponseContentDisposition: `${disposition}; filename="${safeFilename}"`,
    });
    return getSignedUrl(s3, command, { expiresIn: 60 });
}

async function generateProtectedAssetDownloadUrl(path, filename, contentType) {
    return generateProtectedAssetUrl(path, filename, contentType, 'attachment');
}

async function generateProtectedAssetPreviewUrl(path, filename, contentType) {
    return generateProtectedAssetUrl(path, filename, contentType, 'inline');
}

module.exports = {
    getAllProfileFilesServices,
    generateUploadUrl,
    uploadFileToS3,
    getUploadConfig,
    finalizeUploadService,
    generateOnboardingAvatarUploadUrl,
    generateProtectedAssetDownloadUrl,
    generateProtectedAssetPreviewUrl
};
