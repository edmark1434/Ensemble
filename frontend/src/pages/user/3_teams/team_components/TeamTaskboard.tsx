import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  GripVertical,
  ArrowUpDown,
  Zap,
  Table as TableIcon,
  Users,
  ChevronDown,
  Check,
  Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";
import useGlobalState from "@/lib/global_state";

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

type DisplayMode = "board" | "table";

const COLUMNS: {
  id: TeamTask["status"];
  label: string;
  dotColor: string;
}[] = [
  {
    id: "todo",
    label: "TO DO",
    dotColor: "bg-zinc-400 dark:bg-zinc-500",
  },
  {
    id: "in_progress",
    label: "IN PROGRESS",
    dotColor: "bg-blue-500",
  },
  {
    id: "in_review",
    label: "IN REVIEW",
    dotColor: "bg-amber-500",
  },
  {
    id: "completed",
    label: "DONE",
    dotColor: "bg-emerald-500",
  },
];

const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    color: "bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-400 border-zinc-200/80 dark:border-white/10",
  },
  normal: {
    label: "Normal",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border-blue-200/60 dark:border-blue-500/20",
  },
  high: {
    label: "High",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
  },
  urgent: {
    label: "Urgent",
    color: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/20",
  },
};

const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/+$/, "");
const getAvatarUrl = (path?: string | null) => {
  if (!path) return "/placeholders/avatar.png";
  if (path.startsWith("http")) return path;
  return `${cloudfront}/${path.replace(/^\/+/, "")}`;
};

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const TeamTaskboard: React.FC<TeamTaskboardProps> = ({
  teamId,
  members,
  canManage = true,
  onBackToOverview,
}) => {
  const { user, theme } = useGlobalState();
  const currentAccountId = user?.account_id || user?.id;
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Drag and Drop State
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

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

  // Generate clean issue codes (TT-01, TT-02...)
  const taskCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    const sorted = [...tasks].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    sorted.forEach((t, idx) => {
      map[t.task_id] = `TT-${String(idx + 1).padStart(2, "0")}`;
    });
    return map;
  }, [tasks]);

  // Assignee dropdown options for GlideSelect matching Workflow tab
  const assigneeSelectOptions: GlideSelectOption[] = useMemo(() => {
    const options: GlideSelectOption[] = [
      {
        value: "all",
        label: "All Assignees",
        icon: <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />,
      },
      {
        value: "me",
        label: "My Tasks",
        icon: <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
      },
      {
        value: "unassigned",
        label: "Unassigned",
        icon: <UserIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />,
      },
    ];

    members.forEach((m) => {
      options.push({
        value: m.account_id,
        label: m.display_name,
        icon: (
          <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            {m.avatar_path ? (
              <img
                src={getAvatarUrl(m.avatar_path)}
                alt={m.display_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholders/avatar.png";
                }}
              />
            ) : (
              <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                {getInitials(m.display_name)}
              </span>
            )}
          </div>
        ),
      });
    });

    return options;
  }, [members]);

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

  // Quick Move Status with optimistic update
  const handleUpdateStatus = async (taskId: string, newStatus: TeamTask["status"]) => {
    const prevTask = tasks.find((t) => t.task_id === taskId);
    const prevStatus = prevTask ? prevTask.status : "todo";

    // Optimistic seamless update
    setTasks((prev) =>
      prev.map((t) => (t.task_id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/api/teams/${teamId}/tasks/${taskId}`, { status: newStatus });
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      showErrorToast("Unable to update task status");
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? { ...t, status: prevStatus } : t))
      );
    }
  };

  // Drop card on column handler
  const handleDropOnColumn = (targetColId: TeamTask["status"], e?: React.DragEvent) => {
    const taskIdToMove = e?.dataTransfer?.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverColumnId(null);
    if (!taskIdToMove) return;

    const task = tasks.find((t) => t.task_id === taskIdToMove);
    if (!task || task.status === targetColId) return;

    handleUpdateStatus(taskIdToMove, targetColId);
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

      let matchesAssignee = true;
      if (filterAssignee === "me") {
        matchesAssignee = Boolean(currentAccountId && t.assignee_account_id === currentAccountId);
      } else if (filterAssignee === "unassigned") {
        matchesAssignee = !t.assignee_account_id;
      } else if (filterAssignee !== "all") {
        matchesAssignee = t.assignee_account_id === filterAssignee;
      }

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, priorityFilter, filterAssignee, currentAccountId]);

  return (
    <div className="space-y-4 pb-20 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ======================================================== */}
      {/* 1. TOP TAB SWITCHER: Board | List | Table | Gantt        */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121214] px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 rounded-t-xl">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Board Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode("board")}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === "board"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 flex items-center justify-center p-0.5 shadow-2xs">
              <div className="w-1.5 h-full bg-white rounded-2xs" />
            </div>
            <span>Board</span>
            {displayMode === "board" && (
              <motion.div
                layoutId="team-taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>

          {/* Table Tab */}
          <button
            type="button"
            onClick={() => setDisplayMode("table")}
            className={`relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              displayMode === "table"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Table</span>
            {displayMode === "table" && (
              <motion.div
                layoutId="team-taskboard-active-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        </div>

        {/* Total Tasks Counter */}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 self-end sm:self-auto shrink-0 font-medium">
          {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-CONTROL BAR (Matching Workflow Screenshot 1)      */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-white/10 p-3 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        {/* Left Side: Overview Button (if available), Status Pill, Link */}
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          )}

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

        {/* Right Side: Quick Action Icons, Search, GlideSelect Assignee, + Task Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Quick Icons: Reorder, Filter, My Tasks */}
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
            onClick={() => setFilterAssignee(filterAssignee === "me" ? "all" : "me")}
            title={filterAssignee === "me" ? "Show all tasks" : "Show only my tasks"}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              filterAssignee === "me"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
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
          <div className="flex items-center">
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
              surfaceColor={isDark ? "#121214" : "#ffffff"}
              highlightColor={isDark ? "#27272a" : "#f4f4f5"}
              textColor={isDark ? "#f4f4f5" : "#09090b"}
              borderColor={isDark ? "#27272a" : "#e4e4e7"}
              accentColor={isDark ? "#ffffff" : "#09090b"}
              className="w-40 lg:w-48"
            />
          </div>

          {/* Primary + Task Button with Dropdown Chevron */}
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenCreateModal("todo")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Task</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
          )}
        </div>
      </div>

      {/* Board Subtitle matching Screenshot 1 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {filteredTasks.length} {filteredTasks.length === 1 ? "item" : "items"}. Click a card to open it, or drag it to another column.
        </p>
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN STAGE: Board / List / Table / Gantt View         */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {displayMode === "board" && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex gap-4.5 overflow-x-auto pb-6 pt-1 items-start w-full custom-scrollbar min-h-[560px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-[320px] sm:w-[335px] lg:w-[350px] shrink-0 bg-zinc-50/70 dark:bg-[#0c0d12] rounded-[4px] border border-zinc-200 dark:border-white/10 p-4 animate-pulse space-y-3 min-h-[560px]"
                    >
                      <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-[2px]" />
                      <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-[2px]" />
                      <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-[2px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4.5 overflow-x-auto pb-6 pt-1 items-start w-full custom-scrollbar min-h-[580px]">
                  {COLUMNS.map((col) => {
                    const colTasks = filteredTasks.filter((t) => t.status === col.id);
                    const isDragOver = dragOverColumnId === col.id;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverColumnId !== col.id) {
                            setDragOverColumnId(col.id);
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragOverColumnId !== col.id) {
                            setDragOverColumnId(col.id);
                          }
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (dragOverColumnId === col.id) {
                            setDragOverColumnId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropOnColumn(col.id, e);
                        }}
                        className={`w-[320px] sm:w-[335px] lg:w-[350px] shrink-0 bg-zinc-50/70 dark:bg-[#0c0d12] rounded-[4px] border transition-all duration-150 p-4 flex flex-col min-h-[560px] ${
                          isDragOver
                            ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/10 bg-zinc-100/80 dark:bg-zinc-900/80"
                            : "border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-zinc-200/80 dark:border-white/10">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-[1px] shrink-0 ${col.dotColor}`} />
                            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                              {col.label}
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                              {colTasks.length}
                            </span>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModal(col.id)}
                              className="p-1 rounded-[2px] text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/5 transition cursor-pointer"
                              title={`Add task to ${col.label}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Cards List */}
                        <div className="space-y-3 flex-1">
                          {colTasks.length === 0 && !isDragOver ? (
                            <div className="h-28 flex items-center justify-center border border-dashed border-zinc-200 dark:border-white/10 rounded-[2px] text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                              No tasks in {col.label}
                            </div>
                          ) : null}

                          {colTasks.map((task) => {
                            const taskCode = taskCodeMap[task.task_id] || "#TT";
                            const isDragging = draggingTaskId === task.task_id;
                            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
                            const isOverdue =
                              task.due_at &&
                              task.status !== "completed" &&
                              new Date(task.due_at).getTime() < Date.now();

                            return (
                              <div
                                key={task.task_id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", task.task_id);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggingTaskId(task.task_id);
                                }}
                                onDragEnd={() => {
                                  setDraggingTaskId(null);
                                  setDragOverColumnId(null);
                                }}
                                onClick={() => handleOpenEditModal(task)}
                                className={`group/card bg-white dark:bg-[#12141a] p-4 rounded-[2px] border transition-all duration-150 shadow-xs cursor-pointer select-none relative ${
                                  isDragging
                                    ? "opacity-40 scale-[0.98] border-zinc-900 dark:border-white pointer-events-none"
                                    : "border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25 hover:shadow-xs hover:bg-zinc-50/70 dark:hover:bg-[#161822]"
                                }`}
                              >
                                {/* Top Row: Dot + Code + Priority Badge + Grip / Actions */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-[1px] shrink-0 ${col.dotColor}`} />
                                    <span className="text-[11px] font-bold tracking-wider text-zinc-600 dark:text-zinc-300 truncate">
                                      {taskCode}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold border ml-1 ${priorityCfg.color}`}
                                    >
                                      {priorityCfg.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditModal(task);
                                      }}
                                      className="p-1 rounded-[2px] text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer"
                                      title="Edit task"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(task.task_id);
                                        }}
                                        className="p-1 rounded-[2px] text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                                        title="Delete task"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <div
                                      className="text-zinc-400 dark:text-zinc-500 cursor-grab active:cursor-grabbing group-hover/card:text-zinc-700 dark:group-hover/card:text-zinc-200 ml-0.5"
                                      title="Drag to move column"
                                    >
                                      <GripVertical className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                </div>

                                {/* Title */}
                                <h4
                                  className={`text-xs sm:text-sm font-bold leading-snug text-zinc-900 dark:text-zinc-100 mb-1.5 line-clamp-2 ${
                                    task.status === "completed" ? "line-through text-zinc-400 dark:text-zinc-500" : ""
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {/* Description Preview */}
                                {task.description && (
                                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}

                                {/* Card Footer: Due Date Preview + Assignee Avatar + Fast Status Changer */}
                                <div className="pt-2.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {/* Due Date */}
                                  <div className="flex items-center gap-1 min-w-0">
                                    {task.due_at ? (
                                      <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                                          isOverdue
                                            ? "text-red-600 dark:text-red-400 font-bold"
                                            : "text-zinc-500 dark:text-zinc-400"
                                        }`}
                                        title={`Due: ${new Date(task.due_at).toLocaleDateString()}`}
                                      >
                                        <Calendar className="w-3 h-3 shrink-0" />
                                        <span>
                                          {new Date(task.due_at).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">
                                        No due date
                                      </span>
                                    )}
                                  </div>

                                  {/* Assignee & Fast Status changer */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Assignee Avatar */}
                                    {task.assignee_account_id ? (
                                      <div
                                        className="w-5 h-5 min-w-[20px] rounded-full shrink-0 aspect-square overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300"
                                        title={`Assigned to: ${task.assignee_name || "Member"}`}
                                      >
                                        {task.assignee_avatar_path ? (
                                          <img
                                            src={getAvatarUrl(task.assignee_avatar_path)}
                                            alt={task.assignee_name || "Assignee"}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = "/placeholders/avatar.png";
                                            }}
                                            className="w-full h-full object-cover block shrink-0"
                                          />
                                        ) : (
                                          <span>{getInitials(task.assignee_name)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div
                                        className="w-5 h-5 min-w-[20px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[10px]"
                                        title="Unassigned"
                                      >
                                        <UserIcon className="w-3 h-3" />
                                      </div>
                                    )}

                                    {/* Status Quick Select */}
                                    <select
                                      value={task.status}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(task.task_id, e.target.value as TeamTask["status"]);
                                      }}
                                      className="text-[10px] font-medium rounded-[2px] border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0c0d12] px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
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
                          })}

                          {/* Dashed Drop Target Placeholder */}
                          {isDragOver && (
                            <div className="h-24 rounded-[2px] border-2 border-dashed border-zinc-400 dark:border-zinc-600 bg-zinc-100/50 dark:bg-zinc-800/30 flex items-center justify-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 transition-all duration-150 animate-pulse">
                              Drop to move to {col.label}
                            </div>
                          )}
                        </div>

                        {/* + Add Task at Bottom of Column */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal(col.id)}
                            className="mt-3 w-full py-2 px-3 rounded-[2px] border border-dashed border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25 hover:bg-white dark:hover:bg-white/5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add task</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {displayMode === "table" && (
            <div className="bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.task_id}
                      onClick={() => handleOpenEditModal(task)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/5 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-bold text-zinc-500">{taskCodeMap[task.task_id]}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">{task.title}</td>
                      <td className="py-3 px-4 uppercase text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{task.status.replace("_", " ")}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_CONFIG[task.priority]?.color}`}>
                          {PRIORITY_CONFIG[task.priority]?.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">{task.assignee_name || "Unassigned"}</td>
                      <td className="py-3 px-4 text-zinc-500">
                        {task.due_at ? new Date(task.due_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0e1017] p-6 shadow-2xl space-y-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/10">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{editingTask ? "Edit Team Task" : "Create Team Task"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Rough cut review for Intro scene"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add details, notes, or deliverable expectations..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TeamTask["status"])}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TeamTask["priority"])}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#12141a] text-xs text-zinc-900 dark:text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-white/10">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !taskTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
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
