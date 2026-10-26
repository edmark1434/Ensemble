import React from "react";
import { Info, ShieldCheck, Clock, Archive, Trash2, Award } from "lucide-react";

export const WorkspaceInfoTab: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Overview */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Contractual Workspace Guide &amp; Policies
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Every job hire or accepted contract automatically provisions a dedicated Contractual Workspace.
              Below is the comprehensive operational specification covering workspace lifecycles, mutual double-blind review protocols, and retention rules.
            </p>
          </div>
        </div>
      </div>

      {/* Table 1: Workspace Lifecycle & Statuses */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            1. Workspace Lifecycle &amp; Status Transitions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Trigger / Condition</th>
                <th className="py-3 px-6">Workspace Access</th>
                <th className="py-3 px-6">Available Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>
                <td className="py-3.5 px-6">Contract accepted; milestones currently in progress.</td>
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Full Read &amp; Write</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Manage tasks, submit deliverables, request revisions, and chat in real-time.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Rate &amp; Review
                  </span>
                </td>
                <td className="py-3.5 px-6">All milestones approved and released. Awaiting mutual reviews.</td>
                <td className="py-3.5 px-6 font-medium text-amber-800 dark:text-amber-300">Locked (Read-Only)</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Task modifications blocked. Both parties must submit mutual feedback within the 24h grace period.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Archived
                  </span>
                </td>
                <td className="py-3.5 px-6">Mutual reviews submitted or 24-hour review window expired.</td>
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Read-Only (30 Days)</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Reviews are unsealed and published to public profiles. Workspace retained for 30-day review period.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Purged
                  </span>
                </td>
                <td className="py-3.5 px-6">30 days have elapsed since project archival.</td>
                <td className="py-3.5 px-6 font-medium text-gray-400 dark:text-zinc-500">Deleted (Cleaned Up)</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Ephemeral tasks and scratchboards are automatically purged by the retention worker.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Mutual Double-Blind Review Policy */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            2. Double-Blind Review Protocols
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Protocol Component</th>
                <th className="py-3 px-6">Rule Specification</th>
                <th className="py-3 px-6">Enforcement Objective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Double-Blind Sealing</td>
                <td className="py-3.5 px-6">
                  Neither client nor freelancer can view the other party's star rating or written feedback until both parties submit.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Prevents retaliatory feedback and guarantees honest, uninfluenced ratings.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">24-Hour Review Window</td>
                <td className="py-3.5 px-6">
                  A strict 24-hour countdown timer initiates when final milestone approval occurs.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Ensures prompt review closeout so ratings can be credited to user portfolios without delay.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Automatic Grace Expiration</td>
                <td className="py-3.5 px-6">
                  If only one party reviews within 24 hours, the double-blind seal lifts and their review is published automatically.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Protects responsive users from being held hostage by a non-responsive counterparty.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Merit &amp; Standing Impact</td>
                <td className="py-3.5 px-6">
                  Ratings directly calculate into freelancer and client overall rating averages and platform Merit standing.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Promotes trustworthy collaboration and quality assurance across the platform.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: 30-Day Workspace Retention Policy */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <Archive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            3. Data Retention &amp; Permanent Preservation Rules
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Data Category</th>
                <th className="py-3 px-6">Retention Duration</th>
                <th className="py-3 px-6">Policy Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Contracts &amp; Financial Ledgers</td>
                <td className="py-3.5 px-6 font-semibold text-emerald-700 dark:text-emerald-400">Permanent (Immutable)</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  All transaction history, escrow milestones, and invoices are retained indefinitely for tax and legal compliance.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Ratings, Stars &amp; Feedback</td>
                <td className="py-3.5 px-6 font-semibold text-emerald-700 dark:text-emerald-400">Permanent</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Submitted testimonials and star ratings remain permanently visible on public profiles and merit tallies.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Linked Video Projects &amp; Deliverables</td>
                <td className="py-3.5 px-6 font-semibold text-emerald-700 dark:text-emerald-400">Permanent (Owner Library)</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  The actual video project in the Video Editor is never deleted; it remains safely in the owner's personal projects library. Only the temporary workspace collaboration link is retired. Approved milestone deliverables remain permanently accessible in contract history.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Taskboard Cards &amp; Checklists</td>
                <td className="py-3.5 px-6 font-semibold text-zinc-600 dark:text-zinc-400">30-Day Auto-Purge</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Ephemeral project taskboard cards, sub-tasks, and internal labels are automatically purged after 30 days.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium text-gray-900 dark:text-white">Draft Attachments &amp; Temporary Files</td>
                <td className="py-3.5 px-6 font-semibold text-zinc-600 dark:text-zinc-400">30-Day Auto-Purge</td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Work-in-progress drafts and temporary scratchpad file attachments are cleared to conserve system storage.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 4: Roles & Workspace Permissions */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
          <Award className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            4. Roles &amp; Permissions Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Role Tag</th>
                <th className="py-3 px-6">Authority &amp; Responsibility</th>
                <th className="py-3 px-6">Review Expectation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-zinc-300">
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                    Client Owner
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  Funds project escrow, defines milestones, reviews deliverable submissions, and approves milestone payouts.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Required to rate the freelancer or team's work quality, timeliness, and communication upon final milestone approval.
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                <td className="py-3.5 px-6 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    Freelancer / Contributor
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  Completes milestone requirements, manages taskboard items, and uploads deliverables for client review.
                </td>
                <td className="py-3.5 px-6 text-gray-500 dark:text-zinc-400">
                  Required to rate client clarity, communication, and promptness upon contract completion.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
