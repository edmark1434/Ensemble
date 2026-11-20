import { generateId, timeMsToUnits } from "@designcombo/timeline";
import type { ITrack, ITrackItem, ITransition } from "@designcombo/types";
import type StateManager from "@designcombo/state";
import { isSceneItem } from "../types/ensemble-scene";

// Deep-clones plain state data (items/transitions/tracks) without
// structuredClone — track items can carry a function value on
// animations.*.composition[].ease, and structuredClone throws on
// functions. Functions are passed through by reference instead of
// cloned; everything else is copied.
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => deepClone(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = typeof v === "function" ? v : deepClone(v);
  }
  return out as T;
}

// ---------------------------------------------------------------------
// A selection (activeIds) can mix track item ids and transition ids — e.g.
// select-all adds every transition id alongside every item id. This resolves
// it down to the items that are actually there, plus every transition whose
// both endpoints are also in that set. A transition whose endpoint(s) aren't
// part of the selection is dropped rather than carried over half-connected.
// ---------------------------------------------------------------------

export function resolveSelection(
  ids: string[],
  trackItemsMap: Record<string, ITrackItem>,
  transitionsMap: Record<string, ITransition>
): { items: ITrackItem[]; transitions: ITransition[] } {
  const itemIdSet = new Set(ids.filter((id) => id in trackItemsMap));
  const items = [...itemIdSet].map((id) => trackItemsMap[id]);
  const transitions = Object.values(transitionsMap).filter(
    (t) => itemIdSet.has(t.fromId) && itemIdSet.has(t.toId)
  );
  return { items, transitions };
}

// ---------------------------------------------------------------------
// A selection snapshot captures not just the items/transitions but which
// track each item came from and what those tracks looked like. Paste and
// duplicate use this to rebuild brand-new tracks (rather than reusing the
// original ones), in the same relative order as the source tracks — even
// if a source track has since been edited, emptied, or removed entirely.
// ---------------------------------------------------------------------

export interface SelectionSnapshot {
  items: ITrackItem[];
  transitions: ITransition[];
  trackIdByItemId: Record<string, string>; // item id -> id of the track it was copied from
  trackOrder: string[];                    // distinct source track ids, top-to-bottom
  trackTemplates: Record<string, ITrack>;  // source track id -> its shape (items ignored)
}

export function buildSelectionSnapshot(
  ids: string[],
  state: {
    trackItemsMap: Record<string, ITrackItem>;
    transitionsMap: Record<string, ITransition>;
    tracks: ITrack[];
  }
): SelectionSnapshot {
  const { items, transitions } = resolveSelection(ids, state.trackItemsMap, state.transitionsMap);
  const itemIdSet = new Set(items.map((i) => i.id));

  const trackIdByItemId: Record<string, string> = {};
  const trackOrder: string[] = [];
  const trackTemplates: Record<string, ITrack> = {};

  state.tracks.forEach((track) => {
    if (!track.items.some((id) => itemIdSet.has(id))) return;
    trackOrder.push(track.id);
    trackTemplates[track.id] = deepClone(track);
    track.items.forEach((id) => {
      if (itemIdSet.has(id)) trackIdByItemId[id] = track.id;
    });
  });

  return {
    items: items.map((i) => deepClone(i)),
    transitions: transitions.map((t) => deepClone(t)),
    trackIdByItemId,
    trackOrder,
    trackTemplates,
  };
}

// ---------------------------------------------------------------------
// Clipboard — a SelectionSnapshot, set by copy/cut and read by paste. Lives
// outside the collab doc / stateManager on purpose; what's stored is a
// plain, deep-cloned snapshot so later edits to the live items can't reach
// back and mutate it.
// ---------------------------------------------------------------------

let clipboard: SelectionSnapshot | null = null;

export function setClipboard(snapshot: SelectionSnapshot) {
  clipboard = snapshot;
}

export function getClipboard(): SelectionSnapshot | null {
  return clipboard;
}

// ---------------------------------------------------------------------
// Track compatibility & collision helpers used when reusing existing
// lanes on paste / duplicate so we minimize newly added tracks while
// preserving top-to-bottom layering and guaranteeing zero overlaps.
// Matches the timeline canvas acceptsMap in timeline/timeline.tsx.
// ---------------------------------------------------------------------

const TRACK_ACCEPTS: Record<string, readonly string[]> = {
  text: ["text", "caption"],
  image: ["image", "video", "scene"],
  video: ["video", "image", "scene"],
  audio: ["audio"],
  caption: ["caption", "text"],
  template: ["template"],
  customTrack: ["video", "image"],
  customTrack2: ["video", "image"],
  main: ["video", "image", "scene"],
  linealAudioBars: ["audio", "linealAudioBars"],
  radialAudioBars: ["audio", "radialAudioBars"],
  waveAudioBars: ["audio", "waveAudioBars"],
  hillAudioBars: ["audio", "hillAudioBars"],
  scene: ["scene", "image", "video"],
};

