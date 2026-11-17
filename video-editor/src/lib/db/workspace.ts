import "server-only";
import { sql } from "kysely";
import { db } from "@/lib/db";
import type { WorkspaceTask, WorkspaceMilestone } from "@/features/editor/types/workspace";

type TaskRow = Omit<WorkspaceTask, "status"> & { status: string };
type MilestoneRow = Omit<WorkspaceMilestone, "progress"> & { tasks: TaskRow[] };
type MilestoneProgressRow = {
  weight: number;
  completed: boolean;
  totalTasks: number;
  finishedTasks: number;
};
export interface WorkspaceRow {
  id: string;
  name: string;
  tasks: TaskRow[];
  milestones: MilestoneRow[];
  milestoneProgress: MilestoneProgressRow[];
}

// Contractual workspaces group contracts by team. Regular team workspaces
// retain their explicit member/manager boundary. Read everything in one snapshot.
export async function readEditorWorkspaces(projectId: string, userId: string) {
  const result = await sql<WorkspaceRow>`
    WITH viewer AS (
      SELECT account_id, user_id FROM users WHERE user_id = ${userId}::uuid
    ), linked_teams AS (
      SELECT DISTINCT w.team_id
      FROM team_contract_workspaces w
      LEFT JOIN job_contracts jc ON jc.contract_id = w.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = p.job_id
      LEFT JOIN gig_contracts gc ON gc.contract_id = w.contract_id
      LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
      WHERE w.project_id = ${projectId}::uuid
         OR j.existing_project_id = ${projectId}::uuid
         OR gr.linked_project_id = ${projectId}::uuid
         OR EXISTS (SELECT 1 FROM team_workspace_projects wp
                    WHERE wp.workspace_id = w.workspace_id AND wp.project_id = ${projectId}::uuid)
    ), accessible AS (
      SELECT w.workspace_id, w.team_id, w.contract_id,
             a.display_name AS team_name, t.job_id AS team_job_id, v.account_id,
             p.job_milestone_id, g.gig_id,
             COALESCE(p.freelancer_account_id, g.freelancer_account_id) AS freelancer_id,
             c.status AS contract_status, c.deadline_at AS contract_deadline
      FROM linked_teams linked
      JOIN teams t ON t.team_id = linked.team_id AND t.deleted_at IS NULL
      JOIN accounts a ON a.account_id = t.account_id
      JOIN team_contract_workspaces w ON w.team_id = t.team_id
      JOIN contracts c ON c.contract_id = w.contract_id
      CROSS JOIN viewer v
      LEFT JOIN team_members member ON member.team_id = t.team_id
        AND member.user_id = v.user_id AND member.status = 'Active'
      LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = p.job_id
      LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
      LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
      LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
      LEFT JOIN gigs g ON g.gig_id = gt.gig_id
      WHERE (
        t.team_type = 'contractual'
        AND (member.user_id IS NOT NULL OR COALESCE(j.client_account_id, gr.client_account_id) = v.account_id)
      ) OR (
        t.team_type <> 'contractual' AND member.user_id IS NOT NULL
        AND (member.role IN ('Owner', 'Admin') OR EXISTS (
          SELECT 1 FROM team_workspace_members wm
          WHERE wm.workspace_id = w.workspace_id AND wm.account_id = v.account_id
        ))
        AND (w.project_id = ${projectId}::uuid OR j.existing_project_id = ${projectId}::uuid
          OR gr.linked_project_id = ${projectId}::uuid OR EXISTS (
            SELECT 1 FROM team_workspace_projects wp
            WHERE wp.workspace_id = w.workspace_id AND wp.project_id = ${projectId}::uuid
          ))
      )
    ), task_rows AS (
      SELECT w.team_id, task.task_id, task.sort_order, task.created_at,
        EXISTS (SELECT 1 FROM team_workspace_task_assignees assignee
                WHERE assignee.task_id = task.task_id AND assignee.account_id = w.account_id) AS assigned,
        task.contract_milestone_id, task.job_milestone_id,
        jsonb_build_object(
          'id', task.task_id, 'title', task.title, 'description', task.description,
          'status', task.status,
          'priority', task.priority, 'startsAt', task.starts_at, 'dueAt', task.due_at,
          'milestoneId', task.contract_milestone_id, 'jobMilestoneId', task.job_milestone_id,
          'milestoneTitle', COALESCE(cm.name, jm.title),
          'assignedBy', (SELECT a.display_name FROM team_workspace_task_assignees ta
                         JOIN accounts a ON a.account_id = ta.assigned_by_account_id
                         WHERE ta.task_id = task.task_id AND ta.account_id = w.account_id),
          'locked', CASE WHEN LOWER(cm.status) IN ('active', 'in_progress', 'completed', 'submitted_for_review', 'revision_requested', 'review')
                         OR COALESCE(cm.index, jm.order_index, 0) <= 0 THEN FALSE ELSE task.is_locked END
        ) AS data
      FROM accessible w
      JOIN team_workspace_tasks task ON task.workspace_id = w.workspace_id AND task.deleted_at IS NULL
      LEFT JOIN contract_milestones cm ON cm.contract_milestone_id = task.contract_milestone_id
      LEFT JOIN job_milestones jm ON jm.job_milestone_id = task.job_milestone_id
    ), own_milestones AS (
      SELECT w.team_id, w.contract_id, w.job_milestone_id,
             cm.contract_milestone_id, cm.name, cm.description, cm.status,
             COALESCE(cm.deadline_at,
               cm.started_at + cm.deadline * INTERVAL '1 hour', w.contract_deadline) AS due_at,
             ROW_NUMBER() OVER (PARTITION BY w.workspace_id ORDER BY
               CASE WHEN LOWER(cm.status) IN ('active', 'in_progress', 'submitted_for_review', 'revision_requested', 'review', 'overdue', 'stalled') THEN 0 ELSE 1 END,
               cm.index, cm.contract_milestone_id) AS position
      FROM accessible w
      JOIN contract_milestones cm ON cm.contract_id = w.contract_id
      WHERE LOWER(w.contract_status) NOT IN ('completed', 'cancelled', 'closed', 'done', 'pending signature')
        AND LOWER(cm.status) NOT IN ('completed', 'approved', 'claimed', 'cancelled', 'abandoned')
        AND (
          w.freelancer_id = w.account_id
          OR EXISTS (
            SELECT 1 FROM contract_subcontractors sub
            WHERE sub.contract_id = w.contract_id AND sub.account_id = w.account_id
              AND (sub.assigned_milestone_id IS NULL OR sub.assigned_milestone_id = cm.contract_milestone_id
                OR sub.assigned_milestone_id = w.job_milestone_id
                OR EXISTS (SELECT 1 FROM gig_milestones gm
                  WHERE gm.gig_id = w.gig_id AND gm.gig_milestone_id = sub.assigned_milestone_id AND gm.index = cm.index))
          )
          OR EXISTS (
            SELECT 1 FROM teams contractor_team
            JOIN team_members contractor_member ON contractor_member.team_id = contractor_team.team_id
            JOIN viewer v ON v.user_id = contractor_member.user_id
            WHERE contractor_team.account_id = w.freelancer_id AND contractor_team.deleted_at IS NULL
              AND contractor_member.status = 'Active'
              AND NOT EXISTS (SELECT 1 FROM contract_subcontractors sub
                              WHERE sub.contract_id = w.contract_id AND sub.account_id = w.account_id)
              AND EXISTS (SELECT 1 FROM team_workspace_members wm
                          WHERE wm.workspace_id = w.workspace_id AND wm.account_id = w.account_id)
          )
        )
    ), workspace_teams AS (
      SELECT DISTINCT team_id, team_name, team_job_id FROM accessible
    ), progress_contracts AS (
      SELECT DISTINCT team_id, contract_id, job_milestone_id,
        LOWER(contract_status) IN ('completed', 'done') AS completed
      FROM accessible
      WHERE LOWER(contract_status) <> 'cancelled'
    ), progress_contract_milestones AS (
      SELECT w.team_id, w.contract_id, w.job_milestone_id, cm.contract_milestone_id, cm.credits,
        (w.completed OR LOWER(cm.status) IN ('completed', 'approved', 'claimed')) AS completed
      FROM progress_contracts w
      JOIN contract_milestones cm ON cm.contract_id = w.contract_id
      WHERE LOWER(cm.status) NOT IN ('cancelled', 'abandoned')
    ), progress_job_milestones AS (
      SELECT t.team_id, jm.job_milestone_id, COALESCE(jm.budget_percentage, 0) AS weight,
        COALESCE((SELECT BOOL_AND(w.completed OR COALESCE(cm.completed, FALSE))
          FROM progress_contracts w
          LEFT JOIN progress_contract_milestones cm ON cm.team_id = w.team_id AND cm.contract_id = w.contract_id
          WHERE w.team_id = t.team_id AND w.job_milestone_id = jm.job_milestone_id), FALSE) AS completed
      FROM workspace_teams t
      JOIN job_milestones jm ON jm.job_id = t.team_job_id
    ), workspace_milestones AS (
      SELECT team_id, job_milestone_id, NULL::uuid AS contract_milestone_id, weight, completed
      FROM progress_job_milestones
      UNION ALL
      SELECT cm.team_id, NULL::uuid, cm.contract_milestone_id, COALESCE(cm.credits, 0), cm.completed
      FROM progress_contract_milestones cm
      WHERE NOT EXISTS (SELECT 1 FROM progress_job_milestones jm WHERE jm.team_id = cm.team_id)
    )
    SELECT teams.team_id AS id, teams.team_name AS name,
      COALESCE((SELECT jsonb_agg(task.data ORDER BY task.sort_order, task.created_at, task.data->>'id')
                FROM task_rows task WHERE task.team_id = teams.team_id AND task.assigned), '[]'::jsonb) AS tasks,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', m.contract_milestone_id, 'jobMilestoneId', m.job_milestone_id, 'contractId', m.contract_id, 'title', m.name,
        'description', m.description, 'status', m.status, 'dueAt', m.due_at,
        'tasks', COALESCE((SELECT jsonb_agg(task.data) FROM task_rows task
          WHERE task.team_id = m.team_id AND (task.contract_milestone_id = m.contract_milestone_id
            OR (task.contract_milestone_id IS NULL AND task.job_milestone_id = m.job_milestone_id))), '[]'::jsonb)
      ) ORDER BY m.contract_id) FROM own_milestones m WHERE m.team_id = teams.team_id AND m.position = 1), '[]'::jsonb) AS milestones,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'weight', m.weight, 'completed', m.completed,
        'totalTasks', counts.total, 'finishedTasks', counts.finished
      )) FROM workspace_milestones m
      CROSS JOIN LATERAL (
        SELECT COUNT(DISTINCT task.task_id) AS total,
          COUNT(DISTINCT task.task_id) FILTER (WHERE LOWER(task.data->>'status') IN ('completed', 'done')) AS finished
        FROM task_rows task
        WHERE task.team_id = m.team_id AND (
          (task.contract_milestone_id IS NULL AND task.job_milestone_id = COALESCE(m.job_milestone_id, m.contract_milestone_id))
          OR task.contract_milestone_id = m.contract_milestone_id
          OR EXISTS (
            SELECT 1 FROM progress_contract_milestones cm
            WHERE cm.team_id = m.team_id AND cm.contract_milestone_id = task.contract_milestone_id
              AND cm.job_milestone_id = m.job_milestone_id
          )
        )
      ) counts WHERE m.team_id = teams.team_id), '[]'::jsonb) AS "milestoneProgress"
    FROM workspace_teams teams
    ORDER BY teams.team_name, teams.team_id
  `.execute(db);
  return result.rows;
}
