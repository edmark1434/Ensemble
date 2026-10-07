import React from "react";
import { Plus, Trash2, ArrowRight, Clock, RefreshCcw, Layers, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";

export interface Milestone {
  id: string;
  name: string;
  description: string;
  hours: number | string;
  revisions: number | string;
  percentage?: number;
}

interface ProposalMilestonesProps {
  bidAmount: string;
  additionalWorkRate: number;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onBack: () => void;
  onAdvance: () => void;
  jobTimeline?: string;
}

export const ProposalMilestonesStep: React.FC<ProposalMilestonesProps> = ({
  bidAmount,
  additionalWorkRate,
  milestones,
  setMilestones,
  errors,
  setErrors,
  onBack,
  onAdvance,
  jobTimeline,
}) => {
  const totalBid = parseInt(bidAmount || "0");
  const count = milestones.length || 1;
  const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
  const isPercentageValid = totalPercentage === 100;
  // Compute average payout just for overage estimation
  const milestonePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(milestonePayout * (additionalWorkRate / 100));

  const maxDaysMatch = jobTimeline?.match(/-(\d+)\s*Days/i);
  const maxDays = maxDaysMatch ? parseInt(maxDaysMatch[1]) || 0 : 0;
  const maxHoursAllowed = maxDays * 24;
  const totalHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
  const isOverLimit = maxHoursAllowed > 0 && totalHours > maxHoursAllowed;

  React.useEffect(() => {
    if (errors.milestones) {
      const timer = setTimeout(() => {
        setErrors((prev) => {
          const { milestones, ...rest } = prev;
          return rest;
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [errors.milestones, setErrors]);

  const handleAddMilestone = () => {
    const nextNum = milestones.length + 1;
    const newM: Milestone = {
      id: `ms-${Date.now()}`,
      name: `Milestone ${nextNum}: Phase Deliverable`,
      description: "",
      hours: 10,
      revisions: 2,
      percentage: 0,
    };
    setMilestones((prev) => [...prev, newM]);
    setErrors((prev) => {
      const { milestones: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRemove = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdate = (id: string, field: keyof Milestone, val: any) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Milestone Breakdown</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Outline deliverables and revision limits for step-by-step client approval.</p>
      </div>

      {maxHoursAllowed > 0 && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${isOverLimit ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400'}`}>
           <div className="flex items-center gap-2">
             <Clock className="w-4 h-4" />
             <span>Total Hours Limit (from {jobTimeline})</span>
           </div>
           <span>{totalHours} / {maxHoursAllowed} hrs</span>
        </div>
      )}

      {/* Escrow Pool Preview Banner */}
      <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Total Escrow Bid</span>
          <div className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1">
            <CreditIcon className="h-4 w-4" /> {totalBid.toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Total Allocations (%)</span>
          <div className={`text-sm font-bold ${isPercentageValid ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {totalPercentage}% / 100%
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase">Overage Revision Fee</span>
          <div className="text-xs font-bold text-gray-700 dark:text-zinc-300">
            +{overageRateBonus.toLocaleString()} ({additionalWorkRate}%)
          </div>
        </div>
      </div>

      {errors.milestones && <p className="text-[11px] text-red-400">{errors.milestones}</p>}

      {/* Milestone Cards List */}
      <Reorder.Group axis="y" values={milestones} onReorder={setMilestones} className="space-y-4">
        {milestones.map((m, idx) => (
          <Reorder.Item key={m.id} value={m} className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing" />
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" /> Milestone {idx + 1} - <CreditIcon className="h-3 w-3 text-amber-500 dark:text-amber-400" /> {Math.floor(totalBid * ((Number(m.percentage) || 0) / 100)).toLocaleString()} Credits
                </span>
              </div>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-gray-500 dark:text-zinc-500 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Milestone Name (e.g., Initial Rough Cut & Audio Sync)"
                value={m.name}
                onChange={(e) => handleUpdate(m.id, "name", e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500/50"
              />
              <textarea
                rows={2}
                placeholder="Briefly describe what deliverables are included in this milestone..."
                value={m.description}
                onChange={(e) => handleUpdate(m.id, "description", e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 resize-y"
              />
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <CreditIcon className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Percentage %
                </label>
                <input
                  type="number"
                  value={m.percentage ?? ""}
                  onChange={(e) => handleUpdate(m.id, "percentage", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                  min={0}
                  max={100}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Hours
                </label>
                <input
                  type="number"
                  value={m.hours}
                  onChange={(e) => handleUpdate(m.id, "hours", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 text-gray-400 dark:text-zinc-500" /> Revisions
                </label>
                <input
                  type="number"
                  value={m.revisions}
                  onChange={(e) => handleUpdate(m.id, "revisions", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <button
        type="button"
        onClick={handleAddMilestone}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-blue-400 flex items-center justify-center gap-1.5 transition"
      >
        <Plus className="h-4 w-4" /> Add Another Milestone
      </button>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
        >
          Confirm Milestones & Review <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ProposalMilestonesStep;