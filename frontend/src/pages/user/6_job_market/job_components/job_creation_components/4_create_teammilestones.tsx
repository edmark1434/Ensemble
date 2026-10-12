import React, { useState } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Users, CheckSquare, Sparkles, Scale, GripVertical, Clock } from "lucide-react";
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
  setTaskInputs: React.Dispatch<React.SetStateAction<{ [milestoneId: string]: string }>>;
  handleUpdateMilestone: (id: string, updates: Partial<MilestoneFormItem>) => void;
  handleRemoveMilestone: (id: string) => void;
  handleAddTask: (milestoneId: string) => void;
  handleRemoveTask: (milestoneId: string, taskIdx: number) => void;
}

const MilestoneCardItem: React.FC<MilestoneCardItemProps> = ({
  m,
  idx,
  milestonesCount,
  rawMinBudget,
  rawMaxBudget,
  computedCredits,
  defaultMilestoneHours,
  minHoursThreshold,
  taskInputs,
  setTaskInputs,
  handleUpdateMilestone,
  handleRemoveMilestone,
  handleAddTask,
  handleRemoveTask,
}) => {
  const dragControls = useDragControls();

  const mPercent = Number(m.budget_percentage) || 0;
  const mMaxBudget = computedCredits !== undefined ? computedCredits : Math.round((rawMaxBudget * mPercent) / 100);
  const mMinBudget = computedCredits !== undefined ? computedCredits : Math.round((rawMinBudget * mPercent) / 100);
  const slots = Math.max(1, m.slots_count || 1);
  const slotMinBudget = Math.round(mMinBudget / slots);
  const slotMaxBudget = Math.round(mMaxBudget / slots);

  return (
    <Reorder.Item
      value={m}
      id={`milestone-card-${m.id}`}
      dragListener={false}
      dragControls={dragControls}
      className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm space-y-4 relative transition-all duration-300"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* 6-dot drag handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/5 transition shrink-0 select-none"
            title="Drag to rearrange milestone"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <input
            type="text"
            value={m.title}
            onChange={e => handleUpdateMilestone(m.id, { title: e.target.value })}
            placeholder="Milestone Title (e.g. Frontend Architecture)"
            className="text-sm font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-zinc-700 focus:border-purple-500 focus:outline-none transition px-1 py-0.5 w-64 sm:w-80"
          />
        </div>

        {milestonesCount > 1 && (
          <button
            type="button"
            onClick={() => handleRemoveMilestone(m.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            title="Remove this milestone"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
          Scope & Deliverables Description
        </label>
        <textarea
          value={m.description}
          onChange={e => handleUpdateMilestone(m.id, { description: e.target.value })}
          placeholder="Outline what needs to be accomplished in this specific milestone..."
          rows={2}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-dark-base p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500/50 transition"
        />
      </div>

      {/* Tasks Checklist */}
      <div>
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-purple-500" />
            <span>Tasks / Deliverables Checklist ({m.tasks.length})</span>
          </span>
          {m.tasks.length === 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold normal-case flex items-center gap-1">
              * At least 1 task required
            </span>
          )}
        </label>

        {/* Existing tasks */}
        {m.tasks.length > 0 && (
          <div className="space-y-1.5 mb-2.5">
            {m.tasks.map((task, tIdx) => (
              <div
                key={tIdx}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5 text-xs text-gray-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span>{task}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTask(m.id, tIdx)}
                  className="text-gray-400 hover:text-red-500 transition text-[11px] p-0.5"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add task input */}
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
            placeholder="Type task item and press Enter (e.g. Set up auth routes)"
            className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500/50 transition"
          />
          <button
            type="button"
            onClick={() => handleAddTask(m.id)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Sleek Allocation Controls */}
      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
        {/* Row 1: Freelancer Slots & Milestone Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Freelancers Needed (Slots) */}
          <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 block">
                  Freelancer Slots
                </span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                  {m.slots_count} {m.slots_count === 1 ? "position" : "positions"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                disabled={m.slots_count <= 1}
                onClick={() => handleUpdateMilestone(m.id, { slots_count: Math.max(1, m.slots_count - 1) })}
                className={`h-7 w-7 flex items-center justify-center rounded-lg text-gray-700 dark:text-zinc-300 transition ${
                  m.slots_count <= 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95"
                }`}
              >
                -
              </button>
              <span className="w-6 text-center font-mono font-bold text-xs text-gray-900 dark:text-white select-none">
                {m.slots_count}
              </span>
              <button
                type="button"
                onClick={() => handleUpdateMilestone(m.id, { slots_count: m.slots_count + 1 })}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* 2. Milestone Hours Allocation */}
          {(() => {
            const currentHours = m.duration_hours !== undefined ? m.duration_hours : defaultMilestoneHours;
            const isHoursZero = !currentHours || currentHours <= 0;
            const isHoursLow = !isHoursZero && currentHours <= minHoursThreshold;
            const daysEquiv = (currentHours / 24).toFixed(1).replace(/\.0$/, "");

            return (
              <div className={`p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border flex items-center justify-between ${
                isHoursZero ? "border-red-300 dark:border-red-500/40" : isHoursLow ? "border-amber-300 dark:border-amber-500/40" : "border-gray-200/70 dark:border-white/5"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 block">
                        Milestone Hours
                      </span>
                      {isHoursZero && (
                        <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                      {isHoursLow && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.2 rounded" title={`Minimum threshold is >${minHoursThreshold} hrs`}>
                          Too low (&gt;{minHoursThreshold} hrs)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                      ~{daysEquiv} {Number(daysEquiv) === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 bg-white dark:bg-dark-base border rounded-xl px-2 py-1 shadow-xs ${
                  isHoursZero ? "border-red-400 dark:border-red-500" : isHoursLow ? "border-amber-400 dark:border-amber-500" : "border-gray-200 dark:border-white/10"
                }`}>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={m.duration_hours !== undefined ? (m.duration_hours === 0 ? "" : m.duration_hours) : defaultMilestoneHours}
                    placeholder={defaultMilestoneHours.toString()}
                    onChange={e => {
                      const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      handleUpdateMilestone(m.id, { duration_hours: val });
                    }}
                    className="w-12 text-right font-mono font-bold text-xs text-gray-900 dark:text-white bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-gray-400 select-none">hrs</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Row 2: Budget Share (%) in a new row below both Freelancer Slots & Milestone Hours */}
        {(() => {
          const equalShare = milestonesCount > 0 ? 100 / milestonesCount : 100;
          const minShareThreshold = Math.max(1, Math.round(equalShare * 0.20));
          const isBudgetZero = !m.budget_percentage || m.budget_percentage <= 0;
          const isBudgetLow = !isBudgetZero && m.budget_percentage <= minShareThreshold;

          return (
            <div className={`p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border flex items-center justify-between ${
              isBudgetZero ? "border-red-300 dark:border-red-500/40" : isBudgetLow ? "border-amber-300 dark:border-amber-500/40" : "border-gray-200/70 dark:border-white/5"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <CreditIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 block">
                      Budget Share
                    </span>
                    {isBudgetZero && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.2 rounded">
                        Required
                      </span>
                    )}
                    {isBudgetLow && (
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.2 rounded" title={`Minimum threshold is >${minShareThreshold}%`}>
                        Too low (&gt;{minShareThreshold}%)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                    {mMaxBudget.toLocaleString()} Credits {slots > 1 ? `(${slotMaxBudget.toLocaleString()} / slot)` : ""}
                  </span>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 bg-white dark:bg-dark-base border rounded-xl px-2 py-1 shadow-xs ${
                isBudgetZero ? "border-red-400 dark:border-red-500" : isBudgetLow ? "border-amber-400 dark:border-amber-500" : "border-gray-200 dark:border-white/10"
              }`}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={m.budget_percentage === 0 ? "" : m.budget_percentage}
                  placeholder="0"
                  onChange={e => {
                    const val = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    handleUpdateMilestone(m.id, { budget_percentage: val });
                  }}
                  className="w-10 text-right font-mono font-bold text-xs text-gray-900 dark:text-white bg-transparent outline-none"
                />
                <span className="text-xs font-bold text-gray-400 select-none">%</span>
              </div>
            </div>
          );
        })()}
      </div>
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
  errors,
  setErrors,
  onBack,
  onAdvance,
}) => {
  const [taskInputs, setTaskInputs] = useState<{ [milestoneId: string]: string }>({});

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

  const milestoneAllocations = React.useMemo(() => {
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

  const handleAddMilestone = () => {
    const nextIndex = milestones.length + 1;
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const remainingHours = Math.max(0, totalTimelineHours - totalAllocatedHours);
    const newMilestone: MilestoneFormItem = {
      id: `ms-${Date.now()}-${Math.random()}`,
      title: `Milestone ${nextIndex}`,
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

  const handleAddTask = (milestoneId: string) => {
    const text = (taskInputs[milestoneId] || "").trim();
    if (!text) return;

    setMilestones(prev =>
      prev.map(m => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          tasks: [...m.tasks, text],
        };
      })
    );
    setTaskInputs(prev => ({ ...prev, [milestoneId]: "" }));
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

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
          Team Milestones & Roles Allocation
        </h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">
          Define deliverables, assign tasks, configure freelancer slots, and balance budget & hours across each milestone.
        </p>
      </div>

      {/* Summary Allocation Bar */}
      <div className="p-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-3.5">
        {/* Row 1: Total Budget | Total Openings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3.5 border-b border-gray-200/80 dark:border-white/10 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/80 dark:divide-white/10">
          {/* 1. Total Project Budget */}
          <div className="sm:pr-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Total Budget
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-6 w-6 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                <CreditIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-base font-extrabold text-gray-900 dark:text-white">
                {displayTotalBudget}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Credits</span>
            </div>
          </div>

          {/* 2. Total Openings */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Total Openings
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-6 w-6 rounded-md bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-base font-extrabold text-gray-900 dark:text-white">
                {totalSlots}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                Freelancer{totalSlots > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Budget Allocation | Project Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/80 dark:divide-white/10">
          {/* 3. Budget Allocation */}
          <div className="sm:pr-4 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Budget Allocation
              </span>
              {isPercentageValid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  {totalPercentage < 100 ? `${100 - totalPercentage}% left` : `${totalPercentage - 100}% over`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-base font-extrabold ${isPercentageValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                {totalPercentage}%
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">/ 100% Target</span>
            </div>
          </div>

          {/* 4. Project Timeline (Days & Hours) */}
          <div className="pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Project Timeline
              </span>
              {isHoursValid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  {totalAllocatedHours < totalTimelineHours
                    ? `${totalTimelineHours - totalAllocatedHours} hrs left`
                    : `${totalAllocatedHours - totalTimelineHours} hrs over`}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-base font-extrabold ${isHoursValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                {totalAllocatedHours} hrs
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                / {totalTimelineHours} hrs Target ({timelineDays} {timelineDays === 1 ? "Day" : "Days"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {errors.milestones && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errors.milestones}</span>
        </div>
      )}

      {/* Reorderable Milestones Cards List */}
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
            setTaskInputs={setTaskInputs}
            handleUpdateMilestone={handleUpdateMilestone}
            handleRemoveMilestone={handleRemoveMilestone}
            handleAddTask={handleAddTask}
            handleRemoveTask={handleRemoveTask}
          />
        ))}
      </Reorder.Group>

      {/* Add Milestone & Auto Balance Actions at Bottom */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddMilestone}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Milestone</span>
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Generate with AI</span>
          </button>
        </div>

        {milestones.length > 1 && (
          <button
            type="button"
            onClick={handleDistributeEvenly}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition"
            title="Equally divide 100% budget and timeline hours among all milestones"
          >
            <Scale className="h-4 w-4 text-purple-500" />
            <span>Auto-Balance</span>
          </button>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/60 dark:border-white/5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Terms</span>
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
            isFormValid
              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20"
              : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-white/15"
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
