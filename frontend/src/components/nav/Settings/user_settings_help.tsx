import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export const UserSettingsHelp: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Help & Support</h2>
        <p className="text-xs text-zinc-400 mt-1">Access resources or connect with community assistance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/landing/FAQ")}
          className="p-4 rounded-xl border border-white/10 bg-white/5 text-left hover:bg-white/10 transition-all group"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-white">Frequently Asked Questions</h3>
            <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
          </div>
          <p className="text-xs text-zinc-400">Quick solutions and community guide docs.</p>
        </button>

        <button
          onClick={() => navigate("/landing/SubmitATicket")}
          className="p-4 rounded-xl border border-white/10 bg-white/5 text-left hover:bg-white/10 transition-all group"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-white">Submit a Support Ticket</h3>
            <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
          </div>
          <p className="text-xs text-zinc-400">Directly contact human support for non-technical queries.</p>
        </button>
      </div>
    </div>
  );
};