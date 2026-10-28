import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  Sparkles, 
  Briefcase, 
  RotateCcw, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Star,
  User,
  ArrowRight
} from "lucide-react";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

interface ProfileHistoryProps {
  accountId?: string;
  isOwner?: boolean;
}

export interface HistoryItem {
  contract_id: string;
  contract_status: string;
  rate_credits: number;
  created_at: string;
  starts_at?: string | null;
  deadline_at?: string | null;
  contract_type: 'gig' | 'job' | 'contract';
  title: string;
  description?: string;
  source_id?: string;
  gig_id?: string | null;
  job_id?: string | null;
  tier_name?: string | null;
  is_gig_open?: boolean;
  account_role?: 'freelancer' | 'client' | 'collaborator';
  client_account_id?: string;
  client_name?: string;
  client_handle?: string;
  client_avatar?: string;
  freelancer_account_id?: string;
  freelancer_name?: string;
  freelancer_handle?: string;
  freelancer_avatar?: string;
  review_received?: { rating: number; feedback?: string } | null;
  is_viewer_client?: boolean;
  can_reorder?: boolean;
}

type HistoryFilter = "all" | "gig" | "job" | "completed";

const constructAvatarUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cloudfrontUrl) {
    return `${cloudfrontUrl}/${cleanPath}`;
  }
  return `/${cleanPath}`;
};

