import StateManager, { ADD_AUDIO, ADD_IMAGE, ADD_TEXT, ADD_VIDEO, ADD_ITEMS, getAcceptsMap } from "@designcombo/state";
import { subject, type EventBusData } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import type { ITrack, ITrackItem, State } from "@designcombo/types";
import useStore from "../store/use-store";
import { normalizeDimensionsToCanvas } from "./dimensions";
import { ensureFont } from "./fonts";
import { seedDefaultFont } from "./seed-default-font";
import { calculateTextHeight } from "./text";
import {
  findReusableTrackForItem,
  reconcileAdjacentTransitions,
  trackAcceptsItemType,
  trackHasCollision,
} from "./item-actions";

const kinds = new Map([
  [ADD_IMAGE, "image"], [ADD_VIDEO, "video"], [ADD_AUDIO, "audio"], [ADD_TEXT, "text"],
]);

export type AddPlacement = { time: number; trackIndex?: number; targetTrackId?: string; isNewTrack?: boolean };
type AddPayload = Partial<ITrackItem> & { details: Record<string, any>; metadata?: Record<string, any> };
let manager: StateManager | null = null;
let capture: ((event: EventBusData) => void) | null = null;

// The native timeline emits an ADD event with its snapped time and chosen lane.
// Capture that placement for a file drop before validating/queuing its files.
export function captureMediaPlacement(run: () => void): AddPlacement | undefined {
  let placement: AddPlacement | undefined;
  capture = ({ value }) => {
    const captured: AddPlacement = { time: Math.max(0, value?.payload.display.from ?? 0), ...value?.options };
    const track = manager?.getState().tracks[captured.trackIndex ?? 0];
    if (!captured.isNewTrack && track) captured.targetTrackId = track.id;
    placement = captured;
  };
  try { run(); } finally { capture = null; }
  return placement;
}

const durationOf = (items: State["trackItemsMap"]) =>
  Math.max(0, ...Object.values(items).map(item => item.display.to));

// Magnetic lanes append additions and close gaps, just like native menu drops.
function packMagneticTrack(track: ITrack, items: State["trackItemsMap"], addedId?: string) {
  const ordered = track.items.map(id => items[id]).filter(Boolean)
    .sort((a, b) => a.id === addedId ? 1 : b.id === addedId ? -1 : a.display.from - b.display.from);
  let from = 0;
  for (const item of ordered) {
    const length = item.display.to - item.display.from;
    items[item.id] = { ...item, display: { from, to: from + length } };
    from += length;
  }
}

export function updateAddedItem(id: string, update: (item: ITrackItem) => ITrackItem) {
  if (!manager) return;
  const state = manager.getState();
  const item = state.trackItemsMap[id];
  if (!item) return; // Deleted or undone while loading.
  const updated = update(item);
  if (updated === item) return;
  const trackItemsMap = { ...state.trackItemsMap, [id]: updated };
  let tracks: ITrack[] | undefined;

  const timingChanged = updated.display.from !== item.display.from || updated.display.to !== item.display.to;
  if (timingChanged) {
    const currentTrackIndex = state.tracks.findIndex(track => track.items.includes(id));
    const currentTrack = currentTrackIndex >= 0 ? state.tracks[currentTrackIndex] : undefined;
    if (currentTrack?.magnetic) {
      packMagneticTrack(currentTrack, trackItemsMap);
    } else if (currentTrack && trackHasCollision(currentTrack, updated.display.from, updated.display.to, trackItemsMap, id)) {
      // Async metadata probing expanded the clip into a neighbor on the reused lane:
      // relocate to another compatible free lane, or create a new lane right above.
      tracks = state.tracks.map(track => ({ ...track, items: [...track.items] }));
      tracks[currentTrackIndex].items = tracks[currentTrackIndex].items.filter(itemId => itemId !== id);
      const fallbackTrack = findReusableTrackForItem(updated, tracks, trackItemsMap, currentTrackIndex);
      if (fallbackTrack) {
        fallbackTrack.items.push(id);
        fallbackTrack.items.sort((a, b) => (trackItemsMap[a]?.display.from ?? 0) - (trackItemsMap[b]?.display.from ?? 0));
      } else {
        tracks.splice(currentTrackIndex, 0, {
          id: generateId(), type: updated.type as ITrack["type"], items: [id],
          accepts: Object.keys(getAcceptsMap()), magnetic: false, static: false,
        });
      }
    }
  }
  const nextTracks = tracks ?? state.tracks;
  const reconciled = timingChanged
    ? reconcileAdjacentTransitions(
        nextTracks,
        trackItemsMap,
        state.transitionsMap,
        state.transitionIds,
        useStore.getState().scale.zoom,
      )
    : null;
  manager.updateState(
    {
      ...(tracks ? { tracks } : {}),
      trackItemsMap,
      ...(reconciled?.changed
        ? { transitionsMap: reconciled.transitionsMap, transitionIds: reconciled.transitionIds }
        : {}),
      duration: durationOf(trackItemsMap),
    },
    { updateHistory: false }
  );
}

