import { generateId } from "@designcombo/timeline";
import type { ITrack, ITrackItem, ITransition, State } from "@designcombo/types";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import { reconcileAdjacentTransitions } from "./item-actions";
import { updateAddedItem } from "./optimistic-add";

export type ReplaceMediaType = "image" | "video";

export interface ActiveMediaDrag {
  type: ReplaceMediaType;
  data: Record<string, any>;
}

let activeMediaDrag: ActiveMediaDrag | null = null;

export function resolveMediaType(data: unknown): ReplaceMediaType | null {
  if (!data || typeof data !== "object") return null;
  const candidate = data as Record<string, any>;
  const rawType = typeof candidate.type === "string" ? candidate.type.toLowerCase() : "";
  const type: ReplaceMediaType | null =
    rawType === "image" || rawType.startsWith("image/")
      ? "image"
      : rawType === "video" || rawType.startsWith("video/")
        ? "video"
        : null;
  if (!type) return null;
  const src = candidate.details?.src || candidate.metadata?.uploadedUrl || candidate.url;
  if (typeof src !== "string" || !src) return null;
  return type;
}

export function setActiveMediaDrag(data: unknown) {
  const type = resolveMediaType(data);
  activeMediaDrag = type ? { type, data: data as Record<string, any> } : null;
}

export function clearActiveMediaDrag() {
  activeMediaDrag = null;
}

export function getActiveMediaDrag(): ActiveMediaDrag | null {
  return activeMediaDrag;
}

const durationOf = (items: State["trackItemsMap"]) =>
  Math.max(0, ...Object.values(items).map((item) => item.display.to));

function packMagneticTrack(track: ITrack, items: State["trackItemsMap"]) {
  const ordered = track.items
    .map((id) => items[id])
    .filter(Boolean)
    .sort((a, b) => a.display.from - b.display.from);
  let from = 0;
  for (const item of ordered) {
    const length = item.display.to - item.display.from;
    items[item.id] = { ...item, display: { from, to: from + length } };
    from += length;
  }
}

function probeVideoDurationMs(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    const finish = (durationMs: number | null) => {
      clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      resolve(durationMs);
    };
    const timeout = setTimeout(() => finish(null), 15_000);
    video.onloadedmetadata = () => {
      const ms = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : null;
      finish(ms);
    };
    video.onerror = () => finish(null);
    video.src = src;
  });
}

