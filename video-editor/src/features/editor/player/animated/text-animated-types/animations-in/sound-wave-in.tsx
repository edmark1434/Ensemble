import { ITextDetails } from "@designcombo/types";
import { interpolate } from "remotion";

const ALIGN_TO_JUSTIFY: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end"
};

const SoundWaveIn = ({
                       text,
                       frame,
                       animationTextInFrames,
                       details
                     }: {
  text: string;
  frame: number;
  animationTextInFrames: number;
  details: ITextDetails;
}) => {
  const waveDisappearStart = animationTextInFrames * 0.5;
  const waveDisappearEnd = animationTextInFrames;
  const trailCount = 8;
  const baseScale = interpolate(frame, [0, waveDisappearStart], [0.5, 1], {
    extrapolateRight: "clamp"
  });
  const mainScale = baseScale;
  const mainBlur = 0;
  const mainOpacity = 1;
  const waveScaleX = interpolate(frame, [0, waveDisappearStart], [2, 1], {
    extrapolateRight: "clamp"
  });
  const waveBlur =
    frame < waveDisappearStart
      ? interpolate(frame, [0, waveDisappearStart], [20, 0], {
        extrapolateRight: "clamp"
      })
      : interpolate(frame, [waveDisappearStart, waveDisappearEnd], [0, 40], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
  const waveOpacity =
    frame < waveDisappearStart
      ? interpolate(frame, [0, waveDisappearStart], [0.7, 1], {
        extrapolateRight: "clamp"
      })
      : interpolate(frame, [waveDisappearStart, waveDisappearEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });

  const justify = ALIGN_TO_JUSTIFY[details.textAlign] ?? "center";

  const trails = [];
  for (let i = trailCount; i > 0; i--) {
    const trailFrame = Math.max(frame - i * 2, 0);
    const trailScale = interpolate(
      trailFrame,
      [0, waveDisappearStart],
      [0.5, 1],
      { extrapolateRight: "clamp" }
    );
    const trailOpacity = interpolate(
      trailFrame,
      [0, waveDisappearStart],
      [0.15, 0],
      { extrapolateRight: "clamp" }
    );

    trails.push(
      <span
        key={i}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          opacity: trailOpacity,
          transform: `scale(${trailScale * 2})`,
          pointerEvents: "none"
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        width: details.width,
        height: details.height,
        transform: `scale(${baseScale})`,
        position: "relative"
      }}
    >
      {/* Texto wave */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          width: details.width,
          height: details.height,
          background: "transparent",
          transform: `scale(${mainScale})`
        }}
      >
        {text}
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          opacity: waveOpacity,
          transform: `scaleX(${waveScaleX})`,
          filter: `blur(${waveBlur * 3}px)`
        }}
      >
        {text}
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          opacity: mainOpacity,
          filter: `blur(${mainBlur}px)`,
          transform: `scale(${mainScale})`,
          fontSize: parseFloat(details.fontSize.toString())
        }}
      >
        <div
          style={{
            width: details.width,
            height: details.height,
            position: "relative"
          }}
        >
          {trails}
        </div>
      </span>
    </div>
  );
};

export default SoundWaveIn;