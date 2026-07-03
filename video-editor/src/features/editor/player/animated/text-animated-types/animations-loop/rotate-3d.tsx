import { interpolate } from "remotion";

const Rotate3d = ({
  frame,
  durationInFrames,
  text,
  details
}: {
  text: string;
  frame: number;
  durationInFrames: number;
  details: { width: number; height: number };
}) => {
  const rotation = interpolate(frame, [0, durationInFrames / 2], [0, 360]);
  const rotation2 = rotation - 180;

  return (
    <div
      style={{
        width: details.width,
        height: details.height,
        position: "relative",
        background: "transparent",
        perspective: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotateY(${rotation}deg)`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          background: "transparent"
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotateY(${rotation2}deg)`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          background: "transparent"
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default Rotate3d;
