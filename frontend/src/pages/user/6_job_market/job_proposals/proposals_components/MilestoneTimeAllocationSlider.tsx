import React, { useState, useRef, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import type { Milestone } from "./3_proposal_milestones";

interface MilestoneTimeAllocationSliderProps {
  milestones: Milestone[];
  totalTimelineHours: number;
  onUpdateHours: (updated: { id: string; hours: number }[]) => void;
  className?: string;
}

const PHASE_COLORS = [
  {
    bg: "bg-blue-500/20 dark:bg-blue-500/25",
    border: "border-blue-500/40 dark:border-blue-500/50",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    bg: "bg-purple-500/20 dark:bg-purple-500/25",
    border: "border-purple-500/40 dark:border-purple-500/50",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    bg: "bg-emerald-500/20 dark:bg-emerald-500/25",
    border: "border-emerald-500/40 dark:border-emerald-500/50",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    bg: "bg-amber-500/20 dark:bg-amber-500/25",
    border: "border-amber-500/40 dark:border-amber-500/50",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
];

export const MilestoneTimeAllocationSlider: React.FC<MilestoneTimeAllocationSliderProps> = ({
  milestones,
  totalTimelineHours,
  onUpdateHours,
  className = "",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandleIndex, setActiveHandleIndex] = useState<number | null>(null);
  const [hoveredHandleIndex, setHoveredHandleIndex] = useState<number | null>(null);

  const effectiveTotalHours = totalTimelineHours > 0 ? totalTimelineHours : 72;

  // Compute normalized hours array summing to effectiveTotalHours
  const normalizedHours = React.useMemo(() => {
    if (milestones.length === 0) return [];
    if (milestones.length === 1) return [effectiveTotalHours];

    const raw = milestones.map((m) => Math.max(1, Number(m.hours) || 0));
    const sum = raw.reduce((a, b) => a + b, 0);

    if (sum === 0) {
      const equal = Math.floor(effectiveTotalHours / milestones.length);
      const res = Array(milestones.length).fill(equal);
      res[res.length - 1] = effectiveTotalHours - equal * (milestones.length - 1);
      return res;
    }

    if (sum !== effectiveTotalHours) {
      let running = 0;
      return raw.map((val, idx) => {
        if (idx === raw.length - 1) {
          return Math.max(1, effectiveTotalHours - running);
        }
        const scaled = Math.max(1, Math.round((val / sum) * effectiveTotalHours));
        running += scaled;
        return scaled;
      });
    }

    return raw;
  }, [milestones, effectiveTotalHours]);

  // Boundaries in percentage (0 to 100)
  const boundaries = React.useMemo(() => {
    const bounds: number[] = [];
    let acc = 0;
    for (let i = 0; i < normalizedHours.length - 1; i++) {
      acc += (normalizedHours[i] / effectiveTotalHours) * 100;
      bounds.push(acc);
    }
    return bounds;
  }, [normalizedHours, effectiveTotalHours]);

  const stateRef = useRef({
    boundaries,
    normalizedHours,
    effectiveTotalHours,
    milestones,
    onUpdateHours,
  });
  useEffect(() => {
    stateRef.current = {
      boundaries,
      normalizedHours,
      effectiveTotalHours,
      milestones,
      onUpdateHours,
    };
  });

  const updateBoundaryPosition = useCallback((handleIdx: number, clientX: number) => {
    if (!trackRef.current) return;
    const { boundaries: bList, normalizedHours: hList, effectiveTotalHours: totalH, milestones: mList, onUpdateHours: onUpdate } = stateRef.current;
    if (handleIdx < 0 || handleIdx >= bList.length) return;

    const rect = trackRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    if (trackWidth <= 0) return;

    const rawPct = ((clientX - rect.left) / trackWidth) * 100;

    const MIN_HOURS_PCT = 5;
    const prevBoundary = handleIdx === 0 ? 0 : bList[handleIdx - 1];
    const nextBoundary = handleIdx === bList.length - 1 ? 100 : bList[handleIdx + 1];

    const minAllowed = prevBoundary + MIN_HOURS_PCT;
    const maxAllowed = nextBoundary - MIN_HOURS_PCT;

    const clampedPct = Math.max(minAllowed, Math.min(maxAllowed, rawPct));
    const targetCumulativeHours = Math.round((clampedPct / 100) * totalH);

    const prevHoursAcc = handleIdx === 0 ? 0 : hList.slice(0, handleIdx).reduce((a, b) => a + b, 0);
    const nextHoursAcc = hList.slice(0, handleIdx + 2).reduce((a, b) => a + b, 0);

    const newLeftHours = Math.max(1, targetCumulativeHours - prevHoursAcc);
    const newRightHours = Math.max(1, nextHoursAcc - targetCumulativeHours);

    const newHours = [...hList];
    newHours[handleIdx] = newLeftHours;
    newHours[handleIdx + 1] = newRightHours;

    const updates = mList.map((m, idx) => ({
      id: m.id,
      hours: newHours[idx],
    }));

    onUpdate(updates);
  }, []);

  // Global window listeners for drag
  useEffect(() => {
    if (activeHandleIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) {
        setActiveHandleIndex(null);
        return;
      }
      updateBoundaryPosition(activeHandleIndex, e.clientX);
    };

    const handlePointerUp = () => {
      setActiveHandleIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [activeHandleIndex, updateBoundaryPosition]);

  const handleHandlePointerDown = (handleIdx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandleIndex(handleIdx);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current || milestones.length <= 1) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;

    let closestIdx = 0;
    let minDist = Infinity;
    boundaries.forEach((b, idx) => {
      const dist = Math.abs(b - clickPct);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    updateBoundaryPosition(closestIdx, e.clientX);
  };

  if (milestones.length === 0) return null;

  return (
    <div className={`space-y-1.5 select-none ${className}`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1">
          <Clock className="h-3 w-3 text-zinc-400" />
          <span>Timeline Split</span>
          <span className="text-[10px] text-zinc-400 font-normal">(drag pins)</span>
        </span>
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          {effectiveTotalHours}h Total Timeline
        </span>
      </div>

      {/* Main Track & Handles */}
      <div className="relative pt-2 pb-0">
        {/* Track Bar (Slim h-4, clean line without text inside) */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative w-full h-4 rounded-md border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800/80 flex overflow-hidden shadow-2xs cursor-pointer"
        >
          {normalizedHours.map((hoursVal, idx) => {
            const color = PHASE_COLORS[idx % PHASE_COLORS.length];
            const m = milestones[idx];
            const widthPct = (hoursVal / effectiveTotalHours) * 100;
            const days = (hoursVal / 24).toFixed(1).replace(/\.0$/, "");

            return (
              <div
                key={m?.id || idx}
                style={{ width: `${widthPct}%` }}
                className={`relative h-full ${color.bg} ${
                  idx < normalizedHours.length - 1 ? "border-r border-zinc-300/80 dark:border-zinc-700/80" : ""
                } transition-[width] duration-75`}
                title={`${m?.name || `Phase ${idx + 1}`}: ${hoursVal}h (${days}d)`}
              />
            );
          })}
        </div>

        {/* Divider Pins */}
        {milestones.length > 1 &&
          boundaries.map((pos, handleIdx) => {
            const isDragging = activeHandleIndex === handleIdx;
            const isHovered = hoveredHandleIndex === handleIdx;

            const leftH = normalizedHours[handleIdx];
            const rightH = normalizedHours[handleIdx + 1];

            return (
              <div
                key={handleIdx}
                style={{ left: `${pos}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 cursor-ew-resize group"
                onPointerDown={(e) => handleHandlePointerDown(handleIdx, e)}
                onPointerEnter={() => setHoveredHandleIndex(handleIdx)}
                onPointerLeave={() => setHoveredHandleIndex(null)}
              >
                {/* Floating Tooltip */}
                {(isDragging || isHovered) && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9.5px] font-bold shadow-md pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <span>{leftH}h</span>
                    <span className="text-zinc-400 dark:text-zinc-500">|</span>
                    <span>{rightH}h</span>
                  </div>
                )}

                {/* Circular Pin Head (Slim w-3.5 h-3.5) */}
                <div
                  className={`w-3.5 h-3.5 rounded-full border-[1.5px] bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center transition-transform ${
                    isDragging
                      ? "border-emerald-600 dark:border-emerald-400 scale-110 ring-2 ring-emerald-500/30"
                      : isHovered
                      ? "border-zinc-900 dark:border-white scale-105"
                      : "border-zinc-800 dark:border-zinc-300"
                  }`}
                >
                  <div
                    className={`w-1 h-1 rounded-full transition-colors ${
                      isDragging
                        ? "bg-emerald-600 dark:bg-emerald-400"
                        : "bg-zinc-800 dark:bg-zinc-300"
                    }`}
                  />
                </div>

                {/* Vertical Stem */}
                <div
                  className={`w-[1.5px] h-3.5 transition-colors ${
                    isDragging
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : isHovered
                      ? "bg-zinc-900 dark:bg-white"
                      : "bg-zinc-700 dark:bg-zinc-300"
                  }`}
                />
              </div>
            );
          })}
      </div>

      {/* Hours below adjustments (no tags, tight gap) */}
      <div className="flex w-full pt-0.5 px-0.5">
        {normalizedHours.map((hoursVal, idx) => {
          const m = milestones[idx];
          const color = PHASE_COLORS[idx % PHASE_COLORS.length];
          const widthPct = (hoursVal / effectiveTotalHours) * 100;
          const days = (hoursVal / 24).toFixed(1).replace(/\.0$/, "");

          return (
            <div
              key={m?.id || idx}
              style={{ width: `${widthPct}%` }}
              className="text-center transition-[width] duration-75 overflow-visible"
              title={`${m?.name || `Phase ${idx + 1}`}: ${hoursVal}h (${days}d)`}
            >
              <span className={`text-[11px] font-extrabold ${color.text} inline-block`}>
                {hoursVal}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneTimeAllocationSlider;