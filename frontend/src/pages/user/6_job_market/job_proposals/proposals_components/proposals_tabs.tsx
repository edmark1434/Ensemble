import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ClipboardList, Send } from "lucide-react";

export const ProposalsTabs: React.FC = () => {
  const location = useLocation();

  const isIncoming = location.pathname.includes("/jobs/proposals/incoming");
  const isSent = location.pathname.includes("/jobs/proposals/sent");

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
      <NavLink
        to="/jobs/proposals/incoming"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          isIncoming
            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-md shadow-blue-500/5"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <ClipboardList className="h-4 w-4" />
        <span>Incoming Proposals</span>
      </NavLink>

      <NavLink
        to="/jobs/proposals/sent"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          isSent
            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-md shadow-blue-500/5"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Send className="h-4 w-4" />
        <span>My Proposals</span>
      </NavLink>
    </div>
  );
};

export default ProposalsTabs;