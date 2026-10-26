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
  GripVertical,
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
import { motion, AnimatePresence } from 'framer-motion';
import useGlobalState from '@/lib/global_state';
import GlideSelect, { type GlideSelectOption } from '@/components/ui/GlideSelect';

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
  projectTitle?: string;
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
        btnClass: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700',
        icon: <div className="w-2 h-2 rounded-full border border-dashed border-zinc-500 dark:border-zinc-400 shrink-0" />,
      };
  }
};

export const STATUS_OPTIONS = [
  {
    id: 'todo' as const,
    label: 'TO DO',
    icon: <div className="w-2 h-2 rounded-full border border-dashed border-zinc-500 dark:border-zinc-400 shrink-0" />,
    textColor: 'text-zinc-800 dark:text-zinc-200',
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
  low: { color: 'text-zinc-400', label: 'Low' },
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
  projectTitle,
}) => {
  // Local optimistic state for zero-latency seamless taskboard updates
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Check if current user is a subcontractor with scoped milestone permissions
  const currentMember = useMemo(() => {
    return (members || []).find(
      (m: any) => String(m.account_id).trim() === String(currentUserAccountId).trim()
    );
  }, [members, currentUserAccountId]);

  const isSubcontractor = Boolean(
    currentMember?.is_subcontractor || currentMember?.team_role === 'Subcontractor'
  );
  const subcontractorMilestoneId = currentMember?.assigned_milestone_id;
  const subcontractorMilestoneTitle =
    currentMember?.assigned_milestone_title || currentMember?.milestone_role;
  const subcontractorParentHandle = currentMember?.parent_contractor_handle;

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

  // Selected Milestone for Progress Bar View (defaults to current active milestone)
  const [selectedProgressMilestoneId, setSelectedProgressMilestoneId] = useState<string | null>(null);
  const [isMilestoneProgressCollapsed, setIsMilestoneProgressCollapsed] = useState(false);

  // Popover menus state
  const [activeStatusMenuTaskId, setActiveStatusMenuTaskId] = useState<string | null>(null);
  const [activePriorityMenuTaskId, setActivePriorityMenuTaskId] = useState<string | null>(null);

  // Kanban 4 Selection & Drag-and-Drop state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Generate issue keys for all tasks (Option A: #TSK-01 or derived from project title)
  const taskCodeMap = useMemo(() => {
    let prefix = 'TSK';
    if (projectTitle) {
      const words = projectTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
      if (words.length >= 3) {
        prefix = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
      } else if (words.length === 2) {
        prefix = (words[0].slice(0, 2) + words[1][0]).toUpperCase();
      } else if (words.length === 1 && words[0].length >= 3) {
        prefix = words[0].slice(0, 3).toUpperCase();
      }
    }
    const map: Record<string, string> = {};
    const sorted = [...tasks].sort((a, b) => {
      const orderA = a.milestone_order ?? 999;
      const orderB = b.milestone_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    sorted.forEach((t, idx) => {
      map[t.task_id] = `${prefix}-${String(idx + 1).padStart(2, '0')}`;
    });
    return map;
  }, [tasks, projectTitle]);

  const selectedTask = useMemo(() => {
    return localTasks.find((t) => t.task_id === selectedTaskId) || null;
  }, [localTasks, selectedTaskId]);

  // Close card detail side panel on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTaskId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const storeTheme = useGlobalState((state) => state.theme);
  const isDark = storeTheme !== 'light';

  // Assignee options with profile picture icons for GlideSelect
  const assigneeSelectOptions: GlideSelectOption[] = useMemo(() => {
    const list: GlideSelectOption[] = [
      {
        value: 'all',
        label: 'All Assignees',
        icon: (
          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <Users className="w-3 h-3" />
          </div>
        ),
      },
      {
        value: 'me',
        label: 'My Tasks',
        icon: (
          <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3" />
          </div>
        ),
      },
    ];

    members.forEach((m: any) => {
      const avatarPath =
        m.avatar_path ||
        tasks.find((t) => String(t.assignee_account_id) === String(m.account_id))?.assignee_avatar_path;
      const displayName = m.display_name || m.name || 'Member';

      list.push({
        value: String(m.account_id),
        label: displayName,
        icon: (
          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 aspect-square border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
            {avatarPath ? (
              <img
                src={constructAvatarUrl(avatarPath, displayName)}
                alt={displayName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(displayName);
                }}
                className="w-full h-full object-cover block shrink-0"
              />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>
        ),
      });
    });

    tasks.forEach((t) => {
      if (t.assignee_account_id && !list.some((o) => o.value === String(t.assignee_account_id))) {
        const displayName = t.assignee_name || 'Contributor';
        list.push({
          value: String(t.assignee_account_id),
          label: displayName,
          icon: (
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 aspect-square border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
              {t.assignee_avatar_path ? (
                <img
                  src={constructAvatarUrl(t.assignee_avatar_path, displayName)}
                  alt={displayName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackAvatarUrl(displayName);
                  }}
                  className="w-full h-full object-cover block shrink-0"
                />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>
          ),
        });
      }
    });

    return list;
  }, [members, tasks]);

  const handleCardClick = (task: TaskItem) => {
    setSelectedTaskId((prev) => (prev === task.task_id ? null : task.task_id));
  };

  const handleDropOnColumn = (targetColId: 'todo' | 'in_progress' | 'review' | 'completed') => {
    if (!draggingTaskId) return;
    const task = localTasks.find((t) => t.task_id === draggingTaskId);
    setDraggingTaskId(null);
    setDragOverColumnId(null);
    if (!task) return;

    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones to finish.');
      return;
    }
    if (!isTaskAssignee(task) && !isClient) {
      showErrorToast('Only the assigned team member can move this task.');
      return;
    }
    if (normalizeStatus(task.status) === targetColId) return;

    handleUpdateStatus(task, targetColId);
  };

  // Helper to locate milestone attached to a task
  const getTaskMilestone = (task: any) => {
    if (!milestones || milestones.length === 0) return null;
    return milestones.find((m: any) =>
      (task?.job_milestone_id && (String(m.job_milestone_id) === String(task.job_milestone_id) || String(m.contract_milestone_id) === String(task.job_milestone_id))) ||
      (task?.contract_milestone_id && (String(m.contract_milestone_id) === String(task.contract_milestone_id) || String(m.job_milestone_id) === String(task.contract_milestone_id))) ||
      (task?.milestone_title && m.milestone_title && task.milestone_title.trim().toLowerCase() === m.milestone_title.trim().toLowerCase())
    );
  };

  // Helper to safely format 1-indexed milestone order (M1, M2, etc.)
  const getMilestoneOrder = (taskOrMilestone: any, fallbackIdx: number = 0): number => {
    if (!taskOrMilestone) return fallbackIdx + 1;
    if (taskOrMilestone.order_index !== undefined && taskOrMilestone.order_index !== null) {
      return Number(taskOrMilestone.order_index) + 1;
    }
    const ms = getTaskMilestone(taskOrMilestone);
    if (ms && ms.order_index !== undefined && ms.order_index !== null) {
      return Number(ms.order_index) + 1;
    }
    if (taskOrMilestone.milestone_order !== undefined && taskOrMilestone.milestone_order !== null) {
      return Number(taskOrMilestone.milestone_order) + 1;
    }
    return fallbackIdx + 1;
  };

  // Extract min and max timeline bounds strictly for THIS individual milestone
  const getMilestoneTimelineBounds = (task: any) => {
    const milestone = getTaskMilestone(task);
    let minDate = '';
    let maxDate = '';

    if (milestone) {
      const sortedMilestones = [...(milestones || [])].sort(
        (a: any, b: any) => (Number(a.order_index ?? 0)) - (Number(b.order_index ?? 0))
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
        if (
          (milestone.job_milestone_id && String(m.job_milestone_id) === String(milestone.job_milestone_id)) ||
          (milestone.contract_milestone_id && String(m.contract_milestone_id) === String(milestone.contract_milestone_id)) ||
          (m.milestone_title && milestone.milestone_title && m.milestone_title.trim().toLowerCase() === milestone.milestone_title.trim().toLowerCase())
        ) {
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

      // minDate: milestone start date. For milestones beyond index 0, start cannot precede prior milestones
      if (cumulativeOffsetHours > 0) {
        minDate = computedStartIso;
      } else {
        minDate = milestone.started_at
          ? new Date(milestone.started_at).toISOString().substring(0, 10)
          : computedStartIso;
      }

      // maxDate: milestone deadline (never exceed this milestone's own timeline into subsequent milestones)
      if (milestone.deadline_at) {
        const explicitIso = new Date(milestone.deadline_at).toISOString().substring(0, 10);
        maxDate = explicitIso >= minDate && explicitIso <= computedDeadlineIso ? explicitIso : computedDeadlineIso;
      } else {
        maxDate = computedDeadlineIso;
      }

      if (minDate && maxDate && maxDate < minDate) {
        maxDate = minDate;
      }
    }

    return {
      milestone,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
    };
  };

  // Memoized mapping of milestone to horizontal columns (Cols 1 through 8) on Gantt chart
  const milestoneColMap = useMemo(() => {
    const map = new Map<string, { startCol: number; colSpan: number; endCol: number; displayOrder: number }>();
    if (!milestones || milestones.length === 0) return map;

    const sorted = [...milestones].sort(
      (a: any, b: any) => (Number(a.order_index ?? 0)) - (Number(b.order_index ?? 0))
    );

    const totalMilestones = sorted.length;
    const totalHours = sorted.reduce((acc, m) => acc + Math.max(1, Number(m.duration_hours || 72)), 0);

    let currentStart = 1;
    sorted.forEach((m: any, idx: number) => {
      const displayOrder = Number(m.order_index !== undefined && m.order_index !== null ? m.order_index : idx) + 1;
      let span: number;
      let end: number;

      if (idx === totalMilestones - 1) {
        span = Math.max(1, 8 - currentStart + 1);
        end = 8;
      } else {
        const hours = Math.max(1, Number(m.duration_hours || 72));
        const remainingCols = 8 - currentStart + 1;
        const remainingMilestones = totalMilestones - idx;
        const idealSpan = Math.round((hours / totalHours) * 8);
        const maxAllowed = remainingCols - (remainingMilestones - 1);
        span = Math.max(1, Math.min(idealSpan, maxAllowed));
        end = currentStart + span - 1;
      }

      const range = {
        startCol: currentStart,
        colSpan: span,
        endCol: end,
        displayOrder,
      };

      if (m.job_milestone_id) map.set(String(m.job_milestone_id), range);
      if (m.contract_milestone_id) map.set(String(m.contract_milestone_id), range);
      if (m.milestone_title) map.set(m.milestone_title.trim().toLowerCase(), range);
      map.set(`idx_${idx}`, range);

      currentStart += span;
    });

    return map;
  }, [milestones]);

  // Determine current active milestone
  const activeMilestone = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    const sorted = [...milestones].sort(
      (a: any, b: any) => (Number(a.order_index ?? 0)) - (Number(b.order_index ?? 0))
    );
    // Find active / in_progress or current milestone
    const inProg = sorted.find((m: any) =>
      m.is_current || ['in_progress', 'active'].includes(String(m.milestone_status || '').toLowerCase())
    );
    if (inProg) return inProg;
    // Or first non-completed
    const notCompleted = sorted.find((m: any) =>
      !['completed', 'approved'].includes(String(m.milestone_status || '').toLowerCase())
    );
    if (notCompleted) return notCompleted;
    return sorted[0];
  }, [milestones]);

  const currentMilestone = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    if (selectedProgressMilestoneId) {
      const found = milestones.find((m: any) =>
        String(m.job_milestone_id) === String(selectedProgressMilestoneId) ||
        String(m.contract_milestone_id) === String(selectedProgressMilestoneId)
      );
      if (found) return found;
    }
    return activeMilestone;
  }, [milestones, selectedProgressMilestoneId, activeMilestone]);

  const currentMilestoneStats = useMemo(() => {
    if (!currentMilestone) return null;

    const mId = currentMilestone.job_milestone_id
      ? String(currentMilestone.job_milestone_id)
      : (currentMilestone.contract_milestone_id ? String(currentMilestone.contract_milestone_id) : null);
    const mTitle = currentMilestone.milestone_title ? currentMilestone.milestone_title.trim().toLowerCase() : null;

    // Filter tasks belonging to this milestone
    const mTasks = localTasks.filter((t) => {
      if (mId && (String(t.job_milestone_id) === mId || String(t.contract_milestone_id) === mId)) {
        return true;
      }
      if (mTitle && t.milestone_title && t.milestone_title.trim().toLowerCase() === mTitle) {
        return true;
      }
      return false;
    });

    const total = mTasks.length;
    const done = mTasks.filter((t) => normalizeStatus(t.status) === 'completed').length;
    const review = mTasks.filter((t) => normalizeStatus(t.status) === 'review').length;
    const inProg = mTasks.filter((t) => normalizeStatus(t.status) === 'in_progress').length;
    const todo = mTasks.filter((t) => normalizeStatus(t.status) === 'todo').length;

    const statusLower = String(currentMilestone.milestone_status || '').toLowerCase();
    const isApproved = statusLower === 'completed' || statusLower === 'approved';

    let percent = 0;
    if (total > 0) {
      percent = Math.round((done / total) * 100);
    } else if (isApproved) {
      percent = 100;
    }

    const donePercent = total > 0 ? (done / total) * 100 : (isApproved ? 100 : 0);
    const reviewPercent = total > 0 ? (review / total) * 100 : 0;
    const inProgPercent = total > 0 ? (inProg / total) * 100 : 0;

    const mOrder = getMilestoneOrder(currentMilestone);

    return {
      milestone: currentMilestone,
      mOrder,
      total,
      done,
      review,
      inProg,
      todo,
      percent,
      donePercent,
      reviewPercent,
      inProgPercent,
    };
  }, [currentMilestone, localTasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // The only person who can change status of their tasks is the one assigned to it
  const isTaskAssignee = (task: TaskItem) => {
    if (!task.assignee_account_id || !currentUserAccountId) return false;
    const isMe = String(task.assignee_account_id).trim() === String(currentUserAccountId).trim();
    if (!isMe) return false;
    // Subcontractors are strictly scoped to tasks under their assigned milestone
    if (isSubcontractor && subcontractorMilestoneId && task.job_milestone_id) {
      return String(task.job_milestone_id) === String(subcontractorMilestoneId);
    }
    return true;
  };

  const handleUpdateStatus = async (task: TaskItem, newStatus: TaskItem['status']) => {
    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones to finish.');
      return;
    }
    if (isSubcontractor) {
      if (
        subcontractorMilestoneId &&
        task.job_milestone_id &&
        String(task.job_milestone_id) !== String(subcontractorMilestoneId)
      ) {
        showErrorToast(
          `Subcontractors are restricted to tasks under their assigned milestone (${subcontractorMilestoneTitle || 'Assigned Scope'}).`
        );
        return;
      }
      if (currentMember?.subcontractor_permissions?.can_update_task_status === false) {
        showErrorToast('Your subcontractor permissions do not allow modifying task status.');
        return;
      }
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
      const { minDate, maxDate } = getMilestoneTimelineBounds(task);
      if (maxDate && newDueDate > maxDate) {
        showErrorToast(`Task due date cannot exceed the milestone deadline (${new Date(maxDate + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`);
        return;
      }
      if (minDate && newDueDate < minDate) {
        showErrorToast(`Task due date cannot precede the milestone start date (${new Date(minDate + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`);
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

    if (newTaskDueDate) {
      const bounds = getMilestoneTimelineBounds({ job_milestone_id: newTaskMilestone } as any);
      if (bounds.minDate && newTaskDueDate < bounds.minDate) {
        showErrorToast(`Task due date cannot precede the milestone start date (${new Date(bounds.minDate + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`);
        return;
      }
      if (bounds.maxDate && newTaskDueDate > bounds.maxDate) {
        showErrorToast(`Task due date cannot exceed the milestone deadline (${new Date(bounds.maxDate + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`);
        return;
      }
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

    // Default to the current contributor's or subcontractor's assigned milestone, or active milestone
    let defaultMId = '';
    if (isSubcontractor && subcontractorMilestoneId) {
      defaultMId = String(subcontractorMilestoneId);
    } else {
      const myMilestone = milestones?.find(
        (m: any) => String(m.assignee_account_id) === String(currentUserAccountId)
      );
      if (myMilestone) {
        defaultMId = String(myMilestone.job_milestone_id || myMilestone.contract_milestone_id || '');
      } else if (milestones && milestones.length > 0) {
        const activeM = milestones.find((m: any) => m.is_current || ['in_progress', 'active'].includes(String(m.milestone_status).toLowerCase())) || milestones[0];
        defaultMId = String(activeM.job_milestone_id || activeM.contract_milestone_id || '');
      }
    }

    setNewTaskMilestone(defaultMId);
    const bounds = getMilestoneTimelineBounds({ job_milestone_id: defaultMId } as any);
    if (bounds.maxDate) {
      setNewTaskDueDate(bounds.maxDate);
    } else {
      setNewTaskDueDate('');
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

  const renderSidePanelContent = (task: TaskItem) => {
    const taskCode = taskCodeMap[task.task_id] || '#TSK';
    const normStatus = normalizeStatus(task.status);
    const statusCfg = getStatusBadgeConfig(task.status);
    const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;
    const isOwner = isTaskAssignee(task);
    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const completedCount = checklist.filter((item) => item.completed).length;

    return (
      <div className="flex flex-col h-full space-y-4">
        {/* Top bar: Code + Status + Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
              {taskCode}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${statusCfg.btnClass}`}>
              {statusCfg.icon}
              <span>{statusCfg.label}</span>
            </span>
            {task.is_locked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedTaskId(null)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Title */}
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-snug">
          {task.title}
        </h3>

        {/* Attributes Box (Screenshot 2: rounded grouped box with rows) */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-dark-base p-3.5 space-y-2.5 text-xs">
          {/* Assignee Row */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Assignee</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                {task.assignee_avatar_path ? (
                  <img
                    src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name || 'User')}
                    alt={task.assignee_name || 'Assignee'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(task.assignee_name)}</span>
                )}
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {task.assignee_name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Priority Row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Priority</span>
            {isOwner ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePriorityMenuTaskId(activePriorityMenuTaskId === task.task_id ? null : task.task_id);
                  }}
                  className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white hover:text-blue-600 transition cursor-pointer"
                >
                  <Flag className={`w-3.5 h-3.5 ${priorityConfig.color}`} />
                  <span className="capitalize">{priorityConfig.label}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
                {activePriorityMenuTaskId === task.task_id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setActivePriorityMenuTaskId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-40 w-32 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5">
                      {[
                        { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                        { id: 'high', label: 'High', color: 'text-amber-500' },
                        { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                        { id: 'low', label: 'Low', color: 'text-zinc-400' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleUpdatePriority(task, p.id as any);
                            setActivePriorityMenuTaskId(null);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Flag className={`w-3.5 h-3.5 ${p.color}`} />
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
              <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                <Flag className={`w-3.5 h-3.5 ${priorityConfig.color}`} />
                <span className="capitalize">{priorityConfig.label}</span>
              </div>
            )}
          </div>

          {/* Milestone Row (Locked to milestone) */}
          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Milestone</span>
            <div className="flex items-center gap-1.5 text-right">
              <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]" title={task.milestone_title}>
                {task.milestone_title || `Milestone ${getMilestoneOrder(task)}`}
              </span>
              <span className="text-zinc-400" title="Milestone scope is fixed by contract and cannot be moved">
                <Lock className="w-3 h-3 text-zinc-400 shrink-0" />
              </span>
            </div>
          </div>

          {/* Due Date Row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Due Date</span>
            {isOwner ? (
              (() => {
                const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                return (
                  <div className="relative flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white cursor-pointer hover:text-blue-500">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {task.due_at
                        ? new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Set date'}
                    </span>
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
                );
              })()
            ) : (
              <span className="font-semibold text-zinc-900 dark:text-white">
                {task.due_at
                  ? new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No deadline'}
              </span>
            )}
          </div>
        </div>

        {/* Move to Quick-Action Buttons (Screenshot 2) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Move to
            </span>
            {!isOwner && !isClient && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                View only
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
            {[
              { id: 'todo', label: 'To do' },
              { id: 'in_progress', label: 'In progress' },
              { id: 'review', label: 'In review' },
              { id: 'completed', label: 'Done' },
            ].map((s) => {
              const isActive = normStatus === s.id;
              const canMove = !task.is_locked && (isOwner || isClient);

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!canMove}
                  onClick={() => handleUpdateStatus(task, s.id as any)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all text-center truncate ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-xs dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-700/50'
                  } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {task.is_locked && (
            <p className="mt-1.5 text-[11px] text-amber-500 dark:text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Locked waiting for earlier milestone completion.</span>
            </p>
          )}
        </div>

        {/* Description Section */}
        {task.description && (
          <div>
            <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Description
            </h4>
            <div className="p-3 rounded-xl bg-zinc-50/50 dark:bg-dark-base border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {task.description}
            </div>
          </div>
        )}

        {/* Subtasks Section */}
        {checklist.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Subtasks ({completedCount}/{checklist.length})
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">
                {Math.round((completedCount / checklist.length) * 100)}%
              </span>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-50/50 dark:bg-dark-base border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={task.is_locked || (!isOwner && !isClient)}
                    onChange={() => handleToggleChecklistItem(task, idx)}
                    className="mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-0"
                  />
                  <span className={item.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}>
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Activity & Scope Info */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
            Activity
          </h4>
          <div className="p-3 rounded-xl bg-zinc-50/50 dark:bg-dark-base border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                {getInitials(task.assignee_name || 'Team')}
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {task.assignee_name || 'Contributor'}
              </span>
              <span className="text-[10px] text-zinc-400">
                {new Date(task.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-7">
              Task created under milestone <span className="text-zinc-800 dark:text-zinc-200 font-medium">"{task.milestone_title || `Milestone ${getMilestoneOrder(task)}`}"</span>.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-48 sm:pb-64">
      {/* Scoped Subcontractor Access Banner */}
      {isSubcontractor && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            <strong>Scoped Subcontractor Access:</strong> You are collaborating under{' '}
            {subcontractorParentHandle ? `@${subcontractorParentHandle}'s contract` : 'lead contract'}{' '}
            for <strong>{subcontractorMilestoneTitle || 'your assigned milestone'}</strong>. Task operations are strictly scoped to this milestone.
          </span>
        </div>
      )}
      {/* ======================================================== */}
      {/* 1. TOP TAB SWITCHER: Board | List | Table | Gantt        */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121214] px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Board Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('board')}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === 'board'
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 flex items-center justify-center p-0.5 shadow-2xs">
              <div className="w-1.5 h-full bg-white rounded-2xs" />
            </div>
            <span>Board</span>
            {displayMode === 'board' && (
              <motion.div
                layoutId="taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* List Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('list')}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === 'list'
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5 text-zinc-400" />
            <span>List</span>
            {displayMode === 'list' && (
              <motion.div
                layoutId="taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* Table Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('table')}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === 'table'
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Table</span>
            {displayMode === 'table' && (
              <motion.div
                layoutId="taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* Gantt Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode('gantt')}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === 'gantt'
                ? 'text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-rose-500" />
            <span>Gantt</span>
            {displayMode === 'gantt' && (
              <motion.div
                layoutId="taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* + View pill */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer shrink-0">
            <Plus className="w-3 h-3" />
            <span>View</span>
          </div>
        </div>

        {/* Total Tasks Counter */}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 self-end sm:self-auto shrink-0 font-medium">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 1.5 CURRENT MILESTONE PROGRESS BAR BANNER (Collapsible)   */}
      {/* ======================================================== */}
      {displayMode !== 'gantt' && currentMilestoneStats && (
        <div className="bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden transition-all">
          {/* Header Row: Clickable to toggle collapse/expand */}
          <div
            onClick={() => setIsMilestoneProgressCollapsed((prev) => !prev)}
            className="p-3 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition"
          >
            {/* Left: Collapse chevron, Badge, Title, Status & Mini-bar when collapsed */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMilestoneProgressCollapsed((prev) => !prev);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                title={isMilestoneProgressCollapsed ? 'Expand milestone progress' : 'Collapse milestone progress'}
              >
                {isMilestoneProgressCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Milestone Indicator Badge */}
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shrink-0">
                M{currentMilestoneStats.mOrder}
              </span>

              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {currentMilestoneStats.milestone.milestone_title || `Milestone ${currentMilestoneStats.mOrder}`}
                </h4>

                {/* Status Pill */}
                {(() => {
                  const status = String(currentMilestoneStats.milestone.milestone_status || '').toLowerCase();
                  if (status === 'completed' || status === 'approved') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>COMPLETED</span>
                      </span>
                    );
                  }
                  if (status === 'submitted_for_review') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>ON REVIEW</span>
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                      <span>CURRENT MILESTONE</span>
                    </span>
                  );
                })()}

                {/* Inline Mini Progress Bar when Collapsed */}
                {isMilestoneProgressCollapsed && (
                  <div className="hidden md:flex items-center gap-2 ml-1 shrink-0">
                    <div className="w-24 bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${currentMilestoneStats.donePercent}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                      />
                      <div
                        style={{ width: `${currentMilestoneStats.reviewPercent}%` }}
                        className="bg-amber-500 h-full transition-all duration-300"
                      />
                      <div
                        style={{ width: `${currentMilestoneStats.inProgPercent}%` }}
                        className="bg-blue-500 h-full transition-all duration-300"
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {currentMilestoneStats.percent}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Milestone Switcher, Task Progress Ratio, and Collapse Toggle */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {milestones && milestones.length > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700"
                >
                  {milestones.map((m: any, mIdx: number) => {
                    const mId = String(m.job_milestone_id || m.contract_milestone_id || mIdx);
                    const isSelected = String(currentMilestoneStats.milestone.job_milestone_id || currentMilestoneStats.milestone.contract_milestone_id || '') === mId;
                    const order = getMilestoneOrder(m, mIdx);
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProgressMilestoneId(mId);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        M{order}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {currentMilestoneStats.done} of {currentMilestoneStats.total}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">tasks done</span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 ml-1">
                    {currentMilestoneStats.percent}%
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-0.5">
                {isMilestoneProgressCollapsed ? 'Expand' : 'Collapse'}
              </span>
            </div>
          </div>

          {/* Collapsible Expanded Body */}
          <AnimatePresence initial={false}>
            {!isMilestoneProgressCollapsed && (
              <motion.div
                key="milestone-progress-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  {/* Context Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {currentMilestoneStats.milestone.deadline_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>
                            Deadline: {new Date(currentMilestoneStats.milestone.deadline_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </span>
                      )}
                      {Number(currentMilestoneStats.milestone.budget_credits || 0) > 0 && (
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {Number(currentMilestoneStats.milestone.budget_credits).toLocaleString()} Credits in Escrow
                        </span>
                      )}
                      {currentMilestoneStats.milestone.assignee_name && (
                        <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                          <span>• Assigned:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {currentMilestoneStats.milestone.assignee_name}
                          </span>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      Milestone Progress
                    </span>
                  </div>

                  {/* Multi-Segment Horizontal Progress Bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800/90 h-2.5 rounded-full overflow-hidden flex relative">
                    {/* Done Segment */}
                    <div
                      style={{ width: `${currentMilestoneStats.donePercent}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`${currentMilestoneStats.done} Completed`}
                    />
                    {/* In Review Segment */}
                    <div
                      style={{ width: `${currentMilestoneStats.reviewPercent}%` }}
                      className="bg-amber-500 h-full transition-all duration-300"
                      title={`${currentMilestoneStats.review} In Review`}
                    />
                    {/* In Progress Segment */}
                    <div
                      style={{ width: `${currentMilestoneStats.inProgPercent}%` }}
                      className="bg-blue-500 h-full transition-all duration-300"
                      title={`${currentMilestoneStats.inProg} In Progress`}
                    />
                  </div>

                  {/* Bottom Breakdown Badges */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{currentMilestoneStats.done} Done</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{currentMilestoneStats.review} On Review</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{currentMilestoneStats.inProg} In Progress</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <span className="w-2 h-2 rounded-full border border-dashed border-zinc-400" />
                        <span>{currentMilestoneStats.todo} To Do</span>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUBHEADER TOOLBAR (Matching Reference Pics)           */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121214] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs relative z-20">
        {/* Left Side: Status pill + Link */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Status</span>
          </div>

          <button
            type="button"
            title="Task Dependencies"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
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
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Filter"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer"
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
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-28 sm:w-40"
            />
          </div>

          {/* Assignee Filter Dropdown using GlideSelect with Profile Pictures */}
          <div className="hidden md:flex items-center">
            <GlideSelect
              options={assigneeSelectOptions}
              value={filterAssignee}
              onChange={(val) => setFilterAssignee(val)}
              placeholder="All Assignees"
              fullWidth={false}
              size="sm"
              radius={8}
              menuWidth={220}
              maxVisibleItems={4.5}
              surfaceColor={isDark ? '#121214' : '#ffffff'}
              highlightColor={isDark ? '#27272a' : '#f4f4f5'}
              textColor={isDark ? '#f4f4f5' : '#09090b'}
              borderColor={isDark ? '#27272a' : '#e4e4e7'}
              accentColor={isDark ? '#ffffff' : '#09090b'}
              className="w-44 lg:w-48"
            />
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
      {/* 3. TAB VIEW CONTENT (Animated smooth transition)         */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {displayMode === 'board' && (
        <div className="space-y-3">
          {/* Board Subtitle matching Screenshot 1 */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'items'}. Click a card to open it, or drag it to another column.
            </p>
          </div>

          {/* Kanban Main Stage: Columns (Always maintain full-width 4-column layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start w-full">
              {COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => normalizeStatus(t.status) === col.id);
                const isDragOver = dragOverColumnId === col.id;
                const colLabel =
                  col.id === 'todo'
                    ? 'To do'
                    : col.id === 'in_progress'
                    ? 'In progress'
                    : col.id === 'review'
                    ? 'In review'
                    : 'Done';

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverColumnId !== col.id) {
                        setDragOverColumnId(col.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverColumnId === col.id) {
                        setDragOverColumnId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnColumn(col.id as any);
                    }}
                    className={`bg-zinc-50/70 dark:bg-dark-base rounded-2xl border transition-all duration-150 p-3.5 flex flex-col min-h-[520px] ${
                      isDragOver
                        ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                          {colLabel}
                        </span>
                        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isClient && (
                          <button
                            type="button"
                            onClick={() => openAddTaskModal(col.id as any)}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Add Task"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-3 flex-1">
                      {colTasks.length === 0 && !isDragOver && (
                        <div className="h-28 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                          No tasks in {colLabel}
                        </div>
                      )}

                      {colTasks.map((task) => {
                        const taskCode = taskCodeMap[task.task_id] || '#TSK';
                        const isSelected = selectedTaskId === task.task_id;
                        const isDragging = draggingTaskId === task.task_id;
                        const isOwner = isTaskAssignee(task);
                        const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                        const completedCount = checklist.filter((item) => item.completed).length;
                        const canDrag = !task.is_locked && (isOwner || isClient);

                        // Dot color by column status (Screenshot 1)
                        const dotColor =
                          col.id === 'todo'
                            ? 'bg-zinc-400 dark:bg-zinc-500'
                            : col.id === 'in_progress'
                            ? 'bg-blue-500'
                            : col.id === 'review'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';

                        return (
                          <div
                            key={task.task_id}
                            draggable={canDrag}
                            onDragStart={(e) => {
                              if (!canDrag) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.setData('text/plain', task.task_id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingTaskId(task.task_id);
                            }}
                            onDragEnd={() => {
                              setDraggingTaskId(null);
                              setDragOverColumnId(null);
                            }}
                            onClick={() => handleCardClick(task)}
                            className={`group/card bg-white dark:bg-zinc-900 p-3.5 rounded-xl border transition-all duration-150 shadow-xs cursor-pointer select-none relative ${
                              isDragging
                                ? 'opacity-30 scale-95 border-blue-500'
                                : isSelected
                                ? 'ring-2 ring-zinc-900 dark:ring-white border-transparent shadow-md'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs'
                            } ${task.is_locked ? 'opacity-80' : ''}`}
                          >
                            {/* Top Row: Dot + Task Code + Locked Badge + Drag Grip */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400 truncate">
                                  {taskCode}
                                </span>
                                {task.is_locked && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-bold ml-1" title="Locked waiting for earlier milestone">
                                    <Lock className="w-2.5 h-2.5 shrink-0" />
                                  </span>
                                )}
                              </div>

                              <div
                                className={`text-zinc-400 dark:text-zinc-500 ${
                                  canDrag ? 'cursor-grab active:cursor-grabbing group-hover/card:text-zinc-600 dark:group-hover/card:text-zinc-300' : 'opacity-30 cursor-not-allowed'
                                }`}
                                title={canDrag ? 'Drag to move column' : 'Locked or View Only'}
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            {/* Task Title */}
                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white leading-snug mb-1 line-clamp-2">
                              {task.title}
                            </h4>

                            {/* Task Description Preview */}
                            {task.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Card Footer: Metadata Badges + Assignee Avatar */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <div className="flex items-center gap-2">
                                {/* Milestone Badge */}
                                {task.milestone_title ? (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 max-w-[100px] truncate"
                                    title={task.milestone_title}
                                  >
                                    M{getMilestoneOrder(task)}
                                  </span>
                                ) : null}

                                {/* Checklist Counter */}
                                {checklist.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{completedCount}/{checklist.length}</span>
                                  </span>
                                )}

                                {/* Due Date Preview */}
                                {task.due_at && (
                                  <span className="text-[10px] text-zinc-400">
                                    {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>

                              {/* Assignee Avatar */}
                              <div
                                className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300"
                                title={task.assignee_name ? `Assigned: ${task.assignee_name}` : 'Unassigned'}
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
                                  <span>{getInitials(task.assignee_name)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dashed Drop Target Placeholder (Screenshot 1) */}
                      {isDragOver && (
                        <div className="h-24 rounded-xl border-2 border-dashed border-zinc-400 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30 flex items-center justify-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 transition-all duration-150 animate-pulse">
                          Drop to move to {colLabel}
                        </div>
                      )}
                    </div>

                    {/* + Add Task at Bottom of Column */}
                    {!isClient && (
                      <button
                        type="button"
                        onClick={() => openAddTaskModal(col.id as any)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add task</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
              <div key={group.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                {/* Group Accordion Header */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="p-3.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button type="button" className="text-zinc-400">
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

                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
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
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
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
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/80 uppercase tracking-wider">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Assignee</div>
                      <div className="col-span-2">Due Date</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>

                    {/* Task Rows */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {groupTasks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          No tasks in this group.
                        </div>
                      ) : (
                        groupTasks.map((task) => {
                          const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                          return (
                            <div
                              key={task.task_id}
                              className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 text-xs transition"
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
                                  <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400 shrink-0" />
                                )}

                                <span className="font-semibold text-zinc-900 dark:text-white truncate">
                                  {task.title}
                                </span>
                              </div>

                              {/* Assignee */}
                              <div className="col-span-2 flex items-center gap-1.5 truncate">
                                <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
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
                                    <User className="w-3 h-3 text-zinc-400 shrink-0" />
                                  )}
                                </div>
                                <span className="text-zinc-600 dark:text-zinc-300 truncate">
                                  {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>

                              {/* Due Date: Editable by assignee, bounded by milestone timeline. No "Set date" text */}
                              {(() => {
                                const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                                return isTaskAssignee(task) ? (
                                  <div
                                    className="col-span-2 relative flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition group/date w-fit p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.due_at ? 'text-blue-500' : 'text-zinc-400 group-hover/date:text-blue-500'}`} />
                                    {task.due_at ? (
                                      <span className="text-[11px] font-semibold whitespace-nowrap">
                                        {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-zinc-400 group-hover/date:text-blue-500 whitespace-nowrap font-medium">
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
                                  <div className="col-span-2 flex items-center gap-1 text-zinc-500 dark:text-zinc-400 p-1">
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
                                    className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
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
                                        className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                          Priority
                                        </div>
                                        {[
                                          { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                                          { id: 'high', label: 'High', color: 'text-amber-500' },
                                          { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                                          { id: 'low', label: 'Low', color: 'text-zinc-400' },
                                        ].map((p) => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                              handleUpdatePriority(task, p.id as any);
                                              setActivePriorityMenuTaskId(null);
                                            }}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
                                            className="absolute right-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
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
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
                      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => openAddTaskModal(group.id as any)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition cursor-pointer"
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
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-zinc-200 dark:border-zinc-800">
                    <input type="checkbox" className="rounded border-zinc-300 text-blue-600" />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-zinc-200 dark:border-zinc-800">#</th>
                  <th className="py-2.5 px-4 border-r border-zinc-200 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <span>Name</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </span>
                  </th>
                  <th className="py-2.5 px-4 border-r border-zinc-200 dark:border-zinc-800">Assignee</th>
                  <th className="py-2.5 px-4 border-r border-zinc-200 dark:border-zinc-800">Status</th>
                  <th className="py-2.5 px-4 border-r border-zinc-200 dark:border-zinc-800">Due date</th>
                  <th className="py-2.5 px-4 border-r border-zinc-200 dark:border-zinc-800">Priority</th>
                  <th className="py-2.5 px-4">Milestone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, rIdx) => {
                    const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                    return (
                      <tr key={task.task_id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition">
                        <td className="py-2.5 px-3 text-center border-r border-zinc-100 dark:border-zinc-800/80">
                          <input type="checkbox" className="rounded border-zinc-300 text-blue-600" />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-zinc-400 dark:text-zinc-500 border-r border-zinc-100 dark:border-zinc-800/80">
                          {rIdx + 1}
                        </td>
                        <td className="py-2.5 px-4 border-r border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-2">
                            {task.status === 'completed' ? (
                              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                            ) : normalizeStatus(task.status) === 'review' ? (
                              <div className="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-500 shrink-0" />
                            ) : task.status === 'in_progress' ? (
                              <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-blue-500 shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-dashed border-zinc-400 shrink-0" />
                            )}
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 border-r border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
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
                                <User className="w-3 h-3 text-zinc-400 shrink-0" />
                              )}
                            </div>
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {task.assignee_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        {/* Status Column */}
                        <td className="py-2.5 px-4 border-r border-zinc-100 dark:border-zinc-800/80">
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
                                      className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
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
                                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
                        <td className="py-2.5 px-4 border-r border-zinc-100 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400">
                          {(() => {
                            const { minDate, maxDate } = getMilestoneTimelineBounds(task);
                            return isTaskAssignee(task) ? (
                              <div
                                className="relative flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition group/date w-fit p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                                <Calendar className={`w-3.5 h-3.5 shrink-0 ${task.due_at ? 'text-blue-500' : 'text-zinc-400 group-hover/date:text-blue-500'}`} />
                                {task.due_at ? (
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-zinc-400 group-hover/date:text-blue-500 whitespace-nowrap font-medium">
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
                        <td className="py-2.5 px-4 border-r border-zinc-100 dark:border-zinc-800/80">
                          {isTaskAssignee(task) ? (
                            <div className="relative flex items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePriorityMenuTaskId(activePriorityMenuTaskId === task.task_id ? null : task.task_id);
                                  setActiveStatusMenuTaskId(null);
                                }}
                                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                                title={`Priority: ${priorityConfig.label} (Click flag to change)`}
                              >
                                <Flag className={`w-3.5 h-3.5 shrink-0 ${priorityConfig.color}`} />
                                <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{priorityConfig.label}</span>
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
                                    className="absolute left-0 top-full mt-1.5 z-30 w-36 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                      Priority
                                    </div>
                                    {[
                                      { id: 'urgent', label: 'Urgent', color: 'text-rose-500' },
                                      { id: 'high', label: 'High', color: 'text-amber-500' },
                                      { id: 'normal', label: 'Normal', color: 'text-blue-500' },
                                      { id: 'low', label: 'Low', color: 'text-zinc-400' },
                                    ].map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          handleUpdatePriority(task, p.id as any);
                                          setActivePriorityMenuTaskId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
                              <span className="text-[10px] text-zinc-600 dark:text-zinc-400">{priorityConfig.label}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]">
                          {task.milestone_title || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Add Row Button at Table Bottom */}
                {!isClient && (
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition">
                    <td colSpan={8} className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => openAddTaskModal()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-blue-600 transition cursor-pointer"
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
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden space-y-4 p-4">
          {/* Gantt Header & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-rose-500" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Gantt Schedule: Milestones & Tasks
                </h4>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Comprehensive timeline of overall contractual milestones and detailed task execution with assigned owners
                </p>
              </div>
            </div>

            {/* Filter Pills for Gantt */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setGanttSection('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                All Schedules
              </button>
              <button
                type="button"
                onClick={() => setGanttSection('milestones')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'milestones'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Milestones ({milestones.length})
              </button>
              <button
                type="button"
                onClick={() => setGanttSection('tasks')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  ganttSection === 'tasks'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Milestones Overall Schedule ({milestones.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    Contract deliverables, budget escrows, and assigned contributors
                  </span>
                </div>

                {/* Milestones Timeline Grid Header */}
                <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
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
                  <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No milestones found for this project.
                  </div>
                ) : (
                  milestones.map((m: any, mIdx: number) => {
                    const statusLower = String(m.milestone_status || '').toLowerCase();
                    const isApproved = statusLower === 'completed' || statusLower === 'approved';
                    const isReview = statusLower === 'submitted_for_review';
                    const isInProgress = statusLower === 'in_progress' || statusLower === 'active' || m.is_current;

                    const progressPercent = isApproved ? 100 : isReview ? 90 : isInProgress ? 50 : 0;
                    
                    const mId = String(m.job_milestone_id || m.contract_milestone_id || mIdx);
                    const mColRange = milestoneColMap.get(mId) || milestoneColMap.get(`idx_${mIdx}`) || {
                      startCol: 1,
                      colSpan: 4,
                      endCol: 4,
                      displayOrder: mIdx + 1,
                    };
                    const startCol = mColRange.startCol;
                    const colSpan = mColRange.colSpan;
                    const mOrder = mColRange.displayOrder;

                    return (
                      <div
                        key={m.job_milestone_id || mIdx}
                        className="grid grid-cols-12 gap-1 items-center py-2 px-1 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 rounded-lg transition border-b border-zinc-100 dark:border-zinc-800/40"
                      >
                        {/* Milestone & Assignee Info */}
                        <div className="col-span-5 grid grid-cols-12 gap-2 items-center pr-2">
                          {/* Title & Escrow */}
                          <div className="col-span-6 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                M{mOrder}
                              </span>
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {m.milestone_title}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate ml-1">
                              {Number(m.budget_credits || 0).toLocaleString()} Credits
                            </span>
                          </div>

                          {/* Assigned Contributor */}
                          <div className="col-span-6 flex items-center gap-1.5 truncate">
                            <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
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
                                <User className="w-3 h-3 text-zinc-400 shrink-0" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                                {m.assignee_name || 'Unassigned'}
                              </span>
                              {m.assignee_handle && (
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block truncate">
                                  @{m.assignee_handle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Milestone Horizontal Timeline Bar */}
                        <div className="col-span-7 grid grid-cols-8 gap-1 h-8 bg-zinc-100/70 dark:bg-zinc-900/60 rounded-lg p-1 relative items-center">
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
                              M{mOrder}: {m.milestone_title}
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
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Kanban className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Tasks Detailed Schedule ({filteredTasks.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    Task execution by assigned team members, priority, and progress
                  </span>
                </div>

                {/* Tasks Timeline Grid Header */}
                <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
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
                  <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No tasks to display in Gantt view.
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const normStatus = normalizeStatus(task.status);
                    const isDone = normStatus === 'completed';
                    const isReview = normStatus === 'review';
                    const isInProg = normStatus === 'in_progress';
                    const priorityConfig = PRIORITY_FLAGS[task.priority] || PRIORITY_FLAGS.normal;

                    const taskMilestone = getTaskMilestone(task);
                    const mId = task.job_milestone_id
                      ? String(task.job_milestone_id)
                      : (taskMilestone?.job_milestone_id ? String(taskMilestone.job_milestone_id) : null);

                    const mRange = (mId && milestoneColMap.get(mId)) ||
                      (taskMilestone?.contract_milestone_id && milestoneColMap.get(String(taskMilestone.contract_milestone_id))) ||
                      (task.milestone_title && milestoneColMap.get(task.milestone_title.trim().toLowerCase())) ||
                      milestoneColMap.get('idx_0') ||
                      { startCol: 1, colSpan: 4, endCol: 4, displayOrder: 1 };

                    const displayMOrder = getMilestoneOrder(task, mRange.displayOrder - 1);

                    // Strictly scope tasks within this milestone's timeline
                    const tasksInThisMilestone = filteredTasks.filter((t) => {
                      if (task.job_milestone_id && t.job_milestone_id) {
                        return String(t.job_milestone_id) === String(task.job_milestone_id);
                      }
                      if (task.milestone_title && t.milestone_title) {
                        return t.milestone_title.trim().toLowerCase() === task.milestone_title.trim().toLowerCase();
                      }
                      return true;
                    });
                    const taskIndexInMilestone = Math.max(0, tasksInThisMilestone.findIndex((t) => t.task_id === task.task_id));

                    let taskStartCol = mRange.startCol;
                    let taskColSpan = 1;

                    const bounds = getMilestoneTimelineBounds(task);
                    if (bounds.minDate && bounds.maxDate && task.due_at) {
                      const minTime = new Date(bounds.minDate).getTime();
                      const maxTime = new Date(bounds.maxDate).getTime();
                      const dueTime = new Date(task.due_at).getTime();

                      if (maxTime > minTime) {
                        const fraction = Math.max(0, Math.min(1, (dueTime - minTime) / (maxTime - minTime)));
                        const colSlot = Math.min(
                          mRange.endCol,
                          mRange.startCol + Math.floor(fraction * mRange.colSpan)
                        );
                        const desiredSpan = isDone ? 1 : mRange.colSpan >= 3 ? 2 : 1;
                        taskColSpan = Math.min(desiredSpan, colSlot - mRange.startCol + 1);
                        taskStartCol = Math.max(mRange.startCol, colSlot - taskColSpan + 1);
                      } else {
                        taskStartCol = mRange.startCol;
                        taskColSpan = Math.max(1, Math.min(2, mRange.colSpan));
                      }
                    } else {
                      if (mRange.colSpan === 1) {
                        taskStartCol = mRange.startCol;
                        taskColSpan = 1;
                      } else if (mRange.colSpan === 2) {
                        const offset = taskIndexInMilestone % 2;
                        taskStartCol = mRange.startCol + offset;
                        taskColSpan = 1;
                      } else {
                        const slotCount = Math.max(1, mRange.colSpan - 1);
                        const offset = taskIndexInMilestone % slotCount;
                        taskStartCol = mRange.startCol + offset;
                        const maxAllowed = mRange.endCol - taskStartCol + 1;
                        const desiredSpan = isDone ? 1 : isReview ? Math.min(2, maxAllowed) : Math.min(2, maxAllowed);
                        taskColSpan = Math.max(1, Math.min(desiredSpan, maxAllowed));
                      }
                    }

                    // Enforce clamp: task can NEVER spill out of this milestone's timeline
                    taskStartCol = Math.max(mRange.startCol, Math.min(taskStartCol, mRange.endCol));
                    taskColSpan = Math.max(1, Math.min(taskColSpan, mRange.endCol - taskStartCol + 1));

                    return (
                      <div
                        key={task.task_id}
                        className="grid grid-cols-12 gap-1 items-center py-2 px-1 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 rounded-lg transition border-b border-zinc-100 dark:border-zinc-800/40"
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
                              <div className="w-3 h-3 rounded-full border border-dashed border-zinc-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate block">
                                {task.title}
                              </span>
                              <span className="text-[10px] text-blue-500 truncate block">
                                M{displayMOrder}: {task.milestone_title || taskMilestone?.milestone_title || `Milestone ${displayMOrder}`}
                              </span>
                            </div>
                          </div>

                          {/* Assigned Member */}
                          <div className="col-span-6 flex items-center justify-between gap-1.5 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <div className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
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
                                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {task.assignee_name || 'Unassigned'}
                              </span>
                            </div>

                            <Flag className={`w-3 h-3 shrink-0 ${priorityConfig.color}`} title={`Priority: ${priorityConfig.label}`} />
                          </div>
                        </div>

                        {/* Task Timeline Bar */}
                        <div className="col-span-7 grid grid-cols-8 gap-1 h-7 bg-zinc-100/60 dark:bg-zinc-900/50 rounded-lg p-1 relative items-center">
                          <div
                            style={{
                              gridColumnStart: taskStartCol,
                              gridColumnEnd: `span ${taskColSpan}`,
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
        </motion.div>
      </AnimatePresence>

      {/* ======================================================== */}
      {/* CARD DETAIL POPUP MODAL (Smooth Spring Animation)        */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            key="task-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedTaskId(null)}
          >
            <motion.div
              key="task-detail-modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 360,
                mass: 0.8,
              }}
              className="w-full max-w-xl max-h-[88vh] bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {renderSidePanelContent(selectedTask)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* ADD TASK MODAL                                           */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Create Project Task
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build authentication endpoints"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task details and instructions..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                    Assignee
                  </label>
                  <div className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                    <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>You (Auto-assigned)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Associated Milestone
                </label>
                <select
                  value={newTaskMilestone}
                  onChange={(e) => {
                    const selectedMId = e.target.value;
                    setNewTaskMilestone(selectedMId);
                    const bounds = getMilestoneTimelineBounds({ job_milestone_id: selectedMId } as any);
                    if (bounds.minDate && bounds.maxDate) {
                      if (!newTaskDueDate || newTaskDueDate < bounds.minDate || newTaskDueDate > bounds.maxDate) {
                        setNewTaskDueDate(bounds.maxDate);
                      }
                    } else if (bounds.maxDate) {
                      if (!newTaskDueDate || newTaskDueDate > bounds.maxDate) {
                        setNewTaskDueDate(bounds.maxDate);
                      }
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">No Milestone Linked</option>
                  {milestones?.map((m: any, idx: number) => {
                    const isMyM = String(m.assignee_account_id) === String(currentUserAccountId);
                    const mOrder = getMilestoneOrder(m, idx);
                    return (
                      <option key={m.job_milestone_id || m.contract_milestone_id || idx} value={m.job_milestone_id || m.contract_milestone_id}>
                        M{mOrder}: {m.milestone_title} {isMyM ? '★ (Your Assigned Milestone)' : ''}
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
                  const targetM = getTaskMilestone({ job_milestone_id: newTaskMilestone } as any);
                  const mOrder = targetM ? getMilestoneOrder(targetM) : null;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Due Date *
                        </label>
                        {mOrder && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                            Restricted to M{mOrder} Timeline
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        min={minD}
                        max={maxD}
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                        <span>
                          Start: {minD ? new Date(minD + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Project Start'}
                        </span>
                        <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                          Deadline: {maxD ? new Date(maxD + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
