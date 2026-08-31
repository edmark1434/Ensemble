import { generateId } from "@designcombo/timeline";
import type { ITrack, ITrackItem, ITransition } from "@designcombo/types";

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
// Clone a snapshot (clipboard, for paste; or a fresh selection, for
// duplicate) into new tracks — one new track per source track, in the
// same relative order. Pass anchorMs = null to keep original positions
// (duplicate); pass a time in ms to anchor the earliest item there,
// shifting the rest by the same amount (paste). New items are never
// reselected afterward — selection stays wherever it was.
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
  }
): ClonedIntoNewTracks | null {
  if (snapshot.items.length === 0) return null;

  const idMap = new Map<string, string>();
  snapshot.items.forEach((item) => idMap.set(item.id, generateId()));

  const minFrom = Math.min(...snapshot.items.map((i) => i.display.from));
  const offset = anchorMs === null ? 0 : anchorMs - minFrom;

  // One fresh track per source track, cloned from that track's own shape
  // so it keeps whatever type/accepts/height/etc it had.
  const trackIdMap = new Map<string, string>();
  snapshot.trackOrder.forEach((oldId) => trackIdMap.set(oldId, generateId()));

  const newTracks: ITrack[] = snapshot.trackOrder.map((oldId) => ({
    ...deepClone(snapshot.trackTemplates[oldId]),
    id: trackIdMap.get(oldId)!,
    items: [],
  }));

  // Reconnect transitions, and re-point trackId at the new track — it
  // moved along with its items, so the old trackId is stale.
  const newTransitions = new Map<string, ITransition>();
  snapshot.transitions.forEach((t) => {
    const fromId = idMap.get(t.fromId);
    const toId = idMap.get(t.toId);
    if (!fromId || !toId) return;
    const oldTrackId = snapshot.trackIdByItemId[t.fromId] ?? snapshot.trackIdByItemId[t.toId];
    const newTrackId = (oldTrackId && trackIdMap.get(oldTrackId)) || t.trackId;
    const newId = generateId();
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

  const newItemsMap: Record<string, ITrackItem> = {};
  const newIds: string[] = [];

  // Time order so each new track's items array comes out sorted.
  [...snapshot.items]
    .sort((a, b) => a.display.from - b.display.from)
    .forEach((item) => {
      const newId = idMap.get(item.id)!;
      const cloned = deepClone(item);
      cloned.id = newId;
      cloned.display = { from: item.display.from + offset, to: item.display.to + offset };
      cloned.activeEdit = false;
      if (cloned.details) cloned.details = { ...cloned.details, locked: false };

      const info = transitionForNewItem.get(newId);
      if (info) cloned.transitionInfo = info;
      else delete cloned.transitionInfo;

      newItemsMap[newId] = cloned;
      newIds.push(newId);

      const oldTrackId = snapshot.trackIdByItemId[item.id];
      const newTrackId = oldTrackId && trackIdMap.get(oldTrackId);
      const targetTrack = newTracks.find((t) => t.id === newTrackId) ?? newTracks[newTracks.length - 1];
      targetTrack?.items.push(newId);
    });

  // Insert the whole block of new tracks together, directly above the
  // topmost track in the source selection — not interleaved with the
  // originals. `newTracks` is already in the same top-to-bottom order as
  // `snapshot.trackOrder`, so it drops in as one contiguous group.
  // (If your track order is reversed, splice at `insertAt + 1` instead
  // to insert the block below the group.)
  const tracks = [...state.tracks];
  const insertAt = snapshot.trackOrder
    .map((oldId) => tracks.findIndex((t) => t.id === oldId))
    .find((idx) => idx !== -1);

  insertAt === undefined ? tracks.push(...newTracks) : tracks.splice(insertAt, 0, ...newTracks);

  const trackItemsMap = { ...state.trackItemsMap, ...newItemsMap };
  const trackItemIds = [...state.trackItemIds, ...newIds];

  const transitionsMap = { ...state.transitionsMap };
  const transitionIds = [...state.transitionIds];
  newTransitions.forEach((t, id) => {
    transitionsMap[id] = t;
    transitionIds.push(id);
  });

  const duration = Math.max(state.duration, ...newIds.map((id) => trackItemsMap[id].display.to));

  return {
    tracks,
    trackItemsMap,
    trackItemIds,
    transitionsMap,
    transitionIds,
    duration,
    newIds,
    newTrackIds: [...trackIdMap.values()],
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
    const newId = generateId();
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

  const transitionsMap = { ...state.transitionsMap };
  const transitionIds = [...state.transitionIds];
  newTransitions.forEach((t, id) => {
    transitionsMap[id] = t;
    transitionIds.push(id);
  });

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
        const updated = { ...t, toId: left.id };
        transitionsMap[t.id] = updated;
        left.transitionInfo = { isFrom: false, isTo: true, transition: updated };

        // The transition's OTHER endpoint (unaffected by this split) still
        // has its own cached copy of `t` pointing at the pre-split ids.
        // Refresh it to the same `updated` object or it goes stale — same
        // id, mismatched fromId/toId — and that mismatch is exactly what
        // crashes stateManager.updateState() once it round-trips through
        // the doc.
        const otherItem = trackItemsMap[t.fromId];
        if (otherItem) {
          trackItemsMap[t.fromId] = {
            ...otherItem,
            transitionInfo: { isFrom: true, isTo: false, transition: updated },
          };
        }
      }
      if (t.fromId === id) {
        const updated = { ...t, fromId: right.id };
        transitionsMap[t.id] = updated;
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