import {useEffect, useRef} from "react";
import { dispatch } from "@designcombo/events";
import StateManager, {
  ACTIVE_SPLIT,
  LAYER_DELETE,
  LAYER_SELECT,
  HISTORY_UNDO,
  HISTORY_REDO, TIMELINE_SCALE_CHANGED, EDIT_OBJECT,
} from "@designcombo/state";
import { buildSelectionSnapshot, cloneIntoNewTracks, setClipboard, getClipboard } from "../utils/item-actions";
import { getCurrentTime } from "../utils/time";
import useStore from "../store/use-store";
import {timeMsToUnits} from "@designcombo/timeline";
import {ITimelineScaleState} from "@designcombo/types";
import {getFitZoomLevel, getNextZoomLevel, getPreviousZoomLevel} from "@/features/editor/utils/timeline";
import {useTimelineOffsetX} from "@/features/editor/hooks/use-timeline-offset";
import {TIMELINE_OFFSET_CANVAS_LEFT} from "@/features/editor/constants/constants";
import {scrollTimelineToFrame} from "@/features/editor/utils/timeline-scroll";
import type * as Y from "yjs";

export function useKeyboardShortcuts(stateManager: StateManager, undoManager?: Y.UndoManager) {
  const timelineOffsetX = useTimelineOffsetX();
  const timelineOffsetXRef = useRef(timelineOffsetX);
  timelineOffsetXRef.current = timelineOffsetX;

  const undoManagerRef = useRef(undoManager);
  undoManagerRef.current = undoManager;

  const applyScale = (newScale: ITimelineScaleState) => {
    const { fps, scale, timeline, playerRef } = useStore.getState();
    const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
    const currentTimeMs = (currentFrame / fps) * 1000;
    const playheadPxOld = timeMsToUnits(currentTimeMs, scale.zoom);

    const currentScrollLeft = timeline && (timeline as any).spacing
      ? -(timeline as any).viewportTransform[4] + (timeline as any).spacing.left
      : 0;

    const playheadScreenX = playheadPxOld - currentScrollLeft;
    const playheadPxNew = timeMsToUnits(currentTimeMs, newScale.zoom);
    const newScrollLeft = Math.max(0, playheadPxNew - playheadScreenX);

    // Presence overlays are plain Fabric objects with no trackItemsMap/
    // transitionsMap entry — the scale-change relayout chokes on them.
    // Pull them off the canvas before dispatching, put them back once
    // the new zoom has settled.
    (timeline as any)?._presenceOverlays?.clear();

    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: { scale: newScale }
    });

    Promise.resolve().then(() => {
      timeline?.scrollTo({ scrollLeft: newScrollLeft });
      (timeline as any)?._presenceOverlays?.redraw();
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return;

      const mod = e.ctrlKey || e.metaKey;
      const { activeIds, playerRef } = useStore.getState();

      // open / close keyboard shortcuts dialog
      if (mod && e.code === "Slash") {
        e.preventDefault();
        const { isShortcutsModalOpen, setShortcutsModalOpen } = useStore.getState();
        setShortcutsModalOpen(!isShortcutsModalOpen);
      }

      // play / pause
      if (e.code === "Space") {
        e.preventDefault()
        playerRef?.current?.isPlaying() ? playerRef?.current.pause() : playerRef?.current.play()
      }

      // undo / redo
      if (mod && e.code === "KeyZ") {
        e.preventDefault();
        if (!undoManagerRef.current) return;
        e.shiftKey ? undoManagerRef.current.redo() : undoManagerRef.current.undo();
      }

      // delete
      if (e.code === "Delete") {
        if (!activeIds.length) return;
        dispatch(LAYER_DELETE);
      }

      // split
      if (mod && e.code === "KeyB") {
        e.preventDefault();
        if (!activeIds.length) return;
        const time = getCurrentTime();

        if (activeIds.length === 1) {
          dispatch(ACTIVE_SPLIT, { payload: {}, options: { time } });
          dispatch(LAYER_SELECT, { payload: { trackItemIds: [] } });
        }

        // group splitting buggy asf

        // activeIds.forEach((id) => {
        //   dispatch(LAYER_SELECT, { payload: { trackItemIds: [id] } });
        //   dispatch(ACTIVE_SPLIT, { payload: {}, options: { time } });
        // });
        // dispatch(LAYER_SELECT, { payload: { trackItemIds: [] } });
      }

      // select all
      if (mod && e.code === "KeyA") {
        e.preventDefault();
        const { trackItemsMap, transitionsMap } = useStore.getState();
        const trackIds = Object.keys(trackItemsMap).filter(
          (id) => !trackItemsMap[id]?.details?.locked
        );
        const transitionIds = Object.keys(transitionsMap);
        const allIds = [...trackIds, ...transitionIds];
        if (!allIds.length) return;
        dispatch(LAYER_SELECT, { payload: { trackItemIds: allIds } });
      }

      // copy
      if (mod && e.code === "KeyC") {
        e.preventDefault();
        if (!activeIds.length) return;
        const { trackItemsMap, transitionsMap, tracks } = useStore.getState();
        const snapshot = buildSelectionSnapshot(activeIds, { trackItemsMap, transitionsMap, tracks });
        if (snapshot.items.length) setClipboard(snapshot);
      }

      // duplicate
      if (mod && e.code === "KeyD") {
        e.preventDefault();
        if (!activeIds.length) return;

        const { trackItemsMap, transitionsMap, tracks, trackItemIds, transitionIds, duration } = useStore.getState();
        const snapshot = buildSelectionSnapshot(activeIds, { trackItemsMap, transitionsMap, tracks });
        const result = cloneIntoNewTracks(snapshot, null, {
          trackItemsMap, trackItemIds, transitionsMap, transitionIds, tracks, duration,
        });
        if (!result) return;

        stateManager.updateState(
          {
            tracks: result.tracks,
            trackItemsMap: result.trackItemsMap,
            trackItemIds: result.trackItemIds,
            transitionsMap: result.transitionsMap,
            transitionIds: result.transitionIds,
            duration: result.duration,
          },
          { updateHistory: true, kind: "update" }
        );
      }

      // cut
      if (mod && e.code === "KeyX") {
        e.preventDefault();
        if (!activeIds.length) return;
        const { trackItemsMap, transitionsMap, tracks } = useStore.getState();
        const snapshot = buildSelectionSnapshot(activeIds, { trackItemsMap, transitionsMap, tracks });
        if (snapshot.items.length) setClipboard(snapshot);
        dispatch(LAYER_DELETE);
      }

      // paste
      if (mod && e.code === "KeyV") {
        e.preventDefault();
        const clip = getClipboard();
        if (!clip) return;

        const { trackItemsMap, transitionsMap, tracks, trackItemIds, transitionIds, duration } = useStore.getState();
        const time = getCurrentTime();
        const result = cloneIntoNewTracks(clip, time, {
          trackItemsMap, trackItemIds, transitionsMap, transitionIds, tracks, duration,
        }, "top");
        if (!result) return;

        stateManager.updateState(
          {
            tracks: result.tracks,
            trackItemsMap: result.trackItemsMap,
            trackItemIds: result.trackItemIds,
            transitionsMap: result.transitionsMap,
            transitionIds: result.transitionIds,
            duration: result.duration,
          },
          { updateHistory: true, kind: "update" }
        );
      }

      // zoom in
      if (mod && (e.code === "Equal" || e.code === "NumpadAdd")) {
        e.preventDefault();
        const { scale } = useStore.getState();
        applyScale(getNextZoomLevel(scale));
      }

      // zoom out
      if (mod && (e.code === "Minus" || e.code === "NumpadSubtract")) {
        e.preventDefault();
        const { scale } = useStore.getState();
        applyScale(getPreviousZoomLevel(scale));
      }

      // zoom to fit
      if (!mod && e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        const { scale, duration, activeIds, trackItemsMap } = useStore.getState();

        const selectionStart = activeIds.length > 0
          ? Math.min(...activeIds.map((id) => trackItemsMap[id]?.display.from ?? 0))
          : null;
        const selectionDuration = activeIds.length > 0
          ? Math.max(...activeIds.map((id) => trackItemsMap[id]?.display.to ?? 0)) -
          Math.min(...activeIds.map((id) => trackItemsMap[id]?.display.from ?? 0))
          : null;

        const targetDuration = selectionDuration ?? duration;
        const fitZoom = getFitZoomLevel(targetDuration, scale.zoom, timelineOffsetXRef.current);
        applyScale(fitZoom);

        Promise.resolve().then(() => {
          const { timeline } = useStore.getState();
          const scrollLeft = selectionStart !== null
            ? timeMsToUnits(selectionStart, fitZoom.zoom)
            : 0;
          timeline?.scrollTo({ scrollLeft: Math.max(0, scrollLeft) });
        });
      }

      // toggle timeline maximize / minimize
      if (e.code === "Backquote") {
        e.preventDefault();
        useStore.getState().toggleTimelineFullHeight();
      }

      // previous frame / previous second
      if (mod && e.code === "ArrowLeft") {
        e.preventDefault();
        const { playerRef, fps } = useStore.getState();
        const current = playerRef?.current?.getCurrentFrame() ?? 0;
        const step = e.shiftKey ? fps : 1;
        playerRef?.current?.seekTo(Math.max(0, current - step));
      }

      // next frame / next second
      if (mod && e.code === "ArrowRight") {
        e.preventDefault();
        const { playerRef, fps } = useStore.getState();
        const current = playerRef?.current?.getCurrentFrame() ?? 0;
        const step = e.shiftKey ? fps : 1;
        playerRef?.current?.seekTo(current + step);
      }

      // nudge selected item(s) position
      if (!mod && (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowUp" || e.code === "ArrowDown")) {
        e.preventDefault();
        const { activeIds, trackItemsMap } = useStore.getState();
        if (!activeIds.length) return;

        const step = e.shiftKey ? 5 : 1;
        let dx = 0;
        let dy = 0;
        if (e.code === "ArrowLeft") dx = -step;
        if (e.code === "ArrowRight") dx = step;
        if (e.code === "ArrowUp") dy = -step;
        if (e.code === "ArrowDown") dy = step;

        const payload: Record<string, any> = {};
        activeIds.forEach((id) => {
          const item = trackItemsMap[id];
          if (!item || item.details?.locked) return;

          const currentLeft = Number.parseFloat(item.details.left as string) || 0;
          const currentTop = Number.parseFloat(item.details.top as string) || 0;

          payload[id] = {
            details: {
              left: `${currentLeft + dx}px`,
              top: `${currentTop + dy}px`
            }
          };
        });

        if (Object.keys(payload).length) {
          dispatch(EDIT_OBJECT, { payload });
        }
      }

      // add / remove marker
      if (!mod && !e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        const { playerRef, fps, markers, addMarker, removeMarker } = useStore.getState();
        const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
        const timeMs = (currentFrame / fps) * 1000;
        const existing = markers.find(m => Math.abs(m.timeMs - timeMs) < (1000 / fps - 1));
        existing ? removeMarker(existing.id) : addMarker(timeMs);
      }

      // previous marker / jump to start
      if (mod && e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        const { playerRef, fps, markers } = useStore.getState();
        const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;

        const sortedMarkers = [...markers]
          .map((m) => ({ ...m, frame: Math.round((m.timeMs / 1000) * fps) }))
          .sort((a, b) => a.frame - b.frame);
        const prevMarker = [...sortedMarkers].reverse().find((m) => m.frame < currentFrame);

        const targetFrame = prevMarker ? prevMarker.frame : 0;
        playerRef?.current?.seekTo(targetFrame);
        scrollTimelineToFrame(targetFrame, prevMarker ? "marker" : "start", timelineOffsetXRef.current);
      }

      // next marker / jump to end
      if (!mod && e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        const { playerRef, fps, markers, duration } = useStore.getState();
        const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
        const lastFrame = Math.round((duration / 1000) * fps);

        const sortedMarkers = [...markers]
          .map((m) => ({ ...m, frame: Math.round((m.timeMs / 1000) * fps) }))
          .sort((a, b) => a.frame - b.frame);
        const nextMarker = sortedMarkers.find((m) => m.frame > currentFrame);

        const targetFrame = nextMarker ? nextMarker.frame : lastFrame;
        playerRef?.current?.seekTo(targetFrame);
        scrollTimelineToFrame(targetFrame, nextMarker ? "marker" : "end", timelineOffsetXRef.current);
      }

      // jump to start
      if (e.code === "Home") {
        e.preventDefault();
        const { playerRef } = useStore.getState();
        playerRef?.current?.seekTo(0);
        scrollTimelineToFrame(0, "start", timelineOffsetXRef.current);
      }

      // jump to end
      if (e.code === "End") {
        e.preventDefault();
        const { playerRef, fps, duration } = useStore.getState();
        const lastFrame = Math.round((duration / 1000) * fps);
        playerRef?.current?.seekTo(lastFrame);
        scrollTimelineToFrame(lastFrame, "end", timelineOffsetXRef.current);
      }

      // fullscreen
      if (!mod && !e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.querySelector<HTMLElement>("[data-scene-container]")
            ?.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }

      // mute preview
      if (mod && !e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        const { playerRef, muted, setMuted } = useStore.getState();
        const newMuted = !muted;
        playerRef?.current?.setVolume(newMuted ? 0 : 1);
        setMuted(newMuted);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}