import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const VogueLetterByLetter = ({
                               char,
                               frame,
                               fps,
                               index,
                               durationInFrames,
                               animationTextInFrames,
                               animationTextOutFrames,
                               colorStyle
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

  // original was 1 cycle/sec (t*2π with t=frame/fps); round to whole
  // cycles over loopDuration so it returns to its start value at the end
  const cycles = Math.max(1, Math.round(loopDuration / fps));
  const period = loopDuration / cycles;

  const delay = index * 4;
  const t = (loopFrame - delay) / period;

  const scale = 1 + 0.25 * Math.sin(t * 2 * Math.PI);
  const rotateY = 40 * Math.sin(t * 2 * Math.PI);

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `scale(${scale}) rotateY(${rotateY}deg)` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};
export default VogueLetterByLetter;