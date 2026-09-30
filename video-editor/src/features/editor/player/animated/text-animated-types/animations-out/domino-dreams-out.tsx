import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

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
  const exitDuration = animationTextOutFrames;
  const delayPerChar = exitDuration / textLength;
  const exitStart = durationInFrames - animationTextOutFrames;
  const charExitStart = exitStart + index * delayPerChar;
  const progress = frame - charExitStart;

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