const OVERLAP_EPSILON_MS = 0.5;
const DEFAULT_TRANSITION_DURATION_MS = 1500;

function areItemsAdjacent(a: ITrackItem, b: ITrackItem, zoom?: number): boolean {
  if (Math.abs(b.display.from - a.display.to) <= 1) return true;
  if (zoom && zoom > 0) {
    return Math.abs(timeMsToUnits(a.display.to, zoom) - timeMsToUnits(b.display.from, zoom)) <= 1;
  }
  return false;
}

// Maintain kind: "none" drop-target entries in transitionsMap for every pair of
// adjacent items on the same track. @designcombo/timeline's drag/drop handler
// only exposes drop targets for Transition objects currently in transitionsMap,
// and syncCanvasTransitions mirrors stateManager's map onto the canvas — so
// state-level adds, pastes, duplicates, and timing edits must keep these
// placeholder entries in sync just like drag-end's canvas.updateTransitions().
export function reconcileAdjacentTransitions(
  tracks: ITrack[],
  trackItemsMap: Record<string, ITrackItem>,
  transitionsMap: Record<string, ITransition>,
  transitionIds: string[],
  zoom?: number,
): {
  transitionsMap: Record<string, ITransition>;
  transitionIds: string[];
  changed: boolean;
} {
  const adjacentPairs = new Map<string, { fromId: string; toId: string; trackId: string }>();

  for (const track of tracks) {
    const items = track.items
      .map((id) => trackItemsMap[id])
      .filter((item): item is ITrackItem => !!item)
      .sort((a, b) => a.display.from - b.display.from);

    for (let i = 0; i < items.length - 1; i++) {
      const prev = items[i];
      const next = items[i + 1];
      if (!areItemsAdjacent(prev, next, zoom)) continue;
      adjacentPairs.set(`${prev.id}-${next.id}`, {
        fromId: prev.id,
        toId: next.id,
        trackId: track.id,
      });
    }
  }

  let changed = false;
  const nextTransitionsMap: Record<string, ITransition> = {};
  const nextTransitionIds: string[] = [];
  const seen = new Set<string>();

  const existingOrder = transitionIds.length ? transitionIds : Object.keys(transitionsMap);
  for (const id of existingOrder) {
    const existing = transitionsMap[id];
    if (!existing || seen.has(id)) {
      if (existing === undefined) changed = true;
      continue;
    }
    seen.add(id);
    const pair = adjacentPairs.get(id);
    if (existing.kind === "none") {
      if (!pair) {
        changed = true;
        continue;
      }
      if (existing.trackId !== pair.trackId) {
        nextTransitionsMap[id] = { ...existing, trackId: pair.trackId };
        changed = true;
      } else {
        nextTransitionsMap[id] = existing;
      }
      nextTransitionIds.push(id);
    } else {
      nextTransitionsMap[id] = existing;
      nextTransitionIds.push(id);
    }
  }

  for (const [id, existing] of Object.entries(transitionsMap)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const pair = adjacentPairs.get(id);
    if (existing.kind === "none") {
      if (!pair) {
        changed = true;
        continue;
      }
      nextTransitionsMap[id] = existing.trackId !== pair.trackId ? { ...existing, trackId: pair.trackId } : existing;
      nextTransitionIds.push(id);
      changed = true;
    } else {
      nextTransitionsMap[id] = existing;
      nextTransitionIds.push(id);
      changed = true;
    }
  }

  for (const [id, pair] of adjacentPairs) {
    if (id in nextTransitionsMap) continue;
    nextTransitionsMap[id] = {
      id,
      duration: DEFAULT_TRANSITION_DURATION_MS,
      fromId: pair.fromId,
      toId: pair.toId,
      kind: "none",
      trackId: pair.trackId,
      type: "transition",
    };
    nextTransitionIds.push(id);
    changed = true;
  }

  if (!changed) {
    return { transitionsMap, transitionIds, changed: false };
  }
  return {
    transitionsMap: nextTransitionsMap,
    transitionIds: nextTransitionIds,
    changed: true,
  };
}

export function intervalsOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  if (Math.min(aTo, bTo) - Math.max(aFrom, bFrom) > OVERLAP_EPSILON_MS) return true;
  return aFrom === bFrom && aTo === bTo;
}

