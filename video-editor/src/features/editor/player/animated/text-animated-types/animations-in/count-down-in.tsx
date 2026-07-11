import { interpolate } from "remotion";
import {
  FullBlockAnimationProps,
  renderBlockContent,
} from "@/features/editor/player/animated/text-animated-types/animations-loop/full-block-animation";

const numbers = ["3", "2", "1"];

const CountDownIn = (props: FullBlockAnimationProps) => {
  const { frame, animationTextInFrames, details, lines, lineStarts } = props;

  const countdownFrames = (animationTextInFrames * 3) / 4;
  const framesPerNumber = Math.floor(countdownFrames / numbers.length);

  let displayLines = lines;
  let displayLineStarts = lineStarts;
  let localFrame = 0;
  let duration = framesPerNumber;
  let initialScale = 2;
  let finalScale = 0.5;

  if (frame < countdownFrames) {
    const idx = Math.floor(frame / framesPerNumber);
    displayLines = [numbers[idx]];
    displayLineStarts = [details.width / 2];
    localFrame = frame - idx * framesPerNumber;
    duration = framesPerNumber;
    initialScale = 2;
    finalScale = 0.5;
  } else if (frame < animationTextInFrames) {
    localFrame = frame - countdownFrames;
    duration = animationTextInFrames - countdownFrames;
    initialScale = 2;
    finalScale = 1;
  } else {
    localFrame = duration;
    initialScale = 1;
    finalScale = 1;
  }

  const progress = Math.min(localFrame / duration, 1);
  const scale = interpolate(progress, [0, 1], [initialScale, finalScale]);
  const opacity = interpolate(progress, [0, 1], [0.3, 1]);
  const blur = interpolate(progress, [0, 1], [8, 0]);

  // Render as one block: the countdown digit is a single-line override of
  // lines/lineStarts, the settled state falls through to the real wrapped
  // lines from TextAnimated (multi-line safe either way).
  const blockContent = renderBlockContent({
    ...props,
    lines: displayLines,
    lineStarts: displayLineStarts,
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        filter: `blur(${blur}px)`,
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {blockContent}
    </div>
  );
};

export default CountDownIn;