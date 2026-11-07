import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import type { ITrackItem } from "@designcombo/types";
import { createCollabSchema, readStateFromDoc, hydrateDocFromState, type DocSnapshot } from "@/features/editor/collab/ydoc-schema";
import type { ISceneDetails } from "@/features/editor/types/ensemble-scene";

export function decodeTemplate(document: Uint8Array): DocSnapshot {
  const doc = new Y.Doc();
  const schema = createCollabSchema(doc);
  try { Y.applyUpdate(doc, document); return structuredClone(readStateFromDoc(schema)); }
  finally { schema.awareness.destroy(); doc.destroy(); }
}

export function encodeTemplate(state: DocSnapshot, name: string): string {
  const doc = new Y.Doc();
  const schema = createCollabSchema(doc);
  try {
    hydrateDocFromState(schema, {
      ...state, size: state.size || { width: 1920, height: 1080 }, fps: state.fps || 30,
      duration: state.duration || 0, background: state.background || { type: "color", value: "" },
    }, state.markers, name, "template-copy");
    return Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
  } finally { schema.awareness.destroy(); doc.destroy(); }
}

// Re-encode only the current content; never copy Yjs undo history or source
// memberships. Every scene gets a new ID, including repeated scene references.
export async function copyTemplate(snapshot: DocSnapshot, name: string,
  readScene: (id: string) => Promise<DocSnapshot | null>,
  prepareMedia: (item: ITrackItem) => Promise<void>) {
  const root = structuredClone(snapshot);
  const scenes = new Map<string, { id: string; state: DocSnapshot }>();
  async function visit(state: DocSnapshot, ancestors = new Set<string>()) {
    if (ancestors.size > 20) throw new Error("Template scenes are nested too deeply");
    // Drop orphaned items rather than carrying unused content into the buyer's document.
    state.trackItemsMap = Object.fromEntries(state.trackItemIds.filter(id => state.trackItemsMap[id]).map(id => [id, state.trackItemsMap[id]]));
    for (const item of Object.values(state.trackItemsMap)) {
      if (String(item.type) !== "scene") { await prepareMedia(item); continue; }
      const details = item.details as unknown as ISceneDetails;
      const oldId = details.blockId;
      if (!oldId || ancestors.has(oldId)) throw new Error("Invalid template scene reference");
      let scene = scenes.get(oldId);
      if (!scene) {
        const saved = await readScene(oldId);
        if (!saved) throw new Error("Template scene snapshot is missing");
        scene = { id: randomUUID(), state: structuredClone(saved) };
        scenes.set(oldId, scene);
        await visit(scene.state, new Set([...ancestors, oldId]));
      }
      details.blockId = scene.id;
      delete details.thumbnail;
      details.content = structuredClone({ trackItemIds: scene.state.trackItemIds, trackItemsMap: scene.state.trackItemsMap,
        transitionsMap: scene.state.transitionsMap, size: scene.state.size, background: scene.state.background });
    }
  }
  await visit(root);
  return {
    name, width: root.size?.width || 1920, height: root.size?.height || 1080,
    durationSeconds: Math.max(0, Math.floor((root.duration || 0) / 1000)),
    document: encodeTemplate(root, name),
    scenes: [...scenes.values()].map(({ id, state }) => ({ id, name: state.projectName || "Scene",
      width: state.size?.width || 1920, height: state.size?.height || 1080, fps: state.fps || 30,
      document: encodeTemplate(state, state.projectName || "Scene") })),
  };
}
