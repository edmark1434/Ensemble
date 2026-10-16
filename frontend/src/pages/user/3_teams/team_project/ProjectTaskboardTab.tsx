import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Kanban,
  List,
  Lock,
  MoreVertical,
  Plus,
  Shield,
  Tag,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

interface TaskChecklistItem {
  id?: string;
  title: string;
  completed: boolean;
}

interface TaskItem {
  task_id: string;
  workspace_id: string;
  job_milestone_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_locked: boolean;
  checklist?: TaskChecklistItem[];
  milestone_title?: string;
  milestone_order?: number;
  assignee_account_id?: string;
  assignee_name?: string;
  assignee_handle?: string;
  assignee_avatar_path?: string;
  created_at: string;
}

interface ProjectTaskboardTabProps {
  teamId: string;
  tasks: TaskItem[];
  currentUserAccountId: string;
  isClient: boolean;
  members: any[];
  contracts: any[];
  onTasksUpdated: () => void;
}

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20' },
  { id: 'review', label: 'Under Review', color: 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' },
  { id: 'completed', label: 'Completed', color: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' },
] as const;

const PRIORITY_BADGES: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800',
  high: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  normal: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800',
  low: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};

export const ProjectTaskboardTab: React.FC<ProjectTaskboardTabProps> = ({
  teamId,
  tasks,
  currentUserAccountId,
  isClient,
  members,
  contracts,
  onTasksUpdated,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Task Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const canModifyTask = (task: TaskItem) => {
    if (isClient) return true;
    return String(task.assignee_account_id) === String(currentUserAccountId);
  };

  const handleUpdateStatus = async (task: TaskItem, newStatus: TaskItem['status']) => {
    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones to finish.');
      return;
    }
    if (!canModifyTask(task)) {
      showErrorToast('You are not assigned to this task.');
      return;
    }

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        status: newStatus,
      });
      showSuccessToast(`Task moved to ${newStatus.replace('_', ' ')}`);
      onTasksUpdated();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update task');
    }
  };

  const handleToggleChecklistItem = async (task: TaskItem, itemIndex: number) => {
    if (task.is_locked && !isClient) {
      showErrorToast('This task is locked waiting for earlier milestones.');
      return;
    }
    if (!canModifyTask(task)) {
      showErrorToast('Only the assignee or client can check off subtasks.');
      return;
    }

    const currentChecklist: TaskChecklistItem[] = Array.isArray(task.checklist) ? [...task.checklist] : [];
    if (!currentChecklist[itemIndex]) return;

    currentChecklist[itemIndex] = {
      ...currentChecklist[itemIndex],
      completed: !currentChecklist[itemIndex].completed,
    };

    try {
      await api.patch(`/api/team-projects/${teamId}/tasks/${task.task_id}`, {
        checklist: currentChecklist,
      });
      onTasksUpdated();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update subtask');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
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
        assignee_account_id: newTaskAssignee || null,
      });
      showSuccessToast('Task created successfully');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('normal');
      setNewTaskAssignee('');
      setIsAddModalOpen(false);
      onTasksUpdated();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee === 'all') return true;
    if (filterAssignee === 'me') return String(t.assignee_account_id) === String(currentUserAccountId);
    return String(t.assignee_account_id) === filterAssignee;
  });

  return (
    <div className="space-y-6">
      {/* Taskboard Header Controls (ClickUp-style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#151720] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-800 p-0.5 bg-slate-100 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#151720] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#151720] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all">All Assignees</option>
              <option value="me">My Tasks</option>
              {members.map((m: any) => (
                <option key={m.account_id} value={m.account_id}>
                  {m.display_name} ({m.team_role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => (t.status || 'todo') === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 dark:bg-[#11131a] rounded-xl border border-slate-200 dark:border-zinc-800/80 p-3 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-400 dark:text-zinc-500 font-medium">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isOwner = canModifyTask(task);
                      const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                      const completedCount = checklist.filter((item) => item.completed).length;
                      const hasSubtasks = checklist.length > 0;
                      const isExpanded = Boolean(expandedTasks[task.task_id]);

                      return (
                        <div
                          key={task.task_id}
                          className={`bg-white dark:bg-[#181a24] p-3.5 rounded-xl border shadow-xs transition-all relative ${
                            task.is_locked
                              ? 'border-slate-300 dark:border-zinc-700/60 opacity-80 bg-slate-50/50 dark:bg-zinc-900/50'
                              : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          {/* Locked Badge Overlay */}
                          {task.is_locked && (
                            <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Locked (Waiting on Milestone {task.milestone_order || 1})
                            </div>
                          )}

                          {/* Milestone tag */}
                          {task.milestone_title && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 truncate max-w-full">
                                <Tag className="w-2.5 h-2.5" />
                                {task.milestone_title}
                              </span>
                            </div>
                          )}

                          {/* Task Title */}
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                            {task.title}
                          </h4>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Checklist Subtasks Progress & Toggle */}
                          {hasSubtasks && (
                            <div className="mb-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                              <button
                                type="button"
                                onClick={() => toggleExpand(task.task_id)}
                                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                              >
                                <span className="flex items-center gap-1">
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  Subtasks ({completedCount}/{checklist.length})
                                </span>
                                <span className="font-mono text-[10px]">
                                  {Math.round((completedCount / checklist.length) * 100)}%
                                </span>
                              </button>

                              {/* Expanded Checklist */}
                              {isExpanded && (
                                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-blue-500/30">
                                  {checklist.map((item, idx) => (
                                    <label
                                      key={idx}
                                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.completed}
                                        disabled={task.is_locked || !isOwner}
                                        onChange={() => handleToggleChecklistItem(task, idx)}
                                        className="mt-0.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-0 disabled:opacity-50"
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

                          {/* Footer: Assignee & Priority */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
                            {/* Assignee Avatar */}
                            <div className="flex items-center gap-1.5 min-w-0" title={task.assignee_name ? `Assigned to ${task.assignee_name}` : 'Unassigned'}>
                              <img
                                src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name)}
                                alt={task.assignee_name || 'Assignee'}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                                }}
                                className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                              />
                              <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[85px]">
                                {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>

                            {/* Priority Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.normal
                              }`}
                            >
                              {task.priority || 'Normal'}
                            </span>
                          </div>

                          {/* Move Column Selector */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                              Status:
                            </span>
                            <select
                              value={task.status || 'todo'}
                              disabled={task.is_locked && !isClient}
                              onChange={(e) => handleUpdateStatus(task, e.target.value as any)}
                              className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded px-2 py-0.5 focus:outline-hidden disabled:opacity-50 cursor-pointer"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Under Review</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Milestone</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Subtasks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                    const completedCount = checklist.filter((item) => item.completed).length;

                    return (
                      <tr
                        key={task.task_id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition ${
                          task.is_locked ? 'opacity-70 bg-slate-50/30 dark:bg-zinc-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {task.is_locked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            <span>{task.title}</span>
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                          {task.milestone_title || 'General'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={constructAvatarUrl(task.assignee_avatar_path, task.assignee_name)}
                              alt={task.assignee_name || 'Assignee'}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getFallbackAvatarUrl(task.assignee_name);
                              }}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                            />
                            <span className="font-medium text-slate-800 dark:text-zinc-200">
                              {task.assignee_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                              PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.normal
                            }`}
                          >
                            {task.priority || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-400 font-mono">
                          {checklist.length > 0 ? `${completedCount}/${checklist.length}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={task.status || 'todo'}
                            disabled={task.is_locked && !isClient}
                            onChange={(e) => handleUpdateStatus(task, e.target.value as any)}
                            className="text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded px-2.5 py-1 focus:outline-hidden disabled:opacity-50 cursor-pointer"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Under Review</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151720] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Project Task</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
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
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details, requirements, or test criteria..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden"
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
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m: any) => (
                      <option key={m.account_id} value={m.account_id}>
                        {m.display_name} ({m.team_role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs disabled:opacity-50"
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
