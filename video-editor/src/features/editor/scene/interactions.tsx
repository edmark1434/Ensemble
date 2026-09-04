import {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
import {
  broadcastLiveTransform,
  clearLiveTransform,
  subscribeToRemoteLiveTransforms,
  getRemoteActiveEditors,
  broadcastSelection,
  clearSelection,
  subscribeToRemoteSelections,
  getRemoteSelectionOwners,
  RemoteActiveEditor,
  LiveTransformState
} from "../collab/live-transform";
import {createPortal} from "react-dom";

let holdGroupPosition: Record<string, any> | null = null;
let groupTextScaleStart: Record<string, {
  width: number; height: number; fontSize: number;
  relLeft: number; relTop: number;
  foldedScaleXAtStart: number;
}> | null = null;
let groupScaleStartDims: Record<string, { width: number; height: number }> | null = null;
let groupScaleAnchor: { x: number; y: number } | null = null;
let groupRotateStart: Record<string, {
  rotate: number; skewX: number; scaleX: number; scaleY: number;
  centerX: number; centerY: number; width: number; height: number;
}> | null = null;
let groupRotatePivot: { x: number; y: number } | null = null;
let dragStartEnd = false;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const MIN_ITEM_DIMENSION = 50;

// Decomposes a 2x2 CSS matrix into rotate+skewX, assuming composition order
// rotate() * skewX() * scale(sx,sy) (per foldSkewYIntoScale's own comment).
function decomposeRotationSkew(a: number, b: number, c: number, d: number) {
  const scaleX = Math.sqrt(a * a + b * b) || 1;
  const nx = a / scaleX, ny = b / scaleX;
  let skew = nx * c + ny * d;
  const oc = c - nx * skew, od = d - ny * skew;
  const scaleY = Math.sqrt(oc * oc + od * od) || 1;
  skew /= scaleY;
  return {
    rotateDeg: (Math.atan2(ny, nx) * 180) / Math.PI,
    skewXDeg: (Math.atan(skew) * 180) / Math.PI,
    scaleX,
    scaleY
  };
}

interface SceneInteractionsProps {
  stateManager: StateManager;
  containerRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  size: { width: number; height: number };
  viewOnly?: boolean;
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
): number | null {
  const div = document.querySelector(selector) as HTMLDivElement | null;
  if (!div) return null;
  const fontSize = parseFloat(getComputedStyle(div).fontSize);
  const newFontSize = fontSize * scale;
  div.style.fontSize = `${newFontSize}px`;
  div.style.width = `${currentWidth * scale}px`;
  div.style.height = `${currentHeight * scale}px`;
  return newFontSize;
}

export function SceneInteractions({
  stateManager,
  containerRef,
  zoom,
  viewOnly
}: SceneInteractionsProps) {
  const [targets, setTargets] = useState<HTMLDivElement[]>([]);
  const [selection, setSelection] = useState<Selection>();
  const {
    activeIds,
    setState,
    trackItemsMap,
    playerRef,
    setSceneMoveableRef,
    trackItemIds,
    collabSchema,
  } = useStore();
  const moveableRef = useRef<Moveable>(null);
  const [selectionInfo, setSelectionInfo] =
    useState<SelectionInfo>(emptySelection);

  const [remoteActiveEditors, setRemoteActiveEditors] = useState<Map<string, RemoteActiveEditor>>(new Map());
  const remoteActiveEditorsRef = useRef<Map<string, RemoteActiveEditor>>(new Map());

  const [remoteSelectedItems, setRemoteSelectedItems] = useState<Map<string, RemoteActiveEditor>>(new Map());
  const remoteSelectedItemsRef = useRef<Map<string, RemoteActiveEditor>>(new Map());

  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const overlayElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const itemOverlayElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setPortalTarget(containerRef.current);
  }, [containerRef]);

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

  // Presence borders live on a decoupled overlay, not on the item itself —
  // outline/box-shadow painted on the target scales with it the moment
  // Moveable (or a remote applyPatch) writes `transform: scale(...)` onto
  // that node. This reads real post-transform screen rects instead and
  // draws a plain, un-transformed div on top. One div per remote clientId,
  // not per item, so a group selection/gesture gets a single bbox border
  // instead of N overlapping boxes.
  const updatePresenceOverlays = useCallback(() => {
    const container = overlayContainerRef.current;
    const containerBox = containerRef.current?.getBoundingClientRect();
    if (!container || !containerBox) return;

    const { trackItemsMap: currentTrackItemsMap, playerRef, fps } = useStore.getState();
    const currentTime = playerRef?.current
      ? (playerRef.current.getCurrentFrame() / fps) * 1000
      : 0;

    const inFrame = (id: string) => {
      const item = currentTrackItemsMap[id];
      if (!item || item.type === "audio") return false;
      return item.display.from <= currentTime && item.display.to >= currentTime;
    };

    const remoteOccupied = new Map<string, RemoteActiveEditor>(
      [...remoteSelectedItemsRef.current, ...remoteActiveEditorsRef.current]
        .filter(([id]) => inFrame(id))
    );

    const grouped = new Map<number, { color: string; userId?: string; ids: string[] }>();
    remoteOccupied.forEach((editor, id) => {
      const entry = grouped.get(editor.clientId);
      if (entry) entry.ids.push(id);
      else grouped.set(editor.clientId, { color: editor.color, userId: editor.userId, ids: [id] });
    });

    overlayElsRef.current.forEach((el, clientId) => {
      if (!grouped.has(clientId)) {
        el.remove();
        overlayElsRef.current.delete(clientId);
      }
    });

    grouped.forEach(({ color, userId, ids }, clientId) => {
      const { trackItemsMap: currentTrackItemsMap } = useStore.getState();
      const rects = ids
        .filter((id) => currentTrackItemsMap[id]?.type !== "audio")
        .map((id) => getTargetById(id)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r);
      if (rects.length === 0) return;

      const left = Math.min(...rects.map((r) => r.left)) - containerBox.left;
      const top = Math.min(...rects.map((r) => r.top)) - containerBox.top;
      const right = Math.max(...rects.map((r) => r.right)) - containerBox.left;
      const bottom = Math.max(...rects.map((r) => r.bottom)) - containerBox.top;

      let el = overlayElsRef.current.get(clientId);
      let label: HTMLDivElement;
      if (!el) {
        el = document.createElement("div");
        el.style.position = "absolute";
        el.style.boxSizing = "border-box";
        el.style.borderWidth = "2px";
        el.style.borderStyle = "solid";
        el.style.pointerEvents = "none";

        label = document.createElement("div");
        label.style.position = "absolute";
        label.style.padding = "1px 4px";
        label.style.fontSize = "11px";
        label.style.lineHeight = "16px";
        label.style.color = "#fff";
        label.style.whiteSpace = "nowrap";
        label.style.pointerEvents = "none";
        el.appendChild(label);

        container.appendChild(el);
        overlayElsRef.current.set(clientId, el);
      } else {
        label = el.firstElementChild as HTMLDivElement;
      }
      el.style.borderColor = color;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${right - left}px`;
      el.style.height = `${bottom - top}px`;

      const boxHeight = bottom - top;
      const LABEL_OUTSIDE_THRESHOLD = 36;
      if (boxHeight <= LABEL_OUTSIDE_THRESHOLD) {
        label.style.left = "-2px";
        label.style.top = "-18px";
        label.style.maxWidth = "";
        label.style.borderRadius = "0px";
        label.style.overflow = "visible";
        label.style.textOverflow = "clip";
      } else {
        label.style.left = "-1px";
        label.style.top = "-1px";
        label.style.maxWidth = "100%";
        label.style.borderRadius = "0 0 0px 0";
        label.style.overflow = "hidden";
        label.style.textOverflow = "ellipsis";
      }

      label.style.backgroundColor = color;
      label.style.display = userId ? "block" : "none";
      if (userId && label.textContent !== userId) label.textContent = userId;
    });

    // Per-item borders: rotate/skew with each item individually, read live off
    // the DOM every frame rather than off trackItemsMap, since mid-gesture
    // rotation (local pre-commit, or remote patched) never touches the store.
    const seenItemIds = new Set<string>();
    remoteOccupied.forEach((editor, id) => {
      const target = getTargetById(id) as HTMLDivElement | null;
      const rect = target?.getBoundingClientRect();
      if (!target || !rect) return;
      seenItemIds.add(id);

      const computed = getComputedStyle(target).transform;
      let rotateDeg = 0, skewXDeg = 0, scaleX = 1, scaleY = 1;
      if (computed && computed !== "none") {
        const m = new DOMMatrix(computed);
        ({ rotateDeg, skewXDeg, scaleX, scaleY } = decomposeRotationSkew(m.a, m.b, m.c, m.d));
      }

      const screenWidth = target.clientWidth * Math.abs(scaleX) * zoom;
      const screenHeight = target.clientHeight * Math.abs(scaleY) * zoom;
      const centerX = (rect.left + rect.right) / 2 - containerBox.left;
      const centerY = (rect.top + rect.bottom) / 2 - containerBox.top;

      let itemEl = itemOverlayElsRef.current.get(id);
      if (!itemEl) {
        itemEl = document.createElement("div");
        itemEl.style.position = "absolute";
        itemEl.style.boxSizing = "border-box";
        itemEl.style.borderWidth = "1px";
        itemEl.style.borderStyle = "solid";
        itemEl.style.pointerEvents = "none";
        container.appendChild(itemEl);
        itemOverlayElsRef.current.set(id, itemEl);
      }
      itemEl.style.borderColor = editor.color;
      itemEl.style.width = `${screenWidth}px`;
      itemEl.style.height = `${screenHeight}px`;
      itemEl.style.left = `${centerX - screenWidth / 2}px`;
      itemEl.style.top = `${centerY - screenHeight / 2}px`;
      itemEl.style.transform = `rotate(${rotateDeg}deg) skewX(${skewXDeg}deg)`;
    });

    itemOverlayElsRef.current.forEach((el, id) => {
      if (!seenItemIds.has(id)) {
        el.remove();
        itemOverlayElsRef.current.delete(id);
      }
    });
  }, [containerRef, zoom]);

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
      const isLocalLocked = targetIds.length === 1 &&
        useStore.getState().trackItemsMap[targetIds[0]]?.details?.locked;
      const isBeingEditedRemotely = targetIds.some((id) => remoteActiveEditors.has(id));
      if (isLocalLocked || isBeingEditedRemotely) {
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
      if (activeGestureRef.current) return;
      updateTargets();
    });

    const onFrameChange = (v: any) => {
      setTimeout(() => {
        const { fps } = useStore.getState();
        const seekedTime = (v.detail.frame / fps) * 1000;
        updateTargets(seekedTime);
        updatePresenceOverlays();
      });
    };
    playerRef?.current?.addEventListener("seeked", onFrameChange);
    playerRef?.current?.addEventListener("frameupdate", onFrameChange);

    return () => {
      playerRef?.current?.removeEventListener("seeked", onFrameChange);
      playerRef?.current?.removeEventListener("frameupdate", onFrameChange);
      clearTimeout(timer);
    };
  }, [activeIds, playerRef, trackItemsMap, remoteActiveEditors, updatePresenceOverlays]);

  const trackItemsMapRef = useRef(trackItemsMap);
  useEffect(() => {
    trackItemsMapRef.current = trackItemsMap;
  }, [trackItemsMap]);

  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (viewOnly) return;

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
          if (remoteActiveEditorsRef.current.has(id)) return false;
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

        // Ask Moveable directly whether this element is currently a registered
        // target, instead of trusting targetsRef — targetsRef syncs one commit
        // behind `targets` via its own effect, so right after a remote eviction
        // it can still list a node Moveable has already dropped. That gap is
        // what was silently eating every click on a just-evicted item.
        if (target && moveableRef?.current?.moveable.isMoveableElement(target)) {
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
            if (remoteActiveEditorsRef.current.has(id)) return false;
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

  const activeGestureRef = useRef(false);
  useEffect(() => {
    if (activeGestureRef.current) return;
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

  const remoteOverrideIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!collabSchema) return;

    const applyPatch = (id: string, patch: LiveTransformState[string]) => {
      const target = getTargetById(id) as HTMLDivElement | null;
      if (!target) return;
      if (patch.left !== undefined) target.style.left = `${patch.left}px`;
      if (patch.top !== undefined) target.style.top = `${patch.top}px`;
      if (patch.transform !== undefined) target.style.transform = patch.transform;
      if (patch.width !== undefined) target.style.width = `${patch.width}px`;
      if (patch.height !== undefined) target.style.height = `${patch.height}px`;

      if (patch.width === undefined && patch.height === undefined && patch.fontSize === undefined) return;

      const item = useStore.getState().trackItemsMap[id];
      if (!item || (item.type !== "text" && item.type !== "caption")) return;

      const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
      if (animationDiv) {
        if (patch.width !== undefined) animationDiv.style.width = `${patch.width}px`;
        if (patch.height !== undefined) animationDiv.style.height = `${patch.height}px`;
      }

      const selector = item.type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;
      const innerDiv = document.querySelector(selector) as HTMLDivElement | null;
      if (innerDiv) {
        if (patch.width !== undefined) innerDiv.style.width = `${patch.width}px`;
        if (patch.height !== undefined) innerDiv.style.height = `${patch.height}px`;
        if (patch.fontSize !== undefined) innerDiv.style.fontSize = `${patch.fontSize}px`;
      }

      if (item.type === "text" && (patch.width !== undefined || patch.height !== undefined)) {
        const textAnimatedDiv = target.querySelector(`[data-text-anim-id="${id}"]`) as HTMLDivElement | null;
        if (textAnimatedDiv) {
          if (patch.width !== undefined) textAnimatedDiv.style.width = `${patch.width}px`;
          if (patch.height !== undefined) textAnimatedDiv.style.height = `${patch.height}px`;
        }
      }
    };

    const resetToCommitted = (id: string) => {
      const target = getTargetById(id) as HTMLDivElement | null;
      const item = useStore.getState().trackItemsMap[id];
      const details = item?.details;
      if (!target || !details) return;
      target.style.left = typeof details.left === "number" ? `${details.left}px` : String(details.left ?? "");
      target.style.top = typeof details.top === "number" ? `${details.top}px` : String(details.top ?? "");
      target.style.transform = getMoveableTransform(details, {});
      if (details.width !== undefined) {
        target.style.width = typeof details.width === "number" ? `${details.width}px` : String(details.width);
      }
      if (details.height !== undefined) {
        target.style.height = typeof details.height === "number" ? `${details.height}px` : String(details.height);
      }

      if (item.type !== "text" && item.type !== "caption") return;

      if (item.type === "text") {
        const innerDiv = document.querySelector(`[data-text-id="${id}"]`) as HTMLDivElement | null;
        if (innerDiv) {
          innerDiv.style.width = "100%";
          innerDiv.style.height = "100%";
        }
      }
      const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
      if (animationDiv) {
        animationDiv.style.height = "100%";
        animationDiv.style.width = item.type === "caption" ? "100%" : "";
      }
    };

    const resetTimersRef = { current: new Map<string, ReturnType<typeof setTimeout>>() };

    const clearResetTimer = (id: string) => {
      const timer = resetTimersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        resetTimersRef.current.delete(id);
      }
    };

    // The ghost disappearing doesn't mean the real committed update has
    // arrived yet — it's a separate, faster awareness message. Give the real
    // Yjs update a moment to land (it usually will, well under this) before
    // falling back to trackItemsMap, which may still be pre-drag stale. This
    // only ever visibly matters for the "gesture abandoned without
    // committing" case; the normal case is masked by the real update arriving
    // first and this timer firing as a harmless no-op.
    const scheduleReset = (id: string) => {
      clearResetTimer(id);
      const timer = setTimeout(() => {
        resetTimersRef.current.delete(id);
        resetToCommitted(id);
        updatePresenceOverlays();
      }, 400);
      resetTimersRef.current.set(id, timer);
    };

    const evictLocalSelection = (ids: string[]) => {
      if (ids.length === 0) return;
      const { activeIds: currentActiveIds } = useStore.getState();
      const toEvict = currentActiveIds.filter((id) => ids.includes(id));
      if (toEvict.length === 0) return;
      const toEvictSet = new Set(toEvict);
      targetsRef.current = targetsRef.current.filter(
        (t) => !toEvictSet.has(getIdFromClassName(t.className))
      );
      setTargets(targetsRef.current);
      stateManager.updateState(
        { activeIds: currentActiveIds.filter((id) => !toEvict.includes(id)) },
        { updateHistory: false, kind: "layer:selection" }
      );
    };

    const unsubscribe = subscribeToRemoteLiveTransforms(collabSchema.awareness, (statesByClient) => {
      const merged: LiveTransformState = {};
      statesByClient.forEach(({ patches }) => Object.assign(merged, patches));
      const nextIds = new Set(Object.keys(merged));

      remoteOverrideIdsRef.current.forEach((id) => {
        if (!nextIds.has(id)) scheduleReset(id);
      });
      nextIds.forEach((id) => {
        clearResetTimer(id);
        applyPatch(id, merged[id]);
      });
      remoteOverrideIdsRef.current = nextIds;

      // Someone else starting a gesture on an item you have selected bumps
      // it out of your selection — only on the transition into "someone's
      // editing this", not on every throttled position update mid-gesture.
      const activeEditors = getRemoteActiveEditors(statesByClient);
      const newlyClaimed: string[] = [];
      activeEditors.forEach((_editor, id) => {
        if (!remoteActiveEditorsRef.current.has(id)) newlyClaimed.push(id);
      });
      evictLocalSelection(newlyClaimed);
      remoteActiveEditorsRef.current = activeEditors;
      setRemoteActiveEditors(activeEditors);
      updatePresenceOverlays();
    });

    const unsubscribeSelections = subscribeToRemoteSelections(collabSchema.awareness, (statesByClient) => {
      const selectionOwners = getRemoteSelectionOwners(statesByClient);

      // Same rule as gesture-claim above, but for a plain remote select: the
      // transition into "someone else selected this" evicts it locally.
      // It's not sticky — they can deselect, or you can just click it again
      // and take it back, since selecting it re-broadcasts your ownership
      // and evicts *them* on the same logic, symmetrically.
      const newlyClaimed: string[] = [];
      selectionOwners.forEach((_owner, id) => {
        if (!remoteSelectedItemsRef.current.has(id)) newlyClaimed.push(id);
      });
      evictLocalSelection(newlyClaimed);

      remoteSelectedItemsRef.current = selectionOwners;
      setRemoteSelectedItems(selectionOwners);
      updatePresenceOverlays();
    });

    return () => {
      unsubscribe();
      unsubscribeSelections();
      resetTimersRef.current.forEach((timer) => clearTimeout(timer));
      resetTimersRef.current.clear();
    };
  }, [collabSchema]);

  useEffect(() => {
    if (!collabSchema) return;
    broadcastSelection(collabSchema.awareness, activeIds);
  }, [collabSchema, activeIds]);

  useEffect(() => {
    if (!collabSchema) return;
    return () => {
      clearSelection(collabSchema.awareness);
    };
  }, [collabSchema]);

  useEffect(() => {
    updatePresenceOverlays();
  }, [remoteActiveEditors, remoteSelectedItems, portalTarget, trackItemsMap, updatePresenceOverlays]);

  useEffect(() => {
    updatePresenceOverlays();
  }, [zoom, updatePresenceOverlays]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      updatePresenceOverlays();
      if (!activeGestureRef.current) moveableRef.current?.moveable.updateRect();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [updatePresenceOverlays]);

  return (
    <>
      {portalTarget &&
        createPortal(
          <div
            ref={overlayContainerRef}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 200 }}
          />,
          portalTarget
        )}
      {!viewOnly && (
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
            if (collabSchema) {
              const id = getIdFromClassName(target.className);
              broadcastLiveTransform(collabSchema.awareness, { [id]: { left, top } });
            }
          }}
          onDragEnd={({ target, isDrag }) => {
            try {
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
            } finally {
              if (collabSchema) clearLiveTransform(collabSchema.awareness);
            }
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

            // Floor the magnitude so neither dimension of the unscaled box can drop
            // below MIN_ITEM_DIMENSION once multiplied through.
            const minMagnitude = MIN_ITEM_DIMENSION / Math.min(target.clientWidth, target.clientHeight);
            const magnitude = Math.max(Math.abs(scale[0]), minMagnitude); // uniform magnitude, corner handle only

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

            if (collabSchema) {
              broadcastLiveTransform(collabSchema.awareness, {
                [targetId]: { left: newLeft, top: newTop, transform: target.style.transform },
              });
            }
          }}
          onScaleEnd={({ target }) => {
            try {
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
            } finally {
              if (collabSchema) clearLiveTransform(collabSchema.awareness);
            }
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

            if (collabSchema) {
              broadcastLiveTransform(collabSchema.awareness, {
                [targetId]: { transform: target.style.transform },
              });
            }
          }}
          onRotateEnd={({ target }) => {
            try {
              const targetId = getIdFromClassName(target.className) as string;
              const currentItem = useStore.getState().trackItemsMap[targetId];
              if (!currentItem || currentItem.details?.locked) return;

              const finalRotate = target.dataset.liveRotate;
              if (finalRotate === undefined) return;

              dispatch(EDIT_OBJECT, {
                payload: { [targetId]: { details: { rotate: `${finalRotate}deg` } } }
              });
              delete target.dataset.liveRotate;
            } finally {
              if (collabSchema) clearLiveTransform(collabSchema.awareness);
            }
          }}
          onResize={({
            target,
            width: rawWidth,
            height: rawHeight,
            direction
          }) => {
            const id = getIdFromClassName(target.className);
            const currentItem = useStore.getState().trackItemsMap[id];
            if (!currentItem) return;

            const nextWidth = Math.max(rawWidth, MIN_ITEM_DIMENSION);
            const nextHeight = Math.max(rawHeight, MIN_ITEM_DIMENSION);

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

                if (collabSchema) {
                  broadcastLiveTransform(collabSchema.awareness, {
                    [id]: {
                      left: parseFloat(target.style.left),
                      top: parseFloat(target.style.top),
                      width: nextWidth,
                      height: nextHeight,
                    },
                  });
                }
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

                if (collabSchema) {
                  broadcastLiveTransform(collabSchema.awareness, {
                    [id]: { width: nextWidth, height: finalHeight },
                  });
                }
                return;
              }

              // default proportional scaling for corner handles and non-text types
              const currentWidth = target.clientWidth;
              const currentHeight = target.clientHeight;
              // nextHeight is already floored, but a height-driven scale can still
              // carry width below the floor when the item is narrower than it is
              // tall — clamp scale itself so whichever side is smaller can't pass it.
              const minScale = MIN_ITEM_DIMENSION / Math.min(currentWidth, currentHeight);
              const scale = Math.max(nextHeight / currentHeight, minScale);
              const newWidth = currentWidth * scale;
              const newHeight = currentHeight * scale;

              target.style.width = `${newWidth}px`;
              target.style.height = `${newHeight}px`;

              let newFontSize: number | null = null;

              const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
              if (animationDiv) {
                animationDiv.style.width = `${newWidth}px`;
                animationDiv.style.height = `${newHeight}px`;

                if (trackItemsMap[id].type === "text") {
                  newFontSize = scaleDiv(`[data-text-id="${id}"]`, scale, currentWidth, currentHeight);

                  const textAnimatedDiv = target.querySelector(
                    `[data-text-anim-id="${id}"]`
                  ) as HTMLDivElement | null;
                  if (textAnimatedDiv) {
                    textAnimatedDiv.style.width = `${newWidth}px`;
                    textAnimatedDiv.style.height = `${newHeight}px`;
                  }
                } else if (trackItemsMap[id].type === "caption") {
                  newFontSize = scaleDiv(`#caption-${id}`, scale, currentWidth, currentHeight);
                }
              }

              if (collabSchema) {
                broadcastLiveTransform(collabSchema.awareness, {
                  [id]: {
                    width: newWidth,
                    height: newHeight,
                    ...(newFontSize !== null ? { fontSize: newFontSize } : {}),
                  },
                });
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

                if (collabSchema) {
                  broadcastLiveTransform(collabSchema.awareness, {
                    [id]: { width: clampedWidth, height: finalHeight },
                  });
                }
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

                if (collabSchema) {
                  broadcastLiveTransform(collabSchema.awareness, {
                    [id]: {
                      left: parseFloat(target.style.left),
                      width: nextWidth,
                      height: nextHeight,
                    },
                  });
                }
              }
            }
          }}
          onResizeEnd={({ target }) => {
            try {
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
            } finally {
              if (collabSchema) clearLiveTransform(collabSchema.awareness);
            }
          }}
          onDragGroup={({ events }) => {
            holdGroupPosition = {};
            const livePatch: LiveTransformState = {};
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
              holdGroupPosition[id] = { left, top };
              livePatch[id] = { left, top };
            }
            if (collabSchema) broadcastLiveTransform(collabSchema.awareness, livePatch);
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
            if (collabSchema) clearLiveTransform(collabSchema.awareness);
          }}
          onScaleGroup={({ events }) => {
            const currentTrackItemsMap = useStore.getState().trackItemsMap;
            if (!holdGroupPosition) holdGroupPosition = {};
            if (!groupTextScaleStart) groupTextScaleStart = {};
            if (!groupScaleStartDims) groupScaleStartDims = {};

            if (!groupScaleAnchor) {
              // one handle drives the whole group, so direction is shared across events
              const [xControl, yControl] = events[0]?.direction ?? [1, 1];
              const rect = moveableRef.current?.moveable.getRect();
              const groupLeft = rect?.left ?? 0;
              const groupTop = rect?.top ?? 0;
              const groupWidth = rect?.width ?? 0;
              const groupHeight = rect?.height ?? 0;

              groupScaleAnchor = {
                x: xControl === 1 ? groupLeft : groupLeft + groupWidth,
                y: yControl === 1 ? groupTop : groupTop + groupHeight,
              };
            }

            // Pre-pass: it's one shared handle driving every item's scale by the
            // same ratio, so check up front whether THIS frame's magnitude would
            // take any single item below the floor. If so, skip the whole frame —
            // group holds at its last valid state and resumes the moment the user
            // drags back out past the floor again.
            let violatesFloor = false;
            for (const event of events) {
              const id = getIdFromClassName(event.target.className);
              const target = event.target as HTMLDivElement;
              const item = currentTrackItemsMap[id];
              if (!item?.details) continue;

              if (!groupScaleStartDims[id]) {
                groupScaleStartDims[id] = { width: target.clientWidth, height: target.clientHeight };
              }
              const dims = groupScaleStartDims[id];

              let magnitude = Math.abs(event.scale[0]);
              if (item.type === "text" || item.type === "caption") {
                const start = groupTextScaleStart[id];
                if (start) magnitude = magnitude / (start.foldedScaleXAtStart || 1);
              }

              const minMagnitude = MIN_ITEM_DIMENSION / Math.min(dims.width, dims.height);
              if (magnitude < minMagnitude) violatesFloor = true;
            }
            if (violatesFloor) return;

            const livePatch: LiveTransformState = {};
            for (const event of events) {
              const id = getIdFromClassName(event.target.className);
              const target = event.target as HTMLDivElement;
              const item = currentTrackItemsMap[id];
              if (!item?.details) continue;
              const details = item.details;

              if (item?.type === "text" || item?.type === "caption") {
                const selector = item.type === "text" ? `[data-text-id="${id}"]` : `#caption-${id}`;

                if (!groupTextScaleStart[id]) {
                  const innerDiv = document.querySelector(selector) as HTMLDivElement | null;

                  // details.transform can say scale(1,1) while the CSS transform Moveable
                  // actually measures has a nontrivial scale baked in by the skewY fold
                  // (secθ on x, cosθ on y — secθ is always >= 1). Freeze that contamination
                  // now so we can divide it back out of event.scale below; otherwise this
                  // item's magnitude comes back inflated by a constant factor regardless
                  // of drag direction.
                  const rotate = parseFloat(details.rotate as unknown as string) || 0;
                  const skewX = Number(details.skewX) || 0;
                  const skewY = Number(details.skewY) || 0;
                  const scaleMatch = (details.transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
                  const baseScaleX = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
                  const baseScaleY = scaleMatch ? parseFloat(scaleMatch[2]) : 1;
                  const folded = foldSkewYIntoScale(rotate, skewX, skewY, baseScaleX, baseScaleY);

                  groupTextScaleStart[id] = {
                    width: target.clientWidth,
                    height: target.clientHeight,
                    fontSize: innerDiv ? parseFloat(getComputedStyle(innerDiv).fontSize) : 0,
                    relLeft: parseFloat(item.details.left as string) - groupScaleAnchor.x,
                    relTop: parseFloat(item.details.top as string) - groupScaleAnchor.y,
                    foldedScaleXAtStart: folded.scaleX || 1,
                  };
                }

                const start = groupTextScaleStart[id];
                const magnitude = Math.abs(event.scale[0]) / (start.foldedScaleXAtStart || 1);
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
                livePatch[id] = {
                  width: newWidth,
                  height: newHeight,
                  left: newLeft,
                  top: newTop,
                  transform: target.style.transform,
                  fontSize: newFontSize
                }
              } else {
                target.style.transform = event.transform;
                target.style.left = `${parseFloat(target.style.left) + event.drag.beforeTranslate[0]}px`;
                target.style.top = `${parseFloat(target.style.top) + event.drag.beforeTranslate[1]}px`;
                holdGroupPosition[id] = {
                  transform: target.style.transform,
                  left: parseFloat(target.style.left),
                  top: parseFloat(target.style.top),
                };
                livePatch[id] = {
                  transform: target.style.transform,
                  left: parseFloat(target.style.left),
                  top: parseFloat(target.style.top),
                };
              }

            }
            if (collabSchema) broadcastLiveTransform(collabSchema.awareness, livePatch);
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
              groupScaleStartDims = null;
              groupScaleAnchor = null;
            }
            if (collabSchema) clearLiveTransform(collabSchema.awareness);
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

            const livePatch: LiveTransformState = {};
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

              livePatch[id] = {
                transform: target.style.transform,
                left: parseFloat(target.style.left),
                top: parseFloat(target.style.top),
              };
            }
            if (collabSchema) broadcastLiveTransform(collabSchema.awareness, livePatch);
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
            if (collabSchema) clearLiveTransform(collabSchema.awareness);
          }}
        />
      )}
    </>
  );
}
