import "server-only";
import { getProjectMemberRole } from "@/lib/db/project-members";
import { readEditorWorkspaces, type WorkspaceRow } from "@/lib/db/workspace";
import type { EditorWorkspaceSnapshot, WorkspaceProgress, WorkspaceTask } from "@/features/editor/types/workspace";

export class WorkspaceAccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function normalizeTasks(rows: WorkspaceRow["tasks"], now: number): WorkspaceTask[] {
  return [...new Map(rows.map(row => [row.id, row])).values()].map(row => {
    const status = row.status.toLowerCase();
    let normalized: WorkspaceTask["status"] = "pending";
    if (["completed", "done"].includes(status)) normalized = "completed";
    else if (["in_review", "review", "submitted_for_review"].includes(status)) normalized = "review";
    else if (status === "overdue" || (row.dueAt && new Date(row.dueAt).getTime() < now)) normalized = "overdue";
    else if (["in_progress", "active"].includes(status)) normalized = "in_progress";
    return { ...row, status: normalized };
  });
}

function progress(tasks: WorkspaceTask[]): WorkspaceProgress {
  const counts: WorkspaceProgress = { total: tasks.length, completed: 0, pending: 0, in_progress: 0, review: 0, overdue: 0, percent: 0 };
  for (const task of tasks) counts[task.status]++;
  counts.percent = counts.total ? Math.round(counts.completed / counts.total * 100) : 0;
  return counts;
}

export async function getEditorWorkspaceSnapshot(projectId: string, userId: string): Promise<EditorWorkspaceSnapshot> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new WorkspaceAccessError("Invalid project ID", 400);
  }
  if (!await getProjectMemberRole(projectId, userId)) {
    throw new WorkspaceAccessError("You no longer have access to this project.", 403);
  }
  const rows = await readEditorWorkspaces(projectId, userId);
  const now = Date.now();
  return {
    workspaces: rows.map(row => {
      const tasks = normalizeTasks(row.tasks, now);
      return {
        id: row.id, name: row.name, tasks, progress: progress(tasks),
        milestones: row.milestones.map(({ tasks: milestoneTasks, ...milestone }) => ({
          ...milestone, progress: progress(normalizeTasks(milestoneTasks, now)),
        })),
      };
    }),
  };
}
