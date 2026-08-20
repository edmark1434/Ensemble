import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import type { ITrack, ITrackItem, ITransition } from "@designcombo/types";
import useStore from "../store/use-store";
import { CollabSchema, itemToY, transitionToY, trackToY } from "./ydoc-schema";
import { SyncGuard } from "./sync-guard";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function syncOrderArray(yArr: Y.Array<string>, next: string[]) {
  const current = yArr.toArray();
  if (arraysEqual(current, next)) return;

  // Remove entries no longer present first, back-to-front so earlier
  // indices don't shift under us.
  for (let i = current.length - 1; i >= 0; i--) {
    if (!next.includes(current[i])) yArr.delete(i, 1);
  }

  // Then walk forward and fix up positions one at a time. Each mismatch
  // becomes a single delete+insert of just that entry, not a wipe of the
  // whole array — concurrent writers' ops interleave safely instead of
  // colliding.
  let working = yArr.toArray();
  for (let i = 0; i < next.length; i++) {
    if (working[i] !== next[i]) {
      const existingIndex = working.indexOf(next[i], i);
      if (existingIndex !== -1) yArr.delete(existingIndex, 1);
      yArr.insert(i, [next[i]]);
      working = yArr.toArray();
    }
  }
}

function reconcileContentMap<T extends Record<string, any>>(
  yMap: Y.Map<Y.Map<any>>,
  items: Record<string, T>,
  toY: (item: T) => Y.Map<any>,
) {
  const nextIds = new Set(Object.keys(items));
  yMap.forEach((_, id) => {
    if (!nextIds.has(id)) yMap.delete(id);
  });
  for (const [id, item] of Object.entries(items)) {
    const existing = yMap.get(id);
    if (existing) {
      const { isMain: _a, ...existingRest } = existing.toJSON();
      const { isMain: _b, ...itemRest } = item as any;
      if (JSON.stringify(existingRest) === JSON.stringify(itemRest)) continue;
    }
    yMap.set(id, toY(item));
  }
}

function reconcileTracks(yTracks: Y.Array<Y.Map<any>>, tracks: ITrack[]) {
  const currentIds = yTracks.toArray().map((y) => y.get("id"));
  const nextIds = tracks.map((t) => t.id);

  if (!arraysEqual(currentIds, nextIds)) {
    // membership/order changed — existing Y.Map instances can't be
    // safely re-spliced into a new array position once already
    // integrated, so rebuild wholesale with fresh ones
    yTracks.delete(0, yTracks.length);
    yTracks.push(tracks.map(trackToY));
    return;
  }

  const existingById = new Map<string, Y.Map<any>>();
  yTracks.forEach((y) => existingById.set(y.get("id"), y));

  for (const track of tracks) {
    const existing = existingById.get(track.id);
    if (!existing) continue;

    if (existing.get("type") !== track.type) existing.set("type", track.type);
    if (JSON.stringify(existing.get("metadata")) !== JSON.stringify(track.metadata ?? {})) {
      existing.set("metadata", track.metadata ?? {});
    }
    if (JSON.stringify(existing.get("accepts")) !== JSON.stringify(track.accepts ?? [])) {
      existing.set("accepts", track.accepts ?? []);
    }
    if (existing.get("index") !== track.index) existing.set("index", track.index);
    if (existing.get("magnetic") !== (track.magnetic ?? false)) existing.set("magnetic", track.magnetic ?? false);
    if (existing.get("static") !== (track.static ?? false)) existing.set("static", track.static ?? false);

    syncOrderArray(existing.get("items") as Y.Array<string>, track.items ?? []);
  }
}

// Reconciles full stateManager state into the doc on every change signal —
// same "reconcile everything, skip no-op writes" simplification as
// mirror-in. Fires on selection-only changes too (stateManager.subscribe
// is genuinely "any state change"), so the no-op guards above matter for
// perf, not just cleanliness. Revisit with tighter per-field diffing if
// this shows up in profiling once real collab volume exists.
export function setupMirrorOutFromStateManager(
  schema: CollabSchema,
  stateManager: StateManager,
  localOrigin: string,
  syncGuard: SyncGuard,
): () => void {
  // stateManager.subscribe is backed by an RxJS BehaviorSubject, which
  // replays the CURRENT value synchronously to a new subscriber before any
  // real change has happened. At the point use-collab-doc.ts wires this up,
  // stateManager still holds its pre-hydration default (empty) state — the
  // real snapshot hasn't been written into it yet, that happens later in
  // the same effect. Without this guard, that synchronous replay fires
  // sync() unguarded (isApplyingRemote is still false here too) and
  // reconciles the doc down to stateManager's stale empty state, wiping
  // whatever was just applied from the backend snapshot before isBlank is
  // even computed. Skip exactly one emission — the replay — then behave
  // normally for every real change after it.
  let skippedInitialReplay = false;

  const sync = () => {
    if (!skippedInitialReplay) {
      skippedInitialReplay = true;
      return;
    }
    if (syncGuard.isApplyingRemote) return;
    const state = stateManager.getState();
    schema.doc.transact(() => {
      reconcileContentMap<ITrackItem>(schema.trackItems, state.trackItemsMap, itemToY);
      syncOrderArray(schema.trackItemIds, state.trackItemIds);
      reconcileContentMap<ITransition>(schema.transitions, state.transitionsMap, transitionToY);
      syncOrderArray(schema.transitionIds, state.transitionIds);
      reconcileTracks(schema.tracks, state.tracks);
      if (schema.meta.get("duration") !== state.duration) schema.meta.set("duration", state.duration);
      if (JSON.stringify(schema.meta.get("size")) !== JSON.stringify(state.size)) schema.meta.set("size", state.size);
      if (schema.meta.get("fps") !== state.fps) schema.meta.set("fps", state.fps);
    }, localOrigin);
  };

  const subscription = stateManager.subscribe(sync);
  return () => subscription.unsubscribe();
}

// Catches size/background/projectName/fps writes that go straight into
// zustand and never touch stateManager — CompositionControls sets
// size/background via setState directly, Navbar's title editor does the
// same for projectName. The subscription above never fires for either.
export function setupMirrorOutFromStore(
  schema: CollabSchema,
  localOrigin: string,
  syncGuard: SyncGuard,
): () => void {
  return useStore.subscribe((state, prevState) => {
    if (syncGuard.isApplyingRemote) return;

    const fpsChanged = state.fps !== prevState.fps;
    const sizeChanged = state.size !== prevState.size;
    const backgroundChanged = state.background !== prevState.background;
    const nameChanged = state.projectName !== prevState.projectName;

    if (!fpsChanged && !sizeChanged && !backgroundChanged && !nameChanged) return;

    schema.doc.transact(() => {
      if (fpsChanged) schema.meta.set("fps", state.fps);
      if (sizeChanged) schema.meta.set("size", state.size);
      if (backgroundChanged) schema.meta.set("background", state.background);
      if (nameChanged) schema.meta.set("projectName", state.projectName);
    }, localOrigin);
  });
}