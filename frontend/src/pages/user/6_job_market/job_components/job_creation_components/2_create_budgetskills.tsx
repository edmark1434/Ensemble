import React, { type FormEvent } from "react";
import { ArrowRight, X, Plus, Minus, HelpCircle, Info } from "lucide-react";
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
  onBack,
  onAdvance,
}) => {
  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault();
    const cleanInput = skillInput.trim();
    if (!cleanInput) return;

    if (skills.length >= 6) {
      setErrors(prev => ({ ...prev, skills: "You can add a maximum of 6 skills." }));
      return;
    }
    if (skills.includes(cleanInput)) {
      setErrors(prev => ({ ...prev, skills: "This skill has already been added." }));
      return;
    }

    const updatedSkills = [...skills, cleanInput];
    setSkills(updatedSkills);
    setSkillInput("");

    if (updatedSkills.length >= 3) {
      setErrors(prev => {
        const { skills: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    if (updatedSkills.length < 3) {
      setErrors(prev => ({ ...prev, skills: `At least 3 skills are required (${3 - updatedSkills.length} more needed).` }));
    }
  };

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Budget Allocation & Requirements</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Establish operational metric scopes, timelines and targeted skill sets.</p>
      </div>

      {/* Skills Tags */}
      <SkillsAutocomplete 
        skills={skills} 
        setSkills={setSkills} 
        error={errors.skills} 
        maxSkills={6} 
      />

      {/* Fixed Currency Icon Budget Inputs */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">Budget Estimate Range <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
              <CreditIcon className="h-4 w-4" />
            </div>
            <input type="text" placeholder="Min Value" value={formatCommaString(minBudget)} onChange={e => { setMinBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {minBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
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
            <input type="text" placeholder="Max Value" value={formatCommaString(maxBudget)} onChange={e => { setMaxBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {maxBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            <div className="group absolute right-2.5 top-2.5 flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                The maximum credits you are willing to spend for this job.
              </div>
            </div>
            {errors.maxBudget && <p className="text-[11px] text-red-400 mt-1">{errors.maxBudget}</p>}
          </div>
        </div>
        {positions > 1 && minBudget && maxBudget && (
          <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1.5 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Budget per person: {formatCommaString(String(Math.floor(parseInt(minBudget.replace(/\D/g, "") || "0") / positions)))} - {formatCommaString(String(Math.floor(parseInt(maxBudget.replace(/\D/g, "") || "0") / positions)))} credits
          </p>
        )}
      </div>

      {/* Deadline Date */}
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
        <div className="relative">
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            value={deadline} 
            onChange={e => { 
              const newDate = e.target.value;
              setDeadline(newDate); 
              setErrors(prev => { const {deadline, maxTimeline, minTimeline, ...r} = prev; return r; }); 
              
              if (newDate) {
                // Calculate days from today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(newDate);
                const diffTime = selected.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 1) {
                  // 1 day allowance logic
                  const maxAllowed = Math.max(1, diffDays - 1);
                  setMaxTimeline(String(maxAllowed));
                  setMinTimeline(String(Math.max(1, maxAllowed - 1)));
                } else if (diffDays === 0) {
                  setMaxTimeline("1");
                  setMinTimeline("1");
                }
              }
            }} 
            className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.deadline ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} 
          />
        </div>
        {errors.deadline && <p className="text-[11px] text-red-400">{errors.deadline}</p>}
        {deadline && (
          <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
            Setting deadline to {deadline} calculates a suggested timeline with a 1-day allowance. You can still adjust it below.
          </p>
        )}
      </div>

      {/* Timelines Range */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
          Project Timeline Range (Days) <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <input type="number" placeholder="Min Days" value={minTimeline} onChange={e => { setMinTimeline(e.target.value); setErrors(prev => { const {minTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-3.5 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.minTimeline ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            <div className="group absolute right-2.5 top-2.5 flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                The minimum days expected to complete the project (e.g. 1 for a rush job).
              </div>
            </div>
            {errors.minTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.minTimeline}</p>}
          </div>
          <div className="relative">
            <input type="number" placeholder="Max Days" value={maxTimeline} onChange={e => { setMaxTimeline(e.target.value); setErrors(prev => { const {maxTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-3.5 pr-8 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.maxTimeline ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            <div className="group absolute right-2.5 top-2.5 flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                The absolute maximum days allowed to complete the project.
              </div>
            </div>
            {errors.maxTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.maxTimeline}</p>}
          </div>
        </div>
      </div>

      {/* Positions Count Block */}
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
          <span className="text-[10px] text-gray-600 dark:text-zinc-400">Number of open assignment slots.</span>
        </div>
        <div className="flex items-center gap-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-dark-base p-1">
          <button type="button" onClick={() => setPositions(prev => Math.max(1, prev - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Minus className="h-3 w-3" /></button>
          <span className="w-6 text-center font-mono font-bold text-xs select-none">{positions}</span>
          <button type="button" onClick={() => setPositions(prev => prev + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Plus className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs focus:outline-none">Go Back</button>
        <button type="button" onClick={onAdvance} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Confirm and Review <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateBudgetSkills;