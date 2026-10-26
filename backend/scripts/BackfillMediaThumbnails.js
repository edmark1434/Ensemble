require('dotenv').config({ quiet: true });
const { pool } = require('../lib/Database');
const { backfillMediaThumbnailsServices } = require('../services/MediaThumbnailServices');

const limit = process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) || 1000;
backfillMediaThumbnailsServices({ limit, dryRun: process.argv.includes('--dry-run') })
  .then((result) => {
    console.log('Media thumbnail backfill:', { candidates: result.candidates, updated: result.updated,
      skipped: result.skipped, failed: result.failed.length });
    for (const failure of result.failed) console.error(`Thumbnail failed for ${failure.mediaAssetId}: ${failure.error}`);
    if (result.failed.length) process.exitCode = 1;
  })
  .catch((error) => { console.error('Thumbnail backfill failed:', error.message); process.exitCode = 1; })
  .finally(() => pool.end());
