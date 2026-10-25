require('dotenv').config();
const { pool } = require('../lib/Database');
const { backfillAssetDerivativesServices } = require('../services/AssetPreviewServices');

function optionValue(name) {
  const prefix = `--${name}=`;
  const option = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return option ? option.slice(prefix.length) : undefined;
}

async function main() {
  const result = await backfillAssetDerivativesServices({
    dryRun: process.argv.includes('--dry-run'),
    limit: optionValue('limit') || process.env.ASSET_PREVIEW_BACKFILL_LIMIT || 1000,
  });
  console.log('Asset derivative backfill:', {
    candidates: result.candidates,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed.length,
  });
  for (const failure of result.failed) {
    console.error(`Derivatives failed for media asset ${failure.mediaAssetId}: ${failure.error}`);
  }
  if (result.failed.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Asset derivative backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
