import { interpolate } from "remotion";
import {
  FullBlockAnimationProps,
  renderBlockContent,
} from "@/features/editor/player/animated/text-animated-types/animations-loop/full-block-animation";
import { getCharLayerStyles, getBackgroundFillStyle } from "../../../styles";

// Treats missing color, "transparent", zero-alpha rgba(), and zero-alpha
// 8-digit hex as "no background set".
const isTransparentColor = (color?: string | null) => {
  if (!color) return true;
  const normalized = color.trim().toLowerCase();
  if (normalized === "transparent") return true;
  const rgbaMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length === 4 && parts[3] === 0) return true;
  }
  if (/^#[0-9a-f]{8}$/.test(normalized) && normalized.slice(-2) === "00") {
    return true;
  }
  return false;
};

const BackgroundOut = (props: FullBlockAnimationProps) => {
  const {
    frame,
    details,
    animationTextOutFrames,
    durationInFrames,
    fps,
  } = props;

  const start = durationInFrames - animationTextOutFrames;
  const duration = animationTextOutFrames;

  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fullWidth = details.width;
  const fullHeight = details.height;

  const revealWidth = interpolate(
    Math.round(progress * 100),
    [0, 100 - fps / 10],
    [fullWidth, 0]
  );
  const textTranslateX = interpolate(progress, [0, 1], [0, fullWidth * 2]);

  // Same swap as BackgroundIn: box takes the original text color, text
  // takes the original background color (black if that background was
  // transparent).
  const originalBackgroundColor = details.backgroundColor as string | undefined;
  const swappedTextColor = isTransparentColor(originalBackgroundColor)
    ? "black"
    : (originalBackgroundColor as string);
  const swappedBoxColor = details.color || "white";

  // Built directly from swappedTextColor (not patched from getColorStyle,
  // which was based on the original details.color) so gradients swap
  // correctly instead of silently falling through unchanged.
  const bgColorStyle = (left: number, top: number) =>
    getCharLayerStyles(
      swappedTextColor,
      { left, top },
      { width: fullWidth, height: fullHeight },
      details.textDecoration,
      details.fontSize
    );

  const blockContent = renderBlockContent({ ...props, getColorStyle: bgColorStyle });

  return (
    <div
      style={{
        position: "relative",
        width: fullWidth,
        height: fullHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          width: revealWidth,
          height: fullHeight,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          ...getBackgroundFillStyle(swappedBoxColor),
        }}
      >
        <div
          style={{
            width: fullWidth,
            height: fullHeight,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translateX(${textTranslateX}px)`,
          }}
        >
          {blockContent}
        </div>
      </div>
    </div>
  );
};

export default BackgroundOut;