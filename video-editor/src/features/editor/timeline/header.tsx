import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dispatch } from "@designcombo/events";
import StateManager, {
  ACTIVE_SPLIT,
  LAYER_DELETE,
  TIMELINE_SCALE_CHANGED,
  EDIT_OBJECT,
  LAYER_SELECT,
} from "@designcombo/state";
import {
  buildSelectionSnapshot,
  cloneIntoNewTracks,
  setClipboard,
  getClipboard,
  applyPlayheadAction,
  getPlayheadEdit,
  getPlayheadSide,
} from "../utils/item-actions";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import useStore from "../store/use-store";
import {
  ChevronsUpDown,
  Copy, CopyPlus,
  Lock,
  Fullscreen,
  Trash,
  ZoomIn,
  ZoomOut, EyeOff, LockOpen, Eye, VolumeOff, Volume2, Home, Scissors, ClipboardPaste,
  Component, ArrowLeft,
  MessageSquare,
  MessageSquareShare,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowLeftToLine,
  ArrowRightToLine
} from "lucide-react";
import {
  getFitZoomLevel,
  getNextZoomLevel,
  getPreviousZoomLevel,
  getZoomByIndex
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { ITimelineScaleState, ITrackItem } from "@designcombo/types";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { timeMsToUnits } from "@designcombo/timeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  makeSceneTrackItem,
  makeSceneTrack,
  isSceneItem,
  SCENE_TYPE,
  ISceneTrackItem,
} from "../types/ensemble-scene";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PLAYER_PAUSE } from "@/features/editor/constants/events";
import { useViewOnly } from "@/features/editor/hooks/use-view-only";
import { useCanComment } from "@/features/editor/hooks/use-can-comment";
import { startComment } from "@/features/editor/comments/start-comment";
import { useCommentsStore } from "@/features/editor/store/use-comments-store";
import useLayoutStore from "@/features/editor/store/use-layout-store";

const IconAddMarker = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 2.5 24 24" fill="none"
       stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag-icon lucide-tag">
    <g transform="rotate(225 12 12)">
      <path
        d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    </g>
  </svg>
);
const IconRemoveMarker = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 2.5 24 24" fill="none"
       stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="lucide lucide-tag-plus-icon lucide-tag-plus">
    <g transform="scale(-1 1) translate(-24 0) rotate(225 12 12)">
      <path
        d="m16.5 6.5-3.914-3.914A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l1.79-1.79" />
      <path d="M15 13h8" />
      <path d="M19 9v8" />
    </g>
  </svg>
);

const IconSplit = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="lucide lucide-square-split-horizontal">
    <path d="M12 2v20" />
    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
  </svg>
);
const IconDeleteLeft = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="lucide lucide-square-split-horizontal">
    <path d="M12 2v20" />
    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeDasharray="2 4" />
  </svg>
);
const IconDeleteRight = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="lucide lucide-square-split-horizontal">
    <path d="M12 2v20" />
    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" strokeDasharray="2 4" />
    <path d="M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
  </svg>
);

