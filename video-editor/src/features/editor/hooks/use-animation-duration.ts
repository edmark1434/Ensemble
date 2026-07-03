import { useCallback, useEffect, useMemo, useState } from "react";
import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";

export function formatearNumero(num: number): number {
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
}

export const useAnimationDuration = () => {
  const { activeIds, trackItemsMap } = useStore();
  const item = trackItemsMap[activeIds[0]];

  const [itemDuration, setItemDuration] = useState(0);
  const [inDuration, setInDuration] = useState(0);
  const [outDuration, setOutDuration] = useState(0);
  const [loopDuration, setLoopDuration] = useState(0);

  useEffect(() => {
    if (!item) return;

    const duration = item.display?.to - item.display?.from || 0;
    const inFrames = item.animations?.in?.composition[0]?.durationInFrames || 0;
    const outFrames =
      item.animations?.out?.composition[0]?.durationInFrames || 0;
    const loopFrames =
      item.animations?.loop?.composition[0]?.durationInFrames || 0;

    setItemDuration(duration);
    setInDuration((inFrames * 1000) / 30);
    setOutDuration((outFrames * 1000) / 30);
    setLoopDuration((loopFrames * 1000) / 30);
  }, [item]);

  const dispatchAnimationUpdate = useCallback(
    (type: "in" | "out" | "loop", duration: number) => {
      if (!item) return;

      dispatch(EDIT_OBJECT, {
        payload: {
          [activeIds[0]]: {
            animations: {
              [type]: {
                name: item.animations?.[type]?.name,
                composition: [
                  {
                    ...item.animations?.[type]?.composition?.[0],
                    durationInFrames: (duration * 30) / 1000
                  }
                ]
              }
            }
          }
        }
      });
    },
    [activeIds, item]
  );

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

  const handleLoopChange = useCallback(
    (duration: number) => {
      setLoopDuration(duration);
      dispatchAnimationUpdate("loop", duration);
    },
    [dispatchAnimationUpdate]
  );

  const maxValues = useMemo(
    () => ({
      in: itemDuration - outDuration - loopDuration,
      out: itemDuration - inDuration - loopDuration,
      loop: itemDuration - inDuration - outDuration
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
    handleOutChange,
    handleLoopChange
  };
};