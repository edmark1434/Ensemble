// features/editor/player/items/ensemble-scene.tsx

import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { ISceneTrackItem } from "../../types/ensemble-scene";
import { calculateFrames } from "../../utils/frames";
import { SequenceItemOptions } from "../base-sequence";
import { renderVisibleItems } from "../render-visible-items";
import { getBackgroundFillStyle } from "../styles";
import { useSceneContent } from "../../store/use-scene-content-store";
import {DocSnapshot} from "@/features/editor/collab/ydoc-schema";

const Scene = ({ item, options }: { item: ISceneTrackItem; options: SequenceItemOptions }) => {
  const { fps } = options;
  const { from, durationInFrames } = calculateFrames(
    { from: item.display.from, to: item.display.to },
    fps,
  );
  const content = useSceneContent(item.details.blockId);

  return (
    <Sequence key={item.id} from={from} durationInFrames={durationInFrames || 1 / fps} style={{ pointerEvents: "none" }}>
      <AbsoluteFill id={item.id} className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-scene`}>
        {content && !item.details.hidden && (
          <SceneContentLayer content={content} fps={fps} muted={item.details.volume === 0} />
        )}
      </AbsoluteFill>
    </Sequence>
  );
};

const SceneContentLayer = ({ content, fps, muted }: { content: DocSnapshot; fps: number; muted: boolean }) => {
  // Remotion's frame is relative to the nearest ancestor <Sequence> — we're
  // already nested inside the scene's own Sequence above, so this is the
  // scene-local frame, which is exactly what the nested items need.
  const frame = useCurrentFrame();

  // Scene-level mute wins over whatever each nested item's own volume
  // says — same semantics as toggling mute on the scene item itself.
  const trackItemsMap = muted
    ? Object.fromEntries(
      Object.entries(content.trackItemsMap).map(([id, it]) => [id, { ...it, details: { ...it.details, volume: 0 } }]),
    )
    : content.trackItemsMap;

  return (
    <>
      {content.background && <AbsoluteFill style={getBackgroundFillStyle(content.background.value)} />}
      {renderVisibleItems({
        trackItemIds: content.trackItemIds,
        trackItemsMap,
        transitionsMap: content.transitionsMap,
        // Always the OUTER/project fps here, never the block's own stored
        // fps — Remotion needs one consistent fps for the whole player, so
        // the nested item timings (in ms) get re-derived against that, not
        // whatever fps the block would use if it were played standalone.
        fps,
        size: content.size!,
        frame,
        nested: true,
      })}
    </>
  );
};

export default Scene;