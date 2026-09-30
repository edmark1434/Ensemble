export const getCharTiming = ({
  index,
  textLength,
  windowFrames,
  fps
}: {
  index: number;
  textLength: number;
  windowFrames: number;
  fps: number;
}) => {
  // how long one letter's own motion/fade lasts
  const charDuration = Math.max(1, Math.min(windowFrames * 0.5, fps * 0.8));
  // stagger so the LAST letter still has charDuration frames left
  const stagger =
    Math.max(windowFrames - charDuration, 0) / Math.max(textLength - 1, 1);
  return { delay: index * stagger, charDuration };
};