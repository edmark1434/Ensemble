import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import StateManager, {
  ACTIVE_SPLIT,
  LAYER_DELETE,
  LAYER_SELECT,
  HISTORY_UNDO,
  HISTORY_REDO, ACTIVE_PASTE, LAYER_CLONE, LAYER_COPY,
} from "@designcombo/state";
import { getCurrentTime } from "../utils/time";
import useStore from "../store/use-store";

export function useKeyboardShortcuts(stateManager: StateManager) {
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

          stateManager.updateState(
            { trackItemsMap: updatedMap },
            { updateHistory: true, kind: "update" }
          );
        };
        doPaste().then(r => {});
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}