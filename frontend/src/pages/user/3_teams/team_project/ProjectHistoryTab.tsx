import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  Film,
  Lock,
  RotateCcw,
  Sparkles,
  Unlock,
  UserCheck,
} from 'lucide-react';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

interface HistoryItem {
  activity_id: string;
  action: string;
  metadata?: any;
  created_at: string;
  actor_account_id: string;
  actor_name: string;
  actor_handle?: string;
  actor_avatar_path?: string;
  task_title?: string;
}

interface ProjectHistoryTabProps {
  history: HistoryItem[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  task_created: <Activity className="w-4 h-4 text-blue-500" />,
  task_updated: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  contract_offer_extended: <UserCheck className="w-4 h-4 text-indigo-500" />,
  contributor_added: <UserCheck className="w-4 h-4 text-indigo-500" />,
  workspace_created: <Sparkles className="w-4 h-4 text-blue-500" />,
  milestone_unlocked: <Unlock className="w-4 h-4 text-amber-500" />,
  deliverable_submitted: <FileCheck className="w-4 h-4 text-blue-500" />,
  milestone_approved: <Coins className="w-4 h-4 text-emerald-500" />,
  revision_requested: <RotateCcw className="w-4 h-4 text-orange-500" />,
  team_project_archived: <Lock className="w-4 h-4 text-purple-500" />,
  video_project_created: <Film className="w-4 h-4 text-emerald-500" />,
  video_project_linked: <Film className="w-4 h-4 text-blue-500" />,
  video_project_unlinked: <Film className="w-4 h-4 text-rose-500" />,
};

const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
  task_created: {
    label: 'Task Created',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
  },
  task_updated: {
    label: 'Task Updated',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
  },
  contract_offer_extended: {
    label: 'Contributor Added',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700',
  },
  contributor_added: {
    label: 'Contributor Added',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700',
  },
  workspace_created: {
    label: 'Workspace Initialized',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700 font-bold',
  },
  milestone_unlocked: {
    label: 'Milestone Unlocked',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  },
  deliverable_submitted: {
    label: 'Deliverable Submitted',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
  },
  milestone_approved: {
    label: 'Payout Released',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700 font-bold',
  },
  revision_requested: {
    label: 'Revision Requested',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700',
  },
  team_project_archived: {
    label: 'Project Archived',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700',
  },
  video_project_created: {
    label: 'Video Project Created',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700 font-bold',
  },
  video_project_linked: {
    label: 'Video Project Linked',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700 font-bold',
  },
  video_project_unlinked: {
    label: 'Video Project Unlinked',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700 font-bold',
  },
};

export const ProjectHistoryTab: React.FC<ProjectHistoryTabProps> = ({ history }) => {
  const navigate = useNavigate();

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
        <Activity className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">No activity logged yet</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Activity events such as task checks, milestone submissions, approvals, and payouts will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Project Audit Log & Activity Trail
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time chronological record of team updates, submissions, checks, and credit payouts
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
          {history.length} Events
        </span>
      </div>

      <div className="space-y-0">
        {history.map((item, index) => {
          const isLast = index === history.length - 1;
          const actionConfig = ACTION_LABELS[item.action] || {
            label: item.action.replace(/_/g, ' '),
            badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          };

          return (
            <div key={item.activity_id} className="relative flex items-start gap-3.5 group">
              {/* Left track column: marker + connecting line */}
              <div className="flex flex-col items-center self-stretch shrink-0 pt-1">
                {/* Node marker: perfectly centered, clean ring with dot */}
                <div className="relative z-10 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-500 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-blue-500 dark:group-hover:border-blue-400 transition">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>

                {/* Vertical connecting line to next item (only if not last) */}
                {!isLast && (
                  <div className="w-0.5 grow bg-zinc-200 dark:bg-zinc-800 my-1 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700 transition" />
                )}
              </div>

              {/* Event content */}
              <div className={`flex-1 min-w-0 ${!isLast ? 'pb-6' : 'pb-1'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-3">
                    <img
                      src={constructAvatarUrl(item.actor_avatar_path, item.actor_name)}
                      alt={item.actor_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(item.actor_name);
                      }}
                      onClick={() => {
                        if (item.actor_account_id) navigate(`/profile/${item.actor_account_id}`);
                      }}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-blue-500 transition mt-0.5 sm:mt-0"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          onClick={() => {
                            if (item.actor_account_id) navigate(`/profile/${item.actor_account_id}`);
                          }}
                          className="text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                        >
                          {item.actor_name}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${actionConfig.badgeClass}`}
                        >
                          {actionConfig.label}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                        {item.task_title && (
                          <span>
                            Task: <span className="font-bold text-zinc-800 dark:text-zinc-200">"{item.task_title}"</span>
                            {' — '}
                          </span>
                        )}
                        {item.metadata?.project_name && (
                          <span>
                            Video Project: <span className="font-bold text-zinc-800 dark:text-zinc-200">"{item.metadata.project_name}"</span>
                            {' — '}
                          </span>
                        )}
                        {item.metadata?.message && (
                          <span>{item.metadata.message}</span>
                        )}
                        {item.metadata?.status && (
                          <span>
                            Status changed to <span className="font-bold uppercase text-zinc-800 dark:text-zinc-200">{item.metadata.status}</span>
                          </span>
                        )}
                        {item.metadata?.unlocked_milestone_order && (
                          <span>
                            Milestone {item.metadata.unlocked_milestone_order} tasks are now available for work.
                          </span>
                        )}
                        {item.metadata?.milestone_role && !item.metadata?.message && (
                          <span>Assigned Milestone Role: <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.metadata.milestone_role}</span></span>
                        )}
                        {item.metadata?.reason && (
                          <span className="italic">{item.metadata.reason}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