function createItem(payload: AddPayload, type: string, state: State, options: Record<string, any>): ITrackItem {
  const details = payload.details;
  const duration = payload.duration || (details.duration ? details.duration * 1000 : 5000);
  const from = Math.max(0, payload.display?.from ?? 0);
  const trim = { from: payload.trim?.from ?? 0, to: payload.trim?.to ?? duration };
  const isMedia = type === "video" || type === "image";
  const fitted = isMedia && (!details.transform || details.transform === "none") && !details.crop && options.scaleMode !== "fill"
    ? normalizeDimensionsToCanvas(details.width, details.height, state.size.width, state.size.height)
    : undefined;
  const width = fitted?.width ?? (details.width || (type === "text" ? 600 : state.size.width));
  const height = fitted?.height ?? (details.height || (type === "text"
    ? calculateTextHeight({ ...details, text: details.text || "", fontSize: `${details.fontSize || 120}px`, width: `${width}px` } as any)
    : state.size.height));
  const scale = options.scaleMode === "fill"
    ? Math.max(state.size.width / width, state.size.height / height)
    : Math.min(state.size.width / width, state.size.height / height) * (options.scaleAspectRatio || 1);
  return {
    ...payload,
    id: payload.id || generateId(),
    type,
    name: payload.name || type,
    duration,
    playbackRate: payload.playbackRate || 1,
    trim,
    display: { from, to: payload.display?.to ?? from + (trim.to - trim.from) / (payload.playbackRate || 1) },
    details: {
      opacity: 100, volume: 100, borderRadius: 0, borderWidth: 0, borderColor: "#000000",
      border: "none", boxShadow: { color: "#000000", x: 0, y: 0, blur: 0 },
      blur: 0, brightness: 100, flipX: false, flipY: false, rotate: "0deg", visibility: "visible",
      ...(type === "text" ? {
        fontFamily: "Arial", fontSize: 120, fontWeight: "normal", fontStyle: "normal",
        textDecoration: "none", textAlign: "left", lineHeight: "normal", letterSpacing: "normal",
        wordSpacing: "normal", color: "#ffffff", backgroundColor: "transparent", textShadow: "none",
        wordWrap: "normal", wordBreak: "normal", WebkitTextStrokeWidth: "0px",
      } : {}),
      ...details,
      width, height,
      top: (fitted ? undefined : details.top) ?? `${(state.size.height - height) / 2}px`,
      left: (fitted ? undefined : details.left) ?? `${(state.size.width - width) / 2}px`,
      transform: details.transform || (type === "text" || fitted ? "none" : `scale(${scale})`),
    },
    metadata: { previewUrl: "", ...payload.metadata },
  } as ITrackItem;
}

