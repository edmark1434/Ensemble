import React from "react";
import { Check, CircleDollarSign } from "lucide-react";

interface CreateReviewProps {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  previewUrl: string | null;
  minBudget: string;
  maxBudget: string;
  minTimeline: string;
  maxTimeline: string;
  positions: number;
  postingAs: "self" | "team";
  selectedTeam: string;
  skills: string[];
  formatCommaString: (val: string) => string;
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const CreateReview: React.FC<CreateReviewProps> = ({
  title,
  description,
  category,
  difficulty,
  previewUrl,
  minBudget,
  maxBudget,
  minTimeline,
  maxTimeline,
  positions,
  postingAs,
  selectedTeam,
  skills,
  formatCommaString,
  onEditStep,
  onBack,
  onSubmit,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Review Your Job Post</h2>
        <p className="text-xs text-zinc-400">Confirm matching baseline metrics are correct before casting parameters to freelancers.</p>
      </div>

      <div className="space-y-4 text-xs">
        {/* Core Specifications Box */}
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Core Specifications</span>
            <button type="button" onClick={() => onEditStep(1)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {previewUrl && (
              <div className="aspect-video rounded-xl overflow-hidden border border-white/10 max-h-24 sm:col-span-1">
                <img src={previewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="sm:col-span-2 space-y-1">
              <h4 className="text-sm font-bold text-white">{title || <span className="text-red-400 italic">No Title Given</span>}</h4>
              <p className="text-zinc-400 line-clamp-3 leading-relaxed text-[11px]">{description}</p>
              <div className="flex gap-4 pt-1.5 text-zinc-500">
                <span>Category: <strong className="text-zinc-300">{category}</strong></span>
                <span>Competency Target: <strong className="text-zinc-300">{difficulty}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget & Scope Parameters */}
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">02. Budget Framework & Parameters</span>
            <button type="button" onClick={() => onEditStep(2)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-zinc-500 block mb-0.5">Budget Pool Range</span>
              <span className="text-sm font-bold text-yellow-500 flex items-center gap-1">
                <CircleDollarSign className="h-4 w-4" />
                {formatCommaString(minBudget)} ~ {formatCommaString(maxBudget)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-0.5">Timeline Envelope</span>
              <span className="text-sm font-bold text-white font-mono">{minTimeline} - {maxTimeline} Days</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-0.5">Positions Open</span>
              <span className="text-sm font-bold text-white font-mono">{positions} Slots</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-0.5">Publish Entity Context</span>
              <span className="text-sm font-bold text-zinc-300">{postingAs === 'self' ? 'Personal Profile' : selectedTeam}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <span className="text-zinc-500 block mb-1.5">Target Mandatory Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {skills.map(s => (
                <span key={s} className="px-2.5 py-0.5 rounded-md bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[10px] font-semibold">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-white/5 flex gap-3">
        <button type="button" onClick={onBack} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm focus:outline-none">Go Back</button>
        <button type="button" onClick={onSubmit} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 focus:outline-none">
          <Check className="h-4 w-4" /> Deploy Active Job Post
        </button>
      </div>
    </div>
  );
};

export default CreateReview;