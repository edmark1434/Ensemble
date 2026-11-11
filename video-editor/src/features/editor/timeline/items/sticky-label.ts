import { util, type FabricObject } from "@designcombo/timeline";

// Labels use item-local coordinates; include group and viewport transforms so
// they follow the visible left edge during scrolling, zooming, and dragging.
export function getStickyLabelOffset(item: FabricObject): number {
  if (!item.canvas) return 0;
  const transform = util.multiplyTransformMatrices(
    item.canvas.viewportTransform,
    item.calcTransformMatrix(),
  );
  if (transform[0] <= 0) return 0;
  const left = transform[4] - item.width / 2 * transform[0]
    - item.height / 2 * transform[2];
  return Math.min(item.width, Math.max(0, -left / transform[0]));
}
