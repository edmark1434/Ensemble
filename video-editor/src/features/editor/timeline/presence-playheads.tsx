import { usePeerPositions, useRoomAwareness } from "../collab/position-presence";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import useStore from "../store/use-store";
import { timeMsToUnits } from "../utils/timeline";

export function PresencePlayheads({ scrollLeft, width }: { scrollLeft: number; width: number }) {
  const awareness = useRoomAwareness();
  const peers = usePeerPositions(awareness, "playheadMs");
  const zoom = useStore((state) => state.scale.zoom);
  const offset = useTimelineOffsetX() + TIMELINE_OFFSET_CANVAS_LEFT;
  const labelsAtPosition = new Map<number, number>();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[50px] z-[9] overflow-hidden">
      {peers.map(({ clientId, name, color, value }) => {
        const left = offset + timeMsToUnits(value, zoom) - scrollLeft;
        if (left < offset || left >= width) return null;
        const pixel = Math.round(left);
        const row = labelsAtPosition.get(pixel) ?? 0;
        labelsAtPosition.set(pixel, row + 1);
        return (
          <div key={clientId} className="absolute inset-y-0 w-0.5 opacity-50" style={{ left, backgroundColor: color }}>
            <span
              className="absolute left-0 w-max max-w-36 truncate px-1.5 text-[10px] font-semibold leading-4 text-white"
              style={{
                top: row * 16,
                backgroundColor: color,
                transform: `translateX(clamp(${-left}px, -50%, calc(${width - left}px - 100%)))`,
              }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
