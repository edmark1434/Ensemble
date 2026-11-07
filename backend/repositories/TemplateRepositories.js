const { pool } = require('../lib/Database');

function templateError(message) {
  return Object.assign(new Error(message), { statusCode: 409, code: 'TEMPLATE_UNAVAILABLE' });
}

async function getTemplateSource(assetId) {
  const { rows: [source] } = await pool.query(
    `SELECT template.yjs_snapshot_id FROM market_ydoc_assets template
     JOIN market_assets asset ON asset.market_asset_id = template.market_asset_id
     WHERE template.market_asset_id = $1 AND asset.deleted_at IS NULL`, [assetId]);
  if (!source) throw templateError('This template is unavailable.');
  return source;
}

// Called inside checkout, using its buyer/asset lock and transaction. A supplied
// project ID is an idempotency key, never permission to overwrite a project.
async function createTemplateProject(client, assetId, accountId, projectId, prepared) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [projectId]);
  const { rows: [existing] } = await client.query('SELECT project_id FROM projects WHERE project_id = $1', [projectId]);
  if (existing) {
    const { rowCount } = await client.query(
      `SELECT 1 FROM market_asset_licenses license
       JOIN users buyer ON buyer.user_id = license.buyer_user_id
       JOIN project_members member ON member.project_id = license.project_id AND member.user_id = buyer.user_id
       JOIN projects project ON project.project_id = license.project_id
       WHERE license.project_id = $1 AND license.market_asset_id = $2 AND buyer.account_id = $3
         AND license.status = 'active' AND license.deleted_at IS NULL
         AND member.role = 'Owner' AND member.deleted_at IS NULL AND project.deleted_at IS NULL`,
      [projectId, assetId, accountId]);
    if (!rowCount) throw templateError('This project request is no longer available. Start a new template use.');
    return;
  }
  // Lock the listing so its snapshot cannot change between preparation and checkout.
  const { rows: [source] } = await client.query(
    `SELECT template.yjs_snapshot_id FROM market_assets asset
     JOIN market_ydoc_assets template ON template.market_asset_id = asset.market_asset_id
     WHERE asset.market_asset_id = $1 AND asset.deleted_at IS NULL FOR UPDATE OF asset`, [assetId]);
  if (!source || String(source.yjs_snapshot_id) !== String(prepared.snapshotId)) {
    throw templateError('This template changed. Review it again before creating your project.');
  }
  const { rows: [buyer] } = await client.query('SELECT user_id FROM users WHERE account_id = $1', [accountId]);
  if (!buyer) throw templateError('Your account cannot create this project.');
  await client.query(
    `INSERT INTO projects (project_id, name, status, width, height, duration_seconds)
     VALUES ($1, $2, 'active', $3, $4, $5)`,
    [projectId, prepared.name, prepared.width, prepared.height, prepared.durationSeconds]);
  await client.query(
    `INSERT INTO project_members (project_id, user_id, role, cursor_color) VALUES ($1, $2, 'Owner', '#3B82F6')`,
    [projectId, buyer.user_id]);
  // Keep independent upload records so deleting the creator's upload cannot
  // delete files still referenced by this purchased copy. Market media is excluded.
  for (const upload of prepared.uploads || []) {
    const { rows: [media] } = await client.query(
      `SELECT media.* FROM media_assets media
       JOIN files original ON original.file_id = media.original_file_id AND original.deleted_at IS NULL
       WHERE media.media_asset_id = $1 AND media.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = media.media_asset_id)
       FOR SHARE OF media, original`, [upload.sourceId]);
    if (!media) throw templateError('A template upload is no longer available.');
    await client.query(
      `INSERT INTO media_assets (media_asset_id, owner_user_id, project_id, name, type, original_file_id,
        proxy_file_id, thumbnail_file_id, width, height, duration_seconds, is_marketed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE)`,
      [upload.id, buyer.user_id, projectId, media.name, media.type, media.original_file_id,
        media.proxy_file_id, media.thumbnail_file_id, media.width, media.height, media.duration_seconds]);
  }
  const saveSnapshot = async (document, blockId = null) => {
    const { rows: [snapshot] } = await client.query(
      'INSERT INTO yjs_snapshots (document) VALUES ($1) RETURNING yjs_snapshot_id', [Buffer.from(document, 'base64')]);
    if (blockId) await client.query('INSERT INTO block_yjs_snapshots (yjs_snapshot_id, block_id) VALUES ($1, $2)', [snapshot.yjs_snapshot_id, blockId]);
    else await client.query('INSERT INTO project_yjs_snapshots (yjs_snapshot_id, project_id) VALUES ($1, $2)', [snapshot.yjs_snapshot_id, projectId]);
  };
  await saveSnapshot(prepared.document);
  for (const scene of prepared.scenes) {
    await client.query(
      `INSERT INTO blocks (block_id, project_id, name, resolution_width, resolution_height, color_space, frame_rate, general_access)
       VALUES ($1, $2, $3, $4, $5, 'RGB', $6, 'Anyone can edit')`,
      [scene.id, projectId, scene.name, scene.width, scene.height, scene.fps]);
    await client.query(`INSERT INTO block_members (block_id, user_id, role, cursor_color) VALUES ($1, $2, 'Owner', '#3B82F6')`, [scene.id, buyer.user_id]);
    await saveSnapshot(scene.document, scene.id);
  }
}

module.exports = { getTemplateSource, createTemplateProject };
