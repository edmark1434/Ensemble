import React, { type FormEvent } from "react";
import { ArrowRight, X, Plus, Minus, HelpCircle, Info, Calendar, AlertCircle, Sparkles, Trash2 } from "lucide-react";
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
      setErrors(prev => {
        const { skills: _, ...rest } = prev;
        return rest;
      });
    }
  }, [skills.length, errors.skills, setErrors]);

  const daysUntilDeadline = React.useMemo(() => {
    if (!deadline) return null;
    const parts = deadline.split('-');
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

  const isTimelineExceedingDeadline = React.useMemo(() => {
    if (daysUntilDeadline === null) return false;
    if (!isNaN(maxTimelineNum) && maxTimelineNum > daysUntilDeadline) return true;
    if (!isNaN(minTimelineNum) && minTimelineNum > daysUntilDeadline) return true;
    return false;
  }, [daysUntilDeadline, maxTimelineNum, minTimelineNum]);

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Budget Allocation & Requirements</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Establish operational metric scopes, timelines and targeted skill sets.</p>
      </div>

      {/* 1. Positions Count Block */}
      {!hidePositions && (
        <>
          <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Positions Needed <span className="text-red-500">*</span></label>
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                    The number of freelancers you want to hire for this specific job post.
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-zinc-400">
                {isLockedToSingle ? "Individual hire (1 assignment slot)." : "Number of open assignment slots."}
              </span>
            </div>
            {isLockedToSingle ? (
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs select-none">
                1 Position (Individual)
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-dark-base p-1">
                <button
                  type="button"
                  disabled={positions <= effectiveMin}
                  onClick={() => setPositions(prev => Math.max(effectiveMin, prev - 1))}
                  className={`h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none transition-all ${
                    positions <= effectiveMin
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95"
                  }`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center font-mono font-bold text-xs select-none">{positions}</span>
                <button
                  type="button"
                  onClick={() => setPositions(prev => prev + 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-100 dark:border-white/5" />
        </>
      )}

      {/* 2. Budget Estimate Range or Fixed Project Budget */}
      <div className="space-y-1.5">
        {isFixedBudget ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                Total Project Budget <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Fixed Allocation
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-2">
              The total credits to be distributed across milestone roles in Step 4. No freelancer bidding is required.
            </p>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
                <CreditIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. 1,000"
                value={formatCommaString(maxBudget || minBudget)}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "");
                  setMinBudget(val);
                  setMaxBudget(val);
                  setErrors(prev => {
                    const { minBudget: _a, maxBudget: _b, ...r } = prev;
                    return r;
                  });
                }}
                className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                  errors.minBudget || errors.maxBudget
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                }`}
              />
            </div>
            {(errors.minBudget || errors.maxBudget) && (
              <p className="text-[11px] text-red-400 mt-1">{errors.minBudget || errors.maxBudget}</p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                {budgetType === "open" ? "Starting Minimum Bid" : "Budget Estimate Range"} <span className="text-red-500">*</span>
              </label>

              {setBudgetType && (
                <div className="flex items-center p-0.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-[11px] font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType("range");
                      setErrors(prev => {
                        const { maxBudget: _, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`px-3 py-1 rounded-lg transition-all ${
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
                      setErrors(prev => {
                        const { maxBudget: _, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      budgetType === "open"
                        ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Open Bid (Min Only)</span>
                  </button>
                </div>
              )}
            </div>

            {budgetType === "open" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
                    <CreditIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Starting Minimum Bid (e.g. 500)"
                    value={formatCommaString(minBudget)}
                    onChange={e => {
                      setMinBudget(e.target.value.replace(/\D/g, ""));
                      setErrors(prev => {
                        const { minBudget: _, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                      errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                  <div className="group absolute right-2.5 top-2.5 flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                      The minimum starting bid you expect applicants to bid from.
                    </div>
                  </div>
                  {errors.minBudget && <p className="text-[11px] text-red-400 mt-1">{errors.minBudget}</p>}
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] text-xs text-gray-600 dark:text-zinc-300">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>No Maximum Ceiling:</strong> Freelancers can submit competitive open bids at or above your starting minimum.
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
                    <CreditIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Min Value"
                    value={formatCommaString(minBudget)}
                    onChange={e => {
                      setMinBudget(e.target.value.replace(/\D/g, ""));
                      setErrors(prev => {
                        const { minBudget, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                      errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                  <div className="group absolute right-2.5 top-2.5 flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                      The minimum credits you are willing to spend for this job.
                    </div>
                  </div>
                  {errors.minBudget && <p className="text-[11px] text-red-400 mt-1">{errors.minBudget}</p>}
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
                    <CreditIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Max Value"
                    value={formatCommaString(maxBudget)}
                    onChange={e => {
                      setMaxBudget(e.target.value.replace(/\D/g, ""));
                      setErrors(prev => {
                        const { maxBudget, ...r } = prev;
                        return r;
                      });
                    }}
                    className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                      errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                  <div className="group absolute right-2.5 top-2.5 flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                      The maximum credits you are willing to spend for this job.
                    </div>
                  </div>
                  {errors.maxBudget && <p className="text-[11px] text-red-400 mt-1">{errors.maxBudget}</p>}
                </div>
              </div>
            )}

            {(minBudget || maxBudget) && (
              <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
                <div className="flex items-start gap-2 text-gray-700 dark:text-zinc-300">
                  <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                  <div className="text-xs">
                    <span className="block font-medium mb-0.5 text-gray-900 dark:text-white">
                      {budgetType === "open" ? "Open Bidding Benchmark" : "Target Budget Benchmark"}
                    </span>
                    {budgetType === "open" ? (
                      <span>Starting from {minBudget ? formatCommaString(minBudget) : "0"} Credits (Open Bidding)</span>
                    ) : (
                      <span>{minBudget ? formatCommaString(minBudget) : "0"} - {maxBudget ? formatCommaString(maxBudget) : "0"} credits</span>
                    )}
                    {positions > 1 && (
                      <span className="block mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                        That's approx.{" "}
                        <strong className="text-gray-700 dark:text-gray-300">
                          {formatCommaString(String(Math.floor(parseInt(minBudget.replace(/\D/g, "") || "0") / positions)))}
                          {budgetType === "open" ? "+ credits min" : ` - ${formatCommaString(String(Math.floor(parseInt(maxBudget.replace(/\D/g, "") || "0") / positions)))} credits`}
                        </strong>{" "}
                        per person
                      </span>
                    )}
                    <span className="block mt-1.5 text-[10px] text-gray-500 dark:text-zinc-400">
                      {budgetType === "open"
                        ? "Freelancers will submit competitive bids starting from this amount. You can negotiate terms in chat before accepting."
                        : "Freelancers will use this benchmark to structure milestone bids. You can negotiate terms in chat before accepting."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-white/5" />

      {/* 3. Required Skills */}
      <SkillsAutocomplete 
        skills={skills} 
        setSkills={setSkills} 
        error={errors.skills} 
        maxSkills={6} 
      />

      <hr className="border-gray-100 dark:border-white/5" />

      {/* 4. Project Deadline & Timeline */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
              Project Deadline <span className="text-red-500">*</span>
            </label>
            <div className="group relative flex items-center">
              <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                Timeline is the expected duration of work, while Deadline is the strict final delivery date you actually need it by.
              </div>
            </div>
          </div>
          <div className={`relative flex items-center rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none transition-all overflow-hidden ${errors.deadline ? "border-red-500/50 focus-within:border-red-500" : "border-gray-200 dark:border-white/10 focus-within:border-blue-500/50"}`}>
            <input 
              id="project-deadline-input"
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              value={deadline} 
              onClick={(e) => {
                try {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker();
                  }
                } catch (err) {
                  // Ignore if showPicker is unsupported or throws
                }
              }}
              onKeyDown={(e) => {
                // Allow Tab for accessibility, but block all other typing
                if (e.key !== 'Tab') {
                  e.preventDefault();
                }
              }}
              onChange={e => { 
                const newDate = e.target.value;
                setDeadline(newDate); 
                setErrors(prev => { const {deadline, maxTimeline, minTimeline, ...r} = prev; return r; }); 
                
                if (newDate) {
                  const parts = newDate.split('-');
                  if (parts.length === 3 && parts[0].length === 4) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    
                    if (!isNaN(selected.getTime())) {
                      const diffTime = selected.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Auto-suggest timeline if timeline has not been set yet
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
              className="flex-1 cursor-pointer bg-transparent px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none [&::-webkit-calendar-picker-indicator]:hidden [color-scheme:light] dark:[color-scheme:dark]" 
            />
            <button
              type="button"
              onClick={() => {
                try {
                  const el = document.getElementById('project-deadline-input') as HTMLInputElement;
                  if (el && 'showPicker' in HTMLInputElement.prototype) {
                    el.showPicker();
                  }
                } catch (err) {}
              }}
              className="flex items-center justify-center border-l border-gray-200 dark:border-white/10 px-3.5 py-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
          {errors.deadline && <p className="text-[11px] text-red-400">{errors.deadline}</p>}
          {deadline && (
            <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 mt-1 gap-1">
              <span>
                Setting deadline to {deadline} calculates a suggested timeline with a 1-day allowance. You can still adjust it below.
              </span>
              {daysUntilDeadline !== null && daysUntilDeadline >= 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const maxAllowed = Math.max(1, daysUntilDeadline - 1);
                    setMaxTimeline(String(maxAllowed));
                    setMinTimeline(isFixedBudget ? String(maxAllowed) : String(Math.max(1, maxAllowed - 1)));
                    setErrors(prev => { const { maxTimeline, minTimeline, ...r } = prev; return r; });
                  }}
                  className="shrink-0 text-blue-500 hover:text-blue-600 dark:text-blue-400 font-semibold underline"
                >
                  Apply suggested ({Math.max(1, daysUntilDeadline - 1)} {Math.max(1, daysUntilDeadline - 1) === 1 ? 'day' : 'days'})
                </button>
              )}
            </div>
          )}
        </div>

        {isFixedBudget ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Project Timeline (Days) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="e.g. 3 Days"
                min="1"
                value={maxTimeline}
                onChange={e => {
                  const val = e.target.value;
                  setMaxTimeline(val);
                  setMinTimeline(val);
                  setErrors(prev => {
                    const { maxTimeline, minTimeline, ...r } = prev;
                    return r;
                  });
                }}
                className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-3.5 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                  isTimelineExceedingDeadline
                    ? "border-amber-500/80 focus:border-amber-500 dark:border-amber-400/80"
                    : errors.maxTimeline || errors.minTimeline
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                }`}
              />
              <div className="group absolute right-2.5 top-2.5 flex items-center">
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 hidden w-56 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2.5 py-1.5 text-left text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-50 pointer-events-none shadow-xl">
                  The expected timeline in days. Total hours (days × 24) will be distributed across milestone deliverables in Step 4.
                </div>
              </div>
            </div>
            {isTimelineExceedingDeadline && daysUntilDeadline !== null && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs mt-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-amber-700 dark:text-amber-300">
                    Project timeline exceeds deadline
                  </p>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
                    The project timeline ({maxTimelineNum} {maxTimelineNum === 1 ? 'day' : 'days'}) cannot be longer than the days until deadline ({daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'} away). Please adjust the timeline or extend the deadline.
                  </p>
                </div>
              </div>
            )}
            {!isTimelineExceedingDeadline && (errors.maxTimeline || errors.minTimeline) && (
              <p className="text-[11px] text-red-400 mt-1">{errors.maxTimeline || errors.minTimeline}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
              Project Timeline Range (Days) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Min Days"
                  min="1"
                  value={minTimeline}
                  onChange={e => {
                    setMinTimeline(e.target.value);
                    setErrors(prev => {
                      const { minTimeline, ...r } = prev;
                      return r;
                    });
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-3.5 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                    daysUntilDeadline !== null && !isNaN(minTimelineNum) && minTimelineNum > daysUntilDeadline
                      ? "border-amber-500/80 focus:border-amber-500 dark:border-amber-400/80"
                      : errors.minTimeline
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                  }`}
                />
                <div className="group absolute right-2.5 top-2.5 flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-50 pointer-events-none shadow-xl">
                    The minimum days expected to complete the project (e.g. 1 for a rush job).
                  </div>
                </div>
                {errors.minTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.minTimeline}</p>}
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Max Days"
                  min="1"
                  value={maxTimeline}
                  onChange={e => {
                    setMaxTimeline(e.target.value);
                    setErrors(prev => {
                      const { maxTimeline, ...r } = prev;
                      return r;
                    });
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-3.5 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                    daysUntilDeadline !== null && !isNaN(maxTimelineNum) && maxTimelineNum > daysUntilDeadline
                      ? "border-amber-500/80 focus:border-amber-500 dark:border-amber-400/80"
                      : errors.maxTimeline
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                  }`}
                />
                <div className="group absolute right-2.5 top-2.5 flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 hidden w-56 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2.5 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-50 pointer-events-none shadow-xl">
                    The absolute maximum days allowed to complete the project.
                  </div>
                </div>
                {errors.maxTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.maxTimeline}</p>}
              </div>
            </div>
            {isTimelineExceedingDeadline && daysUntilDeadline !== null && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs mt-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-amber-700 dark:text-amber-300">
                    Project timeline exceeds deadline
                  </p>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
                    {(!isNaN(maxTimelineNum) && maxTimelineNum > daysUntilDeadline)
                      ? `Maximum timeline (${maxTimelineNum} ${maxTimelineNum === 1 ? 'day' : 'days'}) cannot exceed the days until deadline (${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'} away).`
                      : `Minimum timeline (${minTimelineNum} ${minTimelineNum === 1 ? 'day' : 'days'}) cannot exceed the days until deadline (${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'} away).`
                    } Please adjust your timeline range or extend the deadline.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1.C: Milestone Pre-Scoping for Single-Hire Jobs */}
      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
              Pre-Scoped Milestones / Delivery Roadmap <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="group relative flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-56 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2.5 py-1.5 text-center text-[10px] text-gray-700 dark:text-gray-300 shadow-lg group-hover:block z-10 pointer-events-none">
                Pre-define the phases you expect so applicants can adopt or adjust them directly when proposing instead of inventing from scratch.
              </div>
            </div>
          </div>
          {setPreScopedMilestones && preScopedMilestones.length < 4 && (
            <button
              type="button"
              onClick={() => {
                const count = preScopedMilestones.length + 1;
                setPreScopedMilestones([
                  ...preScopedMilestones,
                  { title: count === 1 ? "Phase 1: Initial Draft / Prototype" : `Phase ${count}: Final Delivery & Polish`, budget_percentage: 50, duration_hours: 24 }
                ]);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus className="h-3 w-3" /> Add Phase
            </button>
          )}
        </div>

        {preScopedMilestones.length === 0 ? (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 italic">
            No pre-defined milestones. Applicants will propose their own milestone roadmap. Click "Add Phase" if you have a structured multi-phase expectation.
          </p>
        ) : (
          <div className="space-y-2">
            {preScopedMilestones.map((m, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 w-12 shrink-0">Phase {idx + 1}</span>
                <input
                  type="text"
                  placeholder="Phase name (e.g. Wireframe / Mockup)"
                  value={m.title}
                  onChange={(e) => {
                    const updated = [...preScopedMilestones];
                    updated[idx].title = e.target.value;
                    setPreScopedMilestones(updated);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 shrink-0">
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
                      className="w-14 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-1.5 py-1 text-center text-xs text-gray-900 dark:text-white"
                    />
                    <span>%</span>
                  </div>
                  {setPreScopedMilestones && (
                    <button
                      type="button"
                      onClick={() => setPreScopedMilestones(preScopedMilestones.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-auto sm:ml-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5 mt-2">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs focus:outline-none">Go Back</button>
        <button 
          type="button" 
          disabled={Boolean(isTimelineExceedingDeadline)}
          onClick={() => {
            if (isTimelineExceedingDeadline) return;
            onAdvance();
          }} 
          title={isTimelineExceedingDeadline ? "Cannot continue: Project timeline exceeds the deadline" : undefined}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition focus:outline-none ${
            isTimelineExceedingDeadline
              ? "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
              : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20"
          }`}
        >
          Continue to Terms <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateBudgetSkills;