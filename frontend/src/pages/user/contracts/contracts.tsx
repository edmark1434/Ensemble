// src/pages/user/contracts/contracts.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import {
  Shield,
  Briefcase,
  MicVocal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  User,
  FileText,
  Calendar,
  X,
  Check,
  Lock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";

export type ContractType = "Job" | "Gig";
export type ContractStatus = "Active" | "Waiting" | "Done" | "Cancelled";
export type MilestoneStatus = "Claimed" | "In Progress" | "Locked";

export interface MilestoneItem {
  id: number;
  name: string;
  revisions: number;
  deadline: string;
  credits: number;
  status: MilestoneStatus;
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
  addOnRate: string;
  freelancerTosTitle: string;
  freelancerTosContent: string;

  // Milestones
  milestones: MilestoneItem[];
}

const SAMPLE_DETAILED_CONTRACTS: DetailedContract[] = [
  {
    id: "CTR-8801",
    title: "YouTube Channel Intro Animation and Motion Graphics Design Package",
    contractType: "Job",
    clientName: "Edmark Talingting",
    freelancerName: "John Paul Mahilom",
    status: "Active",
    isArchived: false,
    dateCreated: "Jul 25, 2026",
    clientRange: "8,000 ~ 16,000",
    totalValueCredits: 12000,
    platformFeePercent: 20,
    jobDescription:
      "We are looking for a creative and detail-oriented Intermediate Video Editor to craft a beautiful, cinematic 10-minute wedding highlight reel. The goal is to capture the essence of the couple's special day, focusing on emotional peaks, atmosphere, and the 'Romantic Style' requested.\n\nKey Responsibilities:\n• Narrative Storytelling: Weave together ceremony, speeches, and candid moments into a cohesive 10-minute reel.",
    addOnRate: "15% per Milestone",
    freelancerTosTitle: "Standard Platform TOS",
    freelancerTosContent:
      "1. All deliverables remain property of the creator until final milestone payout.\n2. Source files delivered upon project completion.\n3. Communication conducted via platform inbox.\n4. Additional revisions outside milestone quotas billed at agreed additional work rate.",
    milestones: [
      { id: 1, name: "Rough Cut", revisions: 2, deadline: "12 Hours", credits: 4000, status: "Claimed" },
      { id: 2, name: "Creative Edits", revisions: 2, deadline: "12 Hours", credits: 4000, status: "In Progress" },
      { id: 3, name: "Final Polish", revisions: 2, deadline: "12 Hours", credits: 4000, status: "Locked" },
    ],
  },
  {
    id: "CTR-8742",
    title: "Cinematic Commercial Sound Design & FX Heavy Post-Production Pass",
    contractType: "Gig",
    clientName: "TechCraft Reviews",
    freelancerName: "John Paul Mahilom",
    status: "Waiting",
    isArchived: false,
    dateCreated: "Jul 28, 2026",
    dateStarted: "Jul 31, 2026 • 09:30 AM",
    clientRange: "5,000 ~ 10,000",
    totalValueCredits: 7500,
    platformFeePercent: 20,
    jobDescription:
      "Create high-energy custom audio transitions and cinematic sound effects for upcoming product launch trailers. All stems must be delivered in uncompressed WAV format with commercial distribution clearance.",
    addOnRate: "10% per Milestone",
    freelancerTosTitle: "Strict IP Transfer TOS",
    freelancerTosContent:
      "1. Full IP transfer granted immediately upon each milestone approval.\n2. Raw media and project files transferred after step sign-off.\n3. Non-disclosure agreement applies to all unreleased media.",
    milestones: [
      { id: 1, name: "Sound FX Draft Pass", revisions: 2, deadline: "24 Hours", credits: 3750, status: "Locked" },
      { id: 2, name: "Master Audio Mix", revisions: 2, deadline: "24 Hours", credits: 3750, status: "Locked" },
    ],
  },
  {
    id: "CTR-7900",
    title: "Social Media Promo Clips Batch #3",
    contractType: "Job",
    clientName: "Vanguard Fashion",
    freelancerName: "John Paul Mahilom",
    status: "Done",
    isArchived: true,
    dateCreated: "Jun 10, 2026",
    clientRange: "3,000 ~ 6,000",
    totalValueCredits: 5000,
    platformFeePercent: 20,
    jobDescription:
      "Editing 5 short vertical reel clips tailored for Instagram & TikTok. Includes subtitling, color grading, and royalty-free background music integration.",
    addOnRate: "20% per Milestone",
    freelancerTosTitle: "Standard Platform TOS",
    freelancerTosContent:
      "1. Deliverables provided in 1080x1920 MP4 format.\n2. Up to 2 rounds of minor revisions included.",
    milestones: [
      { id: 1, name: "Reels Rough Edits", revisions: 1, deadline: "12 Hours", credits: 2500, status: "Claimed" },
      { id: 2, name: "Final Subtitled Export", revisions: 1, deadline: "12 Hours", credits: 2500, status: "Claimed" },
    ],
  },
];

