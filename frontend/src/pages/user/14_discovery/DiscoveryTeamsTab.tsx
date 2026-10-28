import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Briefcase,
  Star,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Plus,
  CheckCircle2,
  X,
  Shuffle,
  Sparkles,
  Dices,
} from "lucide-react";
import api from "@/lib/axios";
import { constructAvatarUrl, resolveAvatarPath } from "@/lib/accountAvatars";
import { bannerPresetUrl } from "@/lib/profileBanners";
import useGlobalState from "@/lib/global_state";
import { seededRandomUnit } from "./discovery_ranking";
import { showSuccessToast } from "@/components/utility/toast";

export interface DiscoveryTeam {
  team_id: string;
  account_id: string;
  display_name: string;
  handle?: string;
  tagline?: string;
  description?: string;
  category?: string;
  location?: string;
  website?: string;
  visibility?: "Public" | "Private";
  join_policy?: "Open" | "Approval";
  avatar_path?: string;
  banner_preset?: string | null;
  owner_name?: string;
  owner_handle?: string;
  owner_avatar_path?: string;
  member_count: number;
  is_business_verified?: boolean;
  current_user_role?: string | null;
  current_user_status?: string | null;
  average_rating?: number | string;
  review_count?: number;
}

const CATEGORY_CHIPS = [
  "All",
  "Video Production",
  "Motion Graphics",
  "YouTube & Social",
  "Short Films",
  "Commercials",
  "Animation",
  "Gaming",
  "Podcasts",
  "Events",
  "Corporate",
];

/**
 * Team Discovery Scoring Algorithm (Stratified Random Exploration like Discover Creators):
 * - 1. Completeness (0-30 pts): photo/banner, tagline, description, category, website/location.
 * - 2. Reputation & Activity (0-40 pts): rating, reviews, business verified, active members.
 * - 3. Seeded Stratified Jitter (0-30 pts): uniform hash from (teamId, seed).
 * Default "smart_discovery" arranges teams in high-quality dynamic exploration order that reshuffles cleanly!
 */
function computeTeamDiscoveryScore(
  team: DiscoveryTeam,
  seed: number
): { totalScore: number; pureRandomVal: number } {
  let completenessPts = 0;
  if (team.avatar_path || team.banner_preset) completenessPts += 10;
  if ((team.tagline || "").trim().length >= 5) completenessPts += 5;
  if ((team.description || "").trim().length >= 20) completenessPts += 5;
  if (team.category) completenessPts += 5;
  if (team.location || team.website) completenessPts += 5;

  let reputationPts = 0;
  const avgRating = Number(team.average_rating || 0);
  if (avgRating > 0) {
    reputationPts += Math.min(15, (avgRating / 5) * 15);
  } else {
    reputationPts += 8; // baseline for newly created teams
  }
  const reviewCount = Number(team.review_count || 0);
  reputationPts += Math.min(10, reviewCount * 2);
  if (team.is_business_verified) reputationPts += 10;
  const memberCount = Number(team.member_count || 0);
  reputationPts += Math.min(5, memberCount);

  const jitterPts = seededRandomUnit(team.team_id, seed) * 30;
  const totalScore = Math.round((completenessPts + reputationPts + jitterPts) * 10) / 10;
  const pureRandomVal = seededRandomUnit(team.team_id, seed + 7919);

  return { totalScore, pureRandomVal };
}

