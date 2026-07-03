import {ITextDetails} from "@designcombo/types";

const Spin = ({
  text,
  frame,
  fps,
  details,
}: {
  text: string;
  frame: number;
  fps: number;
  details: ITextDetails;
}) => {
  const t = frame / fps;
  const rotateZ = t * 360;

  return (
    <div
      style={{
        width: details.width,
        height: details.height,
        transform: `rotateZ(${rotateZ}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {text}
    </div>
  );
};
export default Spin;
