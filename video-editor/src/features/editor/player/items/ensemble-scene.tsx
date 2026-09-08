import { AbsoluteFill, Sequence } from "remotion";
import { ISceneTrackItem } from "../../types/ensemble-scene";
import { calculateFrames } from "../../utils/frames";
import { SequenceItemOptions } from "../base-sequence";

// Temporary blank placeholder — renders nothing but keeps the scene's
// timing correct in the composition. Once nested-block rendering exists,
// this becomes a portal into the block's own composition, likely via
// BaseSequence like every other item once ISceneDetails carries
// position/size fields.
const Scene = ({
  item,
  options
}: {
  item: ISceneTrackItem;
  options: SequenceItemOptions;
}) => {
  const { fps } = options;
  const { from, durationInFrames } = calculateFrames(
    { from: item.display.from, to: item.display.to },
    fps
  );

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames || 1 / fps}
      style={{ pointerEvents: "none" }}
    >
      <AbsoluteFill
        id={item.id}
        className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-scene`}
      />
    </Sequence>
  );
};

export default Scene;