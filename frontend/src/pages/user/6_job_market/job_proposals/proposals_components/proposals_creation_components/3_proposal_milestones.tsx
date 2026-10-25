import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Clock,
  RefreshCcw,
  Layers,
  GripVertical,
  CheckCircle2,
  Users,
  User,
  Copy,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Percent,
  Pencil,
  Check,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { stripMarkdown } from "@/lib/markdownPaste";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { Job } from "../../../job_components/job_lists";
import { MilestoneAllocationSlider } from "../MilestoneAllocationSlider";
import { MilestoneTimeAllocationSlider } from "../MilestoneTimeAllocationSlider";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  hours: number | string;
  revisions: number | string;
  percentage?: number;
  tasks?: string[];
  slots_count?: number;
  assigned_member?: string;
}

export const getTwoPhasePreset = (totalTimelineHours = 48): Milestone[] => {
  const halfHours = Math.max(1, Math.floor(totalTimelineHours / 2));
  return [
    {
      id: "ms-1",
      name: "The Process (Combining Plan & Design)",
      description: "Ingest all camera footage, sync multitrack audio, organize project bins, and assemble the narrative rough cut.",
      tasks: [
        "Raw footage ingest & multitrack dialogue sync",
        "A-roll narrative assembly & story sequencing",
        "Rough pacing assembly & fine-cut sequence trimming"
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
        "Final 4K master export & project archive delivery"
      ],
      hours: halfHours,
      revisions: 2,
      percentage: 50,
    },
  ];
};

interface ProposalMilestonesProps {
  job?: Job | null;
  bidAmount: string;
  setBidAmount?: (val: string) => void;
  additionalWorkRate: number;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  selectedMilestoneId?: string;
  setSelectedMilestoneId?: (id: string) => void;
  actingTeamId?: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onBack: () => void;
  onAdvance: () => void;
  jobTimeline?: string;
}

interface MilestoneCardItemProps {
  m: Milestone;
  idx: number;
  milestonesCount: number;
  totalBid: number;
  defaultMilestoneHours: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  taskInputs: { [milestoneId: string]: string };
  setTaskInputs: React.Dispatch<React.SetStateAction<{ [milestoneId: string]: string }>>;
  handleUpdateMilestone: (id: string, updates: Partial<Milestone>) => void;
  handleDuplicateMilestone: (id: string) => void;
  handleRemoveMilestone: (id: string) => void;
  handleAddTask: (milestoneId: string, customText?: string) => void;
  handleRemoveTask: (milestoneId: string, taskIdx: number) => void;
  handleMoveMilestone: (index: number, direction: "up" | "down") => void;
  actingTeamId?: string;
}

