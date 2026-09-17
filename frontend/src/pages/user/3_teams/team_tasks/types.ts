export type TeamTaskMember = {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_path?: string;
  team_role?: string;
  role?: string;
  joined_at?: string;
};

export type TeamWorkspaceTask = {
  task_id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "in_review" | "overdue" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  starts_at?: string | null;
  due_at?: string | null;
  sort_order: number;
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  assignees: TeamTaskMember[];
};

export type TeamWorkspaceActivity = {
  activity_id: string;
  action: string;
  actor_account_id: string;
  actor_name: string;
  actor_handle: string;
  task_id?: string | null;
  task_title?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type TeamContractBudget = {
  contract_value: number;
  released_credits: number;
  distributed_credits: number;
  remaining_distributable_credits: number;
  team_available_balance: number;
  is_funded_and_released: boolean;
  contract_status: string;
};

export type TeamContractDistribution = {
  distribution_id: string;
  workspace_id: string;
  contract_id: string;
  amount_credits: number;
  created_at: string;
  distributor_account_id: string;
  distributor_name: string;
  distributor_handle: string;
  recipient_account_id: string;
  recipient_name: string;
  recipient_handle: string;
  recipient_avatar_path?: string;
};

export type TeamWorkspaceSnapshot = {
  workspace: {
    workspace_id: string;
    team_id: string;
    contract_id: string;
    project_lead_account_id?: string;
    created_at: string;
    updated_at: string;
  };
  contract: {
    contract_id: string;
    contract_type: string;
    contract_status: string;
    contract_value: number;
    listing_id: string;
    listing_title: string;
    listing_type: "job" | "gig";
    team_role: "client" | "freelancer";
    client_name: string;
    freelancer_name: string;
  };
  members: TeamTaskMember[];
  available_members: TeamTaskMember[];
  tasks: TeamWorkspaceTask[];
  activity: TeamWorkspaceActivity[];
  budget?: TeamContractBudget;
  distributions?: TeamContractDistribution[];
  is_project_lead?: boolean;
  project_lead?: {
    account_id: string;
    display_name: string;
    handle: string;
    avatar_path?: string | null;
  };
  permissions: {
    can_manage: boolean;
    can_create_tasks: boolean;
    can_manage_members: boolean;
    can_distribute?: boolean;
    can_assign_project_lead?: boolean;
  };
  current_account_id: string;
};

export type TeamTaskFormValues = {
  title: string;
  description: string;
  status: TeamWorkspaceTask["status"];
  priority: TeamWorkspaceTask["priority"];
  starts_at: string | null;
  due_at: string | null;
  assignee_account_ids: string[];
};