export function trackAcceptsItemType(track: ITrack, itemType: string): boolean {
  const allowed = TRACK_ACCEPTS[track.type];
  if (allowed) return allowed.includes(itemType);
  if (Array.isArray(track.accepts) && track.accepts.length > 0) {
    return (track.accepts as string[]).includes(itemType);
  }
  return track.type === itemType;
}

export function trackHasCollision(
  track: ITrack,
  from: number,
  to: number,
  existingItemsMap: Record<string, ITrackItem>,
  ignoreItemId?: string,
): boolean {
  for (const existingId of track.items) {
    if (existingId === ignoreItemId) continue;
    const existing = existingItemsMap[existingId];
    if (!existing) continue;
    if (intervalsOverlap(from, to, existing.display.from, existing.display.to)) {
      return true;
    }
  }
  return false;
}

export function findReusableTrackForItem(
  item: Pick<ITrackItem, "id" | "type" | "display">,
  tracks: ITrack[],
  existingItemsMap: Record<string, ITrackItem>,
  preferredIndex?: number,
): ITrack | undefined {
  const itemType = String(item.type);
  const candidates = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) =>
      !track.magnetic &&
      !track.static &&
      trackAcceptsItemType(track, itemType) &&
      !trackHasCollision(track, item.display.from, item.display.to, existingItemsMap, item.id)
    );
  if (candidates.length === 0) return undefined;

  const isExactType = (track: ITrack) =>
    track.type === itemType || (itemType === "video" && track.type === "main");

  candidates.sort((a, b) => {
    const exactDiff = Number(isExactType(b.track)) - Number(isExactType(a.track));
    if (exactDiff !== 0) return exactDiff;
    if (preferredIndex !== undefined) {
      const distDiff = Math.abs(a.index - preferredIndex) - Math.abs(b.index - preferredIndex);
      if (distDiff !== 0) return distDiff;
    }
    return a.index - b.index;
  });

  return candidates[0].track;
}

function canPlaceLaneOnTrack(
  oldTrackId: string,
  laneItems: ITrackItem[],
  targetTrack: ITrack,
  existingItemsMap: Record<string, ITrackItem>,
): boolean {
  if (targetTrack.magnetic || targetTrack.static) return false;
  if (targetTrack.id !== oldTrackId) {
    for (const item of laneItems) {
      if (!trackAcceptsItemType(targetTrack, String(item.type))) return false;
    }
  }
  for (const candidate of laneItems) {
    if (trackHasCollision(targetTrack, candidate.display.from, candidate.display.to, existingItemsMap)) {
      return false;
    }
  }
  return true;
}

// Maximize the number of source lanes reused onto existing compatible,
// collision-free tracks while keeping strict top-to-bottom order.
// Returns existing track index for each source lane, or -1 if it needs a new track.
function assignLanesToExistingTracks(
  lanes: Array<{ oldTrackId: string; items: ITrackItem[] }>,
  existingTracks: ITrack[],
  existingItemsMap: Record<string, ITrackItem>,
  trackPlacement: "aboveGroup" | "top",
): number[] {
  const k = lanes.length;
  const m = existingTracks.length;
  const assigned = new Array<number>(k).fill(-1);
  if (k === 0 || m === 0) return assigned;

  const existingIndexById = new Map<string, number>();
  existingTracks.forEach((t, idx) => existingIndexById.set(t.id, idx));

  const preferredIndex = lanes.map((lane, i) => {
    const origIdx = existingIndexById.get(lane.oldTrackId);
    if (origIdx === undefined) return i;
    return trackPlacement === "aboveGroup" ? Math.max(0, origIdx - 1) : origIdx;
  });

  const fits: boolean[][] = Array.from({ length: k }, (_, i) =>
    existingTracks.map((track) => canPlaceLaneOnTrack(lanes[i].oldTrackId, lanes[i].items, track, existingItemsMap))
  );

  // DP: dp[i][j] = max score matching a subset of lanes[0..i-1] to a strictly
  // increasing subsequence of existingTracks[0..j-1].
  // Reusing a lane contributes 1_000_000 so minimizing new tracks always wins;
  // smaller bonuses break ties toward original tracks and nearest lanes.
  const REUSE_WEIGHT = 1_000_000;
  const SAME_TRACK_BONUS = 10_000;
  const PROXIMITY_BASE = 1_000;

  const dp: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(m + 1).fill(0));
  const choice: Uint8Array[] = Array.from({ length: k + 1 }, () => new Uint8Array(m + 1)); // 0=skip lane, 1=skip track, 2=match

  for (let i = 1; i <= k; i++) {
    for (let j = 1; j <= m; j++) {
      let best = dp[i - 1][j];
      let dir = 0;

      if (dp[i][j - 1] > best) {
        best = dp[i][j - 1];
        dir = 1;
      }

      if (fits[i - 1][j - 1]) {
        const sameTrack = existingTracks[j - 1].id === lanes[i - 1].oldTrackId ? SAME_TRACK_BONUS : 0;
        const proximity = Math.max(0, PROXIMITY_BASE - Math.abs((j - 1) - preferredIndex[i - 1]));
        const score = dp[i - 1][j - 1] + REUSE_WEIGHT + sameTrack + proximity;
        if (score > best) {
          best = score;
          dir = 2;
        }
      }

      dp[i][j] = best;
      choice[i][j] = dir;
    }
  }

  let i = k;
  let j = m;
  while (i > 0 && j > 0) {
    const dir = choice[i][j];
    if (dir === 2) {
      assigned[i - 1] = j - 1;
      i--;
      j--;
    } else if (dir === 1) {
      j--;
    } else {
      i--;
    }
  }

  return assigned;
}

