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

interface GroupEntry {
  id: string;
  type: string;
}

// TransitionSeries' contract is positional: every Transition must sit
// between two Sequences. Anything that removes a member from a group
// after grouping — a hidden item, a nested scene we refuse to recurse
// into, an item whose id no longer resolves — can leave a transition
// leading, trailing, or back-to-back with another transition, and
// Remotion throws on the malformed child list rather than skipping it.
// Drop those transitions instead of handing over a group that can't
// render.
function dropDanglingTransitions(group: GroupEntry[]): GroupEntry[] {
  return group.filter((entry, i) => {
    if (entry.type !== "transition") return true;
    const before = group[i - 1];
    const after = group[i + 1];
    return (
      !!before && before.type !== "transition" &&
      !!after && after.type !== "transition"
    );
  });
}

export function renderVisibleItems({
  trackItemIds, trackItemsMap, transitionsMap, fps, size, frame,
  handleTextChange, onTextBlur, editableTextId, nested = false,
}: RenderVisibleItemsOptions) {
  const groupedItems = groupTrackItems({ trackItemIds, transitionsMap, trackItemsMap });

  const isRenderable = (g: GroupEntry) => {
    if (g.type === "transition") return !!transitionsMap[g.id];
    const item = trackItemsMap[g.id];
    if (!item) return false;
    if (item.details?.hidden) return false;
    // A scene inside a scene would recurse into its own player; the
    // nested layer is a flat snapshot by design.
    if (nested && isSceneItem(item.type)) {
      console.warn("renderVisibleItems: nested scene item found, skipping", g.id);
      return false;
    }
    return true;
  };

  const visibleGroupedItems = groupedItems
    .map((group) => dropDanglingTransitions(group.filter(isRenderable)))
    .filter((group) => group.length > 0);

  const renderItem = (id: string, isTransition: boolean) => {
    const item = trackItemsMap[id];
    return SequenceItem[item.type](item, {
      fps, size, frame, handleTextChange, onTextBlur, editableTextId, isTransition, nested,
    });
  };

  return visibleGroupedItems.map((group, index) => {
    const hasTransition = group.some((g) => g.type === "transition");

    // Either a lone item, or a group whose transitions all got dropped
    // above. Render the members as plain sequences — a TransitionSeries
    // with no transitions in it is just a stricter Series.
    if (!hasTransition) {
      return group.map((g) => renderItem(g.id, false));
    }

    const firstItem = trackItemsMap[group[0].id];
    const rawFrom = (firstItem.display.from / 1000) * fps;
    const from = Number.isFinite(rawFrom) ? rawFrom : 0;

    const children = group.map((g) => {
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
      return renderItem(g.id, true);
    });

    return (
      <TransitionSeries from={from} key={index}>
        {children.filter(Boolean)}
      </TransitionSeries>
    );
  });
}