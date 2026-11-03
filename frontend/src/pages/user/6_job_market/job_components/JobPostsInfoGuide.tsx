import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Plus,
  Loader2,
  Briefcase,
  SlidersHorizontal,
  Sparkles,
  FileText,
  ShieldCheck,
  Activity,
  HelpCircle,
  Clock,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Lightbulb,
} from "lucide-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

export type ScoreOrigin = "all" | "job_post" | "account" | "market";

export interface ScoreBasisFactor {
  rank: string;
  name: string;
  origin: "job_post" | "account" | "market";
  originLabel: string;
  points: string;
  percentage: string;
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
  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");

  const scoringFactors: ScoreBasisFactor[] = [
    // --- Group 1: Job Post Content (You Control / Editable Anytime) ---
    {
      rank: "01",
      name: "Proper Title & Plain-Text Scope",
      origin: "job_post",
      originLabel: "Job Post Content",
      points: "7.50 pts",
      percentage: "7.50%",
      canBeChanged: "Editable Anytime",
      changeBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks: "Evaluates title clarity (15–100 chars, 3+ words = +2.50 pts) and strips HTML tags to verify 150+ characters of real deliverables scope (+5.00 pts).",
      howToImprove: "Click Edit Post on your listing to lengthen scope description and provide a descriptive, professional title.",
    },
    {
      rank: "02",
      name: "Budget Realism & Focused Spread",
      origin: "job_post",
      originLabel: "Job Post Content",
      points: "6.25 pts",
      percentage: "6.25%",
      canBeChanged: "Editable Anytime",
      changeBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks: "Open Bid floor ≥ 300 Credits; or Budget Range bracket where Min ≥ 250 Credits and Max budget is within 3x of Min budget.",
      howToImprove: "Avoid ultra-wide brackets (e.g. 100 to 5,000) or sub-minimum budgets; set realistic rates matching industry norms.",
    },
    {
      rank: "03",
      name: "True Custom Thumbnail & Attachments",
      origin: "job_post",
      originLabel: "Job Post Content",
      points: "5.00 pts",
      percentage: "5.00%",
      canBeChanged: "Editable Anytime",
      changeBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks: "Verifies an uploaded custom cover image or reference brief attachments (preset default /job_banners/ do not qualify).",
      howToImprove: "Upload a real video thumbnail, brand asset, or attach reference PDF briefs in your post editor.",
    },
    {
      rank: "04",
      name: "Skill Tag Specificity & Match",
      origin: "job_post",
      originLabel: "Job Post Content",
      points: "3.75 pts (+2.0 bonus)",
      percentage: "3.75% (+2.0% bonus)",
      canBeChanged: "Editable Anytime",
      changeBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks: "Requires at least 3 relevant skill tags. Also awards up to +2.0 bonus points when tags match the browsing freelancer's profile skills.",
      howToImprove: "Add 3 or more precise tags (e.g. Color Grading, Blender, Sound Design) to maximize candidate matching.",
    },
    {
      rank: "05",
      name: "Timeline, Workflow Terms & Screening",
      origin: "job_post",
      originLabel: "Job Post Content",
      points: "2.50 pts",
      percentage: "2.50%",
      canBeChanged: "Editable Anytime",
      changeBadgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      howItWorks: "Delivery turnaround timeline specified plus NDA / Portfolio workflow rules, screening questions, or team milestone breakdown.",
      howToImprove: "Specify your turnaround timeline and fill out project milestone or screening preferences in your post editor.",
    },

    // --- Group 2: Poster Account Standing (Tied to Your User Profile) ---
    {
      rank: "06",
      name: "Bayesian Client Star Rating (4.2★ Prior)",
      origin: "account",
      originLabel: "Account Profile",
      points: "22.75 pts",
      percentage: "22.75%",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks: "Smooths ratings with a 3-review confidence prior at 4.2★ ((v*R + 3*4.2)/(v + 3)). First-time clients start at a fair 4.2★ baseline instead of 0.",
      howToImprove: "Earn 5-star ratings from freelancers on completed project contracts.",
    },
    {
      rank: "07",
      name: "Client Platform Merit Score (0–100)",
      origin: "account",
      originLabel: "Account Profile",
      points: "7.70 pts",
      percentage: "7.70%",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks: "Calculated as clamp(100 - active_warnings, 0, 100). Trusted (100) clients earn full points; warned accounts step back.",
      howToImprove: "Follow community guidelines, maintain professional escrow communication, and avoid platform violations.",
    },
    {
      rank: "08",
      name: "Client Historical Hire Rate",
      origin: "account",
      originLabel: "Account Profile",
      points: "4.55 pts",
      percentage: "4.55%",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks: "Rewards clients who consistently hire from their job posts (hired / total posts). New clients start at a 100% baseline.",
      howToImprove: "Hire qualified applicants from your pitch pool rather than letting valid listings expire unfilled.",
    },
    {
      rank: "09",
      name: "Subscription Profile Visibility Boost",
      origin: "account",
      originLabel: "Account Profile",
      points: "Up to +9.0 pts",
      percentage: "Up to +9.0%",
      canBeChanged: "Dynamic (Account)",
      changeBadgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      howItWorks: "Direct boost based on active membership: Business (+90 visibility = +9.0 pts), Premium (+30 visibility = +3.0 pts), Free (+0.0 pts).",
      howToImprove: "Upgrade or manage your subscription in Settings. Shows as a badge on cards and boosts discovery roll.",
    },

    // --- Group 3: Live Market & Community Signals (Real-Time Dynamics) ---
    {
      rank: "10",
      name: "Dynamic Intake Window Freshness (12h–14d)",
      origin: "market",
      originLabel: "Live Market Signals",
      points: "19.50 pts",
      percentage: "19.50%",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks: "Adapts dynamically to the job's chosen window (12h, 24h, 3d, 7d, or 14d). Starts at 90–100% freshness and rebounds in final 25% if proposals < 3.",
      howToImprove: "Fresh posts start with maximum points. If your window is expiring with open seats, you can extend the deadline.",
    },
    {
      rank: "11",
      name: "Low Proposal Congestion per Open Seat",
      origin: "market",
      originLabel: "Live Market Signals",
      points: "15.00 pts",
      percentage: "15.00%",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks: "Prioritizes jobs with 0–2 proposals per open seat (proposals / openSeats) so unfilled listings get discovered first.",
      howToImprove: "High by default on newly published jobs; decreases naturally as proposals pile up to protect applicant diversity.",
    },
    {
      rank: "12",
      name: "Community Saves from Other Users",
      origin: "market",
      originLabel: "Live Market Signals",
      points: "3.75 pts",
      percentage: "3.75%",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks: "Logarithmic boost from freelancer bookmarks (saturating at 5+ saves; owner's own bookmark excluded).",
      howToImprove: "Detailed briefs, fair budgets, and compelling custom thumbnails naturally encourage more creators to bookmark your post.",
    },
    {
      rank: "13",
      name: "Application Window Urgency (< 24h)",
      origin: "market",
      originLabel: "Live Market Signals",
      points: "1.75 pts",
      percentage: "1.75%",
      canBeChanged: "Dynamic (Live Market)",
      changeBadgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      howItWorks: "Grants a last-call visibility boost when < 24h (or < 25%) remains on the application window and proposals per seat < 3.",
      howToImprove: "Automatic system trigger that rescues under-pitched listings right before their window concludes.",
    },
  ];

