import React, { type FormEvent } from "react";
import { 
  ArrowRight, 
  ArrowLeft,
  X, 
  Plus, 
  Minus, 
  HelpCircle, 
  Info, 
  Calendar, 
  AlertCircle, 
  Sparkles, 
  Trash2,
  Calculator,
  Clock,
  Coins,
  CheckCircle2,
  Users,
  RefreshCw,
  InfinityIcon
} from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SkillsAutocomplete } from "./SkillsAutocomplete";

interface CreateBudgetSkillsProps {
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  skillInput: string;
  setSkillInput: (val: string) => void;
  minBudget: string;
  setMinBudget: (val: string) => void;
  maxBudget: string;
  setMaxBudget: (val: string) => void;
  minTimeline: string;
  setMinTimeline: (val: string) => void;
  maxTimeline: string;
  setMaxTimeline: (val: string) => void;
  deadline: string;
  setDeadline: (val: string) => void;
  positions: number;
  setPositions: React.Dispatch<React.SetStateAction<number>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  formatCommaString: (val: string) => string;
  isLockedToSingle?: boolean;
  minPositions?: number;
  isFixedBudget?: boolean;
  hidePositions?: boolean;
  budgetType?: "range" | "open";
  setBudgetType?: (val: "range" | "open") => void;
  preScopedMilestones?: any[];
  setPreScopedMilestones?: React.Dispatch<React.SetStateAction<any[]>>;
  applicationWindowHours?: number;
  setApplicationWindowHours?: (val: number) => void;
  isUrgent?: boolean;
  setIsUrgent?: (val: boolean) => void;
  hasHardDeadline?: boolean;
  setHasHardDeadline?: (val: boolean) => void;
  hardDeadline?: string;
  setHardDeadline?: (val: string) => void;
  title?: string;
  description?: string;
  category?: string;
  onBack: () => void;
  onAdvance: () => void;
}

