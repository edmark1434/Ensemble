import { db } from "@/lib/db";
import { buildThumbnailJob } from "@/lib/collab/thumbnail-payload";

const RENDER_SERVER_URL =
  process.env.RENDER_SERVER_URL || "http://localhost:3001";

const IDLE_DEBOUNCE_MS = 2 * 60_000;
const IDLE_MAX_WAIT_MS = 10 * 60_000;
const RENDER_TIMEOUT_MS = 60_000;

const scheduled = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; firstDirtyAt: number }
>();
const inFlight = new Set<string>();
const rerun = new Set<string>();

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

async function generateThumbnail(
  projectId: string,
  finalUpdate?: Uint8Array,
): Promise<void> {
  if (!INTERNAL_API_SECRET) {
    throw new Error("INTERNAL_API_SECRET is not set, can't call render server");
  }

  const project = await db
    .selectFrom("projects")
    .where("project_id", "=", projectId)
    .where("deleted_at", "is", null)
    .select(["thumbnail_file_id", "thumbnail_source_hash"])
    .executeTakeFirst();
  if (!project) return;

  const previousFileId = project.thumbnail_file_id;
  const job = await buildThumbnailJob(projectId, finalUpdate);

  // Nothing visual left (or never was): clear any stale thumbnail.
  if (!job) {
    if (previousFileId) {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable("projects")
          .set({ thumbnail_file_id: null, thumbnail_source_hash: null })
          .where("project_id", "=", projectId)
          .execute();
        await trx
          .updateTable("files")
          .set({ deleted_at: new Date() })
          .where("file_id", "=", previousFileId)
          .execute();
      });
    }
    return;
  }

  if (previousFileId && job.hash === project.thumbnail_source_hash) return;

  const outKey = `thumbnails/${projectId}/${job.hash.slice(0, 16)}.jpg`;

  const res = await fetch(`${RENDER_SERVER_URL}/thumbnails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_API_SECRET,
    },
    body: JSON.stringify({ payload: job.payload, outKey }),
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`thumbnail render failed (${res.status}): ${body}`);
  }

  const { sizeBytes } = (await res.json()) as { sizeBytes: number };

  await db.transaction().execute(async (trx) => {
    const file = await trx
      .insertInto("files")
      .values({
        name: "thumbnail.jpg",
        path: outKey,
        mime_type: "image/jpeg",
        size_bytes: sizeBytes,
      })
      .returning("file_id")
      .executeTakeFirstOrThrow();

    await trx
      .updateTable("projects")
      .set({
        thumbnail_file_id: file.file_id,
        thumbnail_source_hash: job.hash,
      })
      .where("project_id", "=", projectId)
      .execute();

    if (previousFileId) {
      await trx
        .updateTable("files")
        .set({ deleted_at: new Date() })
        .where("file_id", "=", previousFileId)
        .execute();
    }
  });
}

async function run(projectId: string, finalUpdate?: Uint8Array): Promise<void> {
  if (inFlight.has(projectId)) {
    rerun.add(projectId);
    return;
  }
  inFlight.add(projectId);
  try {
    await generateThumbnail(projectId, finalUpdate);
  } catch (error) {
    console.error(`thumbnail generation failed for project ${projectId}:`, error);
  } finally {
    inFlight.delete(projectId);
    if (rerun.delete(projectId)) markProjectDirty(projectId);
  }
}

// Call on every project-room doc update.
export function markProjectDirty(projectId: string): void {
  const now = Date.now();
  const existing = scheduled.get(projectId);
  const firstDirtyAt = existing?.firstDirtyAt ?? now;
  if (existing) clearTimeout(existing.timer);

  const wait = Math.min(
    IDLE_DEBOUNCE_MS,
    Math.max(0, firstDirtyAt + IDLE_MAX_WAIT_MS - now),
  );

  scheduled.set(projectId, {
    firstDirtyAt,
    timer: setTimeout(() => {
      scheduled.delete(projectId);
      void run(projectId);
    }, wait),
  });
}

// Call when the last connection leaves a project room, before the room doc
// is destroyed. finalUpdate = Y.encodeStateAsUpdate(roomDoc).
export function onProjectRoomEmpty(
  projectId: string,
  finalUpdate?: Uint8Array,
): void {
  const existing = scheduled.get(projectId);
  if (existing) {
    clearTimeout(existing.timer);
    scheduled.delete(projectId);
  }
  void run(projectId, finalUpdate);
}