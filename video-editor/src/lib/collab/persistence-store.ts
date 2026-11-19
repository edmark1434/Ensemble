import { sql, type RawBuilder } from "kysely";
import * as Y from "yjs";
import { db } from "@/lib/db";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import { liveDocuments } from "./live-rooms";
import { withProjectSnapshotLock } from "./snapshot-lock";

interface StoredDocument {
  kind: CollabTarget["kind"];
  id: string;
  snapshot_id: number | null;
  snapshot_at: Date | null;
  document: Buffer | null;
  update_ids: number[];
  updates: Buffer[];
}

// A single statement reads the latest snapshot and every still-pending update.
// Only updates actually captured by a compaction are removed.
function documentQuery(kind: CollabTarget["kind"], documents: RawBuilder<unknown>) {
  const key = sql.ref(`link.${kind}_id`);
  return sql<StoredDocument>`
    SELECT ${kind}::text AS kind, docs.id, snapshot.snapshot_id, snapshot.snapshot_at, snapshot.document,
           pending.update_ids, pending.updates
    FROM (${documents}) docs
    LEFT JOIN LATERAL (
      SELECT s.yjs_snapshot_id AS snapshot_id, s.created_at AS snapshot_at, s.document
      FROM ${sql.table(`${kind}_yjs_snapshots`)} link
      JOIN yjs_snapshots s ON s.yjs_snapshot_id = link.yjs_snapshot_id
      WHERE ${key} = docs.id
      ORDER BY s.created_at DESC, s.yjs_snapshot_id DESC LIMIT 1
    ) snapshot ON true
    CROSS JOIN LATERAL (
      SELECT COALESCE(array_agg(u.yjs_update_id ORDER BY u.yjs_update_id), '{}') AS update_ids,
             COALESCE(array_agg(u.update ORDER BY u.yjs_update_id), '{}') AS updates
      FROM ${sql.table(`${kind}_yjs_updates`)} link
      JOIN yjs_updates u ON u.yjs_update_id = link.yjs_update_id
      WHERE ${key} = docs.id
    ) pending
  `;
}

export interface PersistedState {
  snapshot: Buffer | null;
  updates: Buffer[];
}

async function loadDocument(kind: CollabTarget["kind"], id: string): Promise<PersistedState> {
  const { rows: [state] } = await documentQuery(kind, sql`SELECT ${id}::uuid AS id`).execute(db);
  return { snapshot: state.document, updates: state.updates };
}

export const loadLatestProjectState = (id: string) => loadDocument("project", id);
export const loadLatestBlockState = (id: string) => loadDocument("block", id);

function compactDocument(state: StoredDocument, live: Uint8Array | undefined, extra?: Uint8Array) {
  if (state.document && !state.updates.length && !live && !extra) return state.document;
  const doc = new Y.Doc({ gc: false });
  try {
    if (state.document) Y.applyUpdate(doc, state.document);
    for (const update of state.updates) Y.applyUpdate(doc, update);
    if (live) Y.applyUpdate(doc, live);
    if (extra) Y.applyUpdate(doc, extra);
    return Buffer.from(Y.encodeStateAsUpdate(doc));
  } finally {
    doc.destroy();
  }
}

function projectMetadata(document: Buffer) {
  const doc = new Y.Doc({ gc: false });
  try {
    Y.applyUpdate(doc, document);
    const meta = doc.getMap("meta");
    const name = meta.get("projectName");
    const size = meta.get("size") as { width?: number; height?: number } | undefined;
    const duration = meta.get("duration");
    return {
      name: typeof name === "string" ? name : undefined,
      width: typeof size?.width === "number" ? size.width : undefined,
      height: typeof size?.height === "number" ? size.height : undefined,
      duration_seconds: typeof duration === "number" ? Math.floor(duration / 1000) : undefined,
    };
  } finally {
    doc.destroy();
  }
}

export async function checkpointAfterUpdates(projectId: string, target: CollabTarget) {
  const countRows = db.fn.countAll().as("count");
  const query = target.kind === "project"
    ? db.selectFrom("project_yjs_updates").where("project_id", "=", target.id).select(countRows)
    : db.selectFrom("block_yjs_updates").where("block_id", "=", target.id).select(countRows);
  const { count } = await query.executeTakeFirstOrThrow();
  if (Number(count) >= 200) await compactProjectAndScenes(projectId);
}

