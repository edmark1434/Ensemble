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
  WaveAudioBars
} from "./items";
import StateManager from "@designcombo/state";
import {TIMELINE_OFFSET_CANVAS_LEFT, TIMELINE_OFFSET_CANVAS_RIGHT} from "../constants/constants";
import PreviewTrackItem from "./items/preview-drag-item";
import {useTimelineOffsetX} from "../hooks/use-timeline-offset";
import {useStateManagerEvents} from "../hooks/use-state-manager-events";
import {useResizbleTimeline} from "../hooks/use-resizable-timeline";

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
  HillAudioBars
});

const EMPTY_SIZE = { width: 0, height: 0 };
const Timeline = ({ stateManager }: { stateManager: StateManager }) => {
  // prevent duplicate scroll events
  const canScrollRef = useRef(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<CanvasTimeline | null>(null);
  const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const { scale, playerRef, fps, duration, setState, timeline } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);
  const timelineOffsetX = useTimelineOffsetX();
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
        hillAudioBars: 40
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
        "hillAudioBars"
      ],
      acceptsMap: {
        text: ["text", "caption"],
        image: ["image", "video"],
        video: ["video", "image"],
        audio: ["audio"],
        caption: ["caption", "text"],
        template: ["template"],
        customTrack: ["video", "image"],
        customTrack2: ["video", "image"],
        main: ["video", "image"],
        linealAudioBars: ["audio", "linealAudioBars"],
        radialAudioBars: ["audio", "radialAudioBars"],
        waveAudioBars: ["audio", "waveAudioBars"],
        hillAudioBars: ["audio", "hillAudioBars"]
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

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setTimeline(canvas);

    canvas.scrollTo({ scrollLeft: 0 });

    // watch for state changes on canvas items
    canvas.state.subscribeToUpdateItemDetails(({ trackItemsMap }) => {
      canvas.getTrackItems().forEach((item: any) => {
        const details = trackItemsMap[item.id]?.details;

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
          item.selectable = !locked;    // blocks marquee/group select (we manually add click select)
          item.hasControls = !locked;
          item.dirty = true;
        }
      });
      canvas.requestRenderAll();
    });

    let isDragging = false;
    let activeIdsBeforeClick: string[] = [];

    canvas.on('mouse:down', (e: any) => {
      isDragging = false;

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

      activeIdsBeforeClick = [itemId];
    });

    return () => {
      canvas.purge();
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
