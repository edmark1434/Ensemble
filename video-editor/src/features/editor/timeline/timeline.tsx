import {useEffect, useRef, useState} from "react";
import Header from "./header";
import Ruler from "./ruler";
import {timeMsToUnits, unitsToTimeMs} from "@designcombo/timeline";
import CanvasTimeline from "./items/timeline";
import useStore from "../store/use-store";
import Playhead from "./playhead";
import {useTheme} from "next-themes";
import {useCurrentPlayerFrame} from "../hooks/use-current-frame";
import {
  Audio,
  Caption,
  Helper,
  HillAudioBars,
  Image,
  LinealAudioBars,
  RadialAudioBars,
  Text,
  Track,
  Video,
  WaveAudioBars,
} from "./items";
import StateManager from "@designcombo/state";
import {TIMELINE_OFFSET_CANVAS_LEFT, TIMELINE_OFFSET_CANVAS_RIGHT} from "../constants/constants";
import PreviewTrackItem from "./items/preview-drag-item";
import {useTimelineOffsetX} from "../hooks/use-timeline-offset";
import {useStateManagerEvents} from "../hooks/use-state-manager-events";
import {useResizbleTimeline} from "../hooks/use-resizable-timeline";
import "./items/transition-render";
import {patchTransitionGuideRender} from "@/features/editor/timeline/items/transition-guide-render";
import {scrollTimelineToFrame} from "@/features/editor/utils/timeline-scroll";
import {patchTransitionZOrder} from "@/features/editor/timeline/items/transition-z-order";
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
  LiveTransformState, subscribeToRemoteWorkingInside
} from "../collab/live-transform";
import {FabricText, Path, Rect} from "fabric";
import Scene from "./items/ensemble-scene";

CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Caption,
  Helper,
  Track,
  PreviewTrackItem,
  LinealAudioBars,
  RadialAudioBars,
  WaveAudioBars,
  HillAudioBars,
  Scene
});

const EMPTY_SIZE = { width: 0, height: 0 };

// Builds an SVG path for a rect with independently-configurable corner radii.
// A radius of 0 yields a sharp corner — used to square off the top-left
// corner on single-item presence borders, distinguishing them from group
// borders where all four corners stay rounded.
function roundedRectPathD(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: { tl: number; tr: number; br: number; bl: number }
): string {
  const { tl, tr, br, bl } = radii;
  const parts: string[] = [`M ${x + tl} ${y}`, `L ${x + w - tr} ${y}`];
  if (tr > 0) parts.push(`A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}`);
  parts.push(`L ${x + w} ${y + h - br}`);
  if (br > 0) parts.push(`A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}`);
  parts.push(`L ${x + bl} ${y + h}`);
  if (bl > 0) parts.push(`A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}`);
  parts.push(`L ${x} ${y + tl}`);
  if (tl > 0) parts.push(`A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`);
  parts.push("Z");
  return parts.join(" ");
}

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-plus-jakarta-sans").trim() ||
  "sans-serif";

function applyItemDetails(canvas: CanvasTimeline, itemsMap: Record<string, any>) {
  canvas.getTrackItems().forEach((item: any) => {
    const details = itemsMap[item.id]?.details;

    if (details?.hidden !== undefined && item.hidden !== details.hidden) {
      item.hidden = details.hidden;
      item.opacity = details.hidden ? 0.5 : 1;
      item.dirty = true;
    }
    if (details?.volume !== undefined && item.volume !== details.volume) {
      item.volume = details.volume;
      if (item.type == "audio") item.opacity = details.volume === 0 ? 0.5 : 1;
      item.dirty = true;
    }
    if (details?.locked !== undefined && item.locked !== details.locked) {
      const locked = details.locked;
      item.lockMovementX = locked;
      item.lockMovementY = locked;
      item.lockScalingX = locked;
      item.lockScalingY = locked;
      item.selectable = !locked;
      item.hasControls = !locked;
      item.dirty = true;
    }
  });
}

