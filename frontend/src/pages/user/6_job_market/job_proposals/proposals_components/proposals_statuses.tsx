import React from "react";
import { Clock, UserCheck, CheckCircle2, XCircle, Layers } from "lucide-react";
import { motion } from "framer-motion";
import type { ProposalStatus } from "./proposals_list";

export interface StatusFilterItem {
  label: "All" | ProposalStatus;
  count: number;
}

interface ProposalsStatusesProps {
  statuses: StatusFilterItem[];
  activeStatus: "All" | ProposalStatus;
  onStatusChange: (status: "All" | ProposalStatus) => void;
}

const getStatusIcon = (label: string) => {
  switch (label) {
    case "Pending":
      return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
    case "Shortlisted":
      return <UserCheck className="h-3.5 w-3.5 text-blue-400" />;
    case "Accepted":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "Rejected":
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <Layers className="h-3.5 w-3.5 text-zinc-400" />;
  }
};

export const ProposalsStatuses: React.FC<ProposalsStatusesProps> = ({
  statuses,
  activeStatus,
  onStatusChange,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/80 p-5 backdrop-blur-sm space-y-3 text-left">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Proposal Statuses
      </h3>
      <div className="flex flex-col gap-1.5">
        {statuses.map((st) => {
          const isActive = activeStatus === st.label;

          return (
            <button
              key={st.label}
              onClick={() => onStatusChange(st.label)}
              className={`relative flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStatusGlow"
                  className="absolute inset-0 rounded-xl bg-blue-500/15 border border-blue-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-2">
                {getStatusIcon(st.label)}
                <span>{st.label}</span>
              </div>

              <span
                className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-md ${
                  isActive
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/40"
                    : "bg-white/5 text-zinc-500 border border-white/5"
                }`}
              >
                {st.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProposalsStatuses;