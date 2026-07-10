import { FullBlockAnimationProps, renderFullBlock } from "./full-block-animation";

function random(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const ShakeText = (props: FullBlockAnimationProps) => {
  const { frame, animationTextInFrames } = props;
  const loopFrame = frame - animationTextInFrames;
  const offsetX = (random(loopFrame) - 0.5) * 8;
  const offsetY = (random(loopFrame + 999) - 0.5) * 8;
  const rotate = (random(loopFrame + 500) - 0.5) * 6;

  return renderFullBlock(props, {
    transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`,
  });
};

export default ShakeText;