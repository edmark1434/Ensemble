import { useMemo } from "react";

interface MasonryItem {
  details?: {
    width?: number;
    height?: number;
  };
}

export interface MasonryRowItem<T> {
  item: T;
  width: number;
}

export interface MasonryRow<T> {
  items: MasonryRowItem<T>[];
  height: number;
}

interface MasonryRowsOptions {
  gap?: number;
  targetRowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
}

/**
 * Justified-row masonry layout (Canva / Google Photos style): items are
 * packed left-to-right into a row until including the next item would
 * shrink the row below targetRowHeight, then that row's height is solved
 * for so the row's items exactly fill containerWidth (clamped to
 * [minRowHeight, maxRowHeight]). The final, incomplete row is rendered at
 * targetRowHeight rather than stretched, since forcing a near-empty row to
 * fill the full width usually looks wrong (a lone item blown up or
 * squashed).
 *
 * The min/max clamp only ever loosens a row (leaving a gap on the right
 * when a row would otherwise be too tall) - it never lets a row overflow.
 * If including the item that triggers a flush would force the row's
 * natural height below minRowHeight, that item is backed out and pushed
 * to the next row instead of being kept with its width silently exceeding
 * the container. This matters most for content with a narrow spread of
 * aspect ratios (e.g. video thumbnails clustering around 16:9) - a single
 * item can jump the row well past the target width in one step, and
 * without the back-out, clamping alone can't stop that row from
 * overflowing.
 *
 * Unlike useMasonryColumns, this is NOT append-stable: the last row is
 * intentionally left "open" until enough items arrive to fill it, so
 * appending items (e.g. "Load more") can reflow what was previously the
 * last row into a newly-justified one. That's expected for this layout -
 * it's how justified galleries always behave.
 */
export function useMasonryRows<T extends MasonryItem>(
  items: T[],
  containerWidth: number,
  options: MasonryRowsOptions = {}
): MasonryRow<T>[] {
  const {
    gap = 8,
    targetRowHeight = 140,
    minRowHeight = 120,
    maxRowHeight = 999999
  } = options;

  return useMemo(() => {
    if (containerWidth <= 0 || items.length === 0) return [];

    type BufferEntry = { item: T; aspectRatio: number };

    const rows: MasonryRow<T>[] = [];
    let rowBuffer: BufferEntry[] = [];
    let aspectSum = 0;

    // Height the row would need to be, right now, for its current items to
    // exactly fill containerWidth (unclamped).
    const naturalHeightFor = (buffer: BufferEntry[], sum: number) => {
      const totalGaps = gap * (buffer.length - 1);
      const availableWidth = containerWidth - totalGaps;
      return availableWidth / sum;
    };

    const commitRow = (buffer: BufferEntry[], height: number) => {
      rows.push({
        items: buffer.map(({ item, aspectRatio }) => ({
          item,
          width: aspectRatio * height
        })),
        height
      });
    };

    for (const item of items) {
      const w = item.details?.width || 1;
      const h = item.details?.height || 1;
      const aspectRatio = w / h;

      rowBuffer.push({ item, aspectRatio });
      aspectSum += aspectRatio;

      const naturalHeight = naturalHeightFor(rowBuffer, aspectSum);
      if (naturalHeight > targetRowHeight) {
        // Row isn't full width yet at the target height - keep collecting.
        continue;
      }

      if (naturalHeight < minRowHeight && rowBuffer.length > 1) {
        // Including this item squeezes the row shorter than we're willing
        // to go. Close the row out WITHOUT it - that's guaranteed to solve
        // to something taller, since the row hadn't hit target height
        // before this item - then start the next row with this item.
        const overflowEntry = rowBuffer.pop()!;
        aspectSum -= overflowEntry.aspectRatio;

        const heightWithoutLast = naturalHeightFor(rowBuffer, aspectSum);
        commitRow(
          rowBuffer,
          Math.max(minRowHeight, Math.min(maxRowHeight, heightWithoutLast))
        );

        rowBuffer = [overflowEntry];
        aspectSum = overflowEntry.aspectRatio;
        continue;
      }

      commitRow(
        rowBuffer,
        Math.max(minRowHeight, Math.min(maxRowHeight, naturalHeight))
      );
      rowBuffer = [];
      aspectSum = 0;
    }

    // Leftover partial row - don't stretch it to fill the width.
    if (rowBuffer.length > 0) {
      commitRow(
        rowBuffer,
        Math.max(minRowHeight, Math.min(maxRowHeight, targetRowHeight))
      );
    }

    return rows;
  }, [items, containerWidth, gap, targetRowHeight, minRowHeight, maxRowHeight]);
}