// ---------------------------------------------------------------------
// Clone a snapshot (clipboard, for paste; or a fresh selection, for
// duplicate) while minimizing newly added tracks: each source lane
// reuses a compatible, collision-free existing track when possible
// (preserving top-to-bottom relative order) and only creates new tracks
// for lanes that collide or have no compatible lane available.
// Pass anchorMs = null to keep original positions (duplicate); pass a
// time in ms to anchor the earliest item there, shifting the rest by
// the same amount (paste). New items are never reselected afterward.
//
// trackPlacement controls where newly created tracks land when none of
// the lanes can reuse an existing track (and tie-breaking preference):
//   "aboveGroup" — directly above wherever the source tracks currently
//     sit (right for duplicate: the source is still live and visible).
//   "top" — at the very top of the stack (right for paste).
// ---------------------------------------------------------------------

export interface ClonedIntoNewTracks {
  tracks: ITrack[];
  trackItemsMap: Record<string, ITrackItem>;
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  transitionIds: string[];
  duration: number;
  newIds: string[];
  newTrackIds: string[];
}

export function cloneIntoNewTracks(
  snapshot: SelectionSnapshot,
  anchorMs: number | null,
  state: {
    trackItemsMap: Record<string, ITrackItem>;
    trackItemIds: string[];
    transitionsMap: Record<string, ITransition>;
    transitionIds: string[];
    tracks: ITrack[];
    duration: number;
  },
  trackPlacement: "aboveGroup" | "top" = "aboveGroup"
): ClonedIntoNewTracks | null {
  if (snapshot.items.length === 0) return null;

  const idMap = new Map<string, string>();
  snapshot.items.forEach((item) => idMap.set(item.id, generateId()));

  const minFrom = Math.min(...snapshot.items.map((i) => i.display.from));
  const offset = anchorMs === null ? 0 : anchorMs - minFrom;

  // Build shifted clones first so we can check exact target intervals
  // against existing tracks before deciding which lanes need new tracks.
  const sortedSourceItems = [...snapshot.items].sort((a, b) => a.display.from - b.display.from);
  const newItemsMap: Record<string, ITrackItem> = {};
  const newIds: string[] = [];
  const laneItemsByOldTrack = new Map<string, ITrackItem[]>();
  snapshot.trackOrder.forEach((oldId) => laneItemsByOldTrack.set(oldId, []));

  sortedSourceItems.forEach((item) => {
    const newId = idMap.get(item.id)!;
    const cloned = deepClone(item);
    cloned.id = newId;
    cloned.display = { from: item.display.from + offset, to: item.display.to + offset };
    cloned.activeEdit = false;
    if (cloned.details) cloned.details = { ...cloned.details, locked: false };
    delete cloned.transitionInfo;

    newItemsMap[newId] = cloned;
    newIds.push(newId);

    const oldTrackId = snapshot.trackIdByItemId[item.id] ?? snapshot.trackOrder[snapshot.trackOrder.length - 1];
    if (oldTrackId) {
      const bucket = laneItemsByOldTrack.get(oldTrackId);
      if (bucket) bucket.push(cloned);
    }
  });

  const existingTracks: ITrack[] = state.tracks.map((t) => ({ ...t, items: [...t.items] }));
  const lanes = snapshot.trackOrder.map((oldTrackId) => ({
    oldTrackId,
    items: laneItemsByOldTrack.get(oldTrackId) ?? [],
  }));
  const assigned = assignLanesToExistingTracks(lanes, existingTracks, state.trackItemsMap, trackPlacement);

  const trackIdMap = new Map<string, string>();
  const createdTrackIds: string[] = [];
  const createdTrackByLane = new Map<number, ITrack>();

  lanes.forEach((lane, i) => {
    const targetIdx = assigned[i];
    if (targetIdx !== -1) {
      const targetTrack = existingTracks[targetIdx];
      trackIdMap.set(lane.oldTrackId, targetTrack.id);
      lane.items.forEach((item) => targetTrack.items.push(item.id));
    } else {
      const newTrackId = generateId();
      trackIdMap.set(lane.oldTrackId, newTrackId);
      createdTrackIds.push(newTrackId);
      createdTrackByLane.set(i, {
        ...deepClone(snapshot.trackTemplates[lane.oldTrackId]),
        id: newTrackId,
        items: lane.items.map((item) => item.id),
      });
    }
  });

  // Reconnect transitions and point trackId at whichever track (reused or new)
  // the lane's items actually landed on.
  const newTransitions = new Map<string, ITransition>();
  snapshot.transitions.forEach((t) => {
    const fromId = idMap.get(t.fromId);
    const toId = idMap.get(t.toId);
    if (!fromId || !toId) return;
    const oldTrackId = snapshot.trackIdByItemId[t.fromId] ?? snapshot.trackIdByItemId[t.toId];
    const newTrackId = (oldTrackId && trackIdMap.get(oldTrackId)) || t.trackId;
    const newId = `${fromId}-${toId}`;
    newTransitions.set(newId, { ...deepClone(t), id: newId, fromId, toId, trackId: newTrackId });
  });

  const transitionForNewItem = new Map<
    string,
    { isFrom: boolean; isTo: boolean; transition: ITransition }
  >();
  newTransitions.forEach((t) => {
    if (!transitionForNewItem.has(t.fromId)) {
      transitionForNewItem.set(t.fromId, { isFrom: true, isTo: false, transition: t });
    }
    transitionForNewItem.set(t.toId, { isFrom: false, isTo: true, transition: t });
  });
  transitionForNewItem.forEach((info, itemId) => {
    const item = newItemsMap[itemId];
    if (item) item.transitionInfo = info;
  });

  const trackItemsMap = { ...state.trackItemsMap, ...newItemsMap };

  // Keep reused tracks' item arrays sorted by display.from.
  existingTracks.forEach((track, idx) => {
    if (assigned.includes(idx)) {
      track.items.sort((a, b) => (trackItemsMap[a]?.display.from ?? 0) - (trackItemsMap[b]?.display.from ?? 0));
    }
  });

  // Insert only the newly created tracks, positioned to preserve top-to-bottom
  // relative order with any reused lanes.
  const tracks: ITrack[] = [];
  if (existingTracks.length === 0) {
    for (let i = 0; i < lanes.length; i++) {
      const created = createdTrackByLane.get(i);
      if (created) tracks.push(created);
    }
  } else {
    const insertBefore = new Map<number, ITrack[]>();
    const insertAfter = new Map<number, ITrack[]>();
    const pushMap = (map: Map<number, ITrack[]>, idx: number, list: ITrack[]) => {
      const existing = map.get(idx);
      if (existing) existing.push(...list);
      else map.set(idx, [...list]);
    };

    let i = 0;
    while (i < lanes.length) {
      if (assigned[i] !== -1) {
        i++;
        continue;
      }
      const start = i;
      const run: ITrack[] = [];
      while (i < lanes.length && assigned[i] === -1) {
        const created = createdTrackByLane.get(i);
        if (created) run.push(created);
        i++;
      }
      if (run.length === 0) continue;

      if (i < lanes.length && assigned[i] !== -1) {
        pushMap(insertBefore, assigned[i], run);
      } else if (start > 0 && assigned[start - 1] !== -1) {
        pushMap(insertAfter, assigned[start - 1], run);
      } else if (trackPlacement === "top") {
        pushMap(insertBefore, 0, run);
      } else {
        const insertAt = snapshot.trackOrder
          .map((oldId) => existingTracks.findIndex((t) => t.id === oldId))
          .find((idx) => idx !== -1);
        if (insertAt !== undefined) pushMap(insertBefore, insertAt, run);
        else pushMap(insertAfter, existingTracks.length - 1, run);
      }
    }

    for (let j = 0; j < existingTracks.length; j++) {
      const before = insertBefore.get(j);
      if (before) tracks.push(...before);
      tracks.push(existingTracks[j]);
      const after = insertAfter.get(j);
      if (after) tracks.push(...after);
    }
  }

  const trackItemIds = [...state.trackItemIds, ...newIds];

  const rawTransitionsMap = { ...state.transitionsMap };
  const rawTransitionIds = [...state.transitionIds];
  newTransitions.forEach((t, id) => {
    rawTransitionsMap[id] = t;
    if (!rawTransitionIds.includes(id)) rawTransitionIds.push(id);
  });

  const { transitionsMap, transitionIds } = reconcileAdjacentTransitions(
    tracks,
    trackItemsMap,
    rawTransitionsMap,
    rawTransitionIds,
  );

  const duration = Math.max(state.duration, ...newIds.map((id) => trackItemsMap[id].display.to));

  return {
    tracks,
    trackItemsMap,
    trackItemIds,
    transitionsMap,
    transitionIds,
    duration,
    newIds,
    newTrackIds: createdTrackIds,
  };
}

