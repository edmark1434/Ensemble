import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import StateManager, {
  ACTIVE_SPLIT,
  LAYER_CLONE,
  LAYER_DELETE,
  TIMELINE_SCALE_CHANGED,
  EDIT_OBJECT,
  LAYER_SELECT,
  LAYER_COPY,
  ACTIVE_PASTE
} from "@designcombo/state";
import { PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import useStore from "../store/use-store";
import {
  ChevronDown, ChevronUp,
  Copy, CopyPlus,
  Lock,
  Fullscreen,
  SquareSplitHorizontal,
  Trash,
  ZoomIn,
  ZoomOut, EyeOff, LockOpen, Eye, VolumeOff, Volume2, Home, Scissors, ClipboardPaste
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
import { ITimelineScaleState } from "@designcombo/types";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import {timeMsToUnits} from "@designcombo/timeline";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

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
const IconPlayerSkipBack = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M20 5v14l-12 -7z" />
    <path d="M4 5l0 14" />
  </svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5v14l12 -7z" />
    <path d="M20 5l0 14" />
  </svg>
);
const Header = ({ toggleFullHeight, timelineHeight, stateManager }: {
  toggleFullHeight: () => void;
  timelineHeight: number;
  stateManager: StateManager;
}) => {
  const [playing, setPlaying] = useState(false);
  const { duration, fps, scale, playerRef, activeIds, timeline, trackItemsMap } = useStore();
  const isLargeScreen = useIsLargeScreen();
  useUpdateAnsestors({ playing, playerRef });

  const currentFrame = useCurrentPlayerFrame(playerRef);
  const timelineOffsetX = useTimelineOffsetX();

  const doActiveDelete = () => {
    dispatch(LAYER_DELETE);
  };

  const doActiveSplit = () => {
    const time = getCurrentTime();
    activeIds.forEach((id) => {
      dispatch(LAYER_SELECT, { payload: { trackItemIds: [id] } });
      dispatch(ACTIVE_SPLIT, { payload: {}, options: { time } });
    });
    // Restore full selection after
    dispatch(LAYER_SELECT, { payload: { trackItemIds: activeIds } });
  };

  const doActiveCopy = () => {
    dispatch(LAYER_COPY);
  };
  const doActiveCut = () => {
    dispatch(LAYER_COPY);
    dispatch(LAYER_DELETE);
  };
  const doActivePaste = async () => {
    const before = useStore.getState().trackItemIds;

    dispatch(ACTIVE_PASTE);
    await Promise.resolve();

    const after = useStore.getState();
    const newIds = after.trackItemIds.filter(id => !before.includes(id));

    if (!newIds.length) return;

    const currentTime = (currentFrame / fps) * 1000;
    const minFrom = Math.min(
      ...newIds.map(id => after.trackItemsMap[id]?.display.from ?? 0)
    );
    const offset = currentTime - minFrom;

    const updatedMap = { ...after.trackItemsMap };
    newIds.forEach(id => {
      const item = updatedMap[id];
      if (!item) return;
      updatedMap[id] = {
        ...item,
        display: {
          from: item.display.from + offset,
          to: item.display.to + offset,
        },
        details: {
          ...item.details,
          locked: false,
        },
      };
    });

    stateManager.updateState(
      { trackItemsMap: updatedMap },
      { updateHistory: !0, kind: "update" }
    );
  };

  const doActiveDuplicate = async () => {
    const before = useStore.getState().trackItemIds;

    dispatch(LAYER_CLONE);
    await Promise.resolve();

    const after = useStore.getState();
    const newIds = after.trackItemIds.filter(id => !before.includes(id));

    if (!newIds.length) return;

    const updatedMap = { ...after.trackItemsMap };
    newIds.forEach(id => {
      const item = updatedMap[id];
      if (!item) return;
      updatedMap[id] = {
        ...item,
        details: {
          ...item.details,
          locked: false,
        },
      };
    });

    stateManager.updateState(
      { trackItemsMap: updatedMap },
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

    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: { scale: newScale }
    });

    // Microtask: runs after dispatch is processed but before next paint
    Promise.resolve().then(() => {
      timeline?.scrollTo({ scrollLeft: newScrollLeft });
    });
  };

  const handlePlay = () => {
    dispatch(PLAYER_PLAY);
  };

  const handlePause = () => {
    dispatch(PLAYER_PAUSE);
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

  const isHidden = activeItems.length > 0 && activeItems
      .filter(item => item.type !== "audio")
      .every(item => item.details?.hidden === true);
  const isMuted = activeItems.length > 0 && activeItems
      .filter(item => item.type === "audio" || item.type === "video")
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
      if (type !== "audio" && type !== "video") return acc;
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
          <div className="flex px-2 pr-4 gap-1 items-center">
            {!(activeIds.length > 0) && (
              <Button
                onClick={doActiveDelete}
                variant={"secondary"}
                size={"sm"}
                className="disabled:opacity-0 disabled:pointer-events-none font-normal mr-1"
              >
                Home
              </Button>
            )}

            {activeIds.length > 0 && (
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

            {activeItems.some(item => item.type === "audio" || item.type === "video") && !isLocked && (
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

            {activeIds.length > 0 && !isLocked && (
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!activeIds.length || isLocked}
                    onClick={doActiveSplit}
                    variant={"ghost"}
                    size={"icon"}
                    className="disabled:opacity-0 disabled:pointer-events-none"
                  >
                    <SquareSplitHorizontal size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  Split
                </TooltipContent>
              </Tooltip>
            )}

            {activeIds.length > 0 && (
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
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  Copy
                </TooltipContent>
              </Tooltip>
            )}

            {activeIds.length > 0 && (
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
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  Duplicate
                </TooltipContent>
              </Tooltip>
            )}

            {activeIds.length > 0 && !isLocked && (
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
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  Cut
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
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Paste
              </TooltipContent>
            </Tooltip>

            {activeIds.length > 0 && !isLocked && (
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!activeIds.length || isLocked}
                    onClick={doActiveDelete}
                    variant={"ghost"}
                    size={"icon"}
                    className="disabled:opacity-0 disabled:pointer-events-none"
                  >
                    <Trash size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  Delete
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center justify-center gap-1">
            {/*transferred to scene container*/}
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

            <Tooltip delayDuration={10}>
              <TooltipTrigger asChild>
                <Button size={"icon"} variant={"ghost"} onClick={toggleFullHeight}>
                  {isFull ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                {isFull ? "Minimize" : "Maximize"}
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
          <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
            Zoom out
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
          <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
            Zoom in
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={10}>
          <TooltipTrigger asChild>
            <Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"}>
              <Fullscreen size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
            Zoom to fit
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default Header;
