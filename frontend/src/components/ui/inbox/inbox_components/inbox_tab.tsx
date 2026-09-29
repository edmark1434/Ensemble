// src/components/ui/inbox/inbox_components/inbox_tab.tsx
import React, { useState } from "react";
import { Users, Briefcase, UserPlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { InboxCreateGroupModal } from "../inbox_functions/inbox_create_group";
import type { SuggestedAccount } from "../inbox_functions/inbox_create_group";

interface InboxTabProps {
  onCreateGroup?: (groupData: { name: string; members: SuggestedAccount[], limit?: number }) => Promise<void>;
  suggestedAccounts?: SuggestedAccount[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const InboxTab: React.FC<InboxTabProps> = ({
  onCreateGroup,
  suggestedAccounts = [],
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMarketplace = location.pathname.includes("/marketplace");

  return (
    <>
      <div
        className={`flex items-center border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-dark-surface ${
          isCollapsed ? "flex-col py-2 gap-2" : "px-1"
        }`}
      >
        {/* Collapse toggle — left of Direct Messages */}
        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            className="p-2.5 rounded-xl text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition flex-shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}

        {/* Collapsed: show expand button */}
        {onToggleCollapse && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="p-3 rounded-xl text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition flex-shrink-0"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => navigate("/inbox/direct")}
          title="Direct Messages"
          className={`flex items-center justify-center gap-2 transition ${
            isCollapsed
              ? `p-3 rounded-xl ${
                  !isMarketplace
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5"
                }`
              : `flex-1 py-3 text-sm font-medium ${
                  !isMarketplace
                    ? "text-gray-900 dark:text-white border-b-2 border-blue-500"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5"
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
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5"
                }`
              : `flex-1 py-3 text-sm font-medium ${
                  isMarketplace
                    ? "text-gray-900 dark:text-white border-b-2 border-blue-500"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5"
                }`
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Marketplace</span>}
        </button>

        {/* Create Group Quick Button — far right */}
        <button
          onClick={() => setIsModalOpen(true)}
          title="Create Group Chat"
          className={`rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition flex-shrink-0 ${
            isCollapsed ? "p-3" : "p-2.5 mr-1"
          }`}
        >
          <UserPlus className="h-4 w-4 flex-shrink-0" />
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
