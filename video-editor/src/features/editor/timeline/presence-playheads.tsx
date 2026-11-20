import { Fragment } from "react";
import { usePeerPositions, useRoomAwareness } from "../collab/position-presence";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import useStore from "../store/use-store";
import { timeMsToUnits } from "../utils/timeline";

const LABEL_MAX_WIDTH = 144; // max-w-36
const LABEL_PAD_X = 12; // px-1.5
const LABEL_CHAR_PX = 6; // ~10px semibold glyph width
const LABEL_GAP_PX = 4;
const MERGE_STACK_THRESHOLD = 3;

interface PositionedPeer {
  clientId: number;
  name: string;
  color: string;
  left: number;
  spanStart: number;
  spanEnd: number;
}

function estimateLabelWidth(name: string): number {
  return Math.min(LABEL_MAX_WIDTH, Math.max(24, name.length * LABEL_CHAR_PX + LABEL_PAD_X));
}

function clampedLabelSpan(left: number, labelWidth: number, containerWidth: number) {
  const idealStart = left - labelWidth / 2;
  const maxStart = Math.max(0, containerWidth - labelWidth);
  const start = Math.max(0, Math.min(idealStart, maxStart));
  return { spanStart: start, spanEnd: start + labelWidth };
}

export function PresencePlayheads({ scrollLeft, width }: { scrollLeft: number; width: number }) {
  const awareness = useRoomAwareness();
  const peers = usePeerPositions(awareness, "playheadMs");
  const zoom = useStore((state) => state.scale.zoom);
  const offset = useTimelineOffsetX() + TIMELINE_OFFSET_CANVAS_LEFT;

  const visible: PositionedPeer[] = [];
  for (const { clientId, name, color, value } of peers) {
    const left = offset + timeMsToUnits(value, zoom) - scrollLeft;
    if (left < offset || left >= width) continue;
    const { spanStart, spanEnd } = clampedLabelSpan(left, estimateLabelWidth(name), width);
    visible.push({ clientId, name, color, left, spanStart, spanEnd });
  }

  visible.sort((a, b) => a.spanStart - b.spanStart || a.left - b.left || a.clientId - b.clientId);

  // Cluster peers whose labels overlap horizontally at the current zoom level.
  // Zooming in spreads screen positions apart and naturally splits clusters.
  const clusters: PositionedPeer[][] = [];
  let currentCluster: PositionedPeer[] = [];
  let clusterEnd = -Infinity;

  for (const peer of visible) {
    if (currentCluster.length === 0 || peer.spanStart < clusterEnd + LABEL_GAP_PX) {
      currentCluster.push(peer);
      clusterEnd = Math.max(clusterEnd, peer.spanEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [peer];
      clusterEnd = peer.spanEnd;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[50px] z-[9] overflow-hidden">
      {clusters.map((cluster) => {
        // Assign greedy vertical rows within the cluster; if stacking reaches
        // 3+ rows, merge the cluster's labels into a single combined badge.
        const rowEnds: number[] = [];
        const rows: number[] = [];
        for (const peer of cluster) {
          let row = rowEnds.findIndex((end) => peer.spanStart >= end + LABEL_GAP_PX);
          if (row === -1) {
            row = rowEnds.length;
            rowEnds.push(peer.spanEnd);
          } else {
            rowEnds[row] = peer.spanEnd;
          }
          rows.push(row);
        }

        if (rowEnds.length >= MERGE_STACK_THRESHOLD) {
          const lead = cluster[0];
          const minLeft = Math.min(...cluster.map((peer) => peer.left));
          const maxLeft = Math.max(...cluster.map((peer) => peer.left));
          const anchorLeft = (minLeft + maxLeft) / 2;
          const othersCount = cluster.length - 1;
          return (
            <Fragment key={`cluster-${lead.clientId}`}>
              {cluster.map(({ clientId, color, left }) => (
                <div
                  key={clientId}
                  className="absolute inset-y-0 w-0.5 opacity-50"
                  style={{ left, backgroundColor: color }}
                />
              ))}
              <span
                className="absolute top-0 flex w-max max-w-48 items-center px-1.5 text-[10px] font-semibold leading-4 text-white opacity-50"
                style={{
                  left: anchorLeft,
                  backgroundColor: lead.color,
                  transform: `translateX(clamp(${-anchorLeft}px, -50%, calc(${width - anchorLeft}px - 100%)))`,
                }}
              >
                <span className="truncate">{lead.name}</span>
                <span className="shrink-0">&nbsp;and {othersCount} others</span>
              </span>
            </Fragment>
          );
        }

        return cluster.map(({ clientId, name, color, left }, index) => (
          <div key={clientId} className="absolute inset-y-0 w-0.5 opacity-50" style={{ left, backgroundColor: color }}>
            <span
              className="absolute left-0 w-max max-w-36 truncate px-1.5 text-[10px] font-semibold leading-4 text-white"
              style={{
                top: rows[index] * 16,
                backgroundColor: color,
                transform: `translateX(clamp(${-left}px, -50%, calc(${width - left}px - 100%)))`,
              }}
            >
              {name}
            </span>
          </div>
        ));
      })}
    </div>
  );
}
