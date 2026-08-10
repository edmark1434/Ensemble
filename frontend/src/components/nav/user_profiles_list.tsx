import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, User, MapPin, ArrowRight, Sparkles } from "lucide-react";
import UserHeader from "@/components/nav/user_header";

import api from "@/lib/axios";

// --- STRUCTURAL INTERFACE ---
interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  location: string;
  bio: string;
  skills: string[];
  isPremium: boolean;
}

export const UserProfilesList: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  const decodedQuery = query ? decodeURIComponent(query) : "";
  const [searchInput, setSearchInput] = useState(decodedQuery);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // Sync state if routing query parameters change upstream
  useEffect(() => {
    setSearchInput(decodedQuery);
  }, [decodedQuery]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!decodedQuery.trim()) {
        setProfiles([]);
        return;
      }
      
      setLoading(true);
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { handle: decodedQuery.replace(/^@/, "").trim() },
        });
        const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
        const accounts = response.data?.data || [];
        
        const results = accounts.map((account: any) => {
          const avatarPath = account.avatar_preset_url || "";
          const name = account.display_name || account.handle;
          return {
            id: String(account.account_id),
            name,
            username: account.handle,
            avatar: avatarPath
              ? /^https?:\/\//i.test(avatarPath)
                ? avatarPath
                : `${cloudfront}/${avatarPath.replace(/^\/+/, "")}`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
            role: "Platform Creator",
            location: "Global",
            bio: "Check out my profile for more details.",
            skills: [],
            isPremium: false,
          };
        });
        setProfiles(results);
      } catch (err) {
        console.error("Failed to search users:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [decodedQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search/user/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden">
      <UserHeader pageTitle="User List" credits={1250} />

      <div className="mx-auto max-w-5xl p-6 md:p-8 w-full">

        {/* Search Input Control Wrapper Section */}
        <div className="mb-8 max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative w-full group">
            <Search
              onClick={handleSearchSubmit}
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-hover:text-blue-400 transition-colors cursor-pointer"
            />
            <input
              type="text"
              placeholder="Search platform creators by name, username, or skills..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </form>
          {decodedQuery && !loading && (
            <p className="text-xs text-zinc-500 mt-3 pl-1">
              Showing results for: <span className="text-blue-400 font-medium">"{decodedQuery}"</span> ({profiles.length} creators found)
            </p>
          )}
        </div>

        {/* Profiles Feed List Stack */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-zinc-500 py-12">Searching for creators...</div>
          ) : profiles.length === 0 ? (
            /* Elegant Empty State Block */
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#0d0f1a]/40 p-12 text-center max-w-md mx-auto space-y-3 mt-12">
              <User className="h-8 w-8 mx-auto text-zinc-600" />
              <div>
                <h3 className="text-sm font-bold text-zinc-300">No Creators Found</h3>
                <p className="text-xs text-zinc-500 mt-1">We couldn't find any profiles matching your search query.</p>
              </div>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => navigate(`/profile/${profile.id}`)}
                className="group rounded-2xl border border-white/10 bg-[#0d0f1a]/40 p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all hover:border-white/20 hover:bg-[#0d0f1a]/60 cursor-pointer animate-fade-in"
              >
                {/* Left Side: Avatar + Meta Specs */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-14 w-14 rounded-full border border-white/10 overflow-hidden shrink-0 bg-zinc-900 relative">
                    <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                        {profile.name}
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono">@{profile.username}</span>

                      {profile.isPremium && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#1a1407] border border-[#b48924] px-1.5 py-0.5 text-[9px] font-bold text-[#f2e29f] uppercase tracking-wider">
                          <Sparkles className="h-2.5 w-2.5 fill-current" /> Pro
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-zinc-300">{profile.role}</p>

                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{profile.location}</span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 pt-1 max-w-xl leading-relaxed">
                      {profile.bio}
                    </p>

                    {/* Skill Badges Set */}
                    {profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-medium text-zinc-400"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Navigation Trigger Button */}
                <button
                  className="sm:self-center flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-all group-hover:border-blue-500/30 group-hover:bg-blue-500/10 group-hover:text-blue-400 outline-none"
                  title="View Profile Details"
                >
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>

              </div>
            ))
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UserProfilesList;