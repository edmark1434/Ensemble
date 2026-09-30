import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const AnimatedTextOut = ({
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
  const startExitFrame = durationInFrames - animationTextOutFrames;
  const delay = (index / textLength) * (durationInFrames - startExitFrame);

  const opacity = spring({
    frame: frame - startExitFrame - delay,
    fps,
    from: 1,
    to: 0,
    config: { mass: 0.5, damping: 10 }
  });

  const y = spring({
    frame: frame - startExitFrame - delay,
    fps,
    from: 0,
    to: 50,
    config: { mass: 0.5, damping: 10 }
  });

  const rotate = spring({
    frame: frame - startExitFrame - delay,
    fps,
    from: 0,
    to: 180,
    config: { mass: 0.5, damping: 12 }
  });
  return (
    <AnimatedChar
      char={char}
      animationStyle={{ opacity, transform: `translateY(${y}px) rotate(${rotate}deg)` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default AnimatedTextOut;
