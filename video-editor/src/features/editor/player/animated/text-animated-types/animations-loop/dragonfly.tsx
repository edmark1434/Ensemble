import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const DragonflyText = ({
                         char,
                         frame,
                         durationInFrames,
                         animationTextInFrames,
                         animationTextOutFrames,
                         colorStyle
                       }: {
  char: string;
  frame: number;
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

  // original ratio was 2 : 2.5 : 3 : 4 → doubled to clear the .5 → 4 : 5 : 6 : 8
  // each phase completes that many *whole* cycles over exactly loopFrame [0, loopDuration],
  // so sin(0) === sin(end) for all four, no matter what loopDuration actually is
  const phase = (cycles: number) => (2 * Math.PI * cycles * loopFrame) / loopDuration;

  const x = 80 * Math.sin(phase(4));
  const y = 80 * Math.sin(phase(5));
  const rotate = 5 * Math.sin(phase(6));
  const scale = 1 + 0.05 * Math.sin(phase(8));

  return (
    <AnimatedChar
      char={char}
      animationStyle={{
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
        transition: "transform 0.1s linear"
      }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default DragonflyText;