"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, {DESIGN_LOAD, LAYER_DELETE} from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import {TIMELINE_OFFSET_CANVAS_LEFT} from "./constants/constants";
import MenuList from "./menu-list";
import { ControlItem } from "./control-item";
import { MenuItem } from "./menu-item";
import CropModal from "./crop-modal/crop-modal";
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
import {ArrowLeftToLine, ArrowRightToLine, Maximize, Minimize, Volume2, VolumeOff} from "lucide-react";
import {frameToTimeString, timeToString} from "./utils/time";
import {useCurrentPlayerFrame} from "@/features/editor/hooks/use-current-frame";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import useUpdateAnsestors from "@/features/editor/hooks/use-update-ansestors";
import {PLAYER_PAUSE, PLAYER_PLAY} from "@/features/editor/constants/events";
import {cn} from "@/lib/utils";
import {useKeyboardShortcuts} from './hooks/use-keyboard-shortcuts'
import {timeMsToUnits} from "@designcombo/timeline";
import {useTimelineOffsetX} from "@/features/editor/hooks/use-timeline-offset";
import {Kbd, KbdGroup} from "@/components/ui/kbd";
import {seedDefaultFont} from "@/features/editor/utils/seed-default-font";
import {scrollTimelineToFrame} from "@/features/editor/utils/timeline-scroll";

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

