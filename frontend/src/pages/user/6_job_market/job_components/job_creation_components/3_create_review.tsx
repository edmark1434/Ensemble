import React, { useState } from "react";
import { Check, CircleDollarSign, User, Users, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const sampleUserTeams = [
  { id: "team-01", name: "Alpha Developers Lab" },
  { id: "team-02", name: "Nexus Design Studio" },
];

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
  setPostingAs: (val: "self" | "team") => void;
  selectedTeam: string;
  setSelectedTeam: (val: string) => void;
  skills: string[];
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  formatCommaString: (val: string) => string;
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}

const CustomDropdown: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  placeholder,
  error,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-xl border bg-[#0d0f1a] px-3.5 py-2.5 text-xs text-left transition-all ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <span className={value ? "text-white font-medium" : "text-zinc-500"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 4, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0f1a] p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
              >
                {options.map((opt) => {
                  const isSelected = value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onSelect(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};

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
  setPostingAs,
  selectedTeam,
  setSelectedTeam,
  skills,
  errors,
  setErrors,
  formatCommaString,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handlePublishClick = () => {
    if (postingAs === "team" && !selectedTeam) {
      setErrors((prev) => ({
        ...prev,
        selectedTeam: "Please select a studio team to post on behalf of.",
      }));
      return;
    }
    onSubmit();
  };

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-white mb-0.5">Review & Post</h2>
        <p className="text-xs text-zinc-400">Confirm parameters and select your posting identity before deploying.</p>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Core Specifications Box */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Core Specifications</span>
            <button type="button" onClick={() => onEditStep(1)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>

          <div className="flex items-start gap-3.5">
            {previewUrl && (
              <div className="h-20 w-20 shrink-0 aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                <img src={previewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{title || <span className="text-red-400 italic">No Title Given</span>}</h4>
              <p className="text-zinc-400 line-clamp-2 leading-relaxed text-[11px]">{description}</p>
              <div className="flex gap-4 pt-1 text-zinc-500 text-[10px]">
                <span>Category: <strong className="text-zinc-300">{category}</strong></span>
                <span>Competency Target: <strong className="text-zinc-300">{difficulty}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget & Scope Parameters */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">02. Budget Framework & Parameters</span>
            <button type="button" onClick={() => onEditStep(2)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>

          {/* ROW 1: Dedicated Budget Pool Range */}
          <div className="p-3 rounded-xl border border-yellow-500/10 bg-yellow-500/5 flex items-center justify-between">
            <span className="text-zinc-400 text-[11px] font-semibold">Budget Pool Range</span>
            <span className="text-sm font-extrabold text-yellow-500 flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4 shrink-0 text-yellow-500" />
              ₱{formatCommaString(minBudget)} ~ ₱{formatCommaString(maxBudget)}
            </span>
          </div>

          {/* ROW 2: Timeline Envelope & Positions Open */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-zinc-500 block mb-0.5 text-[10px]">Timeline Envelope</span>
              <span className="text-xs font-bold text-white font-mono">{minTimeline} - {maxTimeline} Days</span>
            </div>
            <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-zinc-500 block mb-0.5 text-[10px]">Positions Open</span>
              <span className="text-xs font-bold text-white font-mono">{positions} Slots</span>
            </div>
          </div>

          {/* Mandatory Skills */}
          <div className="pt-2 border-t border-white/5">
            <span className="text-zinc-500 block mb-1 text-[10px]">Target Mandatory Skills:</span>
            <div className="flex flex-wrap gap-1">
              {skills.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Posting Identity Selection (Moved to Review & Post Step, Defaults to Self) */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
          <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px] block border-b border-white/5 pb-2">03. Posting Identity</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setPostingAs("self");
                clearError("selectedTeam");
              }}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${postingAs === 'self' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
            >
              <div className={`p-2 rounded-lg border ${postingAs === 'self' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Individual (Self)</p>
                <p className="text-[10px] text-zinc-400">Post directly from your profile</p>
              </div>
            </div>

            <div
              onClick={() => setPostingAs("team")}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${postingAs === 'team' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
            >
              <div className={`p-2 rounded-lg border ${postingAs === 'team' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Shared Studio Team</p>
                <p className="text-[10px] text-zinc-400">Post on behalf of a team</p>
              </div>
            </div>
          </div>

          {postingAs === "team" && (
            <div className="pt-2">
              <CustomDropdown
                label="Select Studio Team"
                value={selectedTeam}
                options={sampleUserTeams.map((t) => t.name)}
                placeholder="Select Team..."
                error={errors.selectedTeam}
                onSelect={(val) => {
                  setSelectedTeam(val);
                  clearError("selectedTeam");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-xs focus:outline-none">Go Back</button>
        <button
          type="button"
          onClick={handlePublishClick}
          disabled={isSubmitting}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition focus:outline-none shadow-lg ${isSubmitting ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
        >
          {isSubmitting ? 'Submitting...' : 'Deploy Active Job Post'} <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateReview;