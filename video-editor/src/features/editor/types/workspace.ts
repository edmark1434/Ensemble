export type WorkspaceTaskStatus = "pending" | "in_progress" | "review" | "completed" | "overdue";

export interface WorkspaceProgress {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  review: number;
  overdue: number;
  percent: number;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string | null;
  status: WorkspaceTaskStatus;
  priority: string;
  startsAt: string | null;
  dueAt: string | null;
  milestoneId: string | null;
  jobMilestoneId: string | null;
  milestoneTitle: string | null;
  assignedBy: string | null;
  locked: boolean;
}

export interface WorkspaceMilestone {
  id: string;
  jobMilestoneId: string | null;
  contractId: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string | null;
  progress: WorkspaceProgress;
}

export interface EditorWorkspace {
  id: string;
  name: string;
  overallPercent: number | null;
  milestones: WorkspaceMilestone[];
  tasks: WorkspaceTask[];
  progress: WorkspaceProgress;
}

export interface EditorWorkspaceSnapshot {
  workspaces: EditorWorkspace[];
}
