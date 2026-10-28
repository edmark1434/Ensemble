import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

export interface TeamTask {
  task_id: string;
  team_id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "in_review" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  due_at?: string | null;
  sort_order: number;
  assignee_account_id?: string | null;
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_handle?: string | null;
  assignee_avatar_path?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
}

export interface TeamMember {
  account_id: string;
  display_name: string;
  handle: string;
  role: string;
  avatar_path?: string;
}

interface TeamTaskboardProps {
  teamId: string;
  members: TeamMember[];
  canManage?: boolean;
  onBackToOverview?: () => void;
}

const COLUMNS: {
  id: TeamTask["status"];
  label: string;
  color: string;
  dotColor: string;
  badgeBg: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    color: "border-gray-200 dark:border-white/10",
    dotColor: "bg-gray-400 dark:bg-zinc-500",
    badgeBg: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "border-blue-400/30 dark:border-blue-500/20",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  {
    id: "in_review",
    label: "In Review",
    color: "border-amber-400/30 dark:border-amber-500/20",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    id: "completed",
    label: "Done",
    color: "border-emerald-400/30 dark:border-emerald-500/20",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
];

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  normal: { label: "Normal", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  high: { label: "High", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  urgent: { label: "Urgent", color: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
};

const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/+$/, "");
const getAvatarUrl = (path?: string | null) => {
  if (!path) return "/placeholders/avatar.png";
  if (path.startsWith("http")) return path;
  return `${cloudfront}/${path.replace(/^\/+/, "")}`;
};

export const TeamTaskboard: React.FC<TeamTaskboardProps> = ({
  teamId,
  members,
  canManage = true,
  onBackToOverview,
}) => {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TeamTask["status"]>("todo");
  const [taskPriority, setTaskPriority] = useState<TeamTask["priority"]>("normal");
  const [taskAssignee, setTaskAssignee] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch team tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/teams/${teamId}/tasks`);
      setTasks(res.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to load team tasks:", err);
      showErrorToast("Unable to load team tasks");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Open modal for Create
  const handleOpenCreateModal = (defaultStatus: TeamTask["status"] = "todo") => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskStatus(defaultStatus);
    setTaskPriority("normal");
    setTaskAssignee("");
    setTaskDueDate("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (task: TeamTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskAssignee(task.assignee_account_id || "");
    setTaskDueDate(task.due_at ? new Date(task.due_at).toISOString().split("T")[0] : "");
    setIsModalOpen(true);
  };

  // Submit task (Create or Edit)
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showErrorToast("Task title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        assignee_account_id: taskAssignee || null,
        due_at: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      };

      if (editingTask) {
        await api.patch(`/api/teams/${teamId}/tasks/${editingTask.task_id}`, payload);
        showSuccessToast("Task updated successfully");
      } else {
        await api.post(`/api/teams/${teamId}/tasks`, payload);
        showSuccessToast("Task created successfully");
      }

      setIsModalOpen(false);
      void fetchTasks();
    } catch (err: unknown) {
      console.error("Failed to save task:", err);
      showErrorToast("Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Move Status
  const handleUpdateStatus = async (taskId: string, newStatus: TeamTask["status"]) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? { ...t, status: newStatus } : t))
      );
      await api.patch(`/api/teams/${teamId}/tasks/${taskId}`, { status: newStatus });
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      showErrorToast("Unable to update task status");
      void fetchTasks();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      await api.delete(`/api/teams/${teamId}/tasks/${taskId}`);
      showSuccessToast("Task deleted");
    } catch (err: unknown) {
      console.error("Failed to delete task:", err);
      showErrorToast("Unable to delete task");
      void fetchTasks();
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned"
          ? !t.assignee_account_id
          : t.assignee_account_id === assigneeFilter);

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Controls: Search, Filters, Add Task */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-zinc-200 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          )}
          {/* Search */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="all">All Members</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.account_id} value={m.account_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Add Task Button */}
        <button
          onClick={() => handleOpenCreateModal("todo")}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Taskboard Columns */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100/50 dark:bg-white/[0.02] p-4 animate-pulse space-y-3"
            >
              <div className="h-5 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
              <div className="h-28 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-28 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-3.5 shadow-xs min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {col.label}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenCreateModal(col.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-32 rounded-xl border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-xs text-gray-400 dark:text-zinc-500">No tasks in {col.label}</p>
                      <button
                        onClick={() => handleOpenCreateModal(col.id)}
                        className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        + Create a task
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
                      const isOverdue =
                        task.due_at &&
                        task.status !== "completed" &&
                        new Date(task.due_at).getTime() < Date.now();

                      return (
                        <div
                          key={task.task_id}
                          className="group relative rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-dark-surface/90 p-3.5 shadow-xs hover:shadow-md transition-all duration-200 space-y-2.5"
                        >
                          {/* Priority and Action Menu */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityCfg.color}`}
                            >
                              {priorityCfg.label}
                            </span>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => handleOpenEditModal(task)}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                                title="Edit task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.task_id)}
                                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4
                              className={`text-xs font-bold leading-snug text-gray-900 dark:text-white ${
                                task.status === "completed" ? "line-through text-gray-400 dark:text-zinc-500" : ""
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Footer: Due date, Assignee, Status Mover */}
                          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                            {/* Due Date */}
                            <div className="flex items-center gap-1 min-w-0">
                              {task.due_at ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                                    isOverdue
                                      ? "text-red-600 dark:text-red-400 font-bold"
                                      : "text-gray-500 dark:text-zinc-400"
                                  }`}
                                  title={`Due: ${new Date(task.due_at).toLocaleDateString()}`}
                                >
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {new Date(task.due_at).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 dark:text-zinc-600 italic">
                                  No due date
                                </span>
                              )}
                            </div>

                            {/* Assignee & Status changer */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Assignee Avatar */}
                              {task.assignee_account_id ? (
                                <div
                                  className="w-5 h-5 rounded-full overflow-hidden border border-gray-200 dark:border-white/20"
                                  title={`Assigned to: ${task.assignee_name || "Member"}`}
                                >
                                  <img
                                    src={getAvatarUrl(task.assignee_avatar_path)}
                                    alt={task.assignee_name || "Assignee"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400"
                                  title="Unassigned"
                                >
                                  <UserIcon className="w-3 h-3" />
                                </div>
                              )}

                              {/* Status Transition Select */}
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleUpdateStatus(task.task_id, e.target.value as TeamTask["status"])
                                }
                                className="text-[10px] font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-1.5 py-0.5 text-gray-700 dark:text-zinc-300 outline-none cursor-pointer"
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="in_review">In Review</option>
                                <option value="completed">Done</option>
                              </select>
                            </div>
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

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-6 shadow-2xl space-y-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>{editingTask ? "Edit Team Task" : "Create Team Task"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Rough cut review for Intro scene"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 transition"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add details, notes, or deliverable expectations..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TeamTask["status"])}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TeamTask["priority"])}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.account_id} value={m.account_id}>
                        {m.display_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !taskTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  {isSubmitting ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
