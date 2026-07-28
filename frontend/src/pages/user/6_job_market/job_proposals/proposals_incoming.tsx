import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
} from "lucide-react";
import type { JobMainContext } from "../job_main";

export interface IncomingProposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerName: string;
  freelancerAvatar?: string;
  freelancerRating: number;
  bidAmount: number;
  estimatedDays: number;
  coverLetter: string;
  submittedAt: string;
  status: "Pending" | "Accepted" | "Declined";
}

// Mock dataset for incoming proposals
const sampleIncomingProposals: IncomingProposal[] = [
  {
    id: "PROP-IN-01",
    jobId: "JP002",
    jobTitle: "YouTube Channel Intro Animation",
    freelancerName: "Alex Rivera",
    freelancerRating: 4.9,
    bidAmount: 13000,
    estimatedDays: 2,
    coverLetter:
      "Hey! I've created over 30+ tech intro animations for YouTube creators. I can craft a slick, high-energy 10-second intro in After Effects matching your brand.",
    submittedAt: "2 hours ago",
    status: "Pending",
  },
  {
    id: "PROP-IN-02",
    jobId: "JP006",
    jobTitle: "Music Video Color Grading & VAX Effects",
    freelancerName: "Daryl Vance",
    freelancerRating: 4.8,
    bidAmount: 40000,
    estimatedDays: 5,
    coverLetter:
      "I specialize in DaVinci Resolve color passes for indie rock and alt music videos. I can handle the moody aesthetic, grain passes, and subtle glow effects you need.",
    submittedAt: "1 day ago",
    status: "Pending",
  },
];

const ProposalsIncomingPage: React.FC = () => {
  const { loading } = useOutletContext<JobMainContext>();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<IncomingProposal[]>(sampleIncomingProposals);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleUpdateStatus = (id: string, newStatus: "Accepted" | "Declined") => {
    setProposals((prev) =>
      prev.map((prop) => (prop.id === id ? { ...prop, status: newStatus } : prop))
    );
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    const matchesSearch =
      p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.freelancerName.toLowerCase().includes(searchQuery.toLowerCase());
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
            placeholder="Search proposals by job title or freelancer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {["All", "Pending", "Accepted", "Declined"].map((status) => (
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
          <p className="text-sm text-zinc-400 font-medium">No incoming proposals found.</p>
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
                    <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                      Target Job: {item.jobTitle}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {item.freelancerName[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.freelancerName}</h3>
                        <span className="text-[11px] text-zinc-400">
                          ★ {item.freelancerRating} Rating • Submitted {item.submittedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      item.status === "Accepted"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : item.status === "Declined"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Cover Letter */}
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
                      {item.estimatedDays} Days Delivery
                    </span>
                  </div>

                  {item.status === "Pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(item.id, "Declined")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, "Accepted")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept Proposal
                      </button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> Open Chat
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ProposalsIncomingPage;