import React, { useState } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Layers,
  Users,
  Star,
  Plus,
  Award,
  SlidersHorizontal,
  ArrowRight,
  Zap,
  FileText,
  UserCheck,
  ShoppingCart,
} from "lucide-react";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";

interface GigServicesInfoGuideProps {
  onBrowseServices?: () => void;
  onPostService?: () => void;
}

type FactorCategory = "all" | "content" | "account" | "market";

interface ScoringFactorRow {
  rank: string;
  factor: string;
  pillar: "Service Package Content" | "Creator Account Profile" | "Live Market Signals";
  categoryKey: Exclude<FactorCategory, "all">;
  weight: string;
  actionability: "Editable Anytime" | "Dynamic (Account)" | "Dynamic (Live Market)";
  formula: string;
  howToMaximize: string;
}

const SCORING_FACTORS: ScoringFactorRow[] = [
  {
    rank: "#01",
    factor: "Proper Title & Plain-Text Scope",
    pillar: "Service Package Content",
    categoryKey: "content",
    weight: "7.50",
    actionability: "Editable Anytime",
    formula:
      "Clear title (15–120 chars, 3+ words = +2.50) + 120+ chars of plain-text deliverables description (+5.00).",
    howToMaximize:
      "Write a specific service title and detailed plain-text scope explaining what the buyer receives.",
  },
  {
    rank: "#02",
    factor: "Package Tier Structure & Pricing",
    pillar: "Service Package Content",
    categoryKey: "content",
    weight: "6.25",
    actionability: "Editable Anytime",
    formula:
      "Full 3-tier package setup (Basic, Standard, Premium) with realistic rates (≥ 15 Credits per tier).",
    howToMaximize:
      "Configure all 3 package tiers (Basic, Standard, Premium) with clear deliverables, revisions, and delivery days.",
  },
  {
    rank: "#03",
    factor: "Custom Thumbnail & Gallery Samples",
    pillar: "Service Package Content",
    categoryKey: "content",
    weight: "5.00",
    actionability: "Editable Anytime",
    formula:
      "Uploaded custom cover thumbnail plus 3+ work sample media items (images, video reels, audio, or PDFs).",
    howToMaximize:
      "Upload a custom service thumbnail and at least 3 high-resolution work samples in your gallery.",
  },
  {
    rank: "#04",
    factor: "Skill Tag Specificity & Match",
    pillar: "Service Package Content",
    categoryKey: "content",
    weight: "3.75 (+2.0)",
    actionability: "Editable Anytime",
    formula:
      "3+ relevant skill tags (+3.75) + up to +2.0 bonus when tags match the browsing client's project needs.",
    howToMaximize:
      "Add 3 to 6 accurate production tags (e.g. Color Grading, After Effects, Sound Design).",
  },
  {
    rank: "#05",
    factor: "Milestones, Terms & Requirements",
    pillar: "Service Package Content",
    categoryKey: "content",
    weight: "2.50",
    actionability: "Editable Anytime",
    formula:
      "2+ structured project milestones plus custom Terms of Service (> 20 chars) and buyer intake questions.",
    howToMaximize:
      "Break your workflow into 2+ milestones and specify clear Terms of Service and revision policies.",
  },
  {
    rank: "#06",
    factor: "Bayesian Service Star Rating (4.2★ Prior)",
    pillar: "Creator Account Profile",
    categoryKey: "account",
    weight: "22.75",
    actionability: "Dynamic (Account)",
    formula:
      "3-review confidence prior at 4.2★: (v*R + 3*4.2)/(v+3). Brand-new services start at 19.11 instead of 0.",
    howToMaximize:
      "Deliver high-quality work on time to earn 5-star buyer reviews on completed service contracts.",
  },
  {
    rank: "#07",
    factor: "Creator Platform Merit Score (0–100)",
    pillar: "Creator Account Profile",
    categoryKey: "account",
    weight: "7.70",
    actionability: "Dynamic (Account)",
    formula:
      "100 minus active warning points. Clean accounts with 100 Merit earn the full 7.70 score.",
    howToMaximize:
      "Maintain professional communication, meet milestone deadlines, and avoid platform warnings.",
  },
  {
    rank: "#08",
    factor: "Order Fulfillment Reliability",
    pillar: "Creator Account Profile",
    categoryKey: "account",
    weight: "4.55",
    actionability: "Dynamic (Account)",
    formula:
      "Ratio of successfully fulfilled service orders vs cancellations. New creators start at 100% baseline (4.55).",
    howToMaximize:
      "Accept orders you can fulfill within the promised delivery window and avoid order cancellations.",
  },
  {
    rank: "#09",
    factor: "Subscription Profile Visibility Boost",
    pillar: "Creator Account Profile",
    categoryKey: "account",
    weight: "+9.00 max",
    actionability: "Dynamic (Account)",
    formula:
      "Studio / Business (+9.0), Premium (+3.0), Free (+0.0).",
    howToMaximize:
      "Upgrade membership in Settings to display a verified tier badge and boost service discovery.",
  },
  {
    rank: "#10",
    factor: "14-Day Newcomer & Listing Freshness",
    pillar: "Live Market Signals",
    categoryKey: "market",
    weight: "19.50",
    actionability: "Dynamic (Live Market)",
    formula:
      "Smooth 14-day freshness curve with a +25% newcomer spotlight boost for services with fewer than 3 orders.",
    howToMaximize:
      "Newly published services receive immediate day-1 top-of-feed rotation so new creators get discovered.",
  },
  {
    rank: "#11",
    factor: "Open Queue & Slot Availability",
    pillar: "Live Market Signals",
    categoryKey: "market",
    weight: "15.00",
    actionability: "Dynamic (Live Market)",
    formula:
      "1 - (activeOrders / maxSlots). Full 15.00 when slots are open; tapers down as your order queue fills.",
    howToMaximize:
      "Complete active orders promptly or increase your concurrent slot capacity if you can handle more volume.",
  },
  {
    rank: "#12",
    factor: "Community Saves from Buyers",
    pillar: "Live Market Signals",
    categoryKey: "market",
    weight: "3.75",
    actionability: "Dynamic (Live Market)",
    formula:
      "Logarithmic bookmark boost: log2(saves + 1)/log2(6), saturating at 5+ saves (creator self-saves excluded).",
    howToMaximize:
      "Compelling thumbnails, fair package pricing, and strong showreels naturally earn buyer bookmarks.",
  },
  {
    rank: "#13",
    factor: "Fast Turnaround & Add-on Value",
    pillar: "Live Market Signals",
    categoryKey: "market",
    weight: "1.75",
    actionability: "Dynamic (Live Market)",
    formula:
      "Rewards services offering fast initial delivery (≤ 3 days on Basic tier) and optional checkout add-ons.",
    howToMaximize:
      "Offer a responsive Basic package turnaround and configure optional service add-ons in Step 5.",
  },
];

