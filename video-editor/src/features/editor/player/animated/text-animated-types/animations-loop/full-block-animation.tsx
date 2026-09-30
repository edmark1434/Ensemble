import React from "react";
import { ITextDetails } from "@designcombo/types";
import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";

export interface FullBlockAnimationProps {
  lines: string[];
  lineStarts: number[];
  lineHeightPx: number;
  verticalOffset: number;
  frame: number;
  fps: number;
  details: ITextDetails;
  animationTextInFrames: number;
  animationTextOutFrames: number;
  animationTextLoopFrames: number;
  durationInFrames: number;
  animationFonts: { fontFamily: string; url: string }[];
  getColorStyle: (
    left: number,
    top: number
  ) => {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}

/**
 * The raw multi-line block, unwrapped by any animation transform. Every full-
 * block loop animation should render this exactly once (not once per line)
 * and wrap it however it needs — one shared transform, a two-layer flip
 * stack, whatever. This is what makes the block move as one rigid body.
 */
export function renderBlockContent({
                                     lines,
                                     lineStarts,
                                     lineHeightPx,
                                     verticalOffset,
                                     details,
                                     getColorStyle,
                                   }: FullBlockAnimationProps) {
  const alignItems =
    details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems }}>
      {lines.map((line, rowIndex) => {
        const colorStyle = getColorStyle(lineStarts[rowIndex], verticalOffset + rowIndex * lineHeightPx);
        return (
          <div key={rowIndex}>
            <AnimatedChar
              char={line}
              animationStyle={{}}
              isGradient={colorStyle.isGradient}
              shadowStrokeStyle={colorStyle.shadowStrokeStyle}
              fillStyle={colorStyle.fillStyle}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Convenience wrapper for the common case: one style object (usually just
 * `transform`, maybe `filter`/`opacity` too) applied to the whole block.
 * Animations with a custom multi-layer structure (e.g. a flip-card) should
 * call renderBlockContent directly instead of this.
 */
export function renderFullBlock(props: FullBlockAnimationProps, containerStyle: React.CSSProperties) {
  return <div style={containerStyle}>{renderBlockContent(props)}</div>;
}