const { getAssetServices, purchaseAssetServices } = require('./AssetServices');
const { getTemplateSource } = require('../repositories/TemplateRepositories');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message, statusCode = 409) {
  return Object.assign(new Error(message), { statusCode, code: 'TEMPLATE_USE_FAILED' });
}

async function prepareTemplate(assetId, accountId) {
  if (!UUID.test(assetId)) throw fail('Invalid template.', 400);
  const asset = await getAssetServices(assetId, accountId);
  if (asset.type !== 'template') throw fail('Only templates can create a project.', 400);
  if (asset.status !== 'published') throw fail('This template is not published.');
  const source = await getTemplateSource(assetId);
  if (!process.env.EDITOR_URL || !process.env.INTERNAL_API_SECRET) throw fail('Template creation is temporarily unavailable.', 503);
  const response = await fetch(`${process.env.EDITOR_URL.replace(/\/$/, '')}/api/internal/templates/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET },
    body: JSON.stringify({ snapshotId: String(source.yjs_snapshot_id), name: asset.name }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => { throw fail('Unable to prepare this template. Please try again.', 503); });
  if (!response.ok) throw fail('This template could not be copied. Please try again.', 503);
  const prepared = await response.json();
  return { asset, prepared };
}

async function getTemplateUseDetails(assetId, accountId) {
  const { asset, prepared } = await prepareTemplate(assetId, accountId);
  return {
    expectedPrice: asset.price_credits,
    expectedCharge: asset.is_owner || asset.available_license_count > 0 ? 0 : asset.price_credits,
    hasAvailableLicense: asset.available_license_count > 0,
    hasPaidAssets: prepared.hasPaidAssets,
  };
}

async function getTemplatePreviewDetails(assetId, accountId) {
  if (!UUID.test(assetId)) throw fail('Invalid template.', 400);
  const asset = await getAssetServices(assetId, accountId);
  if (asset.type !== 'template' || asset.status !== 'published') throw fail('This template is unavailable.', 404);
  if (!process.env.EDITOR_URL || !process.env.INTERNAL_API_SECRET) throw fail('Template preview is temporarily unavailable.', 503);
  const response = await fetch(`${process.env.EDITOR_URL.replace(/\/$/, '')}/api/internal/templates/market-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET },
    body: JSON.stringify({ assetId }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => { throw fail('Unable to load the template preview. Please try again.', 503); });
  if (!response.ok) throw fail('This template preview is unavailable.', response.status === 404 ? 404 : 503);
  return response.json();
}

async function useTemplate(assetId, accountId, payload) {
  if (!UUID.test(payload.projectId || '') || !Number.isSafeInteger(payload.expectedPrice) || payload.expectedPrice < 0
    || !Number.isSafeInteger(payload.expectedCharge) || payload.expectedCharge < 0) throw fail('Review the template before creating your project.', 400);
  const { prepared } = await prepareTemplate(assetId, accountId);
  const projectId = payload.projectId.toLowerCase();
  const result = await purchaseAssetServices(assetId, accountId, projectId, payload.expectedPrice, payload.expectedCharge, false, prepared);
  return { ...result, projectId };
}

module.exports = { getTemplateUseDetails, getTemplatePreviewDetails, useTemplate };
