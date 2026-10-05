import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Search, User, ArrowRight, Star, ChevronLeft, ChevronRight, MessageCircle,
  Sparkles, Briefcase, CheckCircle2, Users, Plus, Target, Play, ImageIcon, Video, X, Info, ThumbsUp, Tag, Check, ExternalLink,
} from "lucide-react";
import { FollowersModal } from '@/pages/user/7_profile/Displays/FollowersModal.tsx';
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { ProfileTags } from "@/pages/user/7_profile/Utilities/ProfileTags";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { InviteToJobModal } from "@/components/ui/InviteToJobModal";
import FlipCard from "@/components/ui/FlipCard";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  skills: string[];
  rawSkills?: { name: string; proficiency: string; years: number }[];
  verified: boolean;
  subscriptionType: "Free" | "Premium" | "Business";
  roles: { role_id: number | string; role_name: string }[];
  meritScore: number | string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy?: boolean;
    email?: string;
    joinedDate?: string;
    totalJobs?: number;
    totalServices?: number;
    totalAssets?: number;
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
  score: number;
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
      rawSkills: account.skills || [],
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
      email: account.email || account.email_address || "",
      joinedDate: account.joined_date || account.created_at || "",
      totalJobs: Number(account.total_jobs) || 0,
      totalServices: Number(account.total_services) || 0,
      totalAssets: Number(account.total_assets) || 0,
    isFollowedBy: !!account.is_followed_by,
  };
};

