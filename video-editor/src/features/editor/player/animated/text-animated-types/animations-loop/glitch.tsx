import { FullBlockAnimationProps, renderBlockContent } from "./full-block-animation";

const GlitchText = (props: FullBlockAnimationProps) => {
  const { frame, durationInFrames, animationTextInFrames, animationTextOutFrames } = props;

  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = Math.min(Math.max(frame - animationTextInFrames, 0), loopDuration);

  const baseCycles = Math.max(1, Math.round(loopDuration / (20 * Math.PI)));
  const phase = (cycles: number) => (2 * Math.PI * cycles * loopFrame) / loopDuration;

  const glitchIntensity = Math.sin(phase(baseCycles)) * 10;
  const rgbOffset = Math.sin(phase(baseCycles * 2)) * 10;

  const solidColor = (color: string) => () => ({
    isGradient: false,
    shadowStrokeStyle: {},
    fillStyle: { color },
  });

  const cyanBlock = renderBlockContent({ ...props, getColorStyle: solidColor("cyan") });
  const magentaBlock = renderBlockContent({ ...props, getColorStyle: solidColor("magenta") });
  const mainBlock = renderBlockContent(props);

  return (
    <div style={{ display: "grid", opacity: 0.8 }}>
      <div
        style={{
          gridArea: "1 / 1",
          transform: `translate(${rgbOffset}px, ${glitchIntensity}px)`,
          mixBlendMode: "screen",
        }}
      >
        {cyanBlock}
      </div>
      <div
        style={{
          gridArea: "1 / 1",
          transform: `translate(${-rgbOffset}px, ${-glitchIntensity}px)`,
          mixBlendMode: "screen",
        }}
      >
        {magentaBlock}
      </div>
      <div style={{ gridArea: "1 / 1", paddingInline: 10 }}>{mainBlock}</div>
    </div>
  );
};

export default GlitchText;