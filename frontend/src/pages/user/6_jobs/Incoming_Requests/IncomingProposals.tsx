import React, { useState, useEffect } from "react";
import {
  Check,
  Clock,
  DollarSign,
  FileText,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import SuccessModal from "@/components/ui/SuccessModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

// --- STRUCTURAL INTERFACES ---
interface Proposal {
  id: string;
  freelancerName: string;
  freelancerAvatar?: string;
  freelancerRating: number;
  bidAmount: string;
  deliveryTimeline: string;
  coverLetter: string;
  submittedAt: string;
}

interface MyJobWithProposals {
  id: string;
  title: string;
  category: string;
  priceRange: string;
  thumbnail: string;
  proposals: Proposal[];
}

// --- MOCK DATA MATCHING YOUR DESIGN SCHEMA ---
const sampleMyJobsProposals: MyJobWithProposals[] = [
  {
    id: "JP001",
    title: "Wedding Video Edit - Romantic Style",
    category: "Events",
    priceRange: "₱28,000 ~ 36,000",
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    proposals: [
      {
        id: "PROP-101",
        freelancerName: "Rexshimura Dev",
        freelancerRating: 4.9,
        bidAmount: "₱32,000",
        deliveryTimeline: "4 Days",
        coverLetter: "Greetings! I specialize in narrative wedding editing and high-end cinematic color grading. I work exclusively with 4K log profiles and can easily manage your 50GB footage footprint. I use a dedicated high-speed scratch disk setup for fast render turnarounds. Let's collaborate!",
        submittedAt: "1 hour ago"
      },
      {
        id: "PROP-102",
        freelancerName: "Charlyn Shaw",
        freelancerRating: 4.7,
        bidAmount: "₱30,000",
        deliveryTimeline: "3 Days",
        coverLetter: "Hi there! I love your project timeline and description. I've edited over 15 wedding highlight reels over the past year. I excel at rhythmic dynamic audio syncing and building an emotional arc through sound design. Happy to send over past portfolio samples.",
        submittedAt: "5 hours ago"
      }
    ]
  },
  {
    id: "JP002",
    title: "YouTube Channel Intro Animation",
    category: "YouTube",
    priceRange: "₱12,000 ~ 14,000",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
    proposals: [
      {
        id: "PROP-201",
        freelancerName: "Dave Almeda",
        freelancerRating: 4.5,
        bidAmount: "₱13,500",
        deliveryTimeline: "2 Days",
        coverLetter: "Hey! Clean typography and slick sound effects are my bread and butter. I will deliver the intro in full After Effects source file formats along with pre-rendered transparent alpha channels.",
        submittedAt: "Yesterday"
      }
    ]
  }
];

export const IncomingProposals: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<MyJobWithProposals | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Modal States
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"accept" | "decline" | null>(null);

  // Simulate minimal loading sequence to preserve application feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (sampleMyJobsProposals.length > 0) {
        setActiveJob(sampleMyJobsProposals[0]); // Autofocus first item
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleActionTrigger = (proposal: Proposal, type: "accept" | "decline") => {
    setSelectedProposal(proposal);
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const handleConfirmAction = () => {
    setIsActionModalOpen(false);
    if (actionType === "accept") {
      setSuccessMessage(`You have officially accepted ${selectedProposal?.freelancerName}'s proposal. A contract wrapper has been instantiated.`);
      setIsSuccessOpen(true);
    } else if (actionType === "decline") {
      setSuccessMessage(`Proposal from ${selectedProposal?.freelancerName} has been archived safely.`);
      setIsSuccessOpen(true);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden">
      <UserHeader pageTitle="Incoming Proposals" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">

        {/* Description Segment */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Manage Applications</h1>
          <p className="text-xs text-zinc-400">Review incoming bids matching parameters you published across the market framework.</p>
        </div>

        {loading ? (
          /* Basic Skeleton Framework Loader */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="space-y-3"><div className="h-20 bg-white/5 rounded-2xl" /><div className="h-20 bg-white/5 rounded-2xl" /></div>
            <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl" />
          </div>
        ) : sampleMyJobsProposals.length === 0 ? (
          /* Empty State Display */
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#0d0f1a]/40 p-12 text-center max-w-md mx-auto space-y-4 mt-12">
            <AlertCircle className="h-10 w-10 mx-auto text-zinc-500" />
            <div>
              <h3 className="text-base font-bold">No Proposals Received</h3>
              <p className="text-xs text-zinc-500 mt-1">Applications targeting active postings will project coordinates here dynamically.</p>
            </div>
          </div>
        ) : (
          /* Split Grid Main Interface Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* LEFT SIDE: YOUR JOB POSTS SELECTION COLUMN */}
            <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Your Live Postings ({sampleMyJobsProposals.length})</p>
              {sampleMyJobsProposals.map((job) => {
                const isSelected = activeJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => { setActiveJob(job); setSelectedProposal(null); }}
                    className={`group relative overflow-hidden rounded-2xl border p-4 transition-all cursor-pointer flex items-center gap-4 ${
                      isSelected 
                        ? "border-blue-500 bg-blue-500/5 shadow-[0_0_25px_rgba(59,130,246,0.08)]" 
                        : "border-white/10 bg-[#0d0f1a]/40 hover:border-white/20"
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
                      <img src={job.thumbnail} className="h-full w-full object-cover opacity-70" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase text-zinc-500 bg-white/5 px-2 py-0.5 rounded">{job.category}</span>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate mt-1.5">{job.title}</h4>
                      <p className="text-xs font-mono text-yellow-500 mt-0.5">{job.priceRange}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md px-2 py-0.5 text-[10px] font-bold font-mono">
                        {job.proposals.length} Bids
                      </span>
                      <ChevronRight className={`h-4 w-4 text-zinc-600 transition-transform ${isSelected ? "translate-x-1 text-blue-400" : ""}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT SIDE: FEED PROPOSALS FOR ACTIVE SELECTION */}
            <div className="lg:col-span-2 space-y-4">
              {activeJob && (
                <>
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Application Inspection Pool</span>
                      <h2 className="text-lg font-bold text-white mt-0.5">{activeJob.title}</h2>
                    </div>
                  </div>

                  {activeJob.proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 md:p-6 backdrop-blur-sm space-y-4 transition-all hover:border-white/20"
                    >
                      {/* Submissions Summary Header Layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/10 flex items-center justify-center font-bold text-sm">
                            {proposal.freelancerName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-200 normal-case">{proposal.freelancerName}</h4>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-yellow-500 bg-yellow-500/5 px-1.5 py-0.5 rounded border border-yellow-500/10">
                                ★ {proposal.freelancerRating}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">Submitted {proposal.submittedAt}</p>
                          </div>
                        </div>

                        {/* Bid Proposal Estimates Parameters */}
                        <div className="flex gap-4 text-xs">
                          <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-yellow-500" />
                            <div>
                              <span className="text-[9px] uppercase tracking-wider block text-zinc-500 font-bold">Proposed Bid</span>
                              <span className="font-mono text-sm font-bold text-yellow-500">{proposal.bidAmount}</span>
                            </div>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <div>
                              <span className="text-[9px] uppercase tracking-wider block text-zinc-500 font-bold">Delivery Plan</span>
                              <span className="font-mono text-sm font-bold text-white">{proposal.deliveryTimeline}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cover Pitch Segment */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5"><FileText className="h-3 w-3" /> Pitch Scope Definition</span>
                        <p className="text-zinc-400 text-xs leading-relaxed bg-white/[0.01] border border-white/5 p-4 rounded-xl whitespace-pre-line">
                          {proposal.coverLetter}
                        </p>
                      </div>

                      {/* Action Execution Footer Buttons */}
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => handleActionTrigger(proposal, "decline")}
                          className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 text-xs font-bold hover:text-red-400 hover:border-red-500/30 transition focus:outline-none"
                        >
                          Decline Bidding
                        </button>
                        <button
                          onClick={() => handleActionTrigger(proposal, "accept")}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition shadow-md shadow-blue-500/10 focus:outline-none"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept Proposal & Setup Contract
                        </button>
                      </div>

                    </div>
                  ))}
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* --- REUSABLE SYSTEM DIALOG LAYOUT COMPONENTS --- */}
      <SuccessModal
        isOpen={isSuccessOpen}
        message={successMessage}
        onConfirm={() => setIsSuccessOpen(false)}
      />

      <ConfirmationModal
        isOpen={isActionModalOpen}
        message={
          actionType === "accept"
            ? `Are you sure you want to accept the proposal from ${selectedProposal?.freelancerName}? This action freezes competing pipelines.`
            : `Are you sure you want to archive the application from ${selectedProposal?.freelancerName}?`
        }
        onConfirm={handleConfirmAction}
        onCancel={() => setIsActionModalOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default IncomingProposals;