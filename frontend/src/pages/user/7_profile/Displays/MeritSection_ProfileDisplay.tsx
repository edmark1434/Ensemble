import React, { useState } from "react";
import { Star, ShieldCheck, Trophy, Briefcase, Package, ChevronDown, ChevronUp, AlertCircle, X, ShieldAlert, User } from "lucide-react";

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
}

const mockDisputes = [
  { id: "DSP-9041", type: "Asset Licensing", status: "Resolved", date: "2026-03-14", outcome: "In Favor of User" },
  { id: "DSP-8832", type: "Milestone Delivery", status: "Resolved", date: "2025-11-02", outcome: "Mutually Settled" }
];

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
  freelancerRating = 4.8,
  assetRating = 4.7,
  successfulJobsCount = 86,
  viewMode = "both",
  freelancerServiceRating = 0.0,
  freelancerServiceCount = 0,
  freelancerJobRating = 0.0,
  freelancerJobCount = 0,
  clientServiceRating = 0.0,
  clientServiceCount = 0,
  clientJobRating = 0.0,
  clientJobCount = 0,
}) => {
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  if (loading) return <MeritSectionSkeleton viewMode={viewMode} />;

  // Hardcoded Fallback Logic: Evaluates to 100 if incoming data is 0, null, or undefined
  const safeScore = meritScore ? Math.min(Math.max(meritScore, 0), 100) : 100;
  // tarunga lang ni ed na default jud 100

  // Dynamic HP Bar System: Calculates Hue angle (0 = Red, 60 = Yellow, 120 = Green)
  const hue = (safeScore / 100) * 120;
  const hpColor = `hsl(${hue}, 85%, 55%)`;
  const hpGlow = `0 0 12px hsl(${hue}, 85%, 55%, 0.4)`;

  return (
    <div className="font-['Plus Jakarta Sans',sans-serif] space-y-2">

      <div className={`grid grid-cols-1 gap-4 ${viewMode === "both" ? "md:grid-cols-3" : "w-full"}`}>

        {/* ==================== LEFT CARD: PERFORMANCE MERIT SCORE ==================== */}
        {(viewMode === "both" || viewMode === "merit") && (
        <div className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white dark:from-white/[0.03] to-transparent relative overflow-hidden group shadow-xl transition-all duration-300 p-5 flex flex-col justify-between gap-5 min-h-[220px]`}>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ backgroundImage: `linear-gradient(to right, hsl(${hue}, 85%, 55%, 0.08), transparent)` }}
          />

          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 transition-colors duration-500" style={{ color: hpColor }} />
              <span className="text-[10px] text-gray-600 dark:text-zinc-400 font-extrabold uppercase tracking-wider block">Performance Merit Score</span>
            </div>
            <span className="text-xs text-gray-600 dark:text-zinc-400 font-normal block">Ecosystem Node Trust Index: Verified.</span>
          </div>

          <div className="flex items-center justify-between relative z-10 mt-2">
            <span className="text-[10px] text-gray-500 dark:text-zinc-500 italic font-medium max-w-[130px] leading-normal">Accumulated performance total of {totalReviews} reviews</span>

            <div
              className="relative flex items-center justify-center flex-shrink-0 transition-all duration-300 w-20 h-20"
              style={{ filter: `drop-shadow(${hpGlow})` }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  className="stroke-white/5"
                  strokeWidth="4.5"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  className="transition-all duration-700 ease-out"
                  style={{ stroke: hpColor }}
                  strokeWidth="4.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 33}
                  strokeDashoffset={2 * Math.PI * 33 - (safeScore / 100) * (2 * Math.PI * 33)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-black tracking-tight transition-all duration-300 text-base"
                  style={{ color: hpColor }}
                >
                  {safeScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Dispute Action Trigger Button */}
          <div className="relative z-10 pt-2 border-t border-gray-200 dark:border-white/5 mt-1 animate-fadeIn">
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="w-full py-1.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-500/80" />
              <span>View Dispute History</span>
            </button>
          </div>
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
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
              <span className="text-sm font-black text-gray-900 dark:text-white tracking-wide uppercase">Overall Rating Index Matrix:</span>
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
                <h3 className="text-base font-bold tracking-tight">Ecosystem Dispute Registry Log</h3>
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
                    <th className="pb-2 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/[0.03] text-gray-700 dark:text-zinc-300 font-mono">
                  {mockDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition">
                      <td className="py-2.5 font-bold text-blue-500 dark:text-blue-400">{dispute.id}</td>
                      <td className="py-2.5 font-sans text-gray-600 dark:text-zinc-400">{dispute.type}</td>
                      <td className="py-2.5 text-gray-500 dark:text-zinc-500">{dispute.date}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-medium">
                          {dispute.outcome}
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
    </div>
  );
};