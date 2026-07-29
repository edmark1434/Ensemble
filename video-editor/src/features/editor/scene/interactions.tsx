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
import {getMinCaptionDimensions} from "@/features/editor/utils/captions";
import {foldSkewYIntoScale} from "@/features/editor/utils/matrix-fold";

let holdGroupPosition: Record<string, any> | null = null;
let groupTextScaleStart: Record<string, { width: number; height: number; fontSize: number; relLeft: number; relTop: number }> | null = null;
let groupScaleAnchor: { x: number; y: number } | null = null;
let groupRotateStart: Record<string, {
  rotate: number; skewX: number; scaleX: number; scaleY: number;
  centerX: number; centerY: number; width: number; height: number;
}> | null = null;
let groupRotatePivot: { x: number; y: number } | null = null;
let dragStartEnd = false;

const toRad = (deg: number) => (deg * Math.PI) / 180;

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

        if (targetsRef.current.includes(target)) {
          e.stop();
        }
        if (
          targetsRef.current.length > 0 &&
          target &&
          moveableRef?.current?.moveable.isMoveableElement(target)
        ) {
          console.warn("[dragStart] blocked by stale moveable element", target);
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
  const startPosRef = useRef<[number, number]>([0, 0]);
  const rawScaleRef = useRef<[number, number]>([1, 1]);

  useEffect(() => {
    if (targets.length !== 1) return;
    const id = getIdFromClassName(targets[0].className);
    const transform = trackItemsMap[id]?.details?.transform || "";
    const match = transform.match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
    rawScaleRef.current = match ? [parseFloat(match[1]), parseFloat(match[2])] : [1, 1];
  }, [targets, trackItemsMap]);

  const targetsRef = useRef<HTMLDivElement[]>([]);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

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
        const currentItem = useStore.getState().trackItemsMap[targetId];
        if (!currentItem || currentItem.details?.locked) return;

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
        scaleStartRef.current = rawScaleRef.current;
        startPosRef.current = [parseFloat(target.style.left), parseFloat(target.style.top)];
      }}
      onScale={({ target, scale, direction }) => {
        const targetId = getIdFromClassName(target.className) as string;
        const details = trackItemsMap[targetId]?.details;
        if (!details) return;

        const [xControl, yControl] = direction;
        const moveX = xControl === -1;
        const moveY = yControl === -1;

        // `scale` from Moveable is already the ABSOLUTE ratio vs. the frozen,
        // untransformed box size — not a delta on top of the pre-gesture scale.
        // Don't multiply it by scaleStartRef, or every gesture after the first
        // squares the previous one.
        const magnitude = Math.abs(scale[0]); // uniform magnitude, corner handle only
        const signX = scaleStartRef.current[0] < 0 ? -1 : 1;
        const signY = scaleStartRef.current[1] < 0 ? -1 : 1;
        const newScaleX = signX * magnitude;
        const newScaleY = signY * magnitude;

        const oldScaleX = scaleStartRef.current[0];
        const oldScaleY = scaleStartRef.current[1];

        const currentWidth = target.clientWidth * Math.abs(oldScaleX);
        const currentHeight = target.clientHeight * Math.abs(oldScaleY);
        const newWidth = target.clientWidth * Math.abs(newScaleX);
        const newHeight = target.clientHeight * Math.abs(newScaleY);

        target.style.transform = getMoveableTransform(details, { scaleX: newScaleX, scaleY: newScaleY });
        target.dataset.liveScaleX = String(newScaleX);
        target.dataset.liveScaleY = String(newScaleY);

        const diffX = currentWidth - newWidth;
        let newLeft = startPosRef.current[0] - diffX / 2;
        const diffY = currentHeight - newHeight;
        let newTop = startPosRef.current[1] - diffY / 2;
        if (moveX) newLeft += diffX;
        if (moveY) newTop += diffY;
        target.style.left = `${newLeft}px`;
        target.style.top = `${newTop}px`;
      }}
      onScaleEnd={({ target }) => {
        const targetId = getIdFromClassName(target.className) as string;
        const currentItem = useStore.getState().trackItemsMap[targetId];
        if (!currentItem || currentItem.details?.locked) return;

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

        rawScaleRef.current = [parseFloat(finalScaleX), parseFloat(finalScaleY)];
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
        const currentItem = useStore.getState().trackItemsMap[targetId];
        if (!currentItem || currentItem.details?.locked) return;

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
        const currentItem = useStore.getState().trackItemsMap[id];
        if (!currentItem) return;

        if (direction[1] === 1 || direction[1] === -1) {
          if (currentItem.type === "progressSquare") {
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

          const item = trackItemsMap[id];

          if (isPureVerticalDirection && (item.type === "text" || item.type === "caption")) {
            const { minHeight } =
              item.type === "caption"
                ? getMinCaptionDimensions(item.details, item.details.words, nextWidth)
                : getMinTextDimensions(item.details, item.details.text, nextWidth);

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

              const textAnimatedDiv = target.querySelector(
                `[data-text-anim-id="${id}"]`
              ) as HTMLDivElement | null;
              if (textAnimatedDiv) {
                textAnimatedDiv.style.width = `${currentWidth * scale}px`;
                textAnimatedDiv.style.height = `${currentHeight * scale}px`;
              }
            } else if (trackItemsMap[id].type === "caption") {
              scaleDiv(`#caption-${id}`, scale, currentWidth, currentHeight);
            }
          }
        } else {
          const id = getIdFromClassName(target.className);
          const item = trackItemsMap[id];

          if (item.type === "text" || item.type === "caption") {
            const { minWidth, minHeight } =
              item.type === "caption"
                ? getMinCaptionDimensions(item.details, item.details.words, nextWidth)
                : getMinTextDimensions(item.details, item.details.text, nextWidth);

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

            if (type === "text") {
              textDiv.style.width = "100%";
              textDiv.style.height = "100%";
            }
            const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
            if (animationDiv) {
              animationDiv.style.height = "100%";
              animationDiv.style.width = type === "caption" ? "100%" : "";
            }
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
          const currentTrackItemsMap = useStore.getState().trackItemsMap;
          const payload: Record<string, Partial<any>> = {};
          for (const id of Object.keys(holdGroupPosition)) {
            const currentItem = currentTrackItemsMap[id];
            if (!currentItem || currentItem.details?.locked) continue;

            const left = holdGroupPosition[id].left;
            const top = holdGroupPosition[id].top;
            payload[id] = {
              details: {
                top: `${top}px`,
                left: `${left}px`
              }
            };
          }
          if (Object.keys(payload).length > 0) {
            dispatch(EDIT_OBJECT, { payload });
          }
          holdGroupPosition = null;
        }
      }}
      onScaleGroup={({ events }) => {
        const currentTrackItemsMap = useStore.getState().trackItemsMap;
        if (!holdGroupPosition) holdGroupPosition = {};
        if (!groupTextScaleStart) groupTextScaleStart = {};

        if (!groupScaleAnchor) {
          // one handle drives the whole group, so direction is shared across events
          const [xControl, yControl] = events[0]?.direction ?? [1, 1];
          const rect = moveableRef.current?.moveable.getRect();
          const groupLeft = rect?.left ?? 0;
          const groupTop = rect?.top ?? 0;
          const groupWidth = rect?.width ?? 0;
          const groupHeight = rect?.height ?? 0;

          // dragging the -1 side means the +1 side is the fixed anchor, and vice versa
          groupScaleAnchor = {
            x: xControl === 1 ? groupLeft : groupLeft + groupWidth,
            y: yControl === 1 ? groupTop : groupTop + groupHeight,
          };
        }

        for (const event of events) {
          const id = getIdFromClassName(event.target.className);
          const target = event.target as HTMLDivElement;
          const item = currentTrackItemsMap[id];

          if (item?.type === "text" || item?.type === "caption") {
            const selector = item.type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;

            if (!groupTextScaleStart[id]) {
              const innerDiv = document.querySelector(selector) as HTMLDivElement | null;
              groupTextScaleStart[id] = {
                width: target.clientWidth,
                height: target.clientHeight,
                fontSize: innerDiv ? parseFloat(getComputedStyle(innerDiv).fontSize) : 0,
                relLeft: parseFloat(item.details.left as string) - groupScaleAnchor.x,
                relTop: parseFloat(item.details.top as string) - groupScaleAnchor.y,
              };
            }

            const start = groupTextScaleStart[id];
            const magnitude = Math.abs(event.scale[0]);
            const newWidth = start.width * magnitude;
            const newHeight = start.height * magnitude;
            const newFontSize = start.fontSize * magnitude;

            // anchor is fixed for the whole gesture: position = anchor + scaled offset
            const newLeft = groupScaleAnchor.x + magnitude * start.relLeft;
            const newTop = groupScaleAnchor.y + magnitude * start.relTop;

            target.style.width = `${newWidth}px`;
            target.style.height = `${newHeight}px`;
            target.style.left = `${newLeft}px`;
            target.style.top = `${newTop}px`;

            const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
            if (animationDiv) {
              animationDiv.style.width = `${newWidth}px`;
              animationDiv.style.height = `${newHeight}px`;
            }

            const innerDiv = document.querySelector(selector) as HTMLDivElement | null;
            if (innerDiv) {
              innerDiv.style.width = `${newWidth}px`;
              innerDiv.style.height = `${newHeight}px`;
              innerDiv.style.fontSize = `${newFontSize}px`;
            }

            if (item.type === "text") {
              const textAnimatedDiv = target.querySelector(
                `[data-text-anim-id="${id}"]`
              ) as HTMLDivElement | null;
              if (textAnimatedDiv) {
                textAnimatedDiv.style.width = `${newWidth}px`;
                textAnimatedDiv.style.height = `${newHeight}px`;
              }
            }

            holdGroupPosition[id] = {
              isTextLike: true,
              width: newWidth,
              height: newHeight,
              fontSize: newFontSize,
              left: newLeft,
              top: newTop,
            };
          } else {
            // UNCHANGED
            target.style.transform = event.transform;
            target.style.left = `${parseFloat(target.style.left) + event.drag.beforeTranslate[0]}px`;
            target.style.top = `${parseFloat(target.style.top) + event.drag.beforeTranslate[1]}px`;
            holdGroupPosition[id] = {
              transform: target.style.transform,
              left: parseFloat(target.style.left),
              top: parseFloat(target.style.top),
            };
          }
        }
      }}
      onScaleGroupEnd={() => {
        if (holdGroupPosition) {
          const currentTrackItemsMap = useStore.getState().trackItemsMap;
          const payload: Record<string, any> = {};

          for (const id of Object.keys(holdGroupPosition)) {
            const currentItem = currentTrackItemsMap[id];
            if (!currentItem || currentItem.details?.locked) continue;

            const entry = holdGroupPosition[id];

            if (entry.isTextLike) {
              payload[id] = {
                details: {
                  width: entry.width,
                  height: entry.height,
                  fontSize: entry.fontSize,
                  left: entry.left,
                  top: entry.top,
                }
              };

              // Reset inline px overrides so re-render (driven by committed state)
              // takes over cleanly — mirrors onResizeEnd's reset for text/caption.
              const target = getTargetById(id) as HTMLDivElement | null;
              const selector = currentItem.type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;
              const innerDiv = document.querySelector(selector) as HTMLDivElement | null;
              if (innerDiv && currentItem.type === "text") {
                innerDiv.style.width = "100%";
                innerDiv.style.height = "100%";
              }
              const animationDiv = target?.firstElementChild?.firstElementChild as HTMLDivElement | null;
              if (animationDiv) {
                animationDiv.style.height = "100%";
                animationDiv.style.width = currentItem.type === "caption" ? "100%" : "";
              }
            } else {
              payload[id] = {
                details: {
                  transform: entry.transform,
                  left: entry.left,
                  top: entry.top,
                }
              };
            }
          }

          if (Object.keys(payload).length > 0) {
            dispatch(EDIT_OBJECT, { payload });
          }
          holdGroupPosition = null;
          groupTextScaleStart = null;
          groupScaleAnchor = null;
        }
      }}
      onRotateGroup={({ events }) => {
        const currentTrackItemsMap = useStore.getState().trackItemsMap;
        if (!groupRotateStart) groupRotateStart = {};

        if (!groupRotatePivot) {
          // Frozen once per gesture: every item swings around this same fixed
          // point instead of drifting toward a live-recomputed bounding box.
          const rect = moveableRef.current?.moveable.getRect();
          groupRotatePivot = {
            x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
            y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2
          };
        }

        for (const event of events) {
          const id = getIdFromClassName(event.target.className);
          const target = event.target as HTMLDivElement;
          const item = currentTrackItemsMap[id];
          if (!item?.details) continue;
          const details = item.details;

          if (!groupRotateStart[id]) {
            // Parse this item's current rotate/skewX/skewY/scale — possibly all
            // independently nonzero — and fold skewY away. rotate * skewX *
            // scale(sx,sy) already spans every invertible 2x2 matrix, so skewY
            // is a redundant, alternate parameterization of the same family.
            // Folding it in gives a clean base where an additional external
            // rotation just adds to the angle term, nothing else.
            const rotate = parseFloat(details.rotate as unknown as string) || 0;
            const skewX = Number(details.skewX) || 0;
            const skewY = Number(details.skewY) || 0;
            const scaleMatch = (details.transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
            const scaleX = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
            const scaleY = scaleMatch ? parseFloat(scaleMatch[2]) : 1;

            const folded = foldSkewYIntoScale(rotate, skewX, skewY, scaleX, scaleY);

            // clientWidth/clientHeight are pre-transform box dimensions (CSS
            // transform doesn't affect layout size), and left/top position that
            // same pre-transform box — so left+width/2 gives the item's true
            // rendered center regardless of any existing scale, since scaling
            // around transform-origin:center never moves the center itself.
            const left = parseFloat(target.style.left) || 0;
            const top = parseFloat(target.style.top) || 0;
            const width = target.clientWidth;
            const height = target.clientHeight;

            groupRotateStart[id] = {
              rotate: folded.rotate,
              skewX: folded.skewX,
              scaleX: folded.scaleX,
              scaleY: folded.scaleY,
              centerX: left + width / 2,
              centerY: top + height / 2,
              width,
              height
            };
          }

          const start = groupRotateStart[id];
          const theta = event.beforeDist; // cumulative deg from gesture start, shared by every item since one handle drives the group
          const newRotate = start.rotate + theta;

          // Swing this item's center around the frozen pivot by theta. Standard
          // rotation matrix applied directly in CSS px coords (y-down) matches
          // rotate()'s clockwise-positive convention with no sign flip needed.
          const rad = toRad(theta);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const dx = start.centerX - groupRotatePivot.x;
          const dy = start.centerY - groupRotatePivot.y;
          const newCenterX = groupRotatePivot.x + (dx * cos - dy * sin);
          const newCenterY = groupRotatePivot.y + (dx * sin + dy * cos);
          const newLeft = newCenterX - start.width / 2;
          const newTop = newCenterY - start.height / 2;

          const composedDetails = {
            ...details,
            rotate: `${newRotate}deg`,
            skewX: start.skewX,
            skewY: 0,
            transform: `scale(${start.scaleX}, ${start.scaleY})`
          };
          target.style.transform = getMoveableTransform(composedDetails, {});
          target.style.left = `${newLeft}px`;
          target.style.top = `${newTop}px`;

          target.dataset.liveRotate = String(newRotate);
          target.dataset.liveSkewX = String(start.skewX);
          target.dataset.liveScaleX = String(start.scaleX);
          target.dataset.liveScaleY = String(start.scaleY);
          target.dataset.liveLeft = String(newLeft);
          target.dataset.liveTop = String(newTop);
        }
      }}
      onRotateGroupEnd={() => {
        if (groupRotateStart) {
          const currentTrackItemsMap = useStore.getState().trackItemsMap;
          const payload: Record<string, any> = {};

          for (const id of Object.keys(groupRotateStart)) {
            const currentItem = currentTrackItemsMap[id];
            if (!currentItem || currentItem.details?.locked) continue;

            const target = getTargetById(id) as HTMLDivElement | null;
            if (!target || target.dataset.liveRotate === undefined) continue;

            // Commit the decomposed fields individually — not the opaque
            // matrix — so a later single-item rotate/skew/scale reads a
            // correct baseline instead of a stale 0.
            payload[id] = {
              details: {
                rotate: `${target.dataset.liveRotate}deg`,
                skewX: Number(target.dataset.liveSkewX),
                skewY: 0,
                transform: `scale(${target.dataset.liveScaleX}, ${target.dataset.liveScaleY})`,
                left: Number(target.dataset.liveLeft),
                top: Number(target.dataset.liveTop)
              }
            };

            delete target.dataset.liveRotate;
            delete target.dataset.liveSkewX;
            delete target.dataset.liveScaleX;
            delete target.dataset.liveScaleY;
            delete target.dataset.liveLeft;
            delete target.dataset.liveTop;
          }

          if (Object.keys(payload).length > 0) {
            dispatch(EDIT_OBJECT, { payload });
          }
          groupRotateStart = null;
          groupRotatePivot = null;
        }
      }}
    />
  );
}
