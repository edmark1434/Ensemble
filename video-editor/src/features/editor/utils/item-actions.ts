import { generateId } from "@designcombo/timeline";
import type { ITrack, ITrackItem, ITransition } from "@designcombo/types";

// Deep-clones plain state data (items/transitions) without structuredClone —
// track items can carry a function value on animations.*.composition[].ease,
// and structuredClone throws on functions. Functions are passed through by
// reference instead of cloned; everything else is copied.
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
// Clipboard — lives outside the collab doc / stateManager on purpose.
// What's copied is a plain, deep-cloned snapshot so later edits to the
// live items can't reach back and mutate it.
// ---------------------------------------------------------------------

interface ClipboardData {
  items: ITrackItem[];
  transitions: ITransition[];
}

let clipboard: ClipboardData | null = null;

export function setClipboard(items: ITrackItem[], transitions: ITransition[]) {
  clipboard = {
    items: items.map((i) => deepClone(i)),
    transitions: transitions.map((t) => deepClone(t)),
  };
}

export function getClipboard(): ClipboardData | null {
  return clipboard;
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
// Clone a copied/duplicated selection into a new set of items + transitions
// with fresh ids. Pass anchorMs = null to keep the original positions
// (duplicate); pass a time in ms to anchor the earliest item there, shifting
// the rest by the same amount so their relative timing is preserved (paste).
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