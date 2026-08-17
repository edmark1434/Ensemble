// src/components/ui/inbox/inbox_components/inbox_tab.tsx
import React, { useState } from "react";
import { Users, Briefcase, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { InboxCreateGroupModal } from "../inbox_functions/inbox_create_group";
import type { SuggestedAccount } from "../inbox_functions/inbox_create_group";

interface InboxTabProps {
  onCreateGroup?: (groupData: { name: string; members: SuggestedAccount[] }) => Promise<void>;
  suggestedAccounts?: SuggestedAccount[];
  isCollapsed?: boolean;
}

export const InboxTab: React.FC<InboxTabProps> = ({
  onCreateGroup,
  suggestedAccounts = [],
  isCollapsed = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMarketplace = location.pathname.includes("/marketplace");

  return (
    <>
      <div
        className={`flex items-center border-b border-white/10 flex-shrink-0 bg-dark-surface ${
          isCollapsed ? "flex-col py-2 gap-2" : "pr-2"
        }`}
      >
        <button
          onClick={() => navigate("/inbox/direct")}
          title="Direct Messages"
          className={`flex items-center justify-center gap-2 transition ${
            isCollapsed
              ? `p-3 rounded-xl ${
                  !isMarketplace
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              : `flex-1 py-3 text-sm font-medium ${
                  !isMarketplace
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Users className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Direct Messages</span>}
        </button>

        <button
          onClick={() => navigate("/inbox/marketplace")}
          title="Marketplace"
          className={`flex items-center justify-center gap-2 transition ${
            isCollapsed
              ? `p-3 rounded-xl ${
                  isMarketplace
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              : `flex-1 py-3 text-sm font-medium ${
                  isMarketplace
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Marketplace</span>}
        </button>

        {/* Create Group Quick Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          title="Create Group Chat"
          className={`rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition flex-shrink-0 ${
            isCollapsed ? "p-3" : "p-2 ml-1"
          }`}
        >
          <UserPlus className="h-4 w-4 text-blue-400 flex-shrink-0" />
        </button>
      </div>

      {/* Render Modal */}
      {isModalOpen && (
        <InboxCreateGroupModal
          onClose={() => setIsModalOpen(false)}
          onCreateGroup={async (data) => {
            if (!onCreateGroup) throw new Error("Group creation is unavailable");
            await onCreateGroup(data);
          }}
          suggestedAccounts={suggestedAccounts}
        />
      )}
    </>
  );
};
