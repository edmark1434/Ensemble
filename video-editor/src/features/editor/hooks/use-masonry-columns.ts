import { useMemo } from "react";

interface MasonryItem {
  details?: {
    width?: number;
    height?: number;
  };
}

/**
 * Places items into the shortest-current-column (row-first-feeling) masonry
 * layout, using known aspect ratios instead of measuring DOM nodes.
 *
 * Deterministic for a given items array + config: appending new items to
 * the end of `items` (e.g. via "Load More") only ever adds to columns,
 * it never relocates items placed in earlier calls — because each item's
 * column is decided strictly left-to-right based on the running heights
 * at the time it's processed.
 */
export function useMasonryColumns<T extends MasonryItem>(
  items: T[],
  columnWidth: number,
  containerWidth: number,
  gap: number
): T[][] {
  return useMemo(() => {
    const columnCount = Math.max(
      1,
      Math.floor((containerWidth + gap) / (columnWidth + gap))
    );

    const heights = new Array(columnCount).fill(0);
    const columns: T[][] = Array.from({ length: columnCount }, () => []);

    for (const item of items) {
      const w = item.details?.width || 1;
      const h = item.details?.height || 1;
      const renderedHeight = columnWidth * (h / w);

      let shortestIndex = 0;
      for (let i = 1; i < columnCount; i++) {
        if (heights[i] < heights[shortestIndex]) shortestIndex = i;
      }

      columns[shortestIndex].push(item);
      heights[shortestIndex] += renderedHeight + gap;
    }

    return columns;
  }, [items, columnWidth, containerWidth, gap]);
}