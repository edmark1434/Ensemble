import { FullBlockAnimationProps, renderFullBlock } from "./full-block-animation";

const FontChange = (props: FullBlockAnimationProps) => {
  const { frame, durationInFrames, animationTextInFrames, animationTextOutFrames, details, animationFonts } = props;

  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = Math.min(Math.max(frame - animationTextInFrames, 0), loopDuration);

  const totalFonts = [{ fontFamily: details.fontFamily }, ...animationFonts];

  const cyclesCount = Math.max(1, Math.round(loopDuration / 30));
  const cycleLen = loopDuration / cyclesCount;
  const framesPerFont = cycleLen / totalFonts.length;

  const t = loopFrame % cycleLen;
  const fontIndex = Math.min(Math.floor(t / framesPerFont), totalFonts.length - 1);

  return renderFullBlock(props, { fontFamily: totalFonts[fontIndex].fontFamily });
};

export default FontChange;