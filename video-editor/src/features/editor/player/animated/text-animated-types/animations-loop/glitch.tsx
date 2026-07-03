import {ITextDetails} from "@designcombo/types";

const GlitchText = ({
  text,
  frame,
  details,
}: {
  text: string;
  frame: number;
  details: ITextDetails;
}) => {
  const glitchIntensity = Math.sin(frame / 10) * 10;
  const rgbOffset = Math.sin(frame / 5) * 10;

  return (
    <div
      style={{
        width: details.width,
        height: details.height,
        position: "relative",
        opacity: 0.8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          position: "absolute",
          color: "cyan",
          transform: `translate(${rgbOffset}px, ${glitchIntensity}px)`,
          mixBlendMode: "screen"
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "absolute",
          color: "magenta",
          transform: `translate(${-rgbOffset}px, ${-glitchIntensity}px)`,
          mixBlendMode: "screen"
        }}
      >
        {text}
      </div>
      <div style={{ color: "white" }}>
        <span style={{ paddingInline: "10px" }}>{text}</span>
      </div>
    </div>
  );
};

export default GlitchText;
