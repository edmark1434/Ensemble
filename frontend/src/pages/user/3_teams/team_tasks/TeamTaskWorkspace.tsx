import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardList, Edit3, Filter, Plus, Search, Trash2, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import TeamTaskModal from "./TeamTaskModal";
import WorkspaceMembersModal from "./WorkspaceMembersModal";
import type { TeamTaskFormValues, TeamWorkspaceSnapshot, TeamWorkspaceTask } from "./types";

const COLUMNS: Array<{ id: TeamWorkspaceTask["status"]; label: string; color: string }> = [
  { id: "todo", label: "To Do", color: "bg-zinc-400" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "in_review", label: "In Review", color: "bg-amber-500" },
  { id: "completed", label: "Completed", color: "bg-emerald-500" },
];

const priorityClass: Record<TeamWorkspaceTask["priority"], string> = {
  low: "text-zinc-400 border-zinc-500/20 bg-zinc-500/10",
  normal: "text-blue-400 border-blue-500/20 bg-blue-500/10",
  high: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  urgent: "text-red-400 border-red-500/20 bg-red-500/10",
};

function activityText(action: string) {
  return ({
    task_created: "created a task",
    task_updated: "updated a task",
    task_deleted: "deleted a task",
    members_added: "added workspace members",
    member_removed: "removed a workspace member",
  } as Record<string, string>)[action] || action.replaceAll("_", " ");
}

