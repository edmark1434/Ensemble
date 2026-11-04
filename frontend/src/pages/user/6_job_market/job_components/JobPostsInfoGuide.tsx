import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ArrowRight,
  Plus,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  FileText,
  ShieldCheck,
  Activity,
  Layers,
  Award,
  RefreshCw,
  Zap,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";

export type ScoreOrigin = "all" | "job_post" | "account" | "market";

export interface ScoreBasisFactor {
  rank: string;
  name: string;
  origin: "job_post" | "account" | "market";
  originLabel: string;
  weight: string;
  canBeChanged: "Editable Anytime" | "Dynamic (Account)" | "Dynamic (Live Market)";
  changeBadgeClass: string;
  howItWorks: string;
  howToImprove: string;
}

export const JobPostsInfoGuide: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const user = useGlobalState((state) => state.user);
  const isGuest = Boolean(isGuestMode || !user || user?.role === "guest");
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [originFilter, setOriginFilter] = useState<ScoreOrigin>("all");

  const scoringFactors: ScoreBasisFactor[] = [
    // --- Group 1: Job Post Content (You Control / Editable Anytime) ---
    {
      rank: "01",
      name: "Proper Title & Plain-Text Scope",
      origin: "job_post",
      originLabel: "Job Post Content",
      weight: "7.50",
      canBeChanged: "Editable Anytime",
      changeBadgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks:
        "Title 15–100 chars & 3+ words (+2.50) + 150+ chars plain deliverables description (+5.00).",
      howToImprove:
        "Write a clear, descriptive title and provide at least 150 characters of plain deliverables scope.",
    },
    {
      rank: "02",
      name: "Budget Realism & Focused Spread",
      origin: "job_post",
      originLabel: "Job Post Content",
      weight: "6.25",
      canBeChanged: "Editable Anytime",
      changeBadgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks:
        "Open Bid floor ≥ 300 Credits, or Budget Range with Min ≥ 250 Credits and Max ≤ 3x Min.",
      howToImprove:
        "Avoid extreme brackets (e.g. 50 to 10,000); set realistic rates matching industry standards.",
    },
    {
      rank: "03",
      name: "True Custom Thumbnail & Attachments",
      origin: "job_post",
      originLabel: "Job Post Content",
      weight: "5.00",
      canBeChanged: "Editable Anytime",
      changeBadgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks:
        "Uploaded custom project image, video still, or attached reference brief (default banners excluded).",
      howToImprove:
        "Upload authentic cover imagery or attach reference PDF/document briefs.",
    },
    {
      rank: "04",
      name: "Skill Tag Specificity & Match",
      origin: "job_post",
      originLabel: "Job Post Content",
      weight: "3.75 (+2.0)",
      canBeChanged: "Editable Anytime",
      changeBadgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks:
        "At least 3 relevant skill tags (+3.75) + up to +2.0 bonus when tags match the browsing freelancer.",
      howToImprove:
        "Add 3 to 6 targeted skill tags (e.g. Color Grading, Blender, Sound Design).",
    },
    {
      rank: "05",
      name: "Timeline, Workflow Terms & Screening",
      origin: "job_post",
      originLabel: "Job Post Content",
      weight: "2.50",
      canBeChanged: "Editable Anytime",
      changeBadgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks:
        "Estimated delivery turnaround days + NDA / Portfolio rights, screening questions, or milestones.",
      howToImprove:
        "Specify delivery turnaround and configure portfolio terms or screening questions.",
    },

    // --- Group 2: Poster Account Standing (Tied to Your User Profile) ---
    {
      rank: "06",
      name: "Bayesian Client Star Rating (4.2★ Prior)",
      origin: "account",
      originLabel: "Account Profile",
      weight: "22.75",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass:
        "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks:
        "Bayesian-smoothed 5-star rating with 3-review confidence prior. New clients start at 4.2★ (19.11 pts).",
      howToImprove:
        "Earn 5-star ratings on completed project contracts and escrow releases.",
    },
    {
      rank: "07",
      name: "Client Platform Merit Score (0–100)",
      origin: "account",
      originLabel: "Account Profile",
      weight: "7.70",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass:
        "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks:
        "100 Platform Merit = full 7.70 pts. Active warnings deduct points proportionally.",
      howToImprove:
        "Maintain clean account standing and zero active community warnings.",
    },
    {
      rank: "08",
      name: "Client Historical Hire Rate",
      origin: "account",
      originLabel: "Account Profile",
      weight: "4.55",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass:
        "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks:
        "Hired posts / total listings ratio. First-time posters receive 100% baseline (4.55 pts).",
      howToImprove:
        "Hire qualified creators from your proposal pool rather than letting valid listings expire.",
    },
    {
      rank: "09",
      name: "Subscription Profile Visibility Boost",
      origin: "account",
      originLabel: "Account Profile",
      weight: "+9.00 max",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass:
        "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks:
        "Business / Studio (+9.0 pts), Premium (+3.0 pts), Free (+0.0 pts). Statistical discovery boost.",
      howToImprove:
        "Active Studio or Premium membership grants a direct visibility boost in browse feeds.",
    },

    // --- Group 3: Live Market & Community Signals (Real-Time Dynamics) ---
    {
      rank: "10",
      name: "Dynamic Intake Window Freshness (12h–14d)",
      origin: "market",
      originLabel: "Live Market Signals",
      weight: "19.50",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass:
        "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks:
        "Decays gradually over chosen window. Rebounds by +35% in final 25% if proposals < 3.",
      howToImprove:
        "New listings start at peak score. Extend deadline if your window concludes with open seats.",
    },
    {
      rank: "11",
      name: "Low Proposal Congestion per Open Seat",
      origin: "market",
      originLabel: "Live Market Signals",
      weight: "15.00",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass:
        "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks:
        "0 proposals = 15.0 pts, 1 proposal = 12.0 pts, 2 proposals = 8.0 pts per open seat.",
      howToImprove:
        "Maximum points when newly published; balances naturally as pitches fill up.",
    },
    {
      rank: "12",
      name: "Community Saves from Other Users",
      origin: "market",
      originLabel: "Live Market Signals",
      weight: "3.75",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass:
        "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks:
        "Logarithmic boost from freelancer bookmarks: log2(saves + 1) / log2(6), saturating at 5+ saves.",
      howToImprove:
        "Detailed briefs, fair budgets, and compelling custom thumbnails encourage bookmarks.",
    },
    {
      rank: "13",
      name: "Application Window Urgency (< 24h)",
      origin: "market",
      originLabel: "Live Market Signals",
      weight: "1.75",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass:
        "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks:
        "Automatic +1.75 pts boost when < 24h (or < 25%) remains on intake window with low proposals.",
      howToImprove:
        "Automatic platform rescue for under-pitched listings nearing conclusion.",
    },
  ];

  const handleCreateJob = async () => {
    if (isCheckingAccess) return;
    if (isGuest) {
      setIsGuestModalOpen(true);
      return;
    }
    setIsCheckingAccess(true);
    try {
      await continueIfAccountVerified(
        () => navigate("/jobs/create"),
        false,
        "Account Verification is required to post a job. Please verify your identity to proceed."
      );
    } finally {
      setIsCheckingAccess(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ================= HEADER BOX ================= */}
      <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            How Job Market Ranking & Discovery Work
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
          Jobs on Ensemble are ordered using a <strong>100-Point Type-Aware Discovery Algorithm</strong> combining{" "}
          <strong>Job Post Content (25 pts)</strong>, <strong>Poster Account Standing (35 pts)</strong>, and{" "}
          <strong>Live Market Signals (40 pts)</strong>, supported by automated escrow protections and guaranteed refund policies.
        </p>

        {/* 3-Step Architecture Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-zinc-100 dark:border-white/5">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 01</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">25.00 Max</span>
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Quality Brief Base Floor</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Evaluates substantive deliverables scope (150+ chars), clear title, realistic budget benchmark, custom thumbnail artwork, and 3+ skill tags.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 02</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">35.00 + Boost</span>
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Poster Reputation & Standing</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Incorporates Bayesian 4.2★ client star rating, 100 Platform Merit, verified hire rate, and active platform membership tier boost (+0 to +9 pts).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 03</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">40.00 Max</span>
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Live Market & Intake Freshness</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Prioritizes listings with low proposal congestion per open seat (0–2 pitches), application window freshness decay, community saves, and last-call rescue.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN SCORING FACTORS TABLE (PURE TABLE VIEW ONLY) ================= */}
      <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                The 13 Job Algorithm Scoring Factors (100 Points Total)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Every job post is scored transparently across Content (25), Account Standing (35), and Live Market Signals (40).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline mr-1">
              Score = Content(25) + Standing(35) + Market(40) + Boost(0..9)
            </span>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOriginFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  originFilter === "all"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
                }`}
              >
                All (13)
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter("job_post")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  originFilter === "job_post"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Job Post (5)</span>
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter("account")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  originFilter === "account"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                <span>Account (4)</span>
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter("market")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  originFilter === "market"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Market (4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Actionability Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50/60 dark:bg-white/[0.015] border-b border-zinc-200 dark:border-white/10 text-[11px]">
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              Editable Anytime
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Derived directly from your job post details. Improve anytime by clicking <strong>Edit Post</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              Dynamic (Account)
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Tied to your user standing: 5★ client reviews, 100 Platform Merit, hire rate, and subscription tier.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              Dynamic (Live Market)
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Real-time marketplace signals: uncrowded seats, intake window countdown, community bookmarks, and urgency.
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                <th className="py-3 px-4 font-semibold w-24 text-center">Weight</th>
                <th className="py-3 px-4 font-semibold w-64">Scoring Factor</th>
                <th className="py-3 px-4 font-semibold w-40 text-center">Actionability</th>
                <th className="py-3 px-4 font-semibold min-w-[280px]">How It Is Calculated & Fair Play Mechanism</th>
                <th className="py-3 px-4 font-semibold min-w-[260px]">How To Maximize Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {scoringFactors
                .filter((item) => originFilter === "all" || item.origin === originFilter)
                .map((sig) => (
                  <tr
                    key={sig.name}
                    className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-400 dark:text-zinc-500 text-center">
                      #{sig.rank}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/15">
                        {sig.weight}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 dark:text-white leading-tight">
                        {sig.name}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {sig.origin === "job_post" && <FileText className="h-2.5 w-2.5 text-emerald-500" />}
                        {sig.origin === "account" && <ShieldCheck className="h-2.5 w-2.5 text-blue-500" />}
                        {sig.origin === "market" && <Activity className="h-2.5 w-2.5 text-amber-500" />}
                        <span>{sig.originLabel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${sig.changeBadgeClass}`}>
                        {sig.canBeChanged}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                      {sig.howItWorks}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium leading-relaxed">
                      {sig.howToImprove}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Discovery Roll & Dev Mode Note */}
        <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Score-Weighted Random Sampling & Dev Mode (Alt + O)
            </span>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              On page load, listings apply a bounded bell-curve roll (±14 pts) so high-scoring jobs dominate top positions while keeping the feed dynamic. Press <strong>Alt + O</strong> anywhere on the marketplace to inspect exact scores, rolls, and subscription boosts on any thumbnail.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-mono font-bold text-[11px] border border-zinc-300 dark:border-white/10">
            Alt + O
          </span>
        </div>
      </div>

      {/* ================= SECTION: COMPARISON PRINCIPLES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500" /> Quality & Standing Baseline (Why Empty Posts Don't Rank)
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
            Listings without genuine scope descriptions, vague titles, or unverified rates are held down by the 25-point content floor.
          </p>
          <div className="text-[11px] p-2.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
            <strong>Result:</strong> Top recommendations are high-clarity briefs from verified clients with transparent milestone expectations.
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-2">
            <Sparkles className="w-4 h-4 text-zinc-500" /> Seat Congestion & Intake Freshness (Why New Posts Get Seen)
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
            Jobs with 0 to 2 proposals per open seat earn maximum congestion points (+15 pts), rotating brand-new postings straight into view.
          </p>
          <div className="text-[11px] p-2.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
            <strong>Outcome:</strong> Freelancers always find active listings needing talent rather than posts inundated with 50+ applications.
          </div>
        </div>
      </div>

      {/* ================= SECTION: JOB CARD INDICATORS & BADGES (TABLE VIEW) ================= */}
      <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Job Card Indicators & Visual Badges Reference</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Reference guide for all status chips, subscription icons, and trust markers displayed on job cards.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-48">Visual Indicator</th>
                <th className="py-3 px-4 font-semibold w-40">Placement</th>
                <th className="py-3 px-4 font-semibold w-1/3">Qualification Criteria</th>
                <th className="py-3 px-4 font-semibold">What It Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {/* Rising */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <span className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shadow-xs">
                    <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                    <span className="relative z-10">Rising</span>
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Tag row / Card header</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Active window (≥ 25% window left or ≤ 3d old), &lt; 3 proposals per seat, Client Merit ≥ 95, AND Brief Quality Score ≥ 85%.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Prominent high-priority badge displayed on Job Market browse and Home page Latest Job Posts.
                </td>
              </tr>

              {/* Open */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                    Open
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Status badge row</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Active within application countdown window with open hiring seats remaining.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Actively accepting proposals from creators. A live countdown timer displays remaining intake time.
                </td>
              </tr>

              {/* Closed */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40">
                    Closed
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Status badge row</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Window expired, seats filled, or job closed early by author with 0 proposals.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Proposal submissions are locked. Automated refunds are processed immediately.
                </td>
              </tr>

              {/* Subscription Tier Icons */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <SubscriptionIcon plan="Free" />
                    <SubscriptionIcon plan="Premium" />
                    <SubscriptionIcon plan="Business" />
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Right after Poster Name</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Reflects the job creator&apos;s active platform subscription membership tier.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Authenticates client membership tier and applies +0 to +9.0 pts profile visibility boost.
                </td>
              </tr>

              {/* Budget Range Tag */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[10px] font-semibold">
                    Ranged Budget
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Right of budget numbers</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Client specified a defined minimum and maximum budget bracket.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Signals proposals must be submitted within or below the specified budget ceiling.
                </td>
              </tr>

              {/* Open Bid Tag */}
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-semibold">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Open Bid</span>
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">Right of budget numbers</td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Client provides a starting floor with no upper ceiling.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Signals freelancers can propose custom rates, scope deliverables, and phased roadmaps.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= SECTION: APPLICATION WINDOW & REFUND GUARANTEES (TABLE VIEW) ================= */}
      <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Application Window Intake & Automated Refund Guarantees</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Transparent escrow refund policies protecting client posting fees and creator submission credits.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-56">Policy / Mechanism</th>
                <th className="py-3 px-4 font-semibold w-36 text-center">Protected Fee</th>
                <th className="py-3 px-4 font-semibold w-1/3">Guarantee Condition</th>
                <th className="py-3 px-4 font-semibold">Protection Effect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                  Client Posting Fee Refund
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  50 Credits
                </td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  If an open job receives 0 proposals during its active window, or is closed early by the client with 0 proposals.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  The 50-credit posting fee is returned automatically to the client wallet without penalty.
                </td>
              </tr>

              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                  Freelancer Pitch Fee Refund
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                  10 Credits
                </td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  If a job&apos;s application window concludes without the client hiring anyone.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  All applicant submission fees (10 credits each) are refunded immediately to freelancers&apos; wallets.
                </td>
              </tr>

              <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                  Intake Window Countdown
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                  12h · 24h · 3d · 7d · 14d
                </td>
                <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Clients choose an application intake duration during post creation.
                </td>
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  A live countdown timer is displayed on the post for complete transparency to both clients and applicants.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BOTTOM CTA / ACTION BAR ================= */}
      <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Ready to post a high-ranking job?
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Include substantive deliverables scope, a fair budget benchmark, and 3+ skill tags to qualify for the Rising badge immediately.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/jobs/postings")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors cursor-pointer"
          >
            <span>Browse Jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateJob}
            disabled={isCheckingAccess}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-colors shadow-xs ${
              isCheckingAccess ? "opacity-80 cursor-wait" : "active:scale-98 cursor-pointer"
            }`}
          >
            {isCheckingAccess ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Opening...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Post a Job</span>
              </>
            )}
          </button>
        </div>
      </div>

      <GuestLoginModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
      />
    </div>
  );
};

export default JobPostsInfoGuide;