const MILESTONE_THEMES = [
  {
    badgeBg: "bg-blue-600 text-white dark:bg-blue-500 dark:text-white",
    badgeTag: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    accentText: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  {
    badgeBg: "bg-purple-600 text-white dark:bg-purple-500 dark:text-white",
    badgeTag: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    accentText: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  {
    badgeBg: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white",
    badgeTag: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    accentText: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    badgeBg: "bg-amber-600 text-white dark:bg-amber-500 dark:text-white",
    badgeTag: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    accentText: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
];

const MilestoneCardItem: React.FC<MilestoneCardItemProps> = ({
  m,
  idx,
  milestonesCount,
  totalBid,
  defaultMilestoneHours,
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
  actingTeamId,
}) => {
  const dragControls = useDragControls();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const theme = MILESTONE_THEMES[idx % MILESTONE_THEMES.length];
  const mPercent = Number(m.percentage) || 0;
  const mCredits = Math.round((totalBid * mPercent) / 100);
  const currentHours = m.hours !== undefined && m.hours !== "" ? Number(m.hours) : defaultMilestoneHours;
  const daysEquiv = (currentHours / 24).toFixed(1).replace(/\.0$/, "");
  const tasksList = Array.isArray(m.tasks) ? m.tasks : [];
  const displayName = (m.name || "").replace(/^Phase\s*\d+\s*:\s*/i, "").trim() || `Milestone ${idx + 1}`;

  return (
    <Reorder.Item
      value={m}
      id={`proposal-milestone-${m.id}`}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
      }}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
        zIndex: 50,
      }}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-xs relative"
    >
      {/* Top Header: Clean neutral styling without thick border stripes */}
      <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col gap-2.5">
        {/* Row 1: (1) Title Input & Header Controls */}
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

            {/* Circle with the number (Matching: display circle with the number not #1 Phase) */}
            <div className={`w-6 h-6 rounded-full ${theme.badgeBg} flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs`}>
              {idx + 1}
            </div>

            {/* Title with Pencil edit trigger (Clean title without Phase 1 prefix) */}
            {!isEditingTitle ? (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer rounded-lg py-1 px-1.5 -ml-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Click to edit milestone title"
              >
                <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {displayName}
                </span>
                <Pencil className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 shrink-0 transition" />
              </button>
            ) : (
              <input
                type="text"
                autoFocus
                value={m.name}
                onChange={(e) => handleUpdateMilestone(m.id, { name: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
                placeholder="Milestone Title (e.g. Ingest, Dialogue Sync & Narrative Assembly)..."
                className="flex-1 min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition shadow-2xs"
              />
            )}
          </div>

          {/* Right side controls: Credits Value Only & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Highly visible Credits Value Only (separated from %) */}
            <div className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 font-extrabold text-xs text-zinc-900 dark:text-white flex items-center gap-1 shadow-2xs">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
              <span>{mCredits.toLocaleString()} Credits</span>
            </div>

            {/* Copy button */}
            <button
              type="button"
              disabled={milestonesCount >= 4}
              onClick={() => handleDuplicateMilestone(m.id)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title={milestonesCount >= 4 ? "Limit of 4 milestones reached" : "Copy Milestone"}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Delete button */}
            {milestonesCount > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveMilestone(m.id)}
                className="p-1 rounded-md text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                title="Delete Milestone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Smooth Animated Collapse toggle */}
            <button
              type="button"
              onClick={() => onToggleCollapse(m.id)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title={isCollapsed ? "Expand Details" : "Collapse"}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isCollapsed ? "" : "rotate-180"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Row 2 Tags: [Duration] [Budgetshare] [revisions] (Matching user specification) */}
        <div className="flex items-center gap-2 flex-wrap pl-8">
          {/* Duration Tag */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-[10.5px] font-bold text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span>Duration: {currentHours} hrs ({daysEquiv}d)</span>
          </span>

          {/* Budget Share Tag (Clean neutral gray) */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-[10.5px] font-bold text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <Percent className="h-3 w-3 text-zinc-400" />
            <span>Budget Share: {mPercent}%</span>
          </span>

          {/* Revisions Tag */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-[10.5px] font-bold text-zinc-700 dark:text-zinc-300 shadow-2xs">
            <RefreshCcw className="h-3 w-3 text-zinc-400" />
            <span>{Math.max(1, Number(m.revisions ?? 2))} Revisions Included</span>
          </span>
        </div>
      </div>

      {/* Expanded Table Body with smooth non-stretchy animation */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key={`ms-body-${m.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* Scope Description */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Deliverables &amp; Scope Summary
                </label>
                <textarea
                  rows={2}
                  value={m.description}
                  onChange={(e) => handleUpdateMilestone(m.id, { description: e.target.value })}
                  placeholder="Detail the technical milestones, assets, and outputs delivered in this phase..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition resize-none"
                />
              </div>

              {/* Structured Tasks Table (Clean rows below title matching user sketch) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Phase Task Checklist ({tasksList.length})</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">Press Enter or Add to append</span>
                </div>

                {/* Table of Tasks */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/40">
                  {tasksList.map((task, tIdx) => (
                    <div
                      key={tIdx}
                      className="group flex items-center justify-between gap-2.5 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 shrink-0">
                          {tIdx + 1}
                        </span>
                        <span className="truncate font-medium">{task}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(m.id, tIdx)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition cursor-pointer"
                        title="Remove task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Task Input Row at the end of the table */}
                  <div className="flex items-center gap-2 p-2 bg-zinc-50/60 dark:bg-zinc-900/60">
                    <input
                      type="text"
                      value={taskInputs[m.id] || ""}
                      onChange={(e) => setTaskInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTask(m.id);
                        }
                      }}
                      placeholder="Add actionable subtask (e.g. Dialogue sync, 4K master export)..."
                      className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTask(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* If applying as a Team, show Member Assignment */}
              {actingTeamId && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-semibold">
                    <Users className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Team Role / Assignee:</span>
                  </div>
                  <input
                    type="text"
                    value={m.assigned_member || ""}
                    onChange={(e) => handleUpdateMilestone(m.id, { assigned_member: e.target.value })}
                    placeholder="Team member or role (e.g. Lead Editor, Audio Specialist)"
                    className="max-w-[280px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

export const ProposalMilestonesStep: React.FC<ProposalMilestonesProps> = ({
  job,
  bidAmount,
  additionalWorkRate: _additionalWorkRate,
  milestones,
  setMilestones,
  actingTeamId,
  errors: _errors,
  setErrors,
  onBack,
  onAdvance,
  jobTimeline,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<{ [id: string]: boolean }>({});
  const [taskInputs, setTaskInputs] = useState<{ [milestoneId: string]: string }>({});
  const [isPresetsCollapsed, setIsPresetsCollapsed] = useState(false);
  const [isBalanceCollapsed, setIsBalanceCollapsed] = useState(false);

  // Joed AI Milestone Generation & 300s (5-minute) Cooldown State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [selectedPhaseCount, setSelectedPhaseCount] = useState<1 | 2 | 3 | 4>(2);

  const formatCooldown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}:${String(rem).padStart(2, "0")}` : `${secs}s`;
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleConfirmGenerateMilestones = async () => {
    if (cooldownSeconds > 0 || isGeneratingAi) return;
    setIsGeneratingAi(true);
    try {
      const res = await api.post("/api/chat/generate-proposal-milestones", {
        title: job?.title || "",
        description: job?.description || "",
        isTeam: Boolean(actingTeamId),
        phases: selectedPhaseCount,
        totalTimelineHours,
      });

      const generated = res.data?.data?.milestones;
      if (Array.isArray(generated) && generated.length > 0) {
        setMilestones(generated);
        setErrors((prev) => {
          const { milestones: _, ...rest } = prev;
          return rest;
        });
        setIsAiModalOpen(false);
        setCooldownSeconds(300); // 5 minutes cooldown
        showSuccessToast(
          `Joed AI created ${generated.length} milestone phase${generated.length > 1 ? "s" : ""} roadmap!`
        );
      } else {
        throw new Error("Invalid milestone data received.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Joed AI could not generate milestones right now. Please try again.";
      showErrorToast(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const totalBid = parseInt(bidAmount || "0");
  const timelineText = job?.timeline || jobTimeline || "";
  const maxDaysMatch = timelineText.match(/-?\s*(\d+)\s*Days?/i);
  const maxDays = maxDaysMatch ? parseInt(maxDaysMatch[1]) || 0 : 0;
  const totalTimelineHours = maxDays > 0 ? maxDays * 24 : 72;
  const defaultMilestoneHours = Math.max(1, Math.floor(totalTimelineHours / Math.max(1, milestones.length)));

  useEffect(() => {
    if (!milestones || milestones.length === 0) {
      setMilestones(getTwoPhasePreset(totalTimelineHours));
    }
  }, []);

  // Client Job Budget Info
  const rawMin = Number(job?.minBudget) || 0;
  const rawMax = Number(job?.maxBudget) || 0;
  const isOpenBid = rawMax <= 0 || (job as any)?.budgetType === "open" || (job as any)?.budget_type === "open";
  const clientBudgetText = isOpenBid
    ? `From ${rawMin > 0 ? rawMin.toLocaleString() : "100"} Cr (Open Bid)`
    : `${rawMin.toLocaleString()} ~ ${rawMax.toLocaleString()} Cr`;

  const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  const totalAllocatedHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
  const isPercentageBalanced = totalPercentage === 100;
  const isHoursValid = totalTimelineHours === 0 || totalAllocatedHours <= totalTimelineHours;

  const handleUpdatePercentages = (updates: { id: string; percentage: number }[]) => {
    setMilestones((prev) =>
      prev.map((m) => {
        const found = updates.find((u) => u.id === m.id);
        return found ? { ...m, percentage: found.percentage } : m;
      })
    );
    setErrors((prev) => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleUpdateHours = (updates: { id: string; hours: number }[]) => {
    setMilestones((prev) =>
      prev.map((m) => {
        const found = updates.find((u) => u.id === m.id);
        return found ? { ...m, hours: found.hours } : m;
      })
    );
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
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

  const handleAddTask = (milestoneId: string, customText?: string) => {
    const textToAdd = (customText !== undefined ? customText : (taskInputs[milestoneId] || "")).trim();
    if (!textToAdd) return;
    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== milestoneId) return m;
        const currentTasks = Array.isArray(m.tasks) ? m.tasks : [];
        return { ...m, tasks: [...currentTasks, textToAdd] };
      })
    );
    setTaskInputs(prev => ({ ...prev, [milestoneId]: "" }));
  };

  const handleRemoveTask = (milestoneId: string, taskIdx: number) => {
    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== milestoneId) return m;
        const currentTasks = Array.isArray(m.tasks) ? m.tasks : [];
        return { ...m, tasks: currentTasks.filter((_, idx) => idx !== taskIdx) };
      })
    );
  };

  const handleAddMilestone = () => {
    if (milestones.length >= 4) return;
    const defaultTitles = [
      "The Setup (Plan)",
      "The Build (Design)",
      "The Refinement (Final Touches - Part 1)",
      "The Result (Final Touches - Part 2 / Outcome)",
    ];
    const newTitle = defaultTitles[milestones.length] || "The Refinement (Final Touches)";
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const remainingHours = Math.max(0, totalTimelineHours - totalAllocatedHours);
    const newM: Milestone = {
      id: `ms-${Date.now()}-${Math.random()}`,
      name: newTitle,
      description: "Deliverables package, quality control audit, and master export formatting.",
      hours: remainingHours > 0 ? remainingHours : defaultMilestoneHours,
      revisions: 2,
      percentage: remainingPercentage > 0 ? remainingPercentage : 0,
      tasks: [
        "Color correction & audio mastering",
        "Perform technical QC check (levels, sync & framing)",
        "Render final master deliverables"
      ],
    };
    setMilestones(prev => [...prev, newM]);
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleDuplicateMilestone = (id: string) => {
    if (milestones.length >= 4) return;
    const target = milestones.find(m => m.id === id);
    if (!target) return;
    const duplicate: Milestone = {
      ...target,
      id: `ms-${Date.now()}-${Math.random()}`,
      name: `${target.name} (Copy)`,
      tasks: [...(target.tasks || [])],
    };
    const targetIdx = milestones.findIndex(m => m.id === id);
    const updated = [...milestones];
    updated.splice(targetIdx + 1, 0, duplicate);
    setMilestones(updated);
  };

  const handleRemoveMilestone = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleAutoBalance = () => {
    const count = milestones.length;
    if (count === 0) return;
    const baseShare = Math.floor(100 / count);
    const remainder = 100 - baseShare * count;
    const hoursShare = Math.floor(totalTimelineHours / count);

    setMilestones(
      milestones.map((m, idx) => ({
        ...m,
        percentage: idx === 0 ? baseShare + remainder : baseShare,
        hours: hoursShare > 0 ? hoursShare : (Number(m.hours) || 24),
      }))
    );
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  // Video Editing Roadmap Presets: 1, 2, 3, 4 phases
  const handleApplyPreset = (type: "1-phase" | "2-phase" | "3-phase" | "4-phase") => {
    if (type === "1-phase") {
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          name: "In Progress & Completed",
          description: "Complete end-to-end delivery from initial setup, editing, sound, and color to final project completion.",
          tasks: [
            "Media ingest, folder organization & camera RAW decoding",
            "Multitrack audio synchronization & dialogue leveling",
            "Rough narrative cut & pacing assembly",
            "B-roll integration, lower thirds & kinetic titles",
            "Sound effects (SFX), music mixing & audio ducking",
            "Color correction, shot matching & cinematic LUT application",
            "Final master exports & complete project delivery"
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
            "Scene transition assembly & timing rough pass"
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
            "Visual transitions & screen replacement cleanups"
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
            "Final master exports in 4K UHD, 1080p, and vertical reels"
          ],
          hours: h3,
          revisions: 2,
          percentage: 30,
        },
      ]);
    } else if (type === "4-phase") {
      const qHours = Math.floor(totalTimelineHours / 4);
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          name: "The Concept (Plan)",
          description: "Review all raw footage, organize scene bins, synchronize audio tracks, and compile the preferred takes.",
          tasks: [
            "Footage ingestion, metadata cataloging & proxy generation",
            "Multitrack audio sync & slate matching",
            "Best takes curation & selects reel compilation"
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "The Build (Design)",
          description: "Establish story structure, cut dialogue, smooth scene transitions, and assemble the full narrative timeline.",
          tasks: [
            "A-roll narrative structuring & story beat alignment",
            "Dialogue smoothing, jump-cut cleanups & reaction inserts",
            "Pacing review timeline lock with timecode reference"
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-3`,
          name: "The Refinement (Final Touches - Part 1)",
          description: "Custom animated graphic titles, lower thirds, Foley sound effects, and musical bed mixing.",
          tasks: [
            "Custom typography, animated titles & logo idents",
            "Sound effects design, ambient bed & music stems mixing",
            "Audio leveling, room tone fill & multi-stem balance"
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-4`,
          name: "The Result (Final Touches - Part 2 / Outcome)",
          description: "Look development, shot-to-shot color matching, technical quality control audit, and archived master package delivery.",
          tasks: [
            "Color grading, shot-to-shot matching & HDR/SDR mastering",
            "Technical QC check (broadcast safe levels, audio peaking, drop frames)",
            "Final 4K master delivery & source project archive"
          ],
          hours: qHours,
          revisions: 2,
          percentage: 25,
        },
      ]);
    }
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="w-full space-y-6 text-left">
      <style>{`
        @keyframes shineGleam {
          0% { transform: translateX(-150%) skewX(-20deg); }
          35% { transform: translateX(250%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        .animate-shine-gleam {
          animation: shineGleam 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Top Banner: Client Post Budget vs Your Proposed Bid */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Proposed Milestones Roadmap
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Define your production deliverables, phase tasks, time schedules, and budget allocations.
          </p>
        </div>

        {/* Action Button & Badges */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Generate with Joed AI Button (5-Minute Cooldown) */}
          <button
            type="button"
            disabled={cooldownSeconds > 0 || isGeneratingAi}
            onClick={() => setIsAiModalOpen(true)}
            className={`relative overflow-hidden px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              cooldownSeconds > 0
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white border border-blue-500 shadow-sm shadow-blue-500/20"
            }`}
            title={
              cooldownSeconds > 0
                ? `Joed AI on cooldown (${formatCooldown(cooldownSeconds)})`
                : "Generate Milestones Roadmap with Joed AI"
            }
          >
            {cooldownSeconds === 0 && (
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-shine-gleam" />
            )}
            {cooldownSeconds > 0 ? (
              <>
                <Clock className="h-3 w-3 animate-spin text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Cooldown ({formatCooldown(cooldownSeconds)})</span>
              </>
            ) : (
              <>
                <img src="/ensemble_lg.svg" alt="Ensemble" className="h-3.5 w-3.5 shrink-0 rounded-xs" />
                <span>Generate with Joed AI!</span>
              </>
            )}
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 text-xs flex items-center gap-2 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Client Budget:</span>
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              {clientBudgetText}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs flex items-center gap-2 shadow-xs">
            <CreditIcon className="h-3.5 w-3.5 text-amber-400 dark:text-amber-500" />
            <span className="font-semibold text-[11px]">Your Bid:</span>
            <span className="font-extrabold">{totalBid.toLocaleString()} Cr</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Cards (8 Cols) / Right Sticky HUD & Presets (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reorderable Milestone Cards */}
        <div className="lg:col-span-8 space-y-4">
          <Reorder.Group axis="y" values={milestones} onReorder={setMilestones} className="space-y-4">
            {milestones.map((m, idx) => (
              <MilestoneCardItem
                key={m.id}
                m={m}
                idx={idx}
                milestonesCount={milestones.length}
                totalBid={totalBid}
                defaultMilestoneHours={defaultMilestoneHours}
                isCollapsed={Boolean(collapsedIds[m.id])}
                onToggleCollapse={handleToggleCollapse}
                taskInputs={taskInputs}
                setTaskInputs={setTaskInputs}
                handleUpdateMilestone={handleUpdateMilestone}
                handleDuplicateMilestone={handleDuplicateMilestone}
                handleRemoveMilestone={handleRemoveMilestone}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
                handleMoveMilestone={handleMoveMilestone}
                actingTeamId={actingTeamId}
              />
            ))}
          </Reorder.Group>

          {/* Bottom inline Add Milestone button (Enforced limit of 4) */}
          {milestones.length < 4 ? (
            <button
              type="button"
              onClick={handleAddMilestone}
              className="w-full py-3.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/70 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Another Milestone Phase ({milestones.length}/4)</span>
            </button>
          ) : (
            <div className="w-full py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-400 text-center">
              Maximum 4 milestone phases reached
            </div>
          )}
        </div>

        {/* Right Column: Sticky Presets & Allocation Balance HUD */}
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
                    <span>Auto-Balance Budget (100%)</span>
                  </button>

                  {/* Presets List */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                      Video Production Presets
                    </label>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("1-phase")}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">1-Phase: In Progress & Completed</span>
                        <span className="text-[10px] text-zinc-400">Full turnkey delivery from start to finish</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("2-phase")}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">2-Phase: The Process & The Final Cut</span>
                        <span className="text-[10px] text-zinc-400">Plan & Design → Final Touches & Result</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">50 / 50</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("3-phase")}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">3-Phase: Setup, Process & Result</span>
                        <span className="text-[10px] text-zinc-400">The Setup → The Process → The Result</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">30 / 40 / 30</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("4-phase")}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800 text-xs text-left transition cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] block">4-Phase: Concept, Build, Refine & Result</span>
                        <span className="text-[10px] text-zinc-400">Concept → Build → Refine → Outcome</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">4x 25%</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Roadmap Balance HUD Card (Collapsible) */}
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
                  className="overflow-hidden px-4 sm:px-5 pb-5 space-y-3 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5"
                >
                  {/* Dynamic Multi-Thumb Budget Allocation Slider */}
                  <MilestoneAllocationSlider
                    milestones={milestones}
                    totalBid={totalBid}
                    onUpdatePercentages={handleUpdatePercentages}
                  />

                  {/* Dynamic Multi-Thumb Hours / Timeline Allocation Slider */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <MilestoneTimeAllocationSlider
                      milestones={milestones}
                      totalTimelineHours={totalTimelineHours}
                      onUpdateHours={handleUpdateHours}
                    />
                  </div>

                  {/* Phase Revisions Included Steppers */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RefreshCcw className="h-3 w-3 text-zinc-500" />
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Phase Revisions</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Rounds included</span>
                    </div>

                    <div className="space-y-1.5">
                      {milestones.map((m, idx) => {
                        const theme = MILESTONE_THEMES[idx % MILESTONE_THEMES.length];
                        const revCount = Math.max(1, Number(m.revisions ?? 2));
                        return (
                          <div
                            key={`rev-${m.id}`}
                            className="flex items-center justify-between p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${theme.badgeBg}`}>
                                {idx + 1}
                              </span>
                              <span className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                                {(m.name || "").replace(/^Phase\s*\d+\s*:\s*/i, "").trim() || `Milestone ${idx + 1}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateMilestone(m.id, { revisions: Math.max(1, revCount - 1) })}
                                disabled={revCount <= 1}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={revCount <= 1 ? "Minimum 1 revision round" : "Decrease revisions"}
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold text-[11px] text-zinc-800 dark:text-zinc-100">
                                {revCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateMilestone(m.id, { revisions: Math.min(10, revCount + 1) })}
                                disabled={revCount >= 10}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metrics Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">Phases</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{milestones.length}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">Total Hours</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                        {totalAllocatedHours}h
                        {totalTimelineHours > 0 && <span className="text-[10px] text-zinc-400 font-normal"> / {totalTimelineHours}h</span>}
                      </span>
                    </div>
                  </div>

                  {!isHoursValid && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[11px]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Total hours exceed job timeline ({totalTimelineHours}h max).</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onAdvance}
          disabled={!isPercentageBalanced || !isHoursValid}
          className={`flex-1 max-w-sm flex items-center justify-center gap-2 py-3 px-8 rounded-full text-xs font-bold text-white transition cursor-pointer shadow-md ${
            !isPercentageBalanced || !isHoursValid
              ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
          }`}
        >
          <span>Review Final Proposal</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Joed AI Milestones Roadmap Generation Modal */}
      {createPortal(
        <AnimatePresence>
          {isAiModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isGeneratingAi) setIsAiModalOpen(false);
                }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-10 overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Generate Milestones with Joed AI
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        AI-assisted post-production roadmap aligned with your job requirements
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => setIsAiModalOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 text-left max-h-[75vh] overflow-y-auto">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Joed AI generates professional video editing milestone deliverables, task breakdowns, hours, and balanced budget percentages based on your representation and job context.
                  </p>

                  {/* Target Job Preview Box with Representation Tag */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        <FileText className="h-3 w-3 shrink-0" />
                        <span>Source Job Post</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          actingTeamId
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {actingTeamId ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        <span>{actingTeamId ? "Team" : "Solo"}</span>
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                      {job?.title || "Target Job Listing"}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {job?.description
                        ? stripMarkdown(job.description)
                        : "Video editing and post-production deliverables."}
                    </p>
                  </div>

                  {/* Number of Milestones Selector Buttons (1, 2, 3, 4) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        Number of Milestone Phases
                      </label>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Select 1, 2, 3, or 4 phases
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([1, 2, 3, 4] as const).map((count) => {
                        const isSelected = selectedPhaseCount === count;
                        const labelMap: Record<number, { title: string; badge: string }> = {
                          1: { title: "1 Phase", badge: "100%" },
                          2: { title: "2 Phases", badge: "50 / 50" },
                          3: { title: "3 Phases", badge: "30 / 40 / 30" },
                          4: { title: "4 Phases", badge: "25% each" },
                        };
                        return (
                          <button
                            key={count}
                            type="button"
                            disabled={isGeneratingAi}
                            onClick={() => setSelectedPhaseCount(count)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600"
                                : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/70 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base font-extrabold">{count}</span>
                              {isSelected ? (
                                <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400">
                                  {labelMap[count].badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold mt-1 block">
                              {labelMap[count].title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5-Minute Cooldown Notice */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 text-xs text-zinc-600 dark:text-zinc-300">
                    <Clock className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-400" />
                    <span className="font-medium">5-minute cooldown applies after milestone generation.</span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 rounded-b-2xl bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isGeneratingAi || cooldownSeconds > 0}
                    onClick={handleConfirmGenerateMilestones}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Milestones...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate Roadmap ({selectedPhaseCount} Phases)</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ProposalMilestonesStep;
