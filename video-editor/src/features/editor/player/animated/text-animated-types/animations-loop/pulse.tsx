import { interpolate } from "remotion";
import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

const PulseText = ({
  char,
  index,
  frame,
  durationInFrames,
  animationTextInFrames,
  animationTextOutFrames,
  colorStyle,
}: {
  char: string;
  index: number;
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

  // original cycle was 30 frames; round to a whole number of cycles over
  // loopDuration so every character's phase realigns with its own start
  // exactly when the loop window ends (delay is a constant offset, so it
  // cancels out in periodicity as long as loopDuration % cycleLen === 0)
  const cyclesCount = Math.max(1, Math.round(loopDuration / 30));
  const cycleLen = loopDuration / cyclesCount;

  const delay = index * 6;
  const ratio = ((loopFrame + cycleLen - delay) % cycleLen) / cycleLen;

  const pulse = interpolate(ratio, [0, 0.5, 1], [1, 1.2, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(ratio, [0, 0.5, 1], [0.5, 1, 0.5], { extrapolateRight: "clamp" });

  return (
    <span style={{ position: "relative", display: "inline-block", opacity, scale: pulse }}>
      <AnimatedChar
        char={char}
        animationStyle={{}}
        isGradient={colorStyle.isGradient}
        shadowStrokeStyle={colorStyle.shadowStrokeStyle}
        fillStyle={colorStyle.fillStyle}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1.5em",
          height: "1.5em",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(20px)",
          opacity,
        }}
      />
    </span>
  );
};

export default PulseText;