const computeMatch = (profile: UserProfile, jobSkills: string[]): MatchResult => {
  const wanted = new Set(jobSkills.map(norm));
  const matched = profile.skills.filter((s) => wanted.has(norm(s)));
  
  let percent = wanted.size ? Math.round((matched.length / wanted.size) * 100) : 0;
  let score = percent * 10;
  
  if (percent > 0 && profile.rawSkills) {
    profile.rawSkills.forEach(rs => {
      if (wanted.has(norm(rs.name))) {
        const profStr = (rs.proficiency || "").toLowerCase();
        if (profStr.includes("expert") || profStr.includes("advanced") || profStr.includes("senior")) score += 20;
        else if (profStr.includes("intermediate") || profStr.includes("mid")) score += 10;
        else score += 5;
        
        const y = Number(rs.years) || 0;
        if (y > 5) score += 20;
        else if (y > 2) score += 10;
        else if (y > 0) score += 5;
      }
    });
  }
  
  return { profile, matched, percent, score };
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
  const [selectedCardUser, setSelectedCardUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState("Freelancer");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Recommendation state
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [otherJobs, setOtherJobs] = useState<MyJob[]>([]);
  const [freelancers, setFreelancers] = useState<UserProfile[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [recLoading, setRecLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  
  const { tab } = useParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<"creators" | "matched" | "gallery" | "standout">( (tab as any) || "creators" );

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as any);
    } else {
      setActiveTab("creators");
    }
  }, [tab]);
  const [galleries, setGalleries] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<any | null>(null);

  const isGuestMode = userInfo?.role === "guest" || !userInfo;

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const res = await api.get("/api/accounts/galleries/all");
        const d = res.data;
        setGalleries(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      } catch (err) {
        console.error("Failed to load galleries", err);
      } finally {
        setGalleryLoading(false);
      }
    };
    fetchGalleries();
  }, []);

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
          .map((j: any) => ({ id: j.job_id, title: j.title, skills: j.tags, createdAt: j.created_at, thumbnailPath: j.thumbnail_path }));
        setMyJobs(jobs);
        setOtherJobs((jobsRes.data?.data || []).filter((j: any) => !(j.is_personal_post || j.is_own_post || j.is_manageable_post) && j.status === "Open").map((j: any) => ({ id: j.job_id, title: j.title, skills: j.tags || [], createdAt: j.created_at, thumbnailPath: j.thumbnail_path })));
        setFreelancers(
          (flRes.data?.data || [])
            .map((a: any) => mapAccount(a, cloudfront))
            
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

  const recommendations = useMemo(() => freelancers.filter(f => String(f.id) !== String(userInfo?.account_id)).map((p) => computeMatch(p, activeJobSkills))
        .filter((m) => m.matched.length > 0)
        .sort((a, b) => b.score - a.score || b.percent - a.percent || b.matched.length - a.matched.length)
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
      if (userInfo?.account_id) {
        result = result.filter(p => String(p.id) !== String(userInfo.account_id));
      }
      
      const getSubWeight = (p: UserProfile) => {
        if (p.subscriptionType === 'Business') return 3;
        if (p.subscriptionType === 'Premium') return 2;
        return 1;
      };

      if (sortOption === "following") result = result.filter((p) => p.isFollowing);
      else if (sortOption === "top_rated")
        result.sort((a, b) => (parseFloat(String(b.meritScore)) || 0) - (parseFloat(String(a.meritScore)) || 0) || getSubWeight(b) - getSubWeight(a));
      else if (sortOption === "best_match" && allMySkills.length)
        result.sort((a, b) => (computeMatch(b, allMySkills).score - computeMatch(a, allMySkills).score) || getSubWeight(b) - getSubWeight(a));
      else {
        result.sort((a, b) => getSubWeight(b) - getSubWeight(a));
      }
      return result;
        }, [profiles, sortOption, allMySkills, userInfo?.account_id]);

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
    if (!userInfo) {
      setIsModalOpen(true);
      return;
    }
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

          {/* TABS */}
            <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-white/10 mb-6 -mt-4 relative">
                {[
                  { id: "creators", label: "Discover Creators", icon: <Users className="w-4 h-4" /> },
                  { id: "matched", label: "Matched Editors", icon: <Sparkles className="w-4 h-4" /> },
                  { id: "gallery", label: "General Gallery", icon: <ImageIcon className="w-4 h-4" /> },
                  { id: "standout", label: "My Standing", icon: <Target className="w-4 h-4" /> }
                ].filter(tab => !(isGuestMode && (tab.id === 'matched' || tab.id === 'standout'))).map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { const target = tab.id === "creators" ? "" : "/" + tab.id; navigate("/discovery" + target); }}
                      className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                        isActive 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-white/5 rounded-t-lg"
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {tab.icon} {tab.label}
                      </span>
                      {isActive && (
                        <>
                          <div className="absolute inset-0 bg-blue-500/5 rounded-t-lg transition-all" />
                          <div className="absolute bottom-[0px] left-0 right-0 h-[2px] bg-blue-500 z-10 transition-all" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>


            {activeTab === "matched" && (
                <div className="space-y-10">
                  {!isGuestMode && (
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
                  <span key={s} className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface text-zinc-600 dark:text-zinc-300 font-medium">
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
                    onClick={() => setSelectedCardUser(profile)}
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
                      <div className="mt-3"><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${profile.subscriptionType === 'Business' ? 'animate-rainbow' : profile.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}><Tag className="w-3 h-3" />{profile.tagline}</span></div>
                    )}

                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
                        Has {matched.length} of {activeJobSkills.length} skills you need
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(profile.rawSkills ? profile.rawSkills.filter(rs => matched.includes(rs.name)) : matched.map(s => ({ name: s }))).slice(0, 4).map((rs: any) => (
                            <span key={rs.name} className="relative inline-flex items-center gap-1 px-2 py-1 mt-1 mr-1 mb-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                              <CheckCircle2 className="h-2.5 w-2.5" /> 
                              <span>{rs.name}</span>
                              {rs.proficiency && (
                                <>
                                  <span className="opacity-40">|</span>
                                  <span className="capitalize">{rs.proficiency}</span>
                                </>
                              )}
                              {Number(rs.years) > 0 && (
                                <div className="absolute -top-1.5 -right-1.5 group/yoe z-10">
                                  <span className="bg-emerald-500 text-white text-[8px] leading-tight font-bold px-1 py-0.5 rounded shadow-sm cursor-help block">
                                    {rs.years}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-24 p-1.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-[9px] leading-snug rounded-lg opacity-0 invisible group-hover/yoe:opacity-100 group-hover/yoe:visible transition-all z-[100] text-center shadow-xl pointer-events-none font-normal normal-case tracking-normal">
                                    {rs.years} years of experience
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-zinc-200 dark:border-t-white/10" />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-white dark:border-t-zinc-800 -mt-[1.5px]" />
                                  </div>
                                </div>
                              )}
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
          )}
                </div>
              )}

              {activeTab === "creators" && (
                <div className="space-y-10">



          {/* ================= EXPLORE ALL ================= */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-400" /> Explore creators
                </h2>
                <p className="text-xs text-zinc-500">Browse everyone on Ensemble.</p>
              </div>
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-[28rem]">
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

            <div className="mb-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    How match percentages work
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 max-w-2xl">
                    The percentage you see beside a creator's card shows how well their skills match your active job postings. Want to see a ranked list of your best matches?
                  </p>
                </div>
                <button onClick={() => navigate("/discovery/matched")} className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                  See the Matches
                </button>
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
                      onClick={() => setSelectedCardUser(profile)}
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
                        {m && m.matched.length > 0 && <MatchRing percent={m.percent} />}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 line-clamp-2 min-h-[2rem]">
                        {profile.tagline && <span className="block mb-1.5"><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${profile.subscriptionType === 'Business' ? 'animate-rainbow' : profile.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}><Tag className="w-3 h-3" />{profile.tagline}</span></span>}{profile.bio || (profile.tagline ? "" : "No introduction provided.")}
                      </p>

                      <div className="flex items-end justify-between gap-3 mt-3">
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {(profile.rawSkills?.length ? profile.rawSkills : profile.skills.map(name => ({ name }))).slice(0, 3).map((rs: any) => {
                              const hit = matchedSet.has(norm(rs.name));
                              return (
                                <span
                                  key={rs.name}
                                  onClick={(e) => { e.stopPropagation(); setSearchInput(rs.name); setActiveQuery(rs.name); }}
                                  className={`relative inline-flex items-center gap-1 text-[10px] px-2 py-1 mt-1.5 mr-1.5 rounded-md border cursor-pointer transition ${
                                    hit
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold"
                                      : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10"
                                  }`}
                                >
                                  <span className="truncate max-w-[120px]">{rs.name}</span>
                                  {rs.proficiency && (
                                    <>
                                      <span className="opacity-30">|</span>
                                      <span className="capitalize text-blue-600 dark:text-blue-400">{rs.proficiency}</span>
                                    </>
                                  )}
                                  {Number(rs.years) > 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 group/yoe z-10">
                                      <span className="bg-emerald-500 text-white text-[8px] leading-tight font-bold px-1 py-0.5 rounded shadow-sm cursor-help block">
                                        {rs.years}
                                      </span>
                                    </div>
                                  )}
                                </span>
                              );
                            })}
                            {profile.skills.length > 3 && (
                              <span className="inline-flex items-center text-[10px] px-2 py-1 mt-1.5 text-zinc-500 bg-zinc-50 dark:bg-white/5 rounded-md border border-zinc-200 dark:border-white/10">
                                +{profile.skills.length - 3} more
                              </span>
                            )}
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
              <div className="sticky bottom-6 z-50 mx-auto w-fit flex items-center justify-center gap-1 rounded-full border border-gray-200 dark:border-white/20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 shadow-2xl shadow-blue-500/10 mt-8 mb-4">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm text-gray-400 font-medium disabled:opacity-50"
                  >Prev</button>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    if (totalPages > 5 && page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                      if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="px-1 text-gray-400">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
                  >Next</button>
                </div>
            )}
          </section>
              </div>
              )}

            {activeTab === "gallery" && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {galleryLoading ? (
                  <p className="text-zinc-500">Loading gallery...</p>
                ) : galleries.length === 0 ? (
                  <p className="text-zinc-500">No gallery posts found.</p>
                ) : (
                  galleries.map((item, i) => {
                    const cleanPath = item.file_url?.startsWith('/') ? item.file_url.substring(1) : item.file_url;
                    const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                    const assetUrl = cleanPath?.startsWith('http') ? cleanPath : `${cloudfrontUrl}/${cleanPath}`;
                    const isVideo = item.file_mimetype?.startsWith("video/");
                    return (
                      <div
                        key={item.gallery_id}
                        onClick={() => setSelectedGalleryItem(item)}
                        className="relative group rounded-2xl overflow-hidden break-inside-avoid bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 cursor-pointer shadow-sm hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        {isVideo ? (
                          <div className="relative w-full">
                            <video src={assetUrl} className="w-full h-auto object-cover" preload="metadata" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} muted loop />
                            <div className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full backdrop-blur-md">
                              <Play className="w-3.5 h-3.5 text-white" fill="currentColor" />
                            </div>
                          </div>
                        ) : (
                          <img src={assetUrl} alt={item.title} className="w-full h-auto object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                          <h4 className="text-white font-bold text-lg truncate">{item.title}</h4>
                          <p className="text-white/80 text-xs line-clamp-2 mt-1">{item.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <img src={item.avatar_url ? (item.avatar_url.startsWith('http') ? item.avatar_url : `${cloudfrontUrl}/${item.avatar_url}`) : '/default-avatar.png'} alt="" className="w-6 h-6 rounded-full" />
                            <span className="text-white/90 text-xs font-medium">@{item.handle}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
                  
            
            
            {activeTab === "standout" && (() => {
              const myProfile = profiles.find(p => String(p.id) === String(userInfo?.account_id)) || freelancers.find(p => String(p.id) === String(userInfo?.account_id));
              
              if (!myProfile) {
                 return (
                   <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center mt-10">
                     <p className="text-zinc-500">Loading your profile or you have no profile yet.</p>
                   </div>
                 );
              }
              
              // Calculate stats against my jobs
              const matchResults = otherJobs.map(job => {
                 return { job, match: computeMatch(myProfile, job.skills) };
              });
              const matchedJobs = matchResults.filter(r => r.match.matched.length > 0);
              
              const avgMatchPercent = matchedJobs.length > 0
                ? Math.round(matchedJobs.reduce((sum, r) => sum + r.match.percent, 0) / matchedJobs.length)
                : 0;

              const InfoTooltip = ({ text }: { text: string }) => (
                <div className="group relative inline-flex items-center ml-1.5 align-middle">
                  <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-help transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-[11px] leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] text-center shadow-xl pointer-events-none font-normal normal-case tracking-normal">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-zinc-200 dark:border-t-white/10" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-white dark:border-t-zinc-800 -mt-[2px]" />
                  </div>
                </div>
              );

              return (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-extrabold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-blue-500" /> How you stand out
                  </h2>
                  <p className="text-sm text-zinc-500 mt-2">
                    See exactly how your profile looks in the Discovery feed to clients, and track how well you match with other people's job postings.
                  </p>
                </div>
                
                <div className="flex flex-col gap-6">
                  
                  {/* Top Row: Card and Stats */}
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    
                    {/* Left: Card Preview */}
                    <div className="w-full lg:w-7/12 shrink-0 flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center">
                          Discovery Card Preview
                          <InfoTooltip text="This is a live preview of your public talent card as it appears in the Discovery feed to clients." />
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-1">This is how clients see your profile in the talent feed.</p>
                      </div>
                      
                      <div className="w-full flex-1 flex flex-col relative group rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 shadow-sm cursor-pointer overflow-visible" onClick={() => setSelectedCardUser(myProfile)}>
                        
                        {/* Upper Right Badge: Avg Match */}
                        {otherJobs.length > 0 && (
                          <div className="absolute -top-3 -right-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold shadow-sm z-10 transition-transform group-hover:-translate-y-1">
                            <ThumbsUp className="w-3 h-3 text-emerald-500" />
                            {avgMatchPercent}% Avg Match
                          </div>
                        )}

                        <div className="flex items-start gap-3 mt-1">
                          <img src={myProfile.avatar} alt="" className="h-14 w-14 rounded-full object-cover border border-zinc-200 dark:border-white/10 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-sm truncate">{myProfile.name}</h3>
                              <ProfileTags role={myProfile.roles as any} verificationLevel={myProfile.verified} subscriptionType={myProfile.subscriptionType} />
                            </div>
                            <p className="text-[11px] text-zinc-500 font-mono">@{myProfile.username}</p>
                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                              {myProfile.meritScore === "No Rating" ? (
                                <span>No rating</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  <b className="text-zinc-900 dark:text-white">{myProfile.meritScore}</b>
                                </span>
                              )}
                              <span><b className="text-zinc-900 dark:text-white">{myProfile.followersCount}</b> followers</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 min-h-[2rem] flex flex-col gap-1">
                          {myProfile.tagline && <div><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${myProfile.subscriptionType === 'Business' ? 'animate-rainbow' : myProfile.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}><Tag className="w-3 h-3" />{myProfile.tagline}</span></div>}
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3">{myProfile.bio || (myProfile.tagline ? "" : "No introduction provided.")}</p>
                        </div>
                        <div className="mt-auto pt-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(myProfile.rawSkills?.length ? myProfile.rawSkills : myProfile.skills.map(name => ({ name }))).map((rs: any) => (
                              <span
                                key={rs.name}
                                className="relative inline-flex items-center gap-1 px-2 py-1 mt-1.5 mr-1.5 mb-1.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/5"
                              >
                                <span>{rs.name}</span>
                                {rs.proficiency && (
                                  <>
                                    <span className="opacity-30">|</span>
                                    <span className="capitalize font-semibold text-blue-600 dark:text-blue-400">{rs.proficiency}</span>
                                  </>
                                )}
                                {Number(rs.years) > 0 && (
                                  <div className="absolute -top-1.5 -right-1.5 group/yoe z-10">
                                  <span className="bg-emerald-500 text-white text-[8px] leading-tight font-bold px-1 py-0.5 rounded shadow-sm cursor-help block">
                                    {rs.years}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-24 p-1.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-[9px] leading-snug rounded-lg opacity-0 invisible group-hover/yoe:opacity-100 group-hover/yoe:visible transition-all z-[100] text-center shadow-xl pointer-events-none font-normal normal-case tracking-normal">
                                    {rs.years} years of experience
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-zinc-200 dark:border-t-white/10" />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-white dark:border-t-zinc-800 -mt-[1.5px]" />
                                  </div>
                                </div>
                                )}
                              </span>
                            ))}
                            
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="w-full lg:w-5/12 flex flex-col flex-1">
                      <div className="mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center">
                          Market Competitiveness
                          <InfoTooltip text="Stats summarizing your profile's performance and match rates across other people's job postings." />
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-1">Overview of your standing in the marketplace.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 flex-1 h-full">
                        <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col justify-center">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center">
  Job Matches
  <InfoTooltip text="Total number of other people's job postings where you meet at least one required skill." />
                          </div>
                          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{matchedJobs.length}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">out of {otherJobs.length} open jobs</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col justify-center">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center">
  Top Match Rate
  <InfoTooltip text="Your highest skill overlap percentage across all other open job postings." />
                          </div>
                          <p className="text-3xl font-extrabold text-blue-500 mt-1">
                            {matchedJobs.length > 0 ? Math.max(...matchedJobs.map(r => r.match.percent)) : 0}%
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">highest skill overlap</p>
                        </div>
                                                  <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col justify-center relative">
                            <button onClick={() => navigate('/profile?tab=performance')} className="absolute top-3 right-3 text-zinc-400 hover:text-blue-500 transition-colors p-1 bg-zinc-50 dark:bg-zinc-800 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center pr-6">
    Your Rating
    <InfoTooltip text="Your average rating received from clients on completed jobs & gigs." />
                            </div>
                          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 flex items-center gap-1">
                            {myProfile.meritScore !== "No Rating" && <Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
                            {myProfile.meritScore}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">based on completed jobs & gigs</p>
                        </div>
                                                                            <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col justify-center relative group/followers cursor-pointer hover:border-blue-500/40 hover:shadow-md transition-all" onClick={() => setIsFollowersModalOpen(true)}>
                            <button className="absolute top-3 right-3 text-zinc-400 group-hover/followers:text-blue-500 transition-colors p-1 bg-zinc-50 dark:bg-zinc-800 rounded-full group-hover/followers:bg-blue-50 dark:group-hover/followers:bg-blue-900/30">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center pr-6">
    Followers
    <InfoTooltip text="The total number of creators and clients following your profile." />
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 group-hover/followers:text-blue-500 transition-colors">{myProfile.followersCount}</p>
                            <p className="text-[10px] text-zinc-400 mt-1">creators and clients</p>
                          </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Matching Jobs */}
                  <div className="w-full pt-8 border-t border-zinc-200 dark:border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center">
                      Your matching jobs
                      <InfoTooltip text="List of other people's job postings where your skills match the requirements." />
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {recLoading ? (
                        [1, 2].map(i => (
                          <div key={i} className="h-36 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse" />
                        ))
                      ) : matchedJobs.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic py-4">No job postings currently match your skills.</p>
                      ) : (
                        matchedJobs.map(r => {
                          const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                          const bannerUrl = r.job.thumbnailPath ? (r.job.thumbnailPath.startsWith('http') ? r.job.thumbnailPath : `${cloudfrontUrl}/${r.job.thumbnailPath}`) : null;
                          return (
                            <div key={r.job.id} className="flex flex-col rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/jobs/postings/${r.job.id}`)}>
                              {/* Banner */}
                              <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 relative">
                                {bannerUrl ? (
                                  <img src={bannerUrl} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
                                )}
                              </div>
                              <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface">
                                                                <div className="min-w-0 pr-4 flex-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{r.job.title}</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
                                    {r.match.matched.slice(0, 3).map((tag, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold truncate max-w-[80px]">{tag}</span>
                                    ))}
                                    {r.match.matched.length > 3 && (
                                      <span className="text-[10px] text-zinc-500">+{r.match.matched.length - 3}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500">{r.match.matched.length} of {r.job.skills.length} required skills</p>
                                </div>
                                <MatchRing percent={r.match.percent} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}

          </div>
        </div>

        {/* Lightbox for Gallery */}
      {selectedGalleryItem && (() => {
        const currentIndex = galleries.findIndex(i => i.gallery_id === selectedGalleryItem.gallery_id);
        const hasMultiple = galleries.length > 1;
        
        const handlePrev = (e) => {
          e.stopPropagation();
          setSelectedGalleryItem(galleries[(currentIndex - 1 + galleries.length) % galleries.length]);
        };
        
        const handleNext = (e) => {
          e.stopPropagation();
          setSelectedGalleryItem(galleries[(currentIndex + 1) % galleries.length]);
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-xl cursor-zoom-out" 
              onClick={() => setSelectedGalleryItem(null)} 
            />
            
            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl mx-4 border border-black/5 dark:border-white/10">
              
              <div className="flex flex-col w-full h-full overflow-y-auto overflow-x-hidden">
                {/* Media Container */}
                <div className="w-full bg-black/5 dark:bg-black/30 flex items-center justify-center relative min-h-[40vh] max-h-[70vh]">
                  {(() => {
                    const cleanPath = selectedGalleryItem.file_url?.startsWith('/') ? selectedGalleryItem.file_url.substring(1) : selectedGalleryItem.file_url;
                    const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                    const assetUrl = cleanPath?.startsWith('http') ? cleanPath : `${cloudfrontUrl}/${cleanPath}`;
                    const isVideo = selectedGalleryItem.file_mimetype?.startsWith("video/");
                    return isVideo ? (
                      <video 
                        src={assetUrl} 
                        className="max-w-full max-h-[70vh] object-contain drop-shadow-2xl"
                        controls
                        autoPlay
                      />
                    ) : (
                      <img 
                        src={assetUrl} 
                        alt={selectedGalleryItem.title} 
                        className="max-w-full max-h-[70vh] object-contain drop-shadow-2xl"
                      />
                    );
                  })()}
                  
                  {/* Watermark */}
                  <div className="absolute top-4 left-4 text-white/50 bg-black/40 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md pointer-events-none select-none drop-shadow-md">
                    Uploaded from Ensemble
                  </div>
                </div>

                {/* Bottom Info Section */}
                <div className="w-full bg-white/40 dark:bg-zinc-900/60 border-t border-white/30 dark:border-white/10 flex flex-col p-6 lg:p-8">
                  <div className="flex items-start justify-between mb-4 pr-8 lg:pr-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGalleryItem.title}</h2>
                    
                    {/* Owner Info & View Profile Button */}
                    <div className="flex items-center gap-3 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-black/5 dark:border-white/5">
                      {(() => {
                         const avatarCleanPath = selectedGalleryItem.avatar_url?.startsWith('/') ? selectedGalleryItem.avatar_url.substring(1) : selectedGalleryItem.avatar_url;
                         const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                         const avatarUrl = avatarCleanPath?.startsWith('http') ? avatarCleanPath : (avatarCleanPath ? `${cloudfrontUrl}/${avatarCleanPath}` : '/default-avatar.png');
                         return (
                           <img 
                             src={avatarUrl} 
                             alt="" 
                             className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-white/10" 
                           />
                         );
                      })()}
                      <div className="hidden sm:block">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{selectedGalleryItem.display_name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400">@{selectedGalleryItem.handle}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (isGuestMode) {
                            setSelectedGalleryItem(null);
                            setIsModalOpen(true);
                          } else {
                            navigate(`/profile/${selectedGalleryItem.account_id}`);
                          }
                        }}
                        className="ml-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300">
                    {selectedGalleryItem.description ? (
                      <p className="whitespace-pre-wrap">{selectedGalleryItem.description}</p>
                    ) : (
                      <p className="italic text-gray-500 dark:text-zinc-500">No description provided.</p>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                    Uploaded on {selectedGalleryItem.created_at ? new Date(selectedGalleryItem.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'Unknown date'}
                  </div>
                </div>
              </div>

              {hasMultiple && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedGalleryItem(null)}
                className="absolute top-4 right-4 p-2.5 bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })()}

      
      {selectedCardUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedCardUser(null)}>
          <div onClick={e => e.stopPropagation()} className="relative flex flex-col items-center">
            <button onClick={() => setSelectedCardUser(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md">
              <X className="w-5 h-5" />
            </button>
            <FlipCard
              width={340}
              height={520}
              shadow={false}
              front={
                <div className="w-full h-full flex flex-col p-8 items-center justify-center bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 relative overflow-hidden rounded-[22px]">
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
                  
                  <img src={selectedCardUser.avatar} className="w-28 h-28 rounded-full object-cover border-4 border-zinc-100 dark:border-white/10 mb-5 z-10 shadow-sm" />
                  <h2 className="text-2xl font-bold z-10 text-center">{selectedCardUser.name}</h2>
                  
                  <div className="flex items-center justify-center gap-1.5 mt-1 z-10">
                    <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm">@{selectedCardUser.username}</p>
                    {selectedCardUser.verified && (
                      <img 
                        src="/icons/verification/lvl2_verified.png" 
                        alt="Verified User" 
                        className="h-4 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                        title="Verified"
                      />
                    )}
                    <img 
                      src={selectedCardUser.subscriptionType === "Business" ? "/icons/subscription/studio.png" : selectedCardUser.subscriptionType === "Premium" ? "/icons/subscription/premium.png" : "/icons/subscription/freemium.png"} 
                      alt={`${selectedCardUser.subscriptionType || 'Free'} Tier`} 
                      className="h-4 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                      title={`${selectedCardUser.subscriptionType || 'Free'} Member`}
                    />
                  </div>
                  
                  {selectedCardUser.tagline && (
                    <div className="mt-4 z-10">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg ${selectedCardUser.subscriptionType === 'Business' ? 'animate-rainbow' : selectedCardUser.subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}>
                        <Tag className="w-3.5 h-3.5" />
                        {selectedCardUser.tagline}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 px-3 py-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest z-10 text-center line-clamp-1 max-w-full text-zinc-500 dark:text-zinc-400 shadow-sm">
                    {selectedCardUser.roles && selectedCardUser.roles.length > 0 
                      ? selectedCardUser.roles.map((r: any) => r.role_name).join(" | ") 
                      : "Freelancer"}
                  </div>
                  
                  <div className="mt-8 flex items-center justify-center gap-8 z-10 w-full px-4 mb-2">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Followers</div>
                      <div className="font-bold text-xl">{selectedCardUser.followersCount}</div>
                    </div>
                    <div className="w-px h-8 bg-zinc-200 dark:bg-white/10" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Rating</div>
                      <div className="font-bold text-xl flex items-center justify-center gap-1">
                        {selectedCardUser.meritScore !== "No Rating" ? <><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {selectedCardUser.meritScore}</> : <span className="text-sm">New</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-5 text-[10px] text-zinc-400 uppercase tracking-widest font-mono animate-pulse">
                    Click to flip
                  </div>
                </div>
              }
              back={
                <div className="w-full h-full flex flex-col p-7 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 rounded-[22px]">
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    
                    {selectedCardUser.email && (
                      <div className="mb-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Email</h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{selectedCardUser.email}</p>
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Bio</h3>
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-4">{selectedCardUser.bio || "No bio provided."}</p>
                    </div>
                    
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Stats</h3>
                    <div className="grid grid-cols-2 gap-1.5 mb-4 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                        <div className="font-bold text-zinc-900 dark:text-white text-base">{selectedCardUser.totalJobs || 0}</div>
                        <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Job Posts</div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                        <div className="font-bold text-zinc-900 dark:text-white text-base">{selectedCardUser.totalServices || 0}</div>
                        <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Services</div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10">
                        <div className="font-bold text-zinc-900 dark:text-white text-base">{selectedCardUser.totalAssets || 0}</div>
                        <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Assets</div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-white/5 p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 flex flex-col justify-center">
                        <div className="font-bold text-zinc-900 dark:text-white text-[11px] leading-tight">{selectedCardUser.joinedDate ? new Date(selectedCardUser.joinedDate).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">Joined</div>
                      </div>
                    </div>

                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Skills</h3>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {selectedCardUser.rawSkills && selectedCardUser.rawSkills.length > 0 ? (
                        <>
                          {selectedCardUser.rawSkills.slice(0, 3).map((s: any, idx) => (
                            <div key={idx} className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-white/10">
                              <span className="truncate mr-2">{s.name}</span>
                              <span className="text-zinc-400 font-normal shrink-0 whitespace-nowrap">{s.proficiency} &bull; {s.years}y</span>
                            </div>
                          ))}
                          {selectedCardUser.rawSkills.length > 3 && (
                            <div className="text-center text-[9px] font-bold tracking-widest text-zinc-400/80 uppercase mt-0.5">
                              +{selectedCardUser.rawSkills.length - 3} MORE
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCardUser.skills.length > 0 ? (
                            <>
                              {selectedCardUser.skills.slice(0, 3).map((s) => (
                                <span key={s} className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-white/10">{s}</span>
                              ))}
                              {selectedCardUser.skills.length > 3 && (
                                <span className="px-2.5 py-1 text-[10px] font-bold bg-transparent text-zinc-400/80 rounded-lg">
                                  +{selectedCardUser.skills.length - 3} MORE
                                </span>
                              )}
                            </>
                          ) : <p className="text-xs text-zinc-500 italic">No skills listed</p>}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              }
            />
                        <div className="mt-6 flex flex-col gap-2 w-[340px]">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!userInfo) return setIsModalOpen(true);
                  setIsInviteModalOpen(true); 
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white border border-transparent text-sm font-bold rounded-[16px] transition-all shadow-lg shadow-blue-500/20"
              >
                Invite to Job
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${selectedCardUser.id}`); }}
                className="w-full py-3.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 text-sm font-bold rounded-[16px] transition-all shadow-sm"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <GuestLoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <InviteToJobModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} freelancerId={selectedCardUser?.id || ""} freelancerName={selectedCardUser?.name || ""} />

      {isFollowersModalOpen && userInfo?.account_id && (
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          accountId={userInfo.account_id}
          type="followers"
        />
      )}

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







