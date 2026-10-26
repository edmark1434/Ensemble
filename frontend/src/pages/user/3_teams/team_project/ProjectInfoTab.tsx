import React from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  Kanban,
  Layers,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import { JobRichText } from '@/pages/user/6_job_market/job_components/JobRichText';

interface MilestoneItem {
  job_milestone_id: string;
  milestone_title: string;
  milestone_description?: string;
  order_index: number;
  budget_credits: number;
  milestone_status?: string;
  is_completed?: boolean;
  is_current?: boolean;
  is_upcoming?: boolean;
  is_locked?: boolean;
  deadline_at?: string;
  duration_hours?: number;
  assignee_name?: string;
  assignee_handle?: string;
  assignee_avatar_path?: string;
}

interface ProjectInfoTabProps {
  project: any;
  contracts: any[];
  members: any[];
  milestones: MilestoneItem[];
}

export const ProjectInfoTab: React.FC<ProjectInfoTabProps> = ({
  project,
  contracts,
  members,
  milestones,
}) => {
  const primaryContract = contracts[0] || {};
  const totalCredits =
    milestones.reduce((acc, m) => acc + (Number(m.budget_credits) || 0), 0) ||
    contracts.reduce((acc, c) => acc + (Number(c.rate_credits) || 0), 0);
  const releasedCredits = milestones
    .filter((m) => m.is_completed || String(m.milestone_status).toLowerCase() === 'completed')
    .reduce((acc, m) => acc + (Number(m.budget_credits) || 0), 0);
  const escrowRemaining = Math.max(0, totalCredits - releasedCredits);

  return (
    <div className="space-y-6">
      {/* Top Banner: Workspace Details & Escrow Status */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Active Contract Workspace
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {project?.project_title || project?.job_title || 'Contract Video Project'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Workspace ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{project?.workspace_id || project?.team_id}</span>
              {project?.contract_id && (
                <> • Contract Ref: <span className="font-mono text-zinc-700 dark:text-zinc-300">{project.contract_id.slice(0, 8)}...</span></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Escrow Protected</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{totalCredits.toLocaleString()} Total Credits</span>
            </span>
          </div>
        </div>

        {/* 3 Overview Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Escrow Remaining
            </span>
            <span className="text-base font-bold text-zinc-900 dark:text-white">
              {escrowRemaining.toLocaleString()} Credits
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Contract Milestones
            </span>
            <span className="text-base font-bold text-zinc-900 dark:text-white">
              {milestones.length} Sequential Milestones
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Workspace Team
            </span>
            <span className="text-base font-bold text-zinc-900 dark:text-white">
              {members.length} {members.length === 1 ? 'Collaborator' : 'Collaborators'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Project Brief & Workflow Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Project Brief & Description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                Project Scope & Deliverable Brief
              </h3>
            </div>

            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-3">
              {project?.job_description ? (
                <JobRichText content={project.job_description} />
              ) : project?.project_description ? (
                <p>{project.project_description}</p>
              ) : (
                <p className="text-zinc-400 italic">No detailed brief provided for this project.</p>
              )}
            </div>
          </div>

          {/* Sequential Milestones Breakdown */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Locked Milestones Schedule
                </h3>
              </div>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                {milestones.length} Milestones
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {milestones.map((m, idx) => {
                const status = String(m.milestone_status || '').toLowerCase();
                const isApproved = status === 'completed' || status === 'approved' || m.is_completed;
                const isCurrent = m.is_current || (!isApproved && idx === 0);
                const isLocked = m.is_locked || (!isApproved && !isCurrent);

                return (
                  <div key={m.job_milestone_id || idx} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {m.milestone_title}
                          </h4>
                          {isApproved ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Approved
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              Locked (Upcoming)
                            </span>
                          )}
                        </div>
                        {m.milestone_description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 max-w-md">
                            {m.milestone_description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono block">
                        {Number(m.budget_credits || 0).toLocaleString()} Credits
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {m.deadline_at ? `Due ${new Date(m.deadline_at).toLocaleDateString()}` : 'Sequential'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Workspace Rules & Workflow FAQ Guide */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                Workspace Rules & Guide
              </h3>
            </div>

            <div className="space-y-4">
              {/* Rule 1: Taskboard vs Submissions */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <Kanban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Taskboard vs. Submissions</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <strong>Taskboard</strong> is internal work tracking for freelancers to coordinate and check off daily work. <strong>Submissions</strong> is the official client inspection station where finished deliverables are handed over and escrow payments are released.
                </p>
              </div>

              {/* Rule 2: Who marks tasks done */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Who Marks Tasks Done?</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <strong>Freelancers mark their own tasks done.</strong> The client does not micromanage individual task cards—the client only reviews the submitted deliverable on the Submissions tab.
                </p>
              </div>

              {/* Rule 3: Sequential Milestones */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Sequential Milestone Locking</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Milestone 2 is locked until Milestone 1 is approved. Once the client approves Milestone 1 and releases payment, Milestone 2 automatically unlocks for work and submissions.
                </p>
              </div>

              {/* Rule 4: Revisions Policy */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>Deliverables & Revisions</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Each milestone includes 2 revision rounds. If changes are needed, the client provides specific feedback notes, and contributors re-submit when edits are completed.
                </p>
              </div>
            </div>
          </div>

          {/* Project Members List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Parties Involved
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-500">
                {members.length} Members
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((m, idx) => (
                <div key={m.account_id || idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={constructAvatarUrl(m.avatar_path, m.display_name)}
                      alt={m.display_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.display_name);
                      }}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {m.display_name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        @{m.handle}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    m.role === 'Owner' || m.role === 'Client'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {m.role || 'Contributor'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
