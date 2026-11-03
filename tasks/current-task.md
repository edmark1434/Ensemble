# Active Task: Direct S3 deletion for permanently deleted uploads

## Objective

Delete upload files directly in S3 on Delete forever and existing 30-day trash expiry, keeping the existing database soft delete. Remove the unrequested cleanup schema and worker.

## Acceptance criteria

- No new database columns, migration, cleanup status or additional scheduled worker.
- Delete forever sends a direct S3 delete for distinct original/proxy/thumbnail keys before marking the upload deleted.
- Existing trash expiry removes the same S3 keys before setting deleted_at; storage failures remain eligible for the next existing retention pass.
- Preserve ownership checks, recoverable trash, database records and missing-media behavior.
- Retain keys still referenced by another non-deleted media asset and restrict deletions to the owner's upload prefix.
- Use existing AWS credentials. Keep S3 versioning configuration unchanged.

## Implementation

- Removed the unexecuted upload-storage-cleanup migration, schema fields, new scheduler and cleanup job.
- Editor upload-trash service deletes S3 objects directly inside the existing permanent-deletion workflow.
- Existing backend UploadTrashRetentionJob delegates direct S3 removal to UploadStorageServices with SQL in UploadStorageRepositories.
- Restored the existing upload key format; no unrelated upload naming changes.
- Ordinary S3 DeleteObjects behavior applies: versioned buckets retain older versions unless a bucket lifecycle rule removes them. No automatic sweep of previously deleted uploads.

## Verification

No tests, builds, migrations, automated checks or live S3 deletions run, per user instruction.
