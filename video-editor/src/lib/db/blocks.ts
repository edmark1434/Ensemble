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
}: {
  blockId: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
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
      background: { type: "color", value: "#000000" },
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