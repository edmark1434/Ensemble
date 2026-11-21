import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import useStore from "../store/use-store";

export function TimelineReplaceOverlay({ targetId }: { targetId: string | null }) {
  const timeline = useStore((state) => state.timeline);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!timeline || !targetId || !overlay) return;

    const place = () => {
      const item = timeline.getTrackItems().find((obj: any) => obj.id === targetId);
      if (!item) {
        overlay.style.visibility = "hidden";
        return;
      }
      const transform = timeline.viewportTransform;
      const canvasWidth = timeline.getWidth();
      const canvasHeight = timeline.getHeight();
      const rect = item.getBoundingRect();
      const left = rect.left * transform[0] + transform[4];
      const right = left + rect.width * transform[0];
      const top = rect.top * transform[3] + transform[5];
      const height = rect.height * transform[3];
      const visibleLeft = Math.max(0, left);
      const visibleRight = Math.min(canvasWidth, right);
      const visibleWidth = visibleRight - visibleLeft;

      if (visibleWidth <= 4 || top + height <= 0 || top >= canvasHeight) {
        overlay.style.visibility = "hidden";
        return;
      }

      overlay.style.visibility = "visible";
      overlay.style.left = `${visibleLeft}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${visibleWidth}px`;
      overlay.style.height = `${height}px`;
    };

    const unsubscribe = timeline.on("after:render", place);
    place();
    return () => {
      unsubscribe();
    };
  }, [timeline, targetId]);

  if (!targetId) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      <div
        ref={overlayRef}
        style={{ visibility: "hidden" }}
        className="absolute flex items-center justify-center gap-1.5 rounded border-2 border-primary bg-black/70 px-2 text-xs font-medium text-white shadow-sm"
      >
        <RefreshCw className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">Replace</span>
      </div>
    </div>
  );
}
