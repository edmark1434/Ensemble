import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AccountRecordSection } from "./AccountStanding";
import { Star, ShieldCheck, Trophy, Briefcase, Package, AlertCircle, X, ShieldAlert, User } from "lucide-react";

export type PublicProfileDispute = {
  id: string;
  number?: string | null;
  title?: string;
  type?: string;
  status?: string;
  updatedAt?: string | null;
  role?: "filed" | "respondent";
};

interface MeritSectionProps {
  loading?: boolean;
  meritScore?: number;
  avgRating?: number;
  totalReviews?: number;
  clientRating?: number;
  freelancerRating?: number;
  assetRating?: number;
  successfulJobsCount?: number;
  viewMode?: "merit" | "ratings" | "both";
  freelancerServiceRating?: number;
  freelancerServiceCount?: number;
  freelancerJobRating?: number;
  freelancerJobCount?: number;
  clientServiceRating?: number;
  clientServiceCount?: number;
  clientJobRating?: number;
  clientJobCount?: number;
  onNavigateToReviews?: (filter: "All" | "As Freelancer" | "As a Client" | "Asset Creation") => void;
  disputes?: PublicProfileDispute[];
  isOwner?: boolean;
}

function disputeStatusLabel(status?: string) {
  return String(status || "open")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function disputeWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const MeritSectionSkeleton: React.FC<{ viewMode?: "merit" | "ratings" | "both" }> = ({ viewMode = "both" }) => (
  <div className={`grid grid-cols-1 gap-4 animate-pulse ${viewMode === "both" ? "md:grid-cols-3" : "max-w-2xl mx-auto w-full"}`}>
    {(viewMode === "both" || viewMode === "merit") && (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-dark-elevated h-[88px]" />
    )}
    {(viewMode === "both" || viewMode === "ratings") && (
      <div className={`${viewMode === "both" ? "md:col-span-2" : ""} rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-dark-elevated h-[88px]`} />
    )}
  </div>
);

export const MeritSection_ProfileDisplay: React.FC<MeritSectionProps> = ({
  loading,
  meritScore,
  avgRating = 4.8,
  totalReviews = 47,
  clientRating = 4.9,
  freelancerRating = 4.7,
  assetRating = 5.0,
  successfulJobsCount = 24,
  viewMode = "both",
  freelancerServiceRating = 4.8,
  freelancerServiceCount = 12,
  freelancerJobRating = 4.6,
  freelancerJobCount = 8,
  clientServiceRating = 0,
  clientServiceCount = 0,
  clientJobRating = 5.0,
  clientJobCount = 3,
  onNavigateToReviews,
  disputes = [],
  isOwner,
}) => {
  const navigate = useNavigate();
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const publicDisputes = disputes || [];

  if (loading) return <MeritSectionSkeleton viewMode={viewMode} />;

  // Evaluates to safe percentage bounded between 0 and 100
  const safeScore = meritScore !== undefined && meritScore !== null ? Math.min(Math.max(meritScore, 0), 100) : 100;

  // Dynamic color: 100 = green, 50 = yellow-orange, 0 = red
  const getMeritColor = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    if (clamped <= 50) {
      // 0 -> Red (hue 0), 50 -> Yellow-Orange (hue 40)
      const hue = (clamped / 50) * 40;
      return `hsl(${hue}, 92%, 48%)`;
    } else {
      // 50 -> Yellow-Orange (hue 40), 100 -> Emerald Green (hue 142)
      const hue = 40 + ((clamped - 50) / 50) * (142 - 40);
      return `hsl(${hue}, 82%, 42%)`;
    }
  };

  const meritColor = getMeritColor(safeScore);

  return (
    <div className="font-['Plus_Jakarta_Sans',sans-serif] space-y-2">

      <div className={`grid grid-cols-1 gap-4 ${viewMode === "both" ? "md:grid-cols-3" : "w-full"}`}>

        {/* ==================== LEFT CARD: PERFORMANCE MERIT SCORE ==================== */}
        {(viewMode === "both" || viewMode === "merit") && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 flex flex-col justify-between shadow-xs transition-all duration-300 gap-4">
          
          {/* Card Body: Metric & Circular Progress Ring */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 pr-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Platform Merit
              </span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
                Accumulated performance total of <strong className="font-bold text-gray-900 dark:text-white font-mono">{totalReviews}</strong> verified {totalReviews === 1 ? 'review' : 'reviews'}.
              </p>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative inline-flex items-center justify-center shrink-0 w-[84px] h-[84px] select-none">
              <svg width={84} height={84} className="-rotate-90">
                <circle
                  cx={42}
                  cy={42}
                  r={35}
                  className="stroke-gray-200 dark:stroke-white/10"
                  strokeWidth={7}
                  fill="none"
                />
                <circle
                  cx={42}
                  cy={42}
                  r={35}
                  className="transition-all duration-700 ease-out"
                  style={{ stroke: meritColor }}
                  strokeWidth={7}
                  strokeDasharray={2 * Math.PI * 35}
                  strokeDashoffset={2 * Math.PI * 35 - (safeScore / 100) * (2 * Math.PI * 35)}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-lg font-bold font-mono tracking-tight"
                style={{ color: meritColor }}
              >
                {safeScore}%
              </span>
            </div>
          </div>

          {/* Action Buttons: Owner Record & Dispute History or Public Disputes */}
          {isOwner ? (
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(true)}
                className="flex items-center justify-center py-2 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-white/20 active:scale-[0.98] cursor-pointer"
                title="View your account standing and moderation record"
              >
                Record
              </button>
              <button
                type="button"
                onClick={() => navigate('/contracts/disputes')}
                className="flex items-center justify-center py-2 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-white/20 active:scale-[0.98] cursor-pointer"
                title="View your dispute history"
              >
                Dispute History
              </button>
            </div>
          ) : (
            publicDisputes.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Disputes ({publicDisputes.length})</span>
                </button>
              </div>
            )
          )}

        </div>
        )}

        {/* ==================== RIGHT CARD: RATING BREAKDOWN TABLE ==================== */}
        {(viewMode === "both" || viewMode === "ratings") && (
        <div className={`${viewMode === "both" ? "md:col-span-2" : ""} flex flex-col gap-4`}>
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 backdrop-blur-md text-gray-800 dark:text-zinc-300 shadow-xl flex flex-col justify-between transition-all duration-300 p-5 gap-4">
            <div className="text-xs space-y-3.5 w-full">
              
              {/* Table Header */}
              <div className="flex justify-end gap-4 sm:gap-6 mb-2 border-b border-gray-200 dark:border-white/5 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                <div className="w-16 sm:w-20 text-center">Total Rating</div>
                <div className="w-16 sm:w-20 text-center">Rating</div>
                <div className="w-12 sm:w-16 text-right">Amount</div>
              </div>

              {/* As a Freelancer Section */}
              <div className="pt-0.5 space-y-2.5">
                <div 
                  className={`flex items-center justify-between ${onNavigateToReviews ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg -mx-2 px-2 py-1 transition-colors" : ""}`}
                  onClick={() => onNavigateToReviews?.("As Freelancer")}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-zinc-400" />
                    <span className="font-bold text-gray-900 dark:text-zinc-100">As a Freelancer</span>
                  </div>
                  <div className="flex justify-end gap-4 sm:gap-6 items-center">
                    <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold text-gray-900 dark:text-white">{freelancerRating.toFixed(1)}</span>
                    </div>
                    <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                    <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-500 font-mono">({freelancerServiceCount + freelancerJobCount})</div>
                  </div>
                </div>

                {viewMode !== "merit" && (
                  <div className="border-l border-gray-200 dark:border-white/10 ml-2 space-y-2.5 animate-fadeIn">
                    {/* Service Rating */}
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-gray-600 dark:text-zinc-500">Service Rating</span>
                      <div className="flex justify-end gap-4 sm:gap-6 items-center">
                        <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                        <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-400/70">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-gray-700 dark:text-zinc-400">{freelancerServiceRating.toFixed(1)}</span>
                        </div>
                        <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-600 font-mono text-[10px]">({freelancerServiceCount})</div>
                      </div>
                    </div>

                    {/* Job Execution Rating */}
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-gray-600 dark:text-zinc-500">Job Execution Rating</span>
                      <div className="flex justify-end gap-4 sm:gap-6 items-center">
                        <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                        <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-400/70">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-gray-700 dark:text-zinc-400">{freelancerJobRating.toFixed(1)}</span>
                        </div>
                        <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-600 font-mono text-[10px]">({freelancerJobCount})</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* As a Client Section */}
              <div className="pt-2 space-y-2.5">
                <div 
                  className={`flex items-center justify-between ${onNavigateToReviews ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg -mx-2 px-2 py-1 transition-colors" : ""}`}
                  onClick={() => onNavigateToReviews?.("As a Client")}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="font-bold text-gray-900 dark:text-zinc-100">As a Client</span>
                  </div>
                  <div className="flex justify-end gap-4 sm:gap-6 items-center">
                    <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold text-gray-900 dark:text-white">{clientRating.toFixed(1)}</span>
                    </div>
                    <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                    <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-500 font-mono">({clientServiceCount + clientJobCount})</div>
                  </div>
                </div>

                {viewMode !== "merit" && (
                  <div className="border-l border-gray-200 dark:border-white/10 ml-2 space-y-2.5 animate-fadeIn">
                    {/* Service Feedback Rating */}
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-gray-600 dark:text-zinc-500">Service Feedback Rating</span>
                      <div className="flex justify-end gap-4 sm:gap-6 items-center">
                        <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                        <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-400/70">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-gray-700 dark:text-zinc-400">{clientServiceRating.toFixed(1)}</span>
                        </div>
                        <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-600 font-mono text-[10px]">({clientServiceCount})</div>
                      </div>
                    </div>

                    {/* Job Feedback Rating */}
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-gray-600 dark:text-zinc-500">Job Feedback Rating</span>
                      <div className="flex justify-end gap-4 sm:gap-6 items-center">
                        <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                        <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-400/70">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-gray-700 dark:text-zinc-400">{clientJobRating.toFixed(1)}</span>
                        </div>
                        <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-600 font-mono text-[10px]">({clientJobCount})</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* As an Asset Creator Section */}
              <div className="pt-2 space-y-2.5">
                <div 
                  className={`flex items-center justify-between ${onNavigateToReviews ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg -mx-2 px-2 py-1 transition-colors" : ""}`}
                  onClick={() => onNavigateToReviews?.("Asset Creation")}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-zinc-400" />
                    <span className="font-bold text-gray-900 dark:text-zinc-100">As an Asset Creator</span>
                  </div>
                  <div className="flex justify-end gap-4 sm:gap-6 items-center">
                    <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold text-gray-900 dark:text-white">{assetRating.toFixed(1)}</span>
                    </div>
                    <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                    <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-500 font-mono">(0)</div>
                  </div>
                </div>

                {viewMode !== "merit" && (
                  <div className="border-l border-gray-200 dark:border-white/10 ml-2 space-y-2.5 animate-fadeIn">
                    {/* Uploaded Assets Rating */}
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-gray-600 dark:text-zinc-500">Uploaded Assets Rating</span>
                      <div className="flex justify-end gap-4 sm:gap-6 items-center">
                        <div className="w-16 sm:w-20 text-center text-gray-400/50">-</div>
                        <div className="w-16 sm:w-20 flex justify-center items-center gap-1.5 text-amber-400/70">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold text-gray-700 dark:text-zinc-400">0.0</span>
                        </div>
                        <div className="w-12 sm:w-16 text-right text-gray-500 dark:text-zinc-600 font-mono text-[10px]">(0)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-3 flex items-center justify-between animate-fadeIn shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-black text-gray-900 dark:text-white tracking-wide uppercase">Total Rating</span>
            </div>
            <div className="flex items-center gap-1.5 text-lg font-black text-amber-500 tracking-tight">
              <Star className="h-5 w-5 fill-current text-amber-500" />
              <span>{avgRating.toFixed(1)}</span>
            </div>
          </div>

        </div>
        )}
      </div>

      {/* ==================== SYSTEM POPUP OVERLAY MODAL: DISPUTE HISTORY ==================== */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn text-gray-900 dark:text-white">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-5 shadow-2xl space-y-4">

            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold tracking-tight">Public disputes</h3>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/5 text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Ticket ID</th>
                    <th className="pb-2">Classification</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/[0.03] text-gray-700 dark:text-zinc-300 font-mono">
                  {publicDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition">
                      <td className="py-2.5 font-bold text-blue-500 dark:text-blue-400">
                        <Link to={`/disputes/${dispute.id}`} className="hover:underline">
                          {dispute.number || "Dispute"}
                        </Link>
                      </td>
                      <td className="py-2.5 font-sans text-gray-600 dark:text-zinc-400">
                        {dispute.type || "General"}
                        <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-gray-400">
                          {dispute.role === "filed" ? "Filed by this account" : "Filed against this account"}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 dark:text-zinc-500">{disputeWhen(dispute.updatedAt)}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span className="bg-zinc-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[10px] font-medium">
                          {disputeStatusLabel(dispute.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-white/5">
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white text-xs font-semibold transition"
              >
                Close Registry
              </button>
            </div>

          </div>
        </div>
      )}
    
      {/* ==================== RECORD MODAL (OWNER ONLY) ==================== */}
      {isRecordModalOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  My Account Record
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Private account standing, warnings, and restrictions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 pr-1">
              <AccountRecordSection hideHeader />
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
