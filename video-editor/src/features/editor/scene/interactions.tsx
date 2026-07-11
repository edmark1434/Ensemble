import { useEffect, useMemo, useRef, useState } from "react";
import { Selection, Moveable } from "@interactify/toolkit";
import { getIdFromClassName } from "../utils/scene";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import {
  SelectionInfo,
  emptySelection,
  getSelectionByIds,
  getTargetById
} from "../utils/target";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import { getCurrentTime } from "../utils/time";
import { getMinTextDimensions } from "../utils/text";
import {getMoveableTransform} from "@/features/editor/player/styles";

let holdGroupPosition: Record<string, any> | null = null;
let dragStartEnd = false;

interface SceneInteractionsProps {
  stateManager: StateManager;
  containerRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  size: { width: number; height: number };
}

const snapDirections = {
  top: true,
  left: true,
  bottom: true,
  right: true,
  center: true,
  middle: true
};

function scaleDiv(
  selector: string,
  scale: number,
  currentWidth: number,
  currentHeight: number
) {
  const div = document.querySelector(selector) as HTMLDivElement | null;
  if (div) {
    const fontSize = parseFloat(getComputedStyle(div).fontSize);
    div.style.fontSize = `${fontSize * scale}px`;
    div.style.width = `${currentWidth * scale}px`;
    div.style.height = `${currentHeight * scale}px`;
  }
}

