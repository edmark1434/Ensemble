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
  User,
  Users,
  Briefcase,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

export const JobPostsInfoGuide: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const rankingPillars = [
    {
      num: "01",
      weight: "35% Weight",
      title: "Client Trust & Fair Baseline",
      badgeClass:
        "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      desc: "Proven 5-star reviews from past freelancers boost a client's job post. First-time clients with 0 reviews aren't penalized—every new client starts at a fair 4.2★ baseline (29.4 / 35 pts).",
    },
    {
      num: "02",
      weight: "25% Weight",
      title: "14-Day New Job Spotlight",
      badgeClass:
        "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
      desc: "Newly posted jobs get a 2-week discovery boost so freelancers see fresh opportunities first. Jobs with fewer than 3 proposals per seat receive the full 100% spotlight boost.",
    },
    {
      num: "03",
      weight: "25% Weight",
      title: "Type-Aware Brief & Bid Quality",
      badgeClass:
        "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
      desc: "Clients control this 100% on Day 1. Because Open Bid, Ranged Bid, and Team Milestone Pool jobs have different structures, our algorithm grades each post against its own tailored checklist.",
    },
    {
      num: "04",
      weight: "15% Weight",
      title: "Open Seats & Proposal Congestion",
      badgeClass:
        "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
      desc: "Measures Proposals per Open Seat. When an individual job already has 15+ proposals (or all seats are filled), it steps back so jobs that still need applicants rise to the top.",
    },
  ];

  const jobTypeRules = [
    {
      type: "Individual — Open Bid",
      badge: "Open Bid (e.g. 1,800+)",
      icon: <User className="h-3.5 w-3.5 text-blue-500" />,
      headerClass:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      subtitle:
        "Client sets a starting floor and lets freelancers pitch their own quote & milestones.",
      items: [
        { pts: "+30%", text: "Detailed Scope of Work (150+ chars) so freelancers know what to quote" },
        { pts: "+20%", text: "Realistic starting floor benchmark (300+ Credits)" },
        { pts: "+20%", text: "At least 3 relevant skill tags (e.g., After Effects, Color Grading)" },
        { pts: "+15%", text: "Custom thumbnail banner or reference brief attachments" },
        { pts: "+15%", text: "Clear delivery timeline & workflow terms (Portfolio / NDA settings)" },
      ],
    },
    {
      type: "Individual — Ranged / Multi-Seat",
      badge: "Budget Range (e.g. 800 – 1,400)",
      icon: <Briefcase className="h-3.5 w-3.5 text-emerald-500" />,
      headerClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      subtitle:
        "Client sets a min–max target range for 1 or more individual seats.",
      items: [
        { pts: "+25%", text: "Clear project scope & deliverables breakdown (140+ chars)" },
        { pts: "+25%", text: "Focused Min–Max budget spread (Max within 3x of Min)" },
        { pts: "+15%", text: "At least 3 required skill tags for accurate skill-matching" },
        { pts: "+15%", text: "Custom thumbnail image or reference attachments" },
        { pts: "+20%", text: "Timeline range + screening questions or milestone phases" },
      ],
    },
    {
      type: "Team Job — Milestone Pool",
      badge: "Team Pool (e.g. 8,000 Pool)",
      icon: <Users className="h-3.5 w-3.5 text-purple-500" />,
      headerClass:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
      subtitle:
        "Multi-role production where a credit pool is split across structured milestones & slots.",
      items: [
        { pts: "+30%", text: "2+ structured Milestones with credit % shares & slot counts" },
        { pts: "+20%", text: "Specific task checklists & deliverables inside each milestone" },
        { pts: "+20%", text: "Comprehensive production brief & overview (140+ chars)" },
        { pts: "+15%", text: "3+ multi-disciplinary skill tags across the production roles" },
        { pts: "+15%", text: "Custom cover visual & realistic production timeline" },
      ],
    },
  ];

  const badgeLegend = [
    {
      name: "Rising",
      icon: <TrendingUp className="relative z-10 h-3 w-3" />,
      shine: true,
      badgeClass:
        "relative overflow-hidden bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      desc: "Awarded to fresh job posts (<= 7 days old, < 3 proposals per seat, 0 prior client reviews) that achieve 85%+ Brief & Bid Quality.",
    },
    {
      name: "Individual",
      icon: <User className="h-3 w-3" />,
      badgeClass:
        "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
      desc: "Single-freelancer or multi-seat individual hiring where each hired creator works on their own contract.",
    },
    {
      name: "Team Project",
      icon: <Users className="h-3 w-3" />,
      badgeClass:
        "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
      desc: "Collaborative multi-milestone production where specialists apply for dedicated milestone roles from a shared credit pool.",
    },
    {
      name: "Open",
      icon: null,
      badgeClass:
        "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      desc: "Indicates the job post still has unfilled seats and is actively accepting freelancer proposals.",
    },
  ];

  const handleCreateJob = () => {
    if (isGuestMode) {
      navigate("/login");
      return;
    }
    continueIfAccountVerified(
      () => navigate("/jobs/postings/choose"),
      false,
      "Account Verification is required to post a job. Please verify your identity to proceed."
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
            How Job Market Ranking & The "Rising" Badge Work
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Our Job Market uses a <strong>100-Point Type-Aware Discovery Algorithm</strong> so first-time clients with clear briefs and fair budgets get immediate freelancer attention—whether posting an <strong>Individual Open Bid</strong>, an <strong>Individual Ranged Budget</strong>, or a <strong>Team Milestone Pool</strong>.
        </p>
      </div>

      {/* 4 Ranking Pillars */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            The 4 Pillars of Job Discovery (100 Points Total)
          </h3>
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            Default sort when browsing Job Postings
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

      {/* Type-Aware Quality Checklists (3 Columns) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="relative overflow-hidden inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              <TrendingUp className="relative z-10 h-3 w-3" />
              <span className="relative z-10">Rising</span>
              <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/35 dark:via-emerald-300/25 to-transparent pointer-events-none" />
            </span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              How Brief Quality Is Graded by Job Type (Reach 85%+ to Unlock "Rising")
            </h3>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Tailored per Hiring & Budget Structure
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {jobTypeRules.map((rule) => (
            <div
              key={rule.type}
              className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    {rule.icon}
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {rule.type}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rule.headerClass}`}
                  >
                    {rule.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {rule.subtitle}
                </p>
                <div className="space-y-2 pt-1">
                  {rule.items.map((item) => (
                    <div
                      key={item.text}
                      className="flex items-start gap-2.5 p-2 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5"
                    >
                      <span className="w-12 shrink-0 font-mono font-bold px-1.5 py-0.5 rounded text-center border text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                        {item.pts}
                      </span>
                      <div className="text-xs text-gray-700 dark:text-zinc-300 leading-snug flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Badge Legend + Congestion Example */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Job Card Badges Explained
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {badgeLegend.map((b) => (
              <div
                key={b.name}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/60 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5"
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

        <div className="lg:col-span-5 bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Why Seat-Aware Congestion Matters</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              A <strong>Team Milestone Pool</strong> hiring <strong>5 creators</strong> across 4 milestones isn't crowded when it has 5 proposals (that's only 1 proposal per seat!). Meanwhile, a 1-seat Individual job with 12 proposals gently steps back so fresh, open jobs stay visible.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-white/5">
            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>
              Job owners can view their live <strong>Job Discovery Score</strong> breakdown directly on their own job posts.
            </span>
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
              Ready to Post a High-Visibility Job?
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Include a clear scope, realistic budget benchmark, and skill tags to earn the green Rising badge on Day 1.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/jobs/postings")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors"
          >
            <span>Browse Job Postings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateJob}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shadow-xs active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Job</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobPostsInfoGuide;
