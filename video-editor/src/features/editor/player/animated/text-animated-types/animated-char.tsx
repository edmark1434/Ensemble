import React from "react";

/**
 * Stacks the two text layers (stroke/shadow, then gradient/solid fill)
 * under one animated wrapper so transform/opacity apply to both at once.
 */
export const AnimatedChar: React.FC<{
  char: string;
  animationStyle: React.CSSProperties;
  isGradient: boolean;
  shadowStrokeStyle: React.CSSProperties;
  fillStyle: React.CSSProperties;
}> = ({ char, animationStyle, isGradient, shadowStrokeStyle, fillStyle }) => {
  const display = char === " " ? "\u00A0" : char;

  if (!isGradient) {
    return (
      <span style={{ display: "inline-block", whiteSpace: "nowrap", ...animationStyle, ...fillStyle }}>
      {display}
    </span>
    );
  }

  return (
    <span style={{ display: "inline-block", position: "relative", whiteSpace: "nowrap", ...animationStyle }}>
      <span style={{ position: "absolute", ...shadowStrokeStyle }}>
        {display}
      </span>
      <span style={{ position: "relative", ...fillStyle }}>
        {display}
      </span>
    </span>
  );
};