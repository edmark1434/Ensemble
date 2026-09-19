// lib/db/blocks.ts

import { db } from "@/lib/db";
import * as Y from "yjs";
import { createCollabSchema, hydrateDocFromState } from "@/features/editor/collab/ydoc-schema";

const BLOCK_FRAME_RATE = 30;
const BLOCK_COLOR_SPACE = "RGB";
const BLOCK_INIT_ORIGIN = "block-init";

export async function createBlock({
  blockId,
  projectId,
  name,
  width,
  height,
  ownerUserId,
}: {
  blockId: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  ownerUserId: string;
}): Promise<void> {
  // Same seed shape a brand-new project's doc gets — empty content, but
  // size/fps/background already set so the timeline that opens it isn't
  // guessing defaults.
  const doc = new Y.Doc({ gc: false });
  const schema = createCollabSchema(doc);
  hydrateDocFromState(
    schema,
    {
      trackItemsMap: {},
      trackItemIds: [],
      transitionsMap: {},
      transitionIds: [],
      tracks: [],
      size: { width, height },
      fps: BLOCK_FRAME_RATE,
      duration: 0,
      background: { type: "color", value: "" }, // sets to transparent
    },
    [],
    name,
    BLOCK_INIT_ORIGIN,
  );
  const initialUpdate = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("blocks")
      .values({
        block_id: blockId,
        name,
        resolution_width: width,
        resolution_height: height,
        color_space: BLOCK_COLOR_SPACE,
        frame_rate: BLOCK_FRAME_RATE,
        project_id: projectId,
      })
      .execute();

    const snapshot = await trx
      .insertInto("yjs_snapshots")
      .values({ document: initialUpdate })
      .returning(["yjs_snapshot_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("block_yjs_snapshots")
      .values({ yjs_snapshot_id: snapshot.yjs_snapshot_id, block_id: blockId })
      .execute();

    const ownerMembership = await trx
      .selectFrom("project_members")
      .where("project_id", "=", projectId)
      .where("user_id", "=", ownerUserId)
      .where("deleted_at", "is", null)
      .select(["cursor_color"])
      .executeTakeFirst();

    await trx
      .insertInto("block_members")
      .values({
        block_id: blockId,
        user_id: ownerUserId,
        role: "Owner",
        cursor_color: ownerMembership?.cursor_color ?? "#a1a1aa",
      })
      .execute();
  });
}

export async function getBlockProjectId(blockId: string): Promise<string | null> {
  const row = await db
    .selectFrom("blocks")
    .where("block_id", "=", blockId)
    .select(["project_id"])
    .executeTakeFirst();
  return row?.project_id ?? null;
}

export async function updateBlock({
  blockId,
  name,
  width,
  height,
}: {
  blockId: string;
  name?: string;
  width?: number;
  height?: number;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (width !== undefined) updates.resolution_width = width;
  if (height !== undefined) updates.resolution_height = height;

  if (Object.keys(updates).length === 0) return;

  await db
    .updateTable("blocks")
    .set(updates)
    .where("block_id", "=", blockId)
    .where("deleted_at", "is", null)
    .execute();
}