// ---------------------------------------------------------------------
// Clone a copied/duplicated selection into the SAME tracks, right after
// each original item — kept around for any other caller that still wants
// same-track cloning (the keyboard-shortcut paste/duplicate no longer use
// this; see cloneIntoNewTracks above). Pass anchorMs = null to keep the
// original positions; pass a time in ms to anchor the earliest item there.
// ---------------------------------------------------------------------

export interface ClonedSelection {
  trackItemsMap: Record<string, ITrackItem>;
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  transitionIds: string[];
  tracks: ITrack[];
  duration: number;
  newIds: string[];
}

export function cloneSelectionInto(
  source: { items: ITrackItem[]; transitions: ITransition[] },
  anchorMs: number | null,
  state: {
    trackItemsMap: Record<string, ITrackItem>;
    trackItemIds: string[];
    transitionsMap: Record<string, ITransition>;
    transitionIds: string[];
    tracks: ITrack[];
    duration: number;
  }
): ClonedSelection | null {
  if (source.items.length === 0) return null;

  const idMap = new Map<string, string>();
  source.items.forEach((item) => idMap.set(item.id, generateId()));

  const minFrom = Math.min(...source.items.map((i) => i.display.from));
  const offset = anchorMs === null ? 0 : anchorMs - minFrom;

  const newTransitions = new Map<string, ITransition>();
  source.transitions.forEach((t) => {
    const fromId = idMap.get(t.fromId);
    const toId = idMap.get(t.toId);
    if (!fromId || !toId) return; // an endpoint didn't make it into the copy
    const newId = `${fromId}-${toId}`;
    newTransitions.set(newId, { ...deepClone(t), id: newId, fromId, toId });
  });

  // Which (if any) transition now touches each new item, and on which side.
  // transitionInfo only ever holds one transition; if a new item ended up
  // with both an incoming and outgoing one, the incoming ("isTo") wins —
  // same single-slot limitation the rest of the app has.
  const transitionForNewItem = new Map<
    string,
    { isFrom: boolean; isTo: boolean; transition: ITransition }
  >();
  newTransitions.forEach((t) => {
    if (!transitionForNewItem.has(t.fromId)) {
      transitionForNewItem.set(t.fromId, { isFrom: true, isTo: false, transition: t });
    }
    transitionForNewItem.set(t.toId, { isFrom: false, isTo: true, transition: t });
  });

  const newItemsMap: Record<string, ITrackItem> = {};
  const newIds: string[] = [];
  source.items.forEach((item) => {
    const newId = idMap.get(item.id)!;
    const cloned = deepClone(item);
    cloned.id = newId;
    cloned.display = {
      from: item.display.from + offset,
      to: item.display.to + offset,
    };
    cloned.activeEdit = false;
    if (cloned.details) cloned.details = { ...cloned.details, locked: false };

    const info = transitionForNewItem.get(newId);
    if (info) cloned.transitionInfo = info;
    else delete cloned.transitionInfo;

    newItemsMap[newId] = cloned;
    newIds.push(newId);
  });

  // Drop each new id in right after the item it was copied from, in
  // whichever track that item lives on.
  const tracks = state.tracks.map((track) => {
    const items: string[] = [];
    track.items.forEach((id) => {
      items.push(id);
      const newId = idMap.get(id);
      if (newId) items.push(newId);
    });
    return { ...track, items };
  });

  const trackItemsMap = { ...state.trackItemsMap, ...newItemsMap };
  const trackItemIds = [...state.trackItemIds, ...newIds];

  const rawTransitionsMap = { ...state.transitionsMap };
  const rawTransitionIds = [...state.transitionIds];
  newTransitions.forEach((t, id) => {
    rawTransitionsMap[id] = t;
    if (!rawTransitionIds.includes(id)) rawTransitionIds.push(id);
  });

  const { transitionsMap, transitionIds } = reconcileAdjacentTransitions(
    tracks,
    trackItemsMap,
    rawTransitionsMap,
    rawTransitionIds,
  );

  const duration = Math.max(state.duration, ...newIds.map((id) => trackItemsMap[id].display.to));

  return { trackItemsMap, trackItemIds, transitionsMap, transitionIds, tracks, duration, newIds };
}

