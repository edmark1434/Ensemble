import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Clock,
  Layers,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Pencil,
  Check,
  X,
  RotateCcw,
  Sliders,
  Percent,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Minus,
  DollarSign,
  Package
} from "lucide-react";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { GigTier } from "../../gig_datasets";
import { MilestoneAllocationSlider } from "../../../6_job_market/job_proposals/proposals_components/MilestoneAllocationSlider";

export interface ServiceMilestone {
  id: string;
  name: string;
  description: string;
  hours: number | string;
  revisions: number | string;
  percentage?: number;
  tasks?: string[];
}

interface GigMilestonesProps {
  milestones: ServiceMilestone[];
  setMilestones: React.Dispatch<React.SetStateAction<ServiceMilestone[]>>;
  tiers: GigTier[];
  setTiers: React.Dispatch<React.SetStateAction<GigTier[]>>;
  additionalWorkRate: number;
  setAdditionalWorkRate: React.Dispatch<React.SetStateAction<number>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNext: () => void;
  onBack: () => void;
}

const MILESTONE_THEMES = [
  {
    pill: "bg-blue-600 text-white",
    border: "border-blue-500",
    light: "bg-blue-50 dark:bg-blue-950/20",
    badgeBg: "bg-blue-600 text-white",
  },
  {
    pill: "bg-purple-600 text-white",
    border: "border-purple-500",
    light: "bg-purple-50 dark:bg-purple-950/20",
    badgeBg: "bg-purple-600 text-white",
  },
  {
    pill: "bg-emerald-600 text-white",
    border: "border-emerald-500",
    light: "bg-emerald-50 dark:bg-emerald-950/20",
    badgeBg: "bg-emerald-600 text-white",
  },
  {
    pill: "bg-amber-600 text-white",
    border: "border-amber-500",
    light: "bg-amber-50 dark:bg-amber-950/20",
    badgeBg: "bg-amber-600 text-white",
  },
];

export const getTwoPhasePreset = (totalTimelineHours = 96): ServiceMilestone[] => {
  const halfHours = Math.max(1, Math.floor(totalTimelineHours / 2));
  return [
    {
      id: "ms-1",
      name: "The Process (Combining Plan & Design)",
      description: "Ingest all camera footage, sync multitrack audio, organize project bins, and assemble the narrative rough cut.",
      tasks: [
        "Raw footage ingest & multitrack dialogue sync",
        "A-roll narrative assembly & story sequencing",
        "Rough pacing assembly & fine-cut sequence trimming",
      ],
      hours: halfHours,
      revisions: 2,
      percentage: 50,
    },
    {
      id: "ms-2",
      name: "The Final Cut (Final Touches & Result)",
      description: "Polish sound design, balance color and exposure, apply motion graphics, and deliver master video assets.",
      tasks: [
        "Motion titles, lower thirds & graphic animations",
        "Sound effects design, EQ & loudness normalization (-14 LUFS)",
        "Color grading, exposure balance & LUT look",
        "Final 4K master export & project archive delivery",
      ],
      hours: halfHours,
      revisions: 2,
      percentage: 50,
    },
  ];
};

interface MilestoneCardProps {
  m: ServiceMilestone;
  idx: number;
  milestonesCount: number;
  activeBudget: number;
  totalTimelineHours: number;
  activeTier: GigTier;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  taskInputs: { [milestoneId: string]: string };
  setTaskInputs: React.Dispatch<React.SetStateAction<{ [milestoneId: string]: string }>>;
  handleUpdateMilestone: (id: string, updates: Partial<ServiceMilestone>) => void;
  handleDuplicateMilestone: (id: string) => void;
  handleRemoveMilestone: (id: string) => void;
  handleAddTask: (milestoneId: string) => void;
  handleRemoveTask: (milestoneId: string, taskIdx: number) => void;
  handleMoveMilestone: (index: number, direction: "up" | "down") => void;
}

