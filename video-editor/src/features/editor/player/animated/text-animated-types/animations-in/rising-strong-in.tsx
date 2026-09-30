import { interpolate } from "remotion";
import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const RisingStrongAnimationIn = ({
                                   char,
                                   index,
                                   frame,
                                   textLength,
                                   animationTextInFrames,
                                   colorStyle
                                 }: {
  char: string;
  index: number;
  frame: number;
  textLength: number;
  animationTextInFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const totalDuration = animationTextInFrames / 2;
  const delayFactor = totalDuration / textLength;
  const appearDelay = index * delayFactor;

  // Adjust the disappearance to happen after the complete animation if needed
  const disappearStart = totalDuration + appearDelay;

  const opacity = interpolate(
    frame - appearDelay,
    [0, totalDuration / 2, disappearStart, disappearStart + totalDuration / 2],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame - appearDelay,
    [0, totalDuration],
    [100, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AnimatedChar
      char={char}
      animationStyle={{
        transform: `translateY(${translateY}px)`,
        opacity
      }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default RisingStrongAnimationIn;