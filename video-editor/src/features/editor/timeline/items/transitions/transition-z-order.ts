// features/editor/timeline/items/transition-z-order.ts
import useStore from "@/features/editor/store/use-store";

export function patchTransitionZOrder(canvas: any) {
  // Fabric renders the active object last by default, which puts a
  // selected image/video above transitions sitting underneath it.
  // Disable that so paint order is fully controlled by _objects order.
  canvas.preserveObjectStacking = true;

  const reorderObjects = () => {
    const objects: any[] = canvas._objects;
    if (!objects || objects.length === 0) return;

    const { activeIds, transitionsMap } = useStore.getState();
    const activeSet = activeIds.length ? new Set(activeIds) : null;

    const base: any[] = [];
    const selected: any[] = [];
    const transitions: any[] = [];

    for (const obj of objects) {
      if (obj.type === "transition") {
        transitions.push(obj);
      } else if (activeSet?.has(obj.id)) {
        selected.push(obj);
      } else {
        base.push(obj);
      }
    }

    // non-transition stacking order: unselected first, selected on top
    const nonTransitionOrder = [...base, ...selected];
    const indexOf = new Map<string, number>();
    nonTransitionOrder.forEach((obj, i) => indexOf.set(obj.id, i));

    // each transition slots in right after the higher-stacked of its
    // two connected clips, so it's only ever "on top" of those two
    const insertions: { transition: any; afterIndex: number }[] = [];
    for (const t of transitions) {
      const meta = transitionsMap[t.id];
      const fromIdx = meta ? indexOf.get(meta.fromId) : undefined;
      const toIdx = meta ? indexOf.get(meta.toId) : undefined;

      const afterIndex =
        fromIdx === undefined && toIdx === undefined
          ? nonTransitionOrder.length - 1 // fallback: neighbors not found, treat as topmost
          : Math.max(fromIdx ?? -1, toIdx ?? -1);

      insertions.push({ transition: t, afterIndex });
    }
    insertions.sort((a, b) => a.afterIndex - b.afterIndex);

    const next: any[] = [];
    let ti = 0;
    for (let i = 0; i < nonTransitionOrder.length; i++) {
      next.push(nonTransitionOrder[i]);
      while (ti < insertions.length && insertions[ti].afterIndex === i) {
        next.push(insertions[ti].transition);
        ti++;
      }
    }
    while (ti < insertions.length) {
      next.push(insertions[ti].transition); // shouldn't happen, but don't drop objects
      ti++;
    }

    let unchanged = next.length === objects.length;
    if (unchanged) {
      for (let i = 0; i < next.length; i++) {
        if (next[i] !== objects[i]) { unchanged = false; break; }
      }
    }
    if (unchanged) return;

    objects.length = 0;
    objects.push(...next);
    canvas.requestRenderAll();
  };

  canvas.on("object:added", reorderObjects);

  let prevActiveIds = useStore.getState().activeIds;
  const unsubscribe = useStore.subscribe((state) => {
    if (state.activeIds !== prevActiveIds) {
      prevActiveIds = state.activeIds;
      reorderObjects();
    }
  });

  reorderObjects();

  return unsubscribe;
}