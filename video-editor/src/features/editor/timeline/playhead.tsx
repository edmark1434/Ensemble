import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
import {
  CSSProperties,
  MouseEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { timeMsToUnits, unitsToTimeMs } from "../utils/timeline";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useTheme } from "next-themes";
import { useIsDraggingOverTimeline } from "@/features/editor/hooks/is-dragging-over-timeline";
import { useCommentMarkers } from "@/features/editor/comments/use-comment-markers";
import {
  MARKER_HEIGHT,
  MARKER_WIDTH,
  NORMAL_MARKER_CLIP
} from "./ruler";

const Playhead = ({ scrollLeft }: { scrollLeft: number }) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const { playerRef, fps, scale, markers, playheadSnapped } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const position =
    timeMsToUnits((currentFrame / fps) * 1000, scale.zoom) - scrollLeft;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(position);
  const timelineOffsetX = useTimelineOffsetX();

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const currentTheme = useMemo(() => {
    if (!mounted) return "light";
    return (theme === "system" ? resolvedTheme : theme) as "dark" | "light";
  }, [mounted, theme, resolvedTheme]);

  const color = useMemo(() => {
    return currentTheme === "dark" ? "#ffffff" : "#000000";
  }, [currentTheme]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (
    e:
      | MouseEvent<HTMLDivElement, globalThis.MouseEvent>
      | TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault(); // Prevent default drag behavior
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartPosition(position);
  };

  const handleMouseMove = (
    e: globalThis.MouseEvent | globalThis.TouchEvent
  ) => {
    if (isDragging) {
      e.preventDefault(); // Prevent default drag behavior
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragStartX + scrollLeft;
      const newPosition = dragStartPosition + delta;

      const time = unitsToTimeMs(newPosition, scale.zoom);
      playerRef?.current?.seekTo(Math.round((time * fps) / 1000));
    }
  };

  useEffect(() => {
    const preventDefaultDrag = (e: Event) => {
      e.preventDefault();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.addEventListener("dragstart", preventDefaultDrag);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    }

    // Cleanup event listeners on component unmount
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const MARKER_SNAP_MS = 1000 / fps - 1;
  const currentTimeMs = (currentFrame / fps) * 1000;

  const commentMarkers = useCommentMarkers();
  const isNear = (m: { timeMs: number }) =>
    Math.abs(m.timeMs - currentTimeMs) < MARKER_SNAP_MS;
  const nearComment =
    commentMarkers.some(isNear) ||
    markers.some((m) => m.type === "comment" && isNear(m));
  const nearNormal = markers.some((m) => m.type !== "comment" && isNear(m));

  // normal markers are pink, comment markers use the primary color;
  // when both sit on the playhead, the normal marker wins
  const markerColor = nearNormal
    ? "#f43f5e"
    : nearComment
      ? "var(--primary)"
      : null;
  const playheadColor = playheadSnapped
    ? `color-mix(in oklch, var(--primary) 50%, var(--card))`
    : markerColor ?? color;

  // only normal markers change the playhead shape (also wins when both sit on it);
  // on a comment marker the playhead keeps its shape and is just recolored
  const handleStyle: CSSProperties = nearNormal
    ? {
      width: MARKER_WIDTH,
      height: MARKER_HEIGHT,
      clipPath: NORMAL_MARKER_CLIP,
      backgroundColor: playheadColor
    }
    : {
      width: 8,
      height: 16,
      borderRadius: "0 0 4px 4px",
      backgroundColor: playheadColor
    };

  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  return (
    <div
      ref={playheadRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      id="playhead"
      style={{
        position: "absolute",
        left: timelineOffsetX + TIMELINE_OFFSET_CANVAS_LEFT + position,
        top: 50,
        width: 1,
        height: "calc(100% - 40px)",
        zIndex: 10,
        cursor: "pointer",
        pointerEvents: isDraggingOverTimeline ? "none" : "auto",
        touchAction: "none" // Prevent default touch actions
      }}
    >
      <div
        id="playhead-handle"
        style={handleStyle}
        className="absolute top-0 -translate-x-1/2 transform text-xs font-semibold text-zinc-800"
      />
      <div className="relative h-full">
        <div className="absolute top-0 h-full w-3 -translate-x-1/2 transform" />
        <div
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 transform"
          style={{ backgroundColor: playheadColor }}
        />
      </div>
    </div>
  );
};

export default Playhead;