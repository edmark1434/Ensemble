import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const Wave = ({
                char,
                frame,
                fps,
                index,
                durationInFrames,
                animationTextInFrames,
                animationTextOutFrames,
                colorStyle,
              }: {
  char: string;
  frame: number;
  fps: number;
  index: number;
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

  // original ω=8 rad/s isn't a whole cycle/sec; round to nearest whole
  // cycle count over loopDuration so it returns to its start value at the end
  const cycles = Math.max(1, Math.round(loopDuration / fps));
  const offsetRad = (index * 20) / fps; // same phase-shift ratio as the original offset/fps term

  const phase = (2 * Math.PI * cycles * loopFrame) / loopDuration - offsetRad;
  const translateY = Math.sin(phase) * 20;

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `translateY(${translateY}px)` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};
export default Wave;