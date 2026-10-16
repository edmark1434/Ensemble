import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import UserHeader from "@/components/nav/user_header";
import {
  Shield,
  ScrollText,
  Archive,
  AlertCircle,
  ExternalLink,
  ListTodo,
  CheckCircle2,
  Users,
  Briefcase,
  Sparkles,
  ArrowRight,
  Check,
  Calendar,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { ContractsTerminologyGuide } from "./ContractsTerminologyGuide";

export type ContractType = "Job" | "Gig";
export type ContractStatus = "Active" | "Waiting" | "Done" | "Cancelled" | "Closed";
export type MilestoneStatus = "Claimed" | "In Progress" | "Locked" | "Overdue" | "Stalled" | "Abandoned" | "Under Review" | "Cancelled";

export interface CancellationRequest {
  request_id: string;
  contract_id: string;
  initiator_account_id?: string;
  recipient_account_id?: string;
  initiated_by?: string;
  initiator_role: 'client' | 'freelancer';
  initiator_name?: string;
  reason: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'auto_cancelled';
  auto_cancel_at: string;
  response_message: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneItem {
  id: string;
  name: string;
  revisions: number;
  deadline: string;
  deadline_at?: string;
  credits: number;
  status: MilestoneStatus;
  rawStatus?: string;
}

export interface DetailedContract {
  id: string;
  title: string;
  contractType: ContractType;
  clientName: string;
  freelancerName: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  clientAvatar?: string;
  freelancerAvatar?: string;
  status: ContractStatus;
  isArchived: boolean;
  jobId?: string;

  // Dates
  dateCreated: string;
  dateStarted?: string;
  dueDate?: string;

  // Financial breakdown
  clientRange: string;
  totalValueCredits: number;
  platformFeePercent: number;

  // Scope & TOS
  jobDescription: string;
  jobHiringType?: string;
  targetMilestoneTitle?: string;
  targetMilestoneDescription?: string;
  targetMilestoneTasks?: string[];
  jobAllMilestones?: any[];
  addOnRate: string;
  freelancerTosTitle: string;
  freelancerTosContent: string;

  // Workflow terms & conditions
  initiatorRole?: string;
  isExistingProject?: boolean;
  existingProjectId?: string;
  requireNDA?: boolean;
  portfolioUseAllowed?: boolean;
  portfolioDuration?: number;

  // Milestones
  milestones: MilestoneItem[];
}

// ============================================================================
// SKELETON LOADER
// ============================================================================
const ContractsSkeletonLoader: React.FC = () => (
  <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-pulse font-['Plus_Jakarta_Sans']">
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs p-6 md:p-8">
      <div className="h-8 w-64 rounded-lg bg-zinc-200 dark:bg-white/10" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-zinc-100 dark:bg-white/5" />
    </div>

    <div className="space-y-4">
      <div className="flex gap-6 border-b border-zinc-200 dark:border-white/10 pb-2">
        <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-white/10" />
        <div className="h-8 w-36 rounded bg-zinc-100 dark:bg-white/5" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 w-full rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs p-6 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-white/10" />
              <div className="h-6 w-3/4 rounded bg-zinc-200 dark:bg-white/10" />
            </div>
            <div className="h-16 w-full rounded-xl bg-zinc-100 dark:bg-white/5" />
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-8 w-full rounded-lg bg-zinc-100 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// HELPERS
// ============================================================================
function formatMilestoneDeadline(m: any): string {
  if (m.deadline_at) {
    const d = new Date(m.deadline_at);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
  if (m.hours) return `${m.hours} Hours`;
  const hrs = Number(m.deadline);
  if (!isNaN(hrs) && hrs <= 0) return 'Flexible';
  if (!isNaN(hrs) && hrs > 0 && hrs < 100000) {
    if (m.started_at) {
      const st = new Date(m.started_at);
      if (!isNaN(st.getTime())) {
        return new Date(st.getTime() + hrs * 3600000).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }
    if (hrs >= 24 && hrs % 24 === 0) {
      return `${hrs / 24} Day${hrs / 24 > 1 ? 's' : ''} (${hrs} hrs)`;
    }
    return `${hrs} Hours`;
  }
  if (typeof m.deadline === 'string' && m.deadline.includes('-')) {
    const d = new Date(m.deadline);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
      return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
  return m.deadline ? String(m.deadline) : 'N/A';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const Contracts: React.FC = () => { 
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "guide">("active");
  const [contracts, setContracts] = useState<DetailedContract[]>([]);

  const mapBackendContracts = useCallback((data: any[]): DetailedContract[] => {
    return data.map((c: any) => {
      const mappedMilestones = (c.milestones || []).filter(Boolean).map((m: any, _idx: number, arr: any[]) => {
        const rawStatus: string = (m.status || '').toLowerCase();
        let uiStatus: MilestoneStatus = 'Locked';
        if (['completed', 'approved', 'auto_approved'].includes(rawStatus)) uiStatus = 'Claimed';
        else if (rawStatus === 'active') uiStatus = 'In Progress';
        else if (['under_review', 'revision_requested'].includes(rawStatus)) uiStatus = 'Under Review';
        else if (rawStatus === 'overdue') uiStatus = 'Overdue';
        else if (rawStatus === 'stalled') uiStatus = 'Stalled';
        else if (rawStatus === 'abandoned') uiStatus = 'Abandoned';
        else if (rawStatus === 'cancelled') uiStatus = 'Cancelled';
        return {
          id: m.id,
          name: m.name,
          revisions: parseInt(m.revisions, 10) || 0,
          deadline: formatMilestoneDeadline(m),
          deadline_at: m.deadline_at,
          credits: m.credits || Math.floor((parseFloat(c.rate_credits) || 0) / (arr.length || 1)),
          status: uiStatus,
          rawStatus,
        };
      });

      const allMilestonesDone = mappedMilestones.length > 0 && mappedMilestones.every((m: any) => m.status === 'Claimed');
      
      let derivedStatus = c.status;
      if (derivedStatus === 'Completed') {
        derivedStatus = 'Closed';
      } else if (allMilestonesDone) {
        if (c.client_rating && c.freelancer_rating) {
          derivedStatus = 'Closed';
        } else {
          derivedStatus = 'Done';
        }
      }

      return {
        id: c.contract_id,
        title: c.job_title || c.contract_type,
        contractType: c.contract_type === 'job' ? 'Job' : 'Gig',
        clientName: c.client_name || c.client_handle,
        freelancerName: c.freelancer_name || c.freelancer_handle,
        clientAccountId: c.client_account_id,
        freelancerAccountId: c.freelancer_account_id,
        clientAvatar: c.client_avatar 
          ? `${import.meta.env.VITE_CLOUDFRONT_URL}${c.client_avatar.startsWith('/') ? '' : '/'}${c.client_avatar}` 
          : undefined,
        freelancerAvatar: c.freelancer_avatar
          ? `${import.meta.env.VITE_CLOUDFRONT_URL}${c.freelancer_avatar.startsWith('/') ? '' : '/'}${c.freelancer_avatar}` 
          : undefined,
        status: derivedStatus,
        isArchived: derivedStatus === 'Closed' || derivedStatus === 'Cancelled',
        jobId: c.job_id,
        dateCreated: c.created_at,
        dateStarted: c.starts_at || undefined,
        dueDate: c.job_deadline || undefined,
        clientRange: (c.rate_credits_min && c.rate_credits_max) 
          ? `${parseFloat(c.rate_credits_min).toLocaleString()} ~ ${parseFloat(c.rate_credits_max).toLocaleString()}` 
          : "Fixed Price",
        totalValueCredits: parseFloat(c.rate_credits) || 0,
        platformFeePercent: 10,
        jobDescription: c.job_description || "No description provided.",
        jobHiringType: c.job_hiring_type || (c.contract_type === 'gig' ? 'gig' : 'single'),
        targetMilestoneTitle: c.target_milestone_title,
        targetMilestoneDescription: c.target_milestone_description,
        targetMilestoneTasks: Array.isArray(c.target_milestone_tasks)
          ? c.target_milestone_tasks
          : (typeof c.target_milestone_tasks === 'string' ? JSON.parse(c.target_milestone_tasks || '[]') : []),
        jobAllMilestones: c.job_all_milestones || [],
        addOnRate: (() => {
          const raw = c.additional_work_rate !== null && c.additional_work_rate !== undefined
            ? Number(c.additional_work_rate)
            : (c.revision_price_credits !== null && c.revision_price_credits !== undefined ? Number(c.revision_price_credits) : null);
          if (raw !== null && !isNaN(raw)) {
            return raw > 0 ? `${raw.toLocaleString()} Credits / Revision` : "0 Credits (Free Revisions)";
          }
          return "Standard Platform Policy";
        })(),
        freelancerTosTitle: c.terms_title || "Standard Terms",
        freelancerTosContent: c.terms_content || "Standard platform terms and milestone fulfillment policies apply to this agreement. All deliverables will be provided in accordance with agreed milestone specifications and quality standards.",
        initiatorRole: (c.initiator_role === 'client' || c.initiator_role === 'Client') ? 'Client' : 'Freelancer',
        isExistingProject: Boolean(c.is_existing_project),
        existingProjectId: c.existing_project_id || undefined,
        requireNDA: Boolean(c.require_nda),
        portfolioUseAllowed: Boolean(c.portfolio_use_allowed),
        portfolioDuration: c.portfolio_use_duration_seconds || 60,
        milestones: mappedMilestones
      };
    });
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await api.get('/api/contracts');
      if (res.data?.success) {
        const mapped = mapBackendContracts(res.data.data);
        const validStatuses = ["Active", "Waiting", "Done", "Closed", "Cancelled"];
        const filtered = mapped.filter((c: DetailedContract) => validStatuses.includes(c.status));
        setContracts(filtered);
        return mapped;
      }
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    } finally {
      setLoading(false);
    }
    return [];
  }, [mapBackendContracts]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Realtime updates via Socket.IO
  useEffect(() => {
    const handleUpdate = () => {
      fetchContracts();
    };

    socket.on('cancellation_request_updated', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('cancellation_request_updated', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, [fetchContracts]);

  const filteredContracts = contracts.filter((c) =>
    activeTab === "active" ? !c.isArchived : c.isArchived
  );  

  const getStatusBadge = (status: ContractStatus) => {
    let color = 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700';
    let dotColor = 'bg-zinc-500';
    if (status === 'Active') {
      color = 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
      dotColor = 'bg-emerald-600 animate-pulse';
    } else if (status === 'Waiting') {
      color = 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800';
      dotColor = 'bg-sky-600';
    } else if (status === 'Closed' || status === 'Done') {
      color = 'bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-800';
      dotColor = 'bg-violet-600';
    } else if (status === 'Cancelled') {
      color = 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs uppercase font-bold px-2.5 py-1 rounded-full border shadow-2xs ${color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-zinc-900 dark:text-white font-['Plus_Jakarta_Sans'] pb-16">
      {/* Top Header */}
      <UserHeader pageTitle="My Contracts" />
      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="contracts" />}

      {loading ? (
        <ContractsSkeletonLoader />
      ) : (
        <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface/60 shadow-xs p-6 md:p-8 backdrop-blur-xl">
            <div className="relative z-10 space-y-3">
              <div>
                <h1
                  className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white md:text-3xl"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  My Contracts & Agreements
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Select any contract card to open its formal agreement, milestone tracker, and escrow ledger.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-100/80 dark:bg-white/5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                <Shield className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                <span>Protected by Ensemble Escrow & Platform Policy</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-zinc-200 dark:border-white/10 flex justify-between items-end relative">
            <div className="flex gap-1 relative">
              <button
                onClick={() => setActiveTab("active")}
                className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeTab === "active" ? "text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-t-lg"
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <ScrollText className="h-4 w-4" /> Active Contracts
                  <span className="rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-transparent px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                    {contracts.filter((c) => !c.isArchived).length}
                  </span>
                </span>

                {activeTab === "active" && (
                  <>
                    <motion.div
                      layoutId="activeContractTabGlow"
                      className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    <motion.div
                      layoutId="activeContractTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-500 z-10"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveTab("archived")}
                className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeTab === "archived" ? "text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-t-lg"
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Archive className="h-4 w-4" /> Archived Contracts
                  <span className="rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-transparent px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                    {contracts.filter((c) => c.isArchived).length}
                  </span>
                </span>

                {activeTab === "archived" && (
                  <>
                    <motion.div
                      layoutId="activeContractTabGlow"
                      className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    <motion.div
                      layoutId="activeContractTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-500 z-10"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveTab("guide")}
                className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeTab === "guide" ? "text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-t-lg"
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Contract Terms & Guide
                </span>

                {activeTab === "guide" && (
                  <>
                    <motion.div
                      layoutId="activeContractTabGlow"
                      className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    <motion.div
                      layoutId="activeContractTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-500 z-10"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => navigate('/contracts/dispute-form')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors mb-2 mr-2 md:mr-0 shadow-2xs"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Report a Dispute
            </button>
          </div>

          {/* Animated Tab Switch Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {activeTab === "guide" ? (
                <ContractsTerminologyGuide />
              ) : filteredContracts.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-12 text-center text-xs text-zinc-500 dark:text-zinc-400 shadow-xs">
                  No contracts found under this tab.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {filteredContracts.map((contract) => {
                    const isArchived = contract.isArchived;
                    const claimedCount = contract.milestones.filter(
                      (m) => m.status === "Claimed"
                    ).length;
                    const totalMilestones = contract.milestones.length;

                    return (
                      <motion.div
                        key={contract.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => {
                          navigate(`/contracts/${contract.id}`);
                        }}
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/40 shadow-xs transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/5 ${
                          isArchived ? "opacity-60 grayscale-[30%] hover:opacity-100 hover:grayscale-0" : ""
                        }`}
                      >
                        {/* Top accent bar */}
                        <div className={`h-1.5 w-full ${
                          contract.status === 'Active' ? 'bg-emerald-500' : 
                          contract.status === 'Waiting' ? 'bg-sky-500' : 
                          contract.status === 'Done' ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`} />

                        <div className="p-6 space-y-4">
                          {/* Card Header: Type, Role, Status */}
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-2xs ${
                                contract.contractType === 'Job'
                                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700'
                                  : 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800'
                              }`}>
                                {contract.contractType === 'Job' ? (
                                  <Briefcase className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                )}
                                {contract.contractType} Contract
                              </span>

                              {(() => {
                                const isClient = user?.account_id === contract.clientAccountId;
                                return (
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-2xs ${
                                    isClient 
                                      ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800' 
                                      : 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800'
                                  }`}>
                                    {isClient ? 'Client' : 'Freelancer'}
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(contract.status)}
                              {contract.jobId && (
                                <a
                                  href={`/jobs/postings/${contract.jobId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                                  title="View Original Job Post"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <h3 className="font-extrabold text-zinc-900 dark:text-white text-lg tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                              {contract.title}
                            </h3>
                          </div>

                          {/* Stats Grid: Value, Milestones, Deadline */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50/90 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Escrow Value</span>
                              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-amber-400 font-extrabold text-sm">
                                <CreditIcon className="h-4 w-4 text-amber-500 shrink-0" />
                                <span>{contract.totalValueCredits.toLocaleString()}</span>
                                <span className="text-zinc-500 font-medium text-[11px]">Credits</span>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Milestones</span>
                              <div className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                                {totalMilestones} {totalMilestones === 1 ? 'Phase' : 'Phases'}
                              </div>
                            </div>
                            <div className="space-y-0.5 col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Deadline</span>
                              <div className="text-xs font-bold truncate">
                                {contract.dueDate ? (
                                  <span className="text-rose-700 dark:text-rose-400 font-bold">Due {new Date(contract.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                ) : (
                                  <span className="text-zinc-700 dark:text-zinc-300">Flexible Delivery</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Assigned Milestone Tag (Moved above Milestone Progress, neutral gray) */}
                          {contract.targetMilestoneTitle && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100/90 text-zinc-700 dark:bg-white/5 dark:text-zinc-300 border border-zinc-200/90 dark:border-white/10 px-2.5 py-1 text-xs font-medium">
                              <Users className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                              <span>Assigned Milestone: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{contract.targetMilestoneTitle}</strong></span>
                            </div>
                          )}

                          {/* Milestone Progress Section */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                Milestone Progress
                              </span>
                              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                                {claimedCount}/{totalMilestones} Approved ({totalMilestones > 0 ? Math.round((claimedCount / totalMilestones) * 100) : 0}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/80 dark:border-white/10 overflow-hidden relative shadow-2xs">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  claimedCount === totalMilestones && totalMilestones > 0
                                    ? 'bg-emerald-600'
                                    : contract.status === 'Active'
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{
                                  width: `${totalMilestones > 0 ? (claimedCount / totalMilestones) * 100 : 0}%`
                                }}
                              />
                            </div>
                            {totalMilestones > 1 && (
                              <div className="flex gap-1.5 pt-0.5">
                                {contract.milestones.map((m) => (
                                  <div
                                    key={m.id}
                                    title={`${m.name}: ${m.status}`}
                                    className={`h-1.5 flex-1 rounded-full transition-all ${
                                      m.status === "Claimed"
                                        ? "bg-emerald-500"
                                        : m.status === "In Progress"
                                        ? "bg-blue-500 animate-pulse"
                                        : "bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60 dark:border-white/5"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Assigned Tasks / Deliverables Checklist */}
                          {contract.targetMilestoneTasks && contract.targetMilestoneTasks.length > 0 && (
                            <div className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02] p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                  <ListTodo className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  Role Deliverables
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {contract.targetMilestoneTasks.length}
                                  </span>
                                </span>
                                <span className="text-[11px] font-semibold">
                                  {claimedCount === totalMilestones ? (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Completed
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600 dark:text-zinc-300">Checklist</span>
                                  )}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {contract.targetMilestoneTasks.slice(0, 3).map((task, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 shadow-2xs font-medium"
                                  >
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 border ${
                                      claimedCount === totalMilestones 
                                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-600' 
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-600'
                                    }`}>
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                    <span className="truncate flex-1">{task}</span>
                                  </div>
                                ))}
                                {contract.targetMilestoneTasks.length > 3 && (
                                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">
                                    + {contract.targetMilestoneTasks.length - 3} more deliverables
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Footer: Avatar + Action CTA */}
                          <div className="pt-3.5 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {(() => {
                                const isClient = user?.account_id === contract.clientAccountId;
                                const displayAvatar = isClient ? contract.freelancerAvatar : contract.clientAvatar;
                                const displayName = isClient ? contract.freelancerName : contract.clientName;
                                const roleLabel = isClient ? 'Specialist / Freelancer' : 'Principal / Client';
                                const avatarUrl = constructAvatarUrl(displayAvatar, displayName);
                                return (
                                  <>
                                    <img
                                      src={avatarUrl}
                                      alt={displayName}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(displayName);
                                      }}
                                      className="h-8 w-8 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 shrink-0 shadow-2xs"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
                                      <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{roleLabel}</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                              <span>View Details</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Contracts;