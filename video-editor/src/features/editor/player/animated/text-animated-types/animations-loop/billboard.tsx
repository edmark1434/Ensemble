import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const BillboardText = ({
  frame,
  fps,
  durationInFrames,
  animationTextInFrames,
  animationTextOutFrames,
  char,
  colorStyle,
}: {
  char: string;
  frame: number;
  fps: number;
  durationInFrames: number;
  animationTextInFrames: number;
  animationTextOutFrames: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = Math.min(Math.max(frame - animationTextInFrames, 0), loopDuration);

  // original speed was ~1 cycle/sec; round to nearest whole cycle count
  // over the loop window so sin(0) === sin(end) === 0 exactly
  const cycles = Math.max(1, Math.round(loopDuration / fps));
  const scale = 1 + 0.2 * Math.sin((2 * Math.PI * cycles * loopFrame) / loopDuration);

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `scale(${scale})` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default BillboardText;