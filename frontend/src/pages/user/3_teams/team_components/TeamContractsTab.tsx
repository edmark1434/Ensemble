import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Users,
  ArrowUpRight,
  Clock,
  Layers,
  Coins,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { showErrorToast } from "@/components/utility/toast";

interface WorkspaceCard {
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
}

interface TeamContractsTabProps {
  teamId: string;
  teamAccountId: string;
  canViewProposals?: boolean;
}

export const TeamContractsTab: React.FC<TeamContractsTabProps> = ({
  teamId,
  teamAccountId,
  canViewProposals = true,
}) => {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<"contracts" | "proposals">("contracts");
  const [workspaces, setWorkspaces] = useState<WorkspaceCard[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wsRes, jobRes, gigRes] = await Promise.allSettled([
        api.get(`/api/teams/${teamId}/task-workspaces`),
        canViewProposals ? api.get("/api/jobs/proposals/sent") : Promise.resolve({ data: { data: [] } }),
        canViewProposals ? api.get("/api/gigs/orders/sent") : Promise.resolve({ data: { data: [] } }),
      ]);

      if (wsRes.status === "fulfilled") {
        setWorkspaces(wsRes.value.data.data?.workspaces || []);
      }

      const teamProposals: any[] = [];
      if (jobRes.status === "fulfilled") {
        const jobs = (jobRes.value.data.data || [])
          .filter((p: any) => String(p.freelancer_account_id) === teamAccountId)
          .map((p: any) => ({
            id: p.proposal_id,
            title: p.job_title || "Untitled Job",
            type: "Job Proposal",
            counterparty: p.client_name || p.client_handle || "Client",
            status: p.status || "Pending",
            amount: Number(p.rate_credits || 0),
            created_at: p.created_at,
            path: `/jobs/proposals/sent/${p.proposal_id}`,
          }));
        teamProposals.push(...jobs);
      }

      if (gigRes.status === "fulfilled") {
        const gigs = (gigRes.value.data.data || [])
          .filter((o: any) => String(o.client_account_id) === teamAccountId)
          .map((o: any) => ({
            id: o.id,
            title: o.gig_title || "Untitled Gig Order",
            type: "Gig Order",
            counterparty: o.freelancer_name || o.freelancer_handle || "Freelancer",
            status: o.status || "Pending",
            amount: Number(o.amount_credits || 0),
            created_at: o.created_at,
            path: `/gigs/orders/sent/${o.id}`,
          }));
        teamProposals.push(...gigs);
      }

      setProposals(teamProposals);
    } catch (err: unknown) {
      console.error("Failed to load contracts data:", err);
      showErrorToast("Unable to load team contracts");
    } finally {
      setLoading(false);
    }
  }, [teamId, teamAccountId, canViewProposals]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      !searchQuery.trim() ||
      w.listing_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.freelancer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProposals = proposals.filter(
    (p) =>
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.counterparty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Subtab Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("contracts")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "contracts"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Active Contracts ({workspaces.length})
          </button>

          {canViewProposals && (
            <button
              onClick={() => setSubTab("proposals")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === "proposals"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              Proposals & Orders ({proposals.length})
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 animate-pulse space-y-3"
            >
              <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : subTab === "contracts" ? (
        filteredWorkspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] p-12 text-center space-y-2">
            <BriefcaseBusiness className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              No active team contracts
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
              When your team secures job contracts or gig orders, contract workspaces and milestone agreements will display here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWorkspaces.map((card) => {
              const otherParty =
                card.team_role === "client" ? card.freelancer_name : card.client_name;
              return (
                <div
                  key={card.contract_id}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          {card.listing_type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                          {card.contract_status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5 leading-snug">
                        {card.listing_title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {card.team_role === "client" ? "Freelancer" : "Client"}: {otherParty}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-black text-gray-900 dark:text-white">
                        {card.contract_value.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 block">credits</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {card.completed_tasks}/{card.total_tasks} Tasks
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>{card.workspace_member_count} Members</span>
                      </span>
                    </div>

                    {card.can_open && (
                      <button
                        onClick={() => navigate(`/teams/${teamId}/tasks/${card.contract_id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Workspace</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] p-12 text-center space-y-2">
          <FileText className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            No proposals or orders found
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
            Proposals submitted by this team on the job market and outgoing gig orders will show here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(p.path)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface hover:border-blue-500/40 hover:shadow-xs transition cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                    {p.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {p.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-1 truncate">
                  {p.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Target: {p.counterparty} · Submitted {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                  {p.amount.toLocaleString()} cr
                </span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
