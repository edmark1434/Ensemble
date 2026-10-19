import React, { useState } from "react";
import {
  Users,
  Briefcase,
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scale,
  FileText,
  DollarSign,
  ChevronRight,
  Check,
  AlertTriangle,
  RotateCcw,
  Lock,
  ArrowRight,
  Info
} from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";

type GuideCategory = "all" | "roles" | "types" | "contract-status" | "milestone-status" | "escrow";

export const ContractsTerminologyGuide: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>("all");

  const categories = [
    { id: "all" as GuideCategory, label: "All Terms & Topics", icon: HelpCircle },
    { id: "roles" as GuideCategory, label: "Parties & Roles", icon: Users },
    { id: "types" as GuideCategory, label: "Contract Types", icon: Briefcase },
    { id: "contract-status" as GuideCategory, label: "Contract Statuses", icon: Clock },
    { id: "milestone-status" as GuideCategory, label: "Milestone Lifecycle", icon: CheckCircle2 },
    { id: "escrow" as GuideCategory, label: "Escrow & Finances", icon: Shield },
  ];

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans'] animate-fade-in">
      {/* Hero Banner */}
      <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 dark:from-blue-950/20 dark:via-dark-surface dark:to-indigo-950/20 p-6 md:p-8 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Info className="w-3.5 h-3.5" />
            Contract Knowledge Base
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white">
            Understanding Contract Terms, Roles & Lifecycles
          </h2>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
            Every contract on Ensemble is backed by our secure Escrow Guarantee, milestone-based delivery, and clear legal agreements. Use this guide to understand the roles, contract types, and statuses.
          </p>
        </div>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-blue-100 dark:border-white/5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                  isActive
                    ? "bg-blue-600 text-white shadow-blue-500/20"
                    : "bg-white dark:bg-dark-surface text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: PARTIES & ROLES */}
      {(activeCategory === "all" || activeCategory === "roles") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
            <Users className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
              Parties to the Contract (Who is Who?)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* The Client */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">
                  Client
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase">Party A</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  The Principal / Hirer
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The individual, startup, or organization that posts the job or purchases the gig service.
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-white/5 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Core Responsibilities:
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Funds 100% of the contract value into escrow upfront.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Provides project specifications, brand assets, and feedback.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Reviews submissions and releases milestone payments upon approval.</span>
                </div>
              </div>
            </div>

            {/* Ensemble Custodian (Middle) */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800">
                  Ensemble
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase">Custodial Escrow</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Neutral Platform Custodian
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Ensemble Technologies acts as an impartial third-party holding escrow funds in custodial trust.
                </p>
              </div>
              <div className="pt-2 border-t border-emerald-200/60 dark:border-white/5 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Platform Guarantees:
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Funds are locked safely: neither party can unilaterally withdraw.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Fair dispute mediation if expectations or milestones are contested.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Automatic milestone approval after review expiry without conflict.</span>
                </div>
              </div>
            </div>

            {/* The Freelancer */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-950 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800">
                  Freelancer
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase">Party B</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  The Specialist / Contractor
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The independent professional or studio responsible for executing and delivering the agreed scope of work.
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-white/5 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Core Responsibilities:
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Executes deliverables according to Statement of Work (SOW).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Submits work on or before specified milestone deadlines.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Accommodates included revisions and receives net escrow disbursement.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: CONTRACT TYPES */}
      {(activeCategory === "all" || activeCategory === "types") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
            <Briefcase className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
              Types of Contracts
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Job Contract */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                    JOB CONTRACT
                  </span>
                </div>
                <span className="text-xs font-bold text-zinc-500">Custom SOW</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  Job Contract (Custom Posting)
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Generated when a client accepts a freelancer's tailored proposal submitted to an open Job Posting on the job board.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50/60 dark:bg-white/[0.02] p-4 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Key Sub-Types:
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-blue-500/30">
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Individual Freelancer Job:</strong>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Standard 1-to-1 agreement where one freelancer completes the entire project scope through custom milestones.
                    </p>
                  </div>
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Team Milestone Job:</strong>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Multi-hire job where different specialists take assigned milestone roles (e.g. Designer handles Milestone 1, Developer handles Milestone 2). The contract specifies your <em>Assigned Milestone Role</em>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 dark:border-white/5 pt-3">
                <span>Pricing: Proposal Quote / Negotiated</span>
                <span>Milestones: Multi-phase customizable</span>
              </div>
            </div>

            {/* Gig Contract */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-950 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    GIG CONTRACT
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Pre-Packaged Catalog</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  Gig Contract (Service Catalog Order)
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Generated when a client purchases a predefined service tier from a freelancer's published Service Catalog.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10 p-4 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-purple-950 dark:text-purple-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Key Characteristics:
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-purple-500/30">
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Fixed Tiers:</strong>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Based on predefined packages (Basic, Standard, or Premium) with fixed credit pricing and defined turnaround times.
                    </p>
                  </div>
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Explicit Revision Quota:</strong>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Specifies an exact number of included review revisions (e.g. 2 Revisions). Additional revisions are charged at the stipulated add-on rate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 dark:border-white/5 pt-3">
                <span>Pricing: Fixed Service Tier</span>
                <span>Milestones: Delivery Phase with Revisions</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: OVERALL CONTRACT STATUSES */}
      {(activeCategory === "all" || activeCategory === "contract-status") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
            <Clock className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
              Overall Contract Statuses
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WAITING / PENDING SIGNATURE */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-950 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  WAITING
                </span>
                <span className="text-[11px] font-mono text-zinc-400">Offer Stage</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Pending Signature / Acceptance</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The client has funded escrow and dispatched the contract offer. Work does not begin until the freelancer accepts and digitally signs the agreement.
                </p>
              </div>
            </div>

            {/* ACTIVE */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">In Progress</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Active Engagement</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The contract is live! Freelancer is working through milestone phases, submitting deliverables, and requesting client sign-offs.
                </p>
              </div>
            </div>

            {/* DONE */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-950 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  DONE
                </span>
                <span className="text-[11px] font-mono text-zinc-400">Pending Review</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Completed & Awaiting Feedback</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  All milestones have been delivered and approved. Full escrow payout is complete. Both parties are now invited to leave star ratings and testimonials.
                </p>
              </div>
            </div>

            {/* CLOSED */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-200 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                  CLOSED
                </span>
                <span className="text-[11px] font-mono text-zinc-400">Archived</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Fully Concluded</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The contract lifecycle is complete. Ratings have been submitted and records are archived for permanent reference in the Archived tab.
                </p>
              </div>
            </div>

            {/* CANCELLED */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  CANCELLED
                </span>
                <span className="text-[11px] font-mono text-rose-600">Terminated</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Mutual or Mediated Cancellation</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  The contract was cancelled prior to full milestone completion. Unreleased escrow funds are refunded to the client according to cancellation agreement.
                </p>
              </div>
            </div>

            {/* DISPUTED */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">
                  <Scale className="w-3.5 h-3.5 text-amber-700" />
                  DISPUTE FILED
                </span>
                <span className="text-[11px] font-mono text-amber-600">Mediation</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">In Mediation</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Either party submitted a formal dispute ticket. Contract activities are frozen while Ensemble Support reviews deliverables and issues an arbitrated resolution.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: MILESTONE LIFECYCLE STATUSES */}
      {(activeCategory === "all" || activeCategory === "milestone-status") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
            <CheckCircle2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
              Milestone Lifecycle (Phase-by-Phase)
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-xs space-y-6">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Contracts are divided into chronological <strong>Milestones</strong>. Each milestone represents a discrete scope of work with its own deadline, revision count, and escrow allocation:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* LOCKED */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-xs uppercase">
                  <Lock className="w-3.5 h-3.5" />
                  <span>1. Locked</span>
                </div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Future Phase</h5>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Escrow is reserved, but work cannot begin until preceding milestones are completed and approved.
                </p>
              </div>

              {/* IN PROGRESS */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                  <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>2. In Progress</span>
                </div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Active Work</h5>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Freelancer is actively executing the milestone tasks. Turnaround timer counts down towards the deadline.
                </p>
              </div>

              {/* UNDER REVIEW */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                  <FileText className="w-3.5 h-3.5" />
                  <span>3. Under Review</span>
                </div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Client Verification</h5>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Deliverables submitted! Client verifies deliverables and either approves payout or requests revisions.
                </p>
              </div>

              {/* CLAIMED / APPROVED */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>4. Claimed</span>
                </div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Payout Released</h5>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Client signed off! Escrow credits for this milestone are immediately disbursed to the freelancer.
                </p>
              </div>
            </div>

            {/* Edge Condition Statuses */}
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Exception & Delay Statuses:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10">
                  <strong className="text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Revision Requested
                  </strong>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Client asked for adjustments within the included quota. Freelancer updates deliverables without additional charges.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10">
                  <strong className="text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                  </strong>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    The milestone deadline passed without submission. Client may request deadline extension or cancellation.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-white/[0.02]">
                  <strong className="text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Stalled / Abandoned
                  </strong>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                    Extended lack of communication triggers automated platform warnings and dispute escalation eligibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5: ESCROW & FINANCIAL RULES */}
      {(activeCategory === "all" || activeCategory === "escrow") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/10 pb-3">
            <Shield className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
              Escrow & Financial Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-500">
                <CreditIcon className="w-5 h-5" />
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Escrow Deposit (100%)</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Client credits are deposited upfront upon contract acceptance. Freelancers can work with full confidence knowing payment is securely reserved in platform escrow.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-500">
                <DollarSign className="w-5 h-5" />
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">10% Platform Fee</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Ensemble deducts a standard 10% platform fee from milestone payouts. This covers payment gateways, escrow custody, continuous platform improvements, and mediation services.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Net Payout (90%)</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The freelancer receives 90% of the milestone consideration directly credited to their account wallet upon client milestone approval, available immediately for cashout or spending.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
