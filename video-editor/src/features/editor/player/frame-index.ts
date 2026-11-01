// Built when timeline data changes, not once per frame. Queries visit only
// branches whose time ranges can contain the requested frame.
export interface FrameRange {
  from: number;
  to: number;
  index: number;
}

interface FrameNode {
  range: FrameRange;
  maxEnd: number;
  left: FrameNode | null;
  right: FrameNode | null;
}

export function createFrameIndex(ranges: FrameRange[]): FrameNode | null {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const build = (start: number, end: number): FrameNode | null => {
    if (start >= end) return null;
    const mid = (start + end) >>> 1;
    const left = build(start, mid);
    const right = build(mid + 1, end);
    const range = sorted[mid];
    return { range, left, right, maxEnd: Math.max(range.to, left?.maxEnd ?? -Infinity, right?.maxEnd ?? -Infinity) };
  };
  return build(0, sorted.length);
}

export function groupsAtFrame(root: FrameNode | null, frame: number): number[] {
  const result: number[] = [];
  const visit = (node: FrameNode | null) => {
    if (!node || node.maxEnd <= frame) return;
    visit(node.left);
    if (node.range.from > frame) return;
    if (frame < node.range.to) result.push(node.range.index);
    visit(node.right);
  };
  visit(root);
  return result;
}
