import { interpolate, spring } from "remotion";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import {getCharTiming} from "@/features/editor/player/animated/text-animated-types/char-timing";

const RealityIsBrokenAnimationOut = ({
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
  const { delay, charDuration } = getCharTiming({
    index,
    textLength,
    windowFrames: animationTextOutFrames,
    fps
  });
  const progress = frame - (exitStart + delay);

  const translateY = spring({
    frame: progress,
    fps,
    from: 0,
    to: 1,
    config: { mass: 1, damping: 10 }
  });

  const translateX = spring({
    frame: progress,
    fps,
    from: 0,
    to: 0.55,
    config: { mass: 1, damping: 10 }
  });

  const rotateZ = spring({
    frame: progress,
    fps,
    from: 0,
    to: 180,
    config: { mass: 1, damping: 10 }
  });

  const opacity = interpolate(progress, [0, charDuration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

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

export default RealityIsBrokenAnimationOut;
