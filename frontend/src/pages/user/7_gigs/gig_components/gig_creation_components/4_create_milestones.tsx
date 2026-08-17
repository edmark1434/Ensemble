import React from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import type { Milestone } from "../../gig_datasets";

interface CreateMilestonesProps {
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

export const CreateMilestones: React.FC<CreateMilestonesProps> = ({
  milestones,
  setMilestones,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  const handleAddMilestone = () => {
    setMilestones([...milestones, { name: "", description: "", amount: 0 }]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Project Milestones (Optional)</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Break down large orders into phases to establish structured deliveries.</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {milestones.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-zinc-500 text-sm bg-gray-50 dark:bg-white/[0.02]">
            No milestones added. Click below to add phases to your project.
          </div>
        ) : (
          milestones.map((milestone, idx) => (
            <div key={idx} className="relative p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col gap-3 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Milestone {idx + 1}</span>
                <button onClick={() => handleRemoveMilestone(idx)} className="text-red-400 hover:text-red-500 transition-colors p-1 bg-red-50 dark:bg-red-500/10 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">Milestone Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rough Cut Delivery"
                  value={milestone.name}
                  onChange={(e) => updateMilestone(idx, "name", e.target.value)}
                  className={`w-full rounded-xl border bg-white dark:bg-dark-base shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all ${
                     errors[`milestone_${idx}_name`] ? "border-red-500/50" : "border-gray-200 dark:border-white/10"
                  }`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  placeholder="Briefly describe the deliverables for this milestone..."
                  value={milestone.description}
                  onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                  className={`w-full h-20 rounded-xl border bg-white dark:bg-dark-base shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all resize-none ${
                     errors[`milestone_${idx}_desc`] ? "border-red-500/50" : "border-gray-200 dark:border-white/10"
                  }`}
                />
              </div>
            </div>
          ))
        )}

        <button
          onClick={handleAddMilestone}
          className="w-full py-3.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
        >
          <Plus className="h-4 w-4" /> Add Milestone
        </button>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none">
          Go Back
        </button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Continue to Forms <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateMilestones;
