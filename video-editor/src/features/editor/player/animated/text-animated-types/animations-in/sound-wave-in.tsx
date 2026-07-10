import { interpolate } from "remotion";
import {
  FullBlockAnimationProps,
  renderBlockContent,
} from "@/features/editor/player/animated/text-animated-types/animations-loop/full-block-animation";

const SoundWaveIn = (props: FullBlockAnimationProps) => {
  const { frame, animationTextInFrames } = props;

  const waveDisappearStart = animationTextInFrames * 0.5;
  const waveDisappearEnd = animationTextInFrames;
  const trailCount = 8;

  const baseScale = interpolate(frame, [0, waveDisappearStart], [0.5, 1], {
    extrapolateRight: "clamp",
  });
  const waveScaleX = interpolate(frame, [0, waveDisappearStart], [2, 1], {
    extrapolateRight: "clamp",
  });
  const waveBlur =
    frame < waveDisappearStart
      ? interpolate(frame, [0, waveDisappearStart], [20, 0], { extrapolateRight: "clamp" })
      : interpolate(frame, [waveDisappearStart, waveDisappearEnd], [0, 40], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const waveOpacity =
    frame < waveDisappearStart
      ? interpolate(frame, [0, waveDisappearStart], [0.7, 1], { extrapolateRight: "clamp" })
      : interpolate(frame, [waveDisappearStart, waveDisappearEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // Rendered once — reused as the main layer, the wave layer, and each trail.
  const blockContent = renderBlockContent(props);

  const trailDelayUnit = waveDisappearStart / trailCount;

  const trails = [];
  for (let i = trailCount; i > 0; i--) {
    const trailFrame = Math.max(frame - i * trailDelayUnit, 0);
    const trailScale = interpolate(trailFrame, [0, waveDisappearStart], [0.5, 1], {
      extrapolateRight: "clamp",
    });
    const trailOpacity = interpolate(trailFrame, [0, waveDisappearStart], [0.15, 0], {
      extrapolateRight: "clamp",
    });

    trails.push(
      <div
        key={i}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: trailOpacity,
          transform: `scale(${trailScale})`,
          pointerEvents: "none",
        }}
      >
        {blockContent}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${baseScale})` }}>{blockContent}</div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: waveOpacity,
          transform: `scaleX(${waveScaleX})`,
          filter: `blur(${waveBlur * 3}px)`,
        }}
      >
        {blockContent}
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{trails}</div>
    </div>
  );
};

export default SoundWaveIn;