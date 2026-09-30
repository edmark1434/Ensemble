import { interpolate, spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const SunnyMorningsAnimationIn = ({
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

  const scale = spring({
    frame: frame - delay,
    fps,
    from: 4,
    to: 1,
    config: { mass: 1, damping: 10 }
  });

  const opacity = interpolate(
    frame - delay,
    [0, charDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `scale(${scale})`, opacity }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default SunnyMorningsAnimationIn;
