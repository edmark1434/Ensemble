import { interpolate, spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const MadeWithLoveAnimationIn = ({
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
    from: -100,
    to: 0,
    config: { damping: 20, stiffness: 120 }
  });

  const opacity = interpolate(
    frame - delay,
    [0, charDuration],
    [0, 1],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp"
    }
  );

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

export default MadeWithLoveAnimationIn;