function formatInsideSentence(editors: RemoteActiveEditor[]): string {
  const names = editors.map((e) => e.userName || "Someone");
  if (names.length === 1) return `${names[0]} is working inside`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are working inside`;
  return `${names[0]} and ${names.length - 1} others are inside`;
}

// Scene items get one combined label instead of the plain "[name]" every
// other item type gets, since they can be occupied two different ways at
// once: selected/dragged in this project timeline ("on"), and open for
// editing in someone's own block editor ("inside").
function formatScenePresenceLabel(
  onEditor: RemoteActiveEditor | undefined,
  insideEditors: RemoteActiveEditor[],
): string {
  const insideSentence = insideEditors.length > 0 ? formatInsideSentence(insideEditors) : null;
  if (onEditor && insideSentence) return `${onEditor.userName || "Someone"} is selecting, ${insideSentence}`;
  if (onEditor) return onEditor.userName || "Someone";
  return insideSentence ?? "";
}

const Timeline = ({ stateManager }: { stateManager: StateManager }) => {
  // prevent duplicate scroll events
  const canScrollRef = useRef(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<CanvasTimeline | null>(null);
  const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const { scale, playerRef, fps, duration, setState, timeline, collabSchema, activeIds, trackItemsMap, transitionsMap } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);

  const timelineOffsetX = useTimelineOffsetX();
  const timelineOffsetXRef = useRef(timelineOffsetX);
  timelineOffsetXRef.current = timelineOffsetX;

  const drawOverlaysRef = useRef<() => void>(() => {});

  const {
    timelineContainerRef,
    timelineHeight,
    onMouseDown,
    onMouseMove,
    onMouseOut,
    toggleFullHeight
  } = useResizbleTimeline();
  const { theme } = useTheme();

  const { setTimeline } = useStore();

  // Use the extracted state manager events hook
  useStateManagerEvents(stateManager);

  useEffect(() => {
    const timeout = setTimeout(() => {
      timeline?.requestRenderAll();
    }, 5);
    return () => clearTimeout(timeout);
  }, [theme, timeline]);

  useEffect(() => {
    if (playerRef?.current) {
      canScrollRef.current = playerRef?.current.isPlaying();
    }
  }, [playerRef?.current?.isPlaying()]);

  useEffect(() => {
    const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
    const canvasEl = canvasElRef.current;
    const horizontalScrollbar = horizontalScrollbarVpRef.current;

    if (!canvasEl || !horizontalScrollbar) return;

    const canvasBoudingX =
      canvasEl.getBoundingClientRect().x + canvasEl.clientWidth;
    const playHeadPos = position - scrollLeft + 40;
    if (playHeadPos >= canvasBoudingX) {
      const scrollDivWidth = horizontalScrollbar.clientWidth;
      const totalScrollWidth = horizontalScrollbar.scrollWidth;
      const currentPosScroll = horizontalScrollbar.scrollLeft;
      const availableScroll =
        totalScrollWidth - (scrollDivWidth + currentPosScroll);
      const scaleScroll = availableScroll / scrollDivWidth;
      if (scaleScroll >= 0) {
        if (scaleScroll > 1)
          horizontalScrollbar.scrollTo({
            left: currentPosScroll + scrollDivWidth
          });
        else
          horizontalScrollbar.scrollTo({
            left: totalScrollWidth - scrollDivWidth
          });
      }
    }
  }, [currentFrame]);

  const onResizeCanvas = (payload: { width: number; height: number }) => {
    setCanvasSize({
      width: payload.width,
      height: payload.height
    });
  };

  const seekToItemStartIfNeeded = (target: any) => {
    const { scale, fps, playerRef } = useStore.getState();
    const rect = target.getBoundingRect();
    const fromMs = unitsToTimeMs(rect.left, scale.zoom);
    const toMs = unitsToTimeMs(rect.left + rect.width, scale.zoom);

    const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
    const currentMs = (currentFrame / fps) * 1000;

    if (currentMs >= fromMs && currentMs <= toMs) return; // playhead already within the item

    const targetFrame = Math.round((fromMs * fps) / 1000);
    playerRef?.current?.seekTo(targetFrame);
    scrollTimelineToFrame(targetFrame, "marker", timelineOffsetXRef.current);
  };

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const timelineContainerEl = timelineContainerRef.current;

    if (!canvasEl || !timelineContainerEl) return;

    const containerWidth =
      (document.getElementById("timeline-header")?.clientWidth || 0);
    const containerHeight =
      (document.getElementById("playhead")?.clientHeight || 0) -
      (document.getElementById("playhead-handle")?.clientHeight || 0) - 26;
    const canvas = new CanvasTimeline(canvasEl, {
      width: containerWidth,
      height: containerHeight,
      bounding: {
        width: containerWidth,
        height: 0
      },
      selectionColor: "rgba(0, 216, 214,0.1)",
      selectionBorderColor: "rgba(0, 216, 214,1.0)",
      onResizeCanvas,
      scale: scale,
      state: stateManager,
      duration,
      spacing: {
        left: TIMELINE_OFFSET_CANVAS_LEFT + timelineOffsetX,
        right: TIMELINE_OFFSET_CANVAS_RIGHT
      },
      sizesMap: {
        caption: 32,
        text: 32,
        audio: 36,
        customTrack: 40,
        customTrack2: 40,
        linealAudioBars: 40,
        radialAudioBars: 40,
        waveAudioBars: 40,
        hillAudioBars: 40,
        scene: 42,
      },
      itemTypes: [
        "text",
        "image",
        "audio",
        "video",
        "caption",
        "helper",
        "track",
        "composition",
        "template",
        "linealAudioBars",
        "radialAudioBars",
        "progressFrame",
        "progressBar",
        "waveAudioBars",
        "hillAudioBars",
        "scene"
      ],
      acceptsMap: {
        text: ["text", "caption"],
        image: ["image", "video", "scene"],
        video: ["video", "image", "scene"],
        audio: ["audio"],
        caption: ["caption", "text"],
        template: ["template"],
        customTrack: ["video", "image"],
        customTrack2: ["video", "image"],
        main: ["video", "image", "scene"],
        linealAudioBars: ["audio", "linealAudioBars"],
        radialAudioBars: ["audio", "radialAudioBars"],
        waveAudioBars: ["audio", "waveAudioBars"],
        hillAudioBars: ["audio", "hillAudioBars"],
        scene: ["scene", "image", "video"],
      },
      guideLineColor: "#ffffff"
    });

    canvas.guideLineColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-canvas")
      .trim() + "80";

    canvas.initScrollbars({
      offsetX: TIMELINE_OFFSET_CANVAS_LEFT + timelineOffsetX,
      offsetY: 0,
      extraMarginX: 0,
      extraMarginY: 0,
      scrollbarWidth: 6,
      scrollbarColor: "rgba(255, 255, 255, 1)"
    });

    canvas.onViewportChange((left: number) => {
      const computed = left + TIMELINE_OFFSET_CANVAS_LEFT + timelineOffsetX;
      setScrollLeft(Math.max(0, computed));
    });

    canvasRef.current = canvas;

    patchTransitionGuideRender(canvas);
    const unsubscribeTransitionZOrder = patchTransitionZOrder(canvas);

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setTimeline(canvas);

    canvas.scrollTo({ scrollLeft: 0 });

    // watch for state changes on canvas items
    canvas.state.subscribeToUpdateItemDetails(({ trackItemsMap }) => {
      applyItemDetails(canvas, trackItemsMap);
      canvas.requestRenderAll();
    });

    let isDragging = false;
    let activeIdsBeforeClick: string[] = [];

    canvas.on('mouse:down', (e: any) => {
      isDragging = false;

      if (e.target && e.target.type === "transition") return;

      const pointer = canvas.getScenePoint(e.e);
      const trackItems = canvas.getTrackItems() as any[];
      const target = trackItems.find(item => {
        const b = item.getBoundingRect();
        return pointer.x >= b.left && pointer.x <= b.left + b.width &&
          pointer.y >= b.top && pointer.y <= b.top + b.height;
      });

      if (!target) return; // don't deselect here, just bail

      const isShift = canvas.isShiftKey;
      if (!isShift) return; // normal clicks are handled in mouse:up

      const itemId = target.id;
      const { trackItemsMap } = useStore.getState();
      const isLocked = trackItemsMap[itemId]?.details?.locked;
      let next = [itemId];

      if (isLocked) {
        next = [itemId];
      } else {
        const existingNonLocked = activeIdsBeforeClick.filter(
          id => !trackItemsMap[id]?.details?.locked
        );
        next = existingNonLocked.includes(itemId)
          ? existingNonLocked.filter(id => id !== itemId)
          : [...existingNonLocked, itemId];
      }

      if (next.length === 0) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        stateManager.updateState(
          { activeIds: [] },
          { updateHistory: false, kind: 'layer:selection' }
        );
      } else {
        canvas.selectTrackItemByIds(next);
        stateManager.updateState(
          { activeIds: next },
          { updateHistory: false, kind: 'layer:selection' }
        );
      }

      activeIdsBeforeClick = next;
    });
    canvas.on('mouse:move', () => {
      isDragging = true;
      activeIdsBeforeClick = [...useStore.getState().activeIds];
    });
    canvas.on('mouse:up', (e: any) => {
      if (isDragging) return;

      if (e.target && e.target.type === "transition") {
        if (canvas.getActiveObject() !== e.target) {
          canvas.setActiveObject(e.target);
          canvas.requestRenderAll();
        }
        seekToItemStartIfNeeded(e.target);
        return;
      }

      const pointer = canvas.getScenePoint(e.e);
      const trackItems = canvas.getTrackItems() as any[];
      const target = trackItems.find(item => {
        const b = item.getBoundingRect();
        return pointer.x >= b.left && pointer.x <= b.left + b.width &&
          pointer.y >= b.top && pointer.y <= b.top + b.height;
      });

      if (!target) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        stateManager.updateState(
          { activeIds: [] },
          { updateHistory: false, kind: 'layer:selection' }
        );
        activeIdsBeforeClick = [];
        return;
      }
      if (canvas.isShiftKey) return;

      const itemId = target.id;

      canvas.selectTrackItemByIds([itemId]);
      stateManager.updateState(
        { activeIds: [itemId] },
        { updateHistory: false, kind: 'layer:selection' }
      );

      seekToItemStartIfNeeded(target);

      activeIdsBeforeClick = [itemId];
    });

    canvas.on("mouse:dblclick", (e: any) => {
      const target = e.target;
      if (!target || target.type !== "scene") return;

      const { trackItemsMap } = useStore.getState();
      const sceneItem = trackItemsMap[target.id];
      const blockId = sceneItem?.details?.blockId;
      if (!blockId) return;

      // Old selection references ids that won't exist in the scene's own
      // content — clear before swapping, same as any other selection reset.
      stateManager.updateState({ activeIds: [] }, { updateHistory: false, kind: "layer:selection" });
      useStore.getState().openScene?.(blockId, target.id, sceneItem?.details?.name);
    });

    const timelineGestureIds = new Set<string>();

    const broadcastTimelineGesture = (e: any) => {
      const targetObj = e.target;
      if (!targetObj) return;
      const { collabSchema, scale, trackItemsMap, transitionsMap } = useStore.getState();
      if (!collabSchema) return;

      const children: any[] =
        typeof targetObj.getObjects === "function" ? targetObj.getObjects() : [targetObj];

      const patch: LiveTransformState = {};
      for (const child of children) {
        const id = child.id;
        if (!id) continue;
        if (!trackItemsMap[id] && !transitionsMap[id]) continue;

        const rect = child.getBoundingRect();
        timelineGestureIds.add(id);
        patch[id] = {
          from: unitsToTimeMs(rect.left, scale.zoom),
          to: unitsToTimeMs(rect.left + rect.width, scale.zoom)
        };
      }
      if (Object.keys(patch).length > 0) broadcastLiveTransform(collabSchema.awareness, patch);
    };

    canvas.on("object:moving", broadcastTimelineGesture);
    canvas.on("object:resizing", broadcastTimelineGesture);
    canvas.on("object:modified", () => {
      if (timelineGestureIds.size === 0) return;
      timelineGestureIds.clear();
      const { collabSchema } = useStore.getState();
      if (collabSchema) clearLiveTransform(collabSchema.awareness);
    });

    const broadcastTransitionSelection = (obj: any) => {
      const { collabSchema } = useStore.getState();
      if (!collabSchema) return;
      if (obj?.type === "transition") {
        broadcastSelection(collabSchema.awareness, [obj.id]);
      }
    };

    canvas.on("selection:created", (e: any) => broadcastTransitionSelection(e.selected?.[0]));
    canvas.on("selection:updated", (e: any) => broadcastTransitionSelection(e.selected?.[0]));
    canvas.on("selection:cleared", (e: any) => {
      if (e.deselected?.[0]?.type !== "transition") return;
      const { collabSchema } = useStore.getState();
      if (collabSchema) clearSelection(collabSchema.awareness);
    });
    
    return () => {
      unsubscribeTransitionZOrder();
      canvas.purge();
      // Clear the store's reference to this now-destroyed canvas. Without
      // this, remounting Timeline (e.g. toggling mobile/desktop view) never
      // looks like a null -> non-null transition to the resync watcher in
      // useCollabDoc, so it skips re-populating the new canvas and it's
      // left blank.
      const { timeline: currentTimeline } = useStore.getState();
      if (currentTimeline === canvas) useStore.setState({ timeline: null });
    };
  }, []);

  const onClickRuler = (units: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const time = unitsToTimeMs(units, scale.zoom);
    playerRef?.current?.seekTo(Math.round((time * fps) / 1000));
  };

  const onRulerScroll = (newScrollLeft: number) => {
    // Update the timeline canvas scroll position
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollTo({ scrollLeft: newScrollLeft });
    }

    // Update the horizontal scrollbar position
    if (horizontalScrollbarVpRef.current) {
      horizontalScrollbarVpRef.current.scrollLeft = newScrollLeft;
    }

    // Update the local scroll state
    setScrollLeft(newScrollLeft);
  };

  useEffect(() => {
    const availableScroll = horizontalScrollbarVpRef.current?.scrollWidth;
    if (!availableScroll || !timeline) return;
    const canvasWidth = timeline.width;
    if (availableScroll < canvasWidth + scrollLeft) {
      timeline.scrollTo({ scrollLeft: availableScroll - canvasWidth });
    }
  }, [scale]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !collabSchema) return;

    const overlaysByClient = new Map<number, any>();
    const labelsByClient = new Map<number, any>();
    const labelBgsByClient = new Map<number, any>();
    const itemOverlaysById = new Map<string, any>();
    const resetTimers = new Map<string, ReturnType<typeof setTimeout>>();
    let activeEditors = new Map<string, RemoteActiveEditor>();
    let selectionOwners = new Map<string, RemoteActiveEditor>();
    let livePatchedIds = new Set<string>();

    const scenePresenceBordersById = new Map<string, any>();
    const scenePresenceLabelsById = new Map<string, any>();
    const scenePresenceLabelBgsById = new Map<string, any>();
    let workingInsideByItemId = new Map<string, RemoteActiveEditor[]>();

    const findItem = (id: string) => {
      const trackItem = canvas.getTrackItems().find((o: any) => o.id === id);
      if (trackItem) return trackItem;
      return canvas.getObjects().find((o: any) => o.type === "transition" && o.id === id) as any;
    };

    const applyPatch = (id: string, patch: LiveTransformState[string]) => {
      const target = findItem(id);
      if (!target || patch.from === undefined || patch.to === undefined) return;
      const zoom = useStore.getState().scale.zoom;
      target.left = timeMsToUnits(patch.from, zoom);
      target.width = timeMsToUnits(patch.to - patch.from, zoom);
      target.setCoords();
      target.dirty = true;
      canvas.requestRenderAll();
    };

    const resetToCanonicalPosition = (id: string) => {
      const target = findItem(id);
      const canonical = useStore.getState().trackItemsMap[id];
      if (!target || !canonical) return;
      const { from, to } = canonical.display ?? {};
      if (from === undefined || to === undefined) return;
      const zoom = useStore.getState().scale.zoom;
      target.left = timeMsToUnits(from, zoom);
      target.width = timeMsToUnits(to - from, zoom);
      target.setCoords();
      target.dirty = true;
    };

    const scheduleReset = (id: string) => {
      const existing = resetTimers.get(id);
      if (existing) clearTimeout(existing);
      resetTimers.set(id, setTimeout(() => {
        resetTimers.delete(id);
        resetToCanonicalPosition(id);
        canvas.requestRenderAll();
      }, 400));
    };

    const LABEL_OUTSIDE_THRESHOLD = 36;

    const drawOverlays = () => {
      const rawOccupied = new Map([...selectionOwners, ...activeEditors]);

      const idsByClient = new Map<number, string[]>();
      rawOccupied.forEach((editor, id) => {
        const ids = idsByClient.get(editor.clientId);
        if (ids) ids.push(id);
        else idsByClient.set(editor.clientId, [id]);
      });

      const occupied = new Map(
        [...rawOccupied].filter(([id, editor]) => {
          if (idsByClient.get(editor.clientId)!.length === 1) return true;
          return findItem(id)?.type !== "transition";
        })
      );

      const grouped = new Map<number, { color: string; userName?: string; ids: string[] }>();
      occupied.forEach((editor, id) => {
        const entry = grouped.get(editor.clientId);
        if (entry) entry.ids.push(id);
        else grouped.set(editor.clientId, { color: editor.color, userName: editor.userName, ids: [id] });
      });

      overlaysByClient.forEach((rect, clientId) => {
        if (!grouped.has(clientId)) {
          canvas.remove(rect);
          overlaysByClient.delete(clientId);
        }
      });
      labelsByClient.forEach((label, clientId) => {
        if (!grouped.has(clientId)) {
          canvas.remove(label);
          labelsByClient.delete(clientId);
        }
      });
      labelBgsByClient.forEach((bg, clientId) => {
        if (!grouped.has(clientId)) {
          canvas.remove(bg);
          labelBgsByClient.delete(clientId);
        }
      });

      const singleSelectionClientIds = new Set<number>();
      grouped.forEach((entry, clientId) => {
        if (entry.ids.length === 1) singleSelectionClientIds.add(clientId);
      });

      // Solo-selected scene items get their label from the unified
      // scene-presence pass below instead of the generic per-client one, so
      // it can fold in "inside" info too.
      const sceneOnEditorByItemId = new Map<string, RemoteActiveEditor>();
      occupied.forEach((editor, id) => {
        if (!singleSelectionClientIds.has(editor.clientId)) return;
        if (findItem(id)?.type === "scene") sceneOnEditorByItemId.set(id, editor);
      });

      grouped.forEach(({ color, userName, ids }, clientId) => {
        const items = ids.map(findItem).filter(Boolean);
        if (items.length === 0) return;
        const left = Math.min(...items.map((i) => i.left));
        const top = Math.min(...items.map((i) => i.top));
        const right = Math.max(...items.map((i) => i.left + i.width));
        const bottom = Math.max(...items.map((i) => i.top + i.height));
        const boxHeight = bottom - top;
        const isGroup = items.length > 1;
        const isSceneSoloSelection = !isGroup && items[0]?.type === "scene";

        if (isGroup) {
          let overlay = overlaysByClient.get(clientId);
          if (!overlay) {
            overlay = new Rect({
              selectable: false,
              evented: false,
              excludeFromExport: true,
              fill: "transparent",
              strokeWidth: 2,
              originX: "left",
              originY: "top"
            });
            canvas.add(overlay);
            overlaysByClient.set(clientId, overlay);
          }
          const groupStrokeWidth = 2;
          overlay.set({
            left: left - groupStrokeWidth / 2,
            top: top - groupStrokeWidth / 2,
            width: (right - left),
            height: (bottom - top),
            strokeWidth: groupStrokeWidth,
            stroke: color
          });
          overlay.setCoords();
          canvas.bringObjectToFront(overlay);
        } else {
          const overlay = overlaysByClient.get(clientId);
          if (overlay) {
            canvas.remove(overlay);
            overlaysByClient.delete(clientId);
          }
        }

        if (isSceneSoloSelection) {
          // This item's label is drawn by the scene-presence pass instead —
          // clear any stale per-client label so it doesn't linger.
          const staleLabel = labelsByClient.get(clientId);
          if (staleLabel) {
            canvas.remove(staleLabel);
            labelsByClient.delete(clientId);
          }
          const staleBg = labelBgsByClient.get(clientId);
          if (staleBg) {
            canvas.remove(staleBg);
            labelBgsByClient.delete(clientId);
          }
          return;
        }

        if (userName) {
          const LABEL_PAD_X = 4;
          const LABEL_PAD_TOP = 4;
          const LABEL_PAD_BOTTOM = 2;

          let label = labelsByClient.get(clientId);
          if (!label) {
            label = new FabricText(userName, {
              selectable: false,
              evented: false,
              excludeFromExport: true,
              fontSize: 11,
              fontFamily: getUIFont(),
              fontWeight: "400",
              fill: "#ffffff",
              originX: "left",
              originY: "top"
            });
            canvas.add(label);
            labelsByClient.set(clientId, label);
          }
          if (label.text !== userName) label.set({ text: userName });

          let labelBg = labelBgsByClient.get(clientId);
          if (!labelBg) {
            labelBg = new Rect({
              selectable: false,
              evented: false,
              excludeFromExport: true,
              originX: "left",
              originY: "top"
            });
            canvas.add(labelBg);
            labelBgsByClient.set(clientId, labelBg);
          }

          const bgWidth = label.width + LABEL_PAD_X * 2;
          const bgHeight = label.height + LABEL_PAD_TOP + LABEL_PAD_BOTTOM;
          const outside = boxHeight <= LABEL_OUTSIDE_THRESHOLD;
          const bgTop = outside ? top - bgHeight : top;

          labelBg.set({ left, top: bgTop, width: bgWidth, height: bgHeight, fill: color });
          labelBg.setCoords();

          label.set({ left: left + LABEL_PAD_X, top: bgTop + LABEL_PAD_TOP });
          label.setCoords();

          canvas.bringObjectToFront(labelBg);
          canvas.bringObjectToFront(label);
        }
      });

      itemOverlaysById.forEach((path, id) => {
        if (!occupied.has(id)) {
          canvas.remove(path);
          itemOverlaysById.delete(id);
        }
      });

      occupied.forEach((editor, id) => {
        const item = findItem(id);
        if (!item) return;

        if (item.type === "scene") {
          // Scene items always get their border from the unified
          // scene-presence pass below, never this generic one.
          const stale = itemOverlaysById.get(id);
          if (stale) {
            canvas.remove(stale);
            itemOverlaysById.delete(id);
          }
          return;
        }

        const radius = item.type === "transition" ? 8 : 4;
        const isSingle = singleSelectionClientIds.has(editor.clientId);
        const itemStrokeWidth = isSingle ? 2 : 1;
        const inset = itemStrokeWidth / 2;
        const d = roundedRectPathD(
          item.left + inset,
          item.top + inset,
          item.width - itemStrokeWidth,
          item.height - itemStrokeWidth,
          {
            tl: isSingle ? 0 : radius,
            tr: radius,
            br: radius,
            bl: radius
          }
        );

        const existing = itemOverlaysById.get(id);
        if (existing) canvas.remove(existing);

        const itemOverlay = new Path(d, {
          selectable: false,
          evented: false,
          excludeFromExport: true,
          fill: "transparent",
          strokeWidth: itemStrokeWidth,
          stroke: editor.color,
          originX: "left",
          originY: "top"
        });
        canvas.add(itemOverlay);
        itemOverlaysById.set(id, itemOverlay);
        canvas.bringObjectToFront(itemOverlay);
      });

      // Unified scene presence: one border + label per scene item, covering
      // "on" (selected/dragged here), "inside" (block open elsewhere), or
      // both — see formatScenePresenceLabel for the exact text rules.
      const scenePresenceIds = new Set([...sceneOnEditorByItemId.keys(), ...workingInsideByItemId.keys()]);

      scenePresenceBordersById.forEach((path, id) => {
        if (!scenePresenceIds.has(id)) {
          canvas.remove(path);
          scenePresenceBordersById.delete(id);
        }
      });
      scenePresenceLabelsById.forEach((label, id) => {
        if (!scenePresenceIds.has(id)) {
          canvas.remove(label);
          scenePresenceLabelsById.delete(id);
        }
      });
      scenePresenceLabelBgsById.forEach((bg, id) => {
        if (!scenePresenceIds.has(id)) {
          canvas.remove(bg);
          scenePresenceLabelBgsById.delete(id);
        }
      });

      scenePresenceIds.forEach((id) => {
        const item = findItem(id);
        if (!item) return;

        const onEditor = sceneOnEditorByItemId.get(id);
        const insideEditors = workingInsideByItemId.get(id) ?? [];
        const color = onEditor?.color ?? insideEditors[0]?.color ?? "#6366F1";

        const strokeWidth = 2;
        const inset = strokeWidth / 2;
        const d = roundedRectPathD(
          item.left + inset,
          item.top + inset,
          item.width - strokeWidth,
          item.height - strokeWidth,
          { tl: 0, tr: 4, br: 4, bl: 4 }
        );

        let border = scenePresenceBordersById.get(id);
        if (border) canvas.remove(border);
        border = new Path(d, {
          selectable: false,
          evented: false,
          excludeFromExport: true,
          fill: "transparent",
          strokeWidth,
          stroke: color,
          originX: "left",
          originY: "top"
        });
        canvas.add(border);
        scenePresenceBordersById.set(id, border);
        canvas.bringObjectToFront(border);

        const labelText = formatScenePresenceLabel(onEditor, insideEditors);
        const LABEL_PAD_X = 4;
        const LABEL_PAD_TOP = 4;
        const LABEL_PAD_BOTTOM = 2;

        let label = scenePresenceLabelsById.get(id);
        if (!label) {
          label = new FabricText(labelText, {
            selectable: false,
            evented: false,
            excludeFromExport: true,
            fontSize: 11,
            fontFamily: getUIFont(),
            fontWeight: "400",
            fill: "#ffffff",
            originX: "left",
            originY: "top"
          });
          canvas.add(label);
          scenePresenceLabelsById.set(id, label);
        }
        if (label.text !== labelText) label.set({ text: labelText });

        let labelBg = scenePresenceLabelBgsById.get(id);
        if (!labelBg) {
          labelBg = new Rect({
            selectable: false,
            evented: false,
            excludeFromExport: true,
            originX: "left",
            originY: "top"
          });
          canvas.add(labelBg);
          scenePresenceLabelBgsById.set(id, labelBg);
        }

        const bgWidth = label.width + LABEL_PAD_X * 2;
        const bgHeight = label.height + LABEL_PAD_TOP + LABEL_PAD_BOTTOM;
        const outside = item.height <= LABEL_OUTSIDE_THRESHOLD;
        const bgTop = outside ? item.top - bgHeight : item.top;

        labelBg.set({ left: item.left, top: bgTop, width: bgWidth, height: bgHeight, fill: color });
        labelBg.setCoords();

        label.set({ left: item.left + LABEL_PAD_X, top: bgTop + LABEL_PAD_TOP });
        label.setCoords();

        canvas.bringObjectToFront(labelBg);
        canvas.bringObjectToFront(label);
      });

      canvas.requestRenderAll();
    };
    drawOverlaysRef.current = drawOverlays;

    const clearOverlays = () => {
      overlaysByClient.forEach((rect) => canvas.remove(rect));
      overlaysByClient.clear();
      labelsByClient.forEach((label) => canvas.remove(label));
      labelsByClient.clear();
      labelBgsByClient.forEach((bg) => canvas.remove(bg));
      labelBgsByClient.clear();
      itemOverlaysById.forEach((path) => canvas.remove(path));
      itemOverlaysById.clear();
      scenePresenceBordersById.forEach((path) => canvas.remove(path));
      scenePresenceBordersById.clear();
      scenePresenceLabelsById.forEach((label) => canvas.remove(label));
      scenePresenceLabelsById.clear();
      scenePresenceLabelBgsById.forEach((bg) => canvas.remove(bg));
      scenePresenceLabelBgsById.clear();
      canvas.requestRenderAll();
    };
    (canvas as any)._presenceOverlays = { clear: clearOverlays, redraw: drawOverlays };

    const unsubTransforms = subscribeToRemoteLiveTransforms(collabSchema.awareness, (statesByClient) => {
      const merged: LiveTransformState = {};
      statesByClient.forEach(({ patches }) => Object.assign(merged, patches));
      const nextIds = new Set(Object.keys(merged));

      livePatchedIds.forEach((id) => {
        if (!nextIds.has(id)) scheduleReset(id);
      });

      nextIds.forEach((id) => {
        const t = resetTimers.get(id);
        if (t) { clearTimeout(t); resetTimers.delete(id); }
        applyPatch(id, merged[id]);
      });

      livePatchedIds = nextIds;

      activeEditors = getRemoteActiveEditors(statesByClient);
      drawOverlays();
    });

    const unsubSelections = subscribeToRemoteSelections(collabSchema.awareness, (statesByClient) => {
      selectionOwners = getRemoteSelectionOwners(statesByClient);
      drawOverlays();
    });

    const unsubWorkingInside = subscribeToRemoteWorkingInside(collabSchema.awareness, (byItemId) => {
      workingInsideByItemId = byItemId;
      useStore.getState().setWorkingInsideByItemId(byItemId);
      drawOverlays();
    });

    return () => {
      unsubTransforms();
      unsubSelections();
      unsubWorkingInside();
      useStore.getState().setWorkingInsideByItemId(new Map());
      resetTimers.forEach(clearTimeout);
      overlaysByClient.forEach((rect) => canvas.remove(rect));
      labelsByClient.forEach((label) => canvas.remove(label));
      itemOverlaysById.forEach((rect) => canvas.remove(rect));
      scenePresenceBordersById.forEach((path) => canvas.remove(path));
      scenePresenceLabelsById.forEach((label) => canvas.remove(label));
      scenePresenceLabelBgsById.forEach((bg) => canvas.remove(bg));
    };
  }, [collabSchema]);

  useEffect(() => {
    drawOverlaysRef.current();
  }, [trackItemsMap, transitionsMap, scale]);

  useEffect(() => {
    if (!collabSchema) return;
    broadcastSelection(collabSchema.awareness, activeIds);
  }, [collabSchema, activeIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyItemDetails(canvas, trackItemsMap);
    canvas.requestRenderAll();
  }, [trackItemsMap]);

  return (
    <div
      ref={timelineContainerRef}
      id="timeline-container"
      className="relative w-full overflow-hidden bg-card py-0"
      style={{
        height: `${timelineHeight}px`,
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "transparent"
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseOut={onMouseOut}
    >
      <Header
        toggleFullHeight={toggleFullHeight}
        timelineHeight={timelineHeight}
        stateManager={stateManager}
      />
      <Ruler
        onClick={onClickRuler}
        scrollLeft={scrollLeft}
        onScroll={onRulerScroll}
      />
      <Playhead scrollLeft={scrollLeft} />
      <div className="flex">
        <div
          style={{
            width: 0
          }}
          className="relative flex-none"
        />
        <div style={{ height: canvasSize.height }} className="relative flex-1">
          <div
            style={{ height: canvasSize.height }}
            ref={containerRef}
            className="absolute top-0 w-full"
          >
            <canvas id="designcombo-timeline-canvas" ref={canvasElRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
