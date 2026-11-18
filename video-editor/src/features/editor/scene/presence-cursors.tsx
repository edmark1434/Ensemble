import { useCallback, useRef, type RefObject, type CSSProperties } from "react";
import { usePeerPositions, useRoomAwareness, useShareCursor } from "../collab/position-presence";
import { PresenceCursor } from "../collab/presence-cursor";

export function PresenceCursors({ containerRef, style }: {
  containerRef: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const awareness = useRoomAwareness();
  const peers = usePeerPositions(awareness, "canvasCursor");
  const locate = useCallback((event: PointerEvent) => {
    const rect = boundsRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) return null;
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }, []);
  useShareCursor(awareness, "canvasCursor", containerRef, locate);

  return (
    <div ref={boundsRef} aria-hidden="true" className="pointer-events-none absolute z-[210] overflow-hidden" style={style}>
      {peers.map(({ clientId, name, color, value }) => (
        <PresenceCursor key={clientId} name={name} color={color} style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }} />
      ))}
    </div>
  );
}