function probe(src: string, type: string): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve, reject) => {
    const media = type === "image" ? new Image() : document.createElement(type === "audio" ? "audio" : "video");
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      media.onload = null;
      media.onerror = null;
      if (media instanceof HTMLMediaElement) media.onloadedmetadata = null;
      const result = media instanceof HTMLImageElement
        ? { width: media.naturalWidth, height: media.naturalHeight }
        : { duration: media.duration * 1000, ...(media instanceof HTMLVideoElement ? { width: media.videoWidth, height: media.videoHeight } : {}) };
      media.removeAttribute("src");
      if (media instanceof HTMLMediaElement) media.load();
      if (error) reject(error); else resolve(result);
    };
    const timeout = setTimeout(() => finish(new Error("Media metadata timed out")), 30_000);
    media.onerror = () => finish(new Error("Unable to read media"));
    if (media instanceof HTMLImageElement) media.onload = () => finish();
    else { media.preload = "metadata"; media.onloadedmetadata = () => finish(); }
    media.src = src;
  });
}

function add(event: EventBusData, stateManager: StateManager) {
  const type = kinds.get(event.key)!;
  const payload = event.value?.payload as AddPayload;
  if (!payload?.details) return;
  const options = event.value?.options ?? {};
  const state = stateManager.getState();
  const item = createItem(payload, type, state, options);
  const tracks = state.tracks.map(track => ({ ...track, items: [...track.items] }));
  const trackItemsMap = { ...state.trackItemsMap, [item.id]: item };

  let existingTrack: ITrack | undefined;
  if (!options.isNewTrack) {
    const requested = options.targetTrackId
      ? tracks.find(track => track.id === options.targetTrackId)
      : options.trackIndex !== undefined ? tracks[options.trackIndex] : undefined;
    if (requested && !requested.static && trackAcceptsItemType(requested, String(item.type)) &&
      (requested.magnetic || !trackHasCollision(requested, item.display.from, item.display.to, state.trackItemsMap))) {
      existingTrack = requested;
    } else {
      const preferredIdx = requested ? tracks.indexOf(requested) : options.trackIndex;
      existingTrack = findReusableTrackForItem(item, tracks, state.trackItemsMap, preferredIdx);
    }
  }

  if (existingTrack) {
    existingTrack.items.push(item.id);
    if (existingTrack.magnetic) {
      packMagneticTrack(existingTrack, trackItemsMap, item.id);
    } else {
      existingTrack.items.sort((a, b) => (trackItemsMap[a]?.display.from ?? 0) - (trackItemsMap[b]?.display.from ?? 0));
    }
  } else {
    tracks.splice(Math.max(0, options.trackIndex ?? 0), 0, {
      id: generateId(), type: item.type as ITrack["type"], items: [item.id],
      accepts: Object.keys(getAcceptsMap()), magnetic: false, static: false,
    });
  }
  const reconciled = reconcileAdjacentTransitions(
    tracks,
    trackItemsMap,
    state.transitionsMap,
    state.transitionIds,
    useStore.getState().scale.zoom,
  );
  stateManager.updateState({
    tracks, trackItemsMap, trackItemIds: [...state.trackItemIds, item.id],
    ...(reconciled.changed
      ? { transitionsMap: reconciled.transitionsMap, transitionIds: reconciled.transitionIds }
      : {}),
    duration: durationOf(trackItemsMap),
    ...(options.isSelected ? { activeIds: [item.id] } : {}),
  }, { updateHistory: true, kind: "add" });

  if (type === "text") {
    const targetDoc = useStore.getState().collabSchema;
    void (async () => {
      const font = payload.details.fontFamily
        ? { postScriptName: payload.details.fontFamily, url: payload.details.fontUrl }
        : await seedDefaultFont();
      if (!font) return;
      if (font.url) await ensureFont(font.postScriptName, font.url);
      if (manager !== stateManager || useStore.getState().collabSchema !== targetDoc) return;
      updateAddedItem(item.id, current => {
        if (current.details.fontFamily !== item.details.fontFamily) return current;
        const details = { ...current.details, fontFamily: font.postScriptName, fontUrl: font.url || "" };
        if (!payload.details.height && details.height === item.details.height) {
          details.height = calculateTextHeight({ ...details, fontSize: `${details.fontSize}px`, width: `${details.width}px` });
        }
        return { ...current, details } as ITrackItem;
      });
    })().catch(() => { /* Retain the immediately visible fallback text. */ });
    return;
  }
  const src = payload.details.src;
  const needsDuration = type !== "image" && !payload.duration && !payload.details.duration;
  const needsSize = type !== "audio" && (!payload.details.width || !payload.details.height);
  if (!src || src.startsWith("pending-upload:") || (!needsDuration && !needsSize)) return;
  const targetDoc = useStore.getState().collabSchema;
  void probe(src, type).then(metadata => {
    if (manager !== stateManager || useStore.getState().collabSchema !== targetDoc) return;
    updateAddedItem(item.id, current => {
      if (current.details.src !== src) return current;
      const details = { ...current.details } as Record<string, any>;
      if (needsSize && metadata.width && metadata.height) {
        const resolved = createItem({
          ...payload, details: { ...payload.details, width: metadata.width, height: metadata.height },
        }, type, state, options);
        for (const key of ["width", "height", "top", "left", "transform"] as const) {
          if (details[key] === (item.details as any)[key]) details[key] = (resolved.details as any)[key];
        }
      }
      const duration = needsDuration && Number.isFinite(metadata.duration) && metadata.duration! > 0
        ? metadata.duration! : current.duration || item.duration || 5000;
      const untouchedTiming = current.display.to - current.display.from === item.display.to - item.display.from &&
        current.trim?.from === item.trim?.from && current.trim?.to === item.trim?.to;
      return {
        ...current, details, duration,
        ...(needsDuration && untouchedTiming ? {
          trim: { from: 0, to: duration },
          display: { from: current.display.from, to: current.display.from + duration / (current.playbackRate || 1) },
        } : {}),
      } as ITrackItem;
    });
  }).catch(() => {
    // Keep the clip. Its existing media component owns loading/error feedback.
  });
}

