import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Search, User, ArrowRight, Star, ChevronLeft, ChevronRight, MessageCircle,
  Sparkles, Briefcase, CheckCircle2, Users, Plus, Target,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { ProfileTags } from "@/pages/user/7_profile/Utilities/ProfileTags";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  skills: string[];
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

interface MyJob {
  id: string;
  title: string;
  skills: string[];
  createdAt: string;
}

interface MatchResult {
  profile: UserProfile;
  matched: string[];
  percent: number;
}

const norm = (s: string) => s.trim().toLowerCase();

const mapAccount = (account: any, cloudfront: string): UserProfile => {
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
    bio: account.bio || "",
    tagline: account.tagline || "",
    skills: (account.skills || []).map((s: any) => s.name),
    verified: !!account.verification_status,
    subscriptionType: account.subscriptiontype || "Free",
    roles: Array.isArray(account.roles) ? account.roles : [],
    meritScore:
      account.overall_rating !== null && parseFloat(account.overall_rating) > 0
        ? parseFloat(account.overall_rating).toFixed(1)
        : "No Rating",
    followersCount: parseInt(account.followers_count || "0", 10),
    followingCount: parseInt(account.following_count || "0", 10),
    isFollowing: !!account.is_following,
    isFollowedBy: !!account.is_followed_by,
  };
};

const computeMatch = (profile: UserProfile, jobSkills: string[]): MatchResult => {
  const wanted = new Set(jobSkills.map(norm));
  const matched = profile.skills.filter((s) => wanted.has(norm(s)));
  const percent = wanted.size ? Math.round((matched.length / wanted.size) * 100) : 0;
  return { profile, matched, percent };
};

