import { spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const AnimatedTextIn = ({
  char,
  index,
  frame,
  fps,
  textLength,
  animationTextInFrames,
  colorStyle,
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
  // Adjust delay based on total frames available for the entire animation
  const totalDelay = animationTextInFrames;
  const delayFactor = totalDelay / textLength;
  const delay = index * delayFactor;

  const opacity = spring({
    frame: frame - delay,
    fps,
    from: 0,
    to: 1,
    config: { mass: 0.5, damping: 10 }
  });

  const y = spring({
    frame: frame - delay,
    fps,
    from: -50,
    to: 0,
    config: { mass: 0.5, damping: 10 }
  });

  const rotate = spring({
    frame: frame - delay,
    fps,
    from: -180,
    to: 0,
    config: { mass: 0.5, damping: 12 }
  });

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ opacity, transform: `translateY(${y}px) rotate(${rotate}deg)`, transition: "all 0.05s ease-out" }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default AnimatedTextIn;
