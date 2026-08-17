// src/components/ui/inbox/inbox_functions/inbox_create_group.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Users, X, Plus, Trash2 } from "lucide-react";
import api from "@/lib/axios";

export interface SuggestedAccount {
  account_id: string;
  name: string;
  username: string;
  avatar: string;
}

interface InboxCreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; members: SuggestedAccount[] }) => Promise<void>;
  suggestedAccounts?: SuggestedAccount[];
}

export const InboxCreateGroupModal: React.FC<InboxCreateGroupModalProps> = ({
  onClose,
  onCreateGroup,
  suggestedAccounts = [],
}) => {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SuggestedAccount[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SuggestedAccount[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = searchTerm.replace(/^@/, "").trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { handle: query },
        });
        const cloudfront = String(
          import.meta.env.VITE_CLOUDFRONT_URL || ""
        ).replace(/\/$/, "");
        const accounts = (response.data?.data || []).map((account: any) => {
          const avatarPath = account.avatar_preset_url || "";
          return {
            account_id: String(account.account_id),
            name: account.display_name || account.handle,
            username: `@${account.handle}`,
            avatar: avatarPath
              ? /^https?:\/\//i.test(avatarPath)
                ? avatarPath
                : `${cloudfront}/${String(avatarPath).replace(/^\/+/, "")}`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  account.display_name || account.handle
                )}&background=6366f1&color=fff`,
          };
        });
        if (!cancelled) setSearchResults(accounts);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchTerm]);

  // Filter suggested accounts based on search input and exclude already selected members
  const filteredSuggestions = useMemo(() => {
    const source = searchTerm.trim().length >= 2
      ? searchResults
      : suggestedAccounts;
    return source.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.username.toLowerCase().includes(searchTerm.toLowerCase());
      const notSelected = !selectedMembers.some((m) => m.account_id === acc.account_id);
      return matchesSearch && notSelected;
    });
  }, [suggestedAccounts, searchResults, searchTerm, selectedMembers]);

  const handleSelectMember = (account: SuggestedAccount) => {
    setSelectedMembers((prev) => [...prev, account]);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleRemoveMember = (accountId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.account_id !== accountId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateGroup({
        name: groupName.trim(),
        members: selectedMembers,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create group"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-[#12141f] p-6 shadow-2xl text-gray-900 dark:text-white"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold">Create Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Ensemble Dev Squad"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-500 dark:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
          </div>

          {/* Member Search & Dropdown Suggestions */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
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
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-500 dark:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />

            {/* Suggested Accounts Dropdown */}
            {isDropdownOpen && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-20 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-[#1a1d2d] p-1 shadow-2xl inbox-scroll-thin">
                {filteredSuggestions.map((account) => (
                  <button
                    key={account.account_id}
                    type="button"
                    onClick={() => handleSelectMember(account)}
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-gray-100 dark:bg-white/10 transition"
                  >
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {account.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                        {account.username}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {isDropdownOpen && isSearching && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-[#1a1d2d] p-3 text-center text-xs text-gray-500 dark:text-zinc-400">
                Searching handles...
              </div>
            )}
          </div>

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
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
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:bg-white/5 hover:text-gray-900 dark:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedMembers.length === 0 || isSubmitting}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
