// src/components/ui/inbox/inbox_components/inbox_tab.tsx
import React from "react";
import { Users, Briefcase } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const InboxTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isMarketplace = location.pathname.includes("/marketplace");

  return (
    <div className="flex border-b border-white/10 flex-shrink-0 bg-[#0d0f1a]">
      <button
        onClick={() => navigate("/inbox/direct")}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
          !isMarketplace
            ? "text-white border-b-2 border-blue-500"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <Users className="h-4 w-4" />
        Direct Messages
      </button>
      <button
        onClick={() => navigate("/inbox/marketplace")}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
          isMarketplace
            ? "text-white border-b-2 border-blue-500"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <Briefcase className="h-4 w-4" />
        Marketplace
      </button>
    </div>
  );
};