const ScenePlayer = ({ sceneRef, playerRef, stateManager, isLargeScreen }: any) => {
  const { fps, duration, markers, timeline, scale, trackItemIds, muted, setMuted } = useStore();
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

  const sortedMarkers = [...markers]
    .map((m) => ({ ...m, frame: Math.round((m.timeMs / 1000) * fps) }))
    .sort((a, b) => a.frame - b.frame);

  const prevMarker = [...sortedMarkers].reverse().find((m) => m.frame < currentFrame);
  const nextMarker = sortedMarkers.find((m) => m.frame > currentFrame);

  const handleJumpToPrev = () => {
    const frame = prevMarker ? prevMarker.frame : 0;
    playerRef?.current?.seekTo(frame);
    scrollTimelineToFrame(frame, prevMarker ? "marker" : "start", timelineOffsetX);
  };
  const handleJumpToNext = () => {
    const frame = nextMarker ? nextMarker.frame : durationFrames;
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
      data-scene-container=""
      className="relative flex flex-col w-full h-full bg-card"
      onMouseMove={handleMouseMove}
    >
      {!isLargeScreen && !isFullscreen && (
        <div className=" top-0 left-0 right-0 z-500 bg-primary text-black text-xs font-medium text-center py-1.5 px-2">
          Mobile view is only in preview mode for now
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <CropModal />
        {!isLargeScreen && trackItemIds.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-center px-6 text-sm text-muted-foreground">
            The project is currently empty, no preview available
          </div>
        ) : (
          <Scene ref={sceneRef} stateManager={stateManager} />
        )}
      </div>

      <div className={cn(
        "grid grid-cols-3 items-center p-2 pt-0 bg-card transition-opacity duration-300",
        isFullscreen && " pt-2 absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm",
        isFullscreen && !showControls && "opacity-0 pointer-events-none"
      )}>
        <div className="text-xs flex items-center gap-1 px-2">
        <span
          className="font-semibold text-zinc-200"
          id="video-current-time"
          data-current-time={currentFrame / fps}
        >
          {frameToTimeString({ frame: currentFrame }, { fps })}
        </span>
          <span className="text-zinc-500">/</span>
          <span className="text-muted-foreground">
          {timeToString({ time: duration })}
        </span>
        </div>

        <div className="flex justify-center gap-1">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="hidden lg:inline-flex"
                onClick={handleJumpToPrev}
                disabled={trackItemIds.length === 0 || currentFrame === 0}
                variant={"ghost"}
                size={"icon"}>
                <ArrowLeftToLine size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {prevMarker ? (
                <>
                  Jump to last marker
                  <KbdGroup>
                    <Kbd>Ctrl</Kbd>
                    <span>+</span>
                    <Kbd>Shift</Kbd>
                    <span>+</span>
                    <Kbd>M</Kbd>
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
                className="hidden lg:inline-flex"
                onClick={handleJumpToNext}
                disabled={trackItemIds.length === 0 || currentFrame >= durationFrames}
                variant={"ghost"}
                size={"icon"}>
                <ArrowRightToLine size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {nextMarker ? (
                <>
                  Jump to next marker
                  <KbdGroup>
                    <Kbd>Shift</Kbd>
                    <span>+</span>
                    <Kbd>M</Kbd>
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

        <div className="flex justify-end gap-1">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
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
}: any) => {
  const { showMenuItem } = useLayoutStore();
  const menuPanelRef = useRef<ImperativePanelHandle>(null);
  const controlsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showMenuItem) {
      menuPanelRef.current?.expand();
    } else {
      menuPanelRef.current?.collapse();
    }
  }, [showMenuItem]);

  if (!isLargeScreen) {
    return (
      <div className="relative flex h-full w-full flex-col bg-background">
        <ScenePlayer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      <div className="flex-1 relative overflow-hidden w-full h-full">
        <div className="flex h-full flex-1">
          <div className="flex w-[54px] h-full bg-card border-r border-border/80">
            <MenuList />
          </div>

          <Separator orientation="vertical" />

          <ResizablePanelGroup
            direction="horizontal"
            className="w-full h-full overflow-hidden"
          >
            <ResizablePanel
              ref={menuPanelRef}
              collapsible
              collapsedSize={0}
              defaultSize={0}
              minSize={30}
              maxSize={40}
              className={showMenuItem ? "" : "hidden"}
            >
              <MenuItem />
            </ResizablePanel>
            <ResizableHandle className={cn("bg-border/90", !showMenuItem && "hidden")} />

            <ResizablePanel
              defaultSize={showMenuItem ? 45 : 75}
              minSize={showMenuItem ? 40 : 55}
              maxSize={showMenuItem ? 45 : 75}
              className="relative bg-card min-w-0"
            >
              <ScenePlayer sceneRef={sceneRef} playerRef={playerRef} stateManager={stateManager} isLargeScreen={isLargeScreen} />
            </ResizablePanel>

            <ResizableHandle className="bg-border/90" />
            <ResizablePanel
              defaultSize={25}
              minSize={25}
              maxSize={showMenuItem ? 35 : 45}
              className="relative bg-card min-w-0"
            >
              <Controls panelRef={controlsPanelRef} />
            </ResizablePanel>

            <FloatingControl anchorRef={controlsPanelRef} />
          </ResizablePanelGroup>
        </div>
      </div>

      <div className="w-full border-t border-border/80 bg-card">
        {playerRef && <Timeline stateManager={stateManager} />}
      </div>

      {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
      {!isLargeScreen && trackItem && <ControlItemHorizontal />}
    </div>
  );
};

// const Sidebar = () => {
//   const { showMenuItem } = useLayoutStore();
//
//   return (
//     // h-[calc(100vh-52px)]
//     <div className="bg-card w-full flex flex-none h-full overflow-hidden">
//       <div className="flex w-full min-h-0 overflow-hidden">
//         <MenuList />
//         {showMenuItem && (
//           <>
//             <Separator orientation="vertical" />
//             <MenuItem />
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

const Controls = ({ panelRef }: { panelRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <div ref={panelRef} className="bg-card w-full flex flex-none h-full relative">
      <div className="flex w-full">
        <ControlItem />
      </div>
    </div>
  );
};

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
  const { scene } = useSceneStore();
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const sceneRef = useRef<SceneRef>(null);
  const { timeline, playerRef } = useStore();
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

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();
  // useEffect(() => {
  //   dispatch(DESIGN_LOAD, { payload: design });
  // }, []);
  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    seedDefaultFont().then(r => {});
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    const containerWidth = document.getElementById("timeline-header")?.clientWidth || 0;
    const containerHeight =
      (document.getElementById("playhead")?.clientHeight || 0) -
      (document.getElementById("playhead-handle")?.clientHeight || 0) - 26;

    timeline?.resize(
      { height: containerHeight, width: containerWidth },
      { force: true },
    );

    setTimeout(() => {
      sceneRef.current?.recalculateZoom();
    }, 100);
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      } else console.log(transitionsMap[id]);
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

  useEffect(() => {
    setLoaded(true);
  }, []);

  useKeyboardShortcuts(stateManager);

  useEffect(() => {
    const lockWindowScroll = () => window.scrollTo(0, 0);
    window.addEventListener("scroll", lockWindowScroll);
    return () => window.removeEventListener("scroll", lockWindowScroll);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <Navbar
        user={null}
        stateManager={stateManager}
      />

      <div className="flex flex-1 h-[calc(100vh-56px)]">
        {isLargeScreen ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel
              defaultSize={40}
              minSize={40}
              className="min-w-0 min-h-0"
            >
              <Panels
                sceneRef={sceneRef}
                playerRef={playerRef}
                stateManager={stateManager}
                trackItem={trackItem}
                loaded={loaded}
                isLargeScreen={isLargeScreen}
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
          />
        )}
      </div>
    </div>
  );
};

export default Editor;
