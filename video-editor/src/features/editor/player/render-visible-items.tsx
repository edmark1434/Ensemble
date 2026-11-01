import { Fragment, useMemo } from "react";
import { createFrameIndex, groupsAtFrame, type FrameRange } from "./frame-index";
import { ITrackItemsMap, ItransitionsMap, ISize } from "@designcombo/types";
import { TransitionSeries, Transitions } from "@designcombo/transitions";
import { groupTrackItems } from "../utils/track-items";
import { SequenceItem } from "./sequence-item";
import { isSceneItem, type ISceneDetails } from "../types/ensemble-scene";

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
  visualsActive?: boolean;
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

export function RenderVisibleItems({
  trackItemIds, trackItemsMap, transitionsMap, fps, size, frame,
  handleTextChange, onTextBlur, editableTextId, nested = false, visualsActive = true,
}: RenderVisibleItemsOptions) {
  const plan = useMemo(() => {
    const groupedItems = groupTrackItems({ trackItemIds, transitionsMap, trackItemsMap });
    const timelineFrames = trackItemIds.reduce((max, id) => {
      const end = trackItemsMap[id]?.display.to;
      return Number.isFinite(end) ? Math.max(max, Math.ceil(end * fps / 1000)) : max;
    }, 1);
    const containsVideo = (id: string) => {
      const item = trackItemsMap[id];
      if (!item || item.details?.hidden) return false;
      if (item.type === "video") return true;
      if (!nested && isSceneItem(item.type)) {
        const content = (item.details as unknown as ISceneDetails).content;
        return content?.trackItemIds.some(innerId => {
          const inner = content.trackItemsMap[innerId];
          return !!inner && !inner.details?.hidden && inner.type === "video";
        }) ?? false;
      }
      return false;
    };

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
      .map((group) => dropDanglingTransitions(group.filter((entry) => entry && isRenderable(entry))))
      .filter((group) => group.length > 0);

    const eager: number[] = [];
    const ranges: FrameRange[] = [];
    const bounds: Array<{ from: number; to: number }> = [];
    visibleGroupedItems.forEach((group, index) => {
      const items = group.filter(g => g.type !== "transition").map(g => trackItemsMap[g.id]);
      if (!items.length) return;
      const from = items[0].display.from * fps / 1000;
      const hasTransition = group.some(g => g.type === "transition");
      const transitionPadding = group.reduce((max, g) => {
        if (g.type !== "transition") return max;
        const duration = (transitionsMap[g.id]?.duration ?? 0) * fps / 1000;
        return Math.max(max, Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 1);
      }, 0);
      // TransitionSeries extends both sides around a cut. Keep a conservative
      // group envelope; its own Sequences decide exactly which content mounts.
      const to = hasTransition
        ? from + items.reduce((sum, item) => sum + (item.display.to - item.display.from) * fps / 1000, 0) + transitionPadding
        : Math.max(...items.map(item => item.display.to * fps / 1000));
      bounds[index] = { from, to };
      if (items.some(item => !["image", "text", "caption"].includes(item.type))) {
        // In particular, never unmount eager editor video elements during seeking.
        eager.push(index);
        return;
      }
      ranges.push({ index, from, to });
    });
    return { groups: visibleGroupedItems, eager, bounds, index: createFrameIndex(ranges), timelineFrames, videoIds: new Set(trackItemIds.filter(containsVideo)) };
  }, [trackItemIds, trackItemsMap, transitionsMap, fps, nested]);

  const activeGroups = [...plan.eager, ...(visualsActive ? groupsAtFrame(plan.index, frame ?? 0) : [])].sort((a, b) => a - b);

  const renderItem = (id: string, isTransition: boolean, active: boolean) => {
    const item = trackItemsMap[id];
    return SequenceItem[item.type](item, {
      fps, size, frame, handleTextChange, onTextBlur, editableTextId, isTransition, nested, visualsActive: active,
      keepMountedFor: plan.videoIds.has(id) ? plan.timelineFrames : undefined,
    });
  };

  return activeGroups.map(index => {
    const group = plan.groups[index];
    const bounds = plan.bounds[index];
    const active = visualsActive && (frame ?? 0) >= bounds.from && (frame ?? 0) < bounds.to;
    const hasTransition = group.some((g) => g.type === "transition");

    // Either a lone item, or a group whose transitions all got dropped
    // above. Render the members as plain sequences — a TransitionSeries
    // with no transitions in it is just a stricter Series.
    if (!hasTransition) {
      return <Fragment key={group[0].id}>{group.map((g) => renderItem(g.id, false, active))}</Fragment>;
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
      return renderItem(g.id, true, active);
    });

    return (
      <TransitionSeries from={from} key={group[0].id}
        premountFor={group.some(g => plan.videoIds.has(g.id)) ? plan.timelineFrames : undefined}
        postmountFor={group.some(g => plan.videoIds.has(g.id)) ? plan.timelineFrames : undefined}>
        {children.filter(Boolean)}
      </TransitionSeries>
    );
  });
}
