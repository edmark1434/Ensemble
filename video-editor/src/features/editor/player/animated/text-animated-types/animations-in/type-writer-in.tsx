import { ITextDetails } from "@designcombo/types";
import { useMemo } from "react";
import { interpolate } from "remotion";
import { AnimatedChar } from "@/features/editor/player/animated/text-animated-types/animated-char";
import {
  getCharLayerStyles,
  getGradientBoxStyle,
  getLineHeightPx,
  getWrappedTextLayout
} from "@/features/editor/player/styles";

export default function TypeWriterIn({
                                       frame,
                                       text,
                                       details,
                                       animationTextInFrames
                                     }: {
  frame: number;
  text: string;
  details: ITextDetails;
  animationTextInFrames: number;
}) {
  const visibleCharacters = Math.floor(
    interpolate(frame, [0, animationTextInFrames], [0, text.length], {
      extrapolateRight: "clamp"
    })
  );

  const visibleText = useMemo(() => {
    let count = 0;
    return text
      .split(" ")
      .map((word) => {
        if (count + word.length <= visibleCharacters) {
          count += word.length + 1;
          return word;
        }
        if (count < visibleCharacters) {
          const partialWord = word.slice(0, visibleCharacters - count);
          count = visibleCharacters;
          return partialWord;
        }
        return "";
      })
      .join(" ");
  }, [visibleCharacters, text]);

  const letterSpacingPx = parseFloat(details.letterSpacing as any) || 0;

  const { lines, lineWidths, lineStarts } = useMemo(
    () =>
      getWrappedTextLayout(
        visibleText,
        details.width,
        details.fontSize,
        details.fontFamily,
        details.fontWeight,
        details.textAlign,
        details.wordBreak,
        letterSpacingPx
      ),
    [visibleText, details, letterSpacingPx]
  );

  const lineHeightPx = getLineHeightPx(details);
  const totalBlockHeight = lines.length * lineHeightPx;
  const verticalOffset = Math.max((details.height - totalBlockHeight) / 2, 0);
  const justify =
    details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center";
  const lastLineIndex = lines.length - 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: details.width,
        height: details.height,
        fontSize: details.fontSize,
        fontFamily: details.fontFamily,
        fontWeight: details.fontWeight,
        letterSpacing: details.letterSpacing || "normal",
        overflow: "hidden"
      }}
    >
      {lines.map((line, i) => {
        const isLastLine = i === lastLineIndex;
        const lineColorStyle = getCharLayerStyles(
          details.color,
          { left: lineStarts[i], top: verticalOffset + i * lineHeightPx },
          { width: details.width, height: details.height },
          details.textDecoration,
          details.fontSize
        );
        const cursorFillStyle = isLastLine
          ? getGradientBoxStyle(
            details.color,
            { left: lineStarts[i] + lineWidths[i], top: verticalOffset + i * lineHeightPx },
            { width: details.width, height: details.height }
          )
          : undefined;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: justify,
              whiteSpace: "pre"
            }}
          >
            <span>
              {line.length > 0 && (
                <AnimatedChar
                  char={line}
                  animationStyle={{}}
                  isGradient={lineColorStyle.isGradient}
                  shadowStrokeStyle={lineColorStyle.shadowStrokeStyle}
                  fillStyle={lineColorStyle.fillStyle}
                />
              )}
            </span>
            {isLastLine && (
              <div
                style={{
                  width: "0.08em",
                  height: "1em",
                  marginLeft: line.length > 0 ? "0.05em" : 0,
                  opacity: frame % 15 < 7 ? 1 : 0,
                  ...cursorFillStyle
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}