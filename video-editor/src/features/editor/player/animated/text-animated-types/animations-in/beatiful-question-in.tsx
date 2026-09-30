import { interpolate, spring } from "remotion";
import { AnimatedChar } from "../animated-char";

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
  const totalDuration = animationTextInFrames;
  const delayFactor = totalDuration / textLength;
  const delay = index * delayFactor;

  const translateY = spring({
    frame: frame - delay,
    fps,
    from: 1.1,
    to: 0,
    config: { damping: 10 }
  });

  const opacity = interpolate(frame - delay, [0, totalDuration / 2], [0, 1], {
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