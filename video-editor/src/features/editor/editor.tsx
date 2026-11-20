"use client";
import { MarketAssetLicensing } from "./components/market-asset-licensing";
import Timeline from "./timeline";
import { EditorWalkthrough } from "./components/editor-walkthrough";
import useStore from "./store/use-store";
import { useTourDemo } from "./store/use-tour-demo";
import Navbar from "./navbar";
import { PortfolioBand, usePortfolioPicker } from "./portfolio/portfolio-picker";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD, LAYER_DELETE } from "@designcombo/state";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "./constants/constants";
import MenuList from "./menu-list";
import { ControlItem } from "./control-item";
import { MenuItem } from "./menu-item";
import CropModal from "@/features/editor/modals/crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import { design } from "./mock";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Loader2,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeOff
} from "lucide-react";
import { frameToTimeString, timeToString } from "./utils/time";
import { useCurrentPlayerFrame } from "@/features/editor/hooks/use-current-frame";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import useUpdateAnsestors from "@/features/editor/hooks/use-update-ansestors";
import { PLAYER_PAUSE, PLAYER_PLAY } from "@/features/editor/constants/events";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { timeMsToUnits } from "@designcombo/timeline";
import { useTimelineOffsetX } from "@/features/editor/hooks/use-timeline-offset";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { seedDefaultFont } from "@/features/editor/utils/seed-default-font";
import { scrollTimelineToFrame } from "@/features/editor/utils/timeline-scroll";
import { useCollabDoc } from "@/features/editor/hooks/use-collab-doc";
import { CollabTarget } from "@/features/editor/collab/collab-target";
import { useSceneContentBroadcast } from "@/features/editor/hooks/use-scene-content-broadcast";
import { broadcastUserRole } from "@/features/editor/collab/live-transform";
import { RightPanelContent } from "@/features/editor/right-panel-content";
import { canEditWithRole, EditorRole } from "@/features/editor/types/editor-role";
import { useEditorRole } from "@/features/editor/hooks/use-editor-role";
import { CanCommentProvider, canCommentWithRole, useCanComment } from "@/features/editor/hooks/use-can-comment";
import { ViewOnlyProvider } from "@/features/editor/hooks/use-view-only";
import { useProjectFonts } from "@/features/editor/hooks/use-project-fonts";
import SceneRemovedModal from "./modals/scene-removed-modal";
import { useCommentsStore } from "@/features/editor/store/use-comments-store";
import { useSnapshotPreview, useSnapshotDocument } from "./hooks/use-snapshot-preview";
import { installOptimisticAdds } from "./utils/optimistic-add";

// ts not getting used
const stateManager = new StateManager({
  size: {
    width: 1920,
    height: 1080,
  },
});

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
  </svg>
);
const IconPlayerPauseFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
  </svg>
);

