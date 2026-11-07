import useStore from "../store/use-store";
import { hydrateDocFromState, type DocSnapshot } from "../collab/ydoc-schema";
import { buildSelectionSnapshot, cloneIntoNewTracks } from "./item-actions";
import { timeMsToUnits } from "@designcombo/timeline";
import type { TemplateOpenMode } from "../modals/template-open-modal";

async function openProjectTimeline(projectId: string) {
  const initial = useStore.getState();
  if (initial.projectId !== projectId) throw new Error("The current project changed. Open the template again.");
  if (!initial.activeSceneBlockId) return;
  initial.playerRef?.current?.pause();
  initial.closeScene();
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { unsubscribe(); reject(new Error("The project timeline is still loading. Try again.")); }, 15000);
    const unsubscribe = useStore.subscribe(state => {
      if (state.projectId !== projectId) { clearTimeout(timer); unsubscribe(); reject(new Error("The current project changed.")); }
      else if (!state.activeSceneBlockId && state.collabSchema && state.collabSchema !== initial.collabSchema) {
        clearTimeout(timer); unsubscribe(); resolve();
      }
    });
  });
}

export async function applyTemplate(assetId: string, projectId: string, mode: TemplateOpenMode) {
  await openProjectTimeline(projectId);
  const before = useStore.getState();
  if (!before.collabSchema || !before.stateManager || before.activeSceneBlockId) throw new Error("Wait for the project to finish loading and try again.");
  const response = await fetch(`/api/market-templates/${assetId}/apply`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to apply this template.");
  const state = useStore.getState();
  if (state.projectId !== projectId || state.activeSceneBlockId || state.collabSchema !== before.collabSchema || !state.stateManager || !state.collabSchema || !state.collabOrigin) {
    throw new Error("The timeline changed while loading the template. Return to the project timeline and try again.");
  }
  const snapshot = data.snapshot as DocSnapshot;
  const offset = mode === "append" ? Math.max(state.duration, 0, ...Object.values(state.trackItemsMap).map(item => item.display.to)) : 0;
  const base = mode === "append" ? state : { tracks: [], trackItemIds: [], trackItemsMap: {}, transitionsMap: {}, transitionIds: [], duration: 0 };
  const selection = buildSelectionSnapshot(snapshot.trackItemIds, snapshot);
  const earliest = selection.items.length ? Math.min(...selection.items.map(item => item.display.from)) : 0;
  // Paste remaps track, item, and transition IDs. Offset from time zero so the
  // template's leading silence and spacing survive repeated insertions.
  const cloned = cloneIntoNewTracks(selection, offset + earliest, base, "top");
  const content = cloned ?? base;
  const { tracks, trackItemsMap, trackItemIds, transitionsMap, transitionIds } = content;
  const duration = Math.max(content.duration, offset + (snapshot.duration || 0));
  const markers = [...(mode === "append" ? state.markers : []), ...snapshot.markers.map(marker => ({
    ...marker, id: crypto.randomUUID(), userId: state.userId, timeMs: marker.timeMs + offset,
  }))];
  const size = mode === "replace" ? snapshot.size || state.size : state.size;
  const fps = mode === "replace" ? snapshot.fps || state.fps : state.fps;
  const background = mode === "replace" ? snapshot.background || state.background : state.background;
  const next = { tracks, trackItemsMap, trackItemIds, transitionsMap, transitionIds, duration, size, fps, background };
  state.playerRef?.current?.pause();
  state.playerRef?.current?.seekTo(Math.round(offset / 1000 * state.fps));
  // Keep the document, local player state, and undo history in one local edit.
  state.collabSchema.doc.transact(() => {
    hydrateDocFromState(state.collabSchema!, next, markers, state.projectName, state.collabOrigin);
    state.stateManager!.updateState({ ...next, activeIds: [] }, { updateHistory: true, kind: "update" });
    useStore.setState({ ...next, markers, activeIds: [] });
  }, state.collabOrigin);
  requestAnimationFrame(() => {
    if (useStore.getState().collabSchema !== state.collabSchema) return;
    const frame = Math.round(offset / 1000 * fps);
    state.playerRef?.current?.seekTo(frame);
    const current = useStore.getState();
    current.timeline?.scrollTo({ scrollLeft: Math.max(0, timeMsToUnits(offset, current.scale.zoom)) });
  });
  window.dispatchEvent(new Event("market-license-updated"));
}