export function installOptimisticAdds(stateManager: StateManager, canEdit: () => boolean) {
  manager = stateManager;
  const next = subject.next;
  // Intercept the public event bus before the dependency's async ADD handler.
  // This also covers events emitted internally by timeline menu-item drops.
  const route = (event: EventBusData) => {
    // Generated captions already contain their timing and geometry. Commit the
    // supplied batch atomically instead of awaiting the dependency's font probes.
    if (event.key === ADD_ITEMS && event.value?.payload.trackItems?.every((item: ITrackItem) => item.type === "caption")) {
      if (!canEdit()) return;
      const state = stateManager.getState();
      const items: ITrackItem[] = event.value.payload.trackItems;
      const incomingTracks: ITrack[] = event.value.payload.tracks ?? [];
      const incomingMap = Object.fromEntries(items.map(item => [item.id, item]));
      const trackItemsMap = { ...state.trackItemsMap, ...incomingMap };
      const tracks = [...state.tracks];
      for (const track of incomingTracks) {
        const index = tracks.findIndex(current => current.id === track.id);
        if (index >= 0) tracks[index] = { ...tracks[index], items: [...new Set([...tracks[index].items, ...track.items])] };
        else tracks.splice(event.value.options?.trackIndex ?? 0, 0, { accepts: Object.keys(getAcceptsMap()), ...track });
      }
      stateManager.updateState({
        tracks, trackItemsMap, trackItemIds: [...new Set([...state.trackItemIds, ...items.map(item => item.id)])],
        duration: durationOf(trackItemsMap),
      }, { updateHistory: true, kind: "add" });
      return;
    }
    if (!kinds.has(event.key)) { next.call(subject, event); return; }
    if (capture) { capture(event); return; }
    if (!canEdit()) return;
    add(event, stateManager);
  };
  subject.next = route;
  return () => {
    if (subject.next === route) subject.next = next;
    if (manager === stateManager) manager = null;
  };
}
