require('dotenv').config();
const { pool } = require('../lib/Database');
const {
  backfillAssetBundlePreviewsServices,
} = require('../services/AssetPreviewServices');

function optionValue(name) {
  const prefix = `--${name}=`;
  const option = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return option ? option.slice(prefix.length) : undefined;
}

async function main() {
  const result = await backfillAssetBundlePreviewsServices({
    dryRun: process.argv.includes('--dry-run'),
    limit: optionValue('limit') || process.env.ASSET_PREVIEW_BACKFILL_LIMIT || 1000,
  });
  console.log('Asset bundle preview backfill:', {
    candidates: result.candidates,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed.length,
  });
  for (const failure of result.failed) {
    console.error(`Preview failed for bundle ${failure.bundleFileId}: ${failure.error}`);
  }
  if (result.failed.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Asset bundle preview backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
