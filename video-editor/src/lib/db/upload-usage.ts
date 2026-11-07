import * as Y from "yjs";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";
import { loadLatestBlockState } from "@/lib/collab/block-persistence-store";
import { liveRooms } from "@/lib/collab/live-rooms";
import { createCollabSchema, readStateFromDoc } from "@/features/editor/collab/ydoc-schema";
import { mediaSources, mediaSourceKey } from "@/features/editor/utils/media-sources";

async function sourcesFor(kind: "project" | "block", id: string) {
  const stored = await (kind === "project" ? loadLatestProjectState(id) : loadLatestBlockState(id));
  const doc = new Y.Doc();
  try {
    const schema = createCollabSchema(doc);
    if (stored.snapshot) Y.applyUpdate(doc, stored.snapshot);
    for (const update of stored.updates) Y.applyUpdate(doc, update);
    const live = liveRooms.get(`${kind}:${id}`);
    if (live) Y.applyUpdate(doc, Y.encodeStateAsUpdate((await live).doc));
    return mediaSources(readStateFromDoc(schema));
  } finally {
    doc.destroy();
  }
}

export async function getUploadUsage(userId: string, id: string) {
  const upload = await db
    .selectFrom("media_assets")
    .innerJoin("files", "files.file_id", "media_assets.original_file_id")
    .leftJoin("files as proxy", "proxy.file_id", "media_assets.proxy_file_id")
    .select(["files.path", "proxy.path as proxyPath", "media_assets.name"])
    .where("media_assets.media_asset_id", "=", id)
    .where("media_assets.owner_user_id", "=", userId)
    .where("media_assets.deleted_at", "is", null)
    .where("media_assets.trashed_at", "is not", null)
    .executeTakeFirst();
  if (!upload) return null;
  const sources = [buildPublicUrl(upload.path), ...(upload.proxyPath ? [buildPublicUrl(upload.proxyPath)] : [])];
  const keys = new Set(sources.map(mediaSourceKey));
  const hasSource = (values: string[]) => values.some(value => keys.has(mediaSourceKey(value)));
  const projects = await db
    .selectFrom("projects")
    .select(["project_id", "name"])
    .where("deleted_at", "is", null)
    .execute();
  const memberships = await db
    .selectFrom("project_members")
    .select("project_id")
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .execute();
  const visible = new Set(memberships.map((row) => row.project_id));
  const used: { projectId: string | null; name: string; locations: string[] }[] = [];
  for (const project of projects) {
    const locations: string[] = [];
    if (hasSource(await sourcesFor("project", project.project_id)))
      locations.push("Project timeline");
    const blocks = await db
      .selectFrom("blocks")
      .select(["block_id", "name"])
      .where("project_id", "=", project.project_id)
      .where("deleted_at", "is", null)
      .execute();
    for (const block of blocks) {
      if (hasSource(await sourcesFor("block", block.block_id)))
        locations.push(visible.has(project.project_id) ? block.name : "Scene");
    }
    if (locations.length)
      used.push({
        projectId: visible.has(project.project_id) ? project.project_id : null,
        name: visible.has(project.project_id)
          ? project.name
          : "Project you no longer have access to",
        locations,
      });
  }
  return { name: upload.name, sources, projects: used };
}

export async function missingUploadSources(sources: string[]): Promise<string[]> {
  const placeholders = new Set(sources.filter(source => source.startsWith("missing-template-media:")));
  const paths = [...new Set(sources.filter(source => !placeholders.has(source)).map(mediaSourceKey))];
  if (!paths.length) return [...placeholders];
  const rows = await db
    .selectFrom("media_assets")
    .innerJoin("files", join => join.on(eb => eb.or([
      eb("files.file_id", "=", eb.ref("media_assets.original_file_id")),
      eb("files.file_id", "=", eb.ref("media_assets.proxy_file_id")),
    ])))
    .select("files.path")
    .where("files.path", "in", paths)
    .where("media_assets.deleted_at", "is not", null)
    // A purchased template copy can retain the same file after the source upload
    // is deleted. Only report a missing source when no live media record retains it.
    .where(eb => eb.not(eb.exists(eb.selectFrom("media_assets as retained")
      .select("retained.media_asset_id").where("retained.deleted_at", "is", null)
      .where(inner => inner.or([
        inner("retained.original_file_id", "=", inner.ref("files.file_id")),
        inner("retained.proxy_file_id", "=", inner.ref("files.file_id")),
      ])))))
    .execute();
  const missing = new Set(rows.map(row => row.path));
  return sources.filter(source => placeholders.has(source) || missing.has(mediaSourceKey(source)));
}