/* Circular match score ring (solid strokes, no gradients) */
const MatchRing: React.FC<{ percent: number; size?: number }> = ({ percent, size = 48 }) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = percent >= 75 ? "text-emerald-500" : percent >= 40 ? "text-blue-500" : "text-zinc-400";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-zinc-200 dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="currentColor"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (percent / 100) * c}
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-zinc-900 dark:text-white">
        {percent}%
      </span>
    </div>
  );
};

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const userInfo = useGlobalState((state) => state.user);
  const { openChatWithUser } = useOutletContext<{
    openChatWithUser: (target?: { name: string; avatarUrl?: string; account_id: string }) => void;
  }>();

  const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");

  // Explore state
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Recommendation state
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [freelancers, setFreelancers] = useState<UserProfile[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [recLoading, setRecLoading] = useState(true);

  /* ---------- Load my open job posts + freelancer pool ---------- */
  useEffect(() => {
    const load = async () => {
      setRecLoading(true);
      try {
        const [jobsRes, flRes] = await Promise.all([
          api.get("/api/jobs").catch(() => ({ data: { data: [] } })),
          api.get("/api/accounts/search-users", { params: { role: "Freelancer" } }).catch(() => ({ data: { data: [] } })),
        ]);
        const jobs: MyJob[] = (jobsRes.data?.data || [])
          .filter((j: any) => (j.is_personal_post || j.is_own_post || j.is_manageable_post) && j.status === "Open")
          .filter((j: any) => Array.isArray(j.tags) && j.tags.length > 0)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((j: any) => ({ id: j.job_id, title: j.title, skills: j.tags, createdAt: j.created_at }));
        setMyJobs(jobs);
        setFreelancers(
          (flRes.data?.data || [])
            .map((a: any) => mapAccount(a, cloudfront))
            .filter((p: UserProfile) => p.id !== userInfo?.account_id)
        );
      } finally {
        setRecLoading(false);
      }
    };
    load();
  }, [userInfo?.account_id, cloudfront]);

  const allMySkills = useMemo(
    () => Array.from(new Map(myJobs.flatMap((j) => j.skills).map((s) => [norm(s), s])).values()),
    [myJobs]
  );

  const activeJobSkills = useMemo(() => {
    if (selectedJobId === "all") return allMySkills;
    return myJobs.find((j) => j.id === selectedJobId)?.skills || [];
  }, [selectedJobId, myJobs, allMySkills]);

  const recommendations = useMemo(
    () =>
      freelancers
        .map((p) => computeMatch(p, activeJobSkills))
        .filter((m) => m.matched.length > 0)
        .sort((a, b) => b.percent - a.percent || b.matched.length - a.matched.length)
        .slice(0, 6),
    [freelancers, activeJobSkills]
  );

  /* ---------- Explore list ---------- */
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (activeQuery.trim()) params.handle = activeQuery.replace(/^@/, "").trim();
        if (roleFilter !== "All") params.role = roleFilter;
        const response = await api.get("/api/accounts/search-users", { params });
        setProfiles((response.data?.data || []).map((a: any) => mapAccount(a, cloudfront)));
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [activeQuery, userInfo?.account_id, roleFilter, cloudfront]);

  const displayedProfiles = useMemo(() => {
    let result = [...profiles];
    if (sortOption === "following") result = result.filter((p) => p.isFollowing);
    else if (sortOption === "top_rated")
      result.sort((a, b) => (parseFloat(String(b.meritScore)) || 0) - (parseFloat(String(a.meritScore)) || 0));
    else if (sortOption === "best_match" && allMySkills.length)
      result.sort((a, b) => computeMatch(b, allMySkills).percent - computeMatch(a, allMySkills).percent);
    return result;
  }, [profiles, sortOption, allMySkills]);

  const totalPages = Math.ceil(displayedProfiles.length / ITEMS_PER_PAGE);
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedProfiles.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedProfiles, currentPage]);

  useEffect(() => setCurrentPage(1), [roleFilter, sortOption, activeQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput);
  };

  const applyFollow = (id: string, following: boolean) => {
    const upd = (list: UserProfile[]) =>
      list.map((p) =>
        p.id === id
          ? { ...p, isFollowing: following, followersCount: Math.max(0, p.followersCount + (following ? 1 : -1)) }
          : p
      );
    setProfiles(upd);
    setFreelancers(upd);
  };

  const handleFollowToggle = async (e: React.MouseEvent, profileId: string, currentlyFollowing: boolean) => {
    e.stopPropagation();
    applyFollow(profileId, !currentlyFollowing);
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
      applyFollow(profileId, currentlyFollowing);
    }
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
      active
        ? "bg-blue-600 border-blue-600 text-white"
        : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
    }`;

  const ActionButtons: React.FC<{ profile: UserProfile; compact?: boolean }> = ({ profile, compact }) =>
    userInfo?.account_id === profile.id ? null : (
      <div className="flex items-center gap-2">
        {profile.isFollowing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openChatWithUser({ name: profile.name, avatarUrl: profile.avatar, account_id: profile.id });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-blue-500 hover:border-blue-500/40 transition"
            title="Message"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => handleFollowToggle(e, profile.id, profile.isFollowing)}
          className={`${compact ? "px-3" : "px-4"} py-1.5 text-xs font-bold rounded-full border transition ${
            profile.isFollowing
              ? "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:text-red-500 hover:border-red-300 dark:hover:border-red-500/30"
              : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {profile.isFollowing ? "Following" : profile.isFollowedBy ? "Follow Back" : "Follow"}
        </button>
      </div>
    );

  const selectedJob = myJobs.find((j) => j.id === selectedJobId);

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-50 dark:bg-dark-base text-zinc-900 dark:text-white overflow-hidden">
      <UserHeader pageTitle="Discovery" />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto max-w-6xl p-6 md:p-8 space-y-10">

          {/* ================= MATCHED FOR YOUR JOBS ================= */}
          <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-7 shadow-sm dark:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" /> Talent matched for you
                </div>
                <h2 className="text-2xl font-extrabold mt-1">
                  {recLoading
                    ? "Finding your best matches..."
                    : myJobs.length === 0
                      ? "Post a job to unlock matched talent"
                      : recommendations.length > 0
                        ? `${recommendations.length} freelancer${recommendations.length > 1 ? "s" : ""} fit ${selectedJob ? `"${selectedJob.title}"` : "your open jobs"}`
                        : "No skill matches yet"}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                  Ranked by how many of your job's required skills each freelancer lists on their profile.
                </p>
              </div>
              {myJobs.length > 0 && (
                <button
                  onClick={() => navigate("/jobs/postings")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-500"
                >
                  <Briefcase className="h-3.5 w-3.5" /> Manage jobs
                </button>
              )}
            </div>

            {/* Job selector */}
            {myJobs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setSelectedJobId("all")} className={chip(selectedJobId === "all")}>
                  All my open jobs
                </button>
                {myJobs.map((j) => (
                  <button key={j.id} onClick={() => setSelectedJobId(j.id)} className={`${chip(selectedJobId === j.id)} max-w-[220px] truncate`}>
                    {j.title}
                  </button>
                ))}
              </div>
            )}

            {/* Required skills being matched */}
            {activeJobSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-6 text-[11px]">
                <Target className="h-3.5 w-3.5 text-zinc-400 mr-1" />
                <span className="text-zinc-500 mr-1">Matching on:</span>
                {activeJobSkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            {recLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : myJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 p-8 text-center">
                <Briefcase className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                <p className="text-sm font-semibold">You have no open job posts with required skills.</p>
                <p className="text-xs text-zinc-500 mt-1 mb-4">Create one and we'll surface freelancers whose skills fit it.</p>
                <button
                  onClick={() => navigate("/jobs/create")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" /> Post a job
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 p-8 text-center text-xs text-zinc-500">
                No freelancers list these skills yet. Try another job or explore everyone below.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map(({ profile, matched, percent }, idx) => (
                  <div
                    key={profile.id}
                    onClick={() => navigate(`/profile/${profile.id}`)}
                    className="group relative rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] p-4 cursor-pointer transition hover:border-blue-500/40 hover:shadow-md animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {idx === 0 && (
                      <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        Top match
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <img src={profile.avatar} alt="" className="h-12 w-12 rounded-full object-cover border border-zinc-200 dark:border-white/10" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate group-hover:text-blue-500 transition-colors">{profile.name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono truncate">@{profile.username}</p>
                        <div className="flex items-center gap-1 mt-1 text-[11px]">
                          {profile.meritScore === "No Rating" ? (
                            <span className="text-zinc-500">New talent</span>
                          ) : (
                            <>
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              <span className="font-bold">{profile.meritScore}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <MatchRing percent={percent} />
                    </div>

                    {profile.tagline && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-3 line-clamp-1">{profile.tagline}</p>
                    )}

                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
                        Has {matched.length} of {activeJobSkills.length} skills you need
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {matched.slice(0, 4).map((s) => (
                          <span key={s} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                            <CheckCircle2 className="h-2.5 w-2.5" /> {s}
                          </span>
                        ))}
                        {matched.length > 4 && <span className="text-[10px] text-zinc-500 px-1">+{matched.length - 4}</span>}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500 group-hover:text-blue-500 flex items-center gap-1">
                        View profile <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <ActionButtons profile={profile} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= EXPLORE ALL ================= */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" /> Explore creators
                </h2>
                <p className="text-xs text-zinc-500">Browse everyone on Ensemble.</p>
              </div>
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name, username, or skill..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50"
                />
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              {["All", "Freelancer", "Client", "Casual"].map((r) => (
                <button key={r} onClick={() => setRoleFilter(r)} className={chip(roleFilter === r)}>{r}</button>
              ))}
              <div className="h-4 w-px bg-zinc-300 dark:bg-white/10 mx-1" />
              {allMySkills.length > 0 && (
                <button onClick={() => setSortOption(sortOption === "best_match" ? "default" : "best_match")} className={chip(sortOption === "best_match")}>
                  Best match
                </button>
              )}
              <button onClick={() => setSortOption(sortOption === "top_rated" ? "default" : "top_rated")} className={chip(sortOption === "top_rated")}>
                Top rated
              </button>
              <button onClick={() => setSortOption(sortOption === "following" ? "default" : "following")} className={chip(sortOption === "following")}>
                Following
              </button>
            </div>

            {activeQuery && !loading && (
              <p className="text-xs text-zinc-500 mb-3">
                Results for <span className="text-blue-500 font-medium">"{activeQuery}"</span> ({displayedProfiles.length})
                <button onClick={() => { setActiveQuery(""); setSearchInput(""); }} className="ml-2 underline hover:text-blue-500">clear</button>
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse" />)}
              </div>
            ) : displayedProfiles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center">
                <User className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                <h3 className="text-sm font-bold">No creators found</h3>
                <p className="text-xs text-zinc-500 mt-1">Try a different search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedProfiles.map((profile) => {
                  const m = allMySkills.length ? computeMatch(profile, allMySkills) : null;
                  const matchedSet = new Set((m?.matched || []).map(norm));
                  return (
                    <div
                      key={profile.id}
                      onClick={() => navigate(`/profile/${profile.id}`)}
                      className="group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 cursor-pointer transition hover:border-zinc-300 dark:hover:border-white/20 hover:shadow-md animate-fade-in"
                    >
                      <div className="flex items-start gap-3">
                        <img src={profile.avatar} alt="" className="h-14 w-14 rounded-full object-cover border border-zinc-200 dark:border-white/10 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm truncate group-hover:text-blue-500 transition-colors">{profile.name}</h3>
                            <ProfileTags role={profile.roles as any} verificationLevel={profile.verified} subscriptionType={profile.subscriptionType} />
                          </div>
                          <p className="text-[11px] text-zinc-500 font-mono">@{profile.username}</p>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                            {profile.meritScore === "No Rating" ? (
                              <span>No rating</span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                <b className="text-zinc-900 dark:text-white">{profile.meritScore}</b>
                              </span>
                            )}
                            <span><b className="text-zinc-900 dark:text-white">{profile.followersCount}</b> followers</span>
                          </div>
                        </div>
                        {m && m.matched.length > 0 && (
                          <span className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            {m.percent}% match
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 line-clamp-2 min-h-[2rem]">
                        {profile.tagline || profile.bio || "No introduction provided."}
                      </p>

                      <div className="flex items-end justify-between gap-3 mt-3">
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {profile.skills.slice(0, 4).map((skill) => {
                            const hit = matchedSet.has(norm(skill));
                            return (
                              <span
                                key={skill}
                                onClick={(e) => { e.stopPropagation(); setSearchInput(skill); setActiveQuery(skill); }}
                                className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition ${
                                  hit
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                                    : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10"
                                }`}
                              >
                                {skill}
                              </span>
                            );
                          })}
                          {profile.skills.length > 4 && <span className="text-[10px] text-zinc-500 px-1">+{profile.skills.length - 4}</span>}
                        </div>
                        <ActionButtons profile={profile} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-zinc-500 px-3">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.25s ease-out both; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(161,161,170,0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
