import { ITrackItemsMap, ItransitionsMap, ISize } from "@designcombo/types";
import { TransitionSeries, Transitions } from "@designcombo/transitions";
import { groupTrackItems } from "../utils/track-items";
import { SequenceItem } from "./sequence-item";
import { isSceneItem } from "../types/ensemble-scene";

export interface RenderVisibleItemsOptions {
  trackItemIds: string[];
  trackItemsMap: ITrackItemsMap;
  transitionsMap: ItransitionsMap;
  fps: number;
  size: ISize;
  frame?: number;
  handleTextChange?: (id: string, text: string) => void;
  onTextBlur?: (id: string, text: string) => void;
  editableTextId?: string | null;
  nested?: boolean; // true only when rendering a scene's own nested content
}

export function renderVisibleItems({
  trackItemIds, trackItemsMap, transitionsMap, fps, size, frame,
  handleTextChange, onTextBlur, editableTextId, nested = false,
}: RenderVisibleItemsOptions) {
  const groupedItems = groupTrackItems({ trackItemIds, transitionsMap, trackItemsMap });

  const visibleGroupedItems = groupedItems
    .map((group) => group.filter((g) => g.type === "transition" || !trackItemsMap[g.id]?.details?.hidden))
    .filter((group) => group.length > 0);

  const skipIfNestedScene = (item: { id: string; type: string }) => {
    if (nested && isSceneItem(item.type)) {
      console.warn("renderVisibleItems: nested scene item found, skipping", item.id);
      return true;
    }
    return false;
  };

  return visibleGroupedItems.map((group, index) => {
    if (group.length === 1) {
      const item = trackItemsMap[group[0].id];
      if (skipIfNestedScene(item)) return null;
      return SequenceItem[item.type](item, {
        fps, size, frame, handleTextChange, onTextBlur, editableTextId, isTransition: false,
      });
    }

    const firstItem = trackItemsMap[group[0].id];
    const rawFrom = (firstItem.display.from / 1000) * fps;
    const from = Number.isFinite(rawFrom) ? rawFrom : 0;

    return (
      <TransitionSeries from={from} key={index}>
        {group.map((g) => {
          if (g.type === "transition") {
            const t = transitionsMap[g.id];
            const rawDuration = (t.duration / 1000) * fps;
            const isBad = !Number.isFinite(rawDuration) || rawDuration <= 0;
            if (isBad) {
              console.warn("[transition-nan-guard] bad transition duration, clamped", {
                transitionId: t.id, rawDuration: t.duration, fromId: (t as any).fromId, toId: (t as any).toId,
              });
            }
            return Transitions[t.kind]({
              durationInFrames: isBad ? 1 : Math.round(rawDuration), ...size, id: t.id, direction: t.direction,
            });
          }
          const item = trackItemsMap[g.id];
          if (skipIfNestedScene(item)) return null;
          return SequenceItem[item.type](item, {
            fps, size, frame, handleTextChange, onTextBlur, editableTextId, isTransition: true,
          });
        })}
      </TransitionSeries>
    );
  });
}