import { tourAction } from "@/features/editor/store/use-tour-demo";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { DEFAULT_SCENE_DURATION_MS, makeSceneTrack, makeSceneTrackItem, SCENE_TYPE, type ISceneTrackItem } from "../types/ensemble-scene";
import { findReusableTrackForItem, reconcileAdjacentTransitions } from "./item-actions";

export function createSceneItem(time: number, size: { width: number; height: number }, blockId: string = crypto.randomUUID()): ISceneTrackItem {
  const id = crypto.randomUUID();
  return {
    id,
    type: SCENE_TYPE,
    name: "Scene",
    display: { from: time, to: time + DEFAULT_SCENE_DURATION_MS },
    metadata: {},
    details: {
      blockId,
      name: "Scene",
      width: size.width,
      height: size.height,
      top: 0,
      left: 0,
    },
  };
}

export function addScene(stateManager: StateManager, time: number) {
  if (tourAction("scene")) return;
  const { trackItemsMap, trackItemIds, tracks, transitionsMap, transitionIds, duration, projectId, size, scale } = useStore.getState();
  const sceneItem = createSceneItem(time, size);
  const { id } = sceneItem;

  let targetTrack = findReusableTrackForItem(makeSceneTrackItem(sceneItem), tracks, trackItemsMap);

  let nextTracks = tracks;
  if (!targetTrack) {
    targetTrack = makeSceneTrack({
      id: crypto.randomUUID(),
      type: SCENE_TYPE,
      items: [],
      metadata: {},
      accepts: [SCENE_TYPE],
      index: 0,
      magnetic: false,
      static: false,
    });
    nextTracks = [targetTrack, ...tracks.map((t) => ({ ...t, index: (t.index ?? 0) + 1 }))];
  }

  const nextTrackItemsMap = { ...trackItemsMap, [id]: makeSceneTrackItem(sceneItem) };
  const targetTrackId = targetTrack.id;
  nextTracks = nextTracks.map((t) =>
    t.id === targetTrackId
      ? {
          ...t,
          items: [...t.items, id].sort(
            (a, b) => (nextTrackItemsMap[a]?.display.from ?? 0) - (nextTrackItemsMap[b]?.display.from ?? 0)
          ),
        }
      : t,
  );

  const reconciled = reconcileAdjacentTransitions(
    nextTracks,
    nextTrackItemsMap,
    transitionsMap,
    transitionIds,
    scale.zoom,
  );

  stateManager.updateState(
    {
      trackItemsMap: nextTrackItemsMap,
      trackItemIds: [...trackItemIds, id],
      tracks: nextTracks,
      ...(reconciled.changed
        ? { transitionsMap: reconciled.transitionsMap, transitionIds: reconciled.transitionIds }
        : {}),
      duration: Math.max(duration, sceneItem.display.to),
    },
    { updateHistory: true, kind: "update" },
  );

  void fetch("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blockId: sceneItem.details.blockId, projectId, name: sceneItem.details.name, ...size }),
  }).then(response => {
    if (!response.ok) throw new Error("Scene creation failed (" + response.status + ")");
  }).catch(error => {
    console.error("Unable to create scene access", error);
  });
}
