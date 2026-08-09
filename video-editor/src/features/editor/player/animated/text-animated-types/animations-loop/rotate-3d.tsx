import { interpolate } from "remotion";
import { FullBlockAnimationProps, renderBlockContent } from "./full-block-animation";

const Rotate3d = (props: FullBlockAnimationProps) => {
  const { frame, fps, durationInFrames, animationTextInFrames, animationTextOutFrames } = props;

  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = frame - animationTextInFrames;

  // ~0.5 rotations/sec
  const rotations = Math.max(1, Math.round(loopDuration / (2 * fps)));

  const rotation = interpolate(loopFrame, [0, loopDuration], [0, rotations * 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotation2 = rotation - 180;

  const blockContent = renderBlockContent(props);

  return (
    <div style={{ display: "grid", perspective: 1000 }}>
      <div
        style={{
          gridArea: "1 / 1",
          transform: `rotateY(${rotation}deg)`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {blockContent}
      </div>
      <div
        style={{
          gridArea: "1 / 1",
          transform: `rotateY(${rotation2}deg)`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {blockContent}
      </div>
    </div>
  );
};

export default Rotate3d;