import React from "react";
import { ArrowRight, Plus, X, GripVertical, HelpCircle } from "lucide-react";
import { Reorder } from "framer-motion";
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
    setMilestones([...milestones, { id: Date.now().toString(), name: "", description: "" }]);
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5 flex items-center gap-1.5">
          Project Milestones (Optional)
          <div className="group relative flex items-center cursor-help">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-center shadow-xl">
              Milestones allow you to break down large projects into smaller, manageable phases. It helps set clear expectations and ensures steady progress for both you and the client.
            </div>
          </div>
        </h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Break down large orders into phases to establish structured deliveries. Drag to reorder.</p>
      </div>

      <div className="space-y-0 max-w-2xl">
        {milestones.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-zinc-500 text-sm bg-gray-50 dark:bg-white/[0.02] mb-4">
            No milestones added. Click below to add phases to your project.
          </div>
        ) : (
          <Reorder.Group axis="y" values={milestones} onReorder={setMilestones} className="space-y-0">
            {milestones.map((milestone, idx) => (
              <Reorder.Item 
                key={milestone.id || idx} 
                value={milestone}
                className="relative flex gap-4 cursor-grab active:cursor-grabbing"
              >
                {/* Timeline Track */}
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-blue-200 dark:border-blue-500/30 z-10 pointer-events-none">
                    {idx + 1}
                  </div>
                  {/* Vertical Line */}
                  <div className="w-px h-full bg-gray-200 dark:bg-white/10 my-1 pointer-events-none" />
                </div>
                
                {/* Content Card */}
                <div className="flex-1 pb-6 pt-1 cursor-default">
                  <div className="relative p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none hover:border-gray-300 dark:hover:border-white/20 transition-all group">
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing p-1">
                        <GripVertical className="h-4 w-4 pointer-events-none" />
                      </div>
                      <button onClick={() => handleRemoveMilestone(idx)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-4 pb-3 border-b border-gray-100 dark:border-white/5 pointer-events-none">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Milestone {idx + 1}</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div onPointerDownCapture={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">Milestone Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Phase 1: Initial Draft"
                          value={milestone.name}
                          onChange={(e) => updateMilestone(idx, "name", e.target.value)}
                          className={\`w-full rounded-xl border bg-gray-50 dark:bg-dark-base shadow-sm dark:shadow-none px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all \${
                             errors[\`milestone_\${idx}_name\`] ? "border-red-500/50" : "border-gray-200 dark:border-white/10"
                          }\`}
                        />
                      </div>
                      <div onPointerDownCapture={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">Description <span className="text-red-500">*</span></label>
                        <textarea
                          placeholder="Deliver rough cut / core framework for initial feedback."
                          value={milestone.description}
                          onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                          className={\`w-full h-24 rounded-xl border bg-gray-50 dark:bg-dark-base shadow-sm dark:shadow-none px-4 py-3 text-xs text-gray-600 dark:text-zinc-300 outline-none focus:border-blue-500/50 transition-all resize-none \${
                             errors[\`milestone_\${idx}_desc\`] ? "border-red-500/50" : "border-gray-200 dark:border-white/10"
                          }\`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        <div className="relative flex gap-4 mt-2">
          <div className="flex flex-col items-center">
             <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center shrink-0">
               <Plus className="h-4 w-4 text-gray-400" />
             </div>
          </div>
          <div className="flex-1 flex items-center">
             <button onClick={handleAddMilestone} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition px-2 py-1">
               Add Another Milestone
             </button>
          </div>
        </div>
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
