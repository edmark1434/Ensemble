import { IImage, IText, ITrackItem } from "@designcombo/types";
import {foldSkewYIntoScale} from "@/features/editor/utils/matrix-fold";

export const calculateCropStyles = (
  details: IImage["details"],
  crop: IImage["details"]["crop"]
) => ({
  width: details.width || "100%",
  height: details.height || "auto",
  top: -crop.y || 0,
  left: -crop.x || 0,
  position: "absolute",
  borderRadius: `${Math.min(crop.width, crop.height) * ((details.borderRadius || 0) / 100)}px`
});

export const calculateMediaStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"]
) => {
  return {
    pointerEvents: "none",
    boxShadow: [
      `0 0 0 ${details.borderWidth}px ${details.borderColor}`,
      details.boxShadow
        ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
        : ""
    ]
      .filter(Boolean)
      .join(", "),
    ...calculateCropStyles(details, crop),
    overflow: "hidden"
  } as React.CSSProperties;
};

export const isGradientColor = (color?: string): boolean =>
  /^(linear|radial)-gradient\(/i.test((color || "").trim());

// existing getTextColorStyle can now just use this helper:
export const getTextColorStyle = (color: string): React.CSSProperties => {
  if (!isGradientColor(color)) {
    return { color: color || "#000000" };
  }
  return {
    backgroundImage: color,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent"
  };
};

const OVERSHOOT_MULTIPLIER = 0.5; // fontSize-based

export function getCharLayerStyles(
  color: string,
  position: { left: number; top: number },
  blockSize: { width: number; height: number },
  textDecoration: string | undefined,
  fontSize: number
): {
  isGradient: boolean;
  shadowStrokeStyle: React.CSSProperties;
  fillStyle: React.CSSProperties;
} {
  const isGradient = /^(linear|radial)-gradient\(/i.test((color || "").trim());

  if (!isGradient) {
    return {
      isGradient: false,
      shadowStrokeStyle: {},
      fillStyle: { color, textDecoration: textDecoration || "none" },
    };
  }

  const overshoot = fontSize * OVERSHOOT_MULTIPLIER;
  const backgroundSize = `${blockSize.width}px ${blockSize.height}px`;
  const bgPos = `${-(position.left - overshoot)}px ${-(position.top - overshoot)}px`;

  const shared: React.CSSProperties = {
    backgroundImage: color,
    backgroundSize,
    backgroundPosition: bgPos,
    backgroundRepeat: "no-repeat",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    padding: overshoot,
    margin: -overshoot,
  };

  const shadowStrokeStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    ...shared,
    WebkitTextStroke: "2px transparent",
  };

  return {
    isGradient: true,
    shadowStrokeStyle,
    fillStyle: { ...shared, textDecoration: textDecoration || "none" },
  };
}

export const getBackgroundFillStyle = (
  backgroundColor: string
): React.CSSProperties => {
  const isGradient = /^(linear|radial)-gradient\(/i.test((backgroundColor || "").trim());

  if (!isGradient) {
    return { backgroundColor: backgroundColor || "transparent" };
  }

  return {
    backgroundImage: backgroundColor,
    backgroundColor: "transparent"
  };
};

export const calculateTextStyles = (
  details: IText["details"]
): React.CSSProperties => {
  const hasStroke = (details.borderWidth || 0) > 0;

  return {
    position: "relative",
    textDecoration: details.textDecoration || "none",
    ...(hasStroke
      ? {
        WebkitTextStroke: `${details.borderWidth}px ${details.borderColor}`,
        paintOrder: "stroke fill"
      }
      : {}),
    textShadow: details.boxShadow
      ? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
      : "none",
    fontFamily: details.fontFamily || "Arial",
    fontWeight: details.fontWeight || "normal",
    lineHeight: details.lineHeight || "normal",
    letterSpacing: details.letterSpacing || "normal",
    wordSpacing: details.wordSpacing || "normal",
    wordWrap: details.wordWrap || "",
    wordBreak: details.wordBreak || "normal",
    textTransform: details.textTransform || "none",
    fontSize: details.fontSize || "16px",
    textAlign: details.textAlign || "left",
    backgroundColor: details.backgroundColor || "transparent",
    borderRadius: `${Math.min(details.width, details.height) * ((details.borderRadius || 0) / 100)}px`,
    ...getBackgroundFillStyle(details.backgroundColor),
  };
};

export function getMoveableTransform(
  details: ITrackItem["details"],
  overrides?: { rotate?: number; scaleX?: number; scaleY?: number }
): string {
  const rotateDeg = overrides?.rotate ?? (parseFloat(details.rotate as unknown as string) || 0);
  const skewX = details.skewX || 0;
  const skewY = details.skewY || 0;

  const scaleMatch = (details.transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  const baseScaleX = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const baseScaleY = scaleMatch ? parseFloat(scaleMatch[2]) : 1;

  const scaleX = overrides?.scaleX ?? baseScaleX;
  const scaleY = overrides?.scaleY ?? baseScaleY;

  const folded = foldSkewYIntoScale(rotateDeg, skewX, skewY, scaleX, scaleY);

  return `rotate(${folded.rotate}deg) skewX(${folded.skewX}deg) scale(${folded.scaleX}, ${folded.scaleY})`;
}

export const calculateContainerStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"] = {},
  overrides: React.CSSProperties = {},
  type?: string
): React.CSSProperties => {
  return {
    pointerEvents: "auto",
    top: details.top || 0,
    left: details.left || 0,
    width: crop.width || details.width || "100%",
    height: crop.height || details.height || "max-content",
    transform: getMoveableTransform(details), // rotate+skewX+scale folded, no native rotate prop needed anymore
    opacity: details.opacity !== undefined ? details.opacity / 100 : 1,
    transformOrigin: details.transformOrigin || "center center",
    filter: `brightness(${details.brightness}%) blur(${details.blur}px)`,
    ...overrides
  };
};

export const LINE_HEIGHT_FALLBACK = 1.2;

export const getLineHeightPx = (details: { lineHeight?: unknown; fontSize: number }): number => {
  const lh = details.lineHeight as unknown;
  if (!lh || lh === "normal") return details.fontSize * LINE_HEIGHT_FALLBACK;
  const parsed = parseFloat((lh as any).toString());
  return Number.isNaN(parsed) ? details.fontSize * LINE_HEIGHT_FALLBACK : details.fontSize * parsed;
};

const supportsCanvasLetterSpacing = (() => {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  return !!ctx && "letterSpacing" in ctx;
})();

export function measureTextWidth(
  text: string,
  font: { fontSize: number; fontFamily: string; fontWeight?: string | number; letterSpacingPx?: number }
): number {
  if (typeof document === "undefined") return 0;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;

  context.font = `${font.fontWeight || "normal"} ${font.fontSize}px ${font.fontFamily}`;
  const letterSpacingPx = font.letterSpacingPx || 0;

  if (supportsCanvasLetterSpacing) {
    (context as any).letterSpacing = `${letterSpacingPx}px`;
    return context.measureText(text).width;
  }

  const charSpacing = -0.5 + letterSpacingPx;
  return context.measureText(text).width + text.length * charSpacing;
}

export interface WrappedTextLayout {
  lines: string[];
  charLeftOffsets: number[][];
  lineWidths: number[];
  lineStarts: number[];
}

// Word-wraps text to `width` AND records each line's width/start-x (for
// alignment) and each char's left offset (for gradient background-position).
// Used by both the static multi-char text renderer and the typewriter cursor.
export function getWrappedTextLayout(
  text: string,
  width: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number | undefined,
  textAlign: string,
  wordBreak?: string,
  letterSpacingPx = 0
): WrappedTextLayout {
  const empty = { lines: [], charLeftOffsets: [], lineWidths: [], lineStarts: [] };
  if (typeof document === "undefined") return empty;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return empty;

  context.font = `${fontWeight || "normal"} ${fontSize}px ${fontFamily}`;
  if (supportsCanvasLetterSpacing) {
    (context as any).letterSpacing = `${letterSpacingPx}px`;
  }
  const charSpacing = supportsCanvasLetterSpacing ? 0 : -0.5 + letterSpacingPx;
  const measureLine = (line: string) =>
    context.measureText(line).width + line.length * charSpacing;

  const breakAll = wordBreak === "break-all" || wordBreak === "break-word";
  const lines: string[] = [];
  let currentLine = "";
  const paragraphs = text.split(/\r\n|\r|\n/);

  paragraphs.forEach((paragraph) => {
    if (paragraph === "") {
      lines.push("");
      return;
    }
    if (breakAll) {
      for (const ch of paragraph) {
        const testChar = currentLine + ch;
        if (measureLine(testChar) > width && currentLine) {
          lines.push(currentLine);
          currentLine = ch === " " ? "" : ch;
        } else {
          currentLine = testChar;
        }
      }
      if (currentLine) lines.push(currentLine);
      currentLine = "";
      return;
    }
    const words = paragraph.split(" ");
    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureLine(testLine) <= width) {
        currentLine = testLine;
        return;
      }
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    });
    if (currentLine) lines.push(currentLine);
    currentLine = "";
  });

  const lineWidths: number[] = [];
  const lineStarts: number[] = [];
  const charLeftOffsets = lines.map((line) => {
    const lineWidth = measureLine(line);
    const lineStart =
      textAlign === "left" ? 0 : textAlign === "right" ? width - lineWidth : (width - lineWidth) / 2;
    lineWidths.push(lineWidth);
    lineStarts.push(lineStart);
    let cursor = lineStart;
    return line.split("").map((char) => {
      const left = cursor;
      cursor += context.measureText(char).width + charSpacing;
      return left;
    });
  });

  return { lines, charLeftOffsets, lineWidths, lineStarts };
}

// Box-fill variant of getCharLayerStyles's gradient logic: no background-clip:text
// (there's no glyph to clip to), so it's just a positioned slice of the same
// block-sized gradient — used for non-text swatches like the typewriter cursor.
export function getGradientBoxStyle(
  color: string,
  position: { left: number; top: number },
  blockSize: { width: number; height: number }
): React.CSSProperties {
  if (!isGradientColor(color)) {
    return { backgroundColor: color || "#000000" };
  }
  return {
    backgroundImage: color,
    backgroundSize: `${blockSize.width}px ${blockSize.height}px`,
    backgroundPosition: `${-position.left}px ${-position.top}px`,
    backgroundRepeat: "no-repeat"
  };
}
