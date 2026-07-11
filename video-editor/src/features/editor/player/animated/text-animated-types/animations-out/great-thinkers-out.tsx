import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const GreatThinkersAnimationOut = ({
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
  const delayPerChar = animationTextOutFrames / textLength;
  const charExitStart = exitStart + index * delayPerChar;
  const progress = frame - charExitStart;

  const opacity = spring({
    frame: progress,
    fps,
    from: 1,
    to: 0,
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

export default GreatThinkersAnimationOut;
