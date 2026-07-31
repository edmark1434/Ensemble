// src/components/ui/inbox/inbox_functions/inbox_create_group.tsx
import React, { useState, useMemo } from "react";
import { Users, X, Plus, Trash2, Check } from "lucide-react";

export interface SuggestedAccount {
  account_id: string;
  name: string;
  username: string;
  avatar: string;
}

// Sample suggested accounts list (Replace or pass as props from your user store)
const MOCK_SUGGESTED_ACCOUNTS: SuggestedAccount[] = [
  {
    account_id: "user2",
    name: "Charlyn",
    username: "@charlyn_s",
    avatar: "https://ui-avatars.com/api/?name=Charlyn&background=ec4899&color=fff&bold=true",
  },
  {
    account_id: "user3",
    name: "Dave",
    username: "@dave_dev",
    avatar: "https://ui-avatars.com/api/?name=Dave&background=10b981&color=fff&bold=true",
  },
  {
    account_id: "user4",
    name: "Sora",
    username: "@soraaaa",
    avatar: "https://ui-avatars.com/api/?name=Sora&background=f59e0b&color=fff&bold=true",
  },
  {
    account_id: "user5",
    name: "Melinda Mahilom",
    username: "@melinda_m",
    avatar: "https://ui-avatars.com/api/?name=Melinda+Mahilom&background=8b5cf6&color=fff&bold=true",
  },
];

interface InboxCreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; members: SuggestedAccount[] }) => void;
  suggestedAccounts?: SuggestedAccount[];
}

export const InboxCreateGroupModal: React.FC<InboxCreateGroupModalProps> = ({
  onClose,
  onCreateGroup,
  suggestedAccounts = MOCK_SUGGESTED_ACCOUNTS,
}) => {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SuggestedAccount[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter suggested accounts based on search input and exclude already selected members
  const filteredSuggestions = useMemo(() => {
    return suggestedAccounts.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.username.toLowerCase().includes(searchTerm.toLowerCase());
      const notSelected = !selectedMembers.some((m) => m.account_id === acc.account_id);
      return matchesSearch && notSelected;
    });
  }, [suggestedAccounts, searchTerm, selectedMembers]);

  const handleSelectMember = (account: SuggestedAccount) => {
    setSelectedMembers((prev) => [...prev, account]);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleRemoveMember = (accountId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.account_id !== accountId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    onCreateGroup({
      name: groupName.trim(),
      members: selectedMembers,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12141f] p-6 shadow-2xl text-white"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold">Create Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Ensemble Dev Squad"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
          </div>

          {/* Member Search & Dropdown Suggestions */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Add Members
            </label>
            <input
              type="text"
              placeholder="Type a name or @username..."
              value={searchTerm}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />

            {/* Suggested Accounts Dropdown */}
            {isDropdownOpen && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-20 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d2d] p-1 shadow-2xl inbox-scroll-thin">
                {filteredSuggestions.map((account) => (
                  <button
                    key={account.account_id}
                    type="button"
                    onClick={() => handleSelectMember(account)}
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-white/10 transition"
                  >
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {account.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {account.username}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto inbox-scroll-thin">
                {selectedMembers.map((member) => (
                  <span
                    key={member.account_id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 pl-1 pr-2.5 py-1 text-xs text-blue-300"
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                    <span>{member.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.account_id)}
                      className="ml-0.5 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};