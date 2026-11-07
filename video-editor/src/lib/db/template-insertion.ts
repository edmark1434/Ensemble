import { sql } from "kysely";
import { db } from "@/lib/db";
import type { prepareTemplateCopy } from "@/lib/template-use-service";

export async function authorizeTemplateInsertion(projectId: string, userId: string, assetId: string) {
  const result = await sql`SELECT 1 FROM projects p
    JOIN project_members m ON m.project_id = p.project_id
    JOIN market_asset_licenses l ON l.project_id = p.project_id
    WHERE p.project_id = ${projectId} AND m.user_id = ${userId}
    AND m.role IN ('Owner', 'Manager', 'Editor') AND m.deleted_at IS NULL
    AND p.deleted_at IS NULL AND p.status <> 'frozen'
    AND l.market_asset_id = ${assetId} AND l.status = 'active' AND l.deleted_at IS NULL`.execute(db);
  return result.rows.length > 0;
}

export async function saveTemplateInsertion(projectId: string, userId: string, assetId: string, prepared: Awaited<ReturnType<typeof prepareTemplateCopy>>) {
  await db.transaction().execute(async trx => {
    const access = await sql`SELECT p.project_id FROM projects p
      JOIN project_members m ON m.project_id = p.project_id
      JOIN market_asset_licenses l ON l.project_id = p.project_id
      JOIN market_assets a ON a.market_asset_id = l.market_asset_id
      JOIN market_ydoc_assets t ON t.market_asset_id = a.market_asset_id
      WHERE p.project_id = ${projectId} AND m.user_id = ${userId}
      AND m.role IN ('Owner','Manager','Editor') AND m.deleted_at IS NULL
      AND p.deleted_at IS NULL AND p.status <> 'frozen'
      AND l.market_asset_id = ${assetId} AND l.status = 'active' AND l.deleted_at IS NULL
      AND a.deleted_at IS NULL AND a.status = 'published' AND t.yjs_snapshot_id = ${Number(prepared.snapshotId)}
      FOR SHARE OF p,m,l,a,t`.execute(trx);
    if (!access.rows.length) throw new Error("Template access changed. Open the template again.");
    for (const upload of prepared.uploads) {
      const media = await sql<{ media_asset_id: string }>`SELECT m.media_asset_id FROM media_assets m
        JOIN files f ON f.file_id = m.original_file_id AND f.deleted_at IS NULL
        WHERE m.media_asset_id = ${upload.sourceId} AND m.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM market_media_assets link WHERE link.media_asset_id = m.media_asset_id)
        FOR SHARE OF m,f`.execute(trx);
      if (!media.rows.length) throw new Error("A template upload is no longer available. Try again.");
      await sql`INSERT INTO media_assets (media_asset_id,owner_user_id,project_id,name,type,original_file_id,
        proxy_file_id,thumbnail_file_id,width,height,duration_seconds,is_marketed)
        SELECT ${upload.id},${userId},${projectId},name,type,original_file_id,proxy_file_id,thumbnail_file_id,width,height,duration_seconds,FALSE
        FROM media_assets WHERE media_asset_id = ${upload.sourceId}`.execute(trx);
    }
    for (const scene of prepared.scenes) {
      await sql`INSERT INTO blocks (block_id,project_id,name,resolution_width,resolution_height,color_space,frame_rate,general_access)
        VALUES (${scene.id},${projectId},${scene.name},${scene.width},${scene.height},'RGB',${scene.fps},'Anyone can edit')`.execute(trx);
      await sql`INSERT INTO block_members (block_id,user_id,role,cursor_color)
        VALUES (${scene.id},${userId},'Owner','#3B82F6')`.execute(trx);
      const saved = await trx.insertInto("yjs_snapshots").values({ document: Buffer.from(scene.document, "base64") })
        .returning("yjs_snapshot_id").executeTakeFirstOrThrow();
      await trx.insertInto("block_yjs_snapshots").values({ block_id: scene.id, yjs_snapshot_id: saved.yjs_snapshot_id }).execute();
    }
  });
}
