import React from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Star,
  CheckCircle2,
  ArrowRight,
  Plus,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

export const GigServicesInfoGuide: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const rankingPillars = [
    {
      num: "01",
      weight: "40 pts",
      title: "Fair Trust Rating",
      detail: "Client review score (Bayesian weighted)",
      purpose: "Honors proven quality and completed orders while protecting new creators from getting overshadowed on Day 1.",
      rules:
        "Real completed 5★ orders boost your ranking. New services with 0 reviews are given a fair 4.2★ baseline (33.6 pts) so fresh creators aren't penalized.",
    },
    {
      num: "02",
      weight: "25 pts",
      title: "14-Day Newcomer Spotlight",
      detail: "Days since publication + initial orders",
      purpose: "Jumpstarts discovery for new creators so fresh services can land initial orders without prior reviews.",
      rules:
        "Newly published services receive the full 25 pts for their first 7 days, then gently taper over 14 days as order history builds.",
    },
    {
      num: "03",
      weight: "20 pts",
      title: "Completeness & Effort",
      detail: "Tiers, gallery clips, milestones & terms",
      purpose: "Gives creators 100% control over their score on launch day by rewarding rich media, clear tiers, and thorough terms.",
      rules:
        "You control this 100% on Day 1. Services with 3 pricing tiers, 3+ portfolio samples, milestones, and terms score the full 20 pts.",
    },
    {
      num: "04",
      weight: "15 pts",
      title: "Queue Capacity & Availability",
      detail: "Active in-progress orders vs max slots",
      purpose: "Protects creators from burnout and ensures clients are directed toward editors who have open turnaround bandwidth.",
      rules:
        "When an in-demand creator's active slots fill up, their listing steps back slightly to avoid burnout—giving available creators higher exposure.",
    },
  ];

  const risingChecklist = [
    {
      item: "Offer All 3 Pricing Tiers",
      weight: "+25%",
      detail: "Provide Basic, Standard, and Premium packages with clear pricing and delivery turnaround times.",
    },
    {
      item: "Upload 3+ Gallery Samples",
      weight: "+25%",
      detail: "Add high-resolution image stills, before/after comparisons, or video preview reels demonstrating your craft.",
    },
    {
      item: "Define 3+ Project Milestones",
      weight: "+20%",
      detail: "Break your workflow into clear delivery stages (e.g. Rough Cut, Color & Audio Polish, Final Master).",
    },
    {
      item: "Detailed Description & Terms",
      weight: "+15%",
      detail: "Include a thorough description (120+ chars) explaining deliverables, plus clear Terms of Service.",
    },
    {
      item: "Add 3+ Relevant Skill Tags",
      weight: "+15%",
      detail: "Tag your tools and specialties (e.g. DaVinci Resolve, Motion Graphics, Sound Design) for search matching.",
    },
  ];

  const badgeDefinitions = [
    {
      name: "Rising",
      badge: (
        <span className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shadow-xs">
          <TrendingUp className="relative z-10 h-2.5 w-2.5" />
          <span className="relative z-10">Rising</span>
          <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />
        </span>
      ),
      condition: "Published within 7 days, under 3 orders, 0 reviews, AND Service Completeness ≥ 85%.",
      effect: "Puts fresh creators in top-row discovery on marketplace browsing and Home page Top Services.",
    },
    {
      name: "New",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-900 text-white dark:bg-black/80 dark:text-zinc-200 border border-gray-700 dark:border-white/15 text-[11px] font-semibold shadow-2xs">
          <Star className="h-3 w-3 fill-gray-400 text-gray-400" />
          <span>New</span>
        </span>
      ),
      condition: "Published within the last 7 days with no client reviews yet.",
      effect: "Signals to clients that the service is freshly listed.",
    },
    {
      name: "★ 5.0 (12)",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-900 text-white dark:bg-black/80 dark:text-zinc-200 border border-gray-700 dark:border-white/15 text-[11px] font-semibold shadow-2xs">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-bold text-yellow-400">5.0</span>
          <span className="text-gray-300 text-[10px]">(12)</span>
        </span>
      ),
      condition: "Has received verified client reviews on completed orders.",
      effect: "Displays genuine client satisfaction and order volume.",
    },
    {
      name: "Open",
      badge: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
          Open
        </span>
      ),
      condition: "Creator has open slots available and is ready for work.",
      effect: "Clients can order packages directly without queuing delays.",
    },
  ];

  const handleCreateService = () => {
    if (isGuestMode) {
      navigate("/login");
      return;
    }
    continueIfAccountVerified(
      () => navigate("/gigs/create"),
      false,
      "Account Verification is required to access Gig Creation. Please verify your identity to proceed."
    );
  };

  return (
    <div
      className="space-y-6 w-full animate-fade-in"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300">
            <HelpCircle className="w-4 h-4" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            How Services Ranking & The "Rising" Badge Work
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
          Services are ranked using a <strong>100-Point Fair Discovery Algorithm</strong>. This ensures
          talented new creators who set up complete packages and show quality work can appear right alongside
          top-rated veterans.
        </p>
      </div>

      {/* Section 1: 4 Pillars Table */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              The 4 Scoring Pillars (100 Points Total)
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            Default sort order for All Services
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-14">Pillar</th>
                <th className="py-3 px-4 font-semibold w-24 text-center">Points</th>
                <th className="py-3 px-4 font-semibold w-52">Metric</th>
                <th className="py-3 px-4 font-semibold w-64 text-emerald-700 dark:text-emerald-400">Purpose</th>
                <th className="py-3 px-4 font-semibold">Scoring Rule & Fair Play Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {rankingPillars.map((p) => (
                <tr
                  key={p.num}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-500 dark:text-zinc-400">
                    {p.num}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-gray-300/80 dark:border-white/15 shadow-2xs">
                      {p.weight}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900 dark:text-white">{p.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">{p.detail}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-900 dark:text-white font-medium leading-relaxed">
                    {p.purpose}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                    {p.rules}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Rising Checklist Table */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Service Completeness Checklist</span>
              <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                (Pillar 03 — 20 Points)
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Complete at least <strong>85%</strong> of this checklist to automatically earn the green <strong>Rising</strong> badge.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-1/4">Setup Action</th>
                <th className="py-3 px-4 font-semibold w-20 text-center">Score</th>
                <th className="py-3 px-4 font-semibold">Requirement & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {risingChecklist.map((c) => (
                <tr
                  key={c.item}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{c.item}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                    {c.weight}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                    {c.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Service Card Badges Reference Table */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Service Card Badges & Indicators
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Reference table explaining every badge displayed on service cards across the marketplace.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-40">Badge</th>
                <th className="py-3 px-4 font-semibold w-1/3">Qualification Criteria</th>
                <th className="py-3 px-4 font-semibold">What It Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {badgeDefinitions.map((b) => (
                <tr
                  key={b.name}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <td className="py-3.5 px-4">{b.badge}</td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                    {b.condition}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                    {b.effect}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA / Action Bar */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Ready to earn your "Rising" badge?
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Publish a service with all 3 tiers, 3+ samples, and delivery milestones to get featured in the spotlight.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/gigs/services")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors cursor-pointer"
          >
            <span>Browse Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateService}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shadow-xs active:scale-98 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Service</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GigServicesInfoGuide;
