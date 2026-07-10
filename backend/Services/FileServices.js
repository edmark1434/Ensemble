const {
    getAllProfileFilesRepositories
} = require('../Repositories/FileRepositories');
const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require('../lib/amazon_s3');
const dotenv = require('dotenv');
dotenv.config();
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
    const extension = filename.split('.').pop();
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
    const key = `${folder}/${uniqueFilename}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: cacheControl,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // URL valid for 1 hour
    return {
        uploadUrl,
        key
    };
}

module.exports = {
    getAllProfileFilesServices,
    generateUploadUrl
};