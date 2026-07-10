import { interpolate, spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const RealityIsBrokenAnimationIn = ({
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

  const translateY = spring({
    frame: frame - delay,
    fps,
    from: 1.1,
    to: 0,
    config: { damping: 10 }
  });

  const translateX = spring({
    frame: frame - delay,
    fps,
    from: 0.55,
    to: 0,
    config: { damping: 10 }
  });

  const rotateZ = spring({
    frame: frame - delay,
    fps,
    from: 180,
    to: 0,
    config: { damping: 10 }
  });

  const opacity = interpolate(
    frame,
    [delay, delay + 15], // Adjust for opacity ramp-up
    [0, 1],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp"
    }
  );

  return (
    <AnimatedChar
      char={char}
      animationStyle={{
        transformOrigin: "0 100%",
        transform: `translateY(${translateY}em) translateX(${translateX}em) rotateZ(${rotateZ}deg)`,
        opacity
      }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default RealityIsBrokenAnimationIn;
