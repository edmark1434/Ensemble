import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Copy,
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  CheckSquare, 
  Sparkles, 
  Scale, 
  GripVertical, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Wand2,
  Calculator,
  Layers,
  ShieldCheck
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";

export interface MilestoneFormItem {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  slots_count: number;
  budget_percentage: number;
  duration_hours?: number;
}

interface CreateTeamMilestonesProps {
  milestones: MilestoneFormItem[];
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneFormItem[]>>;
  minBudget: string;
  maxBudget: string;
  minTimeline?: string;
  maxTimeline?: string;
  category?: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onBack: () => void;
  onAdvance: () => void;
}

interface MilestoneCardItemProps {
  m: MilestoneFormItem;
  idx: number;
  milestonesCount: number;
  rawMinBudget: number;
  rawMaxBudget: number;
  computedCredits?: number;
  defaultMilestoneHours: number;
  minHoursThreshold: number;
  taskInputs: { [milestoneId: string]: string };
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  setTaskInputs: React.Dispatch<React.SetStateAction<{ [milestoneId: string]: string }>>;
  handleUpdateMilestone: (id: string, updates: Partial<MilestoneFormItem>) => void;
  handleDuplicateMilestone: (id: string) => void;
  handleRemoveMilestone: (id: string) => void;
  handleAddTask: (milestoneId: string, customText?: string) => void;
  handleRemoveTask: (milestoneId: string, taskIdx: number) => void;
}

