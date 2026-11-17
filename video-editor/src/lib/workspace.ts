import "server-only";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import { isProjectFrozen } from "@/lib/db/projects";
import { getProjectMemberRole } from "@/lib/db/project-members";
import { readEditorWorkspaces, type WorkspaceRow } from "@/lib/db/workspace";
import type { EditorWorkspaceSnapshot, WorkspaceProgress, WorkspaceTask } from "@/features/editor/types/workspace";

export class WorkspaceAccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function normalizeTasks(rows: WorkspaceRow["tasks"], now: number, milestones: WorkspaceRow["milestones"]): WorkspaceTask[] {
  const milestoneDueDates = new Map(milestones.flatMap(milestone => [
    [milestone.id, milestone.dueAt] as const,
    ...(milestone.jobMilestoneId ? [[milestone.jobMilestoneId, milestone.dueAt] as const] : []),
  ]));
  return [...new Map(rows.map(row => [row.id, row])).values()].map(row => {
    const status = row.status.toLowerCase();
    let normalized: WorkspaceTask["status"] = "pending";
    if (["completed", "done"].includes(status)) normalized = "completed";
    else if ([row.dueAt, milestoneDueDates.get(row.milestoneId ?? "") ?? milestoneDueDates.get(row.jobMilestoneId ?? "")]
      .some(dueAt => dueAt && new Date(dueAt).getTime() <= now)) normalized = "overdue";
    else if (["in_review", "review", "submitted_for_review"].includes(status)) normalized = "review";
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

function weightedMilestoneProgress(milestones: WorkspaceRow["milestoneProgress"]): number | null {
  if (milestones.length === 0) return null;

  const totalWeight = milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
  const completion = milestones.reduce((sum, milestone) => {
    const fraction = milestone.completed ? 1 : milestone.finishedTasks / (milestone.totalTasks || 1);
    return sum + fraction * (totalWeight > 0 ? milestone.weight : 1);
  }, 0);

  return Math.round(completion / (totalWeight || milestones.length) * 10_000) / 100;
}

export async function getEditorWorkspaceSnapshot(projectId: string, userId: string): Promise<EditorWorkspaceSnapshot> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new WorkspaceAccessError("Invalid project ID", 400);
  }
  if (!canEditWithRole(await getProjectMemberRole(projectId, userId)) || await isProjectFrozen(projectId)) {
    throw new WorkspaceAccessError("You no longer have access to this project.", 403);
  }
  const rows = await readEditorWorkspaces(projectId, userId);
  const now = Date.now();
  return {
    workspaces: rows.map(row => {
      const currentTaskIds = new Set(row.milestones.flatMap(milestone => milestone.tasks.map(task => task.id)));
      const tasks = normalizeTasks(row.tasks.filter(task => currentTaskIds.has(task.id)), now, row.milestones);
      return {
        id: row.id, name: row.name, tasks, progress: progress(tasks),
        overallPercent: weightedMilestoneProgress(row.milestoneProgress),
        milestones: row.milestones.map(({ tasks: milestoneTasks, ...milestone }) => ({
          ...milestone, progress: progress(normalizeTasks(milestoneTasks, now, row.milestones)),
        })),
      };
    }),
  };
}
