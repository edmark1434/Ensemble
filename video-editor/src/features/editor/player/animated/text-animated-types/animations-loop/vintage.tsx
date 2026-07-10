import { interpolate } from "remotion";
import { FullBlockAnimationProps, renderBlockContent } from "./full-block-animation";

const TOTAL_LAYERS = 9;

const ghostColorStyle = (_left: number, _top: number) => ({
  isGradient: false,
  shadowStrokeStyle: {},
  fillStyle: { color: "red" },
});

const Vintage = (props: FullBlockAnimationProps) => {
  const { frame, fps, durationInFrames, animationTextInFrames, animationTextOutFrames } = props;

  const loopDuration = durationInFrames - animationTextInFrames - animationTextOutFrames;
  const loopFrame = Math.min(Math.max(frame - animationTextInFrames, 0), loopDuration);

  // original cycle was `fps` frames (1s); round to a whole number of
  // cycles over loopDuration so layerCount returns to 1 exactly at the end
  const cyclesCount = Math.max(1, Math.round(loopDuration / fps));
  const cycleLen = loopDuration / cyclesCount;
  const half = cycleLen / 2;
  const t = loopFrame % cycleLen;

  const layerCount = Math.round(
    t <= half
      ? interpolate(t, [0, half], [1, TOTAL_LAYERS])
      : interpolate(t, [half, cycleLen], [TOTAL_LAYERS, 1])
  );

  return (
    <div style={{ display: "grid" }}>
      {Array.from({ length: layerCount }).map((_, i) => {
        const dx = i * 16;
        const dy = -i * 8;
        const opacity = 1 / (layerCount - i);
        const isTopLayer = layerCount === i + 1;

        return (
          <div
            key={i}
            style={{
              gridArea: "1 / 1",
              transform: `translate(${dx}px, ${dy}px)`,
              zIndex: i,
              opacity,
            }}
          >
            {renderBlockContent(isTopLayer ? props : { ...props, getColorStyle: ghostColorStyle })}
          </div>
        );
      })}
    </div>
  );
};

export default Vintage;