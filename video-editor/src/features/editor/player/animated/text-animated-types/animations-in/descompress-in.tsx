import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

const DescompressAnimationIn = ({
  char,
  index,
  frame,
  fps,
  animationTextInFrames,
  colorStyle
}: {
  char: string;
  index: number;
  frame: number;
  fps: number;
  animationTextInFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const endTime = animationTextInFrames / fps;
  const time = frame / fps;

  const progress = Math.min(Math.max(time / endTime, 0), 1);

  const scaleX = 3 - progress * 2;
  const opacity = progress;

  return (
    <AnimatedChar
      char={char}
      animationStyle={{
        transform: `scaleX(${scaleX})`,
        opacity: opacity
      }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default DescompressAnimationIn;
