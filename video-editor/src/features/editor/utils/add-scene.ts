import { tourAction } from "@/features/editor/store/use-tour-demo";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { DEFAULT_SCENE_DURATION_MS, isSceneItem, makeSceneTrack, makeSceneTrackItem, SCENE_TYPE, type ISceneTrackItem } from "../types/ensemble-scene";

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
  const { trackItemsMap, trackItemIds, tracks, duration, projectId, size } = useStore.getState();
  const sceneItem = createSceneItem(time, size);
  const { id } = sceneItem;

  let targetTrack = tracks.find(
    (t) =>
      isSceneItem(t.type) &&
      !t.static &&
      !t.items.some((itemId) => {
        const other = trackItemsMap[itemId];
        return (
          !!other &&
          other.display.from < sceneItem.display.to &&
          other.display.to > sceneItem.display.from
        );
      }),
  );

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

  const targetTrackId = targetTrack.id;
  nextTracks = nextTracks.map((t) =>
    t.id === targetTrackId ? { ...t, items: [...t.items, id] } : t,
  );

  stateManager.updateState(
    {
      trackItemsMap: { ...trackItemsMap, [id]: makeSceneTrackItem(sceneItem) },
      trackItemIds: [...trackItemIds, id],
      tracks: nextTracks,
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
