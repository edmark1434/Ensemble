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
  CircleDollarSign,
  FileText,
  Calendar,
  X,
  Check,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  status: ContractStatus;
  isArchived: boolean;

  // Dates
  dateCreated: string;
  dateStarted?: string;

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="h-8 w-64 rounded-lg bg-white/10" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-white/5" />
    </div>

    <div className="space-y-4">
      <div className="flex gap-6 border-b border-white/10 pb-2">
        <div className="h-8 w-32 rounded bg-white/10" />
        <div className="h-8 w-36 rounded bg-white/5" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 w-full rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-white/10" />
              <div className="h-3 w-32 rounded bg-white/5" />
            </div>
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const Contracts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [contracts, setContracts] = useState<DetailedContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<DetailedContract | null>(null);

  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get('/api/contracts');
        if (res.data.success) {
          const mappedContracts = res.data.data.map((c: any) => ({
            id: c.contract_id,
            title: c.job_title || c.contract_type,
            contractType: c.contract_type === 'job' ? 'Job' : 'Gig',
            clientName: c.client_name || c.client_handle,
            freelancerName: c.freelancer_name || c.freelancer_handle,
            status: c.status,
            isArchived: c.status === 'Done' || c.status === 'Cancelled',
            dateCreated: new Date(c.created_at).toLocaleDateString(),
            dateStarted: c.starts_at ? new Date(c.starts_at).toLocaleDateString() : undefined,
            clientRange: "Fixed Price",
            totalValueCredits: parseFloat(c.rate_credits) || 0,
            platformFeePercent: 10,
            jobDescription: c.job_description || "No description provided.",
            addOnRate: c.additional_work_rate ? `+${c.additional_work_rate}% / Revision` : "N/A",
            freelancerTosTitle: c.terms_title || "Standard Terms",
            freelancerTosContent: c.terms_content || "Standard terms apply.",
            milestones: (c.milestones || []).filter(Boolean).map((m: any) => ({
              id: m.id,
              name: m.name,
              revisions: parseInt(m.revisions, 10) || 0,
              deadline: m.hours ? `${m.hours} Hours` : 'N/A',
              credits: 0, // Would need calculation or separate fields
              status: "Locked"
            }))
          }));
          setContracts(mappedContracts);

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
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case "Waiting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
            <Clock className="h-3 w-3" />
            Waiting
          </span>
        );
      case "Done":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400">
            <AlertCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#080a12] text-white font-['Plus_Jakarta_Sans']">
      {/* Top Header */}
      <UserHeader pageTitle="My Contracts" credits={1250} />

      {loading ? (
        <ContractsSkeletonLoader />
      ) : (
        <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-6 md:p-8 backdrop-blur-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1
                  className="text-2xl font-extrabold tracking-tight text-white md:text-3xl"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  My Contracts & Agreements
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Select any contract card to view its full formal agreement, escrow breakdown, and TOS terms.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                <Shield className="h-4 w-4 text-blue-400" />
                <span>Protected by Ensemble Escrow & Platform Policy</span>
              </div>
            </div>
          </div>

          {/* Smooth Framer Motion Underline Tab Navigation */}
          <div className="border-b border-white/10 flex gap-1 relative">
            <button
              onClick={() => setActiveTab("active")}
              className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === "active" ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Active Contracts
                <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] text-zinc-300">
                  {SAMPLE_DETAILED_CONTRACTS.filter((c) => !c.isArchived).length}
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
                activeTab === "archived" ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Archive className="h-4 w-4" /> Archived Contracts
                <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] text-zinc-300">
                  {SAMPLE_DETAILED_CONTRACTS.filter((c) => c.isArchived).length}
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-xs text-zinc-500">
                  No contracts found under this tab.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredContracts.map((contract) => {
                    const isWaiting = contract.status === "Waiting";
                    const isDone = contract.status === "Done";
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
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-blue-500/50 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-blue-500/5 ${
                          isDone ? "opacity-60 grayscale-[30%] hover:opacity-100 hover:grayscale-0" : ""
                        }`}
                      >
                        {/* Top Row: Icon, Truncated Title, and Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-400">
                              {contract.contractType === "Job" ? (
                                <Briefcase className="h-5 w-5" />
                              ) : (
                                <MicVocal className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                                  {contract.id}
                                </span>
                                <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 uppercase tracking-wider">
                                  {contract.contractType}
                                </span>
                              </div>

                              {/* Truncated Title */}
                              <h3
                                className="mt-1 text-sm font-bold text-white transition group-hover:text-blue-400 truncate max-w-[220px] sm:max-w-[280px] md:max-w-[240px] lg:max-w-[320px]"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                title={contract.title}
                              >
                                "{contract.title}"
                              </h3>

                              {/* Credits Display */}
                              <div className="mt-1.5 flex items-center gap-1 text-xs font-extrabold text-yellow-500">
                                <CircleDollarSign className="h-3.5 w-3.5 text-yellow-500" />
                                <span>{contract.totalValueCredits.toLocaleString()} Credits</span>
                              </div>
                            </div>
                          </div>

                          {getStatusBadge(contract.status)}
                        </div>

                        {/* Milestone Progress Bar Segmented */}
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider text-zinc-500">
                              Milestones Progress
                            </span>
                            <span className="font-mono text-zinc-300 font-bold">
                              {claimedCount}/{totalMilestones} Completed
                            </span>
                          </div>

                          <div className="flex gap-1.5 h-1.5 w-full">
                            {contract.milestones.map((m) => {
                              let barColor = "bg-white/10";
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

                        {/* Metadata & Dates Info */}
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-zinc-400">
                            <span className="flex items-center gap-1.5 text-zinc-300">
                              <User className="h-3.5 w-3.5 text-zinc-500" />
                              {contract.clientName}
                            </span>
                          </div>

                          {/* Date Created & Starts In */}
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <Calendar className="h-3 w-3 text-zinc-500" />
                              Date Created: <strong className="text-zinc-300 font-semibold">{contract.dateCreated}</strong>
                            </span>

                            {isWaiting && contract.dateStarted && (
                              <span className="flex items-center gap-1.5 text-zinc-300 font-medium bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-0.5 rounded-full text-[10px]">
                                <Clock className="h-3 w-3 text-zinc-400" />
                                Starts In: {contract.dateStarted}
                              </span>
                            )}
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
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d18] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  Formal Contract Details ({selectedContract.id})
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedContract(null);
                  navigate('/contracts');
                }}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Formal Contract Body */}
            <div className="p-6 md:p-8 space-y-8 max-h-[78vh] overflow-y-auto custom-scrollbar">
              {/* Header Title & Financial Summary */}
              <div className="text-center space-y-2 border-b border-white/10 pb-6">
                <div className="flex justify-center mb-1">
                  {getStatusBadge(selectedContract.status)}
                </div>
                <h2
                  className="text-2xl font-extrabold tracking-tight text-white md:text-3xl"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Job Contract Agreement
                </h2>
                <p className="text-base text-zinc-300 italic font-medium">
                  "{selectedContract.title}"
                </p>

                {/* Date Badges in Modal Header */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Date Created: {selectedContract.dateCreated}
                  </span>
                  {selectedContract.status === "Waiting" && selectedContract.dateStarted && (
                    <span className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-md font-medium text-xs">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" /> Starts In: {selectedContract.dateStarted}
                    </span>
                  )}
                </div>

                {/* Financial Value Box */}
                <div className="pt-4 max-w-md mx-auto space-y-1.5 text-center">
                  <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    Total Contract Value:
                    <span className="text-yellow-500 font-extrabold flex items-center gap-1">
                      <CircleDollarSign className="h-4 w-4 text-yellow-500" />
                      {selectedContract.totalValueCredits.toLocaleString()} Credits
                    </span>
                  </p>

                  <div className="text-xs space-y-1.5 pt-2 font-mono text-zinc-400 max-w-xs mx-auto border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span>Client Range:</span>
                      <span className="text-yellow-500/80 flex items-center gap-1">
                        <CircleDollarSign className="h-3 w-3 text-yellow-500/80" />
                        {selectedContract.clientRange}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Freelancer Bid:</span>
                      <span className="text-yellow-500 flex items-center gap-1">
                        <CircleDollarSign className="h-3 w-3 text-yellow-500" />
                        {selectedContract.totalValueCredits.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-rose-400">
                      <span>Platform Fee ({selectedContract.platformFeePercent}%):</span>
                      <span>- {Math.floor(selectedContract.totalValueCredits * 0.2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-yellow-500 border-t border-white/10 pt-1.5">
                      <span>Freelancer Net:</span>
                      <span className="flex items-center gap-1">
                        <CircleDollarSign className="h-3.5 w-3.5 text-yellow-500" />
                        {Math.floor(selectedContract.totalValueCredits * 0.8).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* I. PARTIES */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  I. Parties Involved
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 p-3.5">
                    <span className="text-zinc-400 font-medium">Client</span>
                    <span className="font-bold text-white italic">{selectedContract.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-zinc-400 font-medium">Freelancer</span>
                    <span className="font-bold text-white italic">{selectedContract.freelancerName}</span>
                  </div>
                </div>
              </div>

              {/* II. SCOPE OF WORK */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  II. Scope of Work
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 text-xs">
                  <div className="p-3.5 border-b border-white/10 space-y-1">
                    <span className="text-zinc-400 font-medium block">Job Description</span>
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                      {selectedContract.jobDescription}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-zinc-400 font-medium">Add-On Work Rate</span>
                    <span className="font-bold text-white">{selectedContract.addOnRate}</span>
                  </div>
                </div>
              </div>

              {/* III. LOCKED MILESTONES WITH CLAIMED INDICATORS */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  III. Locked Milestones
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60 text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-semibold">
                        <th className="p-3 text-center w-10">#</th>
                        <th className="p-3">Milestone Name</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Revisions</th>
                        <th className="p-3 text-center">Deadline</th>
                        <th className="p-3 text-right">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {selectedContract.milestones.map((m) => {
                        const isClaimed = m.status === "Claimed";
                        const isInProgress = m.status === "In Progress";

                        return (
                          <tr key={m.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 text-center font-mono text-zinc-500">{m.id}</td>
                            <td className="p-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{m.name}</span>
                              </div>
                            </td>
                            {/* Claimed Indicator Badge */}
                            <td className="p-3 text-center">
                              {isClaimed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  <Check className="h-3 w-3" /> Claimed
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                  <Clock className="h-3 w-3 animate-pulse" /> In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                                  <Lock className="h-3 w-3" /> Locked
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono">{m.revisions}</td>
                            <td className="p-3 text-center font-mono">{m.deadline}</td>
                            <td className="p-3 text-right font-bold font-mono">
                              <div className="flex items-center justify-end gap-1">
                                <CircleDollarSign
                                  className={`h-3.5 w-3.5 ${
                                    isClaimed ? "text-emerald-400" : "text-yellow-500"
                                  }`}
                                />
                                <span className={isClaimed ? "text-emerald-400 line-through opacity-80" : "text-yellow-500"}>
                                  {m.credits.toLocaleString()}
                                </span>
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    IV. Agreed Terms of Service (TOS)
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                    Preset: {selectedContract.freelancerTosTitle}
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedContract.freelancerTosContent}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-zinc-950/80 px-6 py-4">
              <span className="text-[11px] text-zinc-500">
                Press ESC or click close to exit
              </span>
              <button
                onClick={() => {
                  setSelectedContract(null);
                  navigate('/contracts');
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Close Contract View
              </button>
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