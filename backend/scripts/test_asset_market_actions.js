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
    purchaseContext: { role: 'Editor', project_status: 'active', balance_credits: 100, project_license_id: null, available_license_id: null },
  };
  const repositories = {
    purchaseAssetRepository: async (...args) => {
      state.actions.push(['purchase', ...args]);
      return { license: { project_id: args[3].projectId }, alreadyPurchased: false, buyerBalanceCredits: 100 };
    },
    getEditorAssetPurchaseContextRepository: async () => state.purchaseContext,
    listAssetLicensesRepository: async (...args) => { state.actions.push(['licenses', ...args]); return []; },
    assignAssetLicenseRepository: async (...args) => {
      state.actions.push(['assign', ...args]);
      if (state.assignmentError) throw Object.assign(new Error(state.assignmentError), { code: state.assignmentError });
      return { market_asset_license_id: args[1], project_id: args[3] };
    },
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
      generateProtectedAssetRenderUrl: async (...args) => { state.signed.push(args); return 'protected-render'; },
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


test('license assignment validates IDs and maps authorization/conflict errors', async () => {
  const f = fixture();
  const licenseId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  for (const project of [null, '', 'bad', [projectId], { projectId }]) {
    await assert.rejects(f.services.assignAssetLicenseServices(f.assetId, licenseId, f.accountId, { projectId: project }), { statusCode: 400 });
  }
  assert.equal(f.state.actions.length, 0);
  const result = await f.services.assignAssetLicenseServices(f.assetId, licenseId, f.accountId, { projectId: projectId.toUpperCase() });
  assert.equal(result.project_id, projectId);
  for (const [code, statusCode] of [['ASSET_LICENSE_PROJECT_FORBIDDEN', 403], ['ASSET_LICENSE_ALREADY_ASSIGNED', 409], ['ASSET_LICENSE_NOT_FOUND', 404]]) {
    f.state.assignmentError = code;
    await assert.rejects(f.services.assignAssetLicenseServices(f.assetId, licenseId, f.accountId, { projectId }), { code, statusCode });
  }
});

test('license history is paginated and original access rejects malformed project context', async () => {
  const f = fixture();
  await assert.rejects(f.services.listAssetLicensesServices(f.assetId, f.accountId, { page: -1 }), { statusCode: 400 });
  await assert.rejects(f.services.listAssetLicensesServices(f.assetId, f.accountId, { page: 1.5 }), { statusCode: 400 });
  const result = await f.services.listAssetLicensesServices(f.assetId, f.accountId, { page: '2' });
  assert.equal(result.page, 2);
  assert.equal(result.hasMore, false);
  assert.deepEqual(f.state.actions[0], ['licenses', f.assetId, f.accountId, 51, 50]);
  for (const method of ['getAssetDownloadServices', 'getAssetOriginalPreviewServices']) {
    await assert.rejects(f.services[method](f.assetId, f.accountId, null, ['bad']), { statusCode: 400 });
  }
  assert.equal(f.state.signed.length, 0);
});


test('editor purchase details are scoped to editable project membership and report available licenses', async () => {
  const f = fixture();
  const projectId = crypto.randomUUID();
  let quote = await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId });
  assert.equal(quote.balanceCredits, 100);
  assert.equal(quote.licensed, false);
  assert.equal(quote.hasAvailableLicense, false);
  f.state.purchaseContext.available_license_id = crypto.randomUUID();
  quote = await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId });
  assert.equal(quote.hasAvailableLicense, true);
  f.state.purchaseContext.role = 'Viewer';
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId }), { statusCode: 403 });
  f.state.purchaseContext.role = 'Editor';
  f.state.purchaseContext.project_status = 'frozen';
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId }), { statusCode: 409 });
});

test('editor checkout validates confirmed price and charge, and protects original source requests', async () => {
  const f = fixture();
  const projectId = crypto.randomUUID();
  for (const consent of [{}, { expectedPrice: 10 }, { expectedPrice: 10, expectedCharge: -1 }, { expectedPrice: '10', expectedCharge: 10 }]) {
    await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase', projectId, ...consent }), { statusCode: 400 });
  }
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'source', projectId, mediaAssetId: crypto.randomUUID() }), { statusCode: 403 });
  assert.equal(f.state.signed.length, 0);
});


test('creator ownership never silently licenses a project or unlocks editor originals', async () => {
  const f = fixture();
  const projectId = crypto.randomUUID();
  f.state.asset.is_owner = true;
  f.state.file.is_owner = true;
  const quote = await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId });
  assert.equal(quote.licensed, false);
  assert.equal(quote.asset.is_owner, true);
  assert.equal(f.state.actions.length, 0, 'Reading a quote must not purchase or assign');
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'source', projectId, mediaAssetId: crypto.randomUUID() }), { statusCode: 403 });
  assert.equal(f.state.signed.length, 0);
  f.state.purchaseContext.project_license_id = crypto.randomUUID();
  f.state.file.is_purchased = true;
  assert.equal((await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'purchase-details', projectId })).licensed, true);
  await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'source', projectId, mediaAssetId: crypto.randomUUID() });
  assert.equal(f.state.signed.length, 1);
});


test('automatic free use always forces zero cost and a server-side free-only check', async () => {
  const f = fixture();
  const projectId = crypto.randomUUID();
  const result = await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'use-free', projectId, expectedPrice: 500, expectedCharge: 500, freeOnly: false });
  const call = f.state.actions[0];
  assert.equal(call[0], 'purchase');
  assert.equal(call[4].projectId, projectId);
  assert.equal(call[4].freeOnly, true);
  assert.equal(call[4].expectedPrice, 0);
  assert.equal(call[4].expectedCharge, 0);
  assert.equal(result.transaction, null);
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { action: 'use-free', projectId: 'invalid' }), { statusCode: 400 });
});


test('export sources use originals only for project licenses, and proxies for unpaid drafts', async () => {
  const f = fixture();
  const payload = { action: 'render-source', projectId: crypto.randomUUID(), mediaAssetId: crypto.randomUUID(), draft: false };
  f.state.file.is_owner = true;
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, payload), { statusCode: 409, code: 'ASSET_PURCHASE_REQUIRED' });
  assert.equal(f.state.signed.length, 0, 'Ownership alone never unlocks clean exports');
  Object.assign(f.state.file, { original_file_id: 'original', proxy_file_id: 'proxy', proxy_path: 'assets/proxies/image/test.png', proxy_name: 'preview.png', proxy_mime_type: 'image/png', media_type: 'image' });
  await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { ...payload, draft: true });
  assert.equal(f.state.signed[0][0], f.state.file.proxy_path);
  f.state.file.proxy_file_id = 'original';
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, { ...payload, draft: true }), { statusCode: 409 });
  f.state.file.is_purchased = true;
  await f.services.performEditorAssetActionServices(f.assetId, f.accountId, payload);
  await f.services.performEditorAssetActionServices(f.assetId, f.accountId, { ...payload, draft: true });
  assert.equal(f.state.signed[1][0], f.state.file.path);
  assert.equal(f.state.signed[2][0], f.state.file.path, 'Licensed/free assets remain clean even in mixed drafts');
  f.state.purchaseContext = null;
  await assert.rejects(f.services.performEditorAssetActionServices(f.assetId, f.accountId, payload), { statusCode: 403 });
  assert.equal(f.state.actions.length, 0, 'Export must not purchase or charge');
});