const Header = ({ toggleFullHeight, timelineHeight, stateManager }: {
  toggleFullHeight: () => void;
  timelineHeight: number;
  stateManager: StateManager;
}) => {
  const [playing, setPlaying] = useState(false);
  const {
    duration,
    fps,
    scale,
    playerRef,
    activeIds,
    timeline,
    trackItemsMap,
    tracks,
    markers,
    addMarker,
    removeMarker,
    activeSceneBlockId,
    currentBlockName,
    closeScene,
    saveStatus,
    compactStatus,
    workingInsideByItemId,
  } = useStore();

  const isSaving = saveStatus === "saving" || compactStatus === "compacting";
  const isLargeScreen = useIsLargeScreen();
  const viewOnly = useViewOnly();
  const canComment = useCanComment();

  useUpdateAnsestors({ playing, playerRef });

  const currentFrame = useCurrentPlayerFrame(playerRef);
  const commentThreads = useCommentsStore((s) => s.data?.threads);
  // same frame match the comments panel uses for "focused"
  const activeCommentThread = (commentThreads ?? []).find(
    (t) => t.timeMs != null && Math.round((t.timeMs * fps) / 1000) === currentFrame
  );
  const isCommentActive = !!activeCommentThread;
  const setActiveRightItem = useLayoutStore((s) => s.setActiveRightItem);
  const setFocusedCommentId = useCommentsStore((s) => s.setFocusedId);

  // same behavior as clicking a comment marker in the ruler
  const openActiveComment = () => {
    if (!activeCommentThread || activeCommentThread.timeMs == null) return;
    playerRef?.current?.seekTo(Math.round((activeCommentThread.timeMs * fps) / 1000));
    setFocusedCommentId(activeCommentThread.id);
    setActiveRightItem("comments");
  };
  const timelineOffsetX = useTimelineOffsetX();

  const doActiveDelete = () => {
    dispatch(LAYER_DELETE);
  };

  const doActiveSplit = () => {
    if (activeIds.length !== 1) return;
    if (activeItems.some(item => isSceneItem(item.type))) return;

    const time = getCurrentTime();
    dispatch(ACTIVE_SPLIT, { payload: {}, options: { time } });
    dispatch(LAYER_SELECT, { payload: { trackItemIds: [] } });
  };

  const doActiveCopy = () => {
    if (!activeIds.length) return;
    const { trackItemsMap, transitionsMap, tracks } = useStore.getState();
    const snapshot = buildSelectionSnapshot(activeIds, { trackItemsMap, transitionsMap, tracks });
    if (snapshot.items.length) setClipboard(snapshot);
  };

  const doActiveCut = () => {
    if (!activeIds.length) return;
    const { trackItemsMap, transitionsMap, tracks } = useStore.getState();
    const snapshot = buildSelectionSnapshot(activeIds, { trackItemsMap, transitionsMap, tracks });
    if (snapshot.items.length) setClipboard(snapshot);
    dispatch(LAYER_DELETE);
  };

  const doActivePaste = () => {
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
  };

  const doActiveDuplicate = () => {
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
  };

  const changeScale = (newScale: ITimelineScaleState) => {
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
    playerRef?.current?.addEventListener("play", () => {
      setPlaying(true);
    });
    playerRef?.current?.addEventListener("pause", () => {
      setPlaying(false);
    });
    return () => {
      playerRef?.current?.removeEventListener("play", () => {
        setPlaying(true);
      });
      playerRef?.current?.removeEventListener("pause", () => {
        setPlaying(false);
      });
    };
  }, [playerRef]);

  const isFull = timelineHeight >= window.innerHeight;
  const activeItems = activeIds.map(id => trackItemsMap[id]).filter(Boolean);
  const selectionStart = activeIds.length > 0
    ? Math.min(...activeIds.map(id => trackItemsMap[id]?.display.from ?? 0))
    : null;
  const selectionDuration = activeIds.length > 0
    ? Math.max(...activeIds.map(id => trackItemsMap[id]?.display.to ?? 0)) -
    Math.min(...activeIds.map(id => trackItemsMap[id]?.display.from ?? 0))
    : null;
  const hasProtectedSceneItem = activeItems.some(
    (item) => isSceneItem(item.type) && workingInsideByItemId.has(item.id)
  );

  const isHidden = activeItems.length > 0 && activeItems
    .filter(item => item.type !== "audio")
    .every(item => item.details?.hidden === true);
  const isMuted = activeItems.length > 0 && activeItems
    .filter(item => item.type === "audio" || item.type === "video" || isSceneItem(item.type))
    .every(item => item.details?.volume === 0);
  const isLocked = activeItems.length > 0 && activeItems
    .every(item => item.details?.locked === true);

  const toggleItemHide = () => {
    const newHidden = !isHidden;
    const payload = activeIds.reduce((acc, id) => {
      if (trackItemsMap[id]?.type === "audio") return acc;
      acc[id] = { details: { hidden: newHidden } };
      return acc;
    }, {} as Record<string, any>);

    dispatch(EDIT_OBJECT, { payload });
  };

  const toggleItemMute = () => {
    const newVolume = isMuted ? 100 : 0;
    const payload = activeIds.reduce((acc, id) => {
      const type = trackItemsMap[id]?.type;
      if (type !== "audio" && type !== "video" && !isSceneItem(type ?? "")) return acc;
      acc[id] = { details: { volume: newVolume } };
      return acc;
    }, {} as Record<string, any>);

    dispatch(EDIT_OBJECT, { payload });
  };

  const toggleItemLock = () => {
    const newLocked = !isLocked;
    const payload = activeIds.reduce((acc, id) => {
      acc[id] = { details: { locked: newLocked } };
      return acc;
    }, {} as Record<string, any>);

    dispatch(EDIT_OBJECT, { payload });
  };

  const currentTimeMs = (currentFrame / fps) * 1000;
  const isMarkerActive = markers.some(
    (m) => Math.abs(m.timeMs - currentTimeMs) < (1000 / fps - 1)
  );

  const toggleMarker = () => {
    const existing = markers.find(
      (m) => Math.abs(m.timeMs - currentTimeMs) < (1000 / fps - 1)
    );
    existing ? removeMarker(existing.id) : addMarker(currentTimeMs);
  };

  const isTransitionSelected = activeIds.length > 0 && activeItems.length === 0;

  // single, unlocked, non-scene item -> extend / move to playhead buttons
  const playheadItem =
    activeIds.length === 1 &&
    !isLocked &&
    !isTransitionSelected &&
    !activeItems.some((item) => isSceneItem(item.type))
      ? activeItems[0]
      : null;
  const playheadSide = playheadItem ? getPlayheadSide(playheadItem, currentTimeMs) : "right";
  const canExtendToPlayhead =
    !!playheadItem &&
    !!getPlayheadEdit("extend", playheadItem, currentTimeMs, { trackItemsMap, tracks });

  const doExtendToPlayhead = () => {
    applyPlayheadAction(stateManager, "extend", getCurrentTime(), useStore.getState());
  };

  const doMoveToPlayhead = () => {
    applyPlayheadAction(stateManager, "move", getCurrentTime(), useStore.getState());
  };

  const doDeleteLeft = () => {
    applyPlayheadAction(stateManager, "deleteLeft", getCurrentTime(), useStore.getState());
  };

  const doDeleteRight = () => {
    applyPlayheadAction(stateManager, "deleteRight", getCurrentTime(), useStore.getState());
  };

  const doAddScene = () => {
    const { trackItemsMap, trackItemIds, tracks, duration, projectId, size } = useStore.getState();
    const time = getCurrentTime();
    const SCENE_DEFAULT_DURATION_MS = 5000;
    const id = crypto.randomUUID();

    const sceneItem: ISceneTrackItem = {
      id,
      type: SCENE_TYPE,
      name: "Scene",
      display: { from: time, to: time + SCENE_DEFAULT_DURATION_MS },
      metadata: {},
      details: {
        blockId: crypto.randomUUID(),
        name: "Scene",
        width: size.width,
        height: size.height,
        top: 0,
        left: 0,
      },
    };

    let targetTrack = tracks.find(
      (t) =>
        isSceneItem(t.type) &&
        !t.static &&
        !t.items.some((itemId) => {
          const other = trackItemsMap[itemId];
          return (
            !!other &&
            other.display.from < sceneItem.display.to &&
            other.display.to > sceneItem.display.from
          );
        }),
    );

    let nextTracks = tracks;
    if (!targetTrack) {
      targetTrack = makeSceneTrack({
        id: crypto.randomUUID(),
        type: SCENE_TYPE,
        items: [],
        metadata: {},
        accepts: [SCENE_TYPE],
        index: 0,
        magnetic: false,
        static: false,
      });
      nextTracks = [targetTrack, ...tracks.map((t) => ({ ...t, index: (t.index ?? 0) + 1 }))];
    }

    const targetTrackId = targetTrack.id;
    nextTracks = nextTracks.map((t) =>
      t.id === targetTrackId ? { ...t, items: [...t.items, id] } : t,
    );

    stateManager.updateState(
      {
        trackItemsMap: { ...trackItemsMap, [id]: makeSceneTrackItem(sceneItem) },
        trackItemIds: [...trackItemIds, id],
        tracks: nextTracks,
        duration: Math.max(duration, sceneItem.display.to),
      },
      { updateHistory: true, kind: "update" },
    );

    // Fire-and-forget: the scene is already usable locally; if this hasn't
    // landed by the time someone double-clicks in, there's just nothing to
    // load yet, same as any other race between a write and a fast re-read.
    fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId: sceneItem.details.blockId,
        projectId,
        name: sceneItem.details.name,
        width: size.width,
        height: size.height,
      }),
    }).catch((err) => {
      console.error("doAddScene: failed to create block record", err);
    });
  };

  const goHome = () => {
    if (isSaving) return;
    stateManager.updateState({ activeIds: [] }, { updateHistory: false, kind: "layer:selection" });
    dispatch(PLAYER_PAUSE);
    closeScene();
  };

  return (
    <div
      id="timeline-header"
      style={{
        position: "relative",
        height: "50px",
        flex: "none"
      }}
    >
      <div
        style={{
          position: "absolute",
          height: 50,
          width: "100%",
          display: "flex",
          alignItems: "center"
        }}
      >
        <div
          style={{
            height: 36,
            width: "100%",
            display: "grid",
            gridTemplateColumns: isLargeScreen
              ? "1fr 260px 1fr"
              : "1fr 1fr 1fr",
            alignItems: "center"
          }}
        >
          <div className="flex px-2 pr-4 items-center divide-x-2 divide-border">
            {activeSceneBlockId && (
              <div className="flex items-center gap-1 px-2 first:pl-0 last:pr-0 h-5">
                <Tooltip delayDuration={10}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={!isSaving ? goHome : undefined}
                      variant={"ghost"}
                      size={"icon"}
                      className={isSaving ? "opacity-50 cursor-default" : undefined}
                    >
                      <ArrowLeft size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                    className={"flex gap-2 items-center"}
                  >
                    {isSaving ? "Saving…" : (<>Go back <Kbd>H</Kbd></>)}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {!viewOnly && (
              <>
                {activeIds.length > 0 && !isTransitionSelected && (
                  <div className="flex items-center gap-1 px-2 first:pl-0 last:pr-0 h-5">
                    {activeIds.length > 0 && !isTransitionSelected && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button
                            disabled={!activeIds.length}
                            onClick={toggleItemLock}
                            variant={isLocked ? "secondary" : "ghost"}
                            size={"icon"}
                            className={`disabled:opacity-0 disabled:pointer-events-none ${isLocked ? "text-primary hover:text-primary" : ""}`}
                          >
                            {isLocked ? <Lock size={16} /> : <LockOpen size={16} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                          {isLocked ? "Unlock" : "Lock"}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {activeItems.some(item => item.type !== "audio") && !isLocked && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button
                            disabled={!activeIds.length || isLocked}
                            onClick={toggleItemHide}
                            variant={isHidden ? "secondary" : "ghost"}
                            size={"icon"}
                            className={`disabled:opacity-0 disabled:pointer-events-none ${isHidden ? "text-primary hover:text-primary" : ""}`}
                          >
                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                          {isHidden ? "Show" : "Hide"}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {activeItems.some(item =>
                        item.type === "audio" ||
                        item.type === "video" ||
                        isSceneItem(item.type))
                      && !isLocked && (
                        <Tooltip delayDuration={10}>
                          <TooltipTrigger asChild>
                            <Button
                              disabled={!activeIds.length || isLocked}
                              onClick={toggleItemMute}
                              variant={isMuted ? "secondary" : "ghost"}
                              size={"icon"}
                              className={`disabled:opacity-0 disabled:pointer-events-none ${isMuted ? "text-primary hover:text-primary" : ""}`}
                            >
                              {isMuted ? <VolumeOff size={16} /> : <Volume2 size={16} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                            {isMuted ? "Unmute" : "Mute"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                  </div>
                )}

                {playheadItem && (
                  <div className="flex items-center gap-1 px-2 first:pl-0 last:pr-0 h-5">
                    {activeIds.length === 1 && !isLocked
                      && !isTransitionSelected
                      && !activeItems.some(item => isSceneItem(item.type))
                      && (
                        <Tooltip delayDuration={10}>
                          <TooltipTrigger asChild>
                            <Button
                              disabled={!activeIds.length || isLocked}
                              onClick={doActiveSplit}
                              variant={"ghost"}
                              size={"icon"}
                              className="disabled:opacity-0 disabled:pointer-events-none"
                            >
                              <IconSplit size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                            className={"flex gap-2 items-center"}
                          >
                            Split
                            <KbdGroup>
                              <Kbd>Ctrl</Kbd>
                              <span>+</span>
                              <Kbd>B</Kbd>
                            </KbdGroup>
                          </TooltipContent>
                        </Tooltip>
                      )}

                    {playheadItem && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button onClick={doDeleteLeft} variant={"ghost"} size={"icon"}>
                            <IconDeleteLeft size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                          className={"flex gap-2 items-center"}
                        >
                          Delete left <Kbd>Q</Kbd>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {playheadItem && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button onClick={doDeleteRight} variant={"ghost"} size={"icon"}>
                            <IconDeleteRight size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                          className={"flex gap-2 items-center"}
                        >
                          Delete right <Kbd>W</Kbd>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {playheadItem && canExtendToPlayhead && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button onClick={doExtendToPlayhead} variant={"ghost"} size={"icon"}>
                            {playheadSide === "left" ? <ArrowLeftFromLine size={16} /> : <ArrowRightFromLine size={16} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                          className={"flex gap-2 items-center"}
                        >
                          Extend to playhead
                          <KbdGroup>
                            <Kbd>Shift</Kbd>
                            <span>+</span>
                            <Kbd>E</Kbd>
                          </KbdGroup>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {playheadItem && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button onClick={doMoveToPlayhead} variant={"ghost"} size={"icon"}>
                            {playheadSide === "left" ? <ArrowLeftToLine size={16} /> : <ArrowRightToLine size={16} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                          className={"flex gap-2 items-center"}
                        >
                          Move to playhead
                          <KbdGroup>
                            <Kbd>Ctrl</Kbd>
                            <span>+</span>
                            <Kbd>Shift</Kbd>
                            <span>+</span>
                            <Kbd>E</Kbd>
                          </KbdGroup>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1 px-2 first:pl-0 last:pr-0 h-5">
                  {activeIds.length > 0 && !isTransitionSelected && (
                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!activeIds.length}
                          onClick={doActiveCopy}
                          variant={"ghost"}
                          size={"icon"}
                          className="disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <Copy size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                        className={"flex gap-2 items-center"}
                      >
                        Copy
                        <KbdGroup>
                          <Kbd>Ctrl</Kbd>
                          <span>+</span>
                          <Kbd>C</Kbd>
                        </KbdGroup>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {activeIds.length > 0 && !isTransitionSelected && (
                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!activeIds.length}
                          onClick={doActiveDuplicate}
                          variant={"ghost"}
                          size={"icon"}
                          className="disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <CopyPlus size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                        className={"flex gap-2 items-center"}
                      >
                        Duplicate
                        <KbdGroup>
                          <Kbd>Ctrl</Kbd>
                          <span>+</span>
                          <Kbd>D</Kbd>
                        </KbdGroup>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {activeIds.length > 0 && !isLocked && !isTransitionSelected && (
                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!activeIds.length || isLocked}
                          onClick={doActiveCut}
                          variant={"ghost"}
                          size={"icon"}
                          className="disabled:opacity-0 disabled:pointer-events-none"
                        >
                          <Scissors size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                        className={"flex gap-2 items-center"}
                      >
                        Cut
                        <KbdGroup>
                          <Kbd>Ctrl</Kbd>
                          <span>+</span>
                          <Kbd>X</Kbd>
                        </KbdGroup>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip delayDuration={10}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={doActivePaste}
                        variant={"ghost"}
                        size={"icon"}
                        className="disabled:opacity-0 disabled:pointer-events-none"
                      >
                        <ClipboardPaste size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                      className={"flex gap-2 items-center"}
                    >
                      Paste
                      <KbdGroup>
                        <Kbd>Ctrl</Kbd>
                        <span>+</span>
                        <Kbd>V</Kbd>
                      </KbdGroup>
                    </TooltipContent>
                  </Tooltip>

                  {activeIds.length > 0 && !isLocked && (
                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!activeIds.length || isLocked}
                          onClick={!hasProtectedSceneItem ? doActiveDelete : undefined}
                          variant={"ghost"}
                          size={"icon"}
                          className={cn(
                            "disabled:opacity-0 disabled:pointer-events-none",
                            hasProtectedSceneItem && "opacity-50 cursor-default"
                          )}
                        >
                          <Trash size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                        className={"flex gap-2 items-center"}
                      >
                        {hasProtectedSceneItem ? "Someone's working inside" : (<>Delete <KbdGroup><Kbd>Backspace</Kbd><span>/</span><Kbd>Del</Kbd></KbdGroup></>)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </>
            )}

            {(!viewOnly || canComment) && (
              <div className="flex items-center gap-1 px-2 first:pl-0 last:pr-0 h-5">
                {!viewOnly && (
                  <>
                    {!activeSceneBlockId && (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <Button onClick={doAddScene} variant={"ghost"} size={"icon"}>
                            <Component size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                          className={"flex gap-2 items-center"}
                        >
                          Add scene <Kbd>S</Kbd>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={toggleMarker}
                          variant={"ghost"}
                          size={"icon"}
                          className="disabled:opacity-0 disabled:pointer-events-none"
                          style={isMarkerActive ? { color: "#f43f5e" } : undefined}
                        >
                          {isMarkerActive ? <IconRemoveMarker size={16} /> : <IconAddMarker size={16} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                        className={"flex gap-2 items-center"}
                      >
                        {isMarkerActive ? "Remove marker" : "Add marker"} <Kbd>M</Kbd>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}

                {canComment && (
                  <Tooltip delayDuration={10}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={isCommentActive ? openActiveComment : startComment}
                        variant={"ghost"}
                        size={"icon"}
                        className={isCommentActive ? "text-primary hover:text-primary" : ""}
                      >
                        {isCommentActive ? <MessageSquareShare size={16} /> : <MessageSquare size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                      className={"flex gap-2 items-center"}
                    >
                      {isCommentActive ? "Open comments" : <>Add comment <Kbd>C</Kbd></>}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1">
            {!(activeIds.length > 0) && (
              <Breadcrumb>
                <BreadcrumbList className="flex-nowrap">
                  <BreadcrumbItem>
                    {activeSceneBlockId ? (
                      <Tooltip delayDuration={10}>
                        <TooltipTrigger asChild>
                          <BreadcrumbLink asChild>
                            <button
                              onClick={!isSaving ? goHome : undefined}
                              className={cn(
                                "text-sm hover:text-primary",
                                isSaving && "opacity-50 cursor-default hover:text-inherit"
                              )}
                            >
                              Home
                            </button>
                          </BreadcrumbLink>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" sideOffset={1}
                                        className={"flex gap-2 items-center"}>
                          {isSaving ? "Saving…" : (<>Go home <Kbd>H</Kbd></>)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <BreadcrumbPage className="text-sm font-semibold"></BreadcrumbPage>
                    )}
                  </BreadcrumbItem>

                  {activeSceneBlockId && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-sm font-semibold flex items-center gap-1.5">
                          <Component size={14} />
                          {currentBlockName || "Scene"}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>

          <div className="flex items-center justify-end px-2 pl-4 gap-1">
            <ZoomControl
              scale={scale}
              onChangeTimelineScale={changeScale}
              duration={duration}
              isFull={isFull}
              selectionStart={selectionStart}
              selectionDuration={selectionDuration}
            />

            <div className="h-5 w-px mx-1 bg-border" />

            <Tooltip delayDuration={10}>
              <TooltipTrigger asChild>
                <Button size={"icon"} variant={"ghost"} onClick={toggleFullHeight}>
                  <ChevronsUpDown size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
                className={"flex gap-2 items-center"}
              >
                Toggle timeline height <Kbd>`</Kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration,
  isFull,
  selectionStart,
  selectionDuration,
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
  isFull: boolean;
  selectionStart: number | null;
  selectionDuration: number | null;
}) => {
  const [localValue, setLocalValue] = useState(scale.index);
  const timelineOffsetX = useTimelineOffsetX();

  useEffect(() => {
    setLocalValue(scale.index);
  }, [scale.index]);

  const onZoomOutClick = () => {
    const previousZoom = getPreviousZoomLevel(scale);
    onChangeTimelineScale(previousZoom);
  };

  const onZoomInClick = () => {
    const nextZoom = getNextZoomLevel(scale);
    onChangeTimelineScale(nextZoom);
  };

  const onZoomFitClick = () => {
    const targetDuration = selectionDuration ?? duration;
    const fitZoom = getFitZoomLevel(targetDuration, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);

    Promise.resolve().then(() => {
      const { timeline } = useStore.getState();
      const scrollLeft = selectionStart !== null
        ? timeMsToUnits(selectionStart, fitZoom.zoom)
        : 0;
      timeline?.scrollTo({ scrollLeft: Math.max(0, scrollLeft) });
    });
  };

  return (
    <div className="flex items-center justify-end">
      <div className="flex gap-1">
        <Tooltip delayDuration={10}>
          <TooltipTrigger asChild>
            <Button size={"icon"} variant={"ghost"} onClick={onZoomOutClick}>
              <ZoomOut size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
            className={"flex gap-2 items-center"}
          >
            Zoom out
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <span>+</span>
              <Kbd>-</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>

        <Slider
          className="w-28 hidden lg:flex"
          value={[localValue]}
          min={0}
          max={34}
          step={1}
          onValueChange={(e) => {
            setLocalValue(e[0]); // Update local state
            const zoom = getZoomByIndex(e[0]);
            onChangeTimelineScale(zoom);
          }}
          // onValueCommit={() => {
          //   const zoom = getZoomByIndex(localValue);
          //   onChangeTimelineScale(zoom); // Propagate value to parent when user commits change
          // }}
        />
        <Tooltip delayDuration={10}>
          <TooltipTrigger asChild>
            <Button size={"icon"} variant={"ghost"} onClick={onZoomInClick}>
              <ZoomIn size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
            className={"flex gap-2 items-center"}
          >
            Zoom in
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <span>+</span>
              <Kbd>+</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={10}>
          <TooltipTrigger asChild>
            <Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"}>
              <Fullscreen size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={isFull ? "bottom" : "top"} align="center" sideOffset={1}
            className={"flex gap-2 items-center"}
          >
            Zoom to fit
            <KbdGroup>
              <Kbd>Shift</Kbd>
              <span>+</span>
              <Kbd>Z</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default Header;