interface CaptureOptions {
  supplied?: { target: CollabTarget; update: Uint8Array };
}

export function compactProjectAndScenes(projectId: string, { supplied }: CaptureOptions = {}) {
  return withProjectSnapshotLock(projectId, () => db.transaction().execute(async trx => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${`project-save:${projectId}`}))`.execute(trx);
    const project = documentQuery("project", sql`SELECT ${projectId}::uuid AS id`);
    const blocks = documentQuery("block", sql`
      SELECT block_id AS id FROM blocks WHERE project_id = ${projectId} AND deleted_at IS NULL
    `);
    // Keep the cutoff in Postgres precision. It must advance even if two
    // checkpoints occur in one millisecond or the wall clock moves backwards.
    const { rows } = await sql<StoredDocument & { capture_at: string; newer_than_root: boolean }>`
      SELECT docs.*,
             greatest(statement_timestamp()::timestamp, max(snapshot_at) OVER () + interval '1 microsecond')::text AS capture_at,
             snapshot_at > max(snapshot_at) FILTER (WHERE kind = 'project') OVER () AS newer_than_root
      FROM (
        SELECT * FROM (${project}) project_state
        UNION ALL
        SELECT * FROM (${blocks}) block_states
      ) docs
    `.execute(trx);
    if (supplied && !rows.some(row => row.kind === supplied.target.kind && row.id === supplied.target.id)) {
      throw new Error("The current document does not belong to this project");
    }
    // Capture all hydrated rooms in one event-loop turn, before any DB writes.
    const captured = rows.map(state => {
      const live = liveDocuments.get(`${state.kind}:${state.id}`);
      const extra = supplied?.target.kind === state.kind && supplied.target.id === state.id ? supplied.update : undefined;
      const document = compactDocument(state, live && Y.encodeStateAsUpdate(live), extra);
      return { state, document, unchanged: state.document?.equals(document) === true };
    });
    const root = captured.find(({ state }) => state.kind === "project")!;
    let sceneChanged = false;
    const writeSnapshot = (document: Buffer) =>
      trx.insertInto("yjs_snapshots")
        .values(eb => ({ document, created_at: eb.cast<Date>(eb.val(root.state.capture_at), "timestamp") }))
        .returning(["yjs_snapshot_id", "created_at"]).executeTakeFirstOrThrow();

    for (const { state, document, unchanged } of captured) {
      if (state.update_ids.length) {
        if (state.kind === "project") {
          await trx.deleteFrom("project_yjs_updates").where("yjs_update_id", "in", state.update_ids).execute();
        } else {
          await trx.deleteFrom("block_yjs_updates").where("yjs_update_id", "in", state.update_ids).execute();
        }
        await trx.deleteFrom("yjs_updates").where("yjs_update_id", "in", state.update_ids).execute();
      }
      if (state.kind === "project") continue;
      if (state.newer_than_root) sceneChanged = true;
      if (unchanged) continue;
      const snapshot = await writeSnapshot(document);
      await trx.insertInto("block_yjs_snapshots")
        .values({ block_id: state.id, yjs_snapshot_id: snapshot.yjs_snapshot_id }).execute();
      sceneChanged = true;
    }

    if (root.unchanged && !sceneChanged && root.state.snapshot_id !== null && root.state.snapshot_at) {
      return { snapshotId: root.state.snapshot_id, createdAt: root.state.snapshot_at, created: false, document: root.document };
    }

    const snapshot = await writeSnapshot(root.document);
    const snapshotId = snapshot.yjs_snapshot_id;
    await trx.insertInto("project_yjs_snapshots")
      .values({ project_id: projectId, yjs_snapshot_id: snapshotId }).execute();
    await trx.updateTable("projects").set({ ...projectMetadata(root.document), updated_at: new Date() })
      .where("project_id", "=", projectId).execute();
    return { snapshotId, createdAt: snapshot.created_at, created: true, document: root.document };
  }));
}
