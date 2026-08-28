import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Search, User, MapPin, ArrowRight, Sparkles, Tag, Star, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";

import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { ProfileTags } from "@/pages/user/7_profile/Utilities/ProfileTags";

// --- STRUCTURAL INTERFACE ---
interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  location: string;
  bio: string;
  skills: string[];
  isPremium: boolean;
  verified: boolean;
  subscriptionType: "Free" | "Premium" | "Business";
  roles: { role_id: number | string; role_name: string }[];
  meritScore: number | string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  tagline: string;
}

export const UserProfilesList: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();
  const userInfo = useGlobalState((state) => state.user);
  const { openChatWithUser } = useOutletContext<{
    openChatWithUser: (target?: { name: string; avatarUrl?: string; account_id: string }) => void;
  }>();

  const decodedQuery = query ? decodeURIComponent(query) : "";
  const [searchInput, setSearchInput] = useState(decodedQuery);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortOption, setSortOption] = useState("default");

  const displayedProfiles = useMemo(() => {
    let result = [...profiles];
    if (sortOption === "following") {
      result = result.filter(p => p.isFollowing);
    } else if (sortOption === "top_rated") {
      result.sort((a, b) => parseFloat(String(b.meritScore)) - parseFloat(String(a.meritScore)));
    }
    return result;
  }, [profiles, sortOption]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(displayedProfiles.length / ITEMS_PER_PAGE);

  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedProfiles.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedProfiles, currentPage]);

  // Sync state if routing query parameters change upstream
  useEffect(() => {
    setSearchInput(decodedQuery);
    setCurrentPage(1);
  }, [decodedQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, sortOption]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!decodedQuery.trim()) {
        setProfiles([]);
        return;
      }
      
      setLoading(true);
      try {
        const params: any = { handle: decodedQuery.replace(/^@/, "").trim() };
        if (roleFilter !== "All") params.role = roleFilter;
        
        const response = await api.get("/api/accounts/search-users", {
          params,
        });
        const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
        const accounts = response.data?.data || [];
        
        const results = accounts.map((account: any) => {
          const avatarPath = account.avatar_preset_url || "";
          const name = account.full_name || account.display_name || account.handle;
          return {
            id: String(account.account_id),
            name,
            username: account.handle,
            avatar: avatarPath
              ? /^https?:\/\//i.test(avatarPath)
                ? avatarPath
                : `${cloudfront}/${avatarPath.replace(/^\/+/, "")}`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
            location: "Global",
            bio: account.bio || "",
            tagline: account.tagline || "",
            skills: (account.skills || []).map((s: any) => s.name),
            isPremium: account.subscriptiontype?.toLowerCase() === "premium" || account.subscriptiontype?.toLowerCase() === "business",
            verified: !!account.verification_status,
            subscriptionType: account.subscriptiontype || "Free",
            roles: Array.isArray(account.roles) ? account.roles : [],
            meritScore: account.overall_rating !== null && parseFloat(account.overall_rating) > 0 ? parseFloat(account.overall_rating).toFixed(1) : "No Rating",
            followersCount: parseInt(account.followers_count || "0", 10),
            followingCount: parseInt(account.following_count || "0", 10),
            isFollowing: !!account.is_following,
            isFollowedBy: !!account.is_followed_by,
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
  }, [decodedQuery, userInfo?.account_id, roleFilter]);

  // Synchronize global testing membership updates (Alt+O) immediately on the matching profile
  useEffect(() => {
    if (userInfo?.subscription_type && profiles.length > 0) {
      setProfiles(prev => {
        const hasChange = prev.some(p => p.id === userInfo.account_id && p.subscriptionType !== userInfo.subscription_type);
        if (!hasChange) return prev;
        
        return prev.map(p => 
          p.id === userInfo.account_id 
            ? { ...p, subscriptionType: userInfo.subscription_type as any } 
            : p
        );
      });
    }
  }, [userInfo?.subscription_type]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search/user/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent, profileId: string, currentlyFollowing: boolean) => {
    e.stopPropagation();
    
    // Optimistic Update
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          isFollowing: !currentlyFollowing,
          followersCount: currentlyFollowing ? Math.max(0, p.followersCount - 1) : p.followersCount + 1
        };
      }
      return p;
    }));

    try {
      if (currentlyFollowing) {
        await api.delete(`/api/accounts/${profileId}/follow`);
        toast.success("Unfollowed");
      } else {
        await api.post(`/api/accounts/${profileId}/follow`);
        toast.success("Followed successfully");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Action failed");
      // Revert on error
      setProfiles(prev => prev.map(p => {
        if (p.id === profileId) {
          return {
            ...p,
            isFollowing: currentlyFollowing,
            followersCount: currentlyFollowing ? p.followersCount : Math.max(0, p.followersCount - 1)
          };
        }
        return p;
      }));
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-50 dark:bg-dark-base text-zinc-900 dark:text-white overflow-hidden">
      <UserHeader pageTitle="User List" credits={1250} />

      <div className="mx-auto max-w-5xl p-6 md:p-8 w-full flex flex-col flex-1 min-h-0">

        {/* Search Input Control Wrapper Section */}
        <div className="mb-4 flex-shrink-0 w-full flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 group">
              <Search
                onClick={handleSearchSubmit}
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
              />
              <input
                type="text"
                placeholder="Search platform creators by name, username, or skills..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-sm dark:shadow-none"
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button 
              type="button"
              onClick={() => setSortOption(sortOption === 'following' ? 'default' : 'following')}
              className={`px-3 py-1.5 rounded-full border transition-colors ${sortOption === 'following' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
            >
              Following
            </button>
            <button 
              type="button"
              onClick={() => setSortOption(sortOption === 'top_rated' ? 'default' : 'top_rated')}
              className={`px-3 py-1.5 rounded-full border transition-colors ${sortOption === 'top_rated' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
            >
              Top Rated
            </button>
            
            <div className="h-4 w-px bg-zinc-300 dark:bg-white/10 mx-1"></div>
            
            <button 
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Casual' ? 'All' : 'Casual')}
              className={`px-3 py-1.5 rounded-full border transition-colors ${roleFilter === 'Casual' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
            >
              Casual
            </button>
            <button 
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Freelancer' ? 'All' : 'Freelancer')}
              className={`px-3 py-1.5 rounded-full border transition-colors ${roleFilter === 'Freelancer' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
            >
              Freelancer
            </button>
            <button 
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Client' ? 'All' : 'Client')}
              className={`px-3 py-1.5 rounded-full border transition-colors ${roleFilter === 'Client' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
            >
              Client
            </button>

            <div className="h-4 w-px bg-zinc-300 dark:bg-white/10 mx-1"></div>
            
            <span className="text-zinc-500">Popular:</span>
            {['3D Animation', 'Video Editing', 'React', 'Design'].map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => {
                  setSearchInput(skill);
                  navigate(`/search/user/${encodeURIComponent(skill)}`);
                }}
                className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors border border-transparent"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
        
        {decodedQuery && !loading && (
          <div className="mb-4 flex-shrink-0">
            <p className="text-xs text-zinc-500 pl-1">
              Showing results for: <span className="text-blue-500 dark:text-blue-400 font-medium">"{decodedQuery}"</span> 
              {roleFilter !== 'All' && <span> in role <span className="text-blue-500 dark:text-blue-400 font-medium">{roleFilter}</span></span>}
              {' '}({displayedProfiles.length} creators found)
            </p>
          </div>
        )}

        {/* Profiles Feed List Stack */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center text-zinc-500 py-12">Searching for creators...</div>
          ) : displayedProfiles.length === 0 ? (
            /* Elegant Empty State Block */
            <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-dark-surface/40 p-12 text-center max-w-md mx-auto space-y-3 mt-12">
              <User className="h-8 w-8 mx-auto text-zinc-400 dark:text-zinc-600" />
              <div>
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No Creators Found</h3>
                <p className="text-xs text-zinc-500 mt-1">We couldn't find any profiles matching your search query.</p>
              </div>
            </div>
          ) : (
            paginatedProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => navigate(`/profile/${profile.id}`)}
                className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all hover:border-zinc-300 dark:hover:border-white/20 hover:shadow-md dark:hover:bg-dark-surface/60 cursor-pointer animate-fade-in"
              >
                {/* Left Side: Avatar + Meta Specs */}
                <div className="flex items-start gap-4 min-w-0 w-full sm:w-auto flex-1">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full border border-white/10 overflow-hidden shrink-0 bg-zinc-900 relative">
                    <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 space-y-2.5 w-full">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                        {profile.name}
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono">@{profile.username}</span>

                      {/* Verified & Role Tags Wrapper */}
                      <ProfileTags 
                        role={profile.roles as any}
                        verificationLevel={profile.verified}
                        subscriptionType={profile.subscriptionType}
                      />
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        {profile.meritScore === "No Rating" ? (
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">No Rating</span>
                        ) : (
                          <>
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mb-0.5" />
                            <span className="font-bold text-zinc-900 dark:text-white">{profile.meritScore}</span>
                          </>
                        )}
                      </div>
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-zinc-900 dark:text-white">{profile.followersCount}</span>
                        <span>Followers</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-zinc-900 dark:text-white">{profile.followingCount}</span>
                        <span>Following</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg w-fit ${!profile.tagline ? 'opacity-60' : ''} ${profile.subscriptionType === 'Business' ? 'animate-rainbow' : profile.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}>
                        <Tag className="w-3 h-3" />
                        {profile.tagline || (userInfo?.account_id === profile.id ? "Add Tagline" : "N/A")}
                      </div>

                      {profile.skills && profile.skills.length > 0 && (
                        <>
                          <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.skills.slice(0, 5).map((skill, idx) => (
                              <span
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchInput(skill);
                                  navigate(`/search/user/${encodeURIComponent(skill)}`);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer transition-colors"
                              >
                                {skill}
                              </span>
                            ))}
                            {profile.skills.length > 5 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-transparent text-zinc-500">
                                +{profile.skills.length - 5}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 max-w-xl leading-relaxed">
                      {profile.bio.length > 40 ? (
                        <>
                          {profile.bio.substring(0, 40)}... <span className="text-blue-500 cursor-pointer hover:underline">See More</span>
                        </>
                      ) : (
                        profile.bio || "No introduction provided."
                      )}
                    </p>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-4 sm:mt-0">
                  {userInfo?.account_id !== profile.id && (
                    <>
                      {profile.isFollowing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openChatWithUser({
                              name: profile.name,
                              avatarUrl: profile.avatar,
                              account_id: profile.id
                            });
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 transition-all hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400 outline-none"
                          title="Message User"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleFollowToggle(e, profile.id, profile.isFollowing)}
                        className={`px-5 py-2 text-xs font-bold rounded-full transition-all flex-shrink-0 border shadow-sm ${
                          profile.isFollowing
                            ? "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30"
                            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                        }`}
                      >
                        {profile.isFollowing ? "Following" : profile.isFollowedBy ? "Follow Back" : "Follow"}
                      </button>
                    </>
                  )}

                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 transition-all hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400 outline-none"
                    title="View Profile Details"
                  >
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex-shrink-0 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="text-sm text-zinc-500 font-medium px-4">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(161, 161, 170, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(161, 161, 170, 0.5);
        }
      `}</style>
    </div>
  );
};

export default UserProfilesList;