const ScenePlayer = ({ sceneRef, playerRef, stateManager, isLargeScreen, viewOnly }: any) => {
  const insideSample = useTourDemo(s => s.insideScene);
  const { fps, duration, markers, timeline, scale, trackItemIds, muted, setMuted, activeSceneBlockId } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [playing, setPlaying] = useState(false);
  const timelineOffsetX = useTimelineOffsetX();
  const offsetX = TIMELINE_OFFSET_CANVAS_LEFT + timelineOffsetX;
  useUpdateAnsestors({ playing, playerRef });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    playerRef?.current?.addEventListener("play", onPlay);
    playerRef?.current?.addEventListener("pause", onPause);

    return () => {
      playerRef?.current?.removeEventListener("play", onPlay);
      playerRef?.current?.removeEventListener("pause", onPause);
    };
  }, [playerRef?.current]);

  const handlePlay = () => dispatch(PLAYER_PLAY);
  const handlePause = () => dispatch(PLAYER_PAUSE);

  const durationFrames = Math.round((duration / 1000) * fps);

  // comment markers live in the comments store, not the ydoc-backed `markers`
  const commentTimes = (useCommentsStore.getState().data?.threads ?? [])
    .filter((t) => t.timeMs != null)
    .map((t) => ({ timeMs: t.timeMs as number }));

  const sortedMarkers = [...markers, ...commentTimes]
    .map((m) => ({ frame: Math.round((m.timeMs / 1000) * fps) }))
    .sort((a, b) => a.frame - b.frame);

  const prevMarker = [...sortedMarkers].reverse().find((m) => m.frame < currentFrame);
  const nextMarker = sortedMarkers.find((m) => m.frame > currentFrame);

  const handleJumpToPrev = () => {
    const frame = isLargeScreen && prevMarker ? prevMarker.frame : 0;
    playerRef?.current?.seekTo(frame);
    scrollTimelineToFrame(frame, prevMarker ? "marker" : "start", timelineOffsetX);
  };
  const handleJumpToNext = () => {
    const frame = isLargeScreen && nextMarker ? nextMarker.frame : durationFrames;
    playerRef?.current?.seekTo(frame);
    scrollTimelineToFrame(frame, nextMarker ? "marker" : "end", timelineOffsetX);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimeoutRef.current);
    if (isFullscreen) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    return () => clearTimeout(hideTimeoutRef.current);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      sceneContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleMute = () => {
    const newMuted = !muted;
    playerRef?.current?.setVolume(newMuted ? 0 : 1);
    setMuted(newMuted);
  };

  return (
    <div
      ref={sceneContainerRef}
      data-editor-tour="canvas"
      data-scene-container=""
      className="relative flex min-h-0 min-w-0 flex-col w-full h-full bg-card"
      onMouseMove={handleMouseMove}
      onPointerDown={handleMouseMove}
    >
      {!isLargeScreen && !isFullscreen && (
        <div className="relative z-10 shrink-0 bg-primary text-black text-xs font-medium text-center py-1.5 px-2">
          Mobile preview is view only
        </div>
      )}

      <div className={cn("min-h-0 flex-1 relative overflow-hidden", insideSample && "[&>:not([data-tour-empty-preview])]:invisible")}>
        <CropModal />
        <MarketAssetLicensing>
        {!isLargeScreen && trackItemIds.length === 0 ? (
          <div
            className="w-full h-full flex items-center justify-center text-center px-6 text-sm text-muted-foreground">
            {activeSceneBlockId
              ? "The scene is currently empty, no preview available"
              : "The project is currently empty, no preview available"}
          </div>
        ) : (
          <Scene ref={sceneRef} stateManager={stateManager} viewOnly={viewOnly} />
        )}
        </MarketAssetLicensing>
        {insideSample && <div data-tour-empty-preview className="absolute inset-0 flex items-center justify-center bg-card text-sm text-muted-foreground">
          The scene is currently empty, no preview available
        </div>}
      </div>

      <div data-editor-tour="preview-controls" className={cn(
        "relative z-20 grid shrink-0 grid-cols-3 items-center p-2 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-card transition-opacity duration-300",
        isFullscreen && " pt-2 absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm",
        isFullscreen && isLargeScreen && !showControls && "opacity-0 pointer-events-none"
      )}>
        <div className="text-xs flex items-center gap-1 px-2">
        <span
          className="font-semibold text-zinc-200"
          id="video-current-time"
          data-current-time={currentFrame / fps}
        >
          {frameToTimeString({ frame: insideSample ? 0 : currentFrame }, { fps })}
        </span>
          <span className="text-zinc-500">/</span>
          <span className="text-muted-foreground">
          {timeToString({ time: insideSample ? 0 : duration })}
        </span>
        </div>

        <div className="flex justify-center gap-0.5 sm:gap-1">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="size-8 sm:size-9"
                aria-label={isLargeScreen && prevMarker ? "Jump to last marker" : "Jump to start"}
                onClick={handleJumpToPrev}
                disabled={trackItemIds.length === 0 || currentFrame === 0}
                variant={"ghost"}
                size={"icon"}>
                <SkipBack size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {isLargeScreen && prevMarker ? (
                <>
                  Jump to last marker
                  <KbdGroup>
                    <Kbd>M</Kbd>
                    <span>+</span>
                    <Kbd>🡠</Kbd>
                  </KbdGroup>
                </>
              ) : (
                <>
                  Jump to start <Kbd>Home</Kbd>
                </>
              )}
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="size-8 sm:size-9"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => { playing ? handlePause() : handlePlay(); }}
                disabled={trackItemIds.length === 0}
                variant={"ghost"}
                size={"icon"}>
                {playing ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {playing ? "Pause" : "Play"} <Kbd>Space</Kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="size-8 sm:size-9"
                aria-label={isLargeScreen && nextMarker ? "Jump to next marker" : "Jump to end"}
                onClick={handleJumpToNext}
                disabled={trackItemIds.length === 0 || currentFrame >= durationFrames}
                variant={"ghost"}
                size={"icon"}>
                <SkipForward size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {isLargeScreen && nextMarker ? (
                <>
                  Jump to next marker
                  <KbdGroup>
                    <Kbd>M</Kbd>
                    <span>+</span>
                    <Kbd>🡢</Kbd>
                  </KbdGroup>
                </>
              ) : (
                <>
                  Jump to end <Kbd>End</Kbd>
                </>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex justify-end gap-0.5 sm:gap-1">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="size-8 sm:size-9"
                aria-label={muted ? "Unmute audio" : "Mute audio"}
                onClick={handleMute}
                disabled={trackItemIds.length === 0}
                variant={"ghost"}
                size={"icon"}>
                {muted ? <VolumeOff size={16} /> : <Volume2 size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {muted ? "Unmute" : "Mute"}
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>M</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="size-8 sm:size-9"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                onClick={handleFullscreen}
                disabled={trackItemIds.length === 0}
                variant={"ghost"}
                size={"icon"}>
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {isFullscreen ? "Exit full screen" : "Full screen"} <Kbd>F</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

const Panels = ({
  sceneRef,
  playerRef,
  stateManager,
  trackItem,
  loaded,
  isLargeScreen,
  viewOnly,
  timelineLoading,
}: any) => {
  const { showMenuItem: menuItemOpen, setControlsPanelRef } = useLayoutStore();
  const canComment = useCanComment();
  const portfolio = usePortfolioPicker();
  const showMenuItem = menuItemOpen && !viewOnly;

  const { activeSceneBlockId, timelineHeight, timelineMaximized } = useStore();
  const menuPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const controlsPanelRef = useRef<HTMLDivElement>(null);

  // Forces Timeline to unmount/remount on scene switch so its store `timeline`
  // ref goes null -> non-null again, which is what the resync watcher in
  // useCollabDoc needs to see to repopulate the canvas for the new doc.
  const timelineKey = activeSceneBlockId ?? "root";

  useEffect(() => {
    if (showMenuItem) {
      menuPanelRef.current?.resize(35);
      rightPanelRef.current?.resize(30);
    } else {
      menuPanelRef.current?.collapse();
      rightPanelRef.current?.resize(25);
    }
  }, [showMenuItem]);

  useEffect(() => {
    setControlsPanelRef(controlsPanelRef);
  }, []);

  // Mobile stays preview-only regardless of role — no timeline/controls UI
// built for that viewport yet.
  if (!isLargeScreen) {
    return (
      <div className="relative flex min-h-0 min-w-0 h-full w-full flex-col bg-background">
        <ScenePlayer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} isLargeScreen={isLargeScreen} viewOnly={viewOnly} />
        {portfolio && <PortfolioBand />}
        <div aria-hidden inert style={{
          position: "absolute",
          top: -99999,
          left: -99999,
          width: 1200,
          height: 300,
          pointerEvents: "none"
        }}>
          <Timeline key={timelineKey} stateManager={stateManager} readOnly />
          <MenuItem />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex-1 min-h-0 relative overflow-hidden w-full">
        <div className="flex h-full flex-1">
          {!viewOnly && (
            <>
              <div data-editor-tour="menus" className="flex w-[54px] h-full bg-card border-r border-border/80">
                <MenuList />
              </div>
              <Separator orientation="vertical" />
            </>
          )}

          {portfolio ? (
            <ScenePlayer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} isLargeScreen={isLargeScreen} viewOnly />
          ) : <ResizablePanelGroup direction="horizontal" className="w-full h-full overflow-hidden">
            <ResizablePanel
              ref={menuPanelRef}
              collapsible
              collapsedSize={0}
              defaultSize={showMenuItem ? 35 : 0}
              minSize={30}
              maxSize={40}
              className={showMenuItem ? "" : "hidden"}
            >
              <MenuItem />
            </ResizablePanel>
            <ResizableHandle className={cn("bg-border/90", !showMenuItem && "hidden")} />

            <ResizablePanel
              defaultSize={showMenuItem ? 40 : 75}
              minSize={showMenuItem ? 35 : 55}
              maxSize={showMenuItem ? 45 : 75}
              className="relative bg-card min-w-0"
            >
              <ScenePlayer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager}
                           isLargeScreen={isLargeScreen} viewOnly={viewOnly} />
            </ResizablePanel>

            <ResizableHandle className="bg-border/90" />
            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={25}
              minSize={25}
              maxSize={showMenuItem ? 35 : 45}
              className="relative bg-card min-w-0"
            >
              <Controls panelRef={controlsPanelRef} />
            </ResizablePanel>

            {/* commenters are view-only, but still need the thread window */}
            {(!viewOnly || canComment) && <FloatingControl anchorRef={controlsPanelRef} />}
          </ResizablePanelGroup>}
        </div>
      </div>

      <div data-editor-tour="timeline" className="relative max-h-full w-full shrink-0 border-t border-border/80 bg-card"
        style={{ height: timelineMaximized ? "100%" : timelineHeight + 1 }}>
        <div className={cn("h-full", timelineLoading && "pointer-events-none opacity-60 transition-opacity")}>
          {playerRef && <Timeline key={timelineKey} stateManager={stateManager} readOnly={viewOnly} />}
        </div>
        {timelineLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        )}
      </div>

      {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
      {!isLargeScreen && trackItem && <ControlItemHorizontal />}
    </div>
  );
};

const Controls = ({ panelRef }: { panelRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <div ref={panelRef} className="bg-card w-full flex flex-none h-full relative">
      <div className="flex w-full">
        <RightPanelContent panelRef={panelRef} />
      </div>
    </div>
  );
};

const Editor = ({ id, userId, userName, projectName, ownerName, width, height, role }: {
  id?: string;
  userId?: string;
  userName?: string;
  projectName?: string;
  ownerName?: string;
  width?: number;
  height?: number;
  role?: EditorRole;
}) => {
  const preview = useSnapshotPreview();
  const portfolioPicker = usePortfolioPicker();
  const snapshotReady = useSnapshotDocument(stateManager);
  const [storeSynced, setStoreSynced] = useState(false);
  useEffect(() => {
    if (!preview && userId && id) {
      useStore.setState({
        userId,
        userName,
        projectId: id,
        ...(projectName !== undefined ? { projectName } : {}),
        ...(width && height ? { size: { width, height } } : {}),
      });
    }
    setStoreSynced(true);
  }, [id, userId, userName, width, height, projectName]);

  const { userId: storeUserId, userName: storeUserName, projectId, activeSceneBlockId, activeSceneItemId } = useStore();

  // only true once the seeding effect above has run AND the store actually
  // holds both values (whether they came from props here or were set
  // elsewhere, e.g. a new-project creation flow)
  const collabReady = !preview && storeSynced && !!storeUserId && !!projectId;

  const target: CollabTarget | undefined = !projectId
    ? undefined
    : activeSceneBlockId
      ? { kind: "block", id: activeSceneBlockId }
      : { kind: "project", id: projectId };

  const collab = useCollabDoc(
    preview ? undefined : target,
    collabReady ? projectId : undefined,
    collabReady ? storeUserId : undefined,
    collabReady ? storeUserName : undefined,
    stateManager,
    projectName,
  );

  const [removedFromScene, setRemovedFromScene] = useState<string | null>(null);

  const leaveSceneNoAccess = useCallback(() => {
    const { activeSceneBlockId: openId, currentBlockName, closeScene } = useStore.getState();
    if (!openId) return; // already left
    stateManager.updateState({ activeIds: [] }, { updateHistory: false, kind: "layer:selection" });
    dispatch(PLAYER_PAUSE);
    closeScene();
    setRemovedFromScene(currentBlockName || "Untitled scene");
  }, [stateManager]);
  // Removed from the project: reload, and the server renders the project's not-found page.
  const handleProjectAccessLost = useCallback(() => window.location.reload(), []);

  const liveRole = useEditorRole(preview ? undefined : projectId, preview ? undefined : activeSceneBlockId, preview ? undefined : storeUserId, role ?? null, leaveSceneNoAccess, handleProjectAccessLost);
  const resolvedRole = preview ? "Viewer" : liveRole;
  const canEdit = canEditWithRole(resolvedRole);
  const canComment = canCommentWithRole(resolvedRole);

  const blockDocReady =
    !!activeSceneBlockId &&
    !!collab?.ready &&
    collab.target.kind === "block" &&
    collab.target.id === activeSceneBlockId;

  useEffect(() => {
    if (collab) collab.syncGuard.readOnly = !canEdit;
  }, [collab, canEdit]);

  // Publish this client's role in the CURRENT room (project role in the
  // project doc, effective scene role in a block doc) so the navbar avatar
  // group can show it for everyone else. Display only: the server never reads
  // this, access is still enforced there. Re-runs on every room switch and
  // whenever the role changes while connected.
  useEffect(() => {
    if (!collab?.ready) return;
    broadcastUserRole(collab.schema.awareness, resolvedRole);
  }, [collab?.schema, collab?.ready, resolvedRole]);

  useSceneContentBroadcast(
    stateManager,
    !preview && activeSceneBlockId ? projectId : undefined,
    !preview && activeSceneBlockId ? storeUserId : undefined,
    activeSceneBlockId ? storeUserName : undefined,
    activeSceneBlockId ? activeSceneItemId ?? undefined : undefined,
    canEdit && blockDocReady,
  );

  // Only the very first sync should block the whole editor. Once we've
  // shown it once, later resyncs (opening/closing a scene swaps `target`)
  // should only show a scoped loading state on the timeline.
  const hasSyncedOnceRef = useRef(false);
  useEffect(() => {
    if (collab?.ready) hasSyncedOnceRef.current = true;
  }, [collab?.ready]);

  // Mirror into the shared store so components outside this tree (Header,
  // keyboard shortcuts) can tell whether it's safe to leave the scene,
  // without threading saveStatus/compactStatus through as props.
  useEffect(() => {
    useStore.setState({
      saveStatus: collab?.saveStatus,
      compactStatus: collab?.compactStatus,
    });
  }, [collab?.saveStatus, collab?.compactStatus]);

  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const sceneRef = useRef<SceneRef>(null);
  const { playerRef } = useStore();
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const {
    setTrackItem: setLayoutTrackItem,
    setFloatingControl,
    setLabelControlItem,
    setTypeControlItem,
  } = useLayoutStore();

  const isLargeScreen = useIsLargeScreen();
  const viewOnly = !canEdit || !isLargeScreen;
  useEffect(() => installOptimisticAdds(stateManager, () => !viewOnly), [viewOnly]);

  useEffect(() => {
    if (viewOnly) {
      stateManager.updateState({ activeIds: [] }, { updateHistory: false, kind: "layer:selection" });
    }
  }, [viewOnly]);

  useTimelineEvents();
  useProjectFonts();

  const { setCompactFonts, setFonts } = useDataState();

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
    seedDefaultFont().then(() => setLoaded(true));
  }, []);

  // useEffect(() => {
  //   dispatch(DESIGN_LOAD, { payload: design });
  // }, []);

  useEffect(() => {
    const onResize = () => sceneRef.current?.recalculateZoom();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      }
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap]);

  useEffect(() => {
    setFloatingControl("");
    setLabelControlItem("");
    setTypeControlItem("");
  }, [isLargeScreen]);

  useKeyboardShortcuts(stateManager, collab?.undoManager, viewOnly, canComment, !isLargeScreen);

  useEffect(() => {
    useStore.getState().setStateManager(stateManager);
  }, []);

  useEffect(() => {
    const lockWindowScroll = () => window.scrollTo(0, 0);
    window.addEventListener("scroll", lockWindowScroll);
    return () => window.removeEventListener("scroll", lockWindowScroll);
  }, []);

  if (collab?.error) {
    return (
      <div className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-card">
        <p className="text-sm text-red-500">Failed to load project: {collab.error.message}</p>
      </div>
    );
  }

  if (!storeSynced || !loaded || (preview ? !snapshotReady : (!collab?.ready && !hasSyncedOnceRef.current))) {
    return (
      <div className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center gap-4 bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const timelineLoading = preview ? !snapshotReady : !collab?.ready;

  return (
    <ViewOnlyProvider value={viewOnly}>
      <CanCommentProvider value={canComment}>
        <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-background">
          <Navbar
            user={null}
            stateManager={stateManager}
            undoManager={collab?.undoManager}
            viewOnly={viewOnly}
            resolvedRole={resolvedRole}
            ownerName={ownerName}
            saveStatus={collab?.saveStatus}
            compactStatus={collab?.compactStatus}
            onForceSave={collab?.forceSave}
            templateSource={collab?.ready ? { doc: collab.doc, blockId: collab.target.kind === "block" ? collab.target.id : undefined } : undefined}
          />

          <div className="flex flex-1 min-h-0 min-w-0">
            {isLargeScreen ? (
              <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                <ResizablePanel defaultSize={100} minSize={40} className="min-w-0 min-h-0">
                  <Panels
                    sceneRef={sceneRef}
                    playerRef={playerRef}
                    stateManager={stateManager}
                    trackItem={trackItem}
                    loaded={loaded}
                    isLargeScreen={isLargeScreen}
                    viewOnly={viewOnly}
                    timelineLoading={timelineLoading}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <Panels
                sceneRef={sceneRef}
                playerRef={playerRef}
                stateManager={stateManager}
                trackItem={trackItem}
                loaded={loaded}
                isLargeScreen={isLargeScreen}
                viewOnly={viewOnly}
                timelineLoading={timelineLoading}
              />
            )}
          </div>
        </div>
        <SceneRemovedModal sceneName={removedFromScene} onClose={() => setRemovedFromScene(null)} />
        {!viewOnly && !preview && !portfolioPicker && userId && id && (
          <EditorWalkthrough key={`${userId}:${id}`} projectId={id} userId={userId} />
        )}
      </CanCommentProvider>
    </ViewOnlyProvider>
  );
};

export default Editor;
