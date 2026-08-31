import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, LayoutDashboard, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import { showErrorToast } from "@/components/utility/toast";

type WorkspaceCard = {
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
  workspace_id?: string | null;
  total_tasks: number;
  completed_tasks: number;
  next_due_at?: string | null;
  workspace_member_count: number;
  can_open: boolean;
  can_manage: boolean;
};

export default function TeamTaskDashboard({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkspaceCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading = true) => {
    if (!teamId) return;
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/api/teams/${teamId}/task-workspaces`);
      setItems(response.data?.data?.items || []);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || "Unable to load Team task dashboard");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdate = (event: { team_id?: string }) => {
      if (String(event?.team_id || "") === teamId) void load(false);
    };
    socket.on("teamTaskWorkspaceUpdated", onUpdate);
    return () => {
      socket.off("teamTaskWorkspaceUpdated", onUpdate);
    };
  }, [load, teamId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />)}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-white/10">
        <LayoutDashboard className="mx-auto h-10 w-10 text-gray-400 dark:text-zinc-600" />
        <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">No ongoing Team work</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Accepted job and gig contracts owned by this Team will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Task Dashboard</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Manage internal work for this Team&apos;s active contracts.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const progress = item.total_tasks ? Math.round((item.completed_tasks / item.total_tasks) * 100) : 0;
          return (
            <button
              key={item.contract_id}
              type="button"
              disabled={!item.can_open}
              onClick={() => navigate(`/teams/${teamId}/tasks/${item.contract_id}`)}
              className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {item.listing_type} · {item.team_role}
                </span>
              </div>
              <h4 className="mt-4 line-clamp-2 min-h-12 text-base font-semibold text-gray-900 dark:text-white">{item.listing_title}</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Contract {item.contract_status}</p>
              <div className="mt-5 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                <span>{item.completed_tasks}/{item.total_tasks} tasks</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{item.workspace_member_count} members</span>
                {item.next_due_at ? (
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.next_due_at).toLocaleDateString()}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />No due date</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-end text-xs font-medium text-blue-400">
                {item.can_open ? (item.workspace_id ? "Open workspace" : "Create workspace") : "Ask an Owner or Admin to add you"}
                {item.can_open && <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
