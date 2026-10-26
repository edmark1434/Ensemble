const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function fixture() {
  const assetId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const state = {
    asset: { market_asset_id: assetId, name: 'Test bundle', owner_account_id: ownerId, price_credits: 10, is_owner: false },
    file: { is_owner: false, is_purchased: false, path: 'asset-originals/test', name: 'file.png', mime_type: 'image/png' },
    reports: [], actions: [], signed: [],
  };
  const repositories = {
    getAssetRepository: async () => state.asset,
    getAssetDownloadRepository: async () => state.file,
    setAssetLikeRepository: async (...args) => { state.actions.push(['like', ...args]); return { is_liked: args[2] }; },
    setAssetSaveRepository: async (...args) => { state.actions.push(['save', ...args]); return { is_saved: args[2] }; },
  };
  const module = { exports: {} };
  const dependencies = {
    '../repositories/AssetRepositories': repositories,
    '../services/FileServices': {},
    './FileServices': {
      generateProtectedAssetDownloadUrl: async (...args) => { state.signed.push(args); return 'protected-download'; },
      generateProtectedAssetPreviewUrl: async (...args) => { state.signed.push(args); return 'protected-preview'; },
    },
    '../lib/WebSocket': {},
    '../lib/AssetMarketplaceConstants': { DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT: 10, calculateAssetTransactionFee: () => 1 },
    '../lib/PlatformFeeSettings': { getMarketplaceTransactionFeePercent: async () => 10 },
    '../repositories/ModeratorSharedRepositories': { createReport: async (report) => { state.reports.push(report); return report; } },
    crypto,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/AssetServices.js'), 'utf8'), {
    module, console, require: (name) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return { assetId, accountId, ownerId, state, services: module.exports };
}

test('reports enter the asset moderation queue with trusted creator and reporter identities', async () => {
  const f = fixture();
  await f.services.reportAssetServices(f.assetId, f.accountId, { type: 'Copyright infringement', description: 'This listing contains my artwork without permission.', targetAccountId: 'spoofed' });
  assert.equal(f.state.reports.length, 1);
  const report = f.state.reports[0];
  assert.equal(report.reporterAccountId, f.accountId);
  assert.equal(report.targetAccountId, f.ownerId);
  assert.equal(report.targetId, f.assetId);
  assert.equal(report.targetType, 'asset');
  assert.equal(report.referenceTable, 'market_assets');
});

test('self-reports, short details, overlong details, invalid IDs and inaccessible assets are rejected', async () => {
  const f = fixture();
  const details = { type: 'Other', description: 'A sufficiently detailed report about this asset.' };
  f.state.asset.is_owner = true;
  await assert.rejects(f.services.reportAssetServices(f.assetId, f.accountId, details), { statusCode: 403 });
  f.state.asset.is_owner = false;
  await assert.rejects(f.services.reportAssetServices(f.assetId, f.accountId, { ...details, description: 'too short' }), { statusCode: 400 });
  await assert.rejects(f.services.reportAssetServices(f.assetId, f.accountId, { ...details, description: 'x'.repeat(2001) }), { statusCode: 400 });
  await assert.rejects(f.services.reportAssetServices('invalid', f.accountId, details), { statusCode: 400 });
  f.state.asset = null;
  await assert.rejects(f.services.reportAssetServices(f.assetId, f.accountId, details), { statusCode: 404 });
  assert.equal(f.state.reports.length, 0);
});

test('editor actions accept explicit booleans, persist like/save, and reject unsupported actions', async () => {
  const f = fixture();
  for (const action of ['like', 'save']) {
    await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action, enabled: true });
    await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action, enabled: false });
  }
  assert.equal(f.state.actions.length, 4);
  for (const payload of [{ action: 'purchase', enabled: true }, { action: 'like', enabled: 'false' }]) {
    await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, payload), { statusCode: 400 });
  }
  f.state.asset = null;
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'save', enabled: true }), { statusCode: 404 });
  assert.equal(f.state.actions.length, 4);
});

test('original previews and downloads require creator or purchased access before signing any URL', async () => {
  const f = fixture();
  for (const method of ['getAssetDownloadServices', 'getAssetOriginalPreviewServices']) {
    await assert.rejects(f.services[method](f.assetId, f.accountId), { statusCode: 403 });
    assert.equal(f.state.signed.length, 0);
  }
  for (const access of ['is_owner', 'is_purchased']) {
    f.state.file[access] = true;
    for (const method of ['getAssetDownloadServices', 'getAssetOriginalPreviewServices']) await f.services[method](f.assetId, f.accountId);
    f.state.file[access] = false;
  }
  assert.equal(f.state.signed.length, 4);
});


test('editor bridge requires the configured internal secret', () => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/RequireInternalSecret.js'), 'utf8'), {
    module, Buffer, process: { env: { INTERNAL_API_SECRET: 'unit-test-secret' } }, require: () => crypto,
  });
  for (const provided of [undefined, 'wrong', 'unit-test-secret']) {
    let accepted = false;
    const response = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json() { return this; } };
    module.exports({ get: () => provided }, response, () => { accepted = true; });
    assert.equal(accepted, provided === 'unit-test-secret');
    assert.equal(response.statusCode, accepted ? 200 : 401);
  }
});
