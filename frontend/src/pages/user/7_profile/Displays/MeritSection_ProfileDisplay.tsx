import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AccountRecordSection } from "./AccountStanding";
import { Star, ShieldCheck, Trophy, Briefcase, Package, AlertCircle, X, ShieldAlert, User, Users } from "lucide-react";


export interface RatingTierInfo {
  label: string;
  badgeClass: string;
}

export function getRatingTierTag(score: number, count: number = 1): RatingTierInfo {
  if (count === 0 || score === 0) {
    return {
      label: "No Reviews",
      badgeClass: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-500 border border-gray-200 dark:border-white/10",
    };
  }
  if (score < 2.0) {
    return {
      label: "Poor",
      badgeClass: "text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30",
    };
  }
  if (score < 3.0) {
    return {
      label: "Fair",
      badgeClass: "text-orange-800 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30",
    };
  }
  if (score < 4.0) {
    return {
      label: "Good",
      badgeClass: "text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30",
    };
  }
  if (score < 4.8) {
    return {
      label: "Very Good",
      badgeClass: "text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/15 border border-emerald-400 dark:border-emerald-500/40",
    };
  }
  return {
    label: "Exceptional",
    badgeClass: "text-indigo-950 dark:text-purple-200 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/25 border border-indigo-400 dark:border-purple-400/50 font-bold",
  };
}

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
  onNavigateToReviews?: (filter: "All" | "As Freelancer" | "As a Client" | "As a Team" | "Asset Creation") => void;
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
  teamRating = 0.0,
  teamReviewCount = 0,
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
  const safeScore = meritScore !== undefined && meritScore !== null ? Math.min(Math.max(meritScore, 0), 100) : 50;
  const meritBand = safeScore >= 75
    ? 'Trusted'
    : safeScore >= 50
      ? 'Established'
      : safeScore >= 35
        ? 'Watch'
        : safeScore >= 20
          ? 'Restricted'
          : 'Frozen';

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

  // Dynamic Poor - Exceptional rating tiers for each category
  const totalTier = getRatingTierTag(avgRating, totalReviews);
  const freelancerTotalCount = freelancerServiceCount + freelancerJobCount;
  const freelancerTier = getRatingTierTag(freelancerRating, freelancerTotalCount);
  const freelancerServiceTier = getRatingTierTag(freelancerServiceRating, freelancerServiceCount);
  const freelancerJobTier = getRatingTierTag(freelancerJobRating, freelancerJobCount);

  const clientTotalCount = clientServiceCount + clientJobCount;
  const clientTier = getRatingTierTag(clientRating, clientTotalCount);
  const clientServiceTier = getRatingTierTag(clientServiceRating, clientServiceCount);
  const clientJobTier = getRatingTierTag(clientJobRating, clientJobCount);

  const teamTier = getRatingTierTag(teamRating, teamReviewCount);
  const assetTier = getRatingTierTag(assetRating, 0);


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
                Reliability score. {meritBand} band. Star ratings stay separate.
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
        <div className={`${viewMode === "both" ? "md:col-span-2" : "w-full"} flex flex-col gap-4`}>
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xs transition-all duration-300 p-5 space-y-4">
            
            {/* Table Header Description */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10 gap-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Performance Ratings Breakdown
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Verified star ratings and review counts across your freelance and client engagements.
                </p>
              </div>
              {totalReviews > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0 self-start sm:self-auto">
                  <Star className="w-3.5 h-3.5 fill-current mr-1" />
                  {avgRating.toFixed(1)} Avg ({totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'})
                </span>
              )}
            </div>

            {/* Ratings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    <th className="py-2.5 px-3">Role & Category</th>
                    <th className="py-2.5 px-3">Engagement Type</th>
                    <th className="py-2.5 px-3 text-center">Rating</th>
                    <th className="py-2.5 px-3 text-center">Reviews</th>
                    <th className="py-2.5 px-3 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {/* ================= 1. FREELANCER SECTION ================= */}
                  <tr 
                    onClick={() => onNavigateToReviews?.("As Freelancer")}
                    className={`bg-gray-50/70 dark:bg-white/[0.02] font-semibold text-gray-900 dark:text-zinc-100 transition-colors ${
                      onNavigateToReviews ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05]" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-bold">As a Freelancer</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-zinc-400 font-normal">
                      Overall Delivery
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {freelancerRating > 0 ? freelancerRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-gray-600 dark:text-zinc-400">
                      ({freelancerServiceCount + freelancerJobCount})
                    </td>
                    <td className="py-3 px-3 text-right">
                      {freelancerServiceCount + freelancerJobCount === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-500">
                          No Reviews
                        </span>
                      ) : freelancerRating >= 4.8 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Exceptional
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Great
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Sub-row: Freelancer Service Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Service Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Gig Services
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {freelancerServiceRating > 0 ? freelancerServiceRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      ({freelancerServiceCount})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        {freelancerServiceCount > 0 ? `${freelancerServiceCount} verified` : "—"}
                      </span>
                    </td>
                  </tr>

                  {/* Sub-row: Freelancer Job Execution Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Job Execution Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Job Contracts
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {freelancerJobRating > 0 ? freelancerJobRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      ({freelancerJobCount})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        {freelancerJobCount > 0 ? `${freelancerJobCount} verified` : "—"}
                      </span>
                    </td>
                  </tr>

                  {/* ================= 2. CLIENT SECTION ================= */}
                  <tr 
                    onClick={() => onNavigateToReviews?.("As a Client")}
                    className={`bg-gray-50/70 dark:bg-white/[0.02] font-semibold text-gray-900 dark:text-zinc-100 transition-colors ${
                      onNavigateToReviews ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05]" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-bold">As a Client</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-zinc-400 font-normal">
                      Overall Collaboration
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {clientRating > 0 ? clientRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-gray-600 dark:text-zinc-400">
                      ({clientServiceCount + clientJobCount})
                    </td>
                    <td className="py-3 px-3 text-right">
                      {clientServiceCount + clientJobCount === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-500">
                          No Reviews
                        </span>
                      ) : clientRating >= 4.8 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Exceptional
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Great
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Sub-row: Client Service Feedback Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Service Feedback Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Gig Orders Placed
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {clientServiceRating > 0 ? clientServiceRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      ({clientServiceCount})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        {clientServiceCount > 0 ? `${clientServiceCount} verified` : "—"}
                      </span>
                    </td>
                  </tr>

                  {/* Sub-row: Client Job Feedback Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Job Feedback Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Job Postings Hired
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {clientJobRating > 0 ? clientJobRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      ({clientJobCount})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        {clientJobCount > 0 ? `${clientJobCount} verified` : "—"}
                      </span>
                    </td>
                  </tr>

                  
                  {/* ================= 3. AS A TEAM SECTION ================= */}
                  <tr 
                    onClick={() => onNavigateToReviews?.("As a Team")}
                    className={`bg-gray-50/70 dark:bg-white/[0.02] font-semibold text-gray-900 dark:text-zinc-100 transition-colors ${
                      onNavigateToReviews ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05]" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-bold">As a Team</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-zinc-400 font-normal">
                      Squad Collaboration
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {teamRating > 0 ? teamRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-gray-600 dark:text-zinc-400">
                      ({teamReviewCount})
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${teamTier.badgeClass}`}>
                        {teamTier.label}
                      </span>
                    </td>
                  </tr>

                  {/* Sub-row: Team Deliveries Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Team Deliveries Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Team Contracts & Squads
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {teamRating > 0 ? teamRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      ({teamReviewCount})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {teamReviewCount > 0 ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${teamTier.badgeClass}`}>
                          {teamTier.label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>

                  {/* ================= 4. ASSET CREATOR SECTION ================= */}
                  <tr 
                    onClick={() => onNavigateToReviews?.("Asset Creation")}
                    className={`bg-gray-50/70 dark:bg-white/[0.02] font-semibold text-gray-900 dark:text-zinc-100 transition-colors ${
                      onNavigateToReviews ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05]" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-bold">As an Asset Creator</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-zinc-400 font-normal">
                      Marketplace Products
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {assetRating > 0 ? assetRating.toFixed(1) : "0.0"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-gray-600 dark:text-zinc-400">
                      (0)
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-500">
                        No Reviews
                      </span>
                    </td>
                  </tr>

                  {/* Sub-row: Uploaded Assets Rating */}
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-gray-600 dark:text-zinc-400">
                    <td className="py-2.5 px-3 pl-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 dark:text-zinc-600 font-mono">└─</span>
                        <span>Uploaded Assets Rating</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-zinc-500">
                      Digital Assets
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        0.0
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                      (0)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        —
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Overall Total Rating Banner */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Total Platform Rating
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Calculated from {totalReviews} verified platform {totalReviews === 1 ? 'review' : 'reviews'} across all engagements.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-dark-base px-3.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-2xs shrink-0 self-end sm:self-auto">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                <span className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 dark:text-zinc-500 font-normal">/ 5.0</span>
              </div>
            </div>

          </div>        </div>
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
