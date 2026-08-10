import React from "react";
import { ClipboardList, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export const ProposalsTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isIncoming =
    location.pathname === "/jobs/proposals" ||
    location.pathname.startsWith("/jobs/proposals/incoming");

  const isSent = location.pathname.startsWith("/jobs/proposals/sent");

  return (
    <div className="flex gap-1 relative">
      <button
        onClick={() => navigate("/jobs/proposals")}
        className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
          isIncoming ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <span className="relative z-10 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Incoming Proposals
        </span>

        {isIncoming && (
          <>
            <motion.div
              layoutId="activeProposalTabGlow"
              className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            <motion.div
              layoutId="activeProposalTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </>
        )}
      </button>

      <button
        onClick={() => navigate("/jobs/proposals/sent")}
        className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
          isSent ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <span className="relative z-10 flex items-center gap-2">
          <Send className="h-4 w-4" /> My Proposals
        </span>

        {isSent && (
          <>
            <motion.div
              layoutId="activeProposalTabGlow"
              className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            <motion.div
              layoutId="activeProposalTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </>
        )}
      </button>
    </div>
  );
};

export default ProposalsTabs;