const MilestoneCardItem: React.FC<MilestoneCardProps> = ({
  m,
  idx,
  milestonesCount,
  activeBudget,
  totalTimelineHours,
  activeTier,
  isCollapsed,
  onToggleCollapse,
  taskInputs,
  setTaskInputs,
  handleUpdateMilestone,
  handleDuplicateMilestone,
  handleRemoveMilestone,
  handleAddTask,
  handleRemoveTask,
  handleMoveMilestone,
}) => {
  const dragControls = useDragControls();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const theme = MILESTONE_THEMES[idx % MILESTONE_THEMES.length];

  const safeActiveTier = activeTier || { tierName: "Standard", price: 150, daysOfDelivery: 4 };
  const mPercentage = Number(m.percentage) || 0;
  const phaseCalculatedCredits = Math.round((activeBudget * mPercentage) / 100);
  const mHours = Number(m.hours) || Math.max(1, Math.round((totalTimelineHours * mPercentage) / 100));
  const mDays = (mHours / 24).toFixed(1).replace(/\.0$/, "");
  const mRevisions = Number(m.revisions ?? 2);

  const cleanName = (m.name || "").replace(/^Phase\s*\d+\s*:\s*/i, "").trim() || `Milestone ${idx + 1}`;

  return (
    <Reorder.Item
      value={m}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
        zIndex: 50,
      }}
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 shadow-xs overflow-hidden transition-all"
    >
      {/* Header Bar */}
      <div className="bg-gray-50/70 dark:bg-zinc-800/40 border-b border-gray-100 dark:border-white/5 p-3.5 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle */}
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                dragControls.start(e);
              }}
              className="touch-none cursor-grab active:cursor-grabbing p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0 select-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Up / Down Buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMoveMilestone(idx, "up")}
                className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                disabled={idx === milestonesCount - 1}
                onClick={() => handleMoveMilestone(idx, "down")}
                className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="h-2.5 w-2.5" />
              </button>
            </div>

            {/* Phase Number Circle */}
            <div className={`w-6 h-6 rounded-full ${theme.badgeBg} flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs`}>
              {idx + 1}
            </div>

            {/* Editable Title */}
            {!isEditingTitle ? (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer rounded-lg py-1 px-1.5 -ml-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Click to edit milestone title"
              >
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-zinc-100 truncate">
                  {cleanName}
                </span>
                <Pencil className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0 transition" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  autoFocus
                  value={m.name}
                  onChange={(e) => handleUpdateMilestone(m.id, { name: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                  }}
                  className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-transparent border-b border-blue-500 outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-emerald-500 hover:text-emerald-600 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons & Transferred Credit Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Transferred Budget Pill */}
            <div className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 shadow-2xs">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{phaseCalculatedCredits.toLocaleString()} Cr</span>
              <span className="text-[10px] opacity-75 font-medium">({mPercentage}%)</span>
            </div>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={() => handleDuplicateMilestone(m.id)}
              disabled={milestonesCount >= 4}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Duplicate phase"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => handleRemoveMilestone(m.id)}
              disabled={milestonesCount <= 1}
              className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Delete phase"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse Toggle */}
            <button
              type="button"
              onClick={() => onToggleCollapse(m.id)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sub-Badges Bar: Timeline Share %, Budget Share, Revisions Steppers */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 border-t border-gray-100 dark:border-white/5">
          {/* Time Share Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 font-semibold shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Time Share:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{mPercentage}%</span>
            <span className="text-[10px] text-zinc-400">
              (~{mHours}h in {safeActiveTier.tierName})
            </span>
            <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 dark:border-zinc-700 pl-1.5">
              <button
                type="button"
                disabled={mPercentage <= 5}
                onClick={() => handleUpdateMilestone(m.id, { percentage: Math.max(5, mPercentage - 5) })}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Decrease time share (-5%)"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                disabled={mPercentage >= 95}
                onClick={() => handleUpdateMilestone(m.id, { percentage: Math.min(95, mPercentage + 5) })}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Increase time share (+5%)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Budget Share Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 font-semibold shadow-2xs">
            <CreditIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Budget Share:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{phaseCalculatedCredits.toLocaleString()} Cr</span>
            <span className="text-[10px] text-zinc-400">({mPercentage}%)</span>
          </span>

          {/* Revisions Included Stepper */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 font-semibold shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
            <span>Revisions:</span>
            <span className="font-bold text-gray-900 dark:text-white">{mRevisions}</span>
            <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 dark:border-zinc-700 pl-1.5">
              <button
                type="button"
                disabled={mRevisions <= 1}
                onClick={() => handleUpdateMilestone(m.id, { revisions: Math.max(1, mRevisions - 1) })}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Decrease revisions"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                disabled={mRevisions >= 10}
                onClick={() => handleUpdateMilestone(m.id, { revisions: Math.min(10, mRevisions + 1) })}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Increase revisions"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Card Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Scope Summary Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
              Deliverables & Scope Summary
            </label>
            <textarea
              rows={2}
              value={m.description}
              onChange={(e) => handleUpdateMilestone(m.id, { description: e.target.value })}
              placeholder="Detail what tasks, rough cuts, or master files will be delivered in this milestone phase..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>

          {/* Phase Task Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Phase Task Checklist ({m.tasks?.length || 0})
              </label>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                Press Enter or Add to append
              </span>
            </div>

            {/* Existing Tasks List */}
            <div className="space-y-1.5">
              {(m.tasks || []).map((tText, tIdx) => (
                <div
                  key={tIdx}
                  className="flex items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] text-xs text-gray-800 dark:text-zinc-200"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 rounded-full bg-gray-200/80 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0 text-gray-600 dark:text-zinc-400">
                      {tIdx + 1}
                    </span>
                    <span className="truncate">{tText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(m.id, tIdx)}
                    className="text-gray-400 hover:text-red-500 transition p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Task Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={taskInputs[m.id] || ""}
                onChange={(e) =>
                  setTaskInputs((prev) => ({
                    ...prev,
                    [m.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask(m.id);
                  }
                }}
                placeholder="Add actionable subtask (e.g. Dialogue sync, 4K master export, color match)..."
                className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddTask(m.id)}
                className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-xs font-bold transition cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
};

export const GigMilestones: React.FC<GigMilestonesProps> = ({
  milestones,
  setMilestones,
  tiers,
  setTiers,
  additionalWorkRate,
  setAdditionalWorkRate,
  errors,
  setErrors,
  onNext,
  onBack,
}) => {
  // const [activeTab, setActiveTab] = useState<"milestones" | "tiers">("milestones");
  const [taskInputs, setTaskInputs] = useState<{ [msId: string]: string }>({});
  const [collapsedCards, setCollapsedCards] = useState<{ [id: string]: boolean }>({});
  const [isPresetsCollapsed, setIsPresetsCollapsed] = useState(false);
  const [isBalanceCollapsed, setIsBalanceCollapsed] = useState(false);

  // Selected Reference Tier for budget transfer & timeline preview (defaults to Standard or first tier)
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(() => {
    const stdIdx = tiers.findIndex((t) => t.tierName.toLowerCase() === "standard");
    return stdIdx >= 0 ? stdIdx : 0;
  });

  const activeTier = tiers[selectedTierIdx] || tiers[0] || { price: 150, daysOfDelivery: 4, tierName: "Standard" };
  const activeBudget = Number(activeTier.price) || 150;
  const totalTimelineDays = Math.max(1, Number(activeTier.daysOfDelivery) || 4);
  const totalTimelineHours = totalTimelineDays * 24;

  const bDays = Number(tiers[0]?.daysOfDelivery) || 2;
  const sDays = Number(tiers[1]?.daysOfDelivery) || 4;
  const pDays = Number(tiers[2]?.daysOfDelivery) || 7;

  // Initialize with 2-Phase default if empty
  useEffect(() => {
    if (!milestones || milestones.length === 0) {
      setMilestones(getTwoPhasePreset(totalTimelineHours));
    }
  }, []);

  // Sync milestone hours whenever active tier or totalTimelineHours changes
  useEffect(() => {
    if (milestones && milestones.length > 0 && totalTimelineHours > 0) {
      const sumHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
      if (sumHours !== totalTimelineHours) {
        setMilestones((prev) =>
          prev.map((m) => {
            const pct = Number(m.percentage) || Math.floor(100 / prev.length);
            return {
              ...m,
              hours: Math.max(1, Math.round((totalTimelineHours * pct) / 100)),
            };
          })
        );
      }
    }
  }, [selectedTierIdx, totalTimelineHours]);

  // When totalTimelineHours changes, ensure milestone hours sum matches or is normalized
  const totalAllocatedHours = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
  }, [milestones]);

  const totalPercentage = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  }, [milestones]);

  const isPercentageBalanced = totalPercentage === 100;
  const isHoursValid = totalTimelineHours === 0 || totalAllocatedHours <= totalTimelineHours;

  const handleSelectTier = (idx: number) => {
    setSelectedTierIdx(idx);
    const targetTier = tiers[idx];
    if (!targetTier) return;
    const tierDays = Math.max(1, Number(targetTier.daysOfDelivery) || 4);
    const tierHours = tierDays * 24;

    setMilestones((prev) =>
      prev.map((m) => {
        const pct = Number(m.percentage) || Math.floor(100 / (prev.length || 1));
        return {
          ...m,
          hours: Math.max(1, Math.round((tierHours * pct) / 100)),
        };
      })
    );
  };

  const handleUpdatePercentages = (updates: { id: string; percentage: number }[]) => {
    setMilestones((prev) =>
      prev.map((m) => {
        const found = updates.find((u) => u.id === m.id);
        if (!found) return m;
        return {
          ...m,
          percentage: found.percentage,
          hours: Math.max(1, Math.round((totalTimelineHours * found.percentage) / 100)),
        };
      })
    );
  };

  const handleAutoBalance = () => {
    if (milestones.length === 0) return;
    const count = milestones.length;
    const baseShare = Math.floor(100 / count);
    const remainder = 100 - baseShare * count;
    const hoursShare = Math.floor(totalTimelineHours / count);
    const remHours = totalTimelineHours - hoursShare * count;

    setMilestones((prev) =>
      prev.map((m, idx) => ({
        ...m,
        percentage: idx === 0 ? baseShare + remainder : baseShare,
        hours: idx === 0 ? hoursShare + remHours : hoursShare,
      }))
    );
    showSuccessToast(`Budget (100%) and Timeline hours auto-balanced evenly for ${activeTier.tierName} tier!`);
  };

  const handleApplyPreset = (type: "1-phase" | "2-phase" | "3-phase" | "4-phase") => {
    if (type === "1-phase") {
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          name: "Turnkey Service Delivery",
          description: "Complete end-to-end media production, assembly, editing, and final master deliverables.",
          tasks: [
            "Media ingest, folder organization & camera RAW decoding",
            "Multitrack audio synchronization & dialogue leveling",
            "Rough narrative cut & pacing assembly",
            "B-roll integration, lower thirds & kinetic titles",
            "Color correction, shot matching & cinematic LUT application",
            "Final master exports & complete project delivery",
          ],
          hours: totalTimelineHours,
          revisions: 2,
          percentage: 100,
        },
      ]);
    } else if (type === "2-phase") {
      setMilestones(getTwoPhasePreset(totalTimelineHours));
    } else if (type === "3-phase") {
      const h1 = Math.round(totalTimelineHours * 0.3);
      const h2 = Math.round(totalTimelineHours * 0.4);
      const h3 = totalTimelineHours - h1 - h2;
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          name: "The Setup (Plan)",
          description: "Log footage, organize timeline scenes, synchronize multitrack dialogue, and deliver the initial assembly rough cut.",
          tasks: [
            "Footage logging, scene tagging & dialogue sync",
            "Assembly & narrative rough cut structure",
            "Scene transition assembly & timing rough pass",
          ],
          hours: h1,
          revisions: 2,
          percentage: 30,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "The Process (Design)",
          description: "Integrate B-roll cutaways, create animated lower thirds, design title graphics, and craft visual transitions.",
          tasks: [
            "B-roll pacing & multicam cutaways",
            "Motion graphics, title cards & animated lower thirds",
            "Visual transitions & screen replacement cleanups",
          ],
          hours: h2,
          revisions: 2,
          percentage: 40,
        },
        {
          id: `ms-${Date.now()}-3`,
          name: "The Result (Final Touches)",
          description: "Master audio loudness, balance dialogue and music ducking, apply cinematic color grading, and deliver multi-format exports.",
          tasks: [
            "Dialogue noise reduction & audio EQ leveling",
            "Cinematic color grade & skin tone preservation",
            "Final master exports in 4K UHD, 1080p, and vertical reels",
          ],
          hours: h3,
          revisions: 2,
          percentage: 30,
        },
      ]);
    } else if (type === "4-phase") {
      const qHours = Math.floor(totalTimelineHours / 4);
      const remHours = totalTimelineHours - qHours * 4;
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          name: "The Concept (Plan)",
          description: "Review all raw footage, organize scene bins, synchronize audio tracks, and compile the preferred takes.",
          tasks: [
            "Raw footage review & project ingest",
            "Audio synchronization & scene bin tagging",
            "Initial story assembly outline",
          ],
          hours: qHours + remHours,
          revisions: 1,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "The Assembly (Build)",
          description: "Craft sequence pacing, assemble scene transitions, synchronize A-roll dialogue, and structure the narrative flow.",
          tasks: [
            "Fine-cut trimming & rhythm pacing",
            "B-roll coverage & multicam matching",
            "First assembly rough cut delivery",
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-3`,
          name: "The Refinement (Refine)",
          description: "Integrate kinetic motion titles, sound design, sound effects layering, and visual transition styling.",
          tasks: [
            "Motion graphics & animated title cards",
            "SFX sound design & background music ducking",
            "Visual FX & timeline cleanup",
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-4`,
          name: "The Master Delivery (Result)",
          description: "Cinema-grade color grading, broadcast-level audio mastering, QC export validation, and project archive delivery.",
          tasks: [
            "Color correction & shot-to-shot matching",
            "Audio mastering (-14 LUFS loudness target)",
            "Final master exports & project archive bundle",
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
      ]);
    }
    showSuccessToast(`Applied ${type} Roadmap Preset!`);
  };

  const handleAddMilestone = () => {
    if (milestones.length >= 4) {
      showErrorToast("Maximum 4 milestone phases allowed.");
      return;
    }
    const defaultTitles = [
      "The Setup (Plan)",
      "The Build (Design)",
      "The Refinement (Refine)",
      "The Result (Final Touches)",
    ];
    const newTitle = defaultTitles[milestones.length] || `Phase ${milestones.length + 1}: Final Touches`;
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const remainingHours = Math.max(12, totalTimelineHours - totalAllocatedHours);

    const newPhase: ServiceMilestone = {
      id: `ms-${Date.now()}`,
      name: newTitle,
      description: "Define the deliverables, tasks, and exports for this production phase.",
      hours: remainingHours > 0 ? remainingHours : 24,
      revisions: 2,
      percentage: remainingPercentage > 0 ? remainingPercentage : Math.floor(100 / (milestones.length + 1)),
      tasks: ["Media review & preparation", "Phase completion and export deliverables"],
    };
    setMilestones([...milestones, newPhase]);
  };

  const handleRemoveMilestone = (id: string) => {
    if (milestones.length <= 1) {
      showErrorToast("At least 1 milestone phase is required.");
      return;
    }
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    handleAutoBalance();
  };

  const handleDuplicateMilestone = (id: string) => {
    if (milestones.length >= 4) {
      showErrorToast("Maximum 4 milestone phases allowed.");
      return;
    }
    const target = milestones.find((m) => m.id === id);
    if (!target) return;
    const newPhase: ServiceMilestone = {
      ...target,
      id: `ms-${Date.now()}`,
      name: `${target.name} (Copy)`,
      tasks: [...(target.tasks || [])],
    };
    setMilestones([...milestones, newPhase]);
  };

  const handleMoveMilestone = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;
    const updated = [...milestones];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setMilestones(updated);
  };

  const handleUpdateMilestone = (id: string, updates: Partial<ServiceMilestone>) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        if (updates.hours !== undefined && totalTimelineHours > 0) {
          updated.percentage = Math.round((Number(updates.hours) / totalTimelineHours) * 100);
        } else if (updates.percentage !== undefined && totalTimelineHours > 0) {
          updated.hours = Math.max(1, Math.round((totalTimelineHours * Number(updates.percentage)) / 100));
        }
        return updated;
      })
    );
  };

  const handleAddTask = (msId: string) => {
    const text = (taskInputs[msId] || "").trim();
    if (!text) return;
    const target = milestones.find((m) => m.id === msId);
    if (!target) return;
    const currentTasks = target.tasks || [];
    if (currentTasks.length >= 8) {
      showErrorToast("Maximum 8 checklist tasks per phase.");
      return;
    }
    handleUpdateMilestone(msId, { tasks: [...currentTasks, text] });
    setTaskInputs((prev) => ({ ...prev, [msId]: "" }));
  };

  const handleRemoveTask = (msId: string, taskIdx: number) => {
    const target = milestones.find((m) => m.id === msId);
    if (!target || !target.tasks) return;
    const nextTasks = target.tasks.filter((_, i) => i !== taskIdx);
    handleUpdateMilestone(msId, { tasks: nextTasks });
  };

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Proposed Milestones Roadmap</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Divide your service into structured milestones and allocate time percentage distribution across each phase.
          </p>
        </div>
      </div>

      {/* Top Control Banner: Milestone % Roadmap & Tier Preview Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Explanatory Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>Universal Milestone Roadmap (% of Time & Budget)</span>
            </h4>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xl">
            Configure phase tasks and allocate time percentages. Total turnaround days ({activeTier.daysOfDelivery}d) and package pricing ({activeBudget} Cr) are configured on your Tiers.
          </p>
        </div>

        {/* Right: Active Package Tier Preview Switcher */}
        <div className="space-y-1.5 lg:text-right">
          <div className="flex items-center gap-1.5 lg:justify-end">
            <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
              Preview Tier Breakdown:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap lg:justify-end">
            {tiers.map((t, idx) => {
              const isSelected = selectedTierIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectTier(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-2xs ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30"
                      : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <span>{t.tierName}:</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? "text-blue-100" : "text-zinc-400"}`}>
                    {t.daysOfDelivery}d
                  </span>
                  <div className={`flex items-center gap-1 font-extrabold ${isSelected ? "text-amber-200" : "text-amber-500"}`}>
                    <CreditIcon className="h-3 w-3" />
                    <span>{t.price} Cr</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- MILESTONES ROADMAP BUILDER (With Proposal Timeline Division & Budget Transfer Parity) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Reorderable Milestone Phase Cards (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Reorder.Group
              axis="y"
              values={milestones}
              onReorder={setMilestones}
              className="space-y-4"
            >
              {milestones.map((m, idx) => (
                <MilestoneCardItem
                  key={m.id}
                  m={m}
                  idx={idx}
                  milestonesCount={milestones.length}
                  activeBudget={activeBudget}
                  totalTimelineHours={totalTimelineHours}
                  activeTier={activeTier}
                  isCollapsed={Boolean(collapsedCards[m.id])}
                  onToggleCollapse={(id) =>
                    setCollapsedCards((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                  taskInputs={taskInputs}
                  setTaskInputs={setTaskInputs}
                  handleUpdateMilestone={handleUpdateMilestone}
                  handleDuplicateMilestone={handleDuplicateMilestone}
                  handleRemoveMilestone={handleRemoveMilestone}
                  handleAddTask={handleAddTask}
                  handleRemoveTask={handleRemoveTask}
                  handleMoveMilestone={handleMoveMilestone}
                />
              ))}
            </Reorder.Group>

            {/* Add Milestone Phase Button (Max 4) */}
            {milestones.length < 4 ? (
              <button
                type="button"
                onClick={handleAddMilestone}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 text-xs font-bold text-gray-700 dark:text-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Milestone Phase ({milestones.length}/4)</span>
              </button>
            ) : (
              <div className="w-full py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-400 text-center">
                Maximum 4 milestone phases reached
              </div>
            )}
          </div>

          {/* Right Column: Sticky Roadmap Presets & Dual Multi-Thumb Allocation HUD (4 cols) */}
          <div className="lg:col-span-4 sticky top-6 space-y-4">
            {/* 1. Roadmap Presets Card (Collapsible) */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPresetsCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Roadmap Presets
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isPresetsCollapsed ? "Show templates" : "Hide"}
                  </span>
                  <div
                    className={`p-0.5 rounded-md text-zinc-400 transition-transform duration-200 ${
                      isPresetsCollapsed ? "" : "rotate-180"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!isPresetsCollapsed && (
                  <motion.div
                    key="presets-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.18, delay: 0.04 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.14 },
                      },
                    }}
                    className="overflow-hidden px-4 sm:px-5 pb-5 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5"
                  >
                    {/* Auto-balance button */}
                    <button
                      type="button"
                      onClick={handleAutoBalance}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer shadow-2xs"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Auto-Balance Budget & Timeline</span>
                    </button>

                    {/* Presets List */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Turnkey Video Production Presets
                      </label>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset("1-phase")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">
                            1-Phase: In Progress & Completed
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Full turnkey delivery from start to finish
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">100%</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset("2-phase")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">
                            2-Phase: The Process & The Final Cut
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Plan & Design → Final Touches & Result
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">50 / 50</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset("3-phase")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">
                            3-Phase: Setup, Process & Result
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            The Setup → The Process → The Result
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">30 / 40 / 30</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset("4-phase")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">
                            4-Phase: Concept, Build, Refine & Result
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Concept → Build → Refine → Outcome
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">4x 25%</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Roadmap Balance HUD Card (Budget Transfer & Timeline Allocation Multi-Thumb Sliders) */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsBalanceCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Roadmap Balance
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isPercentageBalanced
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    {isPercentageBalanced ? "Balanced (100%)" : `${totalPercentage}% / 100%`}
                  </span>
                  <div
                    className={`p-0.5 rounded-md text-zinc-400 transition-transform duration-200 ${
                      isBalanceCollapsed ? "" : "rotate-180"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!isBalanceCollapsed && (
                  <motion.div
                    key="balance-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.18, delay: 0.04 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.14 },
                      },
                    }}
                    className="overflow-hidden px-4 sm:px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5"
                  >
                    {/* Multi-Thumb Budget Allocation Slider (Transfers budget into each milestone) */}
                    {/* Multi-Thumb Percentage Allocation Slider (Allocates % of time & budget) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                          Milestone Time & Budget Allocation (%)
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          {activeTier.tierName} Preview: {totalTimelineDays}d • {activeBudget} Cr
                        </span>
                      </div>
                      <MilestoneAllocationSlider
                        milestones={milestones as any}
                        totalBid={activeBudget}
                        onUpdatePercentages={handleUpdatePercentages}
                      />
                    </div>

                    {/* Tier Budget & Timeline Transfer Matrix Breakdown Table */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                          All Tiers Distribution Matrix
                        </span>
                        <span className="text-[10px] text-zinc-400">time & credits per phase</span>
                      </div>

                      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden text-[11px]">
                        <div className="grid grid-cols-4 bg-zinc-50 dark:bg-zinc-800/60 p-2 font-bold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 text-[10px]">
                          <span>Phase</span>
                          <span className="text-right">Basic ({bDays}d)</span>
                          <span className="text-right">Std ({sDays}d)</span>
                          <span className="text-right">Prem ({pDays}d)</span>
                        </div>
                        {milestones.map((m, idx) => {
                          const pct = Number(m.percentage) || 0;
                          const bPrice = Number(tiers[0]?.price) || 150;
                          const sPrice = Number(tiers[1]?.price) || 350;
                          const pPrice = Number(tiers[2]?.price) || 700;

                          return (
                            <div
                              key={m.id}
                              className="grid grid-cols-4 p-2 border-b last:border-none border-zinc-100 dark:border-zinc-800/50 text-zinc-700 dark:text-zinc-300 items-center text-[10px]"
                            >
                              <span className="truncate font-semibold">
                                {idx + 1}. {(m.name || "").replace(/^Phase\s*\d+\s*:\s*/i, "").trim()} ({pct}%)
                              </span>
                              <div className="text-right font-medium">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                                  {Math.round((bPrice * pct) / 100)} Cr
                                </span>
                                <span className="text-[9px] text-zinc-400 block">
                                  ~{Math.max(1, Math.round((bDays * 24 * pct) / 100))}h
                                </span>
                              </div>
                              <div className="text-right font-medium">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                                  {Math.round((sPrice * pct) / 100)} Cr
                                </span>
                                <span className="text-[9px] text-zinc-400 block">
                                  ~{Math.max(1, Math.round((sDays * 24 * pct) / 100))}h
                                </span>
                              </div>
                              <div className="text-right font-medium">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                                  {Math.round((pPrice * pct) / 100)} Cr
                                </span>
                                <span className="text-[9px] text-zinc-400 block">
                                  ~{Math.max(1, Math.round((pDays * 24 * pct) / 100))}h
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      {/* Step Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
        >
          ← Back to Policies
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Pricing Tiers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default GigMilestones;
