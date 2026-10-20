import React, { useEffect } from "react";
import { Plus, Trash2, ArrowRight, Clock, RefreshCcw, Layers, GripVertical, CheckCircle2, Users, CheckSquare, Sparkles } from "lucide-react";
import { Reorder } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { Job } from "../../../job_components/job_lists";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  hours: number | string;
  revisions: number | string;
  percentage?: number;
}

interface ProposalMilestonesProps {
  job?: Job | null;
  bidAmount: string;
  setBidAmount?: (val: string) => void;
  additionalWorkRate: number;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  selectedMilestoneId?: string;
  setSelectedMilestoneId?: (id: string) => void;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onBack: () => void;
  onAdvance: () => void;
  jobTimeline?: string;
}

export const ProposalMilestonesStep: React.FC<ProposalMilestonesProps> = ({
  job,
  bidAmount,
  setBidAmount,
  additionalWorkRate,
  milestones,
  setMilestones,
  selectedMilestoneId,
  setSelectedMilestoneId,
  errors,
  setErrors,
  onBack,
  onAdvance,
  jobTimeline,
}) => {
  const isTeamJob = Boolean(job?.hiring_type === "team" || (Array.isArray(job?.milestones) && job.milestones.length > 0));

  const timelineText = job?.timeline || jobTimeline || "";
  const maxDaysMatch = timelineText.match(/-?\s*(\d+)\s*Days?/i);
  const maxDays = maxDaysMatch ? parseInt(maxDaysMatch[1]) || 0 : 0;
  const allocatedHours = maxDays > 0 ? maxDays * 24 : 24;

  // Team job milestone selection synchronization
  useEffect(() => {
    if (isTeamJob && job?.milestones && job.milestones.length > 0) {
      const activeId = selectedMilestoneId || job.milestones[0].job_milestone_id;
      const targetM = job.milestones.find((m: any) => m.job_milestone_id === activeId) || job.milestones[0];
      if (targetM) {
        if (!selectedMilestoneId && setSelectedMilestoneId) {
          setSelectedMilestoneId(targetM.job_milestone_id);
        }
        const slots = Math.max(1, targetM.slots_count || 1);
        const slotCredits = targetM.budget_credits
          ? Math.round(Number(targetM.budget_credits) / slots)
          : Math.round(((job.minBudget * (Number(targetM.budget_percentage) || 0)) / 100) / slots);
        if (setBidAmount) {
          setBidAmount(slotCredits.toString());
        }
        if (milestones.length === 0 || milestones[0]?.id !== targetM.job_milestone_id) {
          const existingRev = milestones[0]?.revisions !== undefined ? milestones[0]?.revisions : 2;
          const targetHours = Number(targetM.duration_hours) || allocatedHours;
          setMilestones([
            {
              id: targetM.job_milestone_id,
              name: targetM.title,
              description: targetM.description || "",
              hours: targetHours,
              revisions: existingRev,
              percentage: 100,
            },
          ]);
        }
      }
    }
  }, [isTeamJob, job?.milestones, selectedMilestoneId, allocatedHours]);

  const handleSelectTeamMilestone = (m: any) => {
    if (setSelectedMilestoneId) {
      setSelectedMilestoneId(m.job_milestone_id);
    }
    const slots = Math.max(1, m.slots_count || 1);
    const slotCredits = m.budget_credits
      ? Math.round(Number(m.budget_credits) / slots)
      : Math.round(((job?.minBudget || 0) * (Number(m.budget_percentage) || 0) / 100) / slots);
    if (setBidAmount) {
      setBidAmount(slotCredits.toString());
    }
    const existingRev = milestones[0]?.revisions !== undefined ? milestones[0]?.revisions : 2;
    const mHours = Number(m.duration_hours) || allocatedHours;
    setMilestones([
      {
        id: m.job_milestone_id,
        name: m.title,
        description: m.description || "",
        hours: mHours,
        revisions: existingRev,
        percentage: 100,
      },
    ]);
    setErrors((prev) => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const totalBid = parseInt(bidAmount || "0");
  const count = milestones.length || 1;
  const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  const isPercentageValid = totalPercentage === 100;
  // Compute average payout just for overage estimation
  const milestonePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(milestonePayout * (additionalWorkRate / 100));

  const maxHoursAllowed = allocatedHours;
  const totalHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
  const isOverLimit = maxHoursAllowed > 0 && totalHours > maxHoursAllowed;

  useEffect(() => {
    if (errors.milestones) {
      const timer = setTimeout(() => {
        setErrors((prev) => {
          const { milestones, ...rest } = prev;
          return rest;
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [errors.milestones, setErrors]);

  const handleAddMilestone = () => {
    const nextNum = milestones.length + 1;
    const newM: Milestone = {
      id: `ms-${Date.now()}`,
      name: `Milestone ${nextNum}: Phase Deliverable`,
      description: "",
      hours: 10,
      revisions: 2,
      percentage: 0,
    };
    setMilestones((prev) => [...prev, newM]);
    setErrors((prev) => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRemove = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdate = (id: string, field: keyof Milestone, val: any) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleApplyTemplate = (type: "single" | "two_phase" | "three_phase" | "qa_phase") => {
    const totalH = allocatedHours > 0 ? allocatedHours : 24;
    let newMilestones: Milestone[] = [];

    if (type === "single") {
      newMilestones = [
        {
          id: `ms-${Date.now()}-1`,
          name: "Complete Deliverable & Final Handover",
          description: "Full end-to-end execution, delivery of source files, and final client sign-off.",
          hours: totalH,
          revisions: 2,
          percentage: 100,
        },
      ];
    } else if (type === "two_phase") {
      const h1 = Math.max(1, Math.round(totalH * 0.4));
      const h2 = Math.max(1, totalH - h1);
      newMilestones = [
        {
          id: `ms-${Date.now()}-1`,
          name: "Phase 1: Initial Working Prototype / Draft",
          description: "Deliver rough cut, core architecture, or initial layout for review.",
          hours: h1,
          revisions: 2,
          percentage: 40,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "Phase 2: Final Polish & Master Export",
          description: "Apply feedback, polish visual details, and complete final deliverables.",
          hours: h2,
          revisions: 2,
          percentage: 60,
        },
      ];
    } else if (type === "three_phase") {
      const h1 = Math.max(1, Math.round(totalH * 0.25));
      const h2 = Math.max(1, Math.round(totalH * 0.45));
      const h3 = Math.max(1, totalH - h1 - h2);
      newMilestones = [
        {
          id: `ms-${Date.now()}-1`,
          name: "Phase 1: Discovery, Concepts & Wireframes",
          description: "Research, concept exploration, and initial structural blueprint.",
          hours: h1,
          revisions: 1,
          percentage: 25,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "Phase 2: Core Development / Main Production",
          description: "Implementation of primary components, assets, and working functionality.",
          hours: h2,
          revisions: 2,
          percentage: 45,
        },
        {
          id: `ms-${Date.now()}-3`,
          name: "Phase 3: Revisions, QA & Final Assets",
          description: "Review passes, bug fixes/polish, and final delivery handover.",
          hours: h3,
          revisions: 2,
          percentage: 30,
        },
      ];
    } else if (type === "qa_phase") {
      const h1 = Math.max(1, Math.round(totalH * 0.7));
      const h2 = Math.max(1, totalH - h1);
      newMilestones = [
        {
          id: `ms-${Date.now()}-1`,
          name: "Phase 1: Complete Feature Build / Draft Pass",
          description: "Primary implementation and functional deliverables.",
          hours: h1,
          revisions: 2,
          percentage: 70,
        },
        {
          id: `ms-${Date.now()}-2`,
          name: "Phase 2: Quality Assurance, Testing & Deployment",
          description: "Testing, verification, client review adjustments, and deployment.",
          hours: h2,
          revisions: 1,
          percentage: 30,
        },
      ];
    }

    setMilestones(newMilestones);
    setErrors((prev) => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  if (isTeamJob && job?.milestones && job.milestones.length > 0) {
    const selectedM = job.milestones.find((m: any) => m.job_milestone_id === selectedMilestoneId) || job.milestones[0];
    const slots = Math.max(1, selectedM?.slots_count || 1);
    const selectedPayout = selectedM?.budget_credits
      ? Math.round(Number(selectedM.budget_credits) / slots)
      : Math.round(((job.minBudget * (Number(selectedM?.budget_percentage) || 0)) / 100) / slots);
    const selectedOverageBonus = Math.floor(selectedPayout * (additionalWorkRate / 100));

    return (
      <div className="space-y-5 text-left">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              Team Job Post
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Choose Your Milestone Role</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Please choose the single milestone role you are best suited for. To ensure balanced team distribution, each collaborator may undertake one role on this project.
          </p>
        </div>

        {/* Total Project Pool banner */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider block">Total Project Budget</span>
            <span className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 mt-0.5">
              <CreditIcon className="h-4 w-4" />
              {job.minBudget === job.maxBudget ? `${job.minBudget.toLocaleString()} Credits` : (job.priceRange || `${job.minBudget.toLocaleString()} Credits`)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider block">Available Roles</span>
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 mt-0.5 block">
              {job.milestones.length} Milestones
            </span>
          </div>
        </div>

        {errors.milestones && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
            {errors.milestones}
          </div>
        )}

        {/* Milestone Cards List */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-purple-500" />
            <span>Select Milestone <span className="text-red-500">*</span></span>
          </label>

          <div className="grid grid-cols-1 gap-3">
            {job.milestones.map((m: any, idx: number) => {
              const isSelected = (selectedMilestoneId || job.milestones[0].job_milestone_id) === m.job_milestone_id;
              const mSlots = Math.max(1, m.slots_count || 1);
              const mPct = Number(m.budget_percentage) || 0;
              const slotCredits = m.budget_credits
                ? Math.round(Number(m.budget_credits) / mSlots)
                : Math.round(((job.minBudget * mPct) / 100) / mSlots);
              const tasks = Array.isArray(m.tasks) ? m.tasks : (typeof m.tasks === "string" ? JSON.parse(m.tasks || "[]") : []);

              return (
                <div
                  key={m.job_milestone_id || idx}
                  onClick={() => handleSelectTeamMilestone(m)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/5 shadow-md ring-2 ring-purple-500/30 dark:bg-purple-950/20"
                      : "border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-5 w-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {m.title}
                        </h4>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Selected Role
                          </span>
                        )}
                      </div>

                      {m.description && (
                        <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pl-7">
                          {m.description}
                        </p>
                      )}

                      {tasks.length > 0 && (
                        <div className="pl-7 pt-1.5 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                            Milestone Deliverables:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {tasks.map((task: any, tIdx: number) => {
                              const taskTitle = typeof task === "string" ? task : task.title || `Task ${tIdx + 1}`;
                              return (
                                <div
                                  key={tIdx}
                                  className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-zinc-300"
                                >
                                  <CheckSquare className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                  <span className="truncate">{taskTitle}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5 sm:min-w-[130px]">
                      <div className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                        <CreditIcon className="h-4 w-4 text-amber-500" />
                        <span>{slotCredits.toLocaleString()} Credits</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Fixed Payout / Slot
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3 text-purple-400" />
                          {mSlots} slot{mSlots > 1 ? "s" : ""}
                        </span>
                        {m.duration_hours && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3 text-purple-400" />
                              {m.duration_hours} hrs
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{m.applicant_count || 0} applied</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Role Financials Summary */}
        {selectedM && (
          <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Compensation Breakdown for "{selectedM.title}"
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                100% Milestone Allocation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase block">Milestone Payout</span>
                <span className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                  <CreditIcon className="h-4 w-4" /> {selectedPayout.toLocaleString()} Credits
                </span>
              </div>
              <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase block">You Receive (Net)</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CreditIcon className="h-4 w-4" /> {Math.floor(selectedPayout * 0.9).toLocaleString()} Credits
                </span>
                <span className="text-[9px] text-gray-400 dark:text-zinc-500">(-10% platform fee)</span>
              </div>
              <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase block">Extra Revision Rate</span>
                <span className="text-sm font-bold text-gray-700 dark:text-zinc-200 mt-0.5 block">
                  +{selectedOverageBonus.toLocaleString()} Credits
                </span>
                <span className="text-[9px] text-gray-400 dark:text-zinc-500">+{additionalWorkRate}% per extra pass</span>
              </div>
            </div>
          </div>
        )}

        {/* Revision & Delivery Terms for Selected Milestone Role */}
        {selectedM && (
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <RefreshCcw className="h-4 w-4 text-purple-500" />
                  Included Revisions & Delivery Terms
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  Specify how many revision passes you include for "{selectedM.title}" before overage rates apply.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Revisions Stepper / Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Max Included Revisions
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRev = Number(milestones[0]?.revisions) || 2;
                      if (currentRev > 0) {
                        handleUpdate(milestones[0]?.id || selectedM.job_milestone_id, "revisions", currentRev - 1);
                      }
                    }}
                    className="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-200 font-bold text-sm flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={milestones[0]?.revisions ?? 2}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        handleUpdate(milestones[0]?.id || selectedM.job_milestone_id, "revisions", val);
                      }}
                      className="w-full text-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-purple-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                      passes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentRev = Number(milestones[0]?.revisions) || 2;
                      handleUpdate(milestones[0]?.id || selectedM.job_milestone_id, "revisions", currentRev + 1);
                    }}
                    className="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-200 font-bold text-sm flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                  Client receives <strong>{milestones[0]?.revisions ?? 2} free revision pass{(Number(milestones[0]?.revisions) !== 1) ? "es" : ""}</strong>.
                </p>
              </div>

              {/* Allocated Delivery Timeline (from Client's Job Post) */}
              {(() => {
                const mHours = Number(selectedM?.duration_hours) || allocatedHours;
                const mDays = (mHours / 24).toFixed(1).replace(/\.0$/, "");
                return (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                      Allocated Milestone Timeline
                    </label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02]">
                      <Clock className="h-4 w-4 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block truncate">
                          {mHours} Hours Max (~{mDays} {Number(mDays) === 1 ? "day" : "days"})
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Configured by client for this milestone. All tasks must be completed within this period.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onAdvance}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
          >
            Confirm Milestone & Review <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Milestone Breakdown</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Outline deliverables and revision limits for step-by-step client approval.</p>
      </div>

      {maxHoursAllowed > 0 && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${isOverLimit ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400'}`}>
           <div className="flex items-center gap-2">
             <Clock className="w-4 h-4" />
             <span>Total Hours Limit (from {jobTimeline})</span>
           </div>
           <span>{totalHours} / {maxHoursAllowed} hrs</span>
        </div>
      )}

      {/* Escrow Pool Preview Banner */}
      <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Total Escrow Bid</span>
          <div className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1">
            <CreditIcon className="h-4 w-4" /> {totalBid.toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Total Allocations (%)</span>
          <div className={`text-sm font-bold ${isPercentageValid ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {totalPercentage}% / 100%
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Overage Revision Fee</span>
          <div className="text-xs font-bold text-gray-700 dark:text-zinc-300">
            +{overageRateBonus.toLocaleString()} ({additionalWorkRate}%)
          </div>
        </div>
      </div>

      {errors.milestones && <p className="text-[11px] text-red-400">{errors.milestones}</p>}

      {/* 1-Click Milestone Quick Templates */}
      <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Quick-Fill Templates
          </span>
          <span className="text-[10px] text-gray-500 dark:text-zinc-500">
            Auto-generate deliverables & phase splits
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleApplyTemplate("single")}
            className="px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-gray-800 dark:text-zinc-200"
          >
            <div className="font-bold flex items-center gap-1 text-[11px] text-gray-900 dark:text-white">
              <span>Single Phase</span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-zinc-400">100% on delivery</div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyTemplate("two_phase")}
            className="px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-gray-800 dark:text-zinc-200"
          >
            <div className="font-bold flex items-center gap-1 text-[11px] text-gray-900 dark:text-white">
              <span>2 Phases</span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-zinc-400">40% Draft / 60% Final</div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyTemplate("three_phase")}
            className="px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-gray-800 dark:text-zinc-200"
          >
            <div className="font-bold flex items-center gap-1 text-[11px] text-gray-900 dark:text-white">
              <span>3 Phases</span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-zinc-400">25% / 45% / 30%</div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyTemplate("qa_phase")}
            className="px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-gray-800 dark:text-zinc-200"
          >
            <div className="font-bold flex items-center gap-1 text-[11px] text-gray-900 dark:text-white">
              <span>Dev + QA</span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-zinc-400">70% Build / 30% QA</div>
          </button>
        </div>
      </div>

      {/* Milestone Cards List */}
      <Reorder.Group axis="y" values={milestones} onReorder={setMilestones} className="space-y-4">
        {milestones.map((m, idx) => (
          <Reorder.Item key={m.id} value={m} className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing" />
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" /> Milestone {idx + 1} - <CreditIcon className="h-3 w-3 text-amber-500 dark:text-amber-400" /> {Math.floor(totalBid * ((Number(m.percentage) || 0) / 100)).toLocaleString()} Credits
                </span>
              </div>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-gray-500 dark:text-zinc-500 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Milestone Name (e.g., Initial Rough Cut & Audio Sync)"
                value={m.name}
                onChange={(e) => handleUpdate(m.id, "name", e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500/50"
              />
              <textarea
                rows={2}
                placeholder="Briefly describe what deliverables are included in this milestone..."
                value={m.description}
                onChange={(e) => handleUpdate(m.id, "description", e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 resize-y"
              />
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <CreditIcon className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Percentage %
                </label>
                <input
                  type="number"
                  value={m.percentage ?? ""}
                  onChange={(e) => handleUpdate(m.id, "percentage", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                  min={0}
                  max={100}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Hours
                </label>
                <input
                  type="number"
                  value={m.hours}
                  onChange={(e) => handleUpdate(m.id, "hours", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Revisions
                </label>
                <input
                  type="number"
                  value={m.revisions}
                  onChange={(e) => handleUpdate(m.id, "revisions", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <button
        type="button"
        onClick={handleAddMilestone}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-blue-400 flex items-center justify-center gap-1.5 transition"
      >
        <Plus className="h-4 w-4" /> Add Another Milestone
      </button>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
        >
          Confirm Milestones & Review <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ProposalMilestonesStep;