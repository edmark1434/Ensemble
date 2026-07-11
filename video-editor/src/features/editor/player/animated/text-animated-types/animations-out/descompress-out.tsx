import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const DescompressAnimationOut = ({
  char,
  index,
  frame,
  fps,
  animationTextOutFrames,
  durationInFrames,
  colorStyle
}: {
  char: string;
  index: number;
  frame: number;
  fps: number;
  animationTextOutFrames: number;
  durationInFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const startTime = (durationInFrames - animationTextOutFrames) / fps;
  const endTime = durationInFrames / fps;
  const time = frame / fps;

  const progress = Math.min(
    Math.max((time - startTime) / (endTime - startTime), 0),
    1
  );
  const scaleX = 1 + progress;
  const opacity = 1 - progress;

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `scaleX(${scaleX})`, opacity: opacity }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default DescompressAnimationOut;
