import { CreditIcon } from "@/components/ui/credit-icon";
import React, { useState } from "react";
import { ArrowRight, Plus, Minus, Trash2, ChevronDown, Check, HelpCircle, CheckCircle2 } from "lucide-react";
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
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            Service Tiers <span className="text-red-500">*</span>
            <div className="group relative flex items-center cursor-help">
              <HelpCircle className="h-3 w-3 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-center shadow-xl">
                Create multiple pricing packages. Each higher tier must have a greater price than the previous one.
              </div>
            </div>
          </label>
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
                    maxLength={120}
                    placeholder="Tier Title (e.g. Basic Edit)"
                    value={tier.title}
                    onChange={(e) => updateTier(index, "title", e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none transition-all ${
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
                    className={`w-full h-20 rounded-xl border bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none px-3 py-2 text-xs text-gray-900 dark:text-white outline-none transition-all resize-none ${
                      errors[`tier_${index}_description`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                </div>

                {/* Delivery & Revisions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">Delivery (Days)</label>
                    <div className="flex items-center justify-between border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-zinc-900 p-1">
                      <button type="button" onClick={() => updateTier(index, "daysOfDelivery", Math.max(1, tier.daysOfDelivery - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center font-mono font-bold text-xs select-none text-gray-900 dark:text-white">{tier.daysOfDelivery}</span>
                      <button type="button" onClick={() => updateTier(index, "daysOfDelivery", tier.daysOfDelivery + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1 block">Revisions</label>
                    <div className="flex items-center justify-between border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-zinc-900 p-1">
                      <button type="button" onClick={() => updateTier(index, "revisions", Math.max(0, tier.revisions - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center font-mono font-bold text-xs select-none text-gray-900 dark:text-white">{tier.revisions}</span>
                      <button type="button" onClick={() => updateTier(index, "revisions", tier.revisions + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none hover:bg-gray-100 dark:hover:bg-white/10 transition"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-auto pt-2">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2"><CreditIcon className="h-4 w-4 text-yellow-500" /></div>
                    <input
                      type="number"
                      min="5"
                      value={tier.price || ""}
                      onChange={(e) => updateTier(index, "price", parseInt(e.target.value) || 0)}
                      className={`w-full rounded-xl border bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none pl-9 pr-3 py-2 text-sm font-black text-gray-900 dark:text-white outline-none transition-all ${
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
          <div className="group relative ml-1 flex items-center cursor-help">
            <HelpCircle className="h-3 w-3 text-gray-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-center shadow-xl">
              This percentage determines how much you will charge the buyer for any additional revisions beyond their tier's limit.
            </div>
          </div>
        </label>
        
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-1">
          {[10, 15, 20, 25, 30, 40, 50].map((rate) => {
            const isSelected = additionalWorkRate === rate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  setAdditionalWorkRate(rate);
                  clearError("additionalWorkRate");
                }}
                className={`relative flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                  isSelected 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle2 className="h-3 w-3 fill-white text-blue-600" />
                  </div>
                )}
                <span className="text-sm font-black">+{rate}%</span>
                <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-zinc-500'}`}>per extra</span>
              </button>
            );
          })}
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
