import React from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Star,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  Plus,
  HelpCircle,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

export const GigServicesInfoGuide: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const rankingPillars = [
    {
      num: "01",
      weight: "40% Weight",
      title: "Fair Trust Rating",
      badgeClass:
        "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      desc: "Proven 5-star reviews boost your score, while low ratings pull it down. Brand-new creators with 0 reviews aren't punished—everyone starts at a fair 4.2★ baseline until real client reviews come in.",
    },
    {
      num: "02",
      weight: "25% Weight",
      title: "14-Day Newcomer Spotlight",
      badgeClass:
        "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
      desc: "Newly published services receive a temporary 2-week discovery boost so clients can spot fresh talent right away. This boost gently tapers off over 14 days as you gather your first orders.",
    },
    {
      num: "03",
      weight: "20% Weight",
      title: "Service Completeness & Effort",
      badgeClass:
        "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
      desc: "You control this 100% on Day 1. Services with 3 pricing tiers, rich gallery samples, clear milestones, Terms of Service, and skill tags score maximum effort points.",
    },
    {
      num: "04",
      weight: "15% Weight",
      title: "Open Queue & Slot Capacity",
      badgeClass:
        "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
      desc: "When a busy creator's active order slots are almost full, their listing steps back slightly to prevent burnout—giving creators with open hands higher visibility.",
    },
  ];

  const risingChecklist = [
    {
      points: "+25%",
      title: "Offer All 3 Pricing Tiers (Basic, Standard, Premium)",
      desc: "Give clients flexible entry points—from a quick starter edit to a full production package.",
    },
    {
      points: "+25%",
      title: "Upload at Least 3 Gallery Samples",
      desc: "Include high-resolution thumbnails, before/after stills, or video reel previews so clients can see your craft.",
    },
    {
      points: "+20%",
      title: "Define 3+ Delivery Milestones",
      desc: "Break your workflow into clear phases (e.g., Rough Cut, Color & Sound Polish, Final Master) to build buyer confidence.",
    },
    {
      points: "+15%",
      title: "Write a Detailed Description (120+ chars) & Terms of Service",
      desc: "Clearly state what deliverables are included, turnaround expectations, and your revision policy.",
    },
    {
      points: "+15%",
      title: "Add at Least 3 Relevant Skill Tags",
      desc: "Tag your tools and specialties (e.g., DaVinci Resolve, After Effects, Sound Design) so search filters match your gig.",
    },
  ];

  const badgeLegend = [
    {
      name: "Rising",
      icon: <TrendingUp className="relative z-10 h-3 w-3" />,
      shine: true,
      badgeClass:
        "relative overflow-hidden bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      desc: "Awarded to brand-new services (posted within 7 days, under 3 orders, 0 reviews) that achieve at least 85% Service Completeness.",
    },
    {
      name: "★ New",
      icon: null,
      badgeClass:
        "bg-gray-900 text-gray-200 border-gray-700 dark:bg-black/60 dark:text-zinc-300 dark:border-white/10",
      desc: "Shown on the thumbnail of any service published within the last 7 days that hasn't received its first rating yet.",
    },
    {
      name: "★ 5.0 (12)",
      icon: null,
      badgeClass:
        "bg-gray-900 text-yellow-400 border-gray-700 dark:bg-black/60 dark:text-yellow-400 dark:border-white/10",
      desc: "Verified client rating and total completed review count from real escrow orders on this specific service.",
    },
    {
      name: "Open",
      icon: null,
      badgeClass:
        "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      desc: "Indicates the creator has available queue slots and is actively accepting new client orders right now.",
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
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HelpCircle className="w-4 h-4" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            How Services Ranking & The "Rising" Badge Work
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Our marketplace uses a <strong>100-Point Fair Discovery Ranking</strong> so talented new creators with complete portfolios can compete right alongside established pros.
        </p>
      </div>

      {/* 4 Ranking Pillars */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            The 4 Pillars of Service Discovery (100 Points Total)
          </h3>
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            Default sort when browsing All Services
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rankingPillars.map((p) => (
            <div
              key={p.num}
              className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-zinc-200 text-xs font-mono font-bold flex items-center justify-center border border-gray-200/80 dark:border-white/10">
                    {p.num}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${p.badgeClass}`}
                  >
                    {p.weight}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
                  {p.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Earn the Rising Badge + Badge Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Rising Creator Checklist (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative overflow-hidden inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                <TrendingUp className="relative z-10 h-3 w-3" />
                <span className="relative z-10">Rising</span>
                <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/35 dark:via-emerald-300/25 to-transparent pointer-events-none" />
              </span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                How to Unlock the "Rising" Badge
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Requires 85%+ Completeness Score
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
            New services published within the last <strong>7 days</strong> (with fewer than 3 orders and 0 reviews) automatically earn the{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">Rising</strong> badge and top-row placement when you complete at least <strong>85%</strong> of this setup checklist:
          </p>

          <div className="space-y-2.5">
            {risingChecklist.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5"
              >
                <span className="w-14 shrink-0 font-mono font-bold px-2 py-0.5 rounded text-center border text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  {item.points}
                </span>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Service Card Badges & Comparison (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3 flex-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Service Card Badges Explained
            </h3>
            <div className="space-y-2.5">
              {badgeLegend.map((b) => (
                <div
                  key={b.name}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <span
                    className={`w-24 shrink-0 inline-flex items-center justify-center gap-1 font-bold px-2 py-0.5 rounded text-center border text-[10px] ${b.badgeClass}`}
                  >
                    {b.icon}
                    <span className="relative z-10">{b.name}</span>
                    {(b as any).shine && (
                      <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/35 dark:via-emerald-300/25 to-transparent pointer-events-none" />
                    )}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                    {b.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Example Card */}
          <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Why Complete Newcomers Beat Incomplete Posts</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              A brand-new creator who fills out all 3 tiers, uploads 3+ portfolio clips, and sets clear milestones scores up to <strong>91.8 / 100</strong> on Day 1—appearing right alongside 5.0★ veterans, while a 1-sentence incomplete post drops to the bottom.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                You can also edit an existing service anytime to boost its completeness score!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Ready to Earn Your "Rising" Badge?
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Publish a complete service with 3 tiers, gallery samples, and milestones to get featured in the discovery spotlight.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/gigs/services")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors"
          >
            <span>Browse Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateService}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shadow-xs active:scale-98"
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