export function SceneInteractions({
  stateManager,
  containerRef,
  zoom
}: SceneInteractionsProps) {
  const [targets, setTargets] = useState<HTMLDivElement[]>([]);
  const [selection, setSelection] = useState<Selection>();
  const {
    activeIds,
    setState,
    trackItemsMap,
    playerRef,
    setSceneMoveableRef,
    trackItemIds
  } = useStore();
  const moveableRef = useRef<Moveable>(null);
  const [selectionInfo, setSelectionInfo] =
    useState<SelectionInfo>(emptySelection);

  const elementGuidelines = useMemo(
    () =>
      ["artboard", ...trackItemIds.filter((id) => !activeIds.includes(id))].map(
        (id) =>
          `#${
            typeof window !== "undefined" && window.CSS
              ? window.CSS.escape(id)
              : id
          }`
      ),
    [trackItemIds, activeIds]
  );

  useEffect(() => {
    const updateTargets = (time?: number) => {
      const { trackItemsMap, playerRef, fps, activeIds } = useStore.getState();
      const currentTime = time ?? (playerRef?.current
          ? (playerRef.current.getCurrentFrame() / fps) * 1000
          : 0);
      const targetIds = activeIds.filter((id) => {
        return (
            trackItemsMap[id]?.display.from <= currentTime &&
            trackItemsMap[id]?.display.to >= currentTime
        );
      });
      const targets = targetIds.map(
          (id) => getTargetById(id) as HTMLDivElement
      );
      selection?.setSelectedTargets(targets);
      const selInfo = getSelectionByIds(targetIds);
      const isLocked = targetIds.length === 1 &&
          useStore.getState().trackItemsMap[targetIds[0]]?.details?.locked;
      if (isLocked) {
        selInfo.ables = {
          ...selInfo.ables,
          draggable: false,
          resizable: false,
          scalable: false,
          rotatable: false
        };
      }
      setSelectionInfo(selInfo);
      setTargets(selInfo.targets as HTMLDivElement[]);
    };
    const timer = setTimeout(() => {
      updateTargets();
    });

    const onSeeked = (v: any) => {
      setTimeout(() => {
        const { fps } = useStore.getState();
        const seekedTime = (v.detail.frame / fps) * 1000;
        updateTargets(seekedTime);
      });
    };
    playerRef?.current?.addEventListener("seeked", onSeeked);

    return () => {
      playerRef?.current?.removeEventListener("seeked", onSeeked);
      clearTimeout(timer);
    };
  }, [activeIds, playerRef, trackItemsMap]);

  const trackItemsMapRef = useRef(trackItemsMap);
  useEffect(() => {
    trackItemsMapRef.current = trackItemsMap;
  }, [trackItemsMap]);

  const isDraggingRef = useRef(false);
  useEffect(() => {
    const selection = new Selection({
      container: containerRef.current,
      boundContainer: true,
      hitRate: 0,
      selectableTargets: [".designcombo-scene-item"],
      selectFromInside: false,
      selectByClick: true,
      toggleContinueSelect: "shift"
    })
      .on("select", (e) => {
        const isClick = !isDraggingRef.current;

        const filteredSelected = e.selected.filter((el) => {
          if (el.className.includes("designcombo-scene-item-type-audio")) return false;
          const id = getIdFromClassName(el.className);
          if (isClick) return true;
          return !trackItemsMapRef.current[id]?.details?.locked;
        }) as HTMLDivElement[];

        let finalSelected = filteredSelected;

        if (isClick && filteredSelected.length > 1) {
          const prevIds = new Set(targets.map(t => getIdFromClassName(t.className)));
          const newlyAdded = filteredSelected.find(el => !prevIds.has(getIdFromClassName(el.className)));

          if (newlyAdded) {
            const newlyAddedId = getIdFromClassName(newlyAdded.className);
            const newlyAddedLocked = trackItemsMapRef.current[newlyAddedId]?.details?.locked;

            if (newlyAddedLocked) {
              finalSelected = [newlyAdded];
            } else {
              finalSelected = filteredSelected.filter(el => {
                const id = getIdFromClassName(el.className);
                return !trackItemsMapRef.current[id]?.details?.locked;
              });
            }
          }
        }

        const ids = finalSelected.map((el) => getIdFromClassName(el.className));
        setTargets(finalSelected as HTMLDivElement[]);
        stateManager.updateState(
          { activeIds: ids },
          { updateHistory: false, kind: "layer:selection" }
        );
      })
      .on("dragStart", (e) => {
        isDraggingRef.current = false;
        const target = e.inputEvent.target as HTMLDivElement;
        dragStartEnd = false;

        if (targets.includes(target)) {
          e.stop();
        }
        if (
          target &&
          moveableRef?.current?.moveable.isMoveableElement(target)
        ) {
          e.stop();
        }
      })
      .on("drag", () => {
        isDraggingRef.current = true;
      })
      .on("dragEnd", () => {
        isDraggingRef.current = true;
        dragStartEnd = true;
      })
      .on("selectEnd", (e) => {
        const moveable = moveableRef.current;
        if (e.isDragStart) {
          e.inputEvent.preventDefault();
          setTimeout(() => {
            if (!dragStartEnd) {
              moveable?.moveable.dragStart(e.inputEvent);
            }
          });
        } else {
          // filter out audio + locked items from selection
          const filteredSelected = e.selected.filter((el) => {
            if (el.className.includes("designcombo-scene-item-type-audio")) return false;
            const id = getIdFromClassName(el.className);
            return !trackItemsMapRef.current[id]?.details?.locked;
          }) as HTMLDivElement[];

          const ids = filteredSelected.map((el) =>
            getIdFromClassName(el.className)
          );

          stateManager.updateState(
            {
              activeIds: ids
            },
            {
              updateHistory: false,
              kind: "layer:selection"
            }
          );

          setTargets(filteredSelected);
        }
      });
    setSelection(selection);
    return () => {
      selection.destroy();
    };
  }, []);

  useEffect(() => {
    const activeSelectionSubscription = stateManager.subscribeToActiveIds(
      (newState) => {
        setState(newState);
      }
    );

    return () => {
      activeSelectionSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    moveableRef.current?.moveable.updateRect();
  }, [trackItemsMap]);

  useEffect(() => {
    const { activeIds, trackItemsMap } = useStore.getState();
    if (activeIds.length !== 1) return;

    const isLocked = trackItemsMap[activeIds[0]]?.details?.locked;
    setSelectionInfo(prev => ({
      ...prev,
      ables: {
        ...prev.ables,
        draggable: !isLocked,
        resizable: !isLocked,
        scalable: !isLocked,
        rotatable: !isLocked
      }
    }));
  }, [trackItemsMap]);

  useEffect(() => {
    setSceneMoveableRef(moveableRef as React.RefObject<Moveable>);
  }, [moveableRef]);

  const rotateStartRef = useRef(0);
  const scaleStartRef = useRef<[number, number]>([1, 1]);

  return (
    <Moveable
      ref={moveableRef}
      rotationPosition={"bottom"}
      renderDirections={selectionInfo.controls}
      {...selectionInfo.ables}
      origin={false}
      target={targets}
      zoom={1 / zoom}
      className="designcombo-scene-moveable"
      snappable
      elementGuidelines={elementGuidelines}
      elementSnapDirections={snapDirections}
      snapDirections={snapDirections}
      snapThreshold={30}
      snapGap={true}
      isDisplaySnapDigit={false}
      isDisplayInnerSnapDigit={false}

      onDrag={({ target, top, left }) => {
        target.style.top = `${top}px`;
        target.style.left = `${left}px`;
      }}
      onDragEnd={({ target, isDrag }) => {
        if (!isDrag) return;
        const targetId = getIdFromClassName(target.className) as string;
        if (trackItemsMap[targetId]?.details?.locked) return;

        dispatch(EDIT_OBJECT, {
          payload: {
            [targetId]: {
              details: {
                left: target.style.left,
                top: target.style.top
              }
            }
          }
        });
      }}
      onScaleStart={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        const match = (trackItemsMap[targetId]?.details?.transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
        scaleStartRef.current = match ? [parseFloat(match[1]), parseFloat(match[2])] : [1, 1];
      }}
      onScale={({ target, scale, direction }) => {
        const targetId = getIdFromClassName(target.className) as string;
        const details = trackItemsMap[targetId]?.details;
        if (!details) return;

        const [xControl, yControl] = direction;
        const moveX = xControl === -1;
        const moveY = yControl === -1;

        const factor = scale[0]; // uniform magnitude ratio, corner handle only
        const newScaleX = scaleStartRef.current[0] * factor;
        const newScaleY = scaleStartRef.current[1] * factor;

        const oldMatch = (details.transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
        const oldScaleX = oldMatch ? parseFloat(oldMatch[1]) : 1;
        const oldScaleY = oldMatch ? parseFloat(oldMatch[2]) : 1;

        // magnitude only — sign is mirror state, not size
        const currentWidth = target.clientWidth * Math.abs(oldScaleX);
        const currentHeight = target.clientHeight * Math.abs(oldScaleY);
        const newWidth = target.clientWidth * Math.abs(newScaleX);
        const newHeight = target.clientHeight * Math.abs(newScaleY);

        target.style.transform = getMoveableTransform(details, { scaleX: newScaleX, scaleY: newScaleY });
        target.dataset.liveScaleX = String(newScaleX);
        target.dataset.liveScaleY = String(newScaleY);

        const diffX = currentWidth - newWidth;
        let newLeft = parseFloat(target.style.left) - diffX / 2;
        const diffY = currentHeight - newHeight;
        let newTop = parseFloat(target.style.top) - diffY / 2;
        if (moveX) newLeft += diffX;
        if (moveY) newTop += diffY;
        target.style.left = `${newLeft}px`;
        target.style.top = `${newTop}px`;
      }}
      onScaleEnd={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        if (trackItemsMap[targetId]?.details?.locked) return;
        const finalScaleX = target.dataset.liveScaleX;
        const finalScaleY = target.dataset.liveScaleY;
        if (finalScaleX === undefined || finalScaleY === undefined) return;

        dispatch(EDIT_OBJECT, {
          payload: {
            [targetId]: {
              details: {
                transform: `scale(${finalScaleX}, ${finalScaleY})`,
                left: parseFloat(target.style.left),
                top: parseFloat(target.style.top)
              }
            }
          }
        });
        delete target.dataset.liveScaleX;
        delete target.dataset.liveScaleY;
      }}
      onRotateStart={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        rotateStartRef.current = parseFloat(trackItemsMap[targetId]?.details?.rotate as unknown as string) || 0;
      }}
      onRotate={({ target, dist }) => {
        const targetId = getIdFromClassName(target.className) as string;
        const details = trackItemsMap[targetId]?.details;
        if (!details) return;

        const newRotate = rotateStartRef.current + dist;
        target.style.transform = getMoveableTransform(details, { rotate: newRotate });
        target.dataset.liveRotate = String(newRotate);
      }}
      onRotateEnd={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        if (trackItemsMap[targetId]?.details?.locked) return;
        const finalRotate = target.dataset.liveRotate;
        if (finalRotate === undefined) return;

        dispatch(EDIT_OBJECT, {
          payload: { [targetId]: { details: { rotate: `${finalRotate}deg` } } }
        });
        delete target.dataset.liveRotate;
      }}
      onResize={({
        target,
        width: nextWidth,
        height: nextHeight,
        direction
      }) => {
        const id = getIdFromClassName(target.className);
        if (direction[1] === 1 || direction[1] === -1) {
          if (trackItemsMap[id].type === "progressSquare") {
            const diffWidth = nextHeight - parseFloat(target.style.height);
            const updateData: any = {
              width: nextWidth,
              height: nextHeight,
              left: parseFloat(target.style.left)
            };
            if (direction[1] === -1) {
              const newTop = `${parseFloat(target.style.top) - diffWidth}px`;
              target.style.top = newTop;
              updateData.top = newTop;
            }
            target.style.width = `${nextWidth}px`;
            target.style.height = `${nextHeight}px`;
            setState({
              trackItemsMap: {
                ...trackItemsMap,
                [id]: {
                  ...trackItemsMap[id],
                  details: {
                    ...trackItemsMap[id].details,
                    ...updateData
                  }
                }
              }
            });
            return;
          }

          const isPureVerticalDirection =
            (direction[1] === 1 || direction[1] === -1) && direction[0] === 0;

          if (
            isPureVerticalDirection &&
            (trackItemsMap[id].type === "text" || trackItemsMap[id].type === "caption")
          ) {
            const details = trackItemsMap[id].details;
            const { minHeight } = getMinTextDimensions(details, details.text, nextWidth);

            // only clamp upward, user can freely resize if above minimum
            const finalHeight = Math.max(nextHeight, minHeight);

            target.style.width = `${nextWidth}px`;
            target.style.height = `${finalHeight}px`;

            const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
            if (animationDiv) {
              animationDiv.style.width = `${nextWidth}px`;
              animationDiv.style.height = `${finalHeight}px`;
            }

            const selector = trackItemsMap[id].type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;
            const textDiv = document.querySelector(selector) as HTMLDivElement | null;
            if (textDiv) {
              textDiv.style.width = `${nextWidth}px`;
              textDiv.style.height = `${finalHeight}px`;
            }

            setState({
              trackItemsMap: {
                ...trackItemsMap,
                [id]: {
                  ...trackItemsMap[id],
                  details: {
                    ...trackItemsMap[id].details,
                    width: nextWidth,
                    height: finalHeight
                  }
                }
              }
            });
            return;
          }

          // default proportional scaling for corner handles and non-text types
          const currentWidth = target.clientWidth;
          const currentHeight = target.clientHeight;
          const scaleY = nextHeight / currentHeight;
          const scale = scaleY;

          target.style.width = `${currentWidth * scale}px`;
          target.style.height = `${currentHeight * scale}px`;

          const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
          if (animationDiv) {
            animationDiv.style.width = `${currentWidth * scale}px`;
            animationDiv.style.height = `${currentHeight * scale}px`;

            if (trackItemsMap[id].type === "text") {
              scaleDiv(`[data-text-id="${id}"]`, scale, currentWidth, currentHeight);
            } else if (trackItemsMap[id].type === "caption") {
              scaleDiv(`#caption-${id}`, scale, currentWidth, currentHeight);
            }
          }
        } else {
          const id = getIdFromClassName(target.className);
          if (
            trackItemsMap[id].type === "text" ||
            trackItemsMap[id].type === "caption"
          ) {
            const details = trackItemsMap[id].details;
            const { minWidth, minHeight } = getMinTextDimensions(details, details.text, nextWidth);

            const clampedWidth = Math.max(nextWidth, minWidth);
            const currentHeight = target.clientHeight;
            const finalHeight = Math.max(currentHeight, minHeight);

            target.style.width = `${clampedWidth}px`;
            target.style.minWidth = `${minWidth}px`;
            target.style.height = `${finalHeight}px`;

            const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
            if (animationDiv) {
              animationDiv.style.width = `${clampedWidth}px`;
              animationDiv.style.height = `${finalHeight}px`;

              const selector = trackItemsMap[id].type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;
              const textDiv = document.querySelector(selector) as HTMLDivElement | null;
              if (textDiv) {
                textDiv.style.width = `${clampedWidth}px`;
                textDiv.style.height = `${finalHeight}px`;
              }
            }

            setState({
              trackItemsMap: {
                ...trackItemsMap,
                [id]: {
                  ...trackItemsMap[id],
                  details: {
                    ...trackItemsMap[id].details,
                    width: clampedWidth,
                    height: finalHeight
                  }
                }
              }
            });
          }

          if (trackItemsMap[id].type === "progressSquare") {
            const currentWidth = parseFloat(target.style.width);
            target.style.width = `${nextWidth}px`;
            target.style.height = `${nextHeight}px`;
            const updateData: any = {
              width: nextWidth,
              height: nextHeight,
              left: parseFloat(target.style.left)
            };
            if (direction[0] === -1) {
              const diffWidth = nextWidth - currentWidth;
              target.style.left = `${parseFloat(target.style.left) - diffWidth}px`;
              updateData.left = `${parseFloat(target.style.left) - diffWidth}px`;
            }
            setState({
              trackItemsMap: {
                ...trackItemsMap,
                [id]: {
                  ...trackItemsMap[id],
                  details: {
                    ...trackItemsMap[id].details,
                    width: nextWidth,
                    height: nextHeight
                  }
                }
              }
            });
          }
        }
      }}
      onResizeEnd={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        if (trackItemsMap[targetId]?.details?.locked) return;

        const type = trackItemsMap[targetId].type;

        if (type === "text" || type === "caption") {
          const selector = type === "text"
            ? `[data-text-id="${targetId}"]`
            : `#caption-${targetId}`;
          const textDiv = document.querySelector(selector) as HTMLDivElement;
          if (textDiv) {
            dispatch(EDIT_OBJECT, {
              payload: {
                [targetId]: {
                  details: {
                    ...trackItemsMap[targetId].details,
                    width: parseFloat(target.style.width),
                    height: parseFloat(target.style.height),
                    fontSize: parseFloat(textDiv.style.fontSize)
                  }
                }
              }
            });
          }
        } else {
          dispatch(EDIT_OBJECT, {
            payload: {
              [targetId]: {
                details: {
                  ...trackItemsMap[targetId].details,
                  width: parseFloat(target.style.width),
                  height: parseFloat(target.style.height),
                }
              }
            }
          });
        }
      }}
      onDragGroup={({ events }) => {
        holdGroupPosition = {};
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const id = getIdFromClassName(event.target.className);
          const trackItem = trackItemsMap[id];
          const left =
            Number.parseFloat(trackItem?.details.left as string) +
            event.beforeTranslate[0];
          const top =
            Number.parseFloat(trackItem?.details.top as string) +
            event.beforeTranslate[1];
          event.target.style.left = `${left}px`;
          event.target.style.top = `${top}px`;
          holdGroupPosition[id] = {
            left: left,
            top: top
          };
        }
      }}
      onDragGroupEnd={() => {
        if (holdGroupPosition) {
          const payload: Record<string, Partial<any>> = {};
          for (const id of Object.keys(holdGroupPosition)) {
            if (trackItemsMap[id]?.details?.locked) continue;

            const left = holdGroupPosition[id].left;
            const top = holdGroupPosition[id].top;
            payload[id] = {
              details: {
                top: `${top}px`,
                left: `${left}px`
              }
            };
          }
          dispatch(EDIT_OBJECT, {
            payload: payload
          });
          holdGroupPosition = null;
        }
      }}
      onScaleGroup={({ events }) => {
        holdGroupPosition = {};
        for (const event of events) {
          const id = getIdFromClassName(event.target.className);
          const target = event.target as HTMLDivElement;
          target.style.transform = event.transform;
          target.style.left = `${parseFloat(target.style.left) + event.drag.beforeTranslate[0]}px`;
          target.style.top = `${parseFloat(target.style.top) + event.drag.beforeTranslate[1]}px`;
          holdGroupPosition[id] = {
            transform: target.style.transform,
            left: parseFloat(target.style.left),
            top: parseFloat(target.style.top),
          };
        }
      }}
      onScaleGroupEnd={() => {
        if (holdGroupPosition) {
          const payload: Record<string, any> = {};
          for (const id of Object.keys(holdGroupPosition)) {
            if (trackItemsMap[id]?.details?.locked) continue;
            payload[id] = {
              details: {
                transform: holdGroupPosition[id].transform,
                left: holdGroupPosition[id].left,
                top: holdGroupPosition[id].top,
              }
            };
          }
          dispatch(EDIT_OBJECT, { payload });
          holdGroupPosition = null;
        }
      }}
      onRotateGroup={({ events }) => {
        for (const event of events) {
          const target = event.target as HTMLDivElement;
          target.style.transform = event.transform;
          target.style.left = `${parseFloat(target.style.left) + event.drag.beforeDist[0]}px`;
          target.style.top = `${parseFloat(target.style.top) + event.drag.beforeDist[1]}px`;
        }
      }}
      onRotateGroupEnd={() => {
        const payload: Record<string, any> = {};
        for (const target of targets) {
          const id = getIdFromClassName(target.className);
          if (trackItemsMap[id]?.details?.locked) continue;
          payload[id] = {
            details: {
              transform: (target as HTMLDivElement).style.transform,
              left: parseFloat((target as HTMLDivElement).style.left),
              top: parseFloat((target as HTMLDivElement).style.top),
            }
          };
        }
        dispatch(EDIT_OBJECT, { payload });
      }}
    />
  );
}
