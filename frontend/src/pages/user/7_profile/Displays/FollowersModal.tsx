import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import api from "@/lib/axios";
import { useNavigate } from "react-router-dom";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  type: "followers" | "following";
}

interface UserConnection {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_preset_url: string;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  accountId,
  type
}) => {
  const [users, setUsers] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, accountId, type]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/accounts/${accountId}/${type}`);
      setUsers(res.data[type] || []);
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const constructAvatarUrl = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
    if (!cloudfrontUrl) return path;
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `${cloudfrontUrl}/${cleanPath}`;
  };

  const filteredUsers = users.filter((u) =>
    (u.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (u.handle?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0b0e17] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white capitalize">{type}</h2>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151a2a] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <p className="text-sm font-medium text-zinc-400">
                {searchQuery ? "No matches found." : `No ${type} yet.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredUsers.map((u) => {
                const avatar = constructAvatarUrl(u.avatar_preset_url);
                return (
                  <button
                    key={u.account_id}
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${u.account_id}`);
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center text-zinc-400 font-bold">
                      {avatar ? (
                        <img src={avatar} alt={u.display_name} className="h-full w-full object-cover" />
                      ) : (
                        u.display_name?.charAt(0) || u.handle?.charAt(0) || "?"
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">
                        {u.display_name}
                      </div>
                      <div className="text-xs font-medium text-zinc-500 truncate">
                        @{u.handle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
