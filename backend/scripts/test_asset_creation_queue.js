// Development DB regression: all fixtures and listing changes are rolled back.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { pool } = require('../lib/Database');
const s3 = require('../lib/AmazonS3');
const { createAssetRepository, getAssetRepository } = require('../repositories/AssetRepositories');
const { completeMediaAssetJobRepository, failMediaAssetJobRepository } = require('../repositories/MediaJobRepositories');
const { runMediaJob } = require('../services/MediaJobServices');

async function main() {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST), 'Only run against local development DB');
  const realConnect = pool.connect.bind(pool);
  const realQuery = pool.query.bind(pool);
  const realSend = s3.send;
  const client = await realConnect();
  const query = client.query.bind(client);
  try {
    await query('BEGIN');
    await query("SET LOCAL statement_timeout = '10s'");
    // Keep every repository transaction inside this outer rollback-only transaction.
    pool.query = query;
    pool.connect = async () => ({
      query: (sql, params) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)
        ? Promise.resolve({ rows: [], rowCount: 0 }) : query(sql, params),
      release() {},
    });
    const { rows: [owner] } = await query('SELECT account_id FROM upload_intents ORDER BY created_at DESC LIMIT 1');
    assert.ok(owner, 'A local upload owner is needed');
    const image = await sharp({ create: { width: 320, height: 240, channels: 3, background: '#456789' } }).png().toBuffer();
    const stored = new Set();
    s3.send = async (command) => {
      if (command.constructor.name === 'GetObjectCommand') return { Body: { transformToByteArray: async () => image } };
      if (command.constructor.name === 'PutObjectCommand') { stored.add(command.input.Key); return {}; }
      if (command.constructor.name === 'DeleteObjectCommand') { stored.delete(command.input.Key); return {}; }
      throw new Error('Unexpected storage command');
    };

    for (const type of ['video', 'audio', 'image']) {
      const id = crypto.randomUUID();
      const mime = { image: 'image/png', video: 'video/mp4', audio: 'audio/mpeg' }[type];
      const originalPath = `asset-originals/regression/${id}`;
      await query('INSERT INTO files (file_id,name,path,mime_type,size_bytes) VALUES ($1,$2,$3,$4,$5)',
        [id, `Regression ${type}`, originalPath, mime, image.length]);
      await query(`INSERT INTO upload_intents
        (account_id,original_name,staging_key,final_key,expected_mime_type,max_size_bytes,expires_at,status,consumed_at,file_id)
        VALUES ($1,$2,$3,$4,$5,1048576,NOW()+interval '5 minutes','consumed',NOW(),$6)`,
      [owner.account_id, `Regression ${type}`, `_uploads/regression/${id}`, originalPath, mime, id]);
      const payload = {
        name: 'Asset creation regression', description: 'Rolled back after verification',
        priceCredits: 0, status: 'published', type, tags: [], originalFileIds: [id],
        thumbnailFileIds: [], showcaseOriginalFileIds: [], showcaseOrder: [], maxUploadFileBytes: 1048576,
      };
      if (type === 'video') {
        await query('SAVEPOINT legacy_schema');
        await query('ALTER TABLE media_assets ALTER COLUMN proxy_file_id SET NOT NULL, ALTER COLUMN thumbnail_file_id SET NOT NULL');
        await assert.rejects(createAssetRepository(owner.account_id, payload), { code: '23502' });
        await query('ROLLBACK TO SAVEPOINT legacy_schema');
        console.log('PASS: reproduced old video creation NOT NULL failure');
      }
      const started = Date.now();
      const assetId = await createAssetRepository(owner.account_id, payload);
      const asset = await getAssetRepository(assetId, owner.account_id);
      assert.equal(asset.status, 'draft');
      assert.equal(asset.processing_status, 'processing');
      assert.equal(asset.media_assets[0].proxy_path, null);
      const { rows: [job] } = await query('SELECT * FROM media_asset_jobs WHERE market_asset_id=$1', [assetId]);
      assert.equal(job.kind, type);
      console.log(`PASS: ${type} creation queued in ${Date.now() - started}ms`);
      assert.equal(await failMediaAssetJobRepository({ ...job, attempts: 3 }, 'simulated failure'), false);
      assert.equal((await getAssetRepository(assetId, owner.account_id)).processing_status, 'failed');
      assert.equal((await getAssetRepository(assetId, owner.account_id)).status, 'draft');
      await query("UPDATE media_asset_jobs SET status='running',attempts=1 WHERE media_asset_job_id=$1", [job.media_asset_job_id]);
      if (type === 'image') {
        assert.equal(await runMediaJob({ ...job, attempts: 1, original_file_id: id,
          original_name: 'regression.png', original_path: originalPath, original_size_bytes: image.length }), 'done');
        assert.equal(stored.size, 2);
      } else {
        const file = { name: 'Regression derivative', path: `assets/regression/${id}`, mimeType: mime, sizeBytes: 128 };
        await completeMediaAssetJobRepository(job, { proxy: file,
          ...(type === 'video' ? { thumbnail: { ...file, mimeType: 'image/webp' }, width: 1920, height: 1080 } : {}),
          durationSeconds: 2 });
      }
      const ready = await getAssetRepository(assetId, owner.account_id);
      assert.equal(ready.processing_status, 'ready');
      assert.equal(ready.status, 'published');
      assert.ok(ready.media_assets[0].proxy_path);
      const { rows: [media] } = await query('SELECT original_file_id FROM media_assets WHERE media_asset_id=$1', [job.media_asset_id]);
      assert.equal(media.original_file_id, id);
      console.log(`PASS: ${type} failure stays draft; completion publishes generated proxy`);
    }

    const bundleFiles = [];
    for (let index = 0; index < 3; index += 1) {
      const id = crypto.randomUUID();
      const originalPath = `${index === 2 ? 'assets' : 'asset-originals'}/regression/${id}.png`;
      await query('INSERT INTO files (file_id,name,path,mime_type,size_bytes) VALUES ($1,$2,$3,$4,$5)',
        [id, 'Bundle thumbnail regression.png', originalPath, 'image/png', image.length]);
      await query(`INSERT INTO upload_intents
        (account_id,original_name,staging_key,final_key,expected_mime_type,max_size_bytes,expires_at,status,consumed_at,file_id)
        VALUES ($1,$2,$3,$4,'image/png',1048576,NOW()+interval '5 minutes','consumed',NOW(),$5)`,
      [owner.account_id, 'Bundle thumbnail regression.png', `_uploads/regression/${id}`, originalPath, id]);
      bundleFiles.push({ id, originalPath });
    }
    const bundleId = await createAssetRepository(owner.account_id, {
      name: 'Bundle thumbnail regression', description: 'Rolled back after verification',
      priceCredits: 0, status: 'draft', type: 'image', tags: [],
      originalFileIds: bundleFiles.slice(0, 2).map((file) => file.id), thumbnailFileIds: [bundleFiles[2].id],
      showcaseOriginalFileIds: [], showcaseOrder: [`upload:${bundleFiles[2].id}`],
      maxUploadFileBytes: 1048576, maxShowcaseTotalBytes: 1048576,
    });
    const { rows: [showcaseJob] } = await query(`SELECT job.* FROM media_asset_jobs job
      JOIN market_asset_thumbnails link ON link.media_asset_id = job.media_asset_id
      WHERE job.market_asset_id = $1`, [bundleId]);
    assert.ok(showcaseJob, 'new bundle covers are queued for a 320px thumbnail');
    await query("UPDATE media_asset_jobs SET status='running',attempts=1 WHERE media_asset_job_id=$1", [showcaseJob.media_asset_job_id]);
    const beforeShowcase = stored.size;
    assert.equal(await runMediaJob({ ...showcaseJob, attempts: 1, is_content: false,
      original_file_id: bundleFiles[2].id, original_name: 'cover.png', original_path: bundleFiles[2].originalPath,
      original_size_bytes: image.length }), 'done');
    assert.equal(stored.size, beforeShowcase + 1, 'only one small thumbnail uploaded');
    const { rows: [showcase] } = await query(`SELECT m.original_file_id, m.proxy_file_id, m.thumbnail_file_id, f.path
      FROM media_assets m JOIN files f ON f.file_id = m.thumbnail_file_id WHERE m.media_asset_id=$1`, [showcaseJob.media_asset_id]);
    assert.equal(showcase.original_file_id, bundleFiles[2].id);
    assert.equal(showcase.proxy_file_id, bundleFiles[2].id);
    assert.notEqual(showcase.thumbnail_file_id, bundleFiles[2].id);
    assert.ok(showcase.path.startsWith('assets/thumbnails/320/'));
    console.log('PASS: new bundle covers get a thumbnail without replacing their full preview');
  } finally {
    pool.connect = realConnect;
    pool.query = realQuery;
    s3.send = realSend;
    await query('ROLLBACK');
    client.release();
    await pool.end();
  }
  console.log('All fixtures rolled back; no storage objects or listings created.');
}
main().catch((error) => { console.error(error.code || error.name, error.message); process.exitCode = 1; });