  const jobStatuses = [
    {
      name: "Open",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      summary: "Actively accepting proposals within application window",
      desc: "Job is live on the marketplace. A live countdown timer shows remaining application intake time (12h, 24h, 3d, 7d, 14d). Freelancers can submit pitches (10 credits submission fee).",
    },
    {
      name: "Closed",
      badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      summary: "Intake concluded; proposals locked",
      desc: "Application window has expired, required seats were hired, or author closed early. Submissions are locked. If closed without a hire, applicant submission fees are refunded automatically.",
    },
  ];

  const refundPolicies = [
    {
      title: "Client 100% Posting Fee Refund",
      amount: "50 Credits Refunded",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      desc: "If an open job receives 0 proposals during its active window, or if the client force-closes the job with 0 proposals, the 50-credit posting fee is immediately refunded back to the client wallet.",
    },
    {
      title: "Freelancer 100% Submission Fee Refund",
      amount: "10 Credits Per Applicant",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
      desc: "If a job's application window expires without the client hiring anyone, all applicant submission fees (10 credits each) are returned immediately to the freelancers' wallets.",
    },
    {
      title: "Application Window Presets",
      amount: "12h · 24h · 3d · 7d · 14d",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      desc: "Clients choose how long their job post collects proposals. A live countdown timer is shown on the job details page for full transparency to both clients and applicants.",
    },
  ];

