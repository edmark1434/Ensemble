import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const Heartbeat = ({
  char,
  frame,
  fps,
  durationInFrames,
  animationTextInFrames,
  animationTextOutFrames,
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

  // original beat was 1 cycle/sec; round to a whole number of beats
  // over loopDuration so the rest state (scale 1) lands exactly at the end
  const loopSeconds = loopDuration / fps;
  const beats = Math.max(1, Math.round(loopSeconds / 1));
  const cycleDuration = loopSeconds / beats;

  const time = loopFrame / fps;
  const cycleTime = (time % cycleDuration) / cycleDuration; // normalized 0-1, same semantics as original (cycleDuration was 1)

  let scale = 1;
  if (cycleTime < 0.2 || (cycleTime >= 0.3 && cycleTime < 0.5)) {
    scale = 1 + Math.sin((cycleTime % 0.2) * Math.PI * 5) * 0.8;
  }

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
export default Heartbeat;