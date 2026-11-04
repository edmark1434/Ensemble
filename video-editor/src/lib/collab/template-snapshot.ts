import * as Y from "yjs";
import { db } from "@/lib/db";
import { liveRooms } from "./live-rooms";
import { compactProject } from "./persistence-store";
import { withProjectSnapshotLock } from "./snapshot-lock";
import { loadLatestBlockState, compactBlock, withBlockSnapshotLock } from "./block-persistence-store";

export async function createTemplateSnapshot(projectId: string, currentBlockId: string | null, currentUpdate: Uint8Array) {
  const blocks = await db.selectFrom("blocks").select("block_id")
    .where("project_id", "=", projectId).where("deleted_at", "is", null).execute();
  if (currentBlockId && !blocks.some((b) => b.block_id === currentBlockId)) {
    throw new Error("The current scene does not belong to this project");
  }
  for (const block of blocks) {
    await withBlockSnapshotLock(block.block_id, async () => {
      const stored = await loadLatestBlockState(block.block_id);
      const doc = new Y.Doc({ gc: false });
      try {
        if (stored.snapshot) Y.applyUpdate(doc, stored.snapshot);
        for (const update of stored.updates) Y.applyUpdate(doc, update);
        const live = await liveRooms.get(`block:${block.block_id}`);
        if (live) Y.applyUpdate(doc, Y.encodeStateAsUpdate(live.doc));
        if (currentBlockId === block.block_id) Y.applyUpdate(doc, currentUpdate);
        await compactBlock(block.block_id, Buffer.from(Y.encodeStateAsUpdate(doc)));
        if (live && currentBlockId === block.block_id) Y.applyUpdate(live.doc, currentUpdate, "template-snapshot");
      } finally { doc.destroy(); }
    });
  }
  return withProjectSnapshotLock(projectId, async () => {
    const live = await liveRooms.get(`project:${projectId}`);
    const updates: Uint8Array[] = [];
    if (live) updates.push(Y.encodeStateAsUpdate(live.doc));
    if (!currentBlockId) updates.push(currentUpdate);
    const snapshotId = await compactProject(projectId, updates.length ? Y.mergeUpdates(updates) : undefined);
    if (live && !currentBlockId) Y.applyUpdate(live.doc, currentUpdate, "template-snapshot");
    return snapshotId;
  });
}
