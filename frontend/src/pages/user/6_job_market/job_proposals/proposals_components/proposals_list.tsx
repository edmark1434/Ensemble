import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleDollarSign,
  Layers,
  Percent,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  Trash2,
} from "lucide-react";

export interface ProposalItemData {
  id: string;
  jobId: string;
  jobTitle: string;
  partyName: string; // Freelancer name for incoming, Client name for sent
  rating?: number;
  bidAmount: number;
  additionalWorkRate: number;
  coverLetter: string;
  tosContent: string;
  submittedAt: string;
  status: "Pending" | "Accepted" | "Declined" | "Withdrawn";
  type: "incoming" | "sent";
  milestones: {
    id: string;
    name: string;
    description: string;
    hours: number;
    revisions: number;
  }[];
}

interface ProposalsListProps {
  proposals: ProposalItemData[];
  onUpdateStatus?: (id: string, status: "Accepted" | "Declined") => void;
  onWithdraw?: (id: string) => void;
  onViewPost?: (jobId: string) => void;
}

export const ProposalsList: React.FC<ProposalsListProps> = ({
  proposals,
  onUpdateStatus,
  onWithdraw,
  onViewPost,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-12 text-center">
        <p className="text-sm text-zinc-400 font-medium">No proposals found matching criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {proposals.map((item) => {
          const isExpanded = expandedId === item.id;
          const milestonePayout = Math.floor(
            item.bidAmount / (item.milestones.length || 1)
          );
          const overageFee = Math.floor(
            milestonePayout * (item.additionalWorkRate / 100)
          );

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-2xl border border-white/10 bg-[#0d0f1a]/80 p-5 backdrop-blur-sm space-y-4 shadow-lg hover:border-white/20 transition text-left"
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                    Job: {item.jobTitle}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                      {item.partyName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.partyName}</h3>
                      <span className="text-[11px] text-zinc-400">
                        {item.type === "incoming" ? "Applicant" : "Client"} • Submitted {item.submittedAt}
                      </span>
                    </div>
                  </div>
                </div>

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

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Proposed Escrow Bid</span>
                  <p className="text-sm font-extrabold text-yellow-500 flex items-center gap-1">
                    <CircleDollarSign className="h-4 w-4" /> ₱{item.bidAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Milestones Roadmap</span>
                  <p className="text-xs font-bold text-white flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-blue-400" /> {item.milestones.length} Steps (₱{milestonePayout.toLocaleString()} / step)
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Overage Revision Rate</span>
                  <p className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5" /> +{item.additionalWorkRate}% per extra revision
                  </p>
                </div>
              </div>

              {/* Cover Letter */}
              <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/5">
                "{item.coverLetter}"
              </p>

              {/* Expandable Details */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 border-t border-white/5 text-xs"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                      <FileText className="h-3 w-3 text-blue-400" /> Contract Terms of Service
                    </span>
                    <p className="font-mono text-[11px] text-zinc-400 bg-white/[0.02] p-3 rounded-xl border border-white/5 whitespace-pre-line">
                      {item.tosContent}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                      <Layers className="h-3 w-3 text-emerald-400" /> Milestones Schedule ({item.milestones.length})
                    </span>
                    <div className="space-y-2">
                      {item.milestones.map((m, idx) => (
                        <div key={m.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                          <div className="flex justify-between items-center font-bold text-white">
                            <span>Step {idx + 1}: {m.name}</span>
                            <span className="text-emerald-400 font-mono">₱{milestonePayout.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{m.description}</p>
                          <div className="flex gap-4 text-[10px] text-zinc-500 pt-1">
                            <span>Est. Hours: <strong className="text-zinc-300">{m.hours} hrs</strong></span>
                            <span className="flex items-center gap-1">
                              <RefreshCcw className="h-2.5 w-2.5 text-emerald-400" />
                              Max Revisions: <strong className="text-zinc-300">{m.revisions}</strong>
                            </span>
                            <span>Overage Price: <strong className="text-blue-400">₱{(milestonePayout + overageFee).toLocaleString()}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
                >
                  {isExpanded ? (
                    <>Hide Breakdown <ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <>View Full Breakdown <ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </button>

                {item.type === "incoming" && item.status === "Pending" && onUpdateStatus && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateStatus(item.id, "Declined")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => onUpdateStatus(item.id, "Accepted")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept Proposal
                    </button>
                  </div>
                )}

                {item.type === "sent" && (
                  <div className="flex items-center gap-2">
                    {onViewPost && (
                      <button
                        onClick={() => onViewPost(item.jobId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Post
                      </button>
                    )}
                    {item.status === "Pending" && onWithdraw && (
                      <button
                        onClick={() => onWithdraw(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Withdraw
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ProposalsList;