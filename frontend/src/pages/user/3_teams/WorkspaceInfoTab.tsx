import React, { useState } from "react";
import {
  Info,
  ShieldCheck,
  Clock,
  Archive,
  Award,
  Briefcase,
  Sparkles,
  Layers,
  CheckCircle2,
  ChevronDown,
  Lock,
  RotateCcw,
  Video,
  FileText,
  HelpCircle,
  Coins,
  Users,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const WorkspaceInfoTab: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const workspaceTypes = [
    {
      type: "Job Workspace",
      badgeClass:
        "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      icon: Briefcase,
      iconColor: "text-blue-600 dark:text-blue-400",
      origin: "Job Market Hires & Custom Proposals",
      summary:
        "Provisioned when a client accepts a freelancer's custom proposal on a published Job Post.",
      characteristics: [
        "Milestones negotiated flexibly during proposal exchange",
        "Supports multi-freelancer staffing and studio teams",
        "Direct escrow deposit upon hiring the candidate",
        "Custom milestone schedules tailored to production needs",
      ],
      bestFor: "Complex productions, custom filming/editing workflows, multi-scene video revisions.",
    },
    {
      type: "Gig Workspace",
      badgeClass:
        "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
      icon: Sparkles,
      iconColor: "text-purple-600 dark:text-purple-400",
      origin: "Pre-Configured Service Package Orders",
      summary:
        "Auto-provisioned when a specialist reviews and accepts a buyer's gig package order, and the buyer funds escrow.",
      characteristics: [
        "Pre-defined Basic, Standard, or Premium tiers with fixed turnarounds",
        "Pre-populated taskboard milestones from package scope",
        "Specialist concurrent capacity protection (slots check)",
        "Direct link to client's selected video editor project",
      ],
      bestFor: "Turnkey edits, color grading, sound polish, YouTube cutdowns, and standardized deliverables.",
    },
  ];

  const lifecycleSteps = [
    {
      step: "01",
      status: "Waiting for Escrow",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
          <Clock className="w-3 h-3 text-blue-500" />
          Waiting
        </span>
      ),
      condition: "Proposal or Gig Order accepted; awaiting client escrow deposit authorization.",
      access: "Read-Only (Draft)",
      actions: "Client reviews final contract terms and authorizes credit deposit to platform escrow.",
    },
    {
      step: "02",
      status: "Active Collaboration",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      ),
      condition: "Escrow funded; contract active. Milestone 1 unlocked for task execution.",
      access: "Full Read & Write",
      actions:
        "Contributors update taskboard, collaborate in real-time, link video projects, and submit milestone deliverables.",
    },
    {
      step: "03",
      status: "Rate & Review (Double-Blind)",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
          <Eye className="w-3 h-3 text-amber-600" />
          Rate &amp; Review
        </span>
      ),
      condition: "All milestones approved and payouts released. 24-hour review grace period begins.",
      access: "Locked (Read-Only)",
      actions:
        "Taskboard locked. Both parties submit double-blind feedback and star ratings within 24 hours.",
    },
    {
      step: "04",
      status: "Archived Workspace",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
          <Archive className="w-3 h-3 text-purple-600" />
          Archived
        </span>
      ),
      condition: "Both reviews submitted or 24h timer expired. Reviews unsealed and published to public profiles.",
      access: "Read-Only (30 Days)",
      actions:
        "Retained for 30 days for inspection and download. Video projects remain permanently in owner's personal library.",
    },
    {
      step: "05",
      status: "Purged (Cleanup)",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          Purged
        </span>
      ),
      condition: "30 days elapsed since workspace archival.",
      access: "Purged (Cleanup)",
      actions:
        "Ephemeral task cards purged by retention worker. Invoices, financial ledgers, and video library remain permanent.",
    },
  ];

  const faqs = [
    {
      q: "What is the difference between a Job Workspace and a Gig Workspace?",
      a: "A Job Workspace is born from a Job Post where you evaluate custom proposals from applicants and negotiate bespoke milestone scopes. A Gig Workspace is provisioned automatically from a pre-configured Service Package (Basic, Standard, or Premium) with fixed delivery turnaround times and pre-populated taskboard milestones.",
    },
    {
      q: "Where does the linked video project live?",
      a: "The underlying video project always lives permanently in your personal Video Projects Library. The Contractual Workspace simply provides a shared collaborative bridge for editors and clients. Even when a workspace is archived or purged after 30 days, your video project and all rendered exports remain 100% safe in your personal library.",
    },
    {
      q: "How does Sequential Milestone Unlocking work?",
      a: "To prevent scope creep and ensure fair delivery, milestone funds are held in platform escrow. Milestone 1 unlocks immediately upon contract activation. Milestone 2 remains locked until the client reviews and approves Milestone 1's deliverable on the Submissions tab. Once approved, escrow funds release instantly to the specialist and Milestone 2 automatically unlocks.",
    },
    {
      q: "Who is responsible for marking tasks done on the taskboard?",
      a: "Freelancers and specialists manage and check off their own task cards on the Taskboard tab. Clients do not micromanage individual task progress—the client's role is to inspect the final milestone package on the Submissions tab and approve or request revisions.",
    },
    {
      q: "How does the Double-Blind Review system protect me?",
      a: "Neither party can see the other's star rating or written testimonial until BOTH have submitted, or until the 24-hour review timer expires. This eliminates retaliatory reviews and ensures genuine feedback.",
    },
    {
      q: "What happens if a revision is required?",
      a: "Every milestone includes 2 revision rounds. If the submitted work requires edits, the client can submit specific timestamped feedback and revision notes. The specialist makes the changes and submits the updated version without needing a new contract.",
    },
  ];

  return (
    <div
      className="space-y-8 animate-in fade-in duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header Banner */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Contractual Workspace Guide &amp; Operational Policies
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  Escrow Protected
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-3xl leading-relaxed">
                Every approved job hire and accepted service package automatically provisions a dedicated, collaborative
                Contractual Workspace. Review workspace classifications, sequential milestone locking, double-blind review
                protocols, and data retention rules below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 block font-mono">
                Escrow Hold
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Vault</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 block font-mono">
                Review Window
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">24h Grace</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 block font-mono">
                Archive Grace
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">30 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Workspace Types (Job vs Gig) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>1. Workspace Types: Job Workspace vs. Gig Workspace</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Workspaces are automatically categorized by their originating contract type so you always know their workflow characteristics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaceTypes.map((w) => {
            const Icon = w.icon;
            return (
              <div
                key={w.type}
                className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${w.badgeClass}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{w.type}</span>
                    </span>
                    <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                      Origin: {w.origin.split(" ")[0]}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-zinc-300 font-medium leading-relaxed">
                    {w.summary}
                  </p>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                      Key Highlights
                    </span>
                    <ul className="space-y-1.5">
                      {w.characteristics.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    <strong className="text-gray-800 dark:text-zinc-200 font-semibold">Best Suited For: </strong>
                    {w.bestFor}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Workspace Lifecycle & Status Transitions */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              2. Workspace Lifecycle &amp; Status Transitions
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            Full 5-Stage Automated State Machine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/[0.02] text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5 w-12 text-center">Stage</th>
                <th className="py-3 px-5 w-40">Workspace Status</th>
                <th className="py-3 px-5 w-1/3">Trigger / Operational Condition</th>
                <th className="py-3 px-5 w-36">Access Mode</th>
                <th className="py-3 px-5">Available Actions &amp; Collaboration Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              {lifecycleSteps.map((s) => (
                <tr key={s.step} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-center text-gray-400 dark:text-zinc-500">
                    {s.step}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">{s.badge}</td>
                  <td className="py-3.5 px-5 text-gray-800 dark:text-zinc-200 font-medium leading-relaxed">
                    {s.condition}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {s.access}
                  </td>
                  <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                    {s.actions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Sequential Milestone Escrow Architecture */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              3. Sequential Milestone Escrow &amp; Revision Rules
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            How platform vault protection guarantees fair payment release without risk of unauthorized chargebacks.
          </p>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <Coins className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                100% Escrow Vault Lock
              </h3>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
              When a contract activates, the full budget is deposited directly into the platform's secure escrow vault. Freelancers work with 100% confidence that funds exist, while clients retain inspection rights before payouts release.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                <Lock className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                Sequential Milestone Unlocking
              </h3>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
              Milestone 2 cannot be submitted until Milestone 1 deliverable is approved by the client. This enforces structured progress, clear check-ins, and eliminates out-of-order execution surprises.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400">
                <RotateCcw className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                2 Included Revision Rounds
              </h3>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
              Every milestone comes standard with 2 included revision rounds. Clients submit clear timestamped feedback, and specialists refine the edit. Additional work outside scope is billed per package terms.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Double-Blind Review Protocols */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              4. Double-Blind Review Protocols
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            Zero Retaliation Guarantee
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/[0.02] text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5 w-48">Protocol Component</th>
                <th className="py-3 px-5">Rule Specification</th>
                <th className="py-3 px-5 w-1/3">Enforcement Objective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white">Double-Blind Sealing</td>
                <td className="py-3.5 px-5 leading-relaxed">
                  Neither client nor freelancer can view the other party's star rating or written feedback until both parties submit.
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Guarantees 100% honest, uninfluenced ratings and prevents retaliatory scoring.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white">24-Hour Review Window</td>
                <td className="py-3.5 px-5 leading-relaxed">
                  A strict 24-hour countdown timer initiates when final milestone approval occurs.
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Ensures timely completion and immediate crediting of earned badges and reviews to user portfolios.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white">Automatic Grace Expiration</td>
                <td className="py-3.5 px-5 leading-relaxed">
                  If only one party reviews within 24 hours, the seal automatically lifts and their submitted review is published.
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Protects responsive users from having their ratings delayed by an unresponsive counterparty.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white">Star rating averages</td>
                <td className="py-3.5 px-5 leading-relaxed">
                  Reviews feed into Bayesian-weighted star rating averages on the public profile.
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Unlocks creator perks, raises service rankings, and boosts hiring trustworthiness across the platform.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Data Retention & Video Project Library Safety */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              5. Data Retention &amp; Permanent Preservation Rules
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            What is kept permanently versus what is automatically cleaned up after the 30-day archival window.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/[0.02] text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5 w-48">Asset Category</th>
                <th className="py-3 px-5 w-40">Retention Duration</th>
                <th className="py-3 px-5">Policy Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Linked Video Projects</span>
                </td>
                <td className="py-3.5 px-5 font-bold text-emerald-600 dark:text-emerald-400">
                  Permanent (Owner Library)
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  <strong>The actual video project in the Video Editor is NEVER deleted.</strong> It remains safely in the owner's personal Projects Library forever. Only the collaborative workspace view is retired after 30 days.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span>Financial Ledgers &amp; Invoices</span>
                </td>
                <td className="py-3.5 px-5 font-bold text-emerald-600 dark:text-emerald-400">
                  Permanent (Immutable)
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  All transaction history, escrow milestones, and invoices are retained indefinitely for tax and accounting compliance.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Reviews &amp; Public Testimonials</span>
                </td>
                <td className="py-3.5 px-5 font-bold text-emerald-600 dark:text-emerald-400">
                  Permanent
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Submitted star ratings and client reviews remain permanently attached to user profiles and platform discovery scores.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Taskboard Cards &amp; Scratchboards</span>
                </td>
                <td className="py-3.5 px-5 font-bold text-zinc-500 dark:text-zinc-400">
                  30-Day Auto-Purge
                </td>
                <td className="py-3.5 px-5 text-gray-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  Ephemeral project taskboard cards, internal checklists, and temporary scratchpad file attachments are cleared to conserve system resources.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6: Frequently Asked Questions (Interactive Accordion) */}
      <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            6. Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-blue-500" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed border-t border-gray-100/50 dark:border-white/[0.02] pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceInfoTab;
