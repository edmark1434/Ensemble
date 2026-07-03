import { interpolate } from "remotion";

const TOTAL_LAYERS = 9;

const Vintage = ({
  text,
  frame,
  details,
  fps
}: {
  text: string;
  frame: number;
  details: {
    fontSize: number;
    color: string;
    width: number;
    height: number;
  };
  fps: number;
}) => {
  const duration = fps;
  const half = duration / 2;
  const layerCount = Math.round(
    frame % fps <= half
      ? interpolate(frame % fps, [0, half], [1, TOTAL_LAYERS])
      : interpolate(frame % fps, [half, duration], [TOTAL_LAYERS, 1])
  );

  return (
    <div
      style={{
        width: details.width,
        height: details.height,
        position: "relative"
      }}
    >
      {Array.from({ length: layerCount }).map((_, i) => {
        const dx = i * 4;
        const dy = -i * 2;
        const opacity = 1 / (layerCount - i);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${dx * 4}px, ${dy * 4}px)`,
              fontWeight: "bold",
              fontSize: details.fontSize,
              zIndex: i,
              color: layerCount !== i + 1 ? "red" : details.color,
              background: "transparent",
              opacity
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
};

export default Vintage;
