import { interpolate } from "remotion";
import { FullBlockAnimationProps, renderFullBlock } from "./full-block-animation";

const Spin = (props: FullBlockAnimationProps) => {
  const { frame, fps, durationInFrames, animationTextInFrames, animationTextOutFrames } = props;

  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = frame - animationTextInFrames;

  // keep ~1 rotation/sec like before, but round to a whole number of
  // rotations so the final frame always lands on a multiple of 360deg
  const rotations = Math.max(1, Math.round(loopDuration / fps));

  const rotateZ = interpolate(loopFrame, [0, loopDuration], [0, rotations * 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return renderFullBlock(props, { transform: `rotateZ(${rotateZ}deg)` });
};

export default Spin;