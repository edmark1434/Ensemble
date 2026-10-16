import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  AlignLeft,
  ArrowUpDown,
  BarChart2,
  Calendar,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Flag,
  Grid,
  Kanban,
  Layers,
  Link2,
  List,
  Lock,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Table as TableIcon,
  Tag,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

interface TaskChecklistItem {
  id?: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  task_id: string;
  workspace_id: string;
  job_milestone_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'in_review' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_locked: boolean;
  checklist?: TaskChecklistItem[];
  starts_at?: string;
  due_at?: string;
  milestone_title?: string;
  milestone_order?: number;
  assignee_account_id?: string;
  assignee_name?: string;
  assignee_handle?: string;
  assignee_avatar_path?: string;
  created_at: string;
  created_by_account_id?: string;
  is_contract_task?: boolean;
}

interface ProjectTaskboardTabProps {
  teamId: string;
  tasks: TaskItem[];
  currentUserAccountId: string;
  isClient: boolean;
  members: any[];
  contracts: any[];
  milestones?: any[];
  onTasksUpdated?: (silent?: boolean) => void;
}

type DisplayMode = 'board' | 'list' | 'table' | 'gantt';

const COLUMNS = [
  {
    id: 'todo',
    label: 'TO DO',
    badgeClass: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    iconColor: 'text-zinc-400',
    dotType: 'dashed',
  },
  {
    id: 'in_progress',
    label: 'IN PROGRESS',
    badgeClass: 'bg-blue-600 text-white border border-blue-500',
    iconColor: 'text-blue-500',
    dotType: 'solid-blue',
  },
  {
    id: 'review',
    label: 'ON REVIEW',
    badgeClass: 'bg-amber-600 text-white border border-amber-500',
    iconColor: 'text-amber-500',
    dotType: 'solid-amber',
  },
  {
    id: 'completed',
    label: 'COMPLETE',
    badgeClass: 'bg-emerald-600 text-white border border-emerald-500',
    iconColor: 'text-emerald-500',
    dotType: 'solid-green',
  },
] as const;

export const normalizeStatus = (status?: string): 'todo' | 'in_progress' | 'review' | 'completed' => {
  if (status === 'review' || status === 'in_review') return 'review';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'completed') return 'completed';
  return 'todo';
};

export const getStatusBadgeConfig = (status?: string) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'completed':
      return {
        label: 'COMPLETE',
        btnClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60',
        icon: <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    case 'review':
      return {
        label: 'ON REVIEW',
        btnClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60',
        icon: <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    case 'in_progress':
      return {
        label: 'IN PROGRESS',
        btnClass: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/60',
        icon: <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />,
      };
    case 'todo':
    default:
      return {
        label: 'TO DO',
        btnClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700',
        icon: <div className="w-2 h-2 rounded-full border border-dashed border-slate-500 dark:border-zinc-400 shrink-0" />,
      };
  }
};

export const STATUS_OPTIONS = [
  {
    id: 'todo' as const,
    label: 'TO DO',
    icon: <div className="w-2 h-2 rounded-full border border-dashed border-slate-500 dark:border-zinc-400 shrink-0" />,
    textColor: 'text-slate-800 dark:text-zinc-200',
  },
  {
    id: 'in_progress' as const,
    label: 'IN PROGRESS',
    icon: <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />,
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'review' as const,
    label: 'ON REVIEW',
    icon: <Clock className="w-3 h-3 text-amber-500 shrink-0" />,
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'completed' as const,
    label: 'COMPLETE',
    icon: <Check className="w-3 h-3 text-emerald-500 shrink-0" />,
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
];

const PRIORITY_FLAGS: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-rose-500', label: 'Urgent' },
  high: { color: 'text-amber-500', label: 'High' },
  normal: { color: 'text-blue-500', label: 'Normal' },
  low: { color: 'text-slate-400', label: 'Low' },
};

