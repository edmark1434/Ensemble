import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const DominoDreamsAnimationOut = ({
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
  const { delay } = getCharTiming({
    index,
    textLength,
    windowFrames: animationTextOutFrames,
    fps
  });
  const progress = frame - (exitStart + delay);

  const rotateY = spring({
    frame: progress,
    fps,
    from: 0,
    to: 90,
    config: { mass: 1, damping: 12 }
  });

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `rotateY(${rotateY}deg)` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default DominoDreamsAnimationOut;
