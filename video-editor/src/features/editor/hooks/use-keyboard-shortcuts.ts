import {useEffect, useRef} from "react";
import { dispatch } from "@designcombo/events";
import StateManager, {
  ACTIVE_SPLIT,
  LAYER_DELETE,
  LAYER_SELECT,
  HISTORY_UNDO,
  HISTORY_REDO, ACTIVE_PASTE, LAYER_CLONE, LAYER_COPY, TIMELINE_SCALE_CHANGED, EDIT_OBJECT,
} from "@designcombo/state";
import { getCurrentTime } from "../utils/time";
import useStore from "../store/use-store";
import {timeMsToUnits} from "@designcombo/timeline";
import {ITimelineScaleState} from "@designcombo/types";
import {getFitZoomLevel, getNextZoomLevel, getPreviousZoomLevel} from "@/features/editor/utils/timeline";
import {useTimelineOffsetX} from "@/features/editor/hooks/use-timeline-offset";

export function useKeyboardShortcuts(stateManager: StateManager) {
  const timelineOffsetX = useTimelineOffsetX();
  const timelineOffsetXRef = useRef(timelineOffsetX);
  timelineOffsetXRef.current = timelineOffsetX;

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

    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: { scale: newScale }
    });

    Promise.resolve().then(() => {
      timeline?.scrollTo({ scrollLeft: newScrollLeft });
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
        e.shiftKey ? dispatch(HISTORY_REDO) : dispatch(HISTORY_UNDO);
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
        activeIds.forEach((id) => {
          dispatch(LAYER_SELECT, { payload: { trackItemIds: [id] } });
          dispatch(ACTIVE_SPLIT, { payload: {}, options: { time } });
        });
        dispatch(LAYER_SELECT, { payload: { trackItemIds: activeIds } });
      }

      // select all
      if (mod && e.code === "KeyA") {
        e.preventDefault();
        const { trackItemsMap } = useStore.getState();
        const allIds = Object.keys(trackItemsMap).filter(
          (id) => !trackItemsMap[id]?.details?.locked
        );
        if (!allIds.length) return;
        dispatch(LAYER_SELECT, { payload: { trackItemIds: allIds } });
      }

      // copy
      if (mod && e.code === "KeyC") {
        e.preventDefault();
        if (!activeIds.length) return;
        dispatch(LAYER_COPY);
      }

      // duplicate
      if (mod && e.code === "KeyD") {
        e.preventDefault();
        if (!activeIds.length) return;

        const doDuplicate = async () => {
          const before = useStore.getState().trackItemIds;
          dispatch(LAYER_CLONE);
          await Promise.resolve();

          const after = useStore.getState();
          const newIds = after.trackItemIds.filter(id => !before.includes(id));
          if (!newIds.length) return;

          const updatedMap = { ...after.trackItemsMap };
          newIds.forEach(id => {
            const item = updatedMap[id];
            if (!item) return;
            updatedMap[id] = {
              ...item,
              details: {
                ...item.details,
                locked: false,
              },
            };
          });

          stateManager.updateState(
            { trackItemsMap: updatedMap },
            { updateHistory: true, kind: "update" }
          );
        };
        doDuplicate().then(r => {});
      }

      // cut
      if (mod && e.code === "KeyX") {
        e.preventDefault();
        if (!activeIds.length) return;
        dispatch(LAYER_COPY);
        dispatch(LAYER_DELETE);
      }

      // paste
      if (mod && e.code === "KeyV") {
        e.preventDefault();
        const doPaste = async () => {
          const before = useStore.getState().trackItemIds;
          dispatch(ACTIVE_PASTE);
          await Promise.resolve();

          const after = useStore.getState();
          const newIds = after.trackItemIds.filter(id => !before.includes(id));
          if (!newIds.length) return;

          const { fps: currentFps } = useStore.getState();
          const currentFrame = useStore.getState().playerRef?.current?.getCurrentFrame() ?? 0;
          const currentTime = (currentFrame / currentFps) * 1000;
          const minFrom = Math.min(
            ...newIds.map(id => after.trackItemsMap[id]?.display.from ?? 0)
          );
          const offset = currentTime - minFrom;

          const updatedMap = { ...after.trackItemsMap };
          newIds.forEach(id => {
            const item = updatedMap[id];
            if (!item) return;
            updatedMap[id] = {
              ...item,
              display: {
                from: item.display.from + offset,
                to: item.display.to + offset,
              },
              details: {
                ...item.details,
                locked: false,
              },
            };
          });

          const newDuration = Object.values(updatedMap).reduce(
            (max, item) => Math.max(max, item.display?.to ?? 0),
            after.duration
          );

          stateManager.updateState(
            { trackItemsMap: updatedMap, duration: newDuration },
            { updateHistory: true, kind: "update" }
          );
        };
        doPaste().then(r => {});
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

        playerRef?.current?.seekTo(prevMarker ? prevMarker.frame : 0);
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

        playerRef?.current?.seekTo(nextMarker ? nextMarker.frame : lastFrame);
      }

      // jump to start
      if (e.code === "Home") {
        e.preventDefault();
        const { playerRef } = useStore.getState();
        playerRef?.current?.seekTo(0);
      }

      // jump to end
      if (e.code === "End") {
        e.preventDefault();
        const { playerRef, fps, duration } = useStore.getState();
        const lastFrame = Math.round((duration / 1000) * fps);
        playerRef?.current?.seekTo(lastFrame);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}