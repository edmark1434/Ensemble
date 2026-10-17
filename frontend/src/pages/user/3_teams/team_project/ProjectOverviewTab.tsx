import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Hourglass,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Star,
  Tag,
  Users,
  Zap,
} from 'lucide-react';
import { JobRichText } from '@/pages/user/6_job_market/job_components/JobRichText';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface MilestoneData {
  job_milestone_id: string;
  milestone_title: string;
  milestone_description?: string;
  order_index: number;
  budget_credits: number;
  duration_hours?: number;
  milestone_tasks?: any[];
  contract_id?: string;
  contract_status?: string;
  contract_milestone_id?: string;
  milestone_status?: string;
  deadline_at?: string;
  started_at?: string;
  assignee_account_id?: string;
  assignee_name?: string;
  assignee_handle?: string;
  assignee_avatar_path?: string;
  total_tasks: number;
  completed_tasks: number;
  is_completed: boolean;
  is_current: boolean;
  is_upcoming: boolean;
  is_locked: boolean;
  has_rated?: boolean;
}

export type OverviewSubTab = 'summary' | 'milestones' | 'about';

interface ProjectOverviewTabProps {
  project: any;
  taskboardTasks: any[];
  contracts: any[];
  members: any[];
  milestones?: MilestoneData[];
  onSelectTab?: (tab: string) => void;
  onOpenRateModal?: (contractId: string, targetName: string) => void;
}

/**
 * Real-time ticking down countdown timer component.
 * Ticks down every 1000ms and formats days, hours, minutes, and seconds.
 */
