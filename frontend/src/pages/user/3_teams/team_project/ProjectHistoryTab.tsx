import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  Lock,
  RotateCcw,
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
  milestone_unlocked: <Unlock className="w-4 h-4 text-amber-500" />,
  deliverable_submitted: <FileCheck className="w-4 h-4 text-blue-500" />,
  milestone_approved: <Coins className="w-4 h-4 text-emerald-500" />,
  revision_requested: <RotateCcw className="w-4 h-4 text-orange-500" />,
  team_project_archived: <Lock className="w-4 h-4 text-purple-500" />,
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
};

export const ProjectHistoryTab: React.FC<ProjectHistoryTabProps> = ({ history }) => {
  const navigate = useNavigate();

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-[#151720] p-12 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
        <Activity className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No activity logged yet</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Activity events such as task checks, milestone submissions, approvals, and payouts will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151720] p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Project Audit Log & Activity Trail
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Real-time chronological record of team updates, submissions, checks, and credit payouts
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-600 dark:text-zinc-400">
          {history.length} Events
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
        {history.map((item) => {
          const actionConfig = ACTION_LABELS[item.action] || {
            label: item.action.replace(/_/g, ' '),
            badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          };
          const icon = ACTION_ICONS[item.action] || <Clock className="w-4 h-4 text-slate-400" />;

          return (
            <div key={item.activity_id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-[#151720] border-2 border-slate-400 dark:border-zinc-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src={constructAvatarUrl(item.actor_avatar_path, item.actor_name)}
                    alt={item.actor_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(item.actor_name);
                    }}
                    onClick={() => {
                      if (item.actor_account_id) navigate(`/profile/${item.actor_account_id}`);
                    }}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-blue-500 transition"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => {
                          if (item.actor_account_id) navigate(`/profile/${item.actor_account_id}`);
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {item.actor_name}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${actionConfig.badgeClass}`}
                      >
                        {actionConfig.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                      {item.task_title && (
                        <span>
                          Task: <span className="font-bold text-slate-800 dark:text-zinc-200">"{item.task_title}"</span>
                          {' — '}
                        </span>
                      )}
                      {item.metadata?.status && (
                        <span>
                          Status changed to <span className="font-bold uppercase text-slate-800 dark:text-zinc-200">{item.metadata.status}</span>
                        </span>
                      )}
                      {item.metadata?.unlocked_milestone_order && (
                        <span>
                          Milestone {item.metadata.unlocked_milestone_order} tasks are now available for work.
                        </span>
                      )}
                      {item.metadata?.reason && (
                        <span className="italic">{item.metadata.reason}</span>
                      )}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