export default function TeamTaskWorkspace() {
  const { id = "", contractId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TeamWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TeamWorkspaceTask | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (!id || !contractId) return;
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/api/teams/${id}/task-workspaces/${contractId}`);
      setData(response.data.data);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to load Team workspace");
      if ([403, 404].includes(error.response?.status)) navigate(`/teams/${id}`, { replace: true });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [contractId, id, navigate]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onUpdate = (event: { team_id?: string; contract_id?: string }) => {
      if (String(event?.team_id || "") === id && String(event?.contract_id || "") === contractId) void load(false);
    };
    socket.on("teamTaskWorkspaceUpdated", onUpdate);
    return () => { socket.off("teamTaskWorkspaceUpdated", onUpdate); };
  }, [contractId, id, load]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.tasks || []).filter((task) =>
      (!term || task.title.toLowerCase().includes(term) || String(task.description || "").toLowerCase().includes(term)) &&
      (!priority || task.priority === priority) &&
      (!assignee || task.assignees.some((member) => member.account_id === assignee))
    );
  }, [assignee, data?.tasks, priority, search]);

  const applySnapshot = (response: any) => setData(response.data?.data || response.data);

  const submitTask = async (values: TeamTaskFormValues) => {
    setSaving(true);
    try {
      const path = `/api/teams/${id}/task-workspaces/${contractId}/tasks${editingTask ? `/${editingTask.task_id}` : ""}`;
      const response = editingTask ? await api.patch(path, values) : await api.post(path, values);
      applySnapshot(response);
      showSuccessToast(editingTask ? "Task updated" : "Task created");
      setTaskModalOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to save task");
    } finally { setSaving(false); }
  };

  const updateStatus = async (task: TeamWorkspaceTask, status: TeamWorkspaceTask["status"]) => {
    setSaving(true);
    try {
      const response = await api.patch(`/api/teams/${id}/task-workspaces/${contractId}/tasks/${task.task_id}`, { status });
      applySnapshot(response);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to update task status");
    } finally { setSaving(false); }
  };

  const deleteTask = async (task: TeamWorkspaceTask) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setSaving(true);
    try {
      const response = await api.delete(`/api/teams/${id}/task-workspaces/${contractId}/tasks/${task.task_id}`);
      applySnapshot(response);
      showSuccessToast("Task deleted");
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to delete task");
    } finally { setSaving(false); }
  };

  const addMembers = async (accountIds: string[]) => {
    setSaving(true);
    try {
      const response = await api.post(`/api/teams/${id}/task-workspaces/${contractId}/members`, { account_ids: accountIds });
      applySnapshot(response);
      showSuccessToast("Workspace members added");
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to add members");
    } finally { setSaving(false); }
  };

  const removeMember = async (accountId: string) => {
    setSaving(true);
    try {
      const response = await api.delete(`/api/teams/${id}/task-workspaces/${contractId}/members/${accountId}`);
      applySnapshot(response);
      showSuccessToast("Workspace member removed");
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to remove member");
    } finally { setSaving(false); }
  };

  if (loading || !data) {
    return <div className="min-h-screen"><UserHeader pageTitle="Team Workspace" /><div className="space-y-5 p-6"><div className="h-24 animate-pulse rounded-xl bg-white/5" /><div className="grid gap-4 lg:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="h-96 animate-pulse rounded-xl bg-white/5" />)}</div></div></div>;
  }

  const completed = data.tasks.filter((task) => task.status === "completed").length;
  const progress = data.tasks.length ? Math.round((completed / data.tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-white">
      <UserHeader pageTitle="Team Workspace" />
      <main className="mx-auto max-w-[1800px] p-4 sm:p-6">
        <button type="button" onClick={() => navigate(`/teams/${id}`)} className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-500 hover:text-blue-400"><ArrowLeft className="h-4 w-4" />Back to Team</button>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"><span>{data.contract.listing_type}</span><span>·</span><span>Team as {data.contract.team_role}</span><span>·</span><span>{data.contract.contract_status}</span></div>
              <h1 className="mt-2 text-xl font-bold sm:text-2xl">{data.contract.listing_title}</h1>
              <p className="mt-1 text-sm text-zinc-500">{data.contract.client_name} · {data.contract.freelancer_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.permissions.can_manage_members && <button type="button" onClick={() => setMembersModalOpen(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm hover:border-blue-400 hover:text-blue-400 dark:border-white/10"><Users className="h-4 w-4" />Members ({data.members.length})</button>}
              {data.permissions.can_create_tasks && <button type="button" onClick={() => { setEditingTask(null); setTaskModalOpen(true); }} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-500"><Plus className="h-4 w-4" />New task</button>}
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }} /></div><span className="text-xs font-medium text-zinc-500">{progress}% · {completed}/{data.tasks.length}</span></div>
        </section>

        <section className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10"><Search className="mr-2 h-4 w-4 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="w-full bg-transparent text-sm outline-none" /></label>
          <div className="flex flex-col gap-2 sm:flex-row"><label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-white/10"><Filter className="h-4 w-4 text-zinc-500" /><select value={priority} onChange={(event) => setPriority(event.target.value)} className="cursor-pointer bg-transparent outline-none dark:bg-dark-base"><option value="">All priorities</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="cursor-pointer rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-dark-base"><option value="">All assignees</option>{data.members.map((member) => <option key={member.account_id} value={member.account_id}>{member.display_name}</option>)}</select></div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const tasks = filteredTasks.filter((task) => task.status === column.id);
              return (
                <div key={column.id} className="min-h-80 rounded-xl border border-gray-200 bg-gray-100/60 p-3 dark:border-white/10 dark:bg-white/[0.025]">
                  <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${column.color}`} /><h2 className="text-xs font-semibold uppercase tracking-wide">{column.label}</h2></div><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-white/5">{tasks.length}</span></div>
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const isAssignee = task.assignees.some((member) => member.account_id === data.current_account_id);
                      const canChangeStatus = data.permissions.can_manage || isAssignee;
                      return (
                        <article key={task.task_id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#12141d] dark:shadow-none">
                          <div className="flex items-start justify-between gap-2"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${priorityClass[task.priority]}`}>{task.priority}</span>{data.permissions.can_manage && <div className="flex gap-1"><button type="button" onClick={() => { setEditingTask(task); setTaskModalOpen(true); }} className="cursor-pointer rounded p-1.5 text-zinc-500 hover:bg-white/10 hover:text-blue-400"><Edit3 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void deleteTask(task)} className="cursor-pointer rounded p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>
                          <h3 className="mt-2 text-sm font-semibold">{task.title}</h3>{task.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{task.description}</p>}
                          {task.due_at && <p className={`mt-3 flex items-center gap-1.5 text-[10px] ${new Date(task.due_at) < new Date() && task.status !== "completed" ? "text-red-400" : "text-zinc-500"}`}><CalendarDays className="h-3 w-3" />Due {new Date(task.due_at).toLocaleString()}</p>}
                          <div className="mt-3 flex -space-x-1.5">{task.assignees.slice(0, 4).map((member) => <div key={member.account_id} title={member.display_name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-blue-500/20 text-[9px] font-semibold text-blue-300 dark:border-[#12141d]">{member.display_name.slice(0, 2).toUpperCase()}</div>)}{task.assignees.length > 4 && <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-zinc-700 text-[9px] dark:border-[#12141d]">+{task.assignees.length - 4}</div>}</div>
                          {canChangeStatus && <select disabled={saving} value={task.status} onChange={(event) => void updateStatus(task, event.target.value as TeamWorkspaceTask["status"])} className="mt-3 w-full cursor-pointer rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#12141d]"><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="completed">Completed</option></select>}
                        </article>
                      );
                    })}
                    {!tasks.length && <div className="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-center text-xs text-zinc-500 dark:border-white/10">No tasks</div>}
                  </div>
                </div>
              );
            })}
          </section>
          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-400" /><h2 className="text-sm font-semibold">Activity</h2></div>
            <div className="max-h-[650px] space-y-4 overflow-y-auto pr-1">{data.activity.map((item) => <div key={item.activity_id} className="border-l border-white/10 pl-3"><p className="text-xs leading-relaxed"><span className="font-medium">{item.actor_name}</span> <span className="text-zinc-500">{activityText(item.action)}</span>{item.task_title && <span className="text-zinc-400"> “{item.task_title}”</span>}</p><p className="mt-1 text-[10px] text-zinc-600">{new Date(item.created_at).toLocaleString()}</p></div>)}{!data.activity.length && <p className="py-8 text-center text-xs text-zinc-500">No activity yet.</p>}</div>
          </aside>
        </div>
      </main>
      <TeamTaskModal open={taskModalOpen} task={editingTask} members={data.members} saving={saving} onClose={() => { setTaskModalOpen(false); setEditingTask(null); }} onSubmit={submitTask} />
      <WorkspaceMembersModal open={membersModalOpen} members={data.members} availableMembers={data.available_members} saving={saving} onClose={() => setMembersModalOpen(false)} onAdd={addMembers} onRemove={removeMember} />
    </div>
  );
}