const MilestoneCountdownTimer: React.FC<{
  deadlineAt?: string | null;
  durationHours?: number | null;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isLocked?: boolean;
}> = ({ deadlineAt, durationHours, isCompleted, isCurrent, isLocked }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    formatted: string;
  } | null>(null);

  useEffect(() => {
    if (isCompleted || !deadlineAt) {
      return;
    }

    const calculate = () => {
      const targetTime = new Date(deadlineAt).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime)) {
        setTimeLeft(null);
        return;
      }

      if (diff <= 0) {
        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isOverdue: true,
          formatted: `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isOverdue: false,
        formatted: `${days > 0 ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt, isCompleted]);

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        Delivered & Approved
      </span>
    );
  }

  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shrink-0">
        <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        <span>Locked</span>
        <span className="text-[11px] opacity-75">
          ({durationHours || 132}h sequential queue)
        </span>
      </span>
    );
  }

  if (!timeLeft) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
        <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        <span>{durationHours ? `${durationHours}h estimated window` : 'Active'}</span>
      </span>
    );
  }

  if (timeLeft.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>Overdue: {timeLeft.formatted}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 shrink-0">
      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
      <span>{timeLeft.formatted}</span>
      <span className="text-[10px] font-sans font-normal opacity-75">ticking down</span>
    </span>
  );
};

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({
  project,
  taskboardTasks,
  contracts,
  members,
  milestones = [],
  onSelectTab,
  onOpenRateModal,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSubTab = searchParams.get('subtab') as OverviewSubTab;
  const initialSubTab: OverviewSubTab = ['summary', 'milestones', 'about'].includes(rawSubTab)
    ? rawSubTab
    : 'summary';

  const [activeSubTab, setActiveSubTab] = useState<OverviewSubTab>(initialSubTab);

  useEffect(() => {
    if (rawSubTab && ['summary', 'milestones', 'about'].includes(rawSubTab)) {
      setActiveSubTab(rawSubTab);
    }
  }, [rawSubTab]);

  const handleSubTabChange = (newSubTab: OverviewSubTab) => {
    setActiveSubTab(newSubTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('subtab', newSubTab);
      return next;
    });
  };

  // Taskboard task calculations
  const totalTasks = taskboardTasks.length;
  const completedTasks = taskboardTasks.filter((t) => t.status === 'completed').length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasksCount = taskboardTasks.filter(
    (t) => t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status !== 'completed'
  ).length;

  // Unified milestone list
  const activeMilestonesList: MilestoneData[] =
    milestones.length > 0
      ? milestones
      : contracts.flatMap((c, cIdx) =>
          (c.milestones || []).map((m: any, mIdx: number) => ({
            job_milestone_id: m.id || `${c.contract_id}-${mIdx}`,
            milestone_title: m.name || `Milestone ${mIdx + 1}`,
            milestone_description: m.description || '',
            order_index: m.index !== undefined ? m.index : mIdx,
            budget_credits: Number(m.credits || 0),
            contract_id: c.contract_id,
            contract_status: c.contract_status,
            contract_milestone_id: m.id,
            milestone_status: m.status,
            deadline_at: m.deadline_at || c.deadline_at,
            assignee_account_id: c.freelancer_account_id,
            assignee_name: c.freelancer_name,
            assignee_handle: c.freelancer_handle,
            assignee_avatar_path: c.freelancer_avatar_path,
            total_tasks: 0,
            completed_tasks: 0,
            is_completed: m.status === 'completed' || m.status === 'approved',
            is_current: mIdx === 0 && m.status !== 'completed',
            is_upcoming: mIdx > 0 && m.status !== 'completed',
            is_locked: mIdx > 0,
          }))
        );

  const totalMilestones = activeMilestonesList.length;
  const completedMilestones = activeMilestonesList.filter((m) => m.is_completed).length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const ongoingMilestonesCount = activeMilestonesList.filter((m) => m.is_current).length;
  const upcomingMilestonesCount = activeMilestonesList.filter((m) => m.is_upcoming).length;
  const remainingMilestonesCount = Math.max(0, totalMilestones - completedMilestones);

  // Current active milestone
  const currentMilestone = activeMilestonesList.find((m) => m.is_current) || null;

  // Credit pool calculations
  const totalCredits =
    activeMilestonesList.reduce((acc, m) => acc + Number(m.budget_credits || 0), 0) ||
    contracts.reduce((acc, c) => acc + Number(c.rate_credits || 0), 0);
  const releasedCredits = activeMilestonesList
    .filter((m) => m.is_completed)
    .reduce((acc, m) => acc + Number(m.budget_credits || 0), 0);
  const escrowRemaining = Math.max(0, totalCredits - releasedCredits);

  // Pending for rating calculation
  const pendingForRatingCount = activeMilestonesList.filter(
    (m) => m.is_completed && !m.has_rated
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview Sub-Tabs: Summary | Milestones | About */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 w-fit border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs">
        <button
          type="button"
          onClick={() => handleSubTabChange('summary')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'summary'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Summary</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('milestones')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'milestones'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Milestones</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeSubTab === 'milestones'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {completedMilestones}/{totalMilestones}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('about')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'about'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>About</span>
        </button>
      </div>

      {/* SUB-TAB 1: SUMMARY */}
      {activeSubTab === 'summary' && (
        <div className="space-y-6">
          {/* ROW 1: Total Milestones (0/2) | Total Tasks (0/4) | Current Milestone | Credit Pool */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Milestones Card */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Milestones ({completedMilestones}/{totalMilestones})
              </span>
              <CheckCircle2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              {completedMilestones} / {totalMilestones}
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-2">
                ({milestoneProgress}%)
              </span>
            </div>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-zinc-400 dark:bg-zinc-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Tasks ({completedTasks}/{totalTasks})
              </span>
              <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              {completedTasks} / {totalTasks}
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-2">
                ({taskProgress}%)
              </span>
            </div>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-zinc-400 dark:bg-zinc-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>

        {/* Current Milestone Card */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Current Milestone</span>
              <Activity className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            {currentMilestone ? (
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                  {currentMilestone.milestone_title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    Active Stage
                  </span>
                  {currentMilestone.assignee_name && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      by {currentMilestone.assignee_name}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                  {completedMilestones === totalMilestones && totalMilestones > 0
                    ? 'All Milestones Completed'
                    : 'None Active'}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Sequential workflow ready
                </p>
              </div>
            )}
          </div>
          {currentMilestone && (
            <div className="pt-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
              <span>Step {currentMilestone.order_index + 1} of {totalMilestones}</span>
            </div>
          )}
        </div>

        {/* Credit Pool Card */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Credit Pool</span>
              <Coins className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {totalCredits.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Credits</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold">
              {releasedCredits.toLocaleString()}
            </span>{' '}
            paid |{' '}
            <span className="text-zinc-700 dark:text-zinc-300 font-bold">
              {escrowRemaining.toLocaleString()}
            </span>{' '}
            in escrow
          </p>
        </div>
      </div>

      {/* ROW 2: Ongoing | Upcoming | Completed | Remaining Milestones | Pending for Rating | Overdue Tasks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Ongoing */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ongoing</span>
            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {ongoingMilestonesCount}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
            Active in progress
          </span>
        </div>

        {/* Upcoming */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {upcomingMilestonesCount}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
            Next in pipeline
          </span>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {completedMilestones}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
            Finished & approved
          </span>
        </div>

        {/* Remaining Milestones */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Remaining</span>
            <Layers className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {remainingMilestonesCount}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
            Milestones left
          </span>
        </div>

        {/* Pending for Rating */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">For Rating</span>
            <Star className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {pendingForRatingCount}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate block">
            Awaiting feedback
          </span>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {overdueTasksCount}
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate block">
            Tasks past due
          </span>
        </div>
      </div>

          {/* ROW 3: Project Client (Owner) Card + Active Contributors Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Project Client (Owner) Card */}
            <div
              onClick={() => {
                if (project.client_account_id) {
                  navigate(`/profile/${project.client_account_id}`);
                }
              }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/60 transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Project Client (Owner)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                    Contract Author
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={constructAvatarUrl(project.client_avatar_path, project.client_name)}
                      alt={project.client_name || 'Client'}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(project.client_name);
                      }}
                      className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 group-hover:border-blue-500 transition shadow-xs"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {project.client_name || 'Client'}
                      </h4>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        Client Owner
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      @{project.client_handle || 'client'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Escrow & milestone funder</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-0.5">
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Row 2: Active Contributors Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Active Contributors ({members.length})
                  </span>
                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() => onSelectTab('members')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                    >
                      View Roster <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Avatar Stack */}
                  <div className="flex items-center -space-x-2.5 overflow-hidden shrink-0 py-1">
                    {members.slice(0, 4).map((m: any, idx: number) => (
                      <img
                        key={m.account_id || idx}
                        src={constructAvatarUrl(m.avatar_path, m.display_name)}
                        alt={m.display_name}
                        title={`${m.display_name} (${m.milestone_role || m.team_role || 'Contributor'})`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.display_name);
                        }}
                        className="inline-block w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs"
                      />
                    ))}
                    {members.length > 4 && (
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold ring-2 ring-white dark:ring-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                        +{members.length - 4}
                      </div>
                    )}
                    {members.length === 0 && (
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700">
                        <Users className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {members.length === 0
                        ? 'No contributors contracted yet'
                        : members.length === 1
                        ? members[0].display_name
                        : `${members[0].display_name} and ${members.length - 1} other${members.length > 2 ? 's' : ''}`}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {members.length === 0
                        ? 'Contract offers are pending acceptance'
                        : 'Contracted freelancers collaborating'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{completedMilestones} of {totalMilestones} milestones completed</span>
                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('members')}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    Manage Members <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info & Navigation Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>
                {currentMilestone
                  ? `Active milestone stage: "${currentMilestone.milestone_title}" (${remainingMilestonesCount} remaining).`
                  : 'All milestones completed or queued for sequence.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSubTabChange('milestones')}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Explore Milestones Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MILESTONES PIPELINE */}
      {activeSubTab === 'milestones' && (
        <div className="space-y-6">
          {/* Milestone Pipeline Card (Full Width) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Milestones Pipeline ({completedMilestones}/{totalMilestones} Completed)
                </h3>
              </div>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Sequential execution enforced
              </span>
            </div>

            {activeMilestonesList.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                Milestones will appear here once candidates accept team job contracts.
              </p>
            ) : (
              <div className="space-y-4">
                {activeMilestonesList.map((m, index) => {
                  const isCurrent = m.is_current;
                  const isUpcoming = m.is_upcoming;
                  const isLocked = m.is_locked;
                  const isCompleted = m.is_completed;

                  return (
                    <div
                      key={m.job_milestone_id || index}
                      className={`p-5 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/50'
                          : isCurrent
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/60 ring-1 ring-blue-500/20'
                          : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {/* Top Row: Milestone Step + Title + Status Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                {m.milestone_title || `Milestone ${index + 1}`}
                              </h4>
                              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                • {Number(m.budget_credits).toLocaleString()} Credits
                              </span>
                            </div>
                            {m.milestone_description && (
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                {m.milestone_description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Completed
                            </span>
                          )}

                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              Current (In Progress)
                            </span>
                          )}

                          {isUpcoming && isLocked && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                              <Lock className="w-3.5 h-3.5 text-zinc-500" />
                              Upcoming (Locked)
                            </span>
                          )}

                          {isUpcoming && !isLocked && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Upcoming (Ready)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Assignee Info & Ticking Down Countdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 items-center">
                        {/* Assignee Details */}
                        <div className="flex items-center gap-3">
                          {m.assignee_account_id ? (
                            <>
                              <img
                                src={constructAvatarUrl(m.assignee_avatar_path, m.assignee_name)}
                                alt={m.assignee_name || 'Assignee'}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.assignee_name);
                                }}
                                onClick={() => navigate(`/profile/${m.assignee_account_id}`)}
                                className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-blue-500 transition shadow-xs"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                                    Assigned Contributor
                                  </span>
                                </div>
                                <h5
                                  onClick={() => navigate(`/profile/${m.assignee_account_id}`)}
                                  className="text-xs font-bold text-zinc-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                                >
                                  {m.assignee_name}
                                </h5>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                  @{m.assignee_handle || 'freelancer'}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700">
                                <Users className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                              </div>
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                                  Assigned Contributor
                                </span>
                                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                  Unassigned (Open Position)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Real-time Ticking Down Timer */}
                        <div className="flex flex-col md:items-end justify-center">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                            Milestone Countdown
                          </span>
                          <MilestoneCountdownTimer
                            deadlineAt={m.deadline_at}
                            durationHours={m.duration_hours}
                            isCompleted={isCompleted}
                            isCurrent={isCurrent}
                            isLocked={isLocked}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Tasks Breakdown for this Milestone */}
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Tasks: {m.completed_tasks} / {m.total_tasks} completed
                          </span>
                          {Array.isArray(m.milestone_tasks) && m.milestone_tasks.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {m.milestone_tasks.slice(0, 2).map((taskItem: any, tIdx: number) => {
                                const title = typeof taskItem === 'string' ? taskItem : taskItem.title || taskItem.task || `Task ${tIdx + 1}`;
                                return (
                                  <span
                                    key={tIdx}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 truncate max-w-[150px]"
                                  >
                                    {title}
                                  </span>
                                );
                              })}
                              {m.milestone_tasks.length > 2 && (
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                  +{m.milestone_tasks.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Direct Jump to Taskboard */}
                        {onSelectTab && (
                          <button
                            type="button"
                            onClick={() => onSelectTab('taskboard')}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <span>Open Taskboard</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ABOUT (JOB PROJECT BRIEF & DELIVERABLES) */}
      {activeSubTab === 'about' && (
        <div className="space-y-6">
          {/* Job Project Brief & Deliverables Card (Full Width) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Job Project Brief & Deliverables
              </h3>
            </div>

            <JobRichText
              content={project.project_description || project.description || 'No detailed project brief provided.'}
              className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            />

            {/* Category badge */}
            {project.job_category && (
              <div className="pt-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                  Category & Specialization
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                  <Tag className="w-3.5 h-3.5" />
                  {project.job_category}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