export const CreateBudgetSkills: React.FC<CreateBudgetSkillsProps> = ({
  skills,
  setSkills,
  skillInput,
  setSkillInput,
  minBudget,
  setMinBudget,
  maxBudget,
  setMaxBudget,
  minTimeline,
  setMinTimeline,
  maxTimeline,
  setMaxTimeline,
  deadline,
  setDeadline,
  positions,
  setPositions,
  errors,
  setErrors,
  formatCommaString,
  isLockedToSingle = false,
  minPositions,
  isFixedBudget = false,
  hidePositions = true,
  budgetType = "range",
  setBudgetType,
  preScopedMilestones = [],
  setPreScopedMilestones,
  applicationWindowHours = 72,
  setApplicationWindowHours,
  isUrgent = false,
  setIsUrgent,
  hasHardDeadline = false,
  setHasHardDeadline,
  hardDeadline = "",
  setHardDeadline,
  title = "",
  description = "",
  category = "",
  onBack,
  onAdvance,
}) => {
  const effectiveMin = minPositions ?? (isLockedToSingle ? 1 : 1);

  React.useEffect(() => {
    if (isLockedToSingle && positions !== 1) {
      setPositions(1);
    } else if (positions < effectiveMin) {
      setPositions(effectiveMin);
    }
  }, [isLockedToSingle, positions, setPositions, effectiveMin]);

  React.useEffect(() => {
    if (skills.length >= 3 && errors.skills) {
      setErrors((prev) => {
        const { skills: _, ...rest } = prev;
        return rest;
      });
    }
  }, [skills.length, errors.skills, setErrors]);

  const daysUntilDeadline = React.useMemo(() => {
    if (!deadline) return null;
    const parts = deadline.split("-");
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d || y.length !== 4) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(Number(y), Number(m) - 1, Number(d));
    if (isNaN(selected.getTime())) return null;
    const diffTime = selected.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [deadline]);

  const maxTimelineNum = parseInt(maxTimeline, 10);
  const minTimelineNum = parseInt(minTimeline, 10);

  const rawMinBudget = parseInt(minBudget.replace(/\D/g, ""), 10) || 0;
  const rawMaxBudget = parseInt(maxBudget.replace(/\D/g, ""), 10) || 0;

  const isBudgetRangeInvalid = React.useMemo(() => {
    if (budgetType !== "range" || isFixedBudget) return false;
    return rawMinBudget > 0 && rawMaxBudget > 0 && rawMaxBudget < rawMinBudget;
  }, [budgetType, isFixedBudget, rawMinBudget, rawMaxBudget]);

  React.useEffect(() => {
    if (budgetType === "range" && !isFixedBudget) {
      if (rawMinBudget > 0 && rawMaxBudget > 0 && rawMaxBudget < rawMinBudget) {
        setErrors((prev) => ({
          ...prev,
          maxBudget: `Maximum budget cannot be lower than minimum budget (${formatCommaString(minBudget)} Credits).`,
        }));
      } else if (
        errors.maxBudget &&
        errors.maxBudget.includes("cannot be lower than minimum budget")
      ) {
        setErrors((prev) => {
          const { maxBudget: _, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [budgetType, isFixedBudget, rawMinBudget, rawMaxBudget, minBudget, errors.maxBudget, setErrors, formatCommaString]);

  const minCutoffDateString = React.useMemo(() => {
    const intakeHours = applicationWindowHours || 72;
    const minDays = !isNaN(minTimelineNum) && minTimelineNum > 0 ? minTimelineNum : 1;
    const minMs = Date.now() + (intakeHours + minDays * 24) * 60 * 60 * 1000;
    return new Date(minMs).toISOString().split("T")[0];
  }, [applicationWindowHours, minTimelineNum]);

  const handleAutoAdjustCutoff = () => {
    const intakeHours = applicationWindowHours || 72;
    const turnDays = !isNaN(maxTimelineNum) && maxTimelineNum > 0 
      ? maxTimelineNum 
      : (!isNaN(minTimelineNum) && minTimelineNum > 0 ? minTimelineNum : 3);
    const safeMs = Date.now() + (intakeHours + turnDays * 24) * 60 * 60 * 1000;
    const safeDate = new Date(safeMs).toISOString().split("T")[0];
    setHardDeadline?.(safeDate);
    setErrors((prev) => {
      const { hardDeadline: _, ...r } = prev;
      return r;
    });
  };

  const handleAutoFitTurnaround = () => {
    let targetDateStr = hardDeadline;
    if (!hasHardDeadline || !targetDateStr) {
      const defaultCutoffMs = Date.now() + 14 * 24 * 60 * 60 * 1000;
      targetDateStr = new Date(defaultCutoffMs).toISOString().split("T")[0];
      setHasHardDeadline?.(true);
      setHardDeadline?.(targetDateStr);
    }

    const parts = targetDateStr.split("-");
    if (parts.length !== 3) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const totalDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return;

    const intakeDays = Math.max(1, Math.ceil((applicationWindowHours || 24) / 24));
    const availableDays = totalDays - intakeDays;

    if (availableDays <= 1) {
      setMinTimeline("1");
      setMaxTimeline("1");
    } else if (availableDays <= 3) {
      setMinTimeline("1");
      setMaxTimeline(String(Math.max(1, availableDays - 1)));
    } else if (availableDays <= 6) {
      const buffer = 1;
      const maxDays = availableDays - buffer;
      const minDays = Math.max(1, Math.round(maxDays * 0.6));
      setMinTimeline(String(minDays));
      setMaxTimeline(String(maxDays));
    } else {
      const buffer = Math.max(2, Math.round(availableDays * 0.2));
      const maxDays = Math.max(2, availableDays - buffer);
      const minDays = Math.max(1, Math.round(maxDays * 0.6));
      setMinTimeline(String(minDays));
      setMaxTimeline(String(maxDays));
    }

    setErrors((prev) => {
      const { minTimeline: _, maxTimeline: __, ...rest } = prev;
      return rest;
    });
  };

  const timelineProgressInfo = React.useMemo(() => {
    const intakeHours = applicationWindowHours || 72;
    const turnDays = !isNaN(maxTimelineNum) && maxTimelineNum > 0 
      ? maxTimelineNum 
      : (!isNaN(minTimelineNum) && minTimelineNum > 0 ? minTimelineNum : 3);
    const turnHours = turnDays * 24;
    const plannedHours = intakeHours + turnHours;

    let deadlineHours = plannedHours;
    let bufferHours = 0;
    let bufferDays = 0;

    if (hasHardDeadline && hardDeadline) {
      const parts = hardDeadline.split("-");
      if (parts.length === 3) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const diffMs = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          const totalCutoffHours = diffDays * 24;
          if (totalCutoffHours > plannedHours) {
            deadlineHours = totalCutoffHours;
            bufferHours = totalCutoffHours - plannedHours;
            bufferDays = Math.round(bufferHours / 24);
          }
        }
      }
    }

    let appPercent = Math.round((intakeHours / deadlineHours) * 100);
    let turnPercent = Math.round((turnHours / deadlineHours) * 100);
    let bufferPercent = bufferHours > 0 ? 100 - appPercent - turnPercent : 0;

    if (bufferHours > 0) {
      appPercent = Math.max(15, Math.min(45, appPercent));
      turnPercent = Math.max(20, Math.min(50, turnPercent));
      bufferPercent = Math.max(10, 100 - appPercent - turnPercent);
    } else {
      appPercent = Math.max(25, Math.min(65, appPercent));
      turnPercent = 100 - appPercent;
      bufferPercent = 0;
    }

    const appLabel = intakeHours <= 24 ? `${intakeHours}h Intake` : `${Math.round(intakeHours / 24)}d Intake`;
    const turnLabel = minTimelineNum && maxTimelineNum && minTimelineNum !== maxTimelineNum 
      ? `${minTimelineNum}–${maxTimelineNum}d Work`
      : `${turnDays}d Work`;
    const bufferLabel = bufferDays > 0 ? `${bufferDays}d Buffer` : null;

    return {
      appPercent,
      turnPercent,
      bufferPercent,
      bufferDays,
      appLabel,
      turnLabel,
      bufferLabel,
    };
  }, [applicationWindowHours, maxTimelineNum, minTimelineNum, hasHardDeadline, hardDeadline]);

  const isCutoffBeforeIntake = React.useMemo(() => {
    if (!hasHardDeadline || !hardDeadline) return false;
    return hardDeadline < minCutoffDateString;
  }, [hasHardDeadline, hardDeadline, minCutoffDateString]);

  const isTimelineExceedingDeadline = React.useMemo(() => {
    if (!hasHardDeadline || !hardDeadline) return false;
    if (hardDeadline < minCutoffDateString) return true;
    const parts = hardDeadline.split("-");
    if (parts.length !== 3) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (!isNaN(maxTimelineNum) && maxTimelineNum > diffDays) return true;
    if (!isNaN(minTimelineNum) && minTimelineNum > diffDays) return true;
    return false;
  }, [hasHardDeadline, hardDeadline, maxTimelineNum, minTimelineNum, minCutoffDateString]);

  return (
    <div className="text-left space-y-8">
      {/* 2-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Budget, Timeline, and Milestones */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Budget Allocation & Requirements
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Establish operational budget benchmarks, delivery schedules, and milestone roadmaps.
            </p>
          </div>

          {/* Section 1: Budget Estimate Range or Fixed Project Budget */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</div>
                  <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                    Set Budget ({isFixedBudget ? "Total Project Budget" : budgetType === "open" ? "Starting Minimum Bid" : "Budget Estimate Range"}) <span className="text-red-500">*</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  {budgetType === "open"
                    ? "Set your floor expectation. Freelancers will submit proposals at or above this amount."
                    : "Specify the planned credit allocation for the entire project scope."}
                </p>
              </div>

              {!isFixedBudget && setBudgetType && (
                <div className="flex items-center p-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-xs font-bold self-start sm:self-auto shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType("range");
                      setErrors((prev) => {
                        const { maxBudget: _, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      budgetType === "range"
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Budget Range
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType("open");
                      setMaxBudget("");
                      setErrors((prev) => {
                        const { maxBudget: _, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      budgetType === "open"
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <InfinityIcon className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                    <span>Open Bid</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inputs Area */}
            {isFixedBudget ? (
              <div>
                <div className="relative h-12 flex items-center">
                  <div className="absolute left-4 inset-y-0 flex items-center text-yellow-500 pointer-events-none">
                    <CreditIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Total Budget (e.g. 1,000)"
                    value={formatCommaString(minBudget)}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, "");
                      setMinBudget(cleaned);
                      setMaxBudget(cleaned);
                      setErrors((prev) => {
                        const { minBudget: _, maxBudget: __, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`w-full h-12 rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                      errors.minBudget || errors.maxBudget
                        ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                        : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                </div>
                {(errors.minBudget || errors.maxBudget) && (
                  <p className="text-[11px] font-medium text-red-500 mt-1.5">{errors.minBudget || errors.maxBudget}</p>
                )}
              </div>
            ) : budgetType === "open" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <div className="relative h-12 flex items-center">
                    <div className="absolute left-4 inset-y-0 flex items-center text-yellow-500 pointer-events-none">
                      <CreditIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Starting Minimum Bid (e.g. 500)"
                      value={formatCommaString(minBudget)}
                      onChange={(e) => {
                        setMinBudget(e.target.value.replace(/\D/g, ""));
                        setErrors((prev) => {
                          const { minBudget: _, ...r } = prev;
                          return r;
                        });
                      }}
                      className={`w-full h-12 rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                        errors.minBudget
                          ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                          : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>
                  {errors.minBudget && <p className="text-[11px] font-medium text-red-500 mt-1.5">{errors.minBudget}</p>}
                </div>

                <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50/70 dark:bg-white/[0.02] text-gray-700 dark:text-zinc-300">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400">
                    <InfinityIcon className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-tight min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white block truncate">No Upper Limit</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 block truncate">Proposals will quote flexible scopes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <div className="relative h-12 flex items-center">
                      <div className="absolute left-4 inset-y-0 flex items-center text-yellow-500 pointer-events-none">
                        <CreditIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Minimum Credits (e.g. 500)"
                        value={formatCommaString(minBudget)}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, "");
                          setMinBudget(cleaned);
                          const minVal = parseInt(cleaned, 10) || 0;
                          if (rawMaxBudget > 0 && minVal > 0 && rawMaxBudget < minVal) {
                            setErrors((prev) => ({
                              ...prev,
                              minBudget: undefined as any,
                              maxBudget: `Maximum budget cannot be lower than minimum budget (${formatCommaString(cleaned)} Credits).`,
                            }));
                          } else {
                            setErrors((prev) => {
                              const { minBudget: _, maxBudget: mErr, ...r } = prev;
                              if (mErr && mErr.includes("cannot be lower than minimum budget")) {
                                return r;
                              }
                              return { ...r, ...(mErr ? { maxBudget: mErr } : {}) };
                            });
                          }
                        }}
                        className={`w-full h-12 rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                          errors.minBudget
                            ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                            : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                    {errors.minBudget && <p className="text-[11px] font-medium text-red-500 mt-1.5">{errors.minBudget}</p>}
                  </div>

                  <div>
                    <div className="relative h-12 flex items-center">
                      <div className="absolute left-4 inset-y-0 flex items-center text-yellow-500 pointer-events-none">
                        <CreditIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Maximum Credits (e.g. 1,500)"
                        value={formatCommaString(maxBudget)}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, "");
                          setMaxBudget(cleaned);
                          const maxVal = parseInt(cleaned, 10) || 0;
                          if (rawMinBudget > 0 && maxVal > 0 && maxVal < rawMinBudget) {
                            setErrors((prev) => ({
                              ...prev,
                              maxBudget: `Maximum budget cannot be lower than minimum budget (${formatCommaString(minBudget)} Credits).`,
                            }));
                          } else {
                            setErrors((prev) => {
                              const { maxBudget: _, ...r } = prev;
                              return r;
                            });
                          }
                        }}
                        className={`w-full h-12 rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                          errors.maxBudget
                            ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                            : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                    {errors.maxBudget && !isBudgetRangeInvalid && (
                      <p className="text-[11px] font-medium text-red-500 mt-1.5">{errors.maxBudget}</p>
                    )}
                  </div>
                </div>

                {/* Active Budget Range Warning Callout */}
                {isBudgetRangeInvalid && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Maximum budget cannot be lower than the minimum budget ({formatCommaString(minBudget)} Credits). Please raise the maximum cap.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Benchmark Note */}
            {(minBudget || maxBudget) && !isBudgetRangeInvalid && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 flex items-start gap-2.5 text-xs">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {budgetType === "open" ? "Open Bidding Benchmark" : "Target Budget Benchmark"}
                  </p>
                  <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
                    {budgetType === "open" ? (
                      <>Freelancers can submit proposals starting from <strong>{formatCommaString(minBudget)} Credits</strong>.</>
                    ) : (
                      <>Targeting <strong>{minBudget ? formatCommaString(minBudget) : "0"} &ndash; {maxBudget ? formatCommaString(maxBudget) : "0"} Credits</strong>.</>
                    )}
                    {positions > 1 && (
                      <span className="block mt-1 font-medium text-blue-600 dark:text-blue-400">
                        Divided across {positions} positions: approx.{" "}
                        {formatCommaString(String(Math.floor(parseInt(minBudget.replace(/\D/g, "") || "0") / positions)))}
                        {budgetType === "open" ? "+ credits min" : ` &ndash; ${formatCommaString(String(Math.floor(parseInt(maxBudget.replace(/\D/g, "") || "0") / positions)))} credits`}{" "}
                        per creator.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Set Application Window */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Set Application Window
                  </h3>
                  {(applicationWindowHours <= 24 || isUrgent) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 tracking-wide select-none">
                      Rush
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  How long this post accepts proposals before auto-closing.
                </p>
              </div>
            </div>

            {/* Presets Grid: Rush, Urgent, Quick, Standard, Extended */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {[
                { name: "Rush", time: "12 Hours", days: "Same-day", hours: 12 },
                { name: "Urgent", time: "24 Hours", days: "1 Day", hours: 24 },
                { name: "Quick", time: "3 Days", days: "72 Hours", hours: 72 },
                { name: "Standard", time: "7 Days", days: "1 Week", hours: 168 },
                { name: "Extended", time: "14 Days", days: "2 Weeks", hours: 336 },
              ].map((preset) => {
                const isSelected = applicationWindowHours === preset.hours;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setApplicationWindowHours?.(preset.hours);
                      setIsUrgent?.(preset.hours <= 24);
                      // application window selection only dictates application_deadline, not project completion deadline
                      if (!minTimeline && !maxTimeline) {
                        if (preset.hours <= 12) {
                          setMinTimeline("1");
                          setMaxTimeline("2");
                        } else if (preset.hours <= 24) {
                          setMinTimeline("1");
                          setMaxTimeline("3");
                        } else if (preset.hours <= 72) {
                          setMinTimeline("2");
                          setMaxTimeline("4");
                        } else if (preset.hours <= 168) {
                          setMinTimeline("3");
                          setMaxTimeline("5");
                        } else {
                          setMinTimeline("7");
                          setMaxTimeline("14");
                        }
                        setErrors((prev) => {
                          const { minTimeline: _, maxTimeline: __, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-500/15 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white dark:bg-dark-base/40 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <span className={`text-[11px] font-bold tracking-wide uppercase ${
                      isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-zinc-400"
                    }`}>
                      {preset.name}
                    </span>
                    <span className={`text-sm font-black whitespace-nowrap ${
                      isSelected ? "text-blue-700 dark:text-blue-200" : "text-gray-900 dark:text-white"
                    }`}>
                      {preset.time}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
                    }`}>
                      {preset.days}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Clean Gray Closing Indicator (No icon) */}
            <div className="rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">
              Intake closes: <strong className="text-gray-900 dark:text-zinc-200">{new Date(Date.now() + applicationWindowHours * 60 * 60 * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong> &bull; You will get 50% of the credits used on posting refunded if no one sends a proposal.
            </div>
          </div>

          {/* Step 3: Set Timeline (Project Working Turnaround (Upon Hire)) */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Set Timeline (Project Working Turnaround (Upon Hire)) <span className="text-red-500">*</span>
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  How many days the hired freelancer has to deliver work once the contract starts and escrow is funded.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isFixedBudget ? (
                <div className="space-y-1.5 max-w-sm">
                  <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                    Target Turnaround (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 3 Days"
                    min="1"
                    value={maxTimeline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxTimeline(val);
                      setMinTimeline(val);
                      setErrors((prev) => {
                        const { maxTimeline: _, minTimeline: __, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                      isTimelineExceedingDeadline
                        ? "border-amber-500 ring-2 ring-amber-500/20"
                        : errors.maxTimeline || errors.minTimeline
                        ? "border-red-500 ring-2 ring-red-500/20"
                        : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                      Estimated Turnaround Range (Days) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFitTurnaround}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-bold transition cursor-pointer shadow-xs active:scale-95"
                      title="Automatically calculate min and max turnaround days to fit within your application window and deadline, leaving a safe buffer period."
                    >
                      <RefreshCw className="h-3 w-3 text-blue-500" />
                      <span>Auto-Adjust with Buffer</span>
                    </button>
                  </div>

                  {/* 3 Clickable Presets stretched cleanly across */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: "Rush", range: "1 – 2 Days", min: "1", max: "2" },
                      { label: "Standard", range: "3 – 5 Days", min: "3", max: "5" },
                      { label: "Polished", range: "7 – 10 Days", min: "7", max: "10" },
                    ].map((preset) => {
                      const isActive = minTimeline === preset.min && maxTimeline === preset.max;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setMinTimeline(preset.min);
                            setMaxTimeline(preset.max);
                            setErrors((prev) => {
                              const { minTimeline: _, maxTimeline: __, ...rest } = prev;
                              return rest;
                            });
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isActive
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                              : "bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10"
                          }`}
                        >
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-gray-500 dark:text-zinc-400"}`} />
                          <span>{preset.label}</span>
                          <span className={`text-[10px] font-normal ${isActive ? "text-blue-100" : "text-gray-400 dark:text-zinc-500"}`}>
                            ({preset.range})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Min Days (e.g. 1)"
                        min="1"
                        value={minTimeline}
                        onChange={(e) => {
                          setMinTimeline(e.target.value);
                          setErrors((prev) => {
                            const { minTimeline: _, ...r } = prev;
                            return r;
                          });
                        }}
                        className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                          errors.minTimeline
                            ? "border-red-500 ring-2 ring-red-500/20"
                            : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Max Days (e.g. 3)"
                        min="1"
                        value={maxTimeline}
                        onChange={(e) => {
                          setMaxTimeline(e.target.value);
                          setErrors((prev) => {
                            const { maxTimeline: _, ...r } = prev;
                            return r;
                          });
                        }}
                        className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                          isTimelineExceedingDeadline
                            ? "border-amber-500 ring-2 ring-amber-500/20"
                            : errors.maxTimeline
                            ? "border-red-500 ring-2 ring-red-500/20"
                            : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Hard Calendar Completion Cutoff */}
              <div className="border-t border-gray-100 dark:border-white/5 pt-3 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={hasHardDeadline}
                    onChange={(e) => setHasHardDeadline?.(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition">
                      This project has a strict calendar completion cutoff (optional)
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Use this only if your project has a fixed real-world event date or broadcast screening deadline.
                    </p>
                  </div>
                </label>

                {hasHardDeadline && (
                  <div className="pl-7 pt-1 max-w-md space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        min={minCutoffDateString}
                        value={hardDeadline}
                        onChange={(e) => setHardDeadline?.(e.target.value)}
                        className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 px-4 py-2.5 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                          isCutoffBeforeIntake
                            ? "border-red-500 ring-2 ring-red-500/20"
                            : isTimelineExceedingDeadline
                            ? "border-amber-500 ring-2 ring-amber-500/20"
                            : "border-gray-300 dark:border-white/10"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAutoAdjustCutoff}
                        className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isCutoffBeforeIntake || isTimelineExceedingDeadline
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm ring-2 ring-blue-500/20"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-zinc-200"
                        }`}
                        title="Automatically adjust date to fit both Application Window and Turnaround"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Auto-Adjust</span>
                      </button>
                    </div>
                    {isCutoffBeforeIntake ? (
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        <span>⚠️ Cutoff (${hardDeadline}) is too early for intake + turnaround.</span>
                        <button
                          type="button"
                          onClick={handleAutoAdjustCutoff}
                          className="underline hover:text-red-700 dark:hover:text-red-300 font-bold shrink-0 cursor-pointer"
                        >
                          Auto-Fix Date
                        </button>
                      </div>
                    ) : isTimelineExceedingDeadline ? (
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <span>Turnaround exceeds hard calendar cutoff.</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAutoFitTurnaround}
                            className="underline hover:text-amber-700 dark:hover:text-amber-300 font-bold shrink-0 cursor-pointer"
                          >
                            Auto-Fit Turnaround
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={handleAutoAdjustCutoff}
                            className="underline hover:text-amber-700 dark:hover:text-amber-300 font-bold shrink-0 cursor-pointer"
                          >
                            Extend Cutoff Date
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Studio Sidebar (Skills, Positions, Live Summary Preview) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Step 4: Required Skills */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</div>
                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                  Required Skills <span className="text-red-500">*</span>
                </label>
              </div>
              <span className={`text-xs font-semibold ${skills.length >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-zinc-400"}`}>
                {skills.length}/6 Added {skills.length >= 3 ? "✓" : "(Min 3 req.)"}
              </span>
            </div>
            <SkillsAutocomplete
              skills={skills}
              setSkills={setSkills}
              error={errors.skills}
              maxSkills={6}
              hideHeader={true}
              jobTitle={title}
              jobDescription={description}
              jobCategory={category}
            />
          </div>

          {/* Card 2: Positions Needed / Assignment Slots */}
          {!hidePositions && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                    Positions Needed <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    {isLockedToSingle ? "Single creator assignment" : "Number of open creator slots"}
                  </p>
                </div>

                {isLockedToSingle ? (
                  <div className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold text-xs select-none">
                    1 Creator
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border border-gray-300 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-dark-base p-1">
                    <button
                      type="button"
                      disabled={positions <= effectiveMin}
                      onClick={() => setPositions((prev) => Math.max(effectiveMin, prev - 1))}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm text-gray-900 dark:text-white focus:outline-none transition-all ${
                        positions <= effectiveMin
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95"
                      }`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs select-none text-gray-900 dark:text-white">
                      {positions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPositions((prev) => prev + 1)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 3: Live Scope & Financial Summary (Clean Neutral Gray) */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3">
              <Calculator className="h-4 w-4 text-gray-500 dark:text-zinc-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Step 2 Overview</h4>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Budget Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Target Budget:</span>
                <span className={`font-bold ${isBudgetRangeInvalid ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                  {minBudget ? (
                    budgetType === "open" ? (
                      `From ${formatCommaString(minBudget)} Cr (Open)`
                    ) : (
                      `${formatCommaString(minBudget)} ~ ${maxBudget ? formatCommaString(maxBudget) : "0"} Cr`
                    )
                  ) : (
                    <span className="text-gray-400 italic">Unset</span>
                  )}
                </span>
              </div>

              {/* Positions / Contract Scope Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Awarded Scope:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  1 Project Workspace Contract
                </span>
              </div>

              {/* Timeline Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Duration:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {minTimeline && maxTimeline
                    ? `${minTimeline} – ${maxTimeline} Days`
                    : maxTimeline
                    ? `${maxTimeline} Days`
                    : <span className="text-gray-400 italic">Unset</span>}
                </span>
              </div>

              {/* Deadline Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Final Deadline:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {hasHardDeadline && hardDeadline ? `${hardDeadline} ${daysUntilDeadline !== null ? `(${daysUntilDeadline}d left)` : ""}` : <span className="text-gray-500 font-normal">Flexible</span>}
                </span>
              </div>

              {/* Skills Line */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                <span className="text-gray-500 dark:text-zinc-400">Target Skills:</span>
                <span className={`font-bold ${skills.length >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                  {skills.length} of 6 {skills.length >= 3 ? "(Ready)" : "(Min 3 req.)"}
                </span>
              </div>

              {/* Visual Project Lifecycle Bar (Progress Line with Legend) */}
              <div className="pt-3 border-t border-gray-200 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  <span>Project Schedule Map</span>
                  <span
                    className="text-red-500 dark:text-red-400 font-bold flex items-center gap-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    <span>DEADLINE</span>
                    {hasHardDeadline && hardDeadline ? (
                      <span className="text-red-600 dark:text-red-400 font-extrabold">
                        ({hardDeadline})
                      </span>
                    ) : (
                      <span className="text-gray-400 font-normal capitalize">
                        (Flexible)
                      </span>
                    )}
                  </span>
                </div>

                {/* The Sleek Segmented Bar with Buffer */}
                <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-gray-200 dark:bg-zinc-800 shadow-inner">
                  {/* Segment 1: Application Window (Gray) */}
                  <div
                    style={{ width: `${timelineProgressInfo.appPercent}%` }}
                    className="bg-gray-400 dark:bg-zinc-500 border-r border-white/60 dark:border-zinc-800 transition-all duration-300"
                    title={`Application Window: ${timelineProgressInfo.appLabel}`}
                  />

                  {/* Segment 2: Working Turnaround (Light Blue / Sky) */}
                  <div
                    style={{ width: `${timelineProgressInfo.turnPercent}%` }}
                    className={`bg-sky-400 dark:bg-sky-500 transition-all duration-300 ${
                      timelineProgressInfo.bufferPercent > 0 || (hasHardDeadline && hardDeadline) ? "border-r border-white/60 dark:border-zinc-800" : ""
                    }`}
                    title={`Working Turnaround: ${timelineProgressInfo.turnLabel}`}
                  />

                  {/* Segment 3: Empty Buffer Time before Deadline */}
                  {timelineProgressInfo.bufferPercent > 0 && (
                    <div
                      style={{ width: `${timelineProgressInfo.bufferPercent}%` }}
                      className="bg-zinc-200/70 dark:bg-zinc-700/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.06)_4px,rgba(0,0,0,0.06)_8px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.06)_4px,rgba(255,255,255,0.06)_8px)] transition-all duration-300"
                      title={`Buffer before Deadline: ${timelineProgressInfo.bufferLabel}`}
                    />
                  )}

                  {/* Terminal Point: Deadline */}
                  {hasHardDeadline && hardDeadline && (
                    <div
                      className="w-2 h-full bg-red-500 shrink-0"
                      title={`Final Cutoff Deadline: ${hardDeadline}`}
                    />
                  )}
                </div>

                {/* Legend Below the Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-zinc-500 shrink-0" />
                    <span className="text-gray-600 dark:text-zinc-400 font-medium">Application</span>
                    <span className="text-gray-900 dark:text-zinc-200 font-bold">({timelineProgressInfo.appLabel})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 dark:bg-sky-500 shrink-0" />
                    <span className="text-gray-600 dark:text-zinc-400 font-medium">Timeline</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">({timelineProgressInfo.turnLabel})</span>
                  </div>

                  {timelineProgressInfo.bufferPercent > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-dashed border-zinc-400 dark:border-zinc-500 bg-zinc-200/80 dark:bg-zinc-700/60 shrink-0" />
                      <span className="text-gray-500 dark:text-zinc-400 font-medium">Buffer</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-bold">({timelineProgressInfo.bufferLabel})</span>
                    </div>
                  )}

                  {/* Deadline as last part */}
                  <div
                    className="flex items-center gap-1.5 font-semibold text-red-500 dark:text-red-400"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ring-2 ring-red-500/20" />
                    <span>Deadline</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {hasHardDeadline && hardDeadline ? `(${hardDeadline})` : "(Flexible)"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Steps helper banner (Positioned below Step 2 Overview) */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-3.5 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            Follow the numbered steps <strong className="text-gray-700 dark:text-zinc-300">[1] to [4]</strong> to configure your project budget, intake window, turnaround, and skills.
          </div>

        </div>

      </div>

      {/* FULL-WIDTH ACTION FOOTER */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition text-sm focus:outline-none shadow-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>

        <button
          type="button"
          disabled={Boolean(isTimelineExceedingDeadline || isBudgetRangeInvalid)}
          onClick={() => {
            if (isTimelineExceedingDeadline || isBudgetRangeInvalid) return;
            onAdvance();
          }}
          title={
            isTimelineExceedingDeadline
              ? "Cannot continue: Project timeline exceeds the deadline"
              : isBudgetRangeInvalid
              ? "Cannot continue: Maximum budget cannot be lower than minimum budget"
              : undefined
          }
          className={`min-w-[220px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition focus:outline-none ${
            isTimelineExceedingDeadline || isBudgetRangeInvalid
              ? "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99]"
          }`}
        >
          Continue to Terms <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};

export default CreateBudgetSkills;