export const DiscoveryTeamsTab: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useGlobalState();
  const [teams, setTeams] = useState<DiscoveryTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // Seeded exploration seed (randomized on initial mount, re-rolled on Shuffle)
  const [shuffleSeed, setShuffleSeed] = useState<number>(() =>
    Math.floor(100000 + Math.random() * 900000)
  );
  const [sortBy, setSortBy] = useState<"smart_discovery" | "pure_random" | "members" | "rating" | "name">("smart_discovery");

  const handleReshuffle = () => {
    const nextSeed = Math.floor(100000 + Math.random() * 900000);
    setShuffleSeed(nextSeed);
    if (sortBy !== "smart_discovery" && sortBy !== "pure_random") {
      setSortBy("smart_discovery");
    }
    showSuccessToast(
      sortBy === "pure_random"
        ? "Reshuffled teams with uniform random!"
        : "Feed reshuffled with new exploration seed!"
    );
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/teams", {
          params: {
            limit: 50,
            search: searchQuery.trim(),
            category: selectedCategory === "All" ? "" : selectedCategory,
          },
        });
        if (isMounted) {
          const list = (response.data?.data || []) as DiscoveryTeam[];
          setTeams(list);
        }
      } catch (err) {
        console.error("Failed to load discovery teams:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchTeams();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory]);

  const sortedTeams = useMemo(() => {
    const listWithScore = teams.map((team) => ({
      team,
      ...computeTeamDiscoveryScore(team, shuffleSeed),
    }));

    if (sortBy === "pure_random") {
      listWithScore.sort((a, b) => b.pureRandomVal - a.pureRandomVal);
      return listWithScore.map((item) => item.team);
    }

    if (sortBy === "members") {
      listWithScore.sort((a, b) => (b.team.member_count || 0) - (a.team.member_count || 0));
      return listWithScore.map((item) => item.team);
    }

    if (sortBy === "rating") {
      listWithScore.sort(
        (a, b) =>
          Number(b.team.average_rating || 0) - Number(a.team.average_rating || 0) ||
          (b.team.review_count || 0) - (a.team.review_count || 0)
      );
      return listWithScore.map((item) => item.team);
    }

    if (sortBy === "name") {
      listWithScore.sort((a, b) =>
        (a.team.display_name || "").localeCompare(b.team.display_name || "")
      );
      return listWithScore.map((item) => item.team);
    }

    // Default: "smart_discovery" (Weighted Random Stratified Exploration - 70% Quality + 30% Seeded Jitter)
    listWithScore.sort((a, b) => b.totalScore - a.totalScore);
    return listWithScore.map((item) => item.team);
  }, [teams, sortBy, shuffleSeed]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2 text-zinc-900 dark:text-white">
              <Briefcase className="h-5 w-5 text-blue-500" /> Explore Teams
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Discover video editing collectives, creative studios, and collaborative production teams.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search team name, @handle, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-9 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500/50 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Shuffle / Random Exploration Button */}
            <button
              type="button"
              onClick={handleReshuffle}
              title="Reshuffle exploration seed for teams"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-500" />
              <span>Shuffle</span>
            </button>

            {userInfo && (
              <button
                type="button"
                onClick={() => navigate("/teams")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>My Teams</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-100 dark:border-white/5">
          {/* Left: Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_CHIPS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs"
                      : "bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Right: Sort Options */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="font-medium mr-1 hidden sm:inline">Sort by:</span>
            {[
              { id: "smart_discovery", label: "Discover", icon: Sparkles },
              { id: "pure_random", label: "Random", icon: Dices },
              { id: "members", label: "Most Members" },
              { id: "rating", label: "Top Rated" },
              { id: "name", label: "Name" },
            ].map((s) => {
              const Icon = (s as any).icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    sortBy === s.id
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid of Teams */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-4 space-y-4 animate-pulse shadow-xs"
            >
              <div className="h-32 w-full rounded-xl bg-zinc-200/80 dark:bg-white/5" />
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-200/80 dark:bg-white/5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-zinc-200/80 dark:bg-white/5 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-200/80 dark:bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-zinc-200/80 dark:bg-white/5 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : sortedTeams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 p-12 text-center bg-white/50 dark:bg-zinc-900/40">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-400 mx-auto flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            No teams found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "All"
              ? "We couldn't find any teams matching your search query or filter. Try choosing another category."
              : "No public teams have been registered yet. Be the first to create a team!"}
          </p>
          {(searchQuery || selectedCategory !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedTeams.map((team) => {
            // 1. Banner = Team thumbnail (the team's uploaded photo/banner itself)
            const teamThumbnailBanner =
              resolveAvatarPath(team.avatar_path) ||
              (team.banner_preset ? bannerPresetUrl(team.banner_preset) : null);

            // 2. Profile Pic = Owner's profile picture
            const ownerAvatarUrl = constructAvatarUrl(
              team.owner_avatar_path || "",
              team.owner_name || "Owner"
            );

            const isMember =
              team.current_user_status === "Active" ||
              team.current_user_role === "Owner";
            const avgRating = Number(team.average_rating || 0);

            return (
              <div
                key={team.team_id}
                onClick={() => navigate(`/teams/${team.team_id}`, { state: { from: "/discovery?tab=teams" } })}
                className="group relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-xs hover:shadow-md hover:border-zinc-300 dark:hover:border-white/20 transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* 1. Header Banner: Team thumbnail as the banner */}
                <div className="relative h-32 w-full bg-zinc-950 overflow-hidden shrink-0 flex items-center justify-center">
                  {teamThumbnailBanner ? (
                    <img
                      src={teamThumbnailBanner}
                      alt={team.display_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-r from-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-600 font-bold text-xl">
                      {team.display_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Category Pill */}
                  {team.category && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/15">
                      {team.category}
                    </span>
                  )}

                  {/* Join Policy Pill */}
                  {team.join_policy === "Open" && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3 h-3" /> Open
                    </span>
                  )}
                </div>

                {/* 2. Body: Owner Profile Pic, Group Name & By {owner_name} */}
                <div className="px-5 pt-0 pb-5 flex-1 flex flex-col">
                  {/* Floating Avatar: Owner's profile pic */}
                  <div className="relative -mt-8 flex items-end justify-between mb-2.5 shrink-0">
                    <div
                      className="relative"
                      title={team.owner_name ? `Owner: ${team.owner_name}` : "Team Owner"}
                    >
                      <img
                        src={ownerAvatarUrl}
                        alt={team.owner_name || "Owner"}
                        className="w-16 h-16 rounded-full object-cover border-3 border-white dark:border-zinc-900 shadow-md bg-zinc-100 dark:bg-zinc-800"
                      />
                      {team.is_business_verified && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 p-1 bg-blue-500 text-white rounded-full shadow-xs ring-2 ring-white dark:ring-zinc-900"
                          title="Verified Team"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {isMember && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                        {team.current_user_role === "Owner" ? "Owner" : "Member"}
                      </span>
                    )}
                  </div>

                  {/* 3. Group Name & By {owner_name} */}
                  <div className="mb-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {team.display_name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                      By{" "}
                      <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                        {team.owner_name || (team.owner_handle ? `@${team.owner_handle}` : "Team Owner")}
                      </span>
                      {team.handle && (
                        <span className="text-[11px] text-zinc-400 font-normal ml-1">
                          · @{team.handle}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Tagline / Description */}
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed mb-4 flex-1">
                    {team.tagline ||
                      team.description ||
                      "Collaborative creative production team on Ensemble."}
                  </p>

                  {/* Metrics Bar */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        {team.member_count}{" "}
                        {team.member_count === 1 ? "member" : "members"}
                      </span>

                      <span
                        className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white"
                        title={`${avgRating > 0 ? avgRating.toFixed(1) : "5.0"} rating (${team.review_count || 0} reviews)`}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{avgRating > 0 ? avgRating.toFixed(1) : "5.0"}</span>
                        <span className="text-[11px] text-zinc-400 font-normal">
                          ({team.review_count || 0})
                        </span>
                      </span>
                    </div>

                    {team.location && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400 truncate max-w-[100px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{team.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Hover Action CTA */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition">
                      View Team Profile
                    </span>
                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoveryTeamsTab;
