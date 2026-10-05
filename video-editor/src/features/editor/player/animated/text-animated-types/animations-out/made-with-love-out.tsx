import { interpolate, spring } from "remotion";
import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";
import { getCharTiming } from "@/features/editor/player/animated/text-animated-types/char-timing";

const MadeWithLoveAnimationOut = ({
  char,
  index,
  frame,
  fps,
  textLength,
  animationTextOutFrames,
  durationInFrames,
  colorStyle
}: {
  char: string;
  index: number;
  frame: number;
  fps: number;
  textLength: number;
  animationTextOutFrames: number;
  durationInFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const exitStart = durationInFrames - animationTextOutFrames;
  const { delay, charDuration } = getCharTiming({
    index,
    textLength,
    windowFrames: animationTextOutFrames,
    fps
  });
  const progress = frame - (exitStart + delay);

  const translateY = spring({
    frame: progress,
    fps,
    from: 0,
    to: 100, // Move text out of view
    config: { damping: 20, stiffness: 120 }
  });

  const opacity = interpolate(progress, [0, charDuration], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp"
  });

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `translateY(${translateY}px)`, opacity }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default MadeWithLoveAnimationOut;
