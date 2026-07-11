import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const DominoDreamsIn = ({
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

  const rotateY = spring({
    frame: frame - delay,
    fps,
    from: -90,
    to: 0,
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

export default DominoDreamsIn;