// ---------------------------------------------------------------------
// Split every selected item that the given time actually falls inside. Any
// transition touching a split item is reconnected to the correct new half —
// an incoming transition (its toId) now arrives at the left half's start,
// an outgoing one (its fromId) now leaves from the right half's end.
// ---------------------------------------------------------------------

export function splitItemAtTime(
  item: ITrackItem,
  timeMs: number
): { left: ITrackItem; right: ITrackItem } | null {
  const { from, to } = item.display;
  if (timeMs <= from || timeMs >= to) return null;

  const left = deepClone(item);
  const right = deepClone(item);
  left.id = generateId();
  right.id = generateId();
  left.activeEdit = false;
  right.activeEdit = false;
  delete left.transitionInfo;
  delete right.transitionInfo;
  left.display = { from, to: timeMs };
  right.display = { from: timeMs, to };

  if (item.trim) {
    const cut = item.trim.from + (timeMs - from);
    left.trim = { from: item.trim.from, to: cut };
    right.trim = { from: cut, to: item.trim.to };
  }

  return { left, right };
}

export interface SplitResult {
  trackItemsMap: Record<string, ITrackItem>;
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  transitionIds: string[];
  tracks: ITrack[];
  newIds: string[];
}

export function splitItemsAtTime(
  selectedIds: string[],
  timeMs: number,
  state: {
    trackItemsMap: Record<string, ITrackItem>;
    trackItemIds: string[];
    transitionsMap: Record<string, ITransition>;
    transitionIds: string[];
    tracks: ITrack[];
  }
): SplitResult | null {
  const trackItemsMap = { ...state.trackItemsMap };
  let trackItemIds = [...state.trackItemIds];
  const transitionsMap = { ...state.transitionsMap };
  const tracks = state.tracks.map((t) => ({ ...t, items: [...t.items] }));
  const newIds: string[] = [];
  let didSplit = false;

  selectedIds.forEach((id) => {
    const item = trackItemsMap[id];
    if (!item) return; // not a track item (e.g. a selected transition), or already handled
    const halves = splitItemAtTime(item, timeMs);
    if (!halves) return; // playhead isn't inside this item
    const { left, right } = halves;
    didSplit = true;

    Object.values(transitionsMap).forEach((t) => {
      if (t.toId === id) {
        const newId = `${t.fromId}-${left.id}`;
        const updated = { ...t, id: newId, toId: left.id };
        delete transitionsMap[t.id];
        transitionsMap[newId] = updated;
        left.transitionInfo = { isFrom: false, isTo: true, transition: updated };

        // The transition's OTHER endpoint (unaffected by this split) still
        // has its own cached copy of `t` pointing at the pre-split id. Refresh
        // it to the same `updated` object (same fix as before, now also
        // carrying the new id) or it goes stale.
        const otherItem = trackItemsMap[t.fromId];
        if (otherItem) {
          trackItemsMap[t.fromId] = {
            ...otherItem,
            transitionInfo: { isFrom: true, isTo: false, transition: updated },
          };
        }
      }
      if (t.fromId === id) {
        const newId = `${right.id}-${t.toId}`;
        const updated = { ...t, id: newId, fromId: right.id };
        delete transitionsMap[t.id];
        transitionsMap[newId] = updated;
        right.transitionInfo = { isFrom: true, isTo: false, transition: updated };

        const otherItem = trackItemsMap[t.toId];
        if (otherItem) {
          trackItemsMap[t.toId] = {
            ...otherItem,
            transitionInfo: { isFrom: false, isTo: true, transition: updated },
          };
        }
      }
    });

    delete trackItemsMap[id];
    trackItemsMap[left.id] = left;
    trackItemsMap[right.id] = right;

    trackItemIds = trackItemIds.filter((tid) => tid !== id);
    trackItemIds.push(left.id, right.id);

    const track = tracks.find((t) => t.items.includes(id));
    if (track) {
      track.items.splice(track.items.indexOf(id), 1, left.id, right.id);
    }

    newIds.push(left.id, right.id);
  });

  if (!didSplit) return null;

  return {
    trackItemsMap,
    trackItemIds,
    transitionsMap,
    transitionIds: Object.keys(transitionsMap),
    tracks,
    newIds,
  };
}

