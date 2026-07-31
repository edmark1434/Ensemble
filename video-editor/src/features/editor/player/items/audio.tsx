import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Html5Audio } from "remotion";

export default function Audio({
  item,
  options
}: {
  item: IAudio;
  options: SequenceItemOptions;
}) {
  const { fps } = options;
  const { details } = item;
  const playbackRate = item.playbackRate || 1;
  const children = (
    <Html5Audio
      trimBefore={(item.trim?.from! / 1000) * fps}
      trimAfter={(item.trim?.to! / 1000) * fps || 1 / fps}
      playbackRate={playbackRate}
      src={details.src}
      volume={() => (details.volume ?? 100) / 100}
    />
  );
  return BaseSequence({ item, options, children });
}
