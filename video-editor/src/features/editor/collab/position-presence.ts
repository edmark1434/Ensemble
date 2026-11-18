import { useEffect, useRef, useState, type RefObject } from "react";
import { throttle } from "lodash";
import type { PlayerRef } from "@remotion/player";
import type { Awareness } from "y-protocols/awareness";
import useStore from "../store/use-store";
import { getSafeCurrentFrame } from "../utils/time";
import { getColorForIdentity, whenPresenceChanges } from "./live-transform";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface TimelinePoint {
  area: "ruler" | "lanes";
  timeMs: number;
  y: number;
}

const CANVAS_CURSOR_WINDOW_MS = 1000;

interface PositionFields {
  canvasCursor: CanvasPoint;
  timelineCursor: TimelinePoint;
  playheadMs: number;
}

interface PeerPosition<T> {
  clientId: number;
  name: string;
  color: string;
  value: T;
}

export function useRoomAwareness() {
  return useStore((state) => state.collabSchema?.awareness);
}

export function usePeerPositions<K extends keyof PositionFields>(
  awareness: Awareness | undefined,
  field: K,
) {
  const [peers, setPeers] = useState<PeerPosition<PositionFields[K]>[]>([]);
  useEffect(() => {
    if (!awareness) {
      setPeers([]);
      return;
    }
    const publish = whenPresenceChanges<PeerPosition<PositionFields[K]>[]>(setPeers);
    const read = () => {
      const next: PeerPosition<PositionFields[K]>[] = [];
      const localTime = awareness.getLocalState()?.playheadMs;
      for (const [clientId, state] of awareness.getStates()) {
        if (clientId === awareness.clientID || !state.user) continue;
        const value = state[field];
        if (field === "canvasCursor") {
          if (!Number.isFinite(localTime) || !Number.isFinite(state.playheadMs) ||
              Math.abs(localTime - state.playheadMs) > CANVAS_CURSOR_WINDOW_MS) continue;
          if (!Number.isFinite(value?.x) || !Number.isFinite(value?.y) ||
              value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1) continue;
        } else if (field === "timelineCursor") {
          if ((value?.area !== "ruler" && value?.area !== "lanes") ||
              !Number.isFinite(value.timeMs) || value.timeMs < 0 || !Number.isFinite(value.y)) continue;
        } else if (!Number.isFinite(value) || value < 0) continue;
        next.push({
          clientId,
          name: (typeof state.user.name === "string" && state.user.name) || "Collaborator",
          color: getColorForIdentity(state.user.id, clientId),
          value,
        });
      }
      publish(next);
    };
    read();
    awareness.on("change", read);
    return () => awareness.off("change", read);
  }, [awareness, field]);
  return peers;
}

export function useShareCursor<K extends "canvasCursor" | "timelineCursor">(
  awareness: Awareness | undefined,
  field: K,
  containerRef: RefObject<HTMLDivElement | null>,
  locate: (event: PointerEvent) => PositionFields[K] | null,
) {
  const locateRef = useRef(locate);
  const refreshRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    locateRef.current = locate;
    refreshRef.current?.();
  }, [locate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!awareness || !container) return;
    const publish = throttle((point: PositionFields[K]) => {
      if (awareness.getLocalState()) awareness.setLocalStateField(field, point);
    }, 50);
    let lastEvent: PointerEvent | null = null;
    const clear = () => {
      lastEvent = null;
      publish.cancel();
      clearPosition(awareness, field);
    };
    const move = (event: PointerEvent) => {
      lastEvent = event;
      const point = locateRef.current(event);
      if (point) publish(point);
      else clear();
    };
    const release = (event: PointerEvent) => {
      if (event.pointerType === "touch") clear();
    };
    refreshRef.current = () => {
      if (lastEvent) move(lastEvent);
    };
    container.addEventListener("pointermove", move, true);
    container.addEventListener("pointerleave", clear);
    container.addEventListener("pointercancel", clear);
    container.addEventListener("pointerup", release, true);
    window.addEventListener("blur", clear);
    return () => {
      container.removeEventListener("pointermove", move, true);
      container.removeEventListener("pointerleave", clear);
      container.removeEventListener("pointercancel", clear);
      container.removeEventListener("pointerup", release, true);
      window.removeEventListener("blur", clear);
      refreshRef.current = null;
      clear();
    };
  }, [awareness, field, containerRef]);
}

export function clearPosition(awareness: Awareness, field: keyof PositionFields) {
  if (awareness.getLocalState()?.[field] != null) {
    awareness.setLocalStateField(field, null);
  }
}

export function useSharePlayhead(playerRef: RefObject<PlayerRef | null>, fps: number) {
  const awareness = useRoomAwareness();
  useEffect(() => {
    const player = playerRef.current;
    if (!awareness || !player || fps <= 0) return;
    const publish = throttle(() => {
      const time = getSafeCurrentFrame(playerRef) * 1000 / fps;
      const state = awareness.getLocalState();
      if (state && Number.isFinite(time) && state.playheadMs !== time) {
        awareness.setLocalStateField("playheadMs", time);
      }
    }, 100);
    publish();
    player.addEventListener("frameupdate", publish);
    return () => {
      player.removeEventListener("frameupdate", publish);
      publish.cancel();
      clearPosition(awareness, "playheadMs");
    };
  }, [awareness, playerRef, fps]);
}
