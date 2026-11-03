# Direct S3 deletion for editor uploads

- Delete forever removes the upload's distinct, unshared original/proxy/thumbnail S3 keys directly, then marks its existing media record deleted. No additional database columns, migration or cleanup worker are used.
- The existing ten-minute trash-retention job performs the same deletion for expired uploads. Regular trash remains recoverable during its 30-day retention period.
- Both paths use their service's existing AWS credentials and AWS_BUCKET_NAME. The AWS identity needs s3:DeleteObject on the uploads prefix.
- Files used by another non-deleted media asset are retained. Only keys under uploads/<owner_user_id>/ are deleted. Database records remain for missing-media/history.
- A failed S3 request leaves the database record undeleted, allowing a manual retry or the next existing retention pass. A partially successful multi-object delete can already have removed some files; retrying those keys is safe.
- This uses ordinary S3 DeleteObjects. In a versioned bucket it creates delete markers; older versions still need an S3 noncurrent-version expiration lifecycle rule if storage must be reclaimed. This change does not alter bucket configuration or delete historical versions. See AWS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html
- Previous permanently deleted uploads are not swept automatically by this direct-deletion flow.

No tests, builds, migrations, or live S3 deletions were run.
