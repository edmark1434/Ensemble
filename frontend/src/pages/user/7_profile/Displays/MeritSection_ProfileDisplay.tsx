import React, { useState } from "react";
import { Star, ShieldCheck, Trophy, Briefcase, Package, ChevronDown, ChevronUp, AlertCircle, X, ShieldAlert } from "lucide-react";

interface MeritSectionProps {
  loading?: boolean;
  meritScore?: number;
  avgRating?: number;
  totalReviews?: number;
  clientRating?: number;
  freelancerRating?: number;
  assetRating?: number;
  successfulJobsCount?: number;
}

const mockDisputes = [
  { id: "DSP-9041", type: "Asset Licensing", status: "Resolved", date: "2026-03-14", outcome: "In Favor of User" },
  { id: "DSP-8832", type: "Milestone Delivery", status: "Resolved", date: "2025-11-02", outcome: "Mutually Settled" }
];

export const MeritSectionSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
    <div className="rounded-xl border border-white/10 bg-white/5 h-[88px]" />
    <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 h-[88px]" />
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
  successfulJobsCount = 86
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  if (loading) return <MeritSectionSkeleton />;

  // Hardcoded Fallback Logic: Evaluates to 100 if incoming data is 0, null, or undefined
  const safeScore = meritScore ? Math.min(Math.max(meritScore, 0), 100) : 100;
  // tarunga lang ni ed na default jud 100

  // Dynamic HP Bar System: Calculates Hue angle (0 = Red, 60 = Yellow, 120 = Green)
  const hue = (safeScore / 100) * 120;
  const hpColor = `hsl(${hue}, 85%, 55%)`;
  const hpGlow = `0 0 12px hsl(${hue}, 85%, 55%, 0.4)`;

  return (
    <div className="font-['Plus Jakarta Sans',sans-serif] space-y-2">
      {/* Top Controller Toggle Bar */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition"
        >
          <span>{isCollapsed ? "Expand Metrics" : "Collapse Metrics"}</span>
          {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ==================== LEFT CARD: PERFORMANCE MERIT SCORE ==================== */}
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden group shadow-xl transition-all duration-300 ${
          isCollapsed ? "p-3 flex flex-row items-center justify-between" : "p-5 flex flex-col justify-between gap-5 min-h-[220px]"
        }`}>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ backgroundImage: `linear-gradient(to right, hsl(${hue}, 85%, 55%, 0.08), transparent)` }}
          />

          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 transition-colors duration-500" style={{ color: hpColor }} />
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Performance Merit Score</span>
            </div>
            {!isCollapsed && (
              <span className="text-xs text-zinc-400 font-normal block">Ecosystem Node Trust Index: Verified.</span>
            )}
          </div>

          <div className={`flex items-center justify-between relative z-10 ${isCollapsed ? "gap-4" : "mt-2"}`}>
            {!isCollapsed && (
              <span className="text-[10px] text-zinc-500 italic font-medium max-w-[130px] leading-normal">Accumulated performance total of {totalReviews} reviews</span>
            )}

            <div
              className={`relative flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                isCollapsed ? "w-14 h-14" : "w-20 h-20"
              }`}
              style={{ filter: `drop-shadow(${hpGlow})` }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx={isCollapsed ? "28" : "40"}
                  cy={isCollapsed ? "28" : "40"}
                  r={isCollapsed ? "22" : "33"}
                  className="stroke-white/5"
                  strokeWidth={isCollapsed ? "3.5" : "4.5"}
                  fill="transparent"
                />
                <circle
                  cx={isCollapsed ? "28" : "40"}
                  cy={isCollapsed ? "28" : "40"}
                  r={isCollapsed ? "22" : "33"}
                  className="transition-all duration-700 ease-out"
                  style={{ stroke: hpColor }}
                  strokeWidth={isCollapsed ? "3.5" : "4.5"}
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * (isCollapsed ? 22 : 33)}
                  strokeDashoffset={2 * Math.PI * (isCollapsed ? 22 : 33) - (safeScore / 100) * (2 * Math.PI * (isCollapsed ? 22 : 33))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-black tracking-tight transition-all duration-300 ${
                    isCollapsed ? "text-xs" : "text-base"
                  }`}
                  style={{ color: hpColor }}
                >
                  {safeScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Dispute Action Trigger Button */}
          {!isCollapsed && (
            <div className="relative z-10 pt-2 border-t border-white/5 mt-1 animate-fadeIn">
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <AlertCircle className="h-3.5 w-3.5 text-amber-500/80" />
                <span>View Dispute History</span>
              </button>
            </div>
          )}
        </div>

        {/* ==================== RIGHT CARD: RATING BREAKDOWN TABLE ==================== */}
        <div className={`md:col-span-2 rounded-2xl border border-white/10 bg-[#0b0e17]/60 backdrop-blur-md text-zinc-300 shadow-xl flex flex-col justify-between transition-all duration-300 ${
          isCollapsed ? "p-3 justify-center gap-2" : "p-5 gap-4"
        }`}>

          <div className={`text-xs ${isCollapsed ? "space-y-2" : "space-y-3.5"}`}>

            {/* Category 1: Uploaded Assets */}
            <div className={`grid grid-cols-[1fr_auto_auto] items-center border-b border-white/5 ${isCollapsed ? "pb-1.5" : "pb-2"}`}>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-zinc-500" />
                <span className="font-semibold text-zinc-200">Uploaded Assets</span>
              </div>

              <div className={`flex items-center text-zinc-500 ${isCollapsed ? "pr-2 sm:pr-4" : "pr-4 sm:pr-8"}`}>
                <span>Vol:</span>
                <span className="text-zinc-300 font-mono font-bold ml-1.5 w-6 text-right">4</span>
                <span className="text-zinc-700 ml-4">|</span>
              </div>

              <div className="flex items-center gap-1.5 justify-end w-24">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                <span className="text-white font-bold w-6 text-right">{assetRating.toFixed(1)}</span>
                <span className="text-zinc-500 font-normal text-[10px] w-8 text-left ml-0.5">(1k)</span>
              </div>
            </div>

            {/* Category 2: Total Successful Works Block */}
            <div className={`pt-0.5 ${isCollapsed ? "space-y-0" : "space-y-2.5"}`}>
              <div className="grid grid-cols-[1fr_auto_auto] items-center">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-zinc-400" />
                  <span className="font-bold text-zinc-100">Total Successful Works</span>
                </div>

                <div className={`flex items-center text-zinc-500 ${isCollapsed ? "pr-2 sm:pr-4" : "pr-4 sm:pr-8"}`}>
                  <span>Vol:</span>
                  <span className="text-zinc-300 font-mono font-bold ml-1.5 w-6 text-right">{successfulJobsCount}</span>
                  <span className="text-zinc-700 ml-4">|</span>
                </div>

                <div className="flex items-center gap-1.5 justify-end w-24">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                  <span className="text-white font-bold w-6 text-right">{avgRating.toFixed(1)}</span>
                  <span className="text-zinc-500 font-normal text-[10px] w-8 text-left ml-0.5">({successfulJobsCount})</span>
                </div>
              </div>

              {!isCollapsed && (
                <div className="border-l border-white/10 ml-2 space-y-2.5 animate-fadeIn">
                  {/* Sub-row: As a Client */}
                  <div className="grid grid-cols-[1fr_auto_auto] items-center pl-4">
                    <span className="text-zinc-500">As a Client</span>
                    <div className="flex items-center text-zinc-500 pr-4 sm:pr-8">
                      <span>Vol:</span>
                      <span className="text-zinc-400 font-mono ml-1.5 w-6 text-right">6</span>
                      <span className="text-zinc-700 ml-4">|</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end w-24">
                      <Star className="h-3 w-3 fill-amber-400/60 text-amber-400/60 flex-shrink-0" />
                      <span className="text-zinc-400 font-semibold w-6 text-right">{clientRating.toFixed(1)}</span>
                      <span className="text-zinc-600 font-normal text-[10px] w-8 text-left ml-0.5">(6)</span>
                    </div>
                  </div>

                  {/* Sub-row: As a Freelancer */}
                  <div className="grid grid-cols-[1fr_auto_auto] items-center pl-4">
                    <span className="text-zinc-500">As a Freelancer</span>
                    <div className="flex items-center text-zinc-500 pr-4 sm:pr-8">
                      <span>Vol:</span>
                      <span className="text-zinc-400 font-mono ml-1.5 w-6 text-right">80</span>
                      <span className="text-zinc-700 ml-4">|</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end w-24">
                      <Star className="h-3 w-3 fill-amber-400/60 text-amber-400/60 flex-shrink-0" />
                      <span className="text-zinc-400 font-semibold w-6 text-right">{freelancerRating.toFixed(1)}</span>
                      <span className="text-zinc-600 font-normal text-[10px] w-8 text-left ml-0.5">(80)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {!isCollapsed && (
            <div className="bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border border-amber-500/10 rounded-xl p-2.5 flex items-center justify-between mt-1 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-300">Overall Rating Index Matrix:</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-black text-amber-400 tracking-tight">
                <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                <span>{avgRating.toFixed(1)}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ==================== SYSTEM POPUP OVERLAY MODAL: DISPUTE HISTORY ==================== */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn text-white">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#080a12] p-5 shadow-2xl space-y-4">

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold tracking-tight">Ecosystem Dispute Registry Log</h3>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-zinc-400 hover:text-white rounded-lg p-1 hover:bg-white/5 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Ticket ID</th>
                    <th className="pb-2">Classification</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-zinc-300 font-mono">
                  {mockDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-white/[0.01] transition">
                      <td className="py-2.5 font-bold text-blue-400">{dispute.id}</td>
                      <td className="py-2.5 font-sans text-zinc-400">{dispute.type}</td>
                      <td className="py-2.5 text-zinc-500">{dispute.date}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-medium">
                          {dispute.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition"
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