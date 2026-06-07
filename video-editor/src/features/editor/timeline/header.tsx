import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import {
  ACTIVE_SPLIT,
  LAYER_CLONE,
  LAYER_DELETE,
  TIMELINE_SCALE_CHANGED,
  EDIT_OBJECT
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
  ZoomOut, EyeOff, LockOpen, Eye
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
const Header = ({ toggleFullHeight, timelineHeight }: {
  toggleFullHeight: () => void;
  timelineHeight: number;
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
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: {
        time: getCurrentTime()
      }
    });
  };

  const changeScale = (newScale: ITimelineScaleState) => {
    const currentTimeMs = (currentFrame / fps) * 1000;
    const playheadPxOld = timeMsToUnits(currentTimeMs, scale.zoom);

    const currentScrollLeft = timeline
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
  const isHidden = activeIds.length === 1 ? (trackItemsMap[activeIds[0]]?.details?.hidden ?? false) : false;

  const hideTrackItem = () => {
    const activeItem = trackItemsMap[activeIds[0]];
    if (activeItem?.type === "audio") return;

    dispatch(EDIT_OBJECT, {
      payload: {
        [activeIds[0]]: {
          details: {
            hidden: !isHidden,
          }
        }
      }
    });
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
          <div className="flex px-2">
            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    disabled={!activeIds.length}
                    onClick={() => {
                      dispatch(LAYER_CLONE);
                    }}
                    variant={"ghost"}
                    size={isLargeScreen ? "sm" : "icon"}
                    className="flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <LockOpen size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Lock
              </TooltipContent>
            </Tooltip>

            {trackItemsMap[activeIds[0]]?.type !== "audio" && (
              <Tooltip delayDuration={10}>

                <TooltipTrigger asChild>
                  <Button
                      disabled={!activeIds.length || trackItemsMap[activeIds[0]]?.type === "audio"}
                      onClick={hideTrackItem}
                      variant={"ghost"}
                      size={isLargeScreen ? "sm" : "icon"}
                      className={`flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none ${isHidden ? "text-primary hover:text-primary" : ""}`}
                  >
                    {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                  {isHidden ? "Show" : "Hide"}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    disabled={!activeIds.length}
                    onClick={doActiveSplit}
                    variant={"ghost"}
                    size={isLargeScreen ? "sm" : "icon"}
                    className="flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <SquareSplitHorizontal strokeWidth={2} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Split
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    disabled={!activeIds.length}
                    onClick={() => {
                      dispatch(LAYER_CLONE);
                    }}
                    variant={"ghost"}
                    size={isLargeScreen ? "sm" : "icon"}
                    className="flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <Copy size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Copy
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    disabled={!activeIds.length}
                    onClick={() => {
                      dispatch(LAYER_CLONE);
                    }}
                    variant={"ghost"}
                    size={isLargeScreen ? "sm" : "icon"}
                    className="flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <CopyPlus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Duplicate
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    disabled={!activeIds.length}
                    onClick={doActiveDelete}
                    variant={"ghost"}
                    size={isLargeScreen ? "sm" : "icon"}
                    className="flex items-center gap-1 px-2 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <Trash size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Delete
              </TooltipContent>
            </Tooltip>

          </div>

          <div className="flex items-center justify-center gap-2">
            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    className="hidden lg:inline-flex"
                    onClick={doActiveDelete}
                    variant={"ghost"}
                    size={"icon"}
                >
                  <IconPlayerSkipBack size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Jump to last marker
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    onClick={() => {
                      if (playing) {
                        return handlePause();
                      }
                      handlePlay();
                    }}
                    variant={"ghost"}
                    size={"icon"}
                >
                  {playing ? (
                      <IconPlayerPauseFilled size={14} />
                  ) : (
                      <IconPlayerPlayFilled size={14} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                {playing ? "Pause" : "Play"}
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={10}>

              <TooltipTrigger asChild>
                <Button
                    className="hidden lg:inline-flex"
                    onClick={doActiveSplit}
                    variant={"ghost"}
                    size={"icon"}
                >
                  <IconPlayerSkipForward size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isFull ? "bottom" : "top"} align="center" sideOffset={1}>
                Jump to next marker
              </TooltipContent>
            </Tooltip>

            <div
              className="text-xs font-light flex"
              style={{
                alignItems: "center",
                gridTemplateColumns: "54px 4px 54px",
                paddingTop: "2px",
                justifyContent: "center"
              }}
            >
              <div
                className="font-medium text-zinc-200"
                style={{
                  display: "flex",
                  justifyContent: "center"
                }}
                data-current-time={currentFrame / fps}
                id="video-current-time"
              >
                {frameToTimeString({ frame: currentFrame }, { fps })}
              </div>
              <span className="px-1">|</span>
              <div
                className="text-muted-foreground hidden lg:block"
                style={{
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                {timeToString({ time: duration })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end px-2">
            <ZoomControl
                scale={scale}
                onChangeTimelineScale={changeScale}
                duration={duration}
                isFull={isFull}
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
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
  isFull: boolean;
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
    const fitZoom = getFitZoomLevel(duration, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  return (
    <div className="flex items-center justify-end">
      <div className="flex pl-4 pr-2">
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
          max={12}
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
