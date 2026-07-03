import { useCallback, useEffect, useMemo, useState } from "react";
import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";

const FPS = 30;
const LOOP_DURATION_MS = 100; // ⚠️ comment says "pinned to 1s" — still unconfirmed, didn't touch
const msToFrames = (ms: number) => Math.round((ms * FPS) / 1000);
const framesToMs = (frames: number) => (frames * 1000) / FPS;

export function formatearNumero(num: number): number {
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
}

function shrinkProportionally(inFrames: number, outFrames: number, budgetFrames: number) {
  const total = inFrames + outFrames;
  if (total <= budgetFrames || total === 0) {
    return { inFrames, outFrames };
  }
  const newIn = Math.round((inFrames / total) * budgetFrames);
  const newOut = budgetFrames - newIn;
  return { inFrames: newIn, outFrames: newOut };
}

type AnimationType = "in" | "out" | "loop";

export const useAnimationDuration = () => {
  const { activeIds, trackItemsMap } = useStore();
  const item = trackItemsMap[activeIds[0]];

  const [itemDuration, setItemDuration] = useState(0);
  const [inDuration, setInDuration] = useState(0);
  const [outDuration, setOutDuration] = useState(0);
  const [loopDuration, setLoopDuration] = useState(0);

  // Persists one or more animation durations in a SINGLE dispatch, so the
  // store never passes through a half-corrected state (e.g. "in" updated
  // but "out" not yet) that the effect below could observe and react to.
  const dispatchAnimationUpdates = useCallback(
    (updates: Partial<Record<AnimationType, number>>) => {
      if (!item) return;

      const types = (Object.keys(updates) as AnimationType[]).filter(
        (type) => updates[type] !== undefined
      );
      if (types.length === 0) return;

      const animations: Record<string, any> = {};
      for (const type of types) {
        animations[type] = {
          name: item.animations?.[type]?.name,
          composition: [
            {
              ...item.animations?.[type]?.composition?.[0],
              durationInFrames: msToFrames(updates[type] as number)
            }
          ]
        };
      }

      dispatch(EDIT_OBJECT, {
        payload: {
          [activeIds[0]]: { animations }
        }
      });
    },
    [activeIds, item]
  );

  // Kept for single-slider user edits (handleInChange/handleOutChange) —
  // just a thin wrapper over the batched version.
  const dispatchAnimationUpdate = useCallback(
    (type: AnimationType, durationMs: number) => {
      dispatchAnimationUpdates({ [type]: durationMs });
    },
    [dispatchAnimationUpdates]
  );

  useEffect(() => {
    if (!item) {
      setItemDuration(0);
      setInDuration(0);
      setOutDuration(0);
      setLoopDuration(0);
      return;
    }

    const durationMs = Math.max(0, (item.display?.to ?? 0) - (item.display?.from ?? 0));
    const durationFrames = msToFrames(durationMs);

    const hasLoop = !!item.animations?.loop;
    const rawLoopFrames = item.animations?.loop?.composition[0]?.durationInFrames || 0;
    const clampedLoopFrames = hasLoop
      ? Math.min(msToFrames(LOOP_DURATION_MS), durationFrames)
      : 0;

    const budgetFrames = Math.max(0, durationFrames - clampedLoopFrames);

    const rawInFrames = item.animations?.in?.composition[0]?.durationInFrames || 0;
    const rawOutFrames = item.animations?.out?.composition[0]?.durationInFrames || 0;

    const { inFrames: clampedInFrames, outFrames: clampedOutFrames } = shrinkProportionally(
      rawInFrames,
      rawOutFrames,
      budgetFrames
    );

    setItemDuration(durationMs);
    setInDuration(framesToMs(clampedInFrames));
    setOutDuration(framesToMs(clampedOutFrames));
    setLoopDuration(framesToMs(clampedLoopFrames));

    const needsCorrection =
      (clampedInFrames !== rawInFrames && !!item.animations?.in) ||
      (clampedOutFrames !== rawOutFrames && !!item.animations?.out) ||
      (clampedLoopFrames !== rawLoopFrames && hasLoop);

    if (!needsCorrection) return;

    const timeout = setTimeout(() => {
      const updates: Partial<Record<AnimationType, number>> = {};
      if (clampedInFrames !== rawInFrames && item.animations?.in) {
        updates.in = framesToMs(clampedInFrames);
      }
      if (clampedOutFrames !== rawOutFrames && item.animations?.out) {
        updates.out = framesToMs(clampedOutFrames);
      }
      if (clampedLoopFrames !== rawLoopFrames && hasLoop) {
        updates.loop = framesToMs(clampedLoopFrames);
      }
      // one atomic write — in/out/loop land together, no window where the
      // effect can observe an inconsistent mix and "correct" again
      dispatchAnimationUpdates(updates);
    }, 250);

    return () => clearTimeout(timeout);
  }, [item, dispatchAnimationUpdates]);

  const handleInChange = useCallback(
    (duration: number) => {
      setInDuration(duration);
      dispatchAnimationUpdate("in", duration);
    },
    [dispatchAnimationUpdate]
  );

  const handleOutChange = useCallback(
    (duration: number) => {
      setOutDuration(duration);
      dispatchAnimationUpdate("out", duration);
    },
    [dispatchAnimationUpdate]
  );

  const maxValues = useMemo(
    () => ({
      in: Math.max(0, itemDuration - outDuration - loopDuration),
      out: Math.max(0, itemDuration - inDuration - loopDuration)
    }),
    [itemDuration, inDuration, outDuration, loopDuration]
  );

  return {
    item,
    inDuration,
    outDuration,
    loopDuration,
    maxValues,
    handleInChange,
    handleOutChange
  };
};