// ---------------------------------------------------------------------
// Playhead edits: extend / move / delete left / delete right, all
// relative to the playhead time. getPlayheadEdit returns the edited copy
// of the item, or null when there is nothing to do (the header uses that
// to hide the extend button, the shortcuts use it to no-op).
// ---------------------------------------------------------------------

export type PlayheadAction = "extend" | "move" | "deleteLeft" | "deleteRight";

const isMediaItem = (item: ITrackItem) => item.type === "audio" || item.type === "video";

// Which side of the item the playhead is on (past the midpoint counts as right).
export function getPlayheadSide(item: ITrackItem, timeMs: number): "left" | "right" {
  return timeMs < (item.display.from + item.display.to) / 2 ? "left" : "right";
}

// The free gap around an item on its own track, so edits stop at neighbours.
function getFreeRange(
  item: ITrackItem,
  state: { trackItemsMap: Record<string, ITrackItem>; tracks: ITrack[] }
) {
  let min = 0;
  let max = Infinity;
  const track = state.tracks.find((t) => t.items.includes(item.id));
  track?.items.forEach((id) => {
    const other = state.trackItemsMap[id];
    if (!other || id === item.id) return;
    if (other.display.to <= item.display.from) min = Math.max(min, other.display.to);
    else if (other.display.from >= item.display.to) max = Math.min(max, other.display.from);
  });
  return { min, max };
}

