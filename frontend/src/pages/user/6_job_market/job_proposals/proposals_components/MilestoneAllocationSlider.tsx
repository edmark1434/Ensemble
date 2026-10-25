import React, { useState, useRef, useEffect, useCallback } from "react";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { Milestone } from "./3_proposal_milestones";

interface MilestoneAllocationSliderProps {
  milestones: Milestone[];
  totalBid: number;
  onUpdatePercentages: (updated: { id: string; percentage: number }[]) => void;
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
  {
    bg: "bg-rose-500/20 dark:bg-rose-500/25",
    border: "border-rose-500/40 dark:border-rose-500/50",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    bg: "bg-teal-500/20 dark:bg-teal-500/25",
    border: "border-teal-500/40 dark:border-teal-500/50",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
];

export const MilestoneAllocationSlider: React.FC<MilestoneAllocationSliderProps> = ({
  milestones,
  totalBid,
  onUpdatePercentages,
  className = "",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandleIndex, setActiveHandleIndex] = useState<number | null>(null);
  const [hoveredHandleIndex, setHoveredHandleIndex] = useState<number | null>(null);

  // Normalize percentages so they sum to 100
  const normalizedPercentages = React.useMemo(() => {
    if (milestones.length === 0) return [];
    if (milestones.length === 1) return [100];

    const raw = milestones.map((m) => Math.max(1, Number(m.percentage) || 0));
    const sum = raw.reduce((a, b) => a + b, 0);

    if (sum === 0) {
      const equal = Math.floor(100 / milestones.length);
      const res = Array(milestones.length).fill(equal);
      res[res.length - 1] = 100 - equal * (milestones.length - 1);
      return res;
    }

    if (sum !== 100) {
      let running = 0;
      return raw.map((val, idx) => {
        if (idx === raw.length - 1) {
          return Math.max(1, 100 - running);
        }
        const scaled = Math.max(1, Math.round((val / sum) * 100));
        running += scaled;
        return scaled;
      });
    }

    return raw;
  }, [milestones]);

  // Boundaries for M-1 handles
  const boundaries = React.useMemo(() => {
    const bounds: number[] = [];
    let acc = 0;
    for (let i = 0; i < normalizedPercentages.length - 1; i++) {
      acc += normalizedPercentages[i];
      bounds.push(acc);
    }
    return bounds;
  }, [normalizedPercentages]);

  // Keep latest refs to prevent stale closures during drag
  const stateRef = useRef({
    boundaries,
    normalizedPercentages,
    milestones,
    onUpdatePercentages,
  });
  useEffect(() => {
    stateRef.current = {
      boundaries,
      normalizedPercentages,
      milestones,
      onUpdatePercentages,
    };
  });

  const updateBoundaryPosition = useCallback((handleIdx: number, clientX: number) => {
    if (!trackRef.current) return;
    const { boundaries: bList, normalizedPercentages: pList, milestones: mList, onUpdatePercentages: onUpdate } = stateRef.current;
    if (handleIdx < 0 || handleIdx >= bList.length) return;

    const rect = trackRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    if (trackWidth <= 0) return;

    const rawPct = ((clientX - rect.left) / trackWidth) * 100;

    const MIN_PERCENT = mList.length > 5 ? 2 : 5;
    const prevBoundary = handleIdx === 0 ? 0 : bList[handleIdx - 1];
    const nextBoundary = handleIdx === bList.length - 1 ? 100 : bList[handleIdx + 1];

    const minAllowed = prevBoundary + MIN_PERCENT;
    const maxAllowed = nextBoundary - MIN_PERCENT;

    const clamped = Math.max(minAllowed, Math.min(maxAllowed, Math.round(rawPct)));

    const newPercentages = [...pList];
    newPercentages[handleIdx] = clamped - prevBoundary;
    newPercentages[handleIdx + 1] = nextBoundary - clamped;

    const updates = mList.map((m, idx) => ({
      id: m.id,
      percentage: newPercentages[idx],
    }));

    onUpdate(updates);
  }, []);

  // Global window listeners for 100% reliable drag & drop without cursor sticking
  useEffect(() => {
    if (activeHandleIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      // If mouse button was released outside without firing pointerup
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

    // Prevent text selection while dragging
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

  // Keyboard navigation
  const handleKeyDown = (handleIdx: number, e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const delta = e.key === "ArrowLeft" ? -step : step;

      const prevBoundary = handleIdx === 0 ? 0 : boundaries[handleIdx - 1];
      const nextBoundary = handleIdx === boundaries.length - 1 ? 100 : boundaries[handleIdx + 1];
      const currentPos = boundaries[handleIdx];

      const MIN_PERCENT = milestones.length > 5 ? 2 : 5;
      const newPos = Math.max(prevBoundary + MIN_PERCENT, Math.min(nextBoundary - MIN_PERCENT, currentPos + delta));

      const newPercentages = [...normalizedPercentages];
      newPercentages[handleIdx] = newPos - prevBoundary;
      newPercentages[handleIdx + 1] = nextBoundary - newPos;

      const updates = milestones.map((m, idx) => ({
        id: m.id,
        percentage: newPercentages[idx],
      }));
      onUpdatePercentages(updates);
    }
  };

  if (milestones.length === 0) return null;

  return (
    <div className={`space-y-1.5 select-none ${className}`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1">
          <span>Budget Share</span>
          <span className="text-[10px] text-zinc-400 font-normal">(drag pins)</span>
        </span>
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          100% Auto-Balanced
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
          {normalizedPercentages.map((pct, idx) => {
            const color = PHASE_COLORS[idx % PHASE_COLORS.length];
            const m = milestones[idx];
            const credits = Math.round((totalBid * pct) / 100);

            return (
              <div
                key={m?.id || idx}
                style={{ width: `${pct}%` }}
                className={`relative h-full ${color.bg} ${
                  idx < normalizedPercentages.length - 1 ? "border-r border-zinc-300/80 dark:border-zinc-700/80" : ""
                } transition-[width] duration-75`}
                title={`${m?.name || `Phase ${idx + 1}`}: ${pct}% (${credits.toLocaleString()} Cr)`}
              />
            );
          })}
        </div>

        {/* Divider Pins / Thumb Handles */}
        {milestones.length > 1 &&
          boundaries.map((pos, handleIdx) => {
            const isDragging = activeHandleIndex === handleIdx;
            const isHovered = hoveredHandleIndex === handleIdx;

            const leftPct = normalizedPercentages[handleIdx];
            const rightPct = normalizedPercentages[handleIdx + 1];
            const leftCr = Math.round((totalBid * leftPct) / 100);
            const rightCr = Math.round((totalBid * rightPct) / 100);

            return (
              <div
                key={handleIdx}
                style={{ left: `${pos}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 cursor-ew-resize group"
                onPointerDown={(e) => handleHandlePointerDown(handleIdx, e)}
                onPointerEnter={() => setHoveredHandleIndex(handleIdx)}
                onPointerLeave={() => setHoveredHandleIndex(null)}
                tabIndex={0}
                role="slider"
                aria-valuenow={pos}
                aria-valuemin={handleIdx === 0 ? 0 : boundaries[handleIdx - 1]}
                aria-valuemax={handleIdx === boundaries.length - 1 ? 100 : boundaries[handleIdx + 1]}
                aria-label={`Split between Phase ${handleIdx + 1} and Phase ${handleIdx + 2}`}
                onKeyDown={(e) => handleKeyDown(handleIdx, e)}
              >
                {/* Floating Tooltip during drag/hover */}
                {(isDragging || isHovered) && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9.5px] font-bold shadow-md pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <span>
                      {leftPct}% ({leftCr.toLocaleString()} Cr)
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">|</span>
                    <span>
                      {rightPct}% ({rightCr.toLocaleString()} Cr)
                    </span>
                  </div>
                )}

                {/* Circular Pin Head (Slim w-3.5 h-3.5) */}
                <div
                  className={`w-3.5 h-3.5 rounded-full border-[1.5px] bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center transition-transform ${
                    isDragging
                      ? "border-blue-600 dark:border-blue-400 scale-110 ring-2 ring-blue-500/30"
                      : isHovered
                      ? "border-zinc-900 dark:border-white scale-105"
                      : "border-zinc-800 dark:border-zinc-300"
                  }`}
                >
                  <div
                    className={`w-1 h-1 rounded-full transition-colors ${
                      isDragging
                        ? "bg-blue-600 dark:bg-blue-400"
                        : "bg-zinc-800 dark:bg-zinc-300"
                    }`}
                  />
                </div>

                {/* Vertical Stem down to the track */}
                <div
                  className={`w-[1.5px] h-3.5 transition-colors ${
                    isDragging
                      ? "bg-blue-600 dark:bg-blue-400"
                      : isHovered
                      ? "bg-zinc-900 dark:bg-white"
                      : "bg-zinc-700 dark:bg-zinc-300"
                  }`}
                />
              </div>
            );
          })}
      </div>

      {/* Percentages below adjustments (no tags, tight gap) */}
      <div className="flex w-full pt-0.5 px-0.5">
        {normalizedPercentages.map((pct, idx) => {
          const m = milestones[idx];
          const color = PHASE_COLORS[idx % PHASE_COLORS.length];
          const credits = Math.round((totalBid * pct) / 100);

          return (
            <div
              key={m?.id || idx}
              style={{ width: `${pct}%` }}
              className="text-center transition-[width] duration-75 overflow-visible"
              title={`${m?.name || `Phase ${idx + 1}`}: ${pct}% (${credits.toLocaleString()} Cr)`}
            >
              <span className={`text-[11px] font-extrabold ${color.text} inline-block`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneAllocationSlider;