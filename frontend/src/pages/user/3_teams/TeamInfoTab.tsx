import React, { useState } from "react";
import {
  Info,
  ShieldCheck,
  Crown,
  Users,
  Sparkles,
  Briefcase,
  Kanban,
  Coins,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  Copy,
  UserCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TeamInfoTab: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const teamRoles = [
    {
      role: "Team Leader (Owner)",
      badge: "Owner",
      badgeClass:
        "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      icon: Crown,
      iconColor: "text-amber-600 dark:text-amber-400",
      summary: "Creator and primary administrator of the team collective.",
      responsibilities: [
        "Full control over team settings, photo/banner, category, and tagline",
        "Invite and remove members, assign administrative roles",
        "Submit and manage Business Verification for official entity status",
        "Manage shared team wallet balance and approve credit distributions",
      ],
      limitNote: "Subject to subscription plan creation limit (e.g., 1 on Free).",
    },
    {
      role: "Representative / Admin",
      badge: "Representative",
      badgeClass:
        "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      icon: UserCheck,
      iconColor: "text-blue-600 dark:text-blue-400",
      summary: "Trusted co-lead managing tasks, client orders, and members.",
      responsibilities: [
        "Manage taskboard assignments, columns, and task priorities",
        "Coordinate incoming client orders for team gigs and services",
        "Review and manage incoming member join requests",
        "Represent the team in client communications and proposals",
      ],
      limitNote: "Does not count toward any team creation limits.",
    },
    {
      role: "Team Member",
      badge: "Member",
      badgeClass:
        "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
      icon: Users,
      iconColor: "text-zinc-600 dark:text-zinc-400",
      summary: "Active contributor collaborating on shared workflows.",
      responsibilities: [
        "Pick up, update, and complete assigned tasks on the team taskboard",
        "Collaborate in team direct chat and shared video projects",
        "Contribute to collective service package fulfillment",
        "Receive credit earnings distributed by team leadership",
      ],
      limitNote: "Can join unlimited teams freely across the platform.",
    },
  ];

  const coreFeatures = [
    {
      title: "Shared Team Services",
      icon: Briefcase,
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20",
      description:
        "Publish services under your studio banner. Client bookings are scoped directly to the team so all members can collaborate on client deliverables.",
    },
    {
      title: "Collaborative Taskboard",
      icon: Kanban,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      description:
        "Organize, assign, and track production tasks with Board and Table views. Styled with clean Plus Jakarta Sans typography and custom status columns.",
    },
    {
      title: "Team Treasury & Wallet",
      icon: Coins,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
      description:
        "Earn credits collectively from completed client orders. Team leaders can distribute liquid credits to team contributors directly from the wallet.",
    },
    {
      title: "Business Verification",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      description:
        "Registered studios and agencies can submit DTI/SEC or business permits for admin review, unlocking the Verified Business badge and a +10 Discovery score boost.",
    },
  ];

  const faqs = [
    {
      q: "Does joining a team count toward my '1/1 Teams' limit?",
      a: "No! The limit shown on your account (such as '1/1 Teams FREE') strictly tracks the number of teams you have Created as an Owner. You can join as many teams as you want as an invited collaborator or accepted member without using up your creation allowance.",
    },
    {
      q: "How do creators join my team?",
      a: "You can share your 6-character Team Code (e.g. AB7D186E) or direct invite link. Additionally, if your team is set to 'Public', it appears in the Discovery Teams catalog where other creators and clients can explore and request to join.",
    },
    {
      q: "What is the difference between a General Team and a Workspace?",
      a: "General Teams (shown here) are standing studios, agencies, and creative collectives with their own profile, services, and taskboard. Workspaces, on the other hand, are temporary contractual project rooms created automatically when a specific job or gig order is funded in escrow.",
    },
    {
      q: "How does Business Verification benefit our team?",
      a: "Verified teams earn a green 'Verified Business' shield badge across Discovery, search results, and team profiles. In addition, the Discovery algorithm awards a +10 reputation score boost, helping your team rank higher and win more client inquiries.",
    },
    {
      q: "Can team members see our team's earnings and wallet balance?",
      a: "Only the Team Owner and authorized managers/admins with 'can_view_wallet' permissions can see liquid balances and initiate fund distributions. Members only see payouts delivered directly to their personal account balance.",
    },
  ];

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-200">
      {/* 1. Hero Header Banner */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-blue-50/50 via-white to-purple-50/30 dark:from-white/[0.04] dark:via-zinc-900/60 dark:to-blue-950/20 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>General Teams Knowledge &amp; Workflow</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Creative Studios, Collectives &amp; Agency Teams
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
              General Teams on Ensemble are persistent collaborative hubs where video editors, motion designers, animators, and sound specialists pool their talents, publish joint marketplace services, and distribute project earnings.
            </p>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 shadow-xs space-y-1.5 text-center min-w-[200px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Creation Entitlement
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Teams You Own
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Joining teams is <strong className="text-emerald-600 dark:text-emerald-400">unlimited</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Creation Limit Clarification Callout */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/[0.07] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Understanding Your Team Limit: Owned vs. Joined
            </h3>
            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              Your plan limit (e.g. <strong>1/1 Teams FREE</strong>) applies <strong className="text-gray-900 dark:text-white">only to teams you create</strong> where you hold the <strong className="text-amber-600 dark:text-amber-400">Owner</strong> role. You can accept invitations and join as many collaborator teams as you wish without affecting your creation limit!
            </p>
          </div>
        </div>
      </div>

      {/* 3. Team Roles & Hierarchy */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Team Roles &amp; Permissions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {teamRoles.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-5 space-y-4 flex flex-col justify-between shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${r.iconColor}`} />
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${r.badgeClass}`}>
                      {r.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {r.role}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      {r.summary}
                    </p>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/10">
                    {r.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/10 text-[11px] font-medium text-gray-500 dark:text-zinc-500">
                  {r.limitNote}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Core Capabilities Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Core Team Capabilities
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreFeatures.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-5 space-y-3 shadow-xs"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${feat.bg}`}>
                  <Icon className={`w-5 h-5 ${feat.color}`} />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {feat.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Frequently Asked Questions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 dark:text-zinc-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
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
                      <div className="p-4 sm:p-5 pt-0 border-t border-gray-100 dark:border-white/10 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
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
