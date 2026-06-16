import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import {
  ACTIVE_SPLIT,
  LAYER_DELETE,
  LAYER_SELECT,
  HISTORY_UNDO,
  HISTORY_REDO,
} from "@designcombo/state";
import { getCurrentTime } from "../utils/time";
import useStore from "../store/use-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
      if (e.code === "Delete" || e.code === "Backspace") {
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
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}