export function replaceTrackItemMedia(
  targetId: string,
  source: Record<string, any>,
  explicitType?: ReplaceMediaType,
): string | null {
  const stateManager = useStore.getState().stateManager;
  if (!stateManager) return null;

  const state = stateManager.getState();
  const target = state.trackItemsMap[targetId];
  if (!target || (target.type !== "image" && target.type !== "video") || (target.details as any)?.locked) {
    return null;
  }

  const nextType = explicitType ?? resolveMediaType(source);
  if (!nextType) return null;

  const src = source.details?.src || source.metadata?.uploadedUrl || source.url;
  if (typeof src !== "string" || !src) return null;

  const slotDurationMs = Math.max(100, target.display.to - target.display.from);
  const nextPlaybackRate = nextType === "video" && target.type === "video" ? (target.playbackRate || 1) : 1;

  // Preserve the exact visible canvas frame, position, transform, and styling
  // regardless of the replacement media's aspect ratio. If the previous item
  // had an explicit crop box, collapse its visible frame into width/height and
  // clear crop so the new media centers cleanly inside the same box.
  const nextDetails: Record<string, any> = { ...target.details, src };
  const prevCrop = (target.details as any)?.crop;
  if (prevCrop && typeof prevCrop.width === "number" && prevCrop.width > 0 && typeof prevCrop.height === "number" && prevCrop.height > 0) {
    nextDetails.width = prevCrop.width;
    nextDetails.height = prevCrop.height;
    delete nextDetails.crop;
  }

  let nextDisplay = { from: target.display.from, to: target.display.to };
  let nextTrim = { from: 0, to: slotDurationMs };
  let nextDuration = Math.max(5000, slotDurationMs);
  let needsDurationProbe = false;

  if (nextType === "video") {
    nextDetails.volume = (target.details as any)?.volume ?? 100;
    const rawSeconds =
      typeof source.details?.duration === "number" && source.details.duration > 0
        ? source.details.duration
        : typeof source.duration === "number" && source.duration > 0
          ? source.duration / 1000
          : undefined;

    if (rawSeconds) {
      nextDetails.duration = rawSeconds;
      const mediaDurationMs = rawSeconds * 1000;
      const neededSourceMs = slotDurationMs * nextPlaybackRate;
      nextDuration = mediaDurationMs;
      if (mediaDurationMs >= neededSourceMs) {
        nextTrim = { from: 0, to: neededSourceMs };
      } else {
        nextTrim = { from: 0, to: mediaDurationMs };
        nextDisplay = {
          from: target.display.from,
          to: target.display.from + mediaDurationMs / nextPlaybackRate,
        };
      }
    } else {
      delete nextDetails.duration;
      const neededSourceMs = slotDurationMs * nextPlaybackRate;
      nextDuration = neededSourceMs;
      nextTrim = { from: 0, to: neededSourceMs };
      needsDurationProbe = !src.startsWith("pending-upload:");
    }
  } else {
    delete nextDetails.duration;
  }

  const rawMeta = source.metadata && typeof source.metadata === "object" ? { ...source.metadata } : {};
  const displayName = rawMeta.name || source.fileName || source.name || nextType;
  const previewUrl =
    rawMeta.previewUrl ?? source.preview ?? source.videoPreviewUrl ?? source.thumbnailUrl ?? "";
  const nextMetadata = {
    ...rawMeta,
    name: displayName,
    previewUrl,
  };

  const newId = generateId();
  const nextItem: ITrackItem = {
    id: newId,
    type: nextType,
    name: displayName,
    display: nextDisplay,
    trim: nextTrim,
    duration: nextDuration,
    playbackRate: nextPlaybackRate,
    details: nextDetails,
    metadata: nextMetadata,
    ...(target.animations ? { animations: target.animations } : {}),
    ...((target as any).isMain !== undefined ? { isMain: (target as any).isMain } : {}),
  } as ITrackItem;

  const trackItemsMap: Record<string, ITrackItem> = { ...state.trackItemsMap };
  delete trackItemsMap[targetId];
  trackItemsMap[newId] = nextItem;

  const trackItemIds = state.trackItemIds.map((id) => (id === targetId ? newId : id));

  const timingChanged =
    nextDisplay.from !== target.display.from || nextDisplay.to !== target.display.to;
  let ownerTrackMagnetic = false;
  const tracks: ITrack[] = state.tracks.map((track) => {
    if (!track.items.includes(targetId)) return track;
    const nextTrack: ITrack = {
      ...track,
      items: track.items.map((id) => (id === targetId ? newId : id)),
    };
    if (track.magnetic) ownerTrackMagnetic = true;
    return nextTrack;
  });

  if (timingChanged && ownerTrackMagnetic) {
    for (const track of tracks) {
      if (track.magnetic && track.items.includes(newId)) {
        packMagneticTrack(track, trackItemsMap);
      }
    }
  }

  let transitionsMap: Record<string, ITransition> = {};
  let transitionIds: string[] = [];
  for (const id of state.transitionIds) {
    const transition = state.transitionsMap[id];
    if (!transition) continue;
    const fromId = transition.fromId === targetId ? newId : transition.fromId;
    const toId = transition.toId === targetId ? newId : transition.toId;
    const nextTransitionId = fromId !== transition.fromId || toId !== transition.toId
      ? `${fromId}-${toId}`
      : id;
    transitionsMap[nextTransitionId] = {
      ...transition,
      id: nextTransitionId,
      fromId,
      toId,
    };
    transitionIds.push(nextTransitionId);
  }

  if (timingChanged) {
    const reconciled = reconcileAdjacentTransitions(
      tracks,
      trackItemsMap,
      transitionsMap,
      transitionIds,
      useStore.getState().scale.zoom,
    );
    if (reconciled.changed) {
      transitionsMap = reconciled.transitionsMap;
      transitionIds = reconciled.transitionIds;
    }
  }

  const wasSelected = state.activeIds.includes(targetId);
  const nextActiveIds = wasSelected
    ? state.activeIds.map((id) => (id === targetId ? newId : id))
    : state.activeIds;

  // Keep Replace mode locked onto the newly-swapped item before committing state
  // so selection watchers don't mistakenly close Replace mode.
  if (useLayoutStore.getState().replaceTargetId === targetId) {
    useLayoutStore.setState({ replaceTargetId: newId });
  }

  stateManager.updateState(
    {
      tracks,
      trackItemsMap,
      trackItemIds,
      transitionsMap,
      transitionIds,
      duration: durationOf(trackItemsMap),
      ...(wasSelected ? { activeIds: nextActiveIds } : {}),
    },
    { updateHistory: true, kind: "update" },
  );

  if (needsDurationProbe) {
    const targetDoc = useStore.getState().collabSchema;
    void probeVideoDurationMs(src).then((probedMs) => {
      if (!probedMs || useStore.getState().collabSchema !== targetDoc) return;
      updateAddedItem(newId, (current) => {
        if ((current.details as any)?.src !== src) return current;
        const rate = current.playbackRate || 1;
        const currentSlotMs = current.display.to - current.display.from;
        const currentNeededMs = currentSlotMs * rate;
        const details = { ...current.details, duration: probedMs / 1000 };
        if (probedMs < currentNeededMs) {
          return {
            ...current,
            duration: probedMs,
            details,
            trim: { from: 0, to: probedMs },
            display: { from: current.display.from, to: current.display.from + probedMs / rate },
          } as ITrackItem;
        }
        return { ...current, duration: probedMs, details } as ITrackItem;
      });
    });
  }

  return newId;
}
