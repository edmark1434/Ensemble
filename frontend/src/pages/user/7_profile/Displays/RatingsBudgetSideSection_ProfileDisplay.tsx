import React, { useState } from "react";
import { Check, DollarSign, Edit2, HelpCircle, Star, Trash2, Trophy, X } from "lucide-react";

const MAX_BUDGET_CREDITS = 100000000;

interface RatingsBudgetSideSectionProps {
  loading?: boolean;
  isOwner?: boolean;
  avgRating?: number;
  totalReviews?: number;
  freelancerRating?: number;
  freelancerReviews?: number;
  budgetCredits?: number | null;
  onSaveBudget?: (budgetCredits: number | null) => Promise<void>;
}

const headerButtonClass =
  "p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-50";

export const RatingsBudgetSideSection_ProfileDisplay: React.FC<RatingsBudgetSideSectionProps> = ({
  loading,
  isOwner = false,
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
    return <div className="h-32 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 animate-pulse" />;
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

  const stat = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 py-1.5 text-center">
      <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 dark:text-zinc-500">
        {icon} {label}
      </span>
      <span className="max-w-full truncate text-xs">{value}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base/90 p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus Jakarta Sans',sans-serif] space-y-1 relative z-30">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Ratings &amp; Budget</h3>
        <div className="flex items-center gap-1.5">
          <div className="relative group/help">
            <button className={`${headerButtonClass} cursor-help`}>
              <HelpCircle className="h-3 w-3" />
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_15px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover/help:opacity-100 group-hover/help:scale-100 z-[9999] text-left origin-left">
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-white dark:border-r-[#070913]" />
              <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[5px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
              <p className="text-[10px] text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
                Total Rating averages every review this user has received, and Freelance Rating averages reviews from work they delivered on gigs and jobs. The number in brackets is how many reviews each is based on. Budget is the amount of credits this user plans to spend on projects; only the owner can change it.
              </p>
            </div>
          </div>
          {isOwner && onSaveBudget && !isEditing && (
            <button onClick={startEdit} className={headerButtonClass} title="Edit budget">
              <Edit2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/5 pt-2">
            {stat(
              <Trophy className="h-3 w-3" />,
              "Total",
              <>
                <Star className="mr-0.5 inline h-3 w-3 -mt-0.5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-gray-900 dark:text-white">{avgRating ? avgRating.toFixed(1) : "N/A"}</span>
                <span className="ml-0.5 text-[10px] text-gray-400 dark:text-zinc-500">({totalReviews})</span>
              </>
            )}
            {stat(
              <Star className="h-3 w-3" />,
              "Freelance",
              <>
                <Star className="mr-0.5 inline h-3 w-3 -mt-0.5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-gray-900 dark:text-white">{freelancerRating ? freelancerRating.toFixed(1) : "N/A"}</span>
                <span className="ml-0.5 text-[10px] text-gray-400 dark:text-zinc-500">({freelancerReviews})</span>
              </>
            )}
            {stat(
              <DollarSign className="h-3 w-3" />,
              "Budget",
              budgetCredits !== null ? (
                <span className="font-bold text-gray-900 dark:text-white" title={`${budgetCredits.toLocaleString()} credits`}>
                  {budgetCredits.toLocaleString()}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-zinc-500">Not set</span>
              )
            )}
          </div>

          {isEditing && (
            <div className="space-y-2 border-t border-gray-100 dark:border-white/5 pt-2 mt-1">
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
                  placeholder="Budget in credits"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <button onClick={() => void submit()} disabled={isSaving} className={`${headerButtonClass} text-emerald-600 dark:text-emerald-400`} title="Save">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isSaving} className={headerButtonClass} title="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
                {budgetCredits !== null && (
                  <button onClick={() => void save(null)} disabled={isSaving} className={`${headerButtonClass} text-red-500`} title="Remove budget">
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