export const ProjectTaskboardTab: React.FC<ProjectTaskboardTabProps> = ({
  teamId,
  tasks,
  currentUserAccountId,
  isClient,
  members,
  contracts,
  milestones = [],
  onTasksUpdated,
}) => {
  // Local optimistic state for zero-latency seamless taskboard updates
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // 4 Display Modes (Default is 'board')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('board');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Gantt Chart Sub-view Mode
  const [ganttSection, setGanttSection] = useState<'all' | 'milestones' | 'tasks'>('all');

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultColForAdd, setDefaultColForAdd] = useState<'todo' | 'in_progress' | 'review' | 'completed'>('todo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskMilestone, setNewTaskMilestone] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Popover menus state
  const [activeStatusMenuTaskId, setActiveStatusMenuTaskId] = useState<string | null>(null);
  const [activePriorityMenuTaskId, setActivePriorityMenuTaskId] = useState<string | null>(null);

  // Helper to locate milestone attached to a task
  const getTaskMilestone = (task: TaskItem) => {
    if (!milestones || milestones.length === 0) return null;
    return milestones.find((m: any) =>
      (task.job_milestone_id && String(m.job_milestone_id) === String(task.job_milestone_id)) ||
      (task.milestone_title && m.milestone_title && task.milestone_title.trim().toLowerCase() === m.milestone_title.trim().toLowerCase())
    );
  };

  // Extract min and max timeline bounds strictly for THIS individual milestone
  const getMilestoneTimelineBounds = (task: TaskItem) => {
    const milestone = getTaskMilestone(task);
    let minDate = '';
    let maxDate = '';

    if (milestone) {
      const sortedMilestones = [...(milestones || [])].sort(
        (a: any, b: any) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0)
      );

      // Base project/contract start timestamp
      const baseStart =
        milestone.contract_starts_at ||
        milestone.contract_created_at ||
        milestones?.[0]?.started_at ||
        milestones?.[0]?.contract_starts_at ||
        milestone.started_at;
      const referenceStartTime = baseStart ? new Date(baseStart).getTime() : Date.now();

      // Accumulate durations of earlier milestones
      let cumulativeOffsetHours = 0;
      let targetMilestoneHours = Number(milestone.duration_hours || 72);

      for (const m of sortedMilestones) {
        const mHours = Number(m.duration_hours || 72);
        if (String(m.job_milestone_id) === String(milestone.job_milestone_id)) {
          targetMilestoneHours = mHours;
          break;
        }
        cumulativeOffsetHours += mHours;
      }

      // Calculate milestone start and deadline
      const milestoneStartTime = referenceStartTime + cumulativeOffsetHours * 3600 * 1000;
      const milestoneEndTime = milestoneStartTime + targetMilestoneHours * 3600 * 1000;

      const computedStartIso = new Date(milestoneStartTime).toISOString().substring(0, 10);
      const computedDeadlineIso = new Date(milestoneEndTime).toISOString().substring(0, 10);

      // minDate: milestone start date
      minDate = milestone.started_at
        ? new Date(milestone.started_at).toISOString().substring(0, 10)
        : computedStartIso;

      // maxDate: milestone deadline (never exceed this milestone's own timeline into subsequent milestones)
      if (milestone.deadline_at) {
        const explicitIso = new Date(milestone.deadline_at).toISOString().substring(0, 10);
        maxDate = explicitIso <= computedDeadlineIso ? explicitIso : computedDeadlineIso;
      } else {
        maxDate = computedDeadlineIso;
      }
    }

    return {
      milestone,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
    };
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // The only person who can change status of their tasks is the one assigned to it
  const isTaskAssignee = (task: TaskItem) => {
    if (!task.assignee_account_id || !currentUserAccountId) return false;
    return String(task.assignee_account_id).trim() === String(currentUserAccountId).trim();
  };

  const handleUpdateStatus = async (task: TaskItem, newStatus: TaskItem['status']) => {
    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones to finish.');
      return;
    }
    if (!isTaskAssignee(task)) {
      showErrorToast('Only the assigned team member can change the status of this task.');
      return;
    }

    const prevStatus = task.status;
    // Optimistic seamless update
    setLocalTasks((prev) =>
      prev.map((t) => (t.task_id === task.task_id ? { ...t, status: newStatus } : t))
    );
    setActiveStatusMenuTaskId(null);

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        status: newStatus,
      });
      showSuccessToast(`Task moved to ${newStatus === 'review' ? 'On Review' : newStatus.replace('_', ' ')}`);
      onTasksUpdated?.(true);
    } catch (err: any) {
      // Revert optimistic update
      setLocalTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, status: prevStatus } : t))
      );
      showErrorToast(err?.response?.data?.message || 'Failed to update task');
    }
  };

  // Assignees can set priority for their tasks themselves
  const handleUpdatePriority = async (task: TaskItem, newPriority: TaskItem['priority']) => {
    if (!isTaskAssignee(task)) {
      showErrorToast('Only the assigned team member can change the priority.');
      return;
    }

    const prevPriority = task.priority;
    // Optimistic seamless update
    setLocalTasks((prev) =>
      prev.map((t) => (t.task_id === task.task_id ? { ...t, priority: newPriority } : t))
    );
    setActivePriorityMenuTaskId(null);

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        priority: newPriority,
      });
      showSuccessToast(`Priority updated to ${newPriority}`);
      onTasksUpdated?.(true);
    } catch (err: any) {
      // Revert optimistic update
      setLocalTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, priority: prevPriority } : t))
      );
      showErrorToast(err?.response?.data?.message || 'Failed to update priority');
    }
  };

  // Assignees can set due date for their tasks themselves, constrained by milestone timeline
  const handleUpdateDueDate = async (task: TaskItem, newDueDate: string) => {
    if (!isTaskAssignee(task)) {
      showErrorToast('Only the assigned team member can set the due date.');
      return;
    }

    if (newDueDate) {
      const { milestone, minDate, maxDate } = getMilestoneTimelineBounds(task);
      if (maxDate && newDueDate > maxDate) {
        showErrorToast(`Task due date cannot exceed the milestone deadline (${new Date(milestone.deadline_at).toLocaleDateString()})`);
        return;
      }
      if (minDate && newDueDate < minDate) {
        showErrorToast(`Task due date cannot precede the milestone start date (${new Date(milestone.started_at).toLocaleDateString()})`);
        return;
      }
    }

    const prevDueDate = task.due_at;
    // Optimistic seamless update
    setLocalTasks((prev) =>
      prev.map((t) => (t.task_id === task.task_id ? { ...t, due_at: newDueDate ? new Date(newDueDate).toISOString() : undefined } : t))
    );

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        due_at: newDueDate ? new Date(newDueDate).toISOString() : 'CLEAR',
      });
      showSuccessToast(newDueDate ? 'Due date updated' : 'Due date cleared');
      onTasksUpdated?.(true);
    } catch (err: any) {
      // Revert optimistic update
      setLocalTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, due_at: prevDueDate } : t))
      );
      showErrorToast(err?.response?.data?.message || 'Failed to update due date');
    }
  };

  const handleToggleChecklistItem = async (task: TaskItem, itemIndex: number) => {
    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones.');
      return;
    }
    if (!isTaskAssignee(task) && !isClient) {
      showErrorToast('Only the assigned member can check off subtasks.');
      return;
    }

    const currentChecklist: TaskChecklistItem[] = Array.isArray(task.checklist) ? [...task.checklist] : [];
    if (!currentChecklist[itemIndex]) return;

    const originalChecklist = [...currentChecklist];
    currentChecklist[itemIndex] = {
      ...currentChecklist[itemIndex],
      completed: !currentChecklist[itemIndex].completed,
    };

    // Optimistic seamless update
    setLocalTasks((prev) =>
      prev.map((t) => (t.task_id === task.task_id ? { ...t, checklist: currentChecklist } : t))
    );

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        checklist: currentChecklist,
      });
      onTasksUpdated?.(true);
    } catch (err: any) {
      setLocalTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, checklist: originalChecklist } : t))
      );
      showErrorToast(err?.response?.data?.message || 'Failed to update subtask');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClient) {
      showErrorToast('Clients cannot add tasks to the team workspace.');
      return;
    }
    if (!newTaskTitle.trim()) {
      showErrorToast('Please enter a task title');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/team-projects/${teamId}/tasks`, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        priority: newTaskPriority,
        assignee_account_id: currentUserAccountId,
        job_milestone_id: newTaskMilestone || null,
        status: defaultColForAdd,
        due_at: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
      });

      showSuccessToast('Task created successfully');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('normal');
      setNewTaskAssignee(currentUserAccountId || '');
      setNewTaskMilestone('');
      setNewTaskDueDate('');
      setIsAddModalOpen(false);
      onTasksUpdated?.(false);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddTaskModal = (columnId?: 'todo' | 'in_progress' | 'review' | 'completed') => {
    if (isClient) return;
    if (columnId) setDefaultColForAdd(columnId);
    else setDefaultColForAdd('todo');

    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('normal');
    setNewTaskDueDate('');

    // Default to the current contributor's assigned milestone
    const myMilestone = milestones?.find(
      (m: any) => String(m.assignee_account_id) === String(currentUserAccountId)
    );
    if (myMilestone) {
      setNewTaskMilestone(String(myMilestone.job_milestone_id));
    } else if (milestones && milestones.length > 0) {
      setNewTaskMilestone(String(milestones[0].job_milestone_id));
    } else {
      setNewTaskMilestone('');
    }

    setNewTaskAssignee(currentUserAccountId || '');
    setIsAddModalOpen(true);
  };

  // Filter tasks based on search & assignee filter
  const filteredTasks = useMemo(() => {
    return localTasks.filter((t) => {
      if (filterAssignee === 'me') {
        if (String(t.assignee_account_id) !== String(currentUserAccountId)) return false;
      } else if (filterAssignee !== 'all') {
        if (String(t.assignee_account_id) !== filterAssignee) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchAssignee = t.assignee_name?.toLowerCase().includes(q);
        const matchMilestone = t.milestone_title?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchMilestone) return false;
      }

      return true;
    });
  }, [localTasks, filterAssignee, currentUserAccountId, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP TAB SWITCHER: Board | List | Table | Gantt        */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121318] px-4 py-2 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Board Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('board')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 border-b-2 ${
              displayMode === 'board'
                ? 'border-blue-600 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 flex items-center justify-center p-0.5 shadow-2xs">
              <div className="w-1.5 h-full bg-white rounded-2xs" />
            </div>
            <span>Board</span>
          </button>

          {/* List Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('list')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 border-b-2 ${
              displayMode === 'list'
                ? 'border-blue-600 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5 text-slate-400" />
            <span>List</span>
          </button>

          {/* Table Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('table')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 border-b-2 ${
              displayMode === 'table'
                ? 'border-blue-600 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Table</span>
          </button>

          {/* Gantt Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('gantt')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 border-b-2 ${
              displayMode === 'gantt'
                ? 'border-blue-600 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-rose-500" />
            <span>Gantt</span>
          </button>

          {/* + View pill */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition cursor-pointer shrink-0">
            <Plus className="w-3 h-3" />
            <span>View</span>
          </div>
        </div>

        {/* Total Tasks Counter */}
        <span className="text-xs text-slate-500 dark:text-zinc-400 self-end sm:self-auto shrink-0 font-medium">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 2. SUBHEADER TOOLBAR (Matching Reference Pics)           */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121318] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        {/* Left Side: Status pill + Link */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Status</span>
          </div>

          <button
            type="button"
            title="Task Dependencies"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
          >
            <Link2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Filters, Search, and + Task button */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Icons: Reorder, Filter, Assignee */}
          <button
            type="button"
            title="Sort"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Filter"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setFilterAssignee(filterAssignee === 'me' ? 'all' : 'me')}
            title={filterAssignee === 'me' ? 'Show all tasks' : 'Show only my tasks'}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              filterAssignee === 'me'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-28 sm:w-40"
            />
          </div>

          {/* Assignee Filter Dropdown */}
          <div className="hidden md:flex items-center gap-1.5">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Assignees</option>
              <option value="me">My Tasks</option>
              {members.map((m: any) => (
                <option key={m.account_id} value={m.account_id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Primary + Task Button with Dropdown Chevron */}
          {!isClient && (
            <button
              type="button"
              onClick={() => openAddTaskModal()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Task</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DISPLAY 1: BOARD VIEW (Matching Reference 1)         */}
      {/* ======================================================== */}
      {displayMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => normalizeStatus(t.status) === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/70 dark:bg-[#121318] rounded-xl border border-slate-200 dark:border-zinc-800 p-3 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    {/* Status Pill Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        col.id === 'todo'
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : col.id === 'in_progress'
                          ? 'bg-blue-600 text-white'
                          : col.id === 'review'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {col.id === 'todo' ? (
                        <div className="w-2.5 h-2.5 rounded-full border border-dashed border-zinc-300" />
                      ) : col.id === 'in_progress' ? (
                        <div className="w-2 h-2 rounded-full bg-white ring-2 ring-blue-300" />
                      ) : col.id === 'review' ? (
                        <Clock className="w-3 h-3 text-white" />
                      ) : (
                        <Check className="w-3 h-3 text-white" />
                      )}
                      <span>{col.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {!isClient && (
                      <button
                        type="button"
                        onClick={() => openAddTaskModal(col.id as any)}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Add Task"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl text-xs text-slate-400 dark:text-zinc-500 font-medium">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;
                      const isOwner = isTaskAssignee(task);
                      const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                      const completedCount = checklist.filter((item) => item.completed).length;
                      const hasSubtasks = checklist.length > 0;
                      const isExpanded = Boolean(expandedTasks[task.task_id]);
                      const isCardActive =
                        activeStatusMenuTaskId === task.task_id || activePriorityMenuTaskId === task.task_id;

                      return (
                        <div
                          key={task.task_id}
                          className={`bg-white dark:bg-[#181a24] p-4 rounded-xl border transition-all duration-150 shadow-xs relative ${
                            isCardActive ? 'z-20' : 'z-0'
                          } ${
                            task.is_locked
                              ? 'border-slate-300 dark:border-zinc-700/60 opacity-80'
                              : 'border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          {/* Locked Badge */}
                          {task.is_locked && (
                            <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              <Lock className="w-3 h-3 text-amber-500" />
                              Locked (Milestone {task.milestone_order || 1})
                            </div>
                          )}

                          {/* Task Title */}
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                            {task.title}
                          </h4>

                          {/* Description if present */}
                          {task.description && (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Subtasks Progress */}
                          {hasSubtasks && (
                            <div className="mb-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                              <button
                                type="button"
                                onClick={() => toggleExpand(task.task_id)}
                                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 transition"
                              >
                                <span className="flex items-center gap-1">
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  Subtasks ({completedCount}/{checklist.length})
                                </span>
                                <span className="font-mono text-[10px]">
                                  {Math.round((completedCount / checklist.length) * 100)}%
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-blue-500/30">
                                  {checklist.map((item, cIdx) => (
                                    <label
                                      key={cIdx}
                                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.completed}
                                        disabled={task.is_locked || (!isOwner && !isClient)}
                                        onChange={() => handleToggleChecklistItem(task, cIdx)}
                                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                                      />
                                      <span className={item.completed ? 'line-through text-slate-400 dark:text-zinc-500' : ''}>
                                        {item.title}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick Actions Row: Assignee, Due date, Priority flag, Tag (Reference 1) */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-slate-400 dark:text-zinc-500">
                            <div className="flex items-center gap-2">
                              {/* Assignee Icon: Fixed circular container so it NEVER flattens */}
                              <div
                                className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center"
                                title={task.assignee_name ? `Assigned to: ${task.assignee_name}` : 'Unassigned'}
                              >
                                {task.assignee_avatar_path ? (
                                  <img
                                    src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name || 'User')}
                                    alt={task.assignee_name || 'Assignee'}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                                    }}
                                    className="w-full h-full object-cover block shrink-0"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                              </div>

                              {/* Due Date: Editable by assignee, bounded by milestone timeline. No "Set date" text */}
                              {(() => {
                                const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                                return isOwner ? (
                                  <div
                                    className="relative flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition group/date"
                                    title={
                                      maxDate
                                        ? task.due_at
                                          ? `Due: ${new Date(task.due_at).toLocaleDateString()} (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                          : `Set due date (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                        : task.due_at
                                        ? `Due: ${new Date(task.due_at).toLocaleDateString()}`
                                        : 'Set due date'
                                    }
                                  >
                                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.due_at ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`} />
                                    {task.due_at && (
                                      <span className="text-[10px] text-slate-700 dark:text-zinc-300 font-semibold ml-1 whitespace-nowrap">
                                        {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                    <input
                                      type="date"
                                      min={minDate}
                                      max={maxDate}
                                      value={task.due_at ? task.due_at.substring(0, 10) : ''}
                                      onChange={(e) => handleUpdateDueDate(task, e.target.value)}
                                      onClick={(e) => {
                                        try {
                                          (e.target as any).showPicker?.();
                                        } catch {}
                                      }}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 p-1"
                                    title={task.due_at ? `Due: ${new Date(task.due_at).toLocaleDateString()}` : 'No due date'}
                                  >
                                    <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                    {task.due_at && (
                                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                                        {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Priority Flag: Click flag only, no text label */}
                              {isOwner ? (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePriorityMenuTaskId(activePriorityMenuTaskId === task.task_id ? null : task.task_id);
                                      setActiveStatusMenuTaskId(null);
                                    }}
                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center"
                                    title={`Priority: ${priorityConfig.label} (Click flag to change)`}
                                  >
                                    <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                  </button>

                                  {activePriorityMenuTaskId === task.task_id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-20 cursor-default"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePriorityMenuTaskId(null);
                                        }}
                                      />
                                      <div
                                        className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                          Priority
                                        </div>
                                        {[
                                          { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                                          { id: 'high', label: 'High', color: 'text-amber-500' },
                                          { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                                          { id: 'low', label: 'Low', color: 'text-slate-400' },
                                        ].map((p) => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                              handleUpdatePriority(task, p.id as any);
                                              setActivePriorityMenuTaskId(null);
                                            }}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Flag className={`w-3.5 h-3.5 shrink-0 ${p.color}`} />
                                              <span>{p.label}</span>
                                            </div>
                                            {task.priority === p.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="p-1" title={`Priority: ${priorityConfig.label} (View only)`}>
                                  <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                </div>
                              )}

                              {/* Status Tag Icon: ONLY assignee can change; others view only. No "IN PROGRESS" text */}
                              {(() => {
                                const statusCfg = getStatusBadgeConfig(task.status);
                                const normStatus = normalizeStatus(task.status);
                                const tagColorClass =
                                  normStatus === 'completed'
                                    ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : normStatus === 'review'
                                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                    : normStatus === 'in_progress'
                                    ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                    : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800';

                                const tooltipText = isOwner
                                  ? `Status: ${statusCfg.label}${task.milestone_title ? ` (Milestone: ${task.milestone_title})` : ''} - Click to change`
                                  : `Status: ${statusCfg.label}${task.milestone_title ? ` (Milestone: ${task.milestone_title})` : ''} (Assigned to ${task.assignee_name || 'member'})`;

                                return isOwner ? (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      disabled={task.is_locked && !isClient}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveStatusMenuTaskId(activeStatusMenuTaskId === task.task_id ? null : task.task_id);
                                        setActivePriorityMenuTaskId(null);
                                      }}
                                      className={`p-1 rounded-md transition cursor-pointer flex items-center justify-center ${tagColorClass}`}
                                      title={tooltipText}
                                    >
                                      <Tag className="w-3.5 h-3.5 shrink-0" />
                                    </button>

                                    {activeStatusMenuTaskId === task.task_id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20 cursor-default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveStatusMenuTaskId(null);
                                          }}
                                        />
                                        <div
                                          className="absolute right-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                            Status
                                          </div>
                                          {STATUS_OPTIONS.map((s) => (
                                            <button
                                              key={s.id}
                                              type="button"
                                              onClick={() => {
                                                handleUpdateStatus(task, s.id as any);
                                                setActiveStatusMenuTaskId(null);
                                              }}
                                              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2">
                                                {s.icon}
                                                <span className={normStatus === s.id ? s.textColor : ''}>{s.label}</span>
                                              </div>
                                              {normStatus === s.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`p-1 rounded-md ${tagColorClass} cursor-default`}
                                    title={tooltipText}
                                  >
                                    <Tag className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Right side contract task indicator - icon only */}
                            {task.is_contract_task && (
                              <div
                                className="p-1 rounded-md text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition flex items-center justify-center shrink-0 cursor-default"
                                title="Contract Task (Defined by contract agreement - scope & title fixed)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* + Add Task at Bottom of Column */}
                  {!isClient && (
                    <button
                      type="button"
                      onClick={() => openAddTaskModal(col.id as any)}
                      className="w-full flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. DISPLAY 2: LIST VIEW (Matching Reference 2)           */}
      {/* ======================================================== */}
      {displayMode === 'list' && (
        <div className="space-y-6">
          {COLUMNS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => normalizeStatus(t.status) === group.id);
            const isCollapsed = Boolean(collapsedGroups[group.id]);

            return (
              <div key={group.id} className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                {/* Group Accordion Header */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="p-3.5 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button type="button" className="text-slate-400">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Group Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        group.id === 'todo'
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : group.id === 'in_progress'
                          ? 'bg-blue-600 text-white'
                          : group.id === 'review'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {group.id === 'todo' ? (
                        <div className="w-2.5 h-2.5 rounded-full border border-dashed border-zinc-300" />
                      ) : group.id === 'in_progress' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      ) : group.id === 'review' ? (
                        <Clock className="w-3 h-3 text-white" />
                      ) : (
                        <Check className="w-3 h-3 text-white" />
                      )}
                      <span>{group.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                      {groupTasks.length}
                    </span>
                  </div>

                  {!isClient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddTaskModal(group.id as any);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      title="Add Task to Group"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Group Rows Table */}
                {!isCollapsed && (
                  <div>
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/80 uppercase tracking-wider">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Assignee</div>
                      <div className="col-span-2">Due Date</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>

                    {/* Task Rows */}
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                      {groupTasks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                          No tasks in this group.
                        </div>
                      ) : (
                        groupTasks.map((task) => {
                          const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                          return (
                            <div
                              key={task.task_id}
                              className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 text-xs transition"
                            >
                              {/* Name with Bullet */}
                              <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                                {task.status === 'completed' ? (
                                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-white" />
                                  </div>
                                ) : normalizeStatus(task.status) === 'review' ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  </div>
                                ) : task.status === 'in_progress' ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-400 shrink-0" />
                                )}

                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                  {task.title}
                                </span>
                              </div>

                              {/* Assignee */}
                              <div className="col-span-2 flex items-center gap-1.5 truncate">
                                <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                  {task.assignee_avatar_path ? (
                                    <img
                                      src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name || 'User')}
                                      alt={task.assignee_name || 'User'}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                                      }}
                                      className="w-full h-full object-cover block shrink-0"
                                    />
                                  ) : (
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  )}
                                </div>
                                <span className="text-slate-600 dark:text-zinc-300 truncate">
                                  {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>

                              {/* Due Date: Editable by assignee, bounded by milestone timeline. No "Set date" text */}
                              {(() => {
                                const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                                return isTaskAssignee(task) ? (
                                  <div
                                    className="col-span-2 relative flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 hover:text-blue-500 transition group/date w-fit p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    title={
                                      maxDate
                                        ? task.due_at
                                          ? `Due: ${new Date(task.due_at).toLocaleDateString()} (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                          : `Set due date (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                        : task.due_at
                                        ? `Due: ${new Date(task.due_at).toLocaleDateString()}`
                                        : 'Set due date'
                                    }
                                  >
                                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.due_at ? 'text-blue-500' : 'text-slate-400 group-hover/date:text-blue-500'}`} />
                                    {task.due_at ? (
                                      <span className="text-[11px] font-semibold whitespace-nowrap">
                                        {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 group-hover/date:text-blue-500 whitespace-nowrap font-medium">
                                        --
                                      </span>
                                    )}
                                    <input
                                      type="date"
                                      min={minDate}
                                      max={maxDate}
                                      value={task.due_at ? task.due_at.substring(0, 10) : ''}
                                      onChange={(e) => handleUpdateDueDate(task, e.target.value)}
                                      onClick={(e) => {
                                        try {
                                          (e.target as any).showPicker?.();
                                        } catch {}
                                      }}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="col-span-2 flex items-center gap-1 text-slate-500 dark:text-zinc-400 p-1">
                                    <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                    <span className="text-[11px] whitespace-nowrap">
                                      {task.due_at ? new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                                    </span>
                                  </div>
                                );
                              })()}

                              {/* Priority: Editable by assignee, read-only for others */}
                              {isTaskAssignee(task) ? (
                                <div className="col-span-1 relative flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePriorityMenuTaskId(activePriorityMenuTaskId === task.task_id ? null : task.task_id);
                                      setActiveStatusMenuTaskId(null);
                                    }}
                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                                    title={`Priority: ${priorityConfig.label} (Click flag to change)`}
                                  >
                                    <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                  </button>

                                  {activePriorityMenuTaskId === task.task_id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-20 cursor-default"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePriorityMenuTaskId(null);
                                        }}
                                      />
                                      <div
                                        className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                          Priority
                                        </div>
                                        {[
                                          { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                                          { id: 'high', label: 'High', color: 'text-amber-500' },
                                          { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                                          { id: 'low', label: 'Low', color: 'text-slate-400' },
                                        ].map((p) => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                              handleUpdatePriority(task, p.id as any);
                                              setActivePriorityMenuTaskId(null);
                                            }}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Flag className={`w-3.5 h-3.5 shrink-0 ${p.color}`} />
                                              <span>{p.label}</span>
                                            </div>
                                            {task.priority === p.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="col-span-1 flex items-center gap-1" title={`Priority: ${priorityConfig.label} (View only)`}>
                                  <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                </div>
                              )}

                              {/* Status Pill: ONLY assignee can change; others view only */}
                              <div className="col-span-2 flex items-center justify-end">
                                {(() => {
                                  const statusCfg = getStatusBadgeConfig(task.status);
                                  return isTaskAssignee(task) ? (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        disabled={task.is_locked && !isClient}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveStatusMenuTaskId(activeStatusMenuTaskId === task.task_id ? null : task.task_id);
                                          setActivePriorityMenuTaskId(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer ${statusCfg.btnClass}`}
                                        title="Click to change status"
                                      >
                                        {statusCfg.icon}
                                        <span>{statusCfg.label}</span>
                                        <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                      </button>

                                      {activeStatusMenuTaskId === task.task_id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20 cursor-default"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveStatusMenuTaskId(null);
                                            }}
                                          />
                                          <div
                                            className="absolute right-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                              Status
                                            </div>
                                            {STATUS_OPTIONS.map((s) => (
                                              <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateStatus(task, s.id as any);
                                                  setActiveStatusMenuTaskId(null);
                                                }}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                              >
                                                <div className="flex items-center gap-2">
                                                  {s.icon}
                                                  <span className={normalizeStatus(task.status) === s.id ? s.textColor : ''}>{s.label}</span>
                                                </div>
                                                {normalizeStatus(task.status) === s.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <span
                                      title={`Assigned to ${task.assignee_name || 'member'} (View only)`}
                                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusCfg.btnClass}`}
                                    >
                                      <Lock className="w-2.5 h-2.5 opacity-60" />
                                      <span>{statusCfg.label}</span>
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom + Add Task Link */}
                    {!isClient && (
                      <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => openAddTaskModal(group.id as any)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DISPLAY 3: TABLE VIEW (Matching Reference 3)          */}
      {/* ======================================================== */}
      {displayMode === 'table' && (
        <div className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200 dark:border-zinc-800">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 dark:border-zinc-800">#</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <span>Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200 dark:border-zinc-800">Assignee</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 dark:border-zinc-800">Status</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 dark:border-zinc-800">Due date</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 dark:border-zinc-800">Priority</th>
                  <th className="py-2.5 px-4">Milestone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, rIdx) => {
                    const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                    return (
                      <tr key={task.task_id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition">
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-zinc-800/80">
                          <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 dark:text-zinc-500 border-r border-slate-100 dark:border-zinc-800/80">
                          {rIdx + 1}
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-2">
                            {task.status === 'completed' ? (
                              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                            ) : normalizeStatus(task.status) === 'review' ? (
                              <div className="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-500 shrink-0" />
                            ) : task.status === 'in_progress' ? (
                              <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-blue-500 shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-dashed border-slate-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                              {task.assignee_avatar_path ? (
                                <img
                                  src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name || 'User')}
                                  alt={task.assignee_name || 'User'}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                                  }}
                                  className="w-full h-full object-cover block shrink-0"
                                />
                              ) : (
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                            <span className="text-slate-700 dark:text-zinc-300">
                              {task.assignee_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        {/* Status Column */}
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-zinc-800/80">
                          {(() => {
                            const statusCfg = getStatusBadgeConfig(task.status);
                            return isTaskAssignee(task) ? (
                              <div className="relative">
                                <button
                                  type="button"
                                  disabled={task.is_locked && !isClient}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStatusMenuTaskId(activeStatusMenuTaskId === task.task_id ? null : task.task_id);
                                    setActivePriorityMenuTaskId(null);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${statusCfg.btnClass}`}
                                  title="Click to change status"
                                >
                                  {statusCfg.icon}
                                  <span>{statusCfg.label}</span>
                                  <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                </button>

                                {activeStatusMenuTaskId === task.task_id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20 cursor-default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveStatusMenuTaskId(null);
                                      }}
                                    />
                                    <div
                                      className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                        Status
                                      </div>
                                      {STATUS_OPTIONS.map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateStatus(task, s.id as any);
                                            setActiveStatusMenuTaskId(null);
                                          }}
                                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            {s.icon}
                                            <span className={normalizeStatus(task.status) === s.id ? s.textColor : ''}>{s.label}</span>
                                          </div>
                                          {normalizeStatus(task.status) === s.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span
                                title={`Assigned to ${task.assignee_name || 'member'} (View only)`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusCfg.btnClass}`}
                              >
                                <Lock className="w-2.5 h-2.5 opacity-60" />
                                <span>{statusCfg.label}</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* Due Date Column */}
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400">
                          {(() => {
                            const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                            return isTaskAssignee(task) ? (
                              <div
                                className="relative flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 hover:text-blue-500 transition group/date w-fit p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                                title={
                                  maxDate
                                    ? task.due_at
                                      ? `Due: ${new Date(task.due_at).toLocaleDateString()} (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                      : `Set due date (Milestone deadline: ${new Date(maxDate).toLocaleDateString()})`
                                    : task.due_at
                                    ? `Due: ${new Date(task.due_at).toLocaleDateString()}`
                                    : 'Set due date'
                                }
                              >
                                <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.due_at ? 'text-blue-500' : 'text-slate-400 group-hover/date:text-blue-500'}`} />
                                {task.due_at ? (
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 group-hover/date:text-blue-500 whitespace-nowrap font-medium">
                                    --
                                  </span>
                                )}
                                <input
                                  type="date"
                                  min={minDate}
                                  max={maxDate}
                                  value={task.due_at ? task.due_at.substring(0, 10) : ''}
                                  onChange={(e) => handleUpdateDueDate(task, e.target.value)}
                                  onClick={(e) => {
                                    try {
                                      (e.target as any).showPicker?.();
                                    } catch {}
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] whitespace-nowrap">
                                {task.due_at ? new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Priority Column */}
                        <td className="py-2.5 px-4 border-r border-slate-100 dark:border-zinc-800/80">
                          {isTaskAssignee(task) ? (
                            <div className="relative flex items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePriorityMenuTaskId(activePriorityMenuTaskId === task.task_id ? null : task.task_id);
                                  setActiveStatusMenuTaskId(null);
                                }}
                                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                                title={`Priority: ${priorityConfig.label} (Click flag to change)`}
                              >
                                <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300">{priorityConfig.label}</span>
                              </button>

                              {activePriorityMenuTaskId === task.task_id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20 cursor-default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePriorityMenuTaskId(null);
                                    }}
                                  />
                                  <div
                                    className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                      Priority
                                    </div>
                                    {[
                                      { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                                      { id: 'high', label: 'High', color: 'text-amber-500' },
                                      { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                                      { id: 'low', label: 'Low', color: 'text-slate-400' },
                                    ].map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          handleUpdatePriority(task, p.id as any);
                                          setActivePriorityMenuTaskId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Flag className={`w-3.5 h-3.5 shrink-0 ${p.color}`} />
                                          <span>{p.label}</span>
                                        </div>
                                        {task.priority === p.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium" title={`Priority: ${priorityConfig.label} (View only)`}>
                              <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                              <span className="text-[10px] text-slate-600 dark:text-zinc-400">{priorityConfig.label}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-zinc-400 truncate max-w-[150px]">
                          {task.milestone_title || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Add Row Button at Table Bottom */}
                {!isClient && (
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition">
                    <td colSpan={8} className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => openAddTaskModal()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add row / task</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. DISPLAY 4: GANTT TIMELINE VIEW                        */}
      {/* ======================================================== */}
      {displayMode === 'gantt' && (
        <div className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden space-y-4 p-4">
          {/* Gantt Header & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-rose-500" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Gantt Schedule: Milestones & Tasks
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Comprehensive timeline of overall contractual milestones and detailed task execution with assigned owners
                </p>
              </div>
            </div>

            {/* Filter Pills for Gantt */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 p-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setGanttSection('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Schedules
              </button>
              <button
                type="button"
                onClick={() => setGanttSection('milestones')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'milestones'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Milestones ({milestones.length})
              </button>
              <button
                type="button"
                onClick={() => setGanttSection('tasks')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'tasks'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tasks ({filteredTasks.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto space-y-6">
            {/* ==================================================== */}
            {/* 6.1 CHART FOR MILESTONES OVERALL                     */}
            {/* ==================================================== */}
            {(ganttSection === 'all' || ganttSection === 'milestones') && (
              <div className="space-y-2 min-w-[760px]">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Milestones Overall Schedule ({milestones.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    Contract deliverables, budget escrows, and assigned contributors
                  </span>
                </div>

                {/* Milestones Timeline Grid Header */}
                <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  <div className="col-span-5 grid grid-cols-12 gap-1">
                    <span className="col-span-6">Milestone & Escrow</span>
                    <span className="col-span-6">Assigned Contributor</span>
                  </div>
                  <div className="col-span-7 grid grid-cols-8 text-center">
                    <span>Day 1-2</span>
                    <span>Day 3-4</span>
                    <span>Day 5-6</span>
                    <span>Day 7-8</span>
                    <span>Day 9-10</span>
                    <span>Day 11-12</span>
                    <span>Day 13-14</span>
                    <span>Day 15+</span>
                  </div>
                </div>

                {/* Milestone Rows */}
                {milestones.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No milestones found for this project.
                  </div>
                ) : (
                  milestones.map((m: any, mIdx: number) => {
                    const statusLower = String(m.milestone_status || '').toLowerCase();
                    const isApproved = statusLower === 'completed' || statusLower === 'approved';
                    const isReview = statusLower === 'submitted_for_review';
                    const isInProgress = statusLower === 'in_progress' || statusLower === 'active' || m.is_current;

                    const progressPercent = isApproved ? 100 : isReview ? 90 : isInProgress ? 50 : 0;
                    const startCol = Math.min((mIdx * 2) + 1, 6);
                    const colSpan = Math.min(3, 9 - startCol);

                    return (
                      <div
                        key={m.job_milestone_id || mIdx}
                        className="grid grid-cols-12 gap-1 items-center py-2 px-1 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 rounded-lg transition border-b border-slate-100 dark:border-zinc-800/40"
                      >
                        {/* Milestone & Assignee Info */}
                        <div className="col-span-5 grid grid-cols-12 gap-2 items-center pr-2">
                          {/* Title & Escrow */}
                          <div className="col-span-6 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                M{m.order_index || mIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {m.milestone_title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate ml-1">
                              {Number(m.budget_credits || 0).toLocaleString()} Credits
                            </span>
                          </div>

                          {/* Assigned Contributor */}
                          <div className="col-span-6 flex items-center gap-1.5 truncate">
                            <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                              {m.assignee_avatar_path ? (
                                <img
                                  src={constructAvatarUrl(m.assignee_avatar_path, m.assignee_name || 'Contributor')}
                                  alt={m.assignee_name || 'Contributor'}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.assignee_name);
                                  }}
                                  className="w-full h-full object-cover block shrink-0"
                                />
                              ) : (
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate block">
                                {m.assignee_name || 'Unassigned'}
                              </span>
                              {m.assignee_handle && (
                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 block truncate">
                                  @{m.assignee_handle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Milestone Horizontal Timeline Bar */}
                        <div className="col-span-7 grid grid-cols-8 gap-1 h-8 bg-slate-100/70 dark:bg-zinc-900/60 rounded-lg p-1 relative items-center">
                          <div
                            style={{
                              gridColumnStart: startCol,
                              gridColumnEnd: `span ${colSpan}`,
                            }}
                            className={`h-full rounded-md text-[10px] font-bold text-white px-2.5 flex items-center justify-between shadow-2xs ${
                              isApproved
                                ? 'bg-emerald-600'
                                : isReview
                                ? 'bg-amber-600'
                                : isInProgress
                                ? 'bg-blue-600'
                                : 'bg-zinc-700'
                            }`}
                          >
                            <span className="truncate">
                              M{m.order_index || mIdx + 1}: {m.milestone_title}
                            </span>
                            <span className="text-[9px] opacity-90 shrink-0 ml-1.5 font-mono">
                              {progressPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* 6.2 CHART FOR TASKS DETAILED SCHEDULE                */}
            {/* ==================================================== */}
            {(ganttSection === 'all' || ganttSection === 'tasks') && (
              <div className="space-y-2 min-w-[760px] pt-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Kanban className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Tasks Detailed Schedule ({filteredTasks.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    Task execution by assigned team members, priority, and progress
                  </span>
                </div>

                {/* Tasks Timeline Grid Header */}
                <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  <div className="col-span-5 grid grid-cols-12 gap-1">
                    <span className="col-span-6">Task & Milestone</span>
                    <span className="col-span-6">Assigned Member</span>
                  </div>
                  <div className="col-span-7 grid grid-cols-8 text-center">
                    <span>Day 1-2</span>
                    <span>Day 3-4</span>
                    <span>Day 5-6</span>
                    <span>Day 7-8</span>
                    <span>Day 9-10</span>
                    <span>Day 11-12</span>
                    <span>Day 13-14</span>
                    <span>Day 15+</span>
                  </div>
                </div>

                {/* Task Gantt Bars */}
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No tasks to display in Gantt view.
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const normStatus = normalizeStatus(task.status);
                    const isDone = normStatus === 'completed';
                    const isReview = normStatus === 'review';
                    const isInProg = normStatus === 'in_progress';
                    const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                    // Calculate timeline start and span
                    const startCol = (idx % 4) + 1;
                    const colSpan = isDone ? 2 : isReview ? 5 : isInProg ? 4 : 3;

                    return (
                      <div
                        key={task.task_id}
                        className="grid grid-cols-12 gap-1 items-center py-2 px-1 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 rounded-lg transition border-b border-slate-100 dark:border-zinc-800/40"
                      >
                        {/* Task & Assignee Info */}
                        <div className="col-span-5 grid grid-cols-12 gap-2 items-center pr-2">
                          {/* Task Name & Milestone */}
                          <div className="col-span-6 min-w-0 flex items-center gap-2">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : isReview ? (
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : isInProg ? (
                              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-dashed border-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                                {task.title}
                              </span>
                              {task.milestone_title && (
                                <span className="text-[10px] text-blue-500 truncate block">
                                  M{task.milestone_order || 1}: {task.milestone_title}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Assigned Member */}
                          <div className="col-span-6 flex items-center justify-between gap-1.5 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                {task.assignee_avatar_path ? (
                                  <img
                                    src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name || 'User')}
                                    alt={task.assignee_name || 'User'}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                                    }}
                                    className="w-full h-full object-cover block shrink-0"
                                  />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                                {task.assignee_name || 'Unassigned'}
                              </span>
                            </div>

                            <Flag className={`w-3 h-3 shrink-0 ${priorityConfig.color}`} title={`Priority: ${priorityConfig.label}`} />
                          </div>
                        </div>

                        {/* Task Timeline Bar */}
                        <div className="col-span-7 grid grid-cols-8 gap-1 h-7 bg-slate-100/60 dark:bg-zinc-900/50 rounded-lg p-1 relative items-center">
                          <div
                            style={{
                              gridColumnStart: startCol,
                              gridColumnEnd: `span ${colSpan}`,
                            }}
                            className={`h-full rounded-md text-[10px] font-bold text-white px-2 flex items-center justify-between shadow-2xs ${
                              isDone
                                ? 'bg-emerald-600'
                                : isReview
                                ? 'bg-amber-600'
                                : isInProg
                                ? 'bg-blue-600'
                                : 'bg-zinc-700'
                            }`}
                          >
                            <span className="truncate">{task.title}</span>
                            <span className="text-[9px] opacity-80 shrink-0 ml-1 font-mono">
                              {isDone ? '100%' : isReview ? '80%' : isInProg ? '50%' : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD TASK MODAL                                           */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151720] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Create Project Task
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build authentication endpoints"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task details and instructions..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                    Assignee
                  </label>
                  <div className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-2 border border-slate-200 dark:border-zinc-700">
                    <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>You (Auto-assigned)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                  Associated Milestone
                </label>
                <select
                  value={newTaskMilestone}
                  onChange={(e) => {
                    setNewTaskMilestone(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">No Milestone Linked</option>
                  {milestones?.map((m: any, idx: number) => {
                    const isMyM = String(m.assignee_account_id) === String(currentUserAccountId);
                    return (
                      <option key={m.job_milestone_id || idx} value={m.job_milestone_id}>
                        M{m.order_index || idx + 1}: {m.milestone_title} {isMyM ? '★ (Your Assigned Milestone)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                {(() => {
                  const bounds = getMilestoneTimelineBounds({ job_milestone_id: newTaskMilestone } as any);
                  const minD = bounds.minDate;
                  const maxD = bounds.maxDate;
                  return (
                    <>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                        Due Date {maxD ? `(Milestone deadline: ${new Date(maxD).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}
                      </label>
                      <input
                        type="date"
                        min={minD}
                        max={maxD}
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                      />
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTaskTitle.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectTaskboardTab;
