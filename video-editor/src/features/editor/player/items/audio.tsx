import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Audio as RemotionAudio } from "@remotion/media";
import { Html5Audio, useRemotionEnvironment } from "remotion";

// Real component, so the hook lives in its own fiber. Audio() below is called
// as a plain function from renderVisibleItems, so it must not call hooks.
const AudioMedia = ({ item, fps }: { item: IAudio; fps: number }) => {
  // true in Lambda and server renders, false in the editor Player
  const { isRendering } = useRemotionEnvironment();

  const { details } = item;
  const playbackRate = item.playbackRate || 1;
  const hasTrimTo = typeof item.trim?.to === "number" && item.trim.to > 0;
  const trimBefore = ((item.trim?.from ?? 0) / 1000) * fps;
  const trimAfter = hasTrimTo ? (item.trim!.to! / 1000) * fps : undefined;
  const volume = () => (details.volume ?? 100) / 100;

  if (isRendering) {
    return (
      <Html5Audio
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        playbackRate={playbackRate}
        src={details.src}
        volume={volume}
      />
    );
  }

  return (
    <RemotionAudio
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      playbackRate={playbackRate}
      src={details.src}
      volume={volume}
    />
  );
};

export default function Audio({
  item,
  options
}: {
  item: IAudio;
  options: SequenceItemOptions;
}) {
  const { fps } = options;

  const children = <AudioMedia item={item} fps={fps} />;
  return BaseSequence({ item, options, children });
}