const MilestoneCardItem: React.FC<MilestoneCardItemProps> = ({
  m,
  idx,
  milestonesCount,
  rawMinBudget: _rawMinBudget,
  rawMaxBudget,
  computedCredits,
  defaultMilestoneHours,
  minHoursThreshold,
  taskInputs,
  isCollapsed,
  onToggleCollapse,
  setTaskInputs,
  handleUpdateMilestone,
  handleDuplicateMilestone,
  handleRemoveMilestone,
  handleAddTask,
  handleRemoveTask,
}) => {
  const dragControls = useDragControls();

  const mPercent = Number(m.budget_percentage) || 0;
  const mMaxBudget = computedCredits !== undefined ? computedCredits : Math.round((rawMaxBudget * mPercent) / 100);
  const slots = Math.max(1, m.slots_count || 1);
  const slotMaxBudget = Math.round(mMaxBudget / slots);
  const currentHours = m.duration_hours !== undefined ? m.duration_hours : defaultMilestoneHours;
  const daysEquiv = (currentHours / 24).toFixed(1).replace(/\.0$/, "");

  const isHoursZero = !currentHours || currentHours <= 0;
  const isHoursLow = !isHoursZero && currentHours <= minHoursThreshold;
  const isBudgetZero = !m.budget_percentage || m.budget_percentage <= 0;

  return (
    <Reorder.Item
      value={m}
      id={`milestone-card-${m.id}`}
      dragListener={false}
      dragControls={dragControls}
      className={`rounded-2xl border transition-all duration-200 ${
        isCollapsed
          ? "p-4 bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 shadow-xs"
          : "p-5 bg-white dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700 shadow-sm space-y-4"
      }`}
    >
      {/* Header Row: Always visible */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 select-none"
            title="Drag to rearrange milestone"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Number Pill */}
          <span className="h-7 w-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold text-xs flex items-center justify-center shrink-0 border border-zinc-300 dark:border-zinc-700">
            {idx + 1}
          </span>

          {/* Crisp Title Input */}
          <input
            type="text"
            value={m.title}
            onChange={e => handleUpdateMilestone(m.id, { title: e.target.value })}
            placeholder={`Milestone ${idx + 1} Title (e.g. Rough Cut Assembly)`}
            className="flex-1 min-w-0 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900 px-3.5 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition shadow-xs"
          />
        </div>

        {/* Right side header tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Metrics preview pills */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              {slots} {slots === 1 ? "Slot" : "Slots"}
            </span>
            <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              {currentHours}h
            </span>
            <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100">
              {mPercent}% ({mMaxBudget.toLocaleString()} Cr)
            </span>
          </div>

          {/* Duplicate Milestone */}
          <button
            type="button"
            onClick={() => handleDuplicateMilestone(m.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
            title="Duplicate milestone"
          >
            <Copy className="h-4 w-4" />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => onToggleCollapse(m.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
            title={isCollapsed ? "Expand milestone details" : "Collapse milestone"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          {/* Remove Milestone */}
          {milestonesCount > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveMilestone(m.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
              title="Remove this milestone"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details Body */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1">
          {/* 1. Scope & Deliverables Description */}
          <div>
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Scope & Deliverables Description
            </label>
            <textarea
              value={m.description}
              onChange={e => handleUpdateMilestone(m.id, { description: e.target.value })}
              placeholder="Outline what needs to be accomplished in this specific milestone..."
              rows={2}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition resize-none shadow-xs"
            />
          </div>

          {/* 2. Tasks / Deliverables Checklist (1 Column Multiple Rows) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Tasks / Deliverables Checklist ({m.tasks.length})</span>
              </label>
              {m.tasks.length === 0 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold normal-case flex items-center gap-1">
                  * At least 1 task required
                </span>
              )}
            </div>

            {/* Vertically stacked list (1 Col, Multiple Rows) */}
            {m.tasks.length > 0 && (
              <div className="flex flex-col space-y-1.5 mb-2.5">
                {m.tasks.map((task, tIdx) => (
                  <div
                    key={tIdx}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 font-medium group transition shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold shrink-0">
                        {tIdx + 1}
                      </span>
                      <span className="truncate">{task}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(m.id, tIdx)}
                      className="text-zinc-400 hover:text-red-500 transition text-sm leading-none p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 shrink-0"
                      title="Remove task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Input & Quick Add Button (no quick suggestions) */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={taskInputs[m.id] || ""}
                onChange={e => setTaskInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask(m.id);
                  }
                }}
                placeholder="Type video deliverable (e.g. Color grade, Sound mix) and press Enter..."
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition shadow-xs"
              />
              <button
                type="button"
                onClick={() => handleAddTask(m.id)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-xs shrink-0"
              >
                + Add Task
              </button>
            </div>
          </div>

          {/* 3. Streamlined 3-Column Parameters Grid with Steppers for Effortless Editing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            {/* Column 1: Freelancer Slots */}
            <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Slots</span>
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {slots} {slots === 1 ? "position" : "positions"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  disabled={slots <= 1}
                  onClick={() => handleUpdateMilestone(m.id, { slots_count: Math.max(1, slots - 1) })}
                  className="h-8 w-9 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {slots}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateMilestone(m.id, { slots_count: slots + 1 })}
                  className="h-8 w-9 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Column 2: Milestone Hours (Duration) with Steppers */}
            <div className={`p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border flex flex-col justify-between space-y-2 ${
              isHoursZero ? "border-red-300 dark:border-red-500/40" : isHoursLow ? "border-amber-300 dark:border-amber-500/40" : "border-zinc-200 dark:border-zinc-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Duration</span>
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  ~{daysEquiv} {Number(daysEquiv) === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  disabled={currentHours <= 1}
                  onClick={() => handleUpdateMilestone(m.id, { duration_hours: Math.max(1, currentHours - 1) })}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title="Decrease 1 hour"
                >
                  -
                </button>
                <div className="flex items-center justify-center gap-1 flex-1 px-1">
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={m.duration_hours !== undefined ? m.duration_hours : defaultMilestoneHours}
                    onChange={e => {
                      const val = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                      handleUpdateMilestone(m.id, { duration_hours: val });
                    }}
                    className="w-14 text-center font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-zinc-400 select-none">hrs</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateMilestone(m.id, { duration_hours: currentHours + 1 })}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition shrink-0"
                  title="Increase 1 hour"
                >
                  +
                </button>
              </div>
            </div>

            {/* Column 3: Budget Share (%) with Steppers */}
            <div className={`p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border flex flex-col justify-between space-y-2 ${
              isBudgetZero ? "border-red-300 dark:border-red-500/40" : "border-zinc-200 dark:border-zinc-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>Budget Share</span>
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
                  {mMaxBudget.toLocaleString()} Cr {slots > 1 ? `(${slotMaxBudget.toLocaleString()}/seat)` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  disabled={mPercent <= 0}
                  onClick={() => handleUpdateMilestone(m.id, { budget_percentage: Math.max(0, mPercent - 5) })}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title="Decrease 5%"
                >
                  -
                </button>
                <div className="flex items-center justify-center gap-1 flex-1 px-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={m.budget_percentage}
                    onChange={e => {
                      const val = e.target.value === "" ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      handleUpdateMilestone(m.id, { budget_percentage: val });
                    }}
                    className="w-12 text-center font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-zinc-400 select-none">%</span>
                </div>
                <button
                  type="button"
                  disabled={mPercent >= 100}
                  onClick={() => handleUpdateMilestone(m.id, { budget_percentage: Math.min(100, mPercent + 5) })}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title="Increase 5%"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
};

export const CreateTeamMilestones: React.FC<CreateTeamMilestonesProps> = ({
  milestones,
  setMilestones,
  minBudget,
  maxBudget,
  minTimeline,
  maxTimeline,
  category = "",
  errors,
  setErrors,
  onBack,
  onAdvance,
}) => {
  const [taskInputs, setTaskInputs] = useState<{ [milestoneId: string]: string }>({});
  const [collapsedIds, setCollapsedIds] = useState<{ [id: string]: boolean }>({});

  const rawMinBudget = parseInt(minBudget.replace(/\D/g, "")) || 0;
  const rawMaxBudget = parseInt(maxBudget.replace(/\D/g, "")) || 0;
  const totalBudgetVal = rawMaxBudget || rawMinBudget;
  const displayTotalBudget = rawMinBudget > 0 && rawMaxBudget > 0 && rawMinBudget !== rawMaxBudget
    ? `${rawMinBudget.toLocaleString()} - ${rawMaxBudget.toLocaleString()}`
    : totalBudgetVal.toLocaleString();

  const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.budget_percentage) || 0), 0);
  const totalSlots = milestones.reduce((sum, m) => sum + Math.max(1, m.slots_count || 1), 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.1;

  const equalShare = milestones.length > 0 ? 100 / milestones.length : 100;
  const minShareThreshold = Math.max(1, Math.round(equalShare * 0.20));

  const timelineDays = parseInt(maxTimeline || "0") || parseInt(minTimeline || "0") || 3;
  const totalTimelineHours = timelineDays * 24;
  const equalHours = milestones.length > 0 ? totalTimelineHours / milestones.length : totalTimelineHours;
  const minHoursThreshold = Math.max(1, Math.round(equalHours * 0.20));

  const totalAllocatedHours = milestones.reduce((sum, m) => sum + (Number(m.duration_hours) || 0), 0);
  const isHoursValid = totalAllocatedHours === totalTimelineHours;

  // Initialize duration hours if missing
  const hasInitializedHoursRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasInitializedHoursRef.current && milestones.length > 0) {
      const allZeroOrUnset = milestones.every(m => !m.duration_hours || m.duration_hours === 0);
      if (allZeroOrUnset) {
        const evenHours = Math.floor(totalTimelineHours / milestones.length);
        const remainderHours = totalTimelineHours - (evenHours * milestones.length);
        setMilestones(prev =>
          prev.map((m, idx) => ({
            ...m,
            duration_hours: idx === 0 ? evenHours + remainderHours : evenHours,
          }))
        );
      }
      hasInitializedHoursRef.current = true;
    }
  }, [totalTimelineHours, milestones, setMilestones]);

  const milestoneAllocations = useMemo(() => {
    let allocated = 0;
    return milestones.map((m, idx) => {
      const pct = Number(m.budget_percentage) || 0;
      let credits = 0;
      if (idx === milestones.length - 1 && isPercentageValid) {
        credits = Math.max(0, totalBudgetVal - allocated);
      } else {
        credits = Math.round((totalBudgetVal * pct) / 100);
        allocated += credits;
      }
      return credits;
    });
  }, [milestones, totalBudgetVal, isPercentageValid]);

  const isFormValid =
    milestones.length > 0 &&
    isPercentageValid &&
    isHoursValid &&
    milestones.every(
      m =>
        m.title.trim().length > 0 &&
        m.tasks &&
        m.tasks.length > 0 &&
        (Number(m.budget_percentage) || 0) > minShareThreshold &&
        (Number(m.duration_hours) || 0) > minHoursThreshold
    );

  // Quick Preset Templates
  const handleApplyPreset = (type: "2-phase" | "3-phase" | "4-phase") => {
    if (type === "2-phase") {
      const halfHours = Math.floor(totalTimelineHours / 2);
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          title: "Milestone 1: Assembly & Rough Cut",
          description: "Ingest raw footage, sync multitrack audio, organize timeline bins, and assemble the first-pass narrative rough cut.",
          tasks: ["Footage ingest & audio sync", "Rough cut assembly & narrative pacing", "First review cut export"],
          slots_count: 1,
          budget_percentage: 50,
          duration_hours: halfHours + (totalTimelineHours - (halfHours * 2)),
        },
        {
          id: `ms-${Date.now()}-2`,
          title: "Milestone 2: Fine Cut, Color & Master Delivery",
          description: "Incorporate client revisions, perform color grading, balance audio mix, and export final ProRes/MP4 masters.",
          tasks: ["Client revision adjustments", "Color grading & shot matching", "Audio mastering & 4K final export"],
          slots_count: 1,
          budget_percentage: 50,
          duration_hours: halfHours,
        },
      ]);
    } else if (type === "3-phase") {
      const h1 = Math.round(totalTimelineHours * 0.3);
      const h2 = Math.round(totalTimelineHours * 0.4);
      const h3 = totalTimelineHours - (h1 + h2);
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          title: "Milestone 1: Ingest, Sync & Story Cut",
          description: "Review all rushes, log footage, sync dialogue, and assemble the primary A-roll narrative structure.",
          tasks: ["Footage logging & dialogue sync", "Assembly & narrative rough cut", "Initial review cut export"],
          slots_count: 1,
          budget_percentage: 30,
          duration_hours: h1,
        },
        {
          id: `ms-${Date.now()}-2`,
          title: "Milestone 2: Motion Graphics & Sound Design",
          description: "Insert B-roll, animate lower thirds and title cards, add sound effects, and clean up audio mix.",
          tasks: ["B-roll insertion & match-cuts", "Lower thirds & title animations", "Sound effects & dialogue audio clean-up"],
          slots_count: 1,
          budget_percentage: 40,
          duration_hours: h2,
        },
        {
          id: `ms-${Date.now()}-3`,
          title: "Milestone 3: Color Grading & Master Delivery",
          description: "Final client review adjustments, professional color grade, audio mastering, and multi-format exports.",
          tasks: ["Final client sign-off pass", "Color grade & contrast balance", "Platform exports (16:9 4K & 9:16 Shorts)"],
          slots_count: 1,
          budget_percentage: 30,
          duration_hours: h3,
        },
      ]);
    } else if (type === "4-phase") {
      const quarterHours = Math.floor(totalTimelineHours / 4);
      const rem = totalTimelineHours - (quarterHours * 4);
      setMilestones([
        {
          id: `ms-${Date.now()}-1`,
          title: "Phase 1: Media Ingest, Sync & Story Cut",
          description: "Media organization, proxy generation, multitrack audio sync, and scene assembly cut.",
          tasks: ["Media ingest & proxy creation", "Multicam sync & footage review", "Assembly cut & beat structure"],
          slots_count: 1,
          budget_percentage: 25,
          duration_hours: quarterHours + rem,
        },
        {
          id: `ms-${Date.now()}-2`,
          title: "Phase 2: Director's Rough Cut",
          description: "Pacing refinement, scene trimming, narrative flow polish, and director review cut.",
          tasks: ["Scene trimming & shot selection", "Music score pacing & cut points", "Director cut review submission"],
          slots_count: 1,
          budget_percentage: 25,
          duration_hours: quarterHours,
        },
        {
          id: `ms-${Date.now()}-3`,
          title: "Phase 3: VFX, Graphics & Sound Mix",
          description: "Compositing, screen replacements, animated graphic packages, Foley, sound design, and EQ mixing.",
          tasks: ["VFX compositing & title graphics", "Foley & sound design layering", "Dialogue leveling & stereo audio mix"],
          slots_count: 1,
          budget_percentage: 25,
          duration_hours: quarterHours,
        },
        {
          id: `ms-${Date.now()}-4`,
          title: "Phase 4: Color Grading & Final QC Master",
          description: "Look development, shot-to-shot color matching, HDR/Rec.709 mastering, and archived project packaging.",
          tasks: ["Shot matching & color grading pass", "Quality control (QC) check", "Master archive & final video delivery"],
          slots_count: 1,
          budget_percentage: 25,
          duration_hours: quarterHours,
        },
      ]);
    }
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  // Smart AI Generator based on category
  const handleGenerateWithAI = () => {
    const catLower = (category || "").toLowerCase();
    if (catLower.includes("video") || catLower.includes("film") || catLower.includes("editing")) {
      handleApplyPreset("3-phase");
    } else if (catLower.includes("3d") || catLower.includes("animation")) {
      handleApplyPreset("4-phase");
    } else {
      handleApplyPreset("3-phase");
    }
  };

  const handleAddMilestone = () => {
    const nextIndex = milestones.length + 1;
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const remainingHours = Math.max(0, totalTimelineHours - totalAllocatedHours);
    const defaultVideoMilestones = [
      "Assembly & Rough Cut",
      "Motion Graphics & B-Roll",
      "Sound Design & Audio Mix",
      "Color Grading & Finishing",
      "Master Export & Packaging",
    ];
    const defaultTitle = defaultVideoMilestones[milestones.length] || `Milestone ${nextIndex}: Post-Production Phase`;
    const newMilestone: MilestoneFormItem = {
      id: `ms-${Date.now()}-${Math.random()}`,
      title: defaultTitle,
      description: "",
      tasks: [],
      slots_count: 1,
      budget_percentage: remainingPercentage > 0 ? remainingPercentage : 0,
      duration_hours: remainingHours > 0 ? remainingHours : 0,
    };
    setMilestones([...milestones, newMilestone]);
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleDuplicateMilestone = (id: string) => {
    const target = milestones.find(m => m.id === id);
    if (!target) return;
    const duplicateItem: MilestoneFormItem = {
      ...target,
      id: `ms-${Date.now()}-${Math.random()}`,
      title: `${target.title} (Copy)`,
      tasks: [...(target.tasks || [])],
    };
    const targetIdx = milestones.findIndex(m => m.id === id);
    const nextList = [...milestones];
    nextList.splice(targetIdx + 1, 0, duplicateItem);
    setMilestones(nextList);
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveMilestone = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleUpdateMilestone = (id: string, updates: Partial<MilestoneFormItem>) => {
    setMilestones(milestones.map(m => (m.id === id ? { ...m, ...updates } : m)));
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAddTask = (milestoneId: string, customText?: string) => {
    const text = (customText || taskInputs[milestoneId] || "").trim();
    if (!text) return;

    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== milestoneId) return m;
        if (m.tasks.includes(text)) return m;
        return {
          ...m,
          tasks: [...m.tasks, text],
        };
      })
    );
    if (!customText) {
      setTaskInputs(prev => ({ ...prev, [milestoneId]: "" }));
    }
  };

  const handleRemoveTask = (milestoneId: string, taskIdx: number) => {
    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          tasks: m.tasks.filter((_, idx) => idx !== taskIdx),
        };
      })
    );
  };

  const handleDistributeEvenly = () => {
    if (milestones.length === 0) return;
    const evenShare = Math.floor(100 / milestones.length);
    const remainder = 100 - (evenShare * milestones.length);
    const evenHours = Math.floor(totalTimelineHours / milestones.length);
    const remainderHours = totalTimelineHours - (evenHours * milestones.length);

    setMilestones(
      milestones.map((m, idx) => ({
        ...m,
        budget_percentage: idx === 0 ? evenShare + remainder : evenShare,
        duration_hours: idx === 0 ? evenHours + remainderHours : evenHours,
      }))
    );
    setErrors(prev => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allCollapsed = milestones.length > 0 && milestones.every(m => collapsedIds[m.id]);
  const handleToggleAll = () => {
    if (allCollapsed) {
      setCollapsedIds({});
    } else {
      const next: { [id: string]: boolean } = {};
      milestones.forEach(m => {
        next[m.id] = true;
      });
      setCollapsedIds(next);
    }
  };

  const avgPerSlot = Math.round(totalBudgetVal / Math.max(1, totalSlots));

  return (
    <div className="space-y-8 text-left">
      
      {/* 2-COLUMN STUDIO LAYOUT: LEFT MANAGEMENT + RIGHT STICKY ACTION/OVERVIEW HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Milestones Management Form */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Header & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Team Milestones & Deliverables
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Define phased deliverables, assign tasks, configure freelancer slots, and balance budget shares.
              </p>
            </div>

            {/* Collapse / Expand Toggle */}
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer"
              >
                {allCollapsed ? "Expand All Cards" : "Collapse All Cards"}
              </button>
            )}
          </div>

          {errors.milestones && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.milestones}</span>
            </div>
          )}

          {/* STREAMLINED REORDERABLE CARDS */}
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
                rawMinBudget={rawMinBudget}
                rawMaxBudget={rawMaxBudget}
                computedCredits={milestoneAllocations[idx]}
                defaultMilestoneHours={Math.max(1, Math.round((totalTimelineHours * (Number(m.budget_percentage) || equalShare)) / 100))}
                minHoursThreshold={minHoursThreshold}
                taskInputs={taskInputs}
                isCollapsed={Boolean(collapsedIds[m.id])}
                onToggleCollapse={toggleCollapse}
                setTaskInputs={setTaskInputs}
                handleUpdateMilestone={handleUpdateMilestone}
                handleDuplicateMilestone={handleDuplicateMilestone}
                handleRemoveMilestone={handleRemoveMilestone}
                handleAddTask={handleAddTask}
                handleRemoveTask={handleRemoveTask}
              />
            ))}
          </Reorder.Group>
        </div>

        {/* RIGHT COLUMN: Sticky Control Toolbox & Overview HUD */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Card 1: Studio Toolbox (Add Milestone, Presets, Auto-Balance, AI Generation) */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Roadmap Toolbox
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400">Actions</span>
            </div>

            {/* Primary Action: Add Milestone */}
            <button
              type="button"
              onClick={handleAddMilestone}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Another Milestone</span>
            </button>

            {/* Secondary Actions Grid: Auto-Balance & Generate with AI */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDistributeEvenly}
                disabled={milestones.length <= 1}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                title="Equally divide 100% budget and timeline hours among all milestones"
              >
                <Scale className="h-3.5 w-3.5 text-zinc-500" />
                <span>Auto-Balance</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateWithAI}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-2xs"
                title="Generate tailored milestones roadmap for video editing"
              >
                <Sparkles className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>AI Assist</span>
              </button>
            </div>

            {/* Presets Subsection */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Video Roadmap Presets
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("2-phase")}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition text-left cursor-pointer"
                >
                  <span>2-Phase (Rough Cut & Master)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">50 / 50</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("3-phase")}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition text-left cursor-pointer"
                >
                  <span>3-Phase (Story, VFX & Color)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">30 / 40 / 30</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("4-phase")}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition text-left cursor-pointer"
                >
                  <span>4-Phase (Full Post Pipeline)</span>
                  <span className="text-[10px] text-zinc-400 font-mono">25 &times; 4</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Step 4 Allocation Overview Card (Matches Step 2 Style) */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <Calculator className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Step 4 Overview</h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Budget */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Target Budget:</span>
                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                  <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {displayTotalBudget} Credits
                </span>
              </div>

              {/* Total Openings */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Hires Needed:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {totalSlots} {totalSlots === 1 ? "Creator" : "Creators"} ({totalSlots} Slots)
                </span>
              </div>

              {/* Timeline Hours */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Duration Target:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {totalTimelineHours} hrs ({timelineDays} {timelineDays === 1 ? "Day" : "Days"})
                </span>
              </div>

              {/* Average per Role */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Est. Average / Role:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  ~{avgPerSlot.toLocaleString()} Credits
                </span>
              </div>

              {/* Budget Allocation Status with Progress Bar */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Budget Allocation:</span>
                  {isPercentageValid ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Balanced (100%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                      <AlertCircle className="h-3 w-3" />
                      {totalPercentage < 100 ? `${100 - totalPercentage}% left` : `${totalPercentage - 100}% over`}
                    </span>
                  )}
                </div>
                {/* Visual Progress Meter */}
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPercentageValid ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, totalPercentage))}%` }}
                  />
                </div>
              </div>

              {/* Timeline Allocation Status with Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Timeline Allocation:</span>
                  {isHoursValid ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Balanced ({totalAllocatedHours}h)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                      <AlertCircle className="h-3 w-3" />
                      {totalAllocatedHours < totalTimelineHours
                        ? `${totalTimelineHours - totalAllocatedHours}h left`
                        : `${totalAllocatedHours - totalTimelineHours}h over`}
                    </span>
                  )}
                </div>
                {/* Visual Progress Meter */}
                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHoursValid ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (totalAllocatedHours / Math.max(1, totalTimelineHours)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Checklists Ready Status */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Checklists Ready:</span>
                <span className={`font-bold ${
                  milestones.every(m => m.tasks && m.tasks.length > 0)
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-500"
                }`}>
                  {milestones.filter(m => m.tasks && m.tasks.length > 0).length} of {milestones.length} (Ready)
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Roadmap Mini-Summary */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Roadmap Phases
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400">
                {milestones.length} Total
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {milestones.map((m, idx) => {
                const mPercent = Number(m.budget_percentage) || 0;
                const mAmount = milestoneAllocations[idx] !== undefined ? milestoneAllocations[idx] : Math.round((totalBudgetVal * mPercent) / 100);
                const slots = Math.max(1, m.slots_count || 1);
                const currentHours = m.duration_hours !== undefined ? m.duration_hours : defaultMilestoneHours;

                return (
                  <div
                    key={m.id || idx}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white">
                      <span className="truncate pr-2">
                        #{idx + 1} {m.title || "Untitled Phase"}
                      </span>
                      <span className="text-amber-500 shrink-0">
                        {mAmount.toLocaleString()} Cr
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>{slots} {slots === 1 ? "Slot" : "Slots"} &bull; {currentHours}h</span>
                      <span>{m.tasks.length} {m.tasks.length === 1 ? "task" : "tasks"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Escrow & Team Protection Tips */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Milestone Protection</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Credits allocated to milestones remain safely in platform escrow and are only released upon your explicit deliverable review and sign-off.
            </p>
          </div>

        </div>

      </div>

      {/* FULL-WIDTH FOOTER ACTIONS */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-sm focus:outline-none shadow-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>

        <button
          type="button"
          onClick={onAdvance}
          disabled={!isFormValid}
          className={`min-w-[220px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition focus:outline-none ${
            isFormValid
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/35 active:scale-[0.99] cursor-pointer"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
          }`}
        >
          <span>Continue to Review</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateTeamMilestones;