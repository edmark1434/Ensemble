import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const GetThinkersAnimationIn = ({
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
  const { delay } = getCharTiming({
    index,
    textLength,
    windowFrames: animationTextInFrames,
    fps
  });

  const opacity = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 60, damping: 10 }
  });

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ opacity }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default GetThinkersAnimationIn;
