// features/editor/store/use-scene-content-store.ts
import { useEffect } from "react";
import { create } from "zustand";
import * as Y from "yjs";
import { createCollabSchema, readStateFromDoc, DocSnapshot } from "../collab/ydoc-schema";
import { loadSnapshot } from "../collab/persistence";

interface SceneContentEntry {
  status: "loading" | "ready" | "error";
  snapshot?: DocSnapshot;
}

interface SceneContentState {
  byBlockId: Record<string, SceneContentEntry>;
  load: (blockId: string) => void;
  invalidate: (blockId: string) => void;
}

const inFlight = new Set<string>();

export const useSceneContentStore = create<SceneContentState>((set, get) => ({
  byBlockId: {},

  load: (blockId) => {
    if (get().byBlockId[blockId]?.status === "ready" || inFlight.has(blockId)) return;
    inFlight.add(blockId);
    set((s) => ({ byBlockId: { ...s.byBlockId, [blockId]: { status: "loading" } } }));

    (async () => {
      try {
        const update = await loadSnapshot({ kind: "block", id: blockId });
        // Read-only: decode just long enough to pull a JSON snapshot out,
        // then let the doc go — no live sync needed for a passive preview.
        const doc = new Y.Doc({ gc: false });
        const schema = createCollabSchema(doc);
        Y.applyUpdate(doc, update);
        const snapshot = readStateFromDoc(schema);
        doc.destroy();
        set((s) => ({ byBlockId: { ...s.byBlockId, [blockId]: { status: "ready", snapshot } } }));
      } catch (err) {
        console.error("useSceneContentStore: failed to load block", blockId, err);
        set((s) => ({ byBlockId: { ...s.byBlockId, [blockId]: { status: "error" } } }));
      } finally {
        inFlight.delete(blockId);
      }
    })();
  },

  invalidate: (blockId) => set((s) => {
    const next = { ...s.byBlockId };
    delete next[blockId];
    return { byBlockId: next };
  }),
}));

export function useSceneContent(blockId: string | undefined): DocSnapshot | null {
  const entry = useSceneContentStore((s) => (blockId ? s.byBlockId[blockId] : undefined));
  const load = useSceneContentStore((s) => s.load);
  useEffect(() => { if (blockId) load(blockId); }, [blockId, load]);
  return entry?.status === "ready" ? entry.snapshot! : null;
}