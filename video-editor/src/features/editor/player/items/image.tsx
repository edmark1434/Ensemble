import { useState } from "react";
import { MediaPlaceholder } from "../../components/media-placeholder";
import { useMissingMedia } from "../../store/use-missing-media";
import { isMissingMediaSource } from "../../utils/missing-media";
import useStore from "../../store/use-store";
import { useMarketAssetSource, useMarketImageFailed } from "../../hooks/use-market-asset-source";
import { IImage } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Img, useRemotionEnvironment } from "remotion";

function MarketImage({ item, ...props }: { item: IImage } & Omit<React.ComponentProps<typeof Img>, "src">) {
  const src = useMarketAssetSource(item);
  const preparationFailed = useMarketImageFailed(item);
  const { isRendering } = useRemotionEnvironment();
  const projectId = useStore(state => state.projectId);
  const missing = useMissingMedia(state => state.projectId === projectId && state.missing.has(item.details.src));
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  if (isRendering) return <Img {...props} src={item.details.src} />;
  if (missing || isMissingMediaSource(item.details.src)) return <MediaPlaceholder missing />;
  return <>
    {src && failed !== src && <Img {...props} src={src} onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />}
    {(!src || loaded !== src || failed === src) && <MediaPlaceholder failed={preparationFailed || (!!src && failed === src)} />}
  </>;
}

export default function Image({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
  return BaseSequence({ item, options, children: options.visualsActive === false ? null : <ImageContent item={item} options={options} /> });
}

function ImageContent({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
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
        transform: "scale(1)"
      })}
      animationIn={animationIn!}
      animationOut={animationOut!}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed!}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed!}
          frame={frame || 0}
        >
          <div
            id={`${item.id}-reveal-mask`}
            style={calculateMediaStyles(details, crop)}
          >
            <MarketImage
              item={item}
              data-id={item.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
            />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return children;
}