  const jobTypeCriteria = [
    {
      type: "Budget Range Format",
      badge: "Min – Max Range",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
      icon: <Briefcase className="h-4 w-4 text-emerald-500 shrink-0" />,
      desc: "Client defines a minimum and maximum budget bracket. Proposers define their phased milestone delivery within this ceiling.",
      rows: [
        { criteria: "Proper Title & Plain-Text Scope", weight: "+30%", rule: "Descriptive title (15–100 chars, 3+ words = +10%) plus detailed plain-text scope description (150+ characters = +20%)." },
        { criteria: "Focused Min–Max Budget Spread", weight: "+25%", rule: "Realistic budget bracket (Min ≥ 250 Credits) where Max budget is within 3x of Min budget." },
        { criteria: "True Custom Thumbnail or Brief Files", weight: "+20%", rule: "Uploaded custom cover image (not default preset banners) or attached reference brief files." },
        { criteria: "Required Skill Tags", weight: "+15%", rule: "At least 3 relevant skill tags for accurate candidate matching and personalized feed discovery." },
        { criteria: "Timeline, Terms & Screening", weight: "+10%", rule: "Delivery timeline specified plus NDA/Portfolio terms, screening questions, or milestones." },
      ],
    },
    {
      type: "Open Bid Format",
      badge: "Floor Benchmark",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
      icon: <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />,
      desc: "Client sets a minimum starting floor with no upper ceiling. Proposers pitch their own custom roadmap rates and terms.",
      rows: [
        { criteria: "Proper Title & Detailed Scope", weight: "+30%", rule: "Descriptive title (15–100 chars, 3+ words = +10%) plus plain-text deliverables scope (150+ characters = +20%)." },
        { criteria: "Realistic Floor Benchmark", weight: "+25%", rule: "Minimum starting budget floor is set to at least 300 Credits." },
        { criteria: "True Custom Thumbnail or Brief Files", weight: "+20%", rule: "Uploaded custom project cover image (excluding preset default banners) or reference brief attachments." },
        { criteria: "Relevant Skill Tags", weight: "+15%", rule: "At least 3 specific skill tags added (e.g. Color Grading, Premiere Pro, Sound Design)." },
        { criteria: "Timeline & Workflow Terms", weight: "+10%", rule: "Delivery timeline specified and Portfolio / NDA / Screening preferences selected." },
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
      condition: "Active intake window (≥ 25% window remaining or ≤ 3d old), < 3 proposals per open seat, client reviews = 0, Client Merit ≥ 95, AND Brief Quality Score ≥ 85%.",
      effect: "Grants prominent visibility on Job Market browse and Home page Latest Job Posts.",
    },
    {
      name: "Open",
      badge: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
          Open
        </span>
      ),
      condition: "Active within application intake window with open hiring seats remaining.",
      effect: "Actively accepting proposals from creators. A live countdown timer displays remaining intake time.",
    },
    {
      name: "Closed",
      badge: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40">
          Closed
        </span>
      ),
      condition: "Application window countdown expired, positions filled, or job closed early by author with 0 proposals.",
      effect: "Proposal submissions are locked. Automated refunds are processed (50c client refund if 0 applicants; 10c proposal refunds if closed without hire).",
    },
    {
      name: "Budget Range",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-semibold shadow-2xs">
          <span>Budget Range</span>
        </span>
      ),
      condition: "Client specifies min and max budget ceiling.",
      effect: "Proposals are submitted with milestone roadmaps at or below the max budget ceiling.",
    },
    {
      name: "Open Bid",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[11px] font-semibold shadow-2xs">
          <Sparkles className="h-3 w-3" />
          <span>Open Bid</span>
        </span>
      ),
      condition: "Client provides starting floor without an upper ceiling constraint.",
      effect: "Freelancers and studios can propose their custom rate and delivery milestones without limits.",
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
    <div
      className="space-y-6 w-full animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {/* Header - Strictly No Icon Beside Title */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Job Market Ranking, Lifecycle & Status Guide
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-4xl">
          Jobs on the platform are ordered using a <strong>100-Point Type-Aware Discovery Algorithm</strong> and operate on transparent application windows with automated refund protections.
        </p>
      </div>

      {/* Section: Job Listing Lifecycle: Open vs Closed */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Job Listing Statuses (Open vs Closed)
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Job listings are strictly categorized as <strong>Open</strong> or <strong>Closed</strong> across all marketplace browsing lists.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {jobStatuses.map((js) => (
            <div
              key={js.name}
              className="p-4 rounded-xl border border-gray-200/90 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${js.badgeClass}`}>
                  {js.name}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                  {js.summary}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {js.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Application Window & Automated Refund Guarantees */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-l-4 border-l-amber-400 pl-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Application Window Intake & Automated Refunds
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Every published job post has a set window and guaranteed automatic refunds to protect user balances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {refundPolicies.map((rp) => (
            <div
              key={rp.title}
              className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col justify-between space-y-3"
            >
              <div>
                <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold mb-2 ${rp.badgeClass}`}>
                  {rp.amount}
                </span>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  {rp.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {rp.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Score Basis & Actionability (Separated by Origin & Editability) */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                How Scoring Works: Score Basis & Actionability
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Know exactly where your score comes from, which factors you can edit right now, and which ones update dynamically with your reputation or live market demand.
            </p>
          </div>

          {/* Controls: View Mode Switcher + Category Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: Visual Cards vs Table View */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "visual"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Visual Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table View</span>
              </button>
            </div>

            {/* Interactive Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOriginFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  originFilter === "all"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10"
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

        {/* Actionability Legend Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50/60 dark:bg-white/[0.015] border-b border-gray-200 dark:border-white/10 text-[11px]">
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              Editable Anytime
            </span>
            <span className="text-gray-600 dark:text-zinc-400">
              Derived directly from your job post details. You can improve these anytime by clicking <strong>Edit Post</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
              Dynamic (Account)
            </span>
            <span className="text-gray-600 dark:text-zinc-400">
              Tied to your user profile: 5★ client reviews, 100 Platform Merit, hire rate, and subscription membership plan.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
              Dynamic (Live Market)
            </span>
            <span className="text-gray-600 dark:text-zinc-400">
              Real-time marketplace signals: uncrowded seats, application countdown decay, community saves, and last-call urgency.
            </span>
          </div>
        </div>

        {/* Content View: Visual Cards View vs Table View */}
        {viewMode === "visual" ? (
          <div className="p-5 space-y-6">
            {/* Group 1: Job Post Content */}
            {(originFilter === "all" || originFilter === "job_post") && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Group 1: Job Post Content
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                        You control these directly. Improve anytime by clicking <strong>Edit Post</strong> on your listing.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                    25.00 pts Max (25.00%)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {scoringFactors
                    .filter((sig) => sig.origin === "job_post")
                    .map((sig) => (
                      <div
                        key={sig.name}
                        className="rounded-xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-gray-400 dark:text-zinc-500">
                                #{sig.rank}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sig.changeBadgeClass}`}>
                                {sig.canBeChanged}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-gray-300/80 dark:border-white/15">
                                {sig.points}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                {sig.percentage}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                            {sig.name}
                          </h4>

                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {sig.howItWorks}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/40 dark:border-emerald-500/10 text-[11px]">
                            <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-emerald-900 dark:text-emerald-200 leading-snug">
                              <strong className="font-bold">Tip: </strong>
                              {sig.howToImprove}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Group 2: Account Profile */}
            {(originFilter === "all" || originFilter === "account") && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Group 2: Poster Account Standing
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Tied to your user standing: 5★ client reviews, 100 Platform Merit, hire reliability, and active subscription boost.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                    35.00 pts Base + Up to +9.0 pts Boost
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {scoringFactors
                    .filter((sig) => sig.origin === "account")
                    .map((sig) => (
                      <div
                        key={sig.name}
                        className="rounded-xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-gray-400 dark:text-zinc-500">
                                #{sig.rank}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sig.changeBadgeClass}`}>
                                {sig.canBeChanged}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-gray-300/80 dark:border-white/15">
                                {sig.points}
                              </span>
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                                {sig.percentage}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                            {sig.name}
                          </h4>

                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {sig.howItWorks}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/40 dark:border-blue-500/10 text-[11px]">
                            <Lightbulb className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-blue-900 dark:text-blue-200 leading-snug">
                              <strong className="font-bold">Tip: </strong>
                              {sig.howToImprove}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Group 3: Live Market Signals */}
            {(originFilter === "all" || originFilter === "market") && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Group 3: Live Market Signals
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Real-time dynamic signals: low proposal competition per seat, intake window freshness decay, and last-call rescue.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                    40.00 pts Max (40.00%)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {scoringFactors
                    .filter((sig) => sig.origin === "market")
                    .map((sig) => (
                      <div
                        key={sig.name}
                        className="rounded-xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-gray-400 dark:text-zinc-500">
                                #{sig.rank}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sig.changeBadgeClass}`}>
                                {sig.canBeChanged}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-gray-300/80 dark:border-white/15">
                                {sig.points}
                              </span>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                                {sig.percentage}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                            {sig.name}
                          </h4>

                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {sig.howItWorks}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/40 dark:border-amber-500/10 text-[11px]">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-amber-900 dark:text-amber-200 leading-snug">
                              <strong className="font-bold">Tip: </strong>
                              {sig.howToImprove}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400">
                  <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                  <th className="py-3 px-4 font-semibold w-60">Scoring Factor</th>
                  <th className="py-3 px-4 font-semibold w-28 text-center">Impact / Weight</th>
                  <th className="py-3 px-4 font-semibold w-36 text-center">Can It Be Changed?</th>
                  <th className="py-3 px-4 font-semibold min-w-[280px]">How It Is Calculated</th>
                  <th className="py-3 px-4 font-semibold min-w-[260px]">How To Improve Your Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {scoringFactors
                  .filter((item) => originFilter === "all" || item.origin === originFilter)
                  .map((sig) => (
                    <tr
                      key={sig.name}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-400 dark:text-zinc-500 text-center">
                        #{sig.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white leading-tight">
                          {sig.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                          {sig.origin === "job_post" && <FileText className="h-2.5 w-2.5 text-emerald-500" />}
                          {sig.origin === "account" && <ShieldCheck className="h-2.5 w-2.5 text-blue-500" />}
                          {sig.origin === "market" && <Activity className="h-2.5 w-2.5 text-amber-500" />}
                          <span>{sig.originLabel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-gray-300/80 dark:border-white/15">
                          {sig.points}
                        </span>
                        <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {sig.percentage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${sig.changeBadgeClass}`}>
                          {sig.canBeChanged}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                        {sig.howItWorks}
                      </td>
                      <td className="py-3.5 px-4 text-gray-800 dark:text-zinc-200 text-[11px] font-medium leading-relaxed">
                        {sig.howToImprove}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Discovery Roll & Dev Mode Note */}
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 border-t border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-indigo-900 dark:text-indigo-200">
              Score-Weighted Random Sampling & Dev Mode (Alt + O)
            </span>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              On every page refresh, listings add a bounded bell-curve roll (±14 pts) so high-scoring jobs dominate top positions while keeping the feed dynamic. Press <strong>Alt + O</strong> anywhere on the marketplace to inspect exact scores, rolls, and subscription boosts on any thumbnail.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-400/30">
            Alt + O
          </span>
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
            Job Card Badges & Status Indicators
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Clear visual status and qualification tags displayed on job cards and listings.
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
            disabled={isCheckingAccess}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors shadow-xs ${
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
