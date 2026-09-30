import { interpolate, spring } from "remotion";
import { AnimatedChar } from "../animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const BeatifulQuestionAnimationIn = ({
  char,
  index,
  frame,
  fps,
  textLength,
  animationTextInFrames,
  colorStyle
}: {
  char: string;
  index: number;
  frame: number;
  fps: number;
  textLength: number;
  animationTextInFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const { delay, charDuration } = getCharTiming({
    index,
    textLength,
    windowFrames: animationTextInFrames,
    fps
  });

  const translateY = spring({
    frame: frame - delay,
    fps,
    from: 1.1,
    to: 0,
    config: { damping: 10 }
  });

  const opacity = interpolate(frame - delay, [0, charDuration], [0, 1], {
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

export default BeatifulQuestionAnimationIn;