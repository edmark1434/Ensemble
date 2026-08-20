import React, { useState } from "react";
import { ArrowRight, Plus, Trash2, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GigTier, Milestone } from "../../gig_datasets";

interface CreateTiersProps {
  tiers: GigTier[];
  setTiers: React.Dispatch<React.SetStateAction<GigTier[]>>;
  additionalWorkRate: number;
  setAdditionalWorkRate: React.Dispatch<React.SetStateAction<number>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

const TIER_NAMES = ["Basic", "Standard", "Premium"];

export const CreateTiers: React.FC<CreateTiersProps> = ({
  tiers,
  setTiers,
  additionalWorkRate,
  setAdditionalWorkRate,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  const handleAddTier = () => {
    if (tiers.length >= 3) return;
    const nextTierName = TIER_NAMES[tiers.length];
    setTiers([...tiers, { tierName: nextTierName, title: "", description: "", daysOfDelivery: 1, revisions: 1, price: 100 }]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 2) return; // Min 2 tiers
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof GigTier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
    clearError(`tier_${index}_${field}`);
  };

  const clearError = (key: string) => {
    setErrors(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Pricing Tiers & Milestones</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Offer multiple packages to give buyers choices. Minimum 2 tiers required.</p>
      </div>

      {/* Tiers Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Service Tiers <span className="text-red-500">*</span></label>
          <span className="text-[10px] text-gray-600 dark:text-zinc-400">{tiers.length}/3 Tiers</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {tiers.map((tier, index) => (
              <motion.div
                key={`tier-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-wide">
                      {tier.tierName} Tier
                    </span>
                  </div>
                  {tiers.length > 2 && index === tiers.length - 1 && (
                    <button
                      onClick={() => handleRemoveTier(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove Tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Tier Title */}
                <div>
                  <input
                    type="text"
                    placeholder="Tier Title (e.g. Basic Edit)"
                    value={tier.title}
                    onChange={(e) => updateTier(index, "title", e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-dark-base shadow-sm dark:shadow-none px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none transition-all ${
                      errors[`tier_${index}_title`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <textarea
                    placeholder="Briefly describe what is included..."
                    value={tier.description}
                    onChange={(e) => updateTier(index, "description", e.target.value)}
                    className={`w-full h-20 rounded-xl border bg-white dark:bg-dark-base shadow-sm dark:shadow-none px-3 py-2 text-xs text-gray-900 dark:text-white outline-none transition-all resize-none ${
                      errors[`tier_${index}_description`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                </div>

                {/* Delivery & Revisions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">Delivery (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={tier.daysOfDelivery}
                      onChange={(e) => updateTier(index, "daysOfDelivery", parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base px-2 py-1.5 text-xs text-center text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">Revisions</label>
                    <input
                      type="number"
                      min="0"
                      value={tier.revisions}
                      onChange={(e) => updateTier(index, "revisions", parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base px-2 py-1.5 text-xs text-center text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="mt-auto pt-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      min="5"
                      value={tier.price}
                      onChange={(e) => updateTier(index, "price", parseInt(e.target.value) || 0)}
                      className={`w-full rounded-xl border bg-white dark:bg-dark-base shadow-sm dark:shadow-none pl-7 pr-3 py-2 text-sm font-black text-gray-900 dark:text-white outline-none transition-all ${
                        errors[`tier_${index}_price`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {tiers.length < 3 && (
          <button
            onClick={handleAddTier}
            className="w-full py-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
          >
            <Plus className="h-4 w-4" /> Add Premium Tier
          </button>
        )}
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-white/10" />

      {/* Additional Rate */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          ADDITIONAL WORK RATE <span className="text-red-500">*</span>
        </label>
        
        <div className="relative">
          <select
            value={additionalWorkRate}
            onChange={(e) => {
              setAdditionalWorkRate(parseInt(e.target.value) || 0);
              clearError("additionalWorkRate");
            }}
            className={`w-full appearance-none rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-10 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all cursor-pointer ${
              errors.additionalWorkRate ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50 hover:border-gray-300 dark:hover:border-white/20"
            }`}
          >
            <option value={10}>+10% per extra revision pass</option>
            <option value={15}>+15% per extra revision pass</option>
            <option value={20}>+20% per extra revision pass</option>
            <option value={25}>+25% per extra revision pass</option>
            <option value={30}>+30% per extra revision pass</option>
          </select>
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-sm">
            %
          </div>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        
        {errors.additionalWorkRate && <p className="text-[11px] text-red-400 mt-1">{errors.additionalWorkRate}</p>}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none">
          Go Back
        </button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Continue to Milestones <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateTiers;
