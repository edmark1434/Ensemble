// src/components/ui/inbox/inbox_components/inbox_tab.tsx
import React, { useState } from "react";
import { Users, Briefcase, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
        className={`flex border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-dark-surface transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? "flex-col py-3 gap-3 items-center px-2" : "flex-row items-center px-3"
        }`}
      >
        {/* Collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`flex items-center justify-center text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 flex-shrink-0 ${
              isCollapsed ? "p-3 rounded-xl bg-gray-50 dark:bg-white/5" : "p-2 rounded-xl mr-2"
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}

        <button
          onClick={() => navigate("/inbox/direct")}
          title="Direct Messages"
          className={`flex items-center transition-all duration-300 ${
            isCollapsed
              ? `justify-center p-3 rounded-xl gap-0 ${
                  !isMarketplace
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                }`
              : `flex-1 py-3 justify-center text-sm font-medium gap-2 border-b-2 ${
                  !isMarketplace
                    ? "text-gray-900 dark:text-white border-blue-500"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 border-transparent"
                }`
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Users className="h-4 w-4 flex-shrink-0" />
          <span
            className={`whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
            }`}
          >
            Direct Messages
          </span>
        </button>

        <button
          onClick={() => navigate("/inbox/marketplace")}
          title="Marketplace"
          className={`flex items-center transition-all duration-300 ${
            isCollapsed
              ? `justify-center p-3 rounded-xl gap-0 ${
                  isMarketplace
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                }`
              : `flex-1 py-3 justify-center text-sm font-medium gap-2 border-b-2 ${
                  isMarketplace
                    ? "text-gray-900 dark:text-white border-blue-500"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 border-transparent"
                }`
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          <span
            className={`whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
            }`}
          >
            Marketplace
          </span>
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
