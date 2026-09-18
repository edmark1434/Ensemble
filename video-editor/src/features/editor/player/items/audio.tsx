import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Audio as RemotionAudio } from "@remotion/media";

export default function Audio({
  item,
  options
}: {
  item: IAudio;
  options: SequenceItemOptions;
}) {
  // const { fps } = options;
  const fps = 30;

  const { details } = item;
  const playbackRate = item.playbackRate || 1;
  const hasTrimTo = typeof item.trim?.to === "number" && item.trim.to > 0;

  const children = (
    <RemotionAudio
      trimBefore={((item.trim?.from ?? 0) / 1000) * fps}
      trimAfter={hasTrimTo ? (item.trim!.to! / 1000) * fps : undefined}
      playbackRate={playbackRate}
      src={details.src}
      volume={() => (details.volume ?? 100) / 100}
    />
  );
  return BaseSequence({ item, options, children });
}