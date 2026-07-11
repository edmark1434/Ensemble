import { interpolate, spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const BeatifulQuestionAnimationOut = ({
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
  const exitDuration = animationTextOutFrames;
  const delayPerChar = exitDuration / textLength;
  const exitStart = durationInFrames - animationTextOutFrames;
  const charExitStart = exitStart + index * delayPerChar;
  const progress = frame - charExitStart;

  const translateY = spring({
    frame: progress,
    fps,
    from: 0,
    to: 1.1,
    config: { damping: 10 }
  });

  const opacity = interpolate(progress, [0, delayPerChar], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp"
  });
  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `translateY(${translateY}em)`, opacity }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default BeatifulQuestionAnimationOut;
