import { timeMsToUnits } from "@designcombo/timeline";
import useStore from "../store/use-store";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";

export type ScrollToFrameKind = "start" | "marker" | "end";

export function scrollTimelineToFrame(
  frame: number,
  kind: ScrollToFrameKind,
  timelineOffsetX: number
) {
  const { fps, scale, timeline } = useStore.getState();
  if (!timeline) return;

  const timeMs = (frame / fps) * 1000;
  const targetPx = timeMsToUnits(timeMs, scale.zoom);

  const currentScrollLeft = timeline && (timeline as any).spacing
    ? -(timeline as any).viewportTransform[4] + (timeline as any).spacing.left
    : 0;
  const viewportWidth = (timeline as any).width ?? 0;
  const offsetX = TIMELINE_OFFSET_CANVAS_LEFT + timelineOffsetX;

  const screenX = targetPx - currentScrollLeft;
  const isOffScreen = screenX < 0 || screenX > viewportWidth;

  if (!isOffScreen) return;

  const newScrollLeft =
    kind === "start"
      ? 0
      : kind === "end"
        ? Math.max(0, targetPx - viewportWidth + 2 * offsetX)
        : Math.max(0, targetPx - viewportWidth / 2 + offsetX);

  Promise.resolve().then(() => {
    timeline.scrollTo({ scrollLeft: newScrollLeft });
  });
}