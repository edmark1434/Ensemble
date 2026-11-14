import React, { useState } from "react";
import { Check, Edit2, HelpCircle, ShieldCheck, Star, Trash2, Trophy, X, Briefcase } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { getRatingTierTag } from "./RatingsSection_ProfileDisplay";
import { DEFAULT_MERIT, meritBandLabel, meritColor } from "@/lib/merit";

const MAX_BUDGET_CREDITS = 100000000;

interface RatingsBudgetSideSectionProps {
  loading?: boolean;
  isOwner?: boolean;
  meritScore?: number;
  avgRating?: number;
  totalReviews?: number;
  freelancerRating?: number;
  freelancerReviews?: number;
  budgetCredits?: number | null;
  onSaveBudget?: (budgetCredits: number | null) => Promise<void>;
}

const headerButtonClass =
  "p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-50 cursor-pointer";

export const RatingsBudgetSideSection_ProfileDisplay: React.FC<RatingsBudgetSideSectionProps> = ({
  loading,
  isOwner = false,
  meritScore,
  avgRating = 0,
  totalReviews = 0,
  freelancerRating = 0,
  freelancerReviews = 0,
  budgetCredits = null,
  onSaveBudget,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return <div className="h-44 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 animate-pulse" />;
  }

  const startEdit = () => {
    setDraft(budgetCredits !== null ? String(budgetCredits) : "");
    setError(null);
    setIsEditing(true);
  };

  const save = async (value: number | null) => {
    if (!onSaveBudget) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSaveBudget(value);
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save budget");
    } finally {
      setIsSaving(false);
    }
  };

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return save(null);
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_BUDGET_CREDITS) {
      setError(`Enter a whole number up to ${MAX_BUDGET_CREDITS.toLocaleString()}`);
      return;
    }
    return save(value);
  };

  const totalTier = getRatingTierTag(avgRating, totalReviews);
  const freelancerTier = getRatingTierTag(freelancerRating, freelancerReviews);
  const safeMerit = meritScore != null
    ? Math.min(Math.max(meritScore, 0), 100)
    : DEFAULT_MERIT;
  const ringColor = meritColor(safeMerit);
  const meritBand = meritBandLabel(safeMerit);

  return (
    <div 
      data-tour="profile-budget" 
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base/90 p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus_Jakarta_Sans',sans-serif] space-y-3 relative z-30"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2.5">
        <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
          Merit, Ratings &amp; Budget
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="relative group/help">
            <button className={`${headerButtonClass} cursor-help`}>
              <HelpCircle className="h-3 w-3" />
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_15px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover/help:opacity-100 group-hover/help:scale-100 z-[9999] text-left origin-left">
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-white dark:border-r-[#070913]" />
              <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[5px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
              <p className="text-[10px] text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
                Platform Merit starts at {DEFAULT_MERIT} and drops only while warnings are still active. Total Rating averages every review this user has received, while Freelance Rating averages reviews from work delivered on gigs and jobs. Budget is the planned credits budget for hiring or projects.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 1. PLATFORM MERIT SECTION */}
      <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 flex items-center gap-3.5 shadow-xs">
        {/* Circular Gauge on Left */}
        <div className="relative inline-flex items-center justify-center shrink-0 w-12 h-12 select-none">
          <svg width={48} height={48} className="-rotate-90">
            <circle
              cx={24}
              cy={24}
              r={19}
              className="stroke-gray-200 dark:stroke-white/10"
              strokeWidth={4.5}
              fill="none"
            />
            <circle
              cx={24}
              cy={24}
              r={19}
              className="transition-all duration-700 ease-out"
              style={{ stroke: ringColor }}
              strokeWidth={4.5}
              strokeDasharray={2 * Math.PI * 19}
              strokeDashoffset={2 * Math.PI * 19 - (safeMerit / 100) * (2 * Math.PI * 19)}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-tight"
            style={{ color: ringColor }}
          >
            {safeMerit}
          </span>
        </div>

        {/* Platform Merit Info on Right */}
        <div className="min-w-0 space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
            Platform Merit
          </span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-200">
              {meritBand}
            </span>
          </div>
        </div>
      </div>

      {/* 2. RATINGS SECTION */}
      <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            <Trophy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span>Total Rating</span>
          </div>

          {/* Unique Tier Tag */}
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${totalTier.badgeClass}`}>
            {totalTier.label}
          </span>
        </div>

        {/* Hero Rating Row */}
        <div className="flex items-baseline gap-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0 self-center" />
          <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
            {avgRating ? avgRating.toFixed(1) : "0.0"}
          </span>
          <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
            ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
          </span>
        </div>

        {/* Freelance Sub-Stat Pill Below */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] shadow-2xs">
          <Briefcase className="h-3 w-3 text-zinc-400 shrink-0" />
          <span className="text-gray-500 dark:text-zinc-400 font-medium">Freelance:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {freelancerRating ? freelancerRating.toFixed(1) : "0.0"}
          </span>
          <span className="text-gray-400 dark:text-zinc-500 font-medium">({freelancerReviews})</span>
        </div>
      </div>

      {/* 3. BUDGET SECTION */}
      {!isEditing ? (
        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
              Planned Budget
            </span>
            <div className="truncate">
              {budgetCredits !== null && Number(budgetCredits) > 0 ? (
                <div className="flex items-center gap-1.5" title={`${budgetCredits.toLocaleString()} credits`}>
                  <CreditIcon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {budgetCredits.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">Credits</span>
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400 dark:text-zinc-500 italic">
                  Not set
                </span>
              )}
            </div>
          </div>

          {isOwner && onSaveBudget && (
            <button
              type="button"
              onClick={startEdit}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-pointer group/btn shrink-0"
              title={budgetCredits !== null ? "Edit Planned Budget" : "Set Planned Budget"}
            >
              <Edit2 className="h-3 w-3 transition-transform duration-200 group-hover/btn:rotate-12" />
            </button>
          )}
        </div>
      ) : (
        /* Inline Budget Edit Box */
        <div className="p-3 rounded-xl bg-gray-50/90 dark:bg-zinc-900/90 border border-gray-300 dark:border-zinc-700 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
              <CreditIcon className="h-3.5 w-3.5 shrink-0" />
              Set Planned Budget
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Credits</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              inputMode="numeric"
              value={draft ? Number(draft).toLocaleString() : ""}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              placeholder="e.g. 5,000"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-zinc-500"
            />
            <button 
              onClick={() => void submit()} 
              disabled={isSaving} 
              className={`${headerButtonClass} text-emerald-600 dark:text-emerald-400`} 
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setIsEditing(false)} 
              disabled={isSaving} 
              className={headerButtonClass} 
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {budgetCredits !== null && (
              <button 
                onClick={() => void save(null)} 
                disabled={isSaving} 
                className={`${headerButtonClass} text-red-500`} 
                title="Remove budget"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
};
