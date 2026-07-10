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

const BackgroundIn = (props: FullBlockAnimationProps) => {
  const { frame, details, animationTextInFrames } = props;

  const progress = interpolate(frame, [0, animationTextInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fullWidth = details.width;
  const fullHeight = details.height;

  const revealWidth = interpolate(progress, [0, 1], [0, fullWidth]);
  const textTranslateX = interpolate(progress, [0, 1], [fullWidth / 2, 0]);

  // Swap text/background colors: the reveal box takes on the original text
  // color, and the text takes on the original background color. If there
  // was no real background (transparent), fall back to black text so it
  // stays visible against the swapped-in box color.
  const originalBackgroundColor = details.backgroundColor as string | undefined;
  const swappedTextColor = isTransparentColor(originalBackgroundColor)
    ? "black"
    : (originalBackgroundColor as string);
  const swappedBoxColor = details.color || "white";

  // Build char styles directly from swappedTextColor so both solid and
  // gradient cases are handled correctly (getCharLayerStyles already knows
  // how to build either kind of style — no need to patch getColorStyle's
  // output after the fact, since that was built from details.color, not
  // the swapped color).
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
            transform: `translateX(${textTranslateX * 2}px)`,
          }}
        >
          {blockContent}
        </div>
      </div>
    </div>
  );
};

export default BackgroundIn;