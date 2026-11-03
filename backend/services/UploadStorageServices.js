const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const { listExpiredUploadsRepository, deleteExpiredUploadRepository } = require('../repositories/UploadStorageRepositories');

async function removeUploadObjects(userId, keys) {
  if (!keys.length) return;
  if (keys.some(key => !key.startsWith(`uploads/${userId}/`))) throw new Error('Invalid upload storage path');
  if (!process.env.AWS_BUCKET_NAME) throw new Error('Upload storage is not configured');
  const result = await s3.send(new DeleteObjectsCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Delete: { Objects: [...new Set(keys)].map(Key => ({ Key })), Quiet: true },
  }), { abortSignal: AbortSignal.timeout(15000) });
  if (result.Errors?.length) throw new Error('Unable to remove upload files');
}

async function purgeExpiredUploadsServices() {
  const uploads = await listExpiredUploadsRepository();
  let deleted = 0;
  let failed = 0;
  for (const upload of uploads) {
    try { if (await deleteExpiredUploadRepository(upload.media_asset_id, removeUploadObjects)) deleted++; }
    catch { failed++; }
  }
  // Failed uploads remain in trash, so the existing retention job can retry.
  if (failed) throw new Error(`S3 deletion failed for ${failed} expired uploads`);
  return deleted;
}

module.exports = { purgeExpiredUploadsServices };
