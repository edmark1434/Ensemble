// Local integration regression: schema, fixtures, balances and notifications all roll back.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../lib/Database');
const migration = require('../migrations/1825200000000_market-asset-licenses');
const repo = require('../repositories/AssetRepositories');

async function main() {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST), 'Local development DB only');
  const realConnect = pool.connect.bind(pool);
  const realQuery = pool.query.bind(pool);
  const client = await realConnect();
  const query = client.query.bind(client);
  let sequence = 0;
  const apply = async (direction) => {
    let sql;
    migration[direction]({ sql: (value) => { sql = value; } });
    await query(sql);
  };
  const rejectsSql = async (sql, params, pattern) => {
    await query('SAVEPOINT expected_error');
    await assert.rejects(query(sql, params), pattern);
    await query('ROLLBACK TO SAVEPOINT expected_error');
    await query('RELEASE SAVEPOINT expected_error');
  };
  try {
    await query('BEGIN');
    await query("SET LOCAL statement_timeout = '15s'");
    pool.query = query;
    pool.connect = async () => {
      const savepoint = `license_test_${++sequence}`;
      return { release() {}, query: async (sql, params) => {
        if (sql === 'BEGIN') return query(`SAVEPOINT ${savepoint}`);
        if (sql === 'COMMIT') return query(`RELEASE SAVEPOINT ${savepoint}`);
        if (sql === 'ROLLBACK') {
          await query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          return query(`RELEASE SAVEPOINT ${savepoint}`);
        }
        return query(sql, params);
      } };
    };
    const { rows: people } = await query(`SELECT u.user_id, a.account_id, w.wallet_id
      FROM users u JOIN accounts a ON a.account_id = u.account_id
      JOIN account_wallets aw ON aw.account_id = a.account_id
      JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE a.deleted_at IS NULL AND w.type = 'account wallets' AND LOWER(w.status) = 'active'
      ORDER BY u.user_id LIMIT 4`);
    assert.equal(people.length, 4, 'Need four local accounts with wallets');
    const [creator, buyer, collaborator, outsider] = people;
    await query('UPDATE wallets SET balance_credits = 10000 WHERE wallet_id = ANY($1::uuid[])', [people.map(p => p.wallet_id)]);
    const assetId = randomUUID();
    const fileId = randomUUID();
    const mediaId = randomUUID();
    await query(`INSERT INTO files(file_id, name, path, mime_type, size_bytes)
      VALUES ($1, 'license-test.png', $2, 'image/png', 100)`, [fileId, `asset-originals/regression/${fileId}.png`]);
    await query(`INSERT INTO media_assets(media_asset_id, name, type, is_marketed, owner_user_id,
      original_file_id, proxy_file_id, thumbnail_file_id)
      VALUES ($1, 'License regression', 'image', TRUE, $2, $3, $3, $3)`, [mediaId, creator.user_id, fileId]);
    await query(`INSERT INTO market_assets(market_asset_id, name, description, price_credits, status, created_at, updated_at)
      VALUES ($1, 'License regression', 'Rollback-only fixture', 100, 'published', NOW(), NOW())`, [assetId]);
    await query('INSERT INTO market_media_assets(market_asset_id, media_asset_id, position) VALUES ($1,$2,0)', [assetId, mediaId]);
    const projectIds = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of projectIds) {
      await query("INSERT INTO projects(project_id, name, status) VALUES ($1, 'License regression', 'active')", [id]);
      for (const [person, role] of [[buyer, 'Owner'], [collaborator, 'Editor']]) {
        await query(`INSERT INTO project_members(project_id, user_id, role, cursor_color)
          VALUES ($1,$2,$3,'#123456')`, [id, person.user_id, role]);
      }
    }
    const { rows: [legacy] } = await query("SELECT to_regclass('user_market_assets') IS NOT NULL AS present");
    if (legacy.present) {
      const { rows: [tx] } = await query(`INSERT INTO credit_transactions
        (type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id)
        VALUES ('Asset Purchase', 100, 'completed', $1,$2,'market_assets',$3) RETURNING credit_transaction_id`,
      [buyer.wallet_id, creator.wallet_id, assetId]);
      await query(`INSERT INTO user_market_assets(user_id, market_asset_id, price, status, deleted_at)
        VALUES ($1,$4,100,'active',NULL),($2,$4,77,'refunded',NULL),($3,$4,0,'active',CURRENT_TIMESTAMP)`,
      [buyer.user_id, collaborator.user_id, outsider.user_id, assetId]);
      const before = (await query('SELECT * FROM user_market_assets ORDER BY user_id, market_asset_id')).rows;
      await apply('up');
      const { rows: migrated } = await query('SELECT * FROM market_asset_licenses WHERE market_asset_id = $1 ORDER BY buyer_user_id', [assetId]);
      assert.equal(migrated.length, 3);
      assert.ok(migrated.every(l => l.project_id === null && l.assigned_at === null));
      assert.equal(migrated.find(l => l.buyer_user_id === buyer.user_id).credit_transaction_id, tx.credit_transaction_id);
      assert.equal(migrated.find(l => l.buyer_user_id === collaborator.user_id).price_credits, 77);
      assert.equal(migrated.find(l => l.buyer_user_id === collaborator.user_id).status, 'refunded');
      assert.ok(migrated.find(l => l.buyer_user_id === outsider.user_id).deleted_at);
      await apply('down');
      assert.deepEqual((await query('SELECT * FROM user_market_assets ORDER BY user_id, market_asset_id')).rows, before);
      await apply('up');
      await query('DELETE FROM market_asset_licenses WHERE market_asset_id = $1', [assetId]);
      console.log('PASS migration: preserves active/refunded/deleted purchases, links ledger, round-trips up/down');
    }
    const first = await repo.purchaseAssetRepository(assetId, buyer.account_id, 10);
    assert.equal(first.alreadyPurchased, false);
    assert.equal(first.license.project_id, null);
    assert.equal(first.license.credit_transaction_id, first.transactionId);
    assert.equal(first.buyerBalanceCredits, 9900);
    assert.equal(first.creatorBalanceCredits, 10090);
    assert.equal(first.transactionFeeCredits, 10);
    const retry = await repo.purchaseAssetRepository(assetId, buyer.account_id, 10);
    assert.equal(retry.alreadyPurchased, true);
    assert.equal(retry.license.market_asset_license_id, first.license.market_asset_license_id);
    assert.equal(retry.buyerBalanceCredits, 9900);
    assert.deepEqual(retry.notifications, []);
    console.log('PASS purchase: transaction linkage, fees, available-license retry without a second charge');
    const licenseId = first.license.market_asset_license_id;
    const assign = (account, project, id = licenseId) => repo.assignAssetLicenseRepository(assetId, id, account, project);
    await assert.rejects(assign(outsider.account_id, projectIds[0]), { code: 'ASSET_LICENSE_PROJECT_FORBIDDEN' });
    await assert.rejects(assign(collaborator.account_id, projectIds[0]), { code: 'ASSET_LICENSE_NOT_FOUND' });
    await query("UPDATE project_members SET role = 'Viewer' WHERE project_id=$1 AND user_id=$2", [projectIds[0], buyer.user_id]);
    await assert.rejects(assign(buyer.account_id, projectIds[0]), { code: 'ASSET_LICENSE_PROJECT_FORBIDDEN' });
    await query("UPDATE project_members SET role = 'Owner' WHERE project_id=$1 AND user_id=$2", [projectIds[0], buyer.user_id]);
    await query("UPDATE projects SET status='frozen' WHERE project_id=$1", [projectIds[0]]);
    await assert.rejects(assign(buyer.account_id, projectIds[0]), { code: 'ASSET_LICENSE_PROJECT_FROZEN' });
    await query("UPDATE projects SET status='active' WHERE project_id=$1", [projectIds[0]]);
    const assigned = await assign(buyer.account_id, projectIds[0]);
    assert.equal(assigned.project_id, projectIds[0]);
    assert.deepEqual(await assign(buyer.account_id, projectIds[0]), assigned);
    await assert.rejects(assign(buyer.account_id, projectIds[1]), { code: 'ASSET_LICENSE_ALREADY_ASSIGNED' });
    await rejectsSql('UPDATE market_asset_licenses SET project_id=$2 WHERE market_asset_license_id=$1', [licenseId, projectIds[1]], /cannot be reassigned/);
    await rejectsSql('UPDATE market_asset_licenses SET project_id=NULL,assigned_at=NULL WHERE market_asset_license_id=$1', [licenseId], /cannot be reassigned/);
    await query('SAVEPOINT lossy_down');
    await assert.rejects(apply('down'), /losing purchase history/);
    await query('ROLLBACK TO SAVEPOINT lossy_down');
    console.log('PASS assignment: buyer + editable membership, repeat assignment, no transfer, no lossy rollback');
    const access = async (account, project = null) => (await repo.getAssetDownloadRepository(assetId, account, mediaId, project)).is_purchased;
    assert.equal(await access(collaborator.account_id, projectIds[0]), true);
    await query("UPDATE project_members SET role='Viewer' WHERE project_id=$1 AND user_id=$2", [projectIds[0], collaborator.user_id]);
    assert.equal(await access(collaborator.account_id, projectIds[0]), false, 'Library download keeps editable-role requirement');
    assert.equal((await repo.getAssetDownloadRepository(assetId, collaborator.account_id, mediaId, projectIds[0], true)).is_purchased, true, 'Licensed project viewers can play original media');
    assert.equal((await repo.getAssetDownloadRepository(assetId, outsider.account_id, mediaId, projectIds[0], true)).is_purchased, false, 'Playback still excludes nonmembers');
    await query("UPDATE project_members SET role='Editor' WHERE project_id=$1 AND user_id=$2", [projectIds[0], collaborator.user_id]);

    assert.equal(await access(collaborator.account_id, projectIds[1]), false);
    assert.equal(await access(outsider.account_id, projectIds[0]), false);
    assert.equal(await access(buyer.account_id, projectIds[1]), false);
    await query('UPDATE project_members SET deleted_at=NOW() WHERE project_id=$1 AND user_id=$2', [projectIds[0], buyer.user_id]);
    assert.equal(await access(buyer.account_id, projectIds[0]), false);
    assert.equal(await access(collaborator.account_id, projectIds[0]), true);
    assert.equal(await access(buyer.account_id), true, 'Buyer retains library download access');
    console.log('PASS project access: collaborator access survives buyer departure, no other-project or outsider grant');
    const second = await repo.purchaseAssetRepository(assetId, buyer.account_id, 10);
    assert.equal(second.alreadyPurchased, false);
    assert.notEqual(second.license.market_asset_license_id, licenseId);
    assert.equal(second.buyerBalanceCredits, 9800);
    await assign(buyer.account_id, projectIds[1], second.license.market_asset_license_id);
    const collaboratorPurchase = await repo.purchaseAssetRepository(assetId, collaborator.account_id, 10);
    await assert.rejects(assign(collaborator.account_id, projectIds[0], collaboratorPurchase.license.market_asset_license_id), { code: 'ASSET_PROJECT_ALREADY_LICENSED' });
    const ownLicenses = await repo.listAssetLicensesRepository(assetId, buyer.account_id, 50, 0);
    assert.equal(ownLicenses.length, 2);
    assert.equal((await repo.listAssetLicensesRepository(assetId, outsider.account_id, 50, 0)).length, 0);
    assert.equal((await repo.getAssetRepository(assetId, buyer.account_id)).available_license_count, 0);
    await repo.createAssetReviewRepository(assetId, buyer.account_id, 4, 'One review for multiple purchased uses.');
    let asset = await repo.getAssetRepository(assetId, buyer.account_id);
    assert.equal(asset.purchase_count, 3);
    assert.equal(asset.review_count, 1);
    assert.equal(Number(asset.average_rating), 4);
    assert.equal((await repo.listAssetReviewsRepository(assetId, buyer.account_id)).length, 1);
    assert.equal((await repo.validateAssetRefundEligibility(assetId, buyer.account_id)).allowed, false);
    const eligibility = await repo.validateAssetRefundEligibility(assetId, buyer.account_id, licenseId);
    assert.equal(eligibility.purchase.price_credits, 100);
    assert.equal(eligibility.purchase.market_asset_license_id, licenseId);
    await query("UPDATE market_asset_licenses SET status='refunded' WHERE market_asset_license_id=$1", [licenseId]);
    assert.equal(await access(collaborator.account_id, projectIds[0]), false);
    assert.equal(await access(buyer.account_id, projectIds[1]), true);
    console.log('PASS repeat uses: separate project purchases, duplicate-project protection, private history, review deduplication, targeted refunds');
    await rejectsSql(`INSERT INTO market_asset_licenses(buyer_user_id,market_asset_id,price_credits,project_id,assigned_at)
      VALUES ($1,$2,0,$3,NOW())`, [outsider.user_id, assetId, projectIds[1]], { code: '23505' });
    await rejectsSql(`INSERT INTO market_asset_licenses(buyer_user_id,market_asset_id,price_credits)
      VALUES ($1,$2,0)`, [collaborator.user_id, assetId], { code: '23505' });
    await query('UPDATE wallets SET balance_credits=0 WHERE wallet_id=$1', [outsider.wallet_id]);
    await assert.rejects(repo.purchaseAssetRepository(assetId, outsider.account_id, 10), { code: 'ASSET_INSUFFICIENT_BALANCE' });
    assert.equal((await repo.listAssetLicensesRepository(assetId, outsider.account_id, 50, 0)).length, 0);
    await query('UPDATE market_assets SET price_credits=0 WHERE market_asset_id=$1', [assetId]);
    const free = await repo.purchaseAssetRepository(assetId, outsider.account_id, 10);
    assert.equal(free.buyerBalanceCredits, 0);
    assert.equal(free.license.price_credits, 0);
    assert.ok(free.license.credit_transaction_id);
    console.log('PASS constraints, insufficient-funds rollback, and free license claims');

    await query('UPDATE market_assets SET price_credits=100 WHERE market_asset_id=$1', [assetId]);
    await assert.rejects(repo.purchaseAssetRepository(assetId, buyer.account_id, 10,
      { projectId: projectIds[2], expectedPrice: 99, expectedCharge: 99 }), { code: 'ASSET_PRICE_CHANGED' });
    await assert.rejects(repo.purchaseAssetRepository(assetId, buyer.account_id, 10,
      { projectId: projectIds[2], expectedPrice: 100, expectedCharge: 0 }), { code: 'ASSET_LICENSE_COST_CHANGED' });
    await assert.rejects(repo.purchaseAssetRepository(assetId, outsider.account_id, 10,
      { projectId: projectIds[2], expectedPrice: 100, expectedCharge: 100 }), { code: 'ASSET_LICENSE_PROJECT_FORBIDDEN' });
    const checkout = await repo.purchaseAssetRepository(assetId, buyer.account_id, 10,
      { projectId: projectIds[2], expectedPrice: 100, expectedCharge: 100 });
    assert.equal(checkout.license.project_id, projectIds[2]);
    assert.equal(checkout.buyerBalanceCredits, 9700);
    assert.equal(checkout.alreadyPurchased, false);
    const sharedRetry = await repo.purchaseAssetRepository(assetId, collaborator.account_id, 10,
      { projectId: projectIds[2], expectedPrice: 100, expectedCharge: 100 });
    assert.equal(sharedRetry.alreadyPurchased, true);
    assert.equal(sharedRetry.license.market_asset_license_id, checkout.license.market_asset_license_id);
    assert.equal(sharedRetry.buyerBalanceCredits, 9900);
    const reuse = await repo.purchaseAssetRepository(assetId, collaborator.account_id, 10,
      { projectId: projectIds[0], expectedPrice: 100, expectedCharge: 0 });
    assert.equal(reuse.alreadyPurchased, true);
    assert.equal(reuse.license.market_asset_license_id, collaboratorPurchase.license.market_asset_license_id);
    assert.equal(reuse.license.project_id, projectIds[0]);
    assert.equal(reuse.buyerBalanceCredits, 9900);
    const extraProject = randomUUID();
    await query("INSERT INTO projects(project_id,name,status) VALUES ($1,'Checkout regression','active')", [extraProject]);
    await query("INSERT INTO project_members(project_id,user_id,role,cursor_color) VALUES ($1,$2,'Owner','#123456')", [extraProject, collaborator.user_id]);
    await assert.rejects(repo.purchaseAssetRepository(assetId, collaborator.account_id, 10,
      { projectId: extraProject, expectedPrice: 100, expectedCharge: 0 }), { code: 'ASSET_LICENSE_COST_CHANGED' });
    const context = await repo.getEditorAssetPurchaseContextRepository(assetId, collaborator.account_id, projectIds[0]);
    assert.equal(context.project_license_id, reuse.license.market_asset_license_id);
    assert.equal(context.available_license_id, null);
    console.log('PASS editor checkout: atomic assignment, cross-buyer retry without charge, license reuse, price/total consent guards, project membership');
    const creatorProject = randomUUID();
    await query("INSERT INTO projects(project_id,name,status) VALUES ($1,'Creator confirmation regression','active')", [creatorProject]);
    await query("INSERT INTO project_members(project_id,user_id,role,cursor_color) VALUES ($1,$2,'Owner','#123456'),($1,$3,'Editor','#123456')", [creatorProject, creator.user_id, collaborator.user_id]);
    const balancesBefore = (await query('SELECT wallet_id,balance_credits FROM wallets ORDER BY wallet_id')).rows;
    const ledgerBefore = (await query('SELECT count(*) FROM credit_transactions')).rows;
    assert.equal((await repo.getEditorAssetPurchaseContextRepository(assetId, creator.account_id, creatorProject)).project_license_id, null);
    assert.equal((await repo.getAssetDownloadRepository(assetId, creator.account_id, mediaId, creatorProject, true)).is_purchased, false);
    await assert.rejects(repo.purchaseAssetRepository(assetId, creator.account_id, 10, { projectId: creatorProject, expectedPrice: 100, expectedCharge: 100 }), { code: 'ASSET_LICENSE_COST_CHANGED' });
    const own = await repo.purchaseAssetRepository(assetId, creator.account_id, 10, { projectId: creatorProject, expectedPrice: 100, expectedCharge: 0 });
    assert.equal(own.license.project_id, creatorProject);
    assert.equal(own.license.price_credits, 0);
    assert.equal(own.license.credit_transaction_id, null);
    const ownRetry = await repo.purchaseAssetRepository(assetId, creator.account_id, 10, { projectId: creatorProject, expectedPrice: 100, expectedCharge: 0 });
    assert.equal(ownRetry.license.market_asset_license_id, own.license.market_asset_license_id);
    assert.equal(await access(collaborator.account_id, creatorProject), true);
    assert.equal(await access(outsider.account_id, creatorProject), false);
    assert.deepEqual((await query('SELECT wallet_id,balance_credits FROM wallets ORDER BY wallet_id')).rows, balancesBefore);
    assert.deepEqual((await query('SELECT count(*) FROM credit_transactions')).rows, ledgerBefore);
    console.log('PASS creator confirmation: no implicit project license, explicit free grant, idempotency, collaborators, no ledger or balance changes');
    const freeProject = randomUUID();
    await query("INSERT INTO projects(project_id,name,status) VALUES ($1,'Lasting free use regression','active')", [freeProject]);
    await query("INSERT INTO project_members(project_id,user_id,role,cursor_color) VALUES ($1,$2,'Owner','#123456'),($1,$3,'Editor','#123456')", [freeProject, outsider.user_id, collaborator.user_id]);
    const autoUse = (account, project) => repo.purchaseAssetRepository(assetId, account, 10, { projectId: project, expectedPrice: 0, expectedCharge: 0, freeOnly: true });
    await assert.rejects(autoUse(outsider.account_id, freeProject), { code: 'ASSET_PRICE_CHANGED' });
    await query('UPDATE market_assets SET price_credits=0 WHERE market_asset_id=$1', [assetId]);
    await query("UPDATE projects SET status='frozen' WHERE project_id=$1", [freeProject]);
    await assert.rejects(autoUse(outsider.account_id, freeProject), { code: 'ASSET_LICENSE_PROJECT_FROZEN' });
    await query("UPDATE projects SET status='active' WHERE project_id=$1", [freeProject]);
    await query("UPDATE project_members SET role='Viewer' WHERE project_id=$1 AND user_id=$2", [freeProject, collaborator.user_id]);
    await assert.rejects(autoUse(collaborator.account_id, freeProject), { code: 'ASSET_LICENSE_PROJECT_FORBIDDEN' });
    await query("UPDATE project_members SET role='Editor' WHERE project_id=$1 AND user_id=$2", [freeProject, collaborator.user_id]);
    const freeUse = await autoUse(outsider.account_id, freeProject);
    assert.equal(freeUse.license.price_credits, 0);
    assert.equal(freeUse.license.credit_transaction_id, null);
    assert.equal(freeUse.buyerBalanceCredits, 0, 'Free use works with an empty wallet');
    assert.equal((await repo.getEditorAssetPurchaseContextRepository(assetId, outsider.account_id, freeProject)).available_license_id, free.license.market_asset_license_id, 'Free use does not consume an available library license');
    await query('UPDATE market_assets SET price_credits=500 WHERE market_asset_id=$1', [assetId]);
    assert.equal((await autoUse(outsider.account_id, freeProject)).license.market_asset_license_id, freeUse.license.market_asset_license_id);
    assert.equal(await access(collaborator.account_id, freeProject), true, 'Collaborators retain original access after price increase');
    assert.equal((await repo.getAssetDownloadRepository(assetId, outsider.account_id, mediaId, extraProject, true)).is_purchased, false);
    await assert.rejects(autoUse(collaborator.account_id, extraProject), { code: 'ASSET_PRICE_CHANGED' });
    await query("INSERT INTO project_members(project_id,user_id,role,cursor_color) VALUES ($1,$2,'Editor','#123456')", [extraProject, creator.user_id]);
    await assert.rejects(autoUse(creator.account_id, extraProject), { code: 'ASSET_PRICE_CHANGED' });
    assert.deepEqual((await query('SELECT wallet_id,balance_credits FROM wallets ORDER BY wallet_id')).rows, balancesBefore);
    assert.deepEqual((await query('SELECT count(*) FROM credit_transactions')).rows, ledgerBefore);
    console.log('PASS lasting free use: server price check, no payment, no license consumption, frozen/viewer gates, access after price increase, new-project and owner-discount safeguards');



  } finally {
    await query('ROLLBACK');
    pool.connect = realConnect;
    pool.query = realQuery;
    client.release();
    await pool.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