export const GigServicesInfoGuide: React.FC<GigServicesInfoGuideProps> = ({
  onBrowseServices,
  onPostService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FactorCategory>("all");

  const filteredFactors =
    selectedCategory === "all"
      ? SCORING_FACTORS
      : SCORING_FACTORS.filter((f) => f.categoryKey === selectedCategory);

  return (
    <div className="space-y-8 pb-10 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* =========================================================================
          HEADER BOX: ARCHITECTURE OVERVIEW & 3-STEP PIPELINE
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-zinc-200 text-xs font-bold border border-gray-200 dark:border-white/10">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>Fair Service Discovery &amp; Queue-Aware Ranking Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-snug">
            How Ensemble Ranks &amp; Recommends Services
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
            Every active service is evaluated on a transparent{" "}
            <strong className="text-gray-900 dark:text-white">100-Point Base Scale</strong> across{" "}
            <strong className="text-gray-900 dark:text-white">13 Algorithmic Factors</strong> (plus optional{" "}
            <strong className="text-gray-900 dark:text-white">Subscription Visibility Boosts</strong> and{" "}
            <strong className="text-gray-900 dark:text-white">Buyer Skill Match Bonuses</strong>). The engine balances{" "}
            <strong className="text-gray-900 dark:text-white">Service Package Quality (25 pts)</strong>,{" "}
            <strong className="text-gray-900 dark:text-white">Creator Reputation &amp; Standing (35 pts)</strong>, and{" "}
            <strong className="text-gray-900 dark:text-white">Live Market &amp; Queue Availability (40 pts)</strong> so
            talented newcomers and established studios compete on equal footing.
          </p>
        </div>

        {/* 3-Step Pipeline Summary Strip */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  Step 01: Package Quality Floor
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  25.00 Max
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Evaluates title clarity, plain-text deliverables scope, 3-tier pricing structure, custom visuals, gallery media, skills, and milestones.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
              <span>100% Creator Controlled</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">Editable Anytime</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                  Step 02: Creator Trust &amp; Standing
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  35.00 + Boost
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Combines Bayesian 4.2★ confidence rating (protecting 0-review newcomers), Platform Merit (0–100), order reliability, and Subscription tier boost.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
              <span>4.2★ Newcomer Baseline</span>
              <span className="text-blue-600 dark:text-blue-400 font-sans font-semibold">Up to +9.0 Plan Boost</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Step 03: Live Market &amp; Queue
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  40.00 Max
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Tracks 14-day freshness &amp; newcomer spotlight (19.50), open concurrent order slots (15.00), buyer bookmarks (3.75), and fast turnaround (1.75).
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
              <span>Anti-Monopoly Queue</span>
              <span className="text-amber-600 dark:text-amber-400 font-sans font-semibold">Real-Time Signals</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: THE 13 SERVICE ALGORITHM SCORING FACTORS (PURE TABLE VIEW)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
              <span>The 13 Service Algorithm Scoring Factors (100 Points Total)</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Complete breakdown of every signal used to calculate your Service Discovery Score.
            </p>
          </div>

          {/* Pillar Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All (13)" },
              { id: "content", label: "Service Post (5)" },
              { id: "account", label: "Account (4)" },
              { id: "market", label: "Market (4)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as FactorCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  selectedCategory === tab.id
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                    : "bg-white dark:bg-dark-surface text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4 w-28">Weight</th>
                  <th className="py-3.5 px-4 min-w-[210px]">Scoring Factor</th>
                  <th className="py-3.5 px-4 w-40">Actionability</th>
                  <th className="py-3.5 px-4 min-w-[260px]">What Earns Points</th>
                  <th className="py-3.5 px-4 min-w-[240px]">How To Maximize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                {filteredFactors.map((row) => (
                  <tr
                    key={row.rank}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors align-top"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-400 dark:text-zinc-500">
                      {row.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block font-mono font-bold text-gray-900 dark:text-white px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[11px]">
                        {row.weight}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">{row.factor}</div>
                      <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        {row.pillar}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.actionability === "Editable Anytime"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                            : row.actionability === "Dynamic (Account)"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                        }`}
                      >
                        {row.actionability}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400 leading-relaxed">
                      {row.formula}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300 leading-relaxed font-medium">
                      {row.howToMaximize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: SERVICE CARD INDICATORS & VISUAL BADGES REFERENCE (TABLE)
         ========================================================================= */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <span>Service Card Indicators &amp; Visual Badges Reference</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Reference guide for every status pill, subscription icon, and rating badge displayed on service cards.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4 w-52">Visual Badge</th>
                  <th className="py-3.5 px-4 w-48">Indicator Name</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Trigger Condition</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Marketplace Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                {/* 1. Rising Creator Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shadow-xs">
                      <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                      <span className="relative z-10">Rising</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Rising Service Spotlight
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Fewer than 5 total orders, Package Quality ≥ 75%, and open order slots.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Highlights high-effort listings from newer creators to accelerate their first orders.
                  </td>
                </tr>

                {/* 2. Open Status Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                      Open
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Open for Orders
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Service is active and current active contracts are below the creator&apos;s slot limit.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Buyers can immediately select a package tier and place an order.
                  </td>
                </tr>

                {/* 3. Queue Full (Paused) Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      Queue Full
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Paused (Queue Full)
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Active contracts equal the creator&apos;s maximum concurrent slot capacity.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Automatically pauses new checkout intake until an active order is completed.
                  </td>
                </tr>

                {/* 4. Closed Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                      Closed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Closed Service
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Creator manually closed the service from their service dashboard.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Checkout is disabled until the creator reopens the service.
                  </td>
                </tr>

                {/* 5. Subscription Tier Icons (No text labels per user preference) */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <SubscriptionIcon plan="Free" />
                      <SubscriptionIcon plan="Premium" />
                      <SubscriptionIcon plan="Business" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Creator Subscription Tier
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Displayed next to the creator or team name based on their active membership plan.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Indicates Free, Premium (+3.0 boost), or Studio/Business (+9.0 boost) account standing.
                  </td>
                </tr>

                {/* 6. New Listing Thumbnail Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-semibold border border-white/15 shadow-xs">
                      <Star className="h-3 w-3 fill-gray-400 text-gray-400" />
                      <span className="text-gray-200">New</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    New Listing Badge
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Published within the last 7 days with 0 completed reviews yet.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Replaces &quot;N/A&quot; on new listings while Bayesian 4.2★ newcomer protection is active.
                  </td>
                </tr>

                {/* 7. Verified Service Rating Badge */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-semibold border border-white/15 shadow-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">5.0 (12)</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Verified Service Rating
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Service has 1 or more completed and rated escrow orders.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Displays average star rating and review count from verified buyers.
                  </td>
                </tr>

                {/* 8. Package Tiers & Concurrent Slots Pills */}
                <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 text-[9px] font-semibold">
                        <Layers className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                        <span>3 Tiers</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10 text-[10px]">
                        <Users className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                        <span>3 Slots</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                    Tiers &amp; Queue Slots
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400">
                    Reflects configured pricing packages (1–3) and maximum simultaneous orders.
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                    Shows package flexibility and how many concurrent clients the creator can serve.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: SERVICE CAPACITY, QUEUEING & LIFECYCLE RULES
         ========================================================================= */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Service Publishing, Editing &amp; Queue Protection Rules
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 space-y-1.5">
            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
              <span>One-Time 50 Cr Publishing Fee &amp; Free Edits</span>
            </div>
            <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
              Publishing a new service costs 50 Credits once. Editing an existing service—updating packages, add-ons, milestones, or gallery samples—is completely free (0 Credits).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 space-y-1.5">
            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Automatic Slot Queue Management</span>
            </div>
            <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
              When active contracts reach your configured slot limit, your service automatically switches to <strong className="text-gray-900 dark:text-white">Queue Full</strong> and reopens as soon as a contract completes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/5 space-y-1.5">
            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              <span>Additional Revision Workrate</span>
            </div>
            <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
              Extra revisions requested beyond a package&apos;s included quota are calculated as your configured percentage of that specific milestone&apos;s credit value.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM CTA BAR
         ========================================================================= */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Ready to optimize your service or explore top creators?
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Structure 3 clear tiers, attach 3+ work samples, and configure optional add-ons to maximize your Service Discovery Score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onBrowseServices && (
            <button
              type="button"
              onClick={onBrowseServices}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-gray-800 dark:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Browse Services</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {onPostService && (
            <button
              type="button"
              onClick={onPostService}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Post a Service</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GigServicesInfoGuide;