// ============================================================================
// SKELETON LOADER
// ============================================================================
const ContractsSkeletonLoader: React.FC = () => (
  <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-pulse font-['Plus_Jakarta_Sans']">
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-6 md:p-8">
      <div className="h-8 w-64 rounded-lg bg-gray-100 dark:bg-white/10" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
    </div>

    <div className="space-y-4">
      <div className="flex gap-6 border-b border-gray-200 dark:border-white/10 pb-2">
        <div className="h-8 w-32 rounded bg-gray-100 dark:bg-white/10" />
        <div className="h-8 w-36 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-5 flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-gray-100 dark:bg-white/10" />
              <div className="h-3 w-32 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
            </div>
            <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// HELPERS
// ============================================================================
function formatDateTimeWithRelative(dateString: string | undefined): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    const formattedDate = date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const now = new Date();
    const diffInSeconds = (date.getTime() - now.getTime()) / 1000;
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    let relative = "";
    const absDiff = Math.abs(diffInSeconds);
    
    if (absDiff < 60) relative = rtf.format(Math.round(diffInSeconds), 'second');
    else if (absDiff < 3600) relative = rtf.format(Math.round(diffInSeconds / 60), 'minute');
    else if (absDiff < 86400) relative = rtf.format(Math.round(diffInSeconds / 3600), 'hour');
    else relative = rtf.format(Math.round(diffInSeconds / 86400), 'day');

    return `${formattedDate} ${formattedTime} (${relative})`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const Contracts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [contracts, setContracts] = useState<DetailedContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<DetailedContract | null>(null);
  const { user } = useGlobalState();

  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get('/api/contracts');
        if (res.data.success) {
          const mappedContracts = res.data.data.map((c: any) => {
            const mappedMilestones = (c.milestones || []).filter(Boolean).map((m: any, idx: number, arr: any[]) => ({
              id: m.id,
              name: m.name,
              revisions: parseInt(m.revisions, 10) || 0,
              deadline: m.hours ? `${m.hours} Hours` : m.deadline ? new Date(m.deadline).toLocaleDateString() : 'N/A',
              credits: m.credits || Math.floor((parseFloat(c.rate_credits) || 0) / (arr.length || 1)),
              status: m.status === 'completed' || m.status === 'approved' ? "Claimed" : m.status === 'active' || m.status === 'submitted_for_review' ? "In Progress" : "Locked"
            }));

            const isCompleted = mappedMilestones.length > 0 && mappedMilestones.every((m: any) => m.status === 'Claimed');
            const derivedStatus = isCompleted ? 'Closed' : (c.status === 'Done' ? 'Closed' : c.status);

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
            addOnRate: c.additional_work_rate ? `+${c.additional_work_rate}% / Revision` : "N/A",
            freelancerTosTitle: c.terms_title || "Standard Terms",
            freelancerTosContent: c.terms_content || "Standard terms apply.",
            milestones: mappedMilestones
          };
          });
          
          const validStatuses = ["Active", "Waiting", "Closed"];
          const filteredContracts = mappedContracts.filter((c: DetailedContract) => validStatuses.includes(c.status));
          setContracts(filteredContracts);

          // Auto-select contract if ID in URL
          if (id) {
            const contract = mappedContracts.find((c: DetailedContract) => c.id === id);
            if (contract) {
              setSelectedContract(contract);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedContract(null);
        navigate('/contracts');
      }
    };
    if (selectedContract) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedContract]);

  const filteredContracts = contracts.filter((c) =>
    activeTab === "active" ? !c.isArchived : c.isArchived
  );  

  const getStatusBadge = (status: ContractStatus) => {
    let color = 'bg-zinc-500/10 text-gray-500 dark:text-zinc-400 border-zinc-500/20';
    if (status === 'Active') color = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    else if (status === 'Waiting') color = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    else if (status === 'Closed' || status === 'Done') color = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';

    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-white font-['Plus_Jakarta_Sans']">
      {/* Top Header */}
      <UserHeader pageTitle="My Contracts" credits={1250} />

      {loading ? (
        <ContractsSkeletonLoader />
      ) : (
        <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-sm dark:shadow-none p-6 md:p-8 backdrop-blur-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1
                  className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  My Contracts & Agreements
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                  Select any contract card to view its full formal agreement, escrow breakdown, and TOS terms.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-600 dark:text-zinc-300">
                <Shield className="h-4 w-4 text-blue-400" />
                <span>Protected by Ensemble Escrow & Platform Policy</span>
              </div>
            </div>
          </div>

          {/* Smooth Framer Motion Underline Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-white/10 flex gap-1 relative">
            <button
              onClick={() => setActiveTab("active")}
              className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === "active" ? "text-blue-400 font-bold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white"
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Active Contracts
                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.2 text-[10px] text-gray-600 dark:text-zinc-300">
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
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab("archived")}
              className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === "archived" ? "text-blue-400 font-bold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white"
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Archive className="h-4 w-4" /> Archived Contracts
                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.2 text-[10px] text-gray-600 dark:text-zinc-300">
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
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                </>
              )}
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
              {filteredContracts.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-12 text-center text-xs text-gray-500 dark:text-zinc-500">
                  No contracts found under this tab.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredContracts.map((contract) => {
                    const isWaiting = contract.status === "Waiting";
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
                          setSelectedContract(contract);
                          navigate(`/contracts/${contract.id}`);
                        }}
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 shadow-sm dark:shadow-none p-5 transition-all duration-300 hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-blue-500/5 ${
                          isArchived ? "opacity-40 grayscale-[50%] hover:opacity-100 hover:grayscale-0" : ""
                        }`}
                      >
                        {/* Main Card Header */}
                        <div className="flex items-start justify-between mb-4 gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight truncate group-hover:text-blue-400 transition-colors">
                                "{contract.title}"
                              </h3>
                              {contract.jobId && (
                                <a href={`/jobs/postings/${contract.jobId}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white transition-colors shrink-0" title="View Original Job Post">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider border border-gray-100 dark:border-white/5">
                              {contract.contractType}
                            </span>
                            {getStatusBadge(contract.status)}
                          </div>
                        </div>

                        {/* Credits Display */}
                        <div className="mb-4 flex items-center gap-1 text-xs font-extrabold text-yellow-500">
                          <span className="text-gray-500 dark:text-zinc-400 font-medium mr-1 uppercase text-[10px]">{isArchived ? "Claimed:" : "Agreed Bid:"}</span>
                          <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
                          <span>{contract.totalValueCredits.toLocaleString()} Credits</span>
                        </div>

                        {/* Contract Document Preview (Compressed) */}
                        <div className="mb-4 relative rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#080a12]/80 opacity-70 group-hover:opacity-100 transition-opacity overflow-hidden pointer-events-none mx-2 shadow-md dark:shadow-[0_2px_10px_rgba(0,0,0,0.5)]" style={{ transform: 'rotate(-1deg)' }}>
                          <div className="p-3 text-[7px] text-gray-500 dark:text-zinc-500 font-sans leading-[10px] h-[90px] overflow-hidden whitespace-pre-wrap">
                            <h4 className="font-bold text-[8px] border-b border-gray-200 dark:border-white/10 pb-1 mb-1 uppercase tracking-widest text-gray-500 dark:text-zinc-400">Contract Agreement</h4>
                            {contract.jobDescription || "No contract description provided."}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 dark:from-[#080a12] to-transparent" />
                        </div>

                        {/* Milestone Progress Bar Segmented */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                              Milestones Progress
                            </span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 font-bold">
                              {claimedCount}/{totalMilestones} Completed
                            </span>
                          </div>

                          <div className="flex gap-1.5 h-1.5 w-full">
                            {[...contract.milestones].sort((a, b) => {
                                const getVal = (s: string) => s === "Claimed" ? 2 : s === "In Progress" ? 1 : 0;
                                return getVal(b.status) - getVal(a.status);
                            }).map((m, idx) => {
                              let barColor = "bg-gray-100 dark:bg-white/10";
                              if (m.status === "Claimed") barColor = "bg-emerald-400";
                              else if (m.status === "In Progress") barColor = "bg-amber-400 animate-pulse";

                              return (
                                <div
                                  key={m.id}
                                  className={`flex-1 h-full rounded-full transition-all duration-300 ${barColor}`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center text-gray-600 dark:text-zinc-300 font-medium">
                              {(() => {
                                const isClient = user?.account_id === contract.clientAccountId;
                                const displayAvatar = isClient ? contract.freelancerAvatar : contract.clientAvatar;
                                const displayName = isClient ? contract.freelancerName : contract.clientName;
                                return (
                                  <>
                                    <img
                                      src={displayAvatar || "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                      alt="User avatar"
                                      className="h-5 w-5 rounded-full mr-2 object-cover border border-gray-300 dark:border-zinc-700"
                                    />
                                    <span>{displayName}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-[10px] opacity-70 text-right font-mono mt-1 sm:mt-0">
                            <div>
                              Start: <span className="font-bold text-emerald-400">{formatDateTimeWithRelative(contract.dateStarted || contract.dateCreated)}</span>
                            </div>
                            <div>
                              Due: <span className="font-bold text-rose-400">{contract.dueDate ? formatDateTimeWithRelative(contract.dueDate) : "N/A"}</span>
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

      {/* ============================================================================ */}
      {/* FULL CONTRACT POPUP MODAL (EXPANDED FORMAL VIEW) */}
      {/* ============================================================================ */}
      {selectedContract && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Plus_Jakarta_Sans']"
          onClick={() => {
            setSelectedContract(null);
            navigate('/contracts');
          }}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0a0d18] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-950/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-zinc-300">
                  Formal Contract Details
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedContract(null);
                  navigate('/contracts');
                }}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-1.5 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Formal Contract Body */}
            <div className="p-6 md:p-8 space-y-8 max-h-[78vh] overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0f1115]">
              {/* Header Title & Financial Summary */}
              <div className="text-center space-y-2 border-b border-gray-200 dark:border-zinc-800 pb-5">
                <div className="flex justify-center mb-2">
                  {getStatusBadge(selectedContract.status)}
                </div>
                
                <h2
                  className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 uppercase"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Contract Agreement
                </h2>
                
                <div className="flex flex-col items-center gap-1 pt-1 text-[11px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
                  <span>Contract Type: <strong className="text-gray-700 dark:text-zinc-200">{selectedContract.contractType}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500 dark:text-zinc-500" /> Date Created: <strong className="text-gray-700 dark:text-zinc-200">{selectedContract.dateCreated}</strong>
                  </span>
                  {selectedContract.status === "Waiting" && selectedContract.dateStarted && (
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300 font-bold mt-1">
                      <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-500" /> Starts In: {selectedContract.dateStarted}
                    </span>
                  )}
                </div>

                <div className="pt-4 max-w-sm mx-auto space-y-1 text-center">
                  <p className="text-xs font-semibold text-gray-600 dark:text-zinc-300 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                    Total Contract Value:
                    <span className="text-gray-900 dark:text-zinc-100 font-bold">
                      {selectedContract.totalValueCredits.toLocaleString()} Credits
                    </span>
                  </p>

                  <div className="text-[10px] space-y-1 pt-1.5 font-mono text-gray-500 dark:text-zinc-500 mx-auto">
                    <div className="flex justify-between items-center px-2 py-0.5">
                      <span className="uppercase">Client Range:</span>
                      <span className="text-gray-500 dark:text-zinc-400">{selectedContract.clientRange}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-0.5">
                      <span className="uppercase">Accepted Bid:</span>
                      <span className="text-gray-600 dark:text-zinc-300">{selectedContract.totalValueCredits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-0.5">
                      <span className="uppercase">Platform Fee ({selectedContract.platformFeePercent}%):</span>
                      <span className="text-gray-500 dark:text-zinc-400">- {Math.floor(selectedContract.totalValueCredits * 0.2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-gray-700 dark:text-zinc-200 border-t border-gray-200 dark:border-zinc-800 px-2 py-1.5 mt-1">
                      <span className="uppercase tracking-widest">Net Value:</span>
                      <span>{Math.floor(selectedContract.totalValueCredits * 0.8).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* I. PARTIES */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-900 dark:text-zinc-100">
                  I. Parties Involved
                </h3>
                <div className="overflow-hidden border-y border-gray-200 dark:border-zinc-800 bg-transparent text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800/50 px-3 py-2">
                    <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Client</span>
                    <span className="font-semibold text-gray-700 dark:text-zinc-200">{selectedContract.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Freelancer</span>
                    <span className="font-semibold text-gray-700 dark:text-zinc-200">{selectedContract.freelancerName}</span>
                  </div>
                </div>
              </div>

              {/* II. SCOPE OF WORK */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-900 dark:text-zinc-100">
                  II. Scope of Work
                </h3>
                <div className="overflow-hidden border-y border-gray-200 dark:border-zinc-800 bg-transparent text-xs font-mono">
                  <div className="px-3 py-3 border-b border-gray-200 dark:border-zinc-800/50 space-y-2">
                    <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider block">Job Post Title</span>
                    <p className="text-gray-700 dark:text-zinc-200 font-semibold leading-relaxed whitespace-pre-line text-xs font-sans">
                      "{selectedContract.title}"
                    </p>
                  </div>
                  <div className="px-3 py-3 border-b border-gray-200 dark:border-zinc-800/50 space-y-2">
                    <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider block">Job Description</span>
                    <p className="text-gray-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                      {selectedContract.jobDescription}
                    </p>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Add-On Work Rate</span>
                    <span className="font-semibold text-gray-600 dark:text-zinc-300">{selectedContract.addOnRate}</span>
                  </div>
                </div>
              </div>

              {/* III. LOCKED MILESTONES WITH CLAIMED INDICATORS */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-900 dark:text-zinc-100">
                  III. Milestones Schedule
                </h3>
                <div className="overflow-x-auto border-y border-gray-200 dark:border-zinc-800 bg-transparent">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-zinc-800/50 text-gray-500 dark:text-zinc-500">
                        <th className="px-3 py-2 text-center w-8 uppercase font-normal">#</th>
                        <th className="px-3 py-2 uppercase font-normal">Milestone Name</th>
                        <th className="px-3 py-2 text-center uppercase font-normal">Status</th>
                        <th className="px-3 py-2 text-center uppercase font-normal">Revs</th>
                        <th className="px-3 py-2 text-center uppercase font-normal">Deadline</th>
                        <th className="px-3 py-2 text-right uppercase font-normal">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30 text-gray-600 dark:text-zinc-300">
                      {selectedContract.milestones.map((m, index) => {
                        const isClaimed = m.status === "Claimed";
                        const isInProgress = m.status === "In Progress";

                        return (
                          <tr key={m.id} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="px-3 py-2 text-center text-gray-500 dark:text-zinc-500">{index + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-zinc-200">{m.name}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="uppercase tracking-widest text-[8px] text-gray-500 dark:text-zinc-400">
                                {m.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">{m.revisions}</td>
                            <td className="px-3 py-2 text-center">{m.deadline}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              <div className="flex items-center justify-end gap-1.5 text-gray-600 dark:text-zinc-300">
                                <CreditIcon className="h-2.5 w-2.5 opacity-50 grayscale" />
                                <span>{m.credits.toLocaleString()}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IV. TERMS OF SERVICE & ESCROW */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-900 dark:text-zinc-100">
                    IV. Agreed Terms of Service (TOS)
                  </h3>
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                    Preset: {selectedContract.freelancerTosTitle}
                  </span>
                </div>
                <div className="border-y border-gray-200 dark:border-zinc-800 bg-transparent p-4 text-xs font-mono text-gray-700 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                  {selectedContract.freelancerTosContent}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-[#0a0c10] px-6 py-4">
              <span className="text-xs text-gray-500 dark:text-zinc-500 hidden sm:block">
                Press ESC or click close to exit
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {selectedContract.status === 'Active' && (
                  user?.account_id === selectedContract.freelancerAccountId ? (
                    <button
                      onClick={() => navigate(`/dashboard/tasks/${selectedContract.id}`)}
                      className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      View Tasks
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/dashboard/review/${selectedContract.id}`)}
                      className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Review Updates
                    </button>
                  )
                )}
                <button
                  onClick={() => {
                    setSelectedContract(null);
                    navigate('/contracts');
                  }}
                  className="rounded-xl border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-white/10 px-4 py-2 text-xs font-semibold text-gray-900 dark:text-white transition hover:bg-white/20"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Close Contract View
                </button>
              </div>
            </div>
          </div>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default Contracts;