export const Profile_History: React.FC<ProfileHistoryProps> = ({ accountId, isOwner = false }) => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");

  const currentAccountId = accountId || user?.account_id;

  useEffect(() => {
    if (!currentAccountId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/accounts/profile/${currentAccountId}/history`);
        if (response.data.success) {
          setHistory(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load profile history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentAccountId]);

  const gigCount = history.filter((h) => h.contract_type === "gig").length;
  const jobCount = history.filter((h) => h.contract_type === "job").length;
  const completedCount = history.filter(
    (h) => h.contract_status?.toLowerCase() === "completed"
  ).length;

  const filteredHistory = history.filter((item) => {
    if (activeFilter === "gig") return item.contract_type === "gig";
    if (activeFilter === "job") return item.contract_type === "job";
    if (activeFilter === "completed")
      return item.contract_status?.toLowerCase() === "completed";
    return true;
  });

  const handleNavigateToSource = (item: HistoryItem) => {
    if (item.contract_type === "gig" && item.gig_id) {
      navigate(`/gigs/services/${item.gig_id}/page`);
    } else if (item.contract_type === "job" && item.job_id) {
      navigate(`/jobs/${item.job_id}/page`);
    }
  };

  const handleReorderGig = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    if (item.gig_id) {
      navigate(`/gigs/services/${item.gig_id}/order`);
    }
  };

  return (
    <div className="flex-1 space-y-4 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10 gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {isOwner ? "My Timeline Ledger" : "Timeline Ledger"}
            <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">
              ({history.length})
            </span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Chronological ledger of completed contracts, gig deliverables, and job milestones.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
            }`}
          >
            <span>All</span>
            <span className={`ml-1 font-mono text-[10px] ${activeFilter === "all" ? "opacity-80" : "text-gray-400 dark:text-zinc-500"}`}>
              ({history.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("gig")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "gig"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
            }`}
          >
            <span>Gigs</span>
            <span className={`ml-1 font-mono text-[10px] ${activeFilter === "gig" ? "opacity-80" : "text-gray-400 dark:text-zinc-500"}`}>
              ({gigCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("job")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "job"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
            }`}
          >
            <span>Jobs</span>
            <span className={`ml-1 font-mono text-[10px] ${activeFilter === "job" ? "opacity-80" : "text-gray-400 dark:text-zinc-500"}`}>
              ({jobCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "completed"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
            }`}
          >
            <span>Completed</span>
            <span className={`ml-1 font-mono text-[10px] ${activeFilter === "completed" ? "opacity-80" : "text-gray-400 dark:text-zinc-500"}`}>
              ({completedCount})
            </span>
          </button>
        </div>
      </div>

      {/* History Ledger List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-xs text-gray-500 dark:text-zinc-400">Loading ledger records...</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
          <Clock className="h-8 w-8 text-gray-400 dark:text-zinc-600 mb-2 opacity-50" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
            Transactional Timeline Ledger
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
            {isOwner
              ? "Your completed workload sequences and smart contracts will appear here chronologically upon payment closure."
              : "No completed workload sequences or transactional history indexed for this account yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const isClientViewer = 
              (user?.account_id && item.client_account_id === user.account_id) || 
              (isOwner && item.account_role === "client") || 
              Boolean(item.is_viewer_client);

            const isGig = item.contract_type === "gig";
            const isJob = item.contract_type === "job";
            const canReorder = Boolean(isGig && item.is_gig_open && isClientViewer && item.gig_id);

            // Counterparty info: if profile user was freelancer, show client, and vice versa
            const counterpartyName = item.account_role === "client" ? item.freelancer_name : item.client_name;
            const counterpartyHandle = item.account_role === "client" ? item.freelancer_handle : item.client_handle;
            const counterpartyAvatar = item.account_role === "client" ? item.freelancer_avatar : item.client_avatar;
            const counterpartyRoleLabel = item.account_role === "client" ? "Freelancer" : "Client";
            const avatarUrl = constructAvatarUrl(counterpartyAvatar);

            const isCompleted = item.contract_status?.toLowerCase() === "completed";

            return (
              <div
                key={item.contract_id}
                onClick={() => handleNavigateToSource(item)}
                className="group relative p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs hover:shadow-xs cursor-pointer"
              >
                {/* Left Block: Types, Title, Counterparty */}
                <div className="space-y-2 flex-1 min-w-0 pr-2">
                  {/* Indicators Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isGig ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                        <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        Gig Service
                      </span>
                    ) : isJob ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <Briefcase className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Job Post
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 shrink-0">
                        Contract
                      </span>
                    )}

                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shrink-0 capitalize">
                        {item.contract_status?.replace(/[_-]+/g, " ") || "In Progress"}
                      </span>
                    )}

                    {/* Tier badge if gig */}
                    {item.tier_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10 shrink-0">
                        {item.tier_name}
                      </span>
                    )}

                    {/* Service status indicator if gig */}
                    {isGig && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          item.is_gig_open
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                            : "text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-white/5"
                        }`}
                      >
                        {item.is_gig_open ? "• Service Open" : "• Service Closed"}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {item.title}
                    </h5>
                    {item.description && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row: Counterparty + Date */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {counterpartyName && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                          {counterpartyRoleLabel}:
                        </span>
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-elevated shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-500">
                              {counterpartyName[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-zinc-300">
                          {counterpartyName}
                        </span>
                      </div>
                    )}

                    <span className="text-gray-300 dark:text-zinc-700">•</span>

                    <span className="text-[11px]">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>

                    {/* Star review received */}
                    {item.review_received?.rating && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          {item.review_received.rating}.0
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Block: Financials & Action Buttons */}
                <div className="flex sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center gap-3 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-white/5">
                  {/* Escrow Value */}
                  <div className="text-right">
                    <span className="text-xs font-black text-gray-900 dark:text-white font-mono block">
                      {Number(item.rate_credits || 0).toLocaleString()} Credits
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      Settled Value
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {canReorder && (
                      <button
                        type="button"
                        onClick={(e) => handleReorderGig(e, item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition shadow-xs cursor-pointer"
                        title="Re-order this gig service"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Order</span>
                      </button>
                    )}

                    {isJob && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToSource(item);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition cursor-pointer"
                      >
                        <span>View Job</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </button>
                    )}

                    {isGig && !canReorder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToSource(item);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition cursor-pointer"
                      >
                        <span>View Service</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
