import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Video as RemotionVideo } from "@remotion/media";
import { OffthreadVideo, useRemotionEnvironment } from "remotion";

// Real component, so the hook lives in its own fiber. Video() below is called
// as a plain function from renderVisibleItems, so it must not call hooks.
const VideoMedia = ({ item, fps }: { item: IVideo; fps: number }) => {
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
      <OffthreadVideo
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        playbackRate={playbackRate}
        src={details.src}
        volume={volume}
      />
    );
  }

  return (
    <RemotionVideo
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      playbackRate={playbackRate}
      src={details.src}
      volume={volume}
    />
  );
};

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, frame } = options;
  const { details, animations } = item;
  const { animationIn, animationOut, animationTimed } = getAnimations(
    animations!,
    item,
    frame,
    fps
  );
  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
  };
  const { durationInFrames } = calculateFrames(item.display, fps);
  const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

  const children = (
    <BoxAnim
      style={calculateContainerStyles(details, crop, {
        overflow: "hidden"
      })}
      animationIn={animationIn}
      animationOut={animationOut}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed}
          frame={frame || 0}
        >
          <div style={calculateMediaStyles(details, crop)}>
            <VideoMedia item={item} fps={fps} />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
};

export default Video;