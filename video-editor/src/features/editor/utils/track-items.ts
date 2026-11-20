import { ITrackItemsMap, ITransition, ITrackItem } from "@designcombo/types";

type GroupElement = ITrackItem | ITransition;

export const groupTrackItems = (data: {
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  trackItemsMap: ITrackItemsMap;
}): GroupElement[][] => {
  const { trackItemIds, transitionsMap, trackItemsMap } = data;

  const activeTransitions = Object.values(transitionsMap).filter(
    (t) => t.kind !== "none" && !!trackItemsMap[t.fromId] && !!trackItemsMap[t.toId]
  );

  // Track which items participate in an active (non-"none") transition and
  // which items have an incoming active transition.
  const itemTransitionMap = new Map<string, ITransition[]>();
  const incomingTransitionTargetIds = new Set<string>();
  const outgoingByFromId = new Map<string, ITransition>();

  activeTransitions.forEach((transition) => {
    const { fromId, toId } = transition;
    if (!itemTransitionMap.has(fromId)) itemTransitionMap.set(fromId, []);
    if (!itemTransitionMap.has(toId)) itemTransitionMap.set(toId, []);
    itemTransitionMap.get(fromId)?.push(transition);
    itemTransitionMap.get(toId)?.push(transition);
    incomingTransitionTargetIds.add(toId);
    if (!outgoingByFromId.has(fromId)) outgoingByFromId.set(fromId, transition);
  });

  const groups: GroupElement[][] = [];
  const processed = new Set<string>();

  // Helper function to build a connected group starting from an item
  const buildGroup = (startItemId: string): GroupElement[] => {
    const group: GroupElement[] = [];
    let currentId: string | undefined = startItemId;

    while (currentId) {
      if (processed.has(currentId)) break;

      const currentItem = trackItemsMap[currentId];
      if (!currentItem) break;

      processed.add(currentId);
      group.push(currentItem);

      const transition = outgoingByFromId.get(currentId);
      if (!transition || processed.has(transition.toId) || !trackItemsMap[transition.toId]) break;

      group.push(transition);
      currentId = transition.toId;
    }

    return group;
  };

  // Start groups from standalone items and the heads of active transition chains.
  // Only active (kind !== "none") transitions count as incoming links — a "none"
  // placeholder before an active transition must not suppress the chain head.
  for (const itemId of trackItemIds) {
    if (processed.has(itemId)) continue;

    if (!itemTransitionMap.has(itemId) || !incomingTransitionTargetIds.has(itemId)) {
      const group = buildGroup(itemId);
      if (group.length > 0) {
        groups.push(group);
      }
    }
  }

  // Fallback for any cyclic transition chain so no item is ever silently dropped.
  for (const itemId of trackItemIds) {
    if (processed.has(itemId)) continue;
    const group = buildGroup(itemId);
    if (group.length > 0) {
      groups.push(group);
    }
  }

  return groups;
};
