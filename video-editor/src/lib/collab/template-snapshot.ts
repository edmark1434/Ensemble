import * as Y from "yjs";
import { liveRooms } from "./live-rooms";
import { compactProjectAndScenes } from "./persistence-store";
import type { CollabTarget } from "@/features/editor/collab/collab-target";

export async function createTemplateSnapshot(projectId: string, currentBlockId: string | null, currentUpdate: Uint8Array) {
  const target: CollabTarget = currentBlockId ? { kind: "block", id: currentBlockId } : { kind: "project", id: projectId };
  const save = await compactProjectAndScenes(projectId, { supplied: { target, update: currentUpdate } });
  const live = await liveRooms.get(`${target.kind}:${target.id}`);
  if (live) Y.applyUpdate(live.doc, currentUpdate, "template-snapshot");
  return String(save.snapshotId);
}
