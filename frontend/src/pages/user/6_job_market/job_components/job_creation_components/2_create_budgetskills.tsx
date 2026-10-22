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
  Users
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
  hidePositions = false,
  budgetType = "range",
  setBudgetType,
  preScopedMilestones = [],
  setPreScopedMilestones,
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

  const isTimelineExceedingDeadline = React.useMemo(() => {
    if (daysUntilDeadline === null) return false;
    if (!isNaN(maxTimelineNum) && maxTimelineNum > daysUntilDeadline) return true;
    if (!isNaN(minTimelineNum) && minTimelineNum > daysUntilDeadline) return true;
    return false;
  }, [daysUntilDeadline, maxTimelineNum, minTimelineNum]);

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
                <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                  {isFixedBudget ? "Total Project Budget" : budgetType === "open" ? "Starting Minimum Bid" : "Budget Estimate Range"} <span className="text-red-500">*</span>
                </label>
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
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Open Bid</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inputs Area */}
            {isFixedBudget ? (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 pointer-events-none">
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
                  className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                    errors.minBudget || errors.maxBudget
                      ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                      : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {(errors.minBudget || errors.maxBudget) && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.minBudget || errors.maxBudget}</p>
                )}
              </div>
            ) : budgetType === "open" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 pointer-events-none">
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
                    className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                      errors.minBudget
                        ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                        : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                  {errors.minBudget && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.minBudget}</p>}
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 min-h-[46px] rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50/70 dark:bg-white/[0.02] text-gray-700 dark:text-zinc-300">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs leading-tight">
                    <span className="font-bold text-gray-900 dark:text-white block">No Upper Limit</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Proposals will quote flexible scopes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 pointer-events-none">
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
                      className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                        errors.minBudget
                          ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                          : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    {errors.minBudget && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.minBudget}</p>}
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 pointer-events-none">
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
                      className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm pl-11 pr-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                        errors.maxBudget
                          ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                          : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    {errors.maxBudget && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.maxBudget}</p>}
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
            {(minBudget || maxBudget) && (
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

          {/* Section 2: Project Schedule & Timeline (Side-by-Side Sub-Grid) */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 md:p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Schedule & Turnaround Time
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Timeline is the working duration, while Deadline is the final delivery cutoff date.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              
              {/* Project Deadline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                    Project Deadline <span className="text-red-500">*</span>
                  </label>
                  {daysUntilDeadline !== null && daysUntilDeadline >= 1 && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {daysUntilDeadline} {daysUntilDeadline === 1 ? "day" : "days"} away
                    </span>
                  )}
                </div>

                <div className={`relative flex items-center rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm transition-all overflow-hidden ${
                  errors.deadline 
                    ? "border-red-500 ring-2 ring-red-500/20" 
                    : "border-gray-300 dark:border-white/10 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
                }`}>
                  <input
                    id="project-deadline-input"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={deadline}
                    onClick={(e) => {
                      try {
                        if ("showPicker" in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        }
                      } catch (_) {}
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Tab") e.preventDefault();
                    }}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setDeadline(newDate);
                      setErrors((prev) => {
                        const { deadline: _, maxTimeline: __, minTimeline: ___, ...r } = prev;
                        return r;
                      });

                      if (newDate) {
                        const parts = newDate.split("-");
                        if (parts.length === 3 && parts[0].length === 4) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

                          if (!isNaN(selected.getTime())) {
                            const diffTime = selected.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (!maxTimeline && !minTimeline) {
                              if (diffDays >= 1) {
                                const maxAllowed = Math.max(1, diffDays - 1);
                                setMaxTimeline(String(maxAllowed));
                                setMinTimeline(String(Math.max(1, maxAllowed - 1)));
                              } else if (diffDays === 0) {
                                setMaxTimeline("1");
                                setMinTimeline("1");
                              }
                            }
                          }
                        }
                      }
                    }}
                    className="flex-1 cursor-pointer bg-transparent px-4 py-3 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white outline-none [&::-webkit-calendar-picker-indicator]:hidden [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const el = document.getElementById("project-deadline-input") as HTMLInputElement;
                        if (el && "showPicker" in HTMLInputElement.prototype) el.showPicker();
                      } catch (_) {}
                    }}
                    className="flex items-center justify-center border-l border-gray-200 dark:border-white/10 px-3.5 py-3 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
                {errors.deadline && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.deadline}</p>}

                {deadline && daysUntilDeadline !== null && daysUntilDeadline >= 1 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const maxAllowed = Math.max(1, daysUntilDeadline - 1);
                        setMaxTimeline(String(maxAllowed));
                        setMinTimeline(isFixedBudget ? String(maxAllowed) : String(Math.max(1, maxAllowed - 1)));
                        setErrors((prev) => {
                          const { maxTimeline: _, minTimeline: __, ...r } = prev;
                          return r;
                        });
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      &rarr; Apply suggested timeline ({Math.max(1, daysUntilDeadline - 1)} {Math.max(1, daysUntilDeadline - 1) === 1 ? "day" : "days"})
                    </button>
                  </div>
                )}
              </div>

              {/* Project Timeline Range */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                  {isFixedBudget ? "Timeline (Days)" : "Timeline Range (Days)"} <span className="text-red-500">*</span>
                </label>

                {isFixedBudget ? (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 5 Days"
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
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="number"
                      placeholder="Min Days"
                      min="1"
                      value={minTimeline}
                      onChange={(e) => {
                        setMinTimeline(e.target.value);
                        setErrors((prev) => {
                          const { minTimeline: _, ...r } = prev;
                          return r;
                        });
                      }}
                      className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-3.5 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                        daysUntilDeadline !== null && !isNaN(minTimelineNum) && minTimelineNum > daysUntilDeadline
                          ? "border-amber-500 ring-2 ring-amber-500/20"
                          : errors.minTimeline
                          ? "border-red-500 ring-2 ring-red-500/20"
                          : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Max Days"
                      min="1"
                      value={maxTimeline}
                      onChange={(e) => {
                        setMaxTimeline(e.target.value);
                        setErrors((prev) => {
                          const { maxTimeline: _, ...r } = prev;
                          return r;
                        });
                      }}
                      className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-3.5 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
                        daysUntilDeadline !== null && !isNaN(maxTimelineNum) && maxTimelineNum > daysUntilDeadline
                          ? "border-amber-500 ring-2 ring-amber-500/20"
                          : errors.maxTimeline
                          ? "border-red-500 ring-2 ring-red-500/20"
                          : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>
                )}

                {(errors.minTimeline || errors.maxTimeline) && !isTimelineExceedingDeadline && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.minTimeline || errors.maxTimeline}</p>
                )}
              </div>

            </div>

            {/* Exceeding Warning */}
            {isTimelineExceedingDeadline && daysUntilDeadline !== null && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-bold">Timeline exceeds final deadline</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    The requested timeline ({maxTimelineNum || minTimelineNum} days) cannot exceed the days until deadline ({daysUntilDeadline} days away). Please adjust your timeline or extend the cutoff date.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Pre-Scoped Milestones / Delivery Roadmap (Optional) */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                  Pre-Scoped Milestones / Delivery Roadmap <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Pre-define phases to guide applicants when proposing deliverables and payment schedules.
                </p>
              </div>

              {setPreScopedMilestones && preScopedMilestones.length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const count = preScopedMilestones.length + 1;
                    setPreScopedMilestones([
                      ...preScopedMilestones,
                      {
                        title: count === 1 ? "Phase 1: Initial Rough Cut / Assembly" : `Phase ${count}: Color Grade & Final Polish`,
                        budget_percentage: 50,
                        duration_hours: 24,
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Phase
                </button>
              )}
            </div>

            {preScopedMilestones.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic">
                No pre-defined milestones. Applicants will propose their own milestone roadmap. Click &ldquo;Add Phase&rdquo; if you have specific phased delivery expectations.
              </p>
            ) : (
              <div className="space-y-2.5">
                {preScopedMilestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02]"
                  >
                    <span className="flex items-center justify-center px-2 py-1 rounded-lg bg-gray-200 dark:bg-white/10 text-[10px] font-bold text-gray-700 dark:text-zinc-300 shrink-0">
                      Phase {idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="e.g., Rough Cut & Audio Sync"
                      value={m.title}
                      onChange={(e) => {
                        const updated = [...preScopedMilestones];
                        updated[idx].title = e.target.value;
                        setPreScopedMilestones(updated);
                      }}
                      className="flex-1 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/60 px-3.5 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-400 shrink-0">
                        <span>Allocation:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={m.budget_percentage}
                          onChange={(e) => {
                            const updated = [...preScopedMilestones];
                            updated[idx].budget_percentage = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
                            setPreScopedMilestones(updated);
                          }}
                          className="w-16 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/60 px-2 py-1.5 text-center text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                        <span>%</span>
                      </div>
                      {setPreScopedMilestones && (
                        <button
                          type="button"
                          onClick={() => setPreScopedMilestones(preScopedMilestones.filter((_, i) => i !== idx))}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Remove Phase"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Sticky Studio Sidebar (Skills, Positions, Live Summary Preview) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Card 1: Required Skills */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3">
            <SkillsAutocomplete
              skills={skills}
              setSkills={setSkills}
              error={errors.skills}
              maxSkills={6}
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

              {/* Positions Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Hires Needed:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {positions} {positions === 1 ? "Creator (Individual)" : "Creators"}
                </span>
              </div>

              {/* Timeline Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Duration:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {minTimeline && maxTimeline
                    ? `${minTimeline} &ndash; ${maxTimeline} Days`
                    : maxTimeline
                    ? `${maxTimeline} Days`
                    : <span className="text-gray-400 italic">Unset</span>}
                </span>
              </div>

              {/* Deadline Line */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Final Deadline:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {deadline ? (
                    `${deadline} ${daysUntilDeadline !== null ? `(${daysUntilDeadline}d left)` : ""}`
                  ) : (
                    <span className="text-gray-400 italic">Unset</span>
                  )}
                </span>
              </div>

              {/* Skills Line */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                <span className="text-gray-500 dark:text-zinc-400">Target Skills:</span>
                <span className={`font-bold ${skills.length >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                  {skills.length} of 6 {skills.length >= 3 ? "(Ready)" : "(Min 3 req.)"}
                </span>
              </div>

            </div>
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
