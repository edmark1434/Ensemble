import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { PresenceCursor } from "../collab/presence-cursor";
import { usePeerPositions, useRoomAwareness, useShareCursor, type TimelinePoint } from "../collab/position-presence";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import useStore from "../store/use-store";
import { timeMsToUnits, unitsToTimeMs } from "../utils/timeline";
import { RULER_HEIGHT } from "./ruler";

export function TimelinePresenceCursors({ containerRef, scrollLeft }: {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollLeft: number;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const awareness = useRoomAwareness();
  const peers = usePeerPositions(awareness, "timelineCursor");
  const zoom = useStore((state) => state.scale.zoom);
  const timeline = useStore((state) => state.timeline);
  const rulerOrigin = useTimelineOffsetX() + TIMELINE_OFFSET_CANVAS_LEFT - scrollLeft;
  const [laneOrigin, setLaneOrigin] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!awareness || !timeline) return;
    let lastX: number;
    let lastY: number;
    const readViewport = () => {
      const [, , , , x, y] = timeline.viewportTransform;
      if (x === lastX && y === lastY) return;
      lastX = x;
      lastY = y;
      setLaneOrigin({ x, y });
    };
    readViewport();
    timeline.on("after:render", readViewport);
    return () => { timeline.off("after:render", readViewport); };
  }, [awareness, timeline]);

  const locate = useCallback((event: PointerEvent): TimelinePoint | null => {
    const rect = boundsRef.current?.getBoundingClientRect();
    if (!rect || !timeline) return null;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return null;
    const ruler = y < RULER_HEIGHT;
    const timeMs = unitsToTimeMs(x - (ruler ? rulerOrigin : laneOrigin.x), zoom);
    if (timeMs < 0) return null;
    return { area: ruler ? "ruler" : "lanes", timeMs, y: ruler ? y : y - RULER_HEIGHT - laneOrigin.y };
  }, [timeline, zoom, rulerOrigin, laneOrigin]);
  useShareCursor(awareness, "timelineCursor", containerRef, locate);

  return (
    <div ref={boundsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
      {peers.map(({ clientId, name, color, value }) => {
        const ruler = value.area === "ruler";
        const left = timeMsToUnits(value.timeMs, zoom) + (ruler ? rulerOrigin : laneOrigin.x);
        const top = ruler ? value.y : RULER_HEIGHT + value.y + laneOrigin.y;
        if (left < 0 || top < (ruler ? 0 : RULER_HEIGHT)) return null;
        return <PresenceCursor key={clientId} name={name} color={color} style={{ left, top }} />;
      })}
    </div>
  );
}
