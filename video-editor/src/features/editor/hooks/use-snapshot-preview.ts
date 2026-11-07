import { createContext, useContext, useEffect, useState } from "react";
import type StateManager from "@designcombo/state";
import type { DocSnapshot } from "../collab/ydoc-schema";
import useStore from "../store/use-store";
import { useMissingMedia } from "../store/use-missing-media";
import { syncCanvasTransitions } from "../timeline/items/transitions/sync-canvas-transitions";
import { ensureFont } from "../utils/fonts";

export interface SnapshotPreviewData {
  snapshot: DocSnapshot;
  scenes: Record<string, DocSnapshot>;
  missingSources: string[];
  name: string;
}
export const SnapshotPreviewContext = createContext<SnapshotPreviewData | null>(null);
export const useSnapshotPreview = () => useContext(SnapshotPreviewContext);

export function useSnapshotDocument(stateManager: StateManager) {
  const preview = useSnapshotPreview();
  const blockId = useStore(state => state.activeSceneBlockId);
  const timeline = useStore(state => state.timeline);
  const snapshot = preview ? (blockId ? preview.scenes[blockId] : preview.snapshot) : null;
  const [loaded, setLoaded] = useState<DocSnapshot | null>(null);

  useEffect(() => {
    if (!preview) return;
    for (const document of [preview.snapshot, ...Object.values(preview.scenes)]) {
      for (const item of Object.values(document.trackItemsMap)) {
        if (item.type !== "text" && item.type !== "caption") continue;
        const { fontFamily, fontUrl } = item.details;
        if (fontFamily && fontUrl) void ensureFont(fontFamily, fontUrl);
      }
    }
  }, [preview]);

  useEffect(() => {
    if (!preview || !snapshot) return;
    const size = snapshot.size ?? preview.snapshot.size ?? { width: 1920, height: 1080 };
    const fps = snapshot.fps ?? preview.snapshot.fps ?? 30;
    const duration = snapshot.trackItemIds.reduce((end, id) => Math.max(end, snapshot.trackItemsMap[id]?.display.to || 0), snapshot.duration || 0);
    const state = { trackItemsMap: snapshot.trackItemsMap, trackItemIds: snapshot.trackItemIds,
      transitionsMap: snapshot.transitionsMap, transitionIds: snapshot.transitionIds,
      tracks: snapshot.tracks, size, fps, duration };
    // Publish availability before timeline subscriptions start loading media.
    useMissingMedia.setState({ projectId: "", missing: new Set(preview.missingSources) });
    useStore.setState({ ...state, projectId: "", userId: "", userName: "", collabSchema: null,
      collabOrigin: null, activeIds: [], markers: snapshot.markers, projectName: preview.name,
      background: snapshot.background ?? useStore.getInitialState().background,
    });
    stateManager.updateState(state, { updateHistory: false });
    if (timeline && timeline === useStore.getState().timeline) {
      const canvas = timeline as any;
      const present = new Set(canvas.getTrackItems().map((item: { id: string }) => item.id));
      const missing = state.trackItemIds.filter(id => !present.has(id));
      if (missing.length) {
        canvas.tracks = state.tracks;
        canvas.trackItemsMap = state.trackItemsMap;
        missing.forEach(id => canvas.addTrackItem({ ...state.trackItemsMap[id] }));
        canvas.trackItemIds = state.trackItemIds;
        canvas.renderTracks();
        canvas.alignItemsToTrack();
        canvas.updateTrackItemCoords();
        canvas.calcBounding();
        canvas.refreshTrackLayout();
      }
      canvas.getTrackItems().forEach((item: any) => {
        item.lockMovementX = true;
        item.lockMovementY = true;
        item.lockScalingX = true;
        item.lockScalingY = true;
        item.hasControls = false;
      });
      syncCanvasTransitions(timeline, state.transitionsMap, "snapshot-preview");
    }
    setLoaded(snapshot);
  }, [preview, snapshot, timeline, stateManager]);

  return !!snapshot && loaded === snapshot;
}
