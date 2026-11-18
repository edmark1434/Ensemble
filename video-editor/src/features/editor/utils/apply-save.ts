import useStore from "../store/use-store";
import { hydrateDocFromState, type DocSnapshot } from "../collab/ydoc-schema";
import { buildSelectionSnapshot, cloneIntoNewTracks } from "./item-actions";
import { openProjectTimeline } from "./apply-template";

// Replaces the whole project with a save, the same way a template replaces it:
// the server prepares the saved project with fresh scene blocks, and the swap
// happens as one local edit on the project document, so it syncs to everyone
// and can be undone.
export async function applySave(saveId: string, projectId: string) {
  await openProjectTimeline(projectId);
  const before = useStore.getState();
  if (!before.collabSchema || !before.stateManager || before.activeSceneBlockId) throw new Error("Wait for the project to finish loading and try again.");
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/saves/${encodeURIComponent(saveId)}/apply`, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Unable to apply this save.");
  const state = useStore.getState();
  if (state.projectId !== projectId || state.activeSceneBlockId || state.collabSchema !== before.collabSchema || !state.stateManager || !state.collabSchema || !state.collabOrigin) {
    throw new Error("The timeline changed while loading the save. Return to the project timeline and try again.");
  }
  const snapshot = data.snapshot as DocSnapshot;
  const empty = { tracks: [], trackItemIds: [], trackItemsMap: {}, transitionsMap: {}, transitionIds: [], duration: 0 };
  const selection = buildSelectionSnapshot(snapshot.trackItemIds, snapshot);
  const earliest = selection.items.length ? Math.min(...selection.items.map(item => item.display.from)) : 0;
  // Anchoring at the earliest item keeps every clip at its saved time.
  const cloned = cloneIntoNewTracks(selection, earliest, empty, "top");
  if (cloned) {
    // Cloning unlocks items; a save comes back exactly as it was. newIds follow
    // the same time-sorted order cloneIntoNewTracks walks the selection in.
    const sources = [...selection.items].sort((a, b) => a.display.from - b.display.from);
    cloned.newIds.forEach((id, index) => {
      const item = cloned.trackItemsMap[id];
      if (item?.details && sources[index]?.details?.locked) item.details = { ...item.details, locked: true };
    });
  }
  const content = cloned ?? empty;
  const { tracks, trackItemsMap, trackItemIds, transitionsMap, transitionIds } = content;
  const duration = Math.max(content.duration, snapshot.duration || 0);
  const markers = snapshot.markers.map(marker => ({ ...marker }));
  const size = snapshot.size || state.size;
  const fps = snapshot.fps || state.fps;
  const background = snapshot.background || state.background;
  const next = { tracks, trackItemsMap, trackItemIds, transitionsMap, transitionIds, duration, size, fps, background };
  state.playerRef?.current?.pause();
  state.playerRef?.current?.seekTo(0);
  // Keep the document, local player state, and undo history in one local edit.
  state.collabSchema.doc.transact(() => {
    hydrateDocFromState(state.collabSchema!, next, markers, state.projectName, state.collabOrigin);
    state.stateManager!.updateState({ ...next, activeIds: [] }, { updateHistory: true, kind: "update" });
    useStore.setState({ ...next, markers, activeIds: [] });
  }, state.collabOrigin);
  requestAnimationFrame(() => {
    if (useStore.getState().collabSchema !== state.collabSchema) return;
    state.playerRef?.current?.seekTo(0);
    useStore.getState().timeline?.scrollTo({ scrollLeft: 0 });
  });
}
