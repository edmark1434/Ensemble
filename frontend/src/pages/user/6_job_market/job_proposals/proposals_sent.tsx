import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Clock,
  CircleDollarSign,
  ExternalLink,
  Trash2,
  Search,
} from "lucide-react";
import type { JobMainContext } from "../job_main";

export interface SentProposal {
  id: string;
  jobId: string;
  jobTitle: string;
  clientName: string;
  bidAmount: number;
  estimatedDays: number;
  coverLetter: string;
  submittedAt: string;
  status: "Pending" | "Accepted" | "Declined" | "Withdrawn";
}

// Mock dataset for sent proposals
const sampleSentProposals: SentProposal[] = [
  {
    id: "PROP-SENT-01",
    jobId: "JP001",
    jobTitle: "Wedding Video Edit - Romantic Style",
    clientName: "Edmark Talingting",
    bidAmount: 32000,
    estimatedDays: 4,
    coverLetter:
      "I have extensive experience with multi-cam wedding edits and cinematic color passes in DaVinci Resolve. Ready to deliver within 4 days.",
    submittedAt: "Oct 24, 2026",
    status: "Pending",
  },
  {
    id: "PROP-SENT-02",
    jobId: "JP003",
    jobTitle: "Corporate Brand Identity Video",
    clientName: "Sarah Chen",
    bidAmount: 50000,
    estimatedDays: 10,
    coverLetter:
      "Here is my proposal for the corporate commercial sequence. I bring high-end Premiere Pro motion assets and custom audio syncing.",
    submittedAt: "Oct 22, 2026",
    status: "Declined",
  },
];

const ProposalsSentPage: React.FC = () => {
  const { loading } = useOutletContext<JobMainContext>();
  const navigate = useNavigate();

  const [sentProposals, setSentProposals] = useState<SentProposal[]>(sampleSentProposals);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleWithdraw = (id: string) => {
    if (confirm("Are you sure you want to withdraw this proposal?")) {
      setSentProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Withdrawn" } : p))
      );
    }
  };

  const filteredProposals = sentProposals.filter((p) => {
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    const matchesSearch =
      p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Search and Status Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search your sent proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {["All", "Pending", "Accepted", "Declined", "Withdrawn"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterStatus === status
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-12 text-center">
          <p className="text-sm text-zinc-400 font-medium">No sent proposals found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredProposals.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-2xl border border-white/10 bg-[#0d0f1a]/80 p-5 backdrop-blur-sm space-y-4 shadow-lg hover:border-white/20 transition"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Send className="h-3.5 w-3.5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">{item.jobTitle}</h3>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">
                      Posted by <strong className="text-zinc-200">{item.clientName}</strong> • Submitted {item.submittedAt}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      item.status === "Accepted"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : item.status === "Declined"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : item.status === "Withdrawn"
                        ? "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Submitted Cover Proposal */}
                <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  "{item.coverLetter}"
                </p>

                {/* Footer Info & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                    <span className="flex items-center gap-1.5 text-white font-bold">
                      <CircleDollarSign className="h-4 w-4 text-emerald-400" />
                      ₱{item.bidAmount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      {item.estimatedDays} Days Estimated
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/jobs/postings/${item.jobId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View Post
                    </button>

                    {item.status === "Pending" && (
                      <button
                        onClick={() => handleWithdraw(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ProposalsSentPage;