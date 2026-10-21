import React from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Star,
  CheckCircle2,
  ArrowRight,
  Plus,
  HelpCircle,
  User,
  Users,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

export const JobPostsInfoGuide: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const rankingPillars = [
    {
      num: "01",
      weight: "35 pts",
      title: "Client Trust & Baseline",
      detail: "Client Review Score (Bayesian Weighted)",
      rules:
        "5.0★ clients receive full 35 pts. Brand-new clients with 0 reviews start at a fair 4.2★ baseline (29.4 pts), so first-time job posts are never buried.",
    },
    {
      num: "02",
      weight: "25 pts",
      title: "14-Day New Job Spotlight",
      detail: "Days since publication + applicant count",
      rules:
        "New jobs (< 7 days old) with fewer than 3 proposals per seat get the full 25 pts. Tapers smoothly to 0 after 14 days as proposals accumulate.",
    },
    {
      num: "03",
      weight: "25 pts",
      title: "Type-Aware Brief Quality",
      detail: "Scope, budget realism, skills & attachments",
      rules:
        "Evaluated against tailored criteria for Open Bid, Budget Range, or Team Milestone Pool jobs. Reaching 85%+ quality unlocks the Rising badge.",
    },
    {
      num: "04",
      weight: "15 pts",
      title: "Seat-Aware Open Capacity",
      detail: "Proposals per open hiring seat",
      rules:
        "Measures competition per seat. When an individual job reaches 15+ proposals (or all seats are hired), it steps back so unapplied jobs rise to the top.",
    },
  ];

  const jobTypeCriteria = [
    {
      type: "Individual — Open Bid",
      badge: "Floor Benchmark",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
      icon: <User className="h-4 w-4 text-blue-500 shrink-0" />,
      desc: "Client sets a minimum starting floor; freelancers pitch their custom milestones and pricing.",
      rows: [
        { criteria: "Detailed Scope of Work", weight: "+30%", rule: "Description contains 150+ characters describing deliverables and project context." },
        { criteria: "Realistic Floor Benchmark", weight: "+20%", rule: "Minimum budget is set to at least 300 Credits." },
        { criteria: "Relevant Skill Tags", weight: "+20%", rule: "At least 3 specific tags added (e.g. Color Grading, Premiere Pro, Sound Design)." },
        { criteria: "Custom Visual / Cover", weight: "+15%", rule: "Uploaded custom project thumbnail image or reference brief attachments." },
        { criteria: "Timeline & Workflow Terms", weight: "+15%", rule: "Delivery timeline specified and Portfolio / NDA usage preferences selected." },
      ],
    },
    {
      type: "Individual — Budget Range",
      badge: "Min – Max Range",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
      icon: <Briefcase className="h-4 w-4 text-emerald-500 shrink-0" />,
      desc: "Client defines a fixed minimum and maximum budget bracket for 1 or more seats.",
      rows: [
        { criteria: "Project Deliverables Scope", weight: "+25%", rule: "Clear scope and deliverables explanation (140+ characters)." },
        { criteria: "Focused Min–Max Spread", weight: "+25%", rule: "Realistic budget span where Max budget is within 3x of Min budget." },
        { criteria: "Required Skill Tags", weight: "+15%", rule: "At least 3 relevant skill tags for accurate candidate matching." },
        { criteria: "Visual Cover or Attachments", weight: "+15%", rule: "Project cover image or supporting reference files provided." },
        { criteria: "Timeline & Screening", weight: "+20%", rule: "Timeline range provided plus screening questions or delivery expectations." },
      ],
    },
    {
      type: "Team — Milestone Pool",
      badge: "Shared Credit Pool",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
      icon: <Users className="h-4 w-4 text-purple-500 shrink-0" />,
      desc: "Multi-role production where a collective budget pool is distributed across structured milestones.",
      rows: [
        { criteria: "Structured Milestone Shares", weight: "+30%", rule: "2 or more milestone phases defined with credit % allocations and seat counts." },
        { criteria: "Milestone Task Checklists", weight: "+20%", rule: "Specific task breakdown defined inside each milestone phase." },
        { criteria: "Comprehensive Production Brief", weight: "+20%", rule: "Detailed overview explaining team workflow and production goals (140+ chars)." },
        { criteria: "Multi-Disciplinary Skills", weight: "+15%", rule: "At least 3 relevant skill tags spanning the required specialist roles." },
        { criteria: "Cover Visual & Schedule", weight: "+15%", rule: "Custom cover visual and realistic production timeline attached." },
      ],
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
      condition: "Job age ≤ 7 days, < 3 proposals per seat, client reviews = 0, AND Brief Quality Score ≥ 85%.",
      effect: "Grants prominent visibility on Job Market browse and Home page Latest Job Posts.",
    },
    {
      name: "Individual",
      badge: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
          <User className="h-2.5 w-2.5" />
          Individual
        </span>
      ),
      condition: "Single-freelancer or multi-seat individual hiring model.",
      effect: "Freelancers submit direct proposals with their own rate and milestones.",
    },
    {
      name: "Team Project",
      badge: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
          <Users className="h-2.5 w-2.5" />
          Team Project
        </span>
      ),
      condition: "Multi-creator milestone pool hiring model.",
      effect: "Freelancers apply for dedicated milestone roles from a shared credit pool.",
    },
    {
      name: "Open",
      badge: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
          Open
        </span>
      ),
      condition: "Unfilled hiring seats remain available.",
      effect: "Actively accepting proposals from all eligible creators.",
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
        <div className="flex items-center gap-2 mb-1.5">
          <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300">
            <HelpCircle className="w-4 h-4" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            How Job Market Ranking & The "Rising" Badge Work
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
          Jobs on the platform are ordered using a <strong>100-Point Type-Aware Discovery Algorithm</strong>.
          This ensures new clients who write comprehensive briefs and set fair budgets compete equally
          with established clients, while keeping fresh opportunities visible to freelancers.
        </p>
      </div>

      {/* Section 1: The 4 Scoring Pillars (Clean Table) */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              The 4 Scoring Pillars (100 Points Total)
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            Default sort order for All Job Postings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400">
                <th className="py-3 px-4 font-semibold w-16">Pillar</th>
                <th className="py-3 px-4 font-semibold w-24 text-center">Max Pts</th>
                <th className="py-3 px-4 font-semibold w-56">Metric</th>
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
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10">
                      {p.weight}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900 dark:text-white">{p.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">{p.detail}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-300 leading-relaxed">
                    {p.rules}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Type-Aware Quality Checklists (Tables) */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Type-Aware Brief Quality Checklists</span>
              <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                (Pillar 03 — 25 Points)
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Reach at least <strong>85%</strong> on your job type's checklist to qualify for the green <strong>Rising</strong> badge.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {jobTypeCriteria.map((group) => (
            <div
              key={group.type}
              className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {group.type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${group.badgeClass}`}>
                    {group.badge}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {group.desc}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-zinc-400">
                      <th className="py-2 px-4 font-semibold w-1/4">Criteria</th>
                      <th className="py-2 px-4 font-semibold w-20 text-center">Score</th>
                      <th className="py-2 px-4 font-semibold">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {group.rows.map((row) => (
                      <tr
                        key={row.criteria}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"
                      >
                        <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{row.criteria}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                          {row.weight}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                          {row.rule}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Job Card Badges Reference Table */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Job Card Badges & Indicators
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Clear visual tags attached to each job card across browsing lists and details views.
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
            Ready to post a high-ranking job?
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Include deliverables scope, fair budget benchmark, and 3+ skill tags to unlock the Rising badge immediately.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/jobs/postings")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors cursor-pointer"
          >
            <span>Browse Jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreateJob}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shadow-xs active:scale-98 cursor-pointer"
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
