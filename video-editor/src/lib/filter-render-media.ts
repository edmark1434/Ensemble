import type { ITrackItem, ITransition } from "@designcombo/types";
import type { ISceneDetails } from "@/features/editor/types/ensemble-scene";

interface RenderContent {
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
  tracks?: { items: string[] }[];
  transitionsMap?: Record<string, ITransition>;
  transitionIds?: string[];
}

// Operates on the render request's private copy. Keep timing and empty lanes intact.
export function filterRenderMedia(content: RenderContent, shouldOmit: (item: ITrackItem) => boolean) {
  const removed = new Set<string>();
  for (const [id, item] of Object.entries(content.trackItemsMap)) {
    if (String(item.type) === "scene") {
      const nested = (item.details as unknown as ISceneDetails).content;
      if (nested) filterRenderMedia(nested, shouldOmit);
    } else if (["audio", "video", "image"].includes(item.type) && shouldOmit(item)) {
      removed.add(id);
      delete content.trackItemsMap[id];
    }
  }
  if (!removed.size) return;
  for (const [id, transition] of Object.entries(content.transitionsMap ?? {})) {
    if (removed.has(transition.fromId) || removed.has(transition.toId)) {
      removed.add(id);
      delete content.transitionsMap![id];
    }
  }
  for (const item of Object.values(content.trackItemsMap)) {
    const endpoint = item as ITrackItem & { transitionInfo?: { transition?: ITransition } };
    const transition = endpoint.transitionInfo?.transition;
    if (transition && removed.has(transition.id)) delete endpoint.transitionInfo;
  }
  const keep = (id: string) => !removed.has(id);
  content.trackItemIds = content.trackItemIds.filter(keep);
  if (content.transitionIds) content.transitionIds = content.transitionIds.filter(keep);
  for (const track of content.tracks ?? []) track.items = track.items.filter(keep);
}
