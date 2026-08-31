import { useEffect, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import type { TeamTaskFormValues, TeamTaskMember, TeamWorkspaceTask } from "./types";

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function TeamTaskModal({
  open,
  task,
  members,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  task: TeamWorkspaceTask | null;
  members: TeamTaskMember[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TeamTaskFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TeamWorkspaceTask["status"]>("todo");
  const [priority, setPriority] = useState<TeamWorkspaceTask["priority"]>("normal");
  const [startsAt, setStartsAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setStatus(task?.status || "todo");
    setPriority(task?.priority || "normal");
    setStartsAt(toLocalInput(task?.starts_at));
    setDueAt(toLocalInput(task?.due_at));
    setAssignees(task?.assignees.map((member) => member.account_id) || []);
    setTitleError("");
  }, [open, task]);

  if (!open) return null;

  const submit = async () => {
    if (!title.trim()) {
      setTitleError("Task title is required.");
      return;
    }
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assignee_account_ids: assignees,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-[#11131d]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#11131d]">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{task ? "Edit task" : "Create task"}</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Assign work, priority, and delivery dates.</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">Task title *</span>
            <input
              value={title}
              onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setTitleError(""); }}
              maxLength={160}
              className={`w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none dark:text-white ${titleError ? "border-red-500" : "border-gray-200 focus:border-blue-500 dark:border-white/10"}`}
              placeholder="Example: Prepare first design draft"
            />
            {titleError && <span className="mt-1 block text-xs text-red-500">{titleError}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={5000} className="w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:text-white" placeholder="Describe the expected output and requirements." />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as TeamWorkspaceTask["status"])} className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#11131d] dark:text-white">
                <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="overdue">Overdue</option><option value="completed">Completed</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as TeamWorkspaceTask["priority"])} className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#11131d] dark:text-white">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300"><CalendarDays className="h-3.5 w-3.5" />Start date</span>
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-white/10 dark:text-white" />
            </label>
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300"><CalendarDays className="h-3.5 w-3.5" />Due date</span>
              <input type="datetime-local" value={dueAt} min={startsAt || undefined} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-white/10 dark:text-white" />
            </label>
          </div>
          <div>
            <span className="mb-2 block text-xs font-medium text-gray-700 dark:text-zinc-300">Assignees</span>
            {members.length ? (
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-white/10 sm:grid-cols-2">
                {members.map((member) => {
                  const checked = assignees.includes(member.account_id);
                  return (
                    <button key={member.account_id} type="button" onClick={() => setAssignees((current) => checked ? current.filter((id) => id !== member.account_id) : [...current, member.account_id])} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-left transition ${checked ? "border-blue-500 bg-blue-500/10" : "border-transparent hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400">{member.display_name.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-gray-900 dark:text-white">{member.display_name}</p><p className="truncate text-[10px] text-zinc-500">@{member.handle}</p></div>
                      <span className={`grid h-5 w-5 place-items-center rounded border ${checked ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 dark:border-white/20"}`}>{checked && <Check className="h-3 w-3" />}</span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-zinc-500">Add workspace members before assigning tasks.</p>}
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#11131d]">
          <button type="button" disabled={saving} onClick={onClose} className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50 dark:border-white/10">Cancel</button>
          <button type="button" disabled={saving} onClick={() => void submit()} className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : task ? "Save changes" : "Create task"}</button>
        </div>
      </div>
    </div>
  );
}
