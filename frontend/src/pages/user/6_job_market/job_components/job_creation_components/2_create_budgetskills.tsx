import React, { type FormEvent } from "react";
import { ArrowRight, X, Plus, Minus, CircleDollarSign } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Budget Allocation & Requirements</h2>
        <p className="text-xs text-zinc-400">Establish operational metric scopes, timelines and targeted skill sets.</p>
      </div>

      {/* Skills Tags */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Required Skills <span className="text-red-500">*</span></label>
          <span className="text-[10px] text-zinc-500">{skills.length}/6 Added</span>
        </div>
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <input type="text" placeholder="e.g., Color Grading, Audio Sync" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all" />
          <button type="submit" className="px-5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/20 transition text-white focus:outline-none">Add</button>
        </form>
        {errors.skills && <p className="text-xs text-red-400">{errors.skills}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {skills.map(s => (
            <span key={s} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              {s} <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => handleRemoveSkill(s)} />
            </span>
          ))}
        </div>
      </div>

      {/* Budget Estimation Range */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Budget Estimate Range <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 select-none">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <input type="text" placeholder="Min Value" value={formatCommaString(minBudget)} onChange={e => { setMinBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {minBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 pl-10 pr-4 py-3 text-sm text-white outline-none transition-all ${errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
            {errors.minBudget && <p className="text-xs text-red-400 mt-1">{errors.minBudget}</p>}
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 select-none">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <input type="text" placeholder="Max Value" value={formatCommaString(maxBudget)} onChange={e => { setMaxBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {maxBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 pl-10 pr-4 py-3 text-sm text-white outline-none transition-all ${errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
            {errors.maxBudget && <p className="text-xs text-red-400 mt-1">{errors.maxBudget}</p>}
          </div>
        </div>
      </div>

      {/* Timelines Range */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Project Timeline Range (Days) <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input type="number" placeholder="Min Days" value={minTimeline} onChange={e => { setMinTimeline(e.target.value); setErrors(prev => { const {minTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all ${errors.minTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
            {errors.minTimeline && <p className="text-xs text-red-400 mt-1">{errors.minTimeline}</p>}
          </div>
          <div>
            <input type="number" placeholder="Max Days" value={maxTimeline} onChange={e => { setMaxTimeline(e.target.value); setErrors(prev => { const {maxTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all ${errors.maxTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
            {errors.maxTimeline && <p className="text-xs text-red-400 mt-1">{errors.maxTimeline}</p>}
          </div>
        </div>
      </div>

      {/* Positions Count Block */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div>
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Positions Needed</label>
          <span className="text-[10px] text-zinc-500">Number of open assignment slots.</span>
        </div>
        <div className="flex items-center gap-3 border border-white/10 rounded-xl bg-[#080a12] p-1.5">
          <button type="button" onClick={() => setPositions(prev => Math.max(1, prev - 1))} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white focus:outline-none"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-8 text-center font-mono font-bold text-sm select-none">{positions}</span>
          <button type="button" onClick={() => setPositions(prev => prev + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white focus:outline-none"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="pt-6 border-t border-white/5 flex gap-3">
        <button type="button" onClick={onBack} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm focus:outline-none">Go Back</button>
        <button type="button" onClick={onAdvance} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition focus:outline-none">
          Confirm and Review <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateBudgetSkills;