import { timeMsToUnits } from "@designcombo/timeline";
import useStore from "../store/use-store";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";

export type ScrollToFrameKind = "start" | "marker" | "end";

// Use for navigation actions so the player and timeline move together.
export function seekTimelineToFrame(frame: number, timelineOffsetX: number) {
  const player = useStore.getState().playerRef?.current;
  if (!player || !Number.isFinite(frame)) return;
  player.seekTo(Math.round(frame));
  // The player clamps seeks to its duration; reveal the frame it actually chose.
  scrollTimelineToFrame(player.getCurrentFrame(), "marker", timelineOffsetX);
}

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

  const screenX = targetPx - currentScrollLeft + ((timeline as any).spacing?.left ?? offsetX);
  const isOffScreen = screenX < 0 || screenX >= viewportWidth;

  if (!isOffScreen) return;

  const newScrollLeft =
    kind === "start"
      ? 0
      : kind === "end"
        ? Math.max(0, targetPx - viewportWidth + 2 * offsetX)
        : Math.max(0, targetPx - viewportWidth / 2 + offsetX);

  Promise.resolve().then(() => {
    if (useStore.getState().timeline !== timeline) return;
    timeline.scrollTo({ scrollLeft: newScrollLeft });
  });
}