export function getPlayheadEdit(
  action: PlayheadAction,
  item: ITrackItem,
  timeMs: number,
  state: { trackItemsMap: Record<string, ITrackItem>; tracks: ITrack[] }
): ITrackItem | null {
  const { from, to } = item.display;

  // delete left / right = split at the playhead and drop one half
  if (action === "deleteLeft" || action === "deleteRight") {
    if (timeMs <= from || timeMs >= to) return null;
    const keepRight = action === "deleteLeft";
    const next: ITrackItem = {
      ...item,
      display: keepRight ? { from: timeMs, to } : { from, to: timeMs },
    };
    if (item.trim) {
      const cut = item.trim.from + (timeMs - from);
      next.trim = keepRight ? { from: cut, to: item.trim.to } : { from: item.trim.from, to: cut };
    }
    return next;
  }

  const { min, max } = getFreeRange(item, state);

  // move: playhead left of centre -> start lands on it, otherwise end lands on it
  if (action === "move") {
    const length = to - from;
    const wanted = getPlayheadSide(item, timeMs) === "left" ? timeMs : timeMs - length;
    const newFrom = Math.min(Math.max(wanted, min), max - length);
    if (Math.abs(newFrom - from) < 1) return null;
    return { ...item, display: { from: newFrom, to: newFrom + length } };
  }

  // extend: only when the playhead is outside the item
  if (timeMs >= from && timeMs <= to) return null;
  const media = isMediaItem(item);
  // assumes audio/video items carry their source length as `duration`
  const sourceDuration = (item as any).duration as number | undefined;

  if (timeMs > to) {
    let newTo = Math.min(timeMs, max);
    if (media) {
      if (!item.trim || sourceDuration == null) return null;
      newTo = Math.min(newTo, to + (sourceDuration - item.trim.to));
    }
    if (newTo - to < 1) return null;
    const next: ITrackItem = { ...item, display: { from, to: newTo } };
    if (media && item.trim) next.trim = { from: item.trim.from, to: item.trim.to + (newTo - to) };
    return next;
  }

  let newFrom = Math.max(timeMs, min);
  if (media) {
    if (!item.trim) return null;
    newFrom = Math.max(newFrom, from - item.trim.from);
  }
  if (from - newFrom < 1) return null;
  const next: ITrackItem = { ...item, display: { from: newFrom, to } };
  if (media && item.trim) next.trim = { from: item.trim.from - (from - newFrom), to: item.trim.to };
  return next;
}

export function applyPlayheadAction(
  stateManager: StateManager,
  action: PlayheadAction,
  timeMs: number,
  state: {
    activeIds: string[];
    trackItemsMap: Record<string, ITrackItem>;
    tracks: ITrack[];
    duration: number;
  }
) {
  if (state.activeIds.length !== 1) return;
  const item = state.trackItemsMap[state.activeIds[0]];
  if (!item || item.details?.locked || isSceneItem(item.type)) return;

  const next = getPlayheadEdit(action, item, timeMs, state);
  if (!next) return;

  const nextTrackItemsMap = { ...state.trackItemsMap, [next.id]: next };
  const current = stateManager.getState();
  const reconciled = reconcileAdjacentTransitions(
    state.tracks,
    nextTrackItemsMap,
    current.transitionsMap,
    current.transitionIds,
    current.scale?.zoom,
  );

  stateManager.updateState(
    {
      trackItemsMap: nextTrackItemsMap,
      ...(reconciled.changed
        ? { transitionsMap: reconciled.transitionsMap, transitionIds: reconciled.transitionIds }
        : {}),
      duration: Math.max(state.duration, next.display.to),
    },
    { updateHistory: true, kind: "update" }
  );
}