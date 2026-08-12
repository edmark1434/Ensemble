import React, { type FormEvent } from "react";
import { ArrowRight, X, Plus, Minus } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";

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
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Job Required Skills <span className="text-red-500">*</span></label>
          <span className="text-[10px] text-gray-600 dark:text-zinc-400">{skills.length}/6 Added</span>
        </div>
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <input type="text" placeholder="e.g., Color Grading, Audio Sync" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
          <button type="submit" className="px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold hover:bg-white/20 transition text-gray-900 dark:text-white focus:outline-none">Add</button>
        </form>
        {errors.skills && <p className="text-[11px] text-red-400">{errors.skills}</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skills.map(s => (
            <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-zinc-300">
              {s} <X className="h-3 w-3 cursor-pointer hover:text-gray-900 dark:text-white transition-colors" onClick={() => handleRemoveSkill(s)} />
            </span>
          ))}
        </div>
      </div>

      {/* Fixed Currency Icon Budget Inputs */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">Budget Estimate Range <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
              <CreditIcon className="h-4 w-4" />
            </div>
            <input type="text" placeholder="Min Value" value={formatCommaString(minBudget)} onChange={e => { setMinBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {minBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            {errors.minBudget && <p className="text-[11px] text-red-400 mt-1">{errors.minBudget}</p>}
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-3 text-yellow-500 pointer-events-none">
              <CreditIcon className="h-4 w-4" />
            </div>
            <input type="text" placeholder="Max Value" value={formatCommaString(maxBudget)} onChange={e => { setMaxBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {maxBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            {errors.maxBudget && <p className="text-[11px] text-red-400 mt-1">{errors.maxBudget}</p>}
          </div>
        </div>
      </div>

      {/* Timelines Range */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">Project Timeline Range (Days) <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <input type="number" placeholder="Min Days" value={minTimeline} onChange={e => { setMinTimeline(e.target.value); setErrors(prev => { const {minTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.minTimeline ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            {errors.minTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.minTimeline}</p>}
          </div>
          <div>
            <input type="number" placeholder="Max Days" value={maxTimeline} onChange={e => { setMaxTimeline(e.target.value); setErrors(prev => { const {maxTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.maxTimeline ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
            {errors.maxTimeline && <p className="text-[11px] text-red-400 mt-1">{errors.maxTimeline}</p>}
          </div>
        </div>
      </div>

      {/* Positions Count Block */}
      <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
        <div>
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Positions Needed</label>
          <span className="text-[10px] text-gray-600 dark:text-zinc-400">Number of open assignment slots.</span>
        </div>
        <div className="flex items-center gap-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-[#080a12] p-1">
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