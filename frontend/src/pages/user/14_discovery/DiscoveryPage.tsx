import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Search, User, ArrowRight, Star, ChevronLeft, ChevronRight, MessageCircle,
  Sparkles, Briefcase, CheckCircle2, Users, Plus, Target, Play, ImageIcon, X, Info,
  ThumbsUp, Tag, ExternalLink, Shuffle, Dices, HelpCircle, SlidersHorizontal,
  ShieldCheck, Layers, Award
} from "lucide-react";
import { FollowersModal } from "@/pages/user/7_profile/Displays/FollowersModal.tsx";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { InviteToJobModal } from "@/components/ui/InviteToJobModal";
import DiscoveryFlipCardModal from "@/components/ui/DiscoveryFlipCardModal";
import { DeactivatedBadge } from "@/components/account/DeactivatedBadge";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { bannerPresetUrl, resolveBannerPreset } from "@/lib/profileBanners";
import {
  computeDiscoveryScore,
  computeSkillMatch,
  seededRandomUnit,
  type DiscoveryScoreBreakdown,
} from "./discovery_ranking";

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
  ratingCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy?: boolean;
  badges?: { id: string; display_order: number | null }[];
  bannerPreset?: string | null;
  email?: string;
  joinedDate?: string;
  totalJobs?: number;
  totalServices?: number;
  totalAssets?: number;
  tagline: string;
  deactivated?: boolean;
}

interface MyJob {
  id: string;
  title: string;
  skills: string[];
  createdAt: string;
  thumbnailPath?: string;
}

interface MatchResult {
  profile: UserProfile;
  matched: string[];
  percent: number;
  score: number;
  discoveryBreakdown: DiscoveryScoreBreakdown;
}

const norm = (s: string) => s.trim().toLowerCase();

const mapAccount = (account: any, _cloudfront: string): UserProfile => {
  const avatarPath = account.avatar_preset_url || "";
  const name = account.full_name || account.display_name || account.handle;
  return {
    id: String(account.account_id),
    name,
    username: account.handle,
    avatar: constructAvatarUrl(avatarPath, name),
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
    ratingCount: parseInt(account.rating_count || "0", 10),
    followersCount: parseInt(account.followers_count || "0", 10),
    followingCount: parseInt(account.following_count || "0", 10),
    isFollowing: !!account.is_following,
    email: account.email || account.email_address || "",
    joinedDate: account.joined_date || account.created_at || "",
    totalJobs: Number(account.total_jobs) || 0,
    totalServices: Number(account.total_services) || 0,
    totalAssets: Number(account.total_assets) || 0,
    isFollowedBy: !!account.is_followed_by,
    badges: Array.isArray(account.badges) ? account.badges : [],
    bannerPreset: account.banner_preset ?? null,
    deactivated: String(account.status || "").toLowerCase() === "deactivated",
  };
};

const computeMatch = (
  profile: UserProfile,
  jobSkills: string[],
  seed = 1
): MatchResult => {
  const skillMatch = computeSkillMatch(profile, jobSkills);
  const discoveryBreakdown = computeDiscoveryScore(profile, jobSkills, seed);
  return {
    profile,
    matched: skillMatch.matched,
    percent: skillMatch.percent,
    score: skillMatch.rawScore + discoveryBreakdown.reputationPts * 5,
    discoveryBreakdown,
  };
};

/* Circular match score ring (solid strokes, no gradients) */
const MatchRing: React.FC<{ percent: number; size?: number; label?: string }> = ({
  percent,
  size = 46,
  label,
}) => {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color =
    percent >= 75
      ? "text-emerald-500"
      : percent >= 40
        ? "text-blue-500"
        : "text-zinc-400";
  return (
    <div
      className="relative shrink-0 bg-white dark:bg-zinc-900 rounded-full shadow-xs"
      style={{ width: size, height: size }}
      title={label || `${percent}% skill match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          className="stroke-zinc-200 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, Math.max(0, percent)) / 100) * c}
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-zinc-900 dark:text-white">
        {percent}%
      </span>
    </div>
  );
};

export default function DiscoveryPage() {
  const navigate = useNavigate();
  const userInfo = useGlobalState((state) => state.user);
  const { openChatWithUser } = useOutletContext<{
    openChatWithUser: (target?: {
      name: string;
      avatarUrl?: string;
      account_id: string;
    }) => void;
  }>();

  const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
    /\/$/,
    ""
  );

  // Explore state
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedCardUser, setSelectedCardUser] = useState<UserProfile | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [myProfileData, setMyProfileData] = useState<UserProfile | null>(null);
  const myHandle = userInfo?.username || userInfo?.handle;

  // Seeded Exploration state (initializes randomly per page mount, updates on Shuffle click)
  const [shuffleSeed, setShuffleSeed] = useState<number>(() =>
    Math.floor(100000 + Math.random() * 900000)
  );
  const [shuffleCount, setShuffleCount] = useState(0);

  useEffect(() => {
    if (!userInfo?.account_id) return;
    const fetchMyProfile = async () => {
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { account_id: userInfo.account_id, include_self: "true" },
        });
        const data = response.data?.data || [];
        if (data.length > 0) {
          setMyProfileData(mapAccount(data[0], cloudfront));
        } else if (myHandle) {
          const fallbackRes = await api.get("/api/accounts/search-users", {
            params: { handle: myHandle, include_self: "true" },
          });
          const me = (fallbackRes.data?.data || []).find(
            (a: any) => String(a.account_id) === String(userInfo.account_id)
          );
          if (me) setMyProfileData(mapAccount(me, cloudfront));
        }
      } catch (err) {
        console.error("Failed to load profile for standing tab:", err);
      }
    };
    fetchMyProfile();
  }, [userInfo?.account_id, myHandle, cloudfront]);

  const [roleFilter, setRoleFilter] = useState("Freelancer");
  const [sortOption, setSortOption] = useState<
    "smart_discovery" | "pure_random" | "best_match" | "top_rated" | "following"
  >("smart_discovery");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Recommendation state
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [otherJobs, setOtherJobs] = useState<MyJob[]>([]);
  const [freelancers, setFreelancers] = useState<UserProfile[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [recLoading, setRecLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);

  const { tab } = useParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<
    "creators" | "matched" | "gallery" | "standout" | "info"
  >((tab as any) || "creators");

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as any);
    } else {
      setActiveTab("creators");
    }
  }, [tab]);

  const [galleries, setGalleries] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<any | null>(
    null
  );

  const isGuestMode = userInfo?.role === "guest" || !userInfo;

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const res = await api.get("/api/accounts/galleries/all");
        const d = res.data;
        setGalleries(
          Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []
        );
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
          api
            .get("/api/accounts/search-users", {
              params: { role: "Freelancer" },
            })
            .catch(() => ({ data: { data: [] } })),
        ]);
        const jobs: MyJob[] = (jobsRes.data?.data || [])
          .filter(
            (j: any) =>
              (j.is_personal_post || j.is_own_post || j.is_manageable_post) &&
              j.status === "Open"
          )
          .filter((j: any) => Array.isArray(j.tags) && j.tags.length > 0)
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5)
          .map((j: any) => ({
            id: j.job_id,
            title: j.title,
            skills: j.tags,
            createdAt: j.created_at,
            thumbnailPath: j.thumbnail_path,
          }));
        setMyJobs(jobs);
        setOtherJobs(
          (jobsRes.data?.data || [])
            .filter(
              (j: any) =>
                !(
                  j.is_personal_post ||
                  j.is_own_post ||
                  j.is_manageable_post
                ) && j.status === "Open"
            )
            .map((j: any) => ({
              id: j.job_id,
              title: j.title,
              skills: j.tags || [],
              createdAt: j.created_at,
              thumbnailPath: j.thumbnail_path,
            }))
        );
        const rawFreelancers = flRes.data?.data || [];
        const seenFlIds = new Set<string>();
        const uniqueFreelancerAccounts: any[] = [];
        for (const a of rawFreelancers) {
          const id = String(a.account_id || a.user_id || a.id);
          if (!seenFlIds.has(id)) {
            seenFlIds.add(id);
            uniqueFreelancerAccounts.push(a);
          }
        }
        setFreelancers(
          uniqueFreelancerAccounts.map((a: any) => mapAccount(a, cloudfront))
        );
      } finally {
        setRecLoading(false);
      }
    };
    load();
  }, [userInfo?.account_id, cloudfront]);

  const allMySkills = useMemo(
    () =>
      Array.from(
        new Map(
          myJobs.flatMap((j) => j.skills).map((s) => [norm(s), s])
        ).values()
      ),
    [myJobs]
  );

  const activeJobSkills = useMemo(() => {
    if (selectedJobId === "all") return allMySkills;
    return myJobs.find((j) => j.id === selectedJobId)?.skills || [];
  }, [selectedJobId, myJobs, allMySkills]);

  const recommendations = useMemo(() => {
    const seen = new Set<string>();
    const uniquePool: UserProfile[] = [];
    for (const f of freelancers) {
      const idStr = String(f.id);
      if (!seen.has(idStr) && idStr !== String(userInfo?.account_id)) {
        seen.add(idStr);
        uniquePool.push(f);
      }
    }

    return uniquePool
      .map((p) => computeMatch(p, activeJobSkills, shuffleSeed))
      .filter((m) => m.matched.length > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.percent - a.percent ||
          b.matched.length - a.matched.length
      )
      .slice(0, 6);
  }, [freelancers, activeJobSkills, userInfo?.account_id, shuffleSeed]);

  /* ---------- Explore list ---------- */
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (activeQuery.trim())
          params.handle = activeQuery.replace(/^@/, "").trim();
        if (roleFilter !== "All") params.role = roleFilter;
        const response = await api.get("/api/accounts/search-users", {
          params,
        });
        const rawProfiles = response.data?.data || [];
        const seenProfIds = new Set<string>();
        const uniqueProfileAccounts: any[] = [];
        for (const a of rawProfiles) {
          const id = String(a.account_id || a.user_id || a.id);
          if (!seenProfIds.has(id)) {
            seenProfIds.add(id);
            uniqueProfileAccounts.push(a);
          }
        }
        setProfiles(
          uniqueProfileAccounts.map((a: any) => mapAccount(a, cloudfront))
        );
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [activeQuery, userInfo?.account_id, roleFilter, cloudfront]);

  const scoredProfiles = useMemo(() => {
    let result = [...profiles];
    if (userInfo?.account_id) {
      result = result.filter(
        (p) => String(p.id) !== String(userInfo.account_id)
      );
    }

    const withBreakdown = result.map((profile) => ({
      profile,
      breakdown: computeDiscoveryScore(profile, allMySkills, shuffleSeed),
      pureRandomVal: seededRandomUnit(profile.id, shuffleSeed + 7919),
    }));

    if (sortOption === "following") {
      return withBreakdown.filter((item) => item.profile.isFollowing);
    }

    if (sortOption === "pure_random") {
      withBreakdown.sort((a, b) => b.pureRandomVal - a.pureRandomVal);
      return withBreakdown;
    }

    if (sortOption === "top_rated") {
      withBreakdown.sort(
        (a, b) =>
          (parseFloat(String(b.profile.meritScore)) || 0) -
            (parseFloat(String(a.profile.meritScore)) || 0) ||
          b.breakdown.totalScore - a.breakdown.totalScore
      );
      return withBreakdown;
    }

    if (sortOption === "best_match" && allMySkills.length > 0) {
      withBreakdown.sort(
        (a, b) =>
          b.breakdown.matchPts - a.breakdown.matchPts ||
          b.breakdown.totalScore - a.breakdown.totalScore
      );
      return withBreakdown;
    }

    // Default: "smart_discovery" -> Weighted Random / Stratified Exploration (70% Multi-Factor + 30% Seeded Jitter)
    withBreakdown.sort(
      (a, b) => b.breakdown.totalScore - a.breakdown.totalScore
    );
    return withBreakdown;
  }, [profiles, sortOption, allMySkills, userInfo?.account_id, shuffleSeed]);

  const totalPages = Math.ceil(scoredProfiles.length / ITEMS_PER_PAGE);
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return scoredProfiles.slice(start, start + ITEMS_PER_PAGE);
  }, [scoredProfiles, currentPage]);

  useEffect(
    () => setCurrentPage(1),
    [roleFilter, sortOption, activeQuery, shuffleSeed]
  );

  const handleReshuffle = () => {
    const nextSeed = Math.floor(100000 + Math.random() * 900000);
    setShuffleSeed(nextSeed);
    setShuffleCount((c) => c + 1);
    if (
      sortOption !== "smart_discovery" &&
      sortOption !== "pure_random"
    ) {
      setSortOption("smart_discovery");
    }
    toast.success(
      sortOption === "pure_random"
        ? "Reshuffled with Pure Uniform Random!"
        : "Feed reshuffled with new exploration seed!"
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput);
  };

  const applyFollow = (id: string, following: boolean) => {
    const upd = (list: UserProfile[]) =>
      list.map((p) =>
        p.id === id
          ? {
              ...p,
              isFollowing: following,
              followersCount: Math.max(
                0,
                p.followersCount + (following ? 1 : -1)
              ),
            }
          : p
      );
    setProfiles(upd);
    setFreelancers(upd);
  };

  const handleFollowToggle = async (
    e: React.MouseEvent,
    profileId: string,
    currentlyFollowing: boolean
  ) => {
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
    `px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
      active
        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
        : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
    }`;

  const ActionButtons: React.FC<{ profile: UserProfile; compact?: boolean }> = ({
    profile,
    compact,
  }) =>
    userInfo?.account_id === profile.id ? null : (
      <div className="flex items-center gap-2 shrink-0">
        {profile.isFollowing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openChatWithUser({
                name: profile.name,
                avatarUrl: profile.avatar,
                account_id: profile.id,
              });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-blue-500 hover:border-blue-500/40 transition"
            title="Message"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) =>
            handleFollowToggle(e, profile.id, profile.isFollowing)
          }
          className={`${compact ? "px-3.5" : "px-4"} py-1.5 text-xs font-bold rounded-full border transition cursor-pointer ${
            profile.isFollowing
              ? "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white hover:text-red-500 hover:border-red-300 dark:hover:border-red-500/30"
              : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {profile.isFollowing
            ? "Following"
            : profile.isFollowedBy
              ? "Follow Back"
              : "Follow"}
        </button>
      </div>
    );

  const selectedJob = myJobs.find((j) => j.id === selectedJobId);

  /* Reusable Creator Card with Banner Header & Clean Profile Section */
  const renderCreatorCard = (
    profile: UserProfile,
    breakdown: DiscoveryScoreBreakdown,
    idx?: number
  ) => {
    const effectiveBanner = resolveBannerPreset(
      profile.bannerPreset ?? null,
      profile.username || profile.name || profile.id
    );
    const bannerUrl = bannerPresetUrl(effectiveBanner);
    const matchedSet = new Set(breakdown.matchedSkills.map(norm));

    return (
      <div
        key={profile.id}
        onClick={() => setSelectedCardUser(profile)}
        style={idx !== undefined ? { animationDelay: `${idx * 40}ms` } : undefined}
        className="group relative flex flex-col rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md animate-fade-in"
      >
        {/* Top Banner Strip */}
        <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden shrink-0">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}

          {/* Discreet Top Right Indicator */}
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
            {sortOption === "pure_random" ? (
              <span
                title="Uniform Random Mode"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 text-[10px] font-medium"
              >
                <Dices className="w-3 h-3" />
                Random Pick
              </span>
            ) : breakdown.matchedSkills.length > 0 ? (
              <span
                title={`Matches ${breakdown.matchedSkills.length} of your open job skills`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 text-[10px] font-medium"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Matched
              </span>
            ) : null}
          </div>
        </div>

        {/* Main Card Body */}
        <div className="p-4 pt-0 flex-1 flex flex-col">
          {/* Avatar + Creator Name Header (Avatar floats over banner, text sits cleanly on card body) */}
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <img
                src={profile.avatar}
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = getFallbackAvatarUrl(profile.name);
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
                alt=""
                className="h-16 w-16 rounded-full object-cover border-4 border-white dark:border-dark-surface bg-white dark:bg-zinc-900 shadow-md shrink-0 -mt-8"
              />
              <div className="min-w-0 flex-1 pt-1.5">
                {/* Line 1: Creator Name + Verification & Tier Icons */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                    {profile.name}
                  </h3>
                  {profile.verified && (
                    <img
                      src="/icons/verification/lvl2_verified.png"
                      alt="Verified"
                      className="h-4 w-4 shrink-0 object-contain"
                      title="Verified User"
                    />
                  )}
                  {profile.subscriptionType && profile.subscriptionType !== "Free" && (
                    <img
                      src={
                        profile.subscriptionType === "Business"
                          ? "/icons/subscription/studio.png"
                          : "/icons/subscription/premium.png"
                      }
                      alt={profile.subscriptionType}
                      className="h-4 w-4 shrink-0 object-contain"
                      title={`${profile.subscriptionType} Member`}
                    />
                  )}
                  {profile.deactivated && <DeactivatedBadge />}
                </div>

                {/* Line 2: @handle + Role Tag */}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-zinc-500 font-mono truncate">
                    @{profile.username}
                  </p>
                  {profile.roles?.[0]?.role_name && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-white/5">
                      {profile.roles[0].role_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Match Ring if there is a match with user's jobs */}
            {allMySkills.length > 0 && breakdown.matchedSkills.length > 0 && (
              <div className="pt-2 shrink-0">
                <MatchRing
                  percent={breakdown.matchPercent}
                  size={38}
                  label={`${breakdown.matchPercent}% skill match with your open job requirements`}
                />
              </div>
            )}
          </div>

          {/* Metrics Row: Rating, Followers, Services/Assets */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5 pb-2.5 border-b border-zinc-100 dark:border-white/5">
            {profile.meritScore === "No Rating" ? (
              <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <Star className="h-3 w-3 text-zinc-400" />
                <span>New talent</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <b className="text-zinc-900 dark:text-white">
                  {profile.meritScore}
                </b>
                {profile.ratingCount > 0 && (
                  <span className="text-[10px] text-zinc-400">
                    ({profile.ratingCount})
                  </span>
                )}
              </span>
            )}
            <span>•</span>
            <span>
              <b className="text-zinc-900 dark:text-white">
                {profile.followersCount}
              </b>{" "}
              followers
            </span>
            {(Number(profile.totalServices) > 0 ||
              Number(profile.totalAssets) > 0) && (
              <>
                <span>•</span>
                <span>
                  <b className="text-zinc-900 dark:text-white">
                    {(Number(profile.totalServices) || 0) +
                      (Number(profile.totalAssets) || 0)}
                  </b>{" "}
                  works
                </span>
              </>
            )}
          </div>

          {/* Tagline + Bio */}
          <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[2.25rem] mb-3">
            {profile.tagline && (
              <span className="block mb-1">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    profile.subscriptionType === "Business"
                      ? "animate-rainbow"
                      : profile.subscriptionType === "Premium"
                        ? "animate-gold-solid"
                        : "silver-solid"
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {profile.tagline}
                </span>
              </span>
            )}
            {profile.bio ||
              (profile.tagline ? "" : "No introduction provided yet.")}
          </div>

          {/* Skills + Action Buttons Footer */}
          <div className="mt-auto pt-2 flex items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1 min-w-0">
              {(profile.rawSkills?.length
                ? profile.rawSkills
                : profile.skills.map((name) => ({ name }))
              )
                .slice(0, 3)
                .map((rs: any) => {
                  const hit = matchedSet.has(norm(rs.name));
                  return (
                    <span
                      key={rs.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchInput(rs.name);
                        setActiveQuery(rs.name);
                      }}
                      className={`relative inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition ${
                        hit
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                          : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate max-w-[105px]">{rs.name}</span>
                      {rs.proficiency && (
                        <>
                          <span className="opacity-30">|</span>
                          <span className="capitalize text-blue-600 dark:text-blue-400">
                            {rs.proficiency}
                          </span>
                        </>
                      )}
                      {Number(rs.years) > 0 && (
                        <span className="ml-0.5 bg-emerald-500 text-white text-[8px] leading-tight font-bold px-1 py-0.2 rounded">
                          {rs.years}y
                        </span>
                      )}
                    </span>
                  );
                })}
              {profile.skills.length > 3 && (
                <span className="inline-flex items-center text-[10px] px-2 py-0.5 text-zinc-500 bg-zinc-50 dark:bg-white/5 rounded-md border border-zinc-200 dark:border-white/10">
                  +{profile.skills.length - 3}
                </span>
              )}
              {profile.skills.length === 0 && (
                <span className="text-[10px] text-zinc-400 italic">
                  No skills listed
                </span>
              )}
            </div>
            <ActionButtons profile={profile} compact />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-50 dark:bg-dark-base text-zinc-900 dark:text-white overflow-hidden">
      <UserHeader pageTitle="Discovery" />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div
          className="mx-auto max-w-6xl p-6 md:p-8 space-y-8"
          data-tour="discovery-container"
        >
          {/* MODERN SEGMENTED CAPSULE TABS */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-white/10 w-fit mb-6 -mt-3 shadow-2xs">
            {[
              {
                id: "creators",
                label: "Discover Creators",
                icon: <Users className="w-4 h-4" />,
              },
              {
                id: "matched",
                label: "Matched Editors",
                icon: <Sparkles className="w-4 h-4" />,
                badge: recommendations.length > 0 ? recommendations.length : null,
              },
              {
                id: "gallery",
                label: "General Gallery",
                icon: <ImageIcon className="w-4 h-4" />,
              },
              {
                id: "standout",
                label: "My Standing",
                icon: <Target className="w-4 h-4" />,
              },
              {
                id: "info",
                label: "How Discovery Works",
                icon: <HelpCircle className="w-4 h-4" />,
              },
            ]
              .filter(
                (tabItem) =>
                  !(
                    isGuestMode &&
                    (tabItem.id === "matched" || tabItem.id === "standout")
                  )
              )
              .map((tabItem) => {
                const isActive = activeTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => {
                      const target =
                        tabItem.id === "creators" ? "" : "/" + tabItem.id;
                      navigate("/discovery" + target);
                    }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer select-none ${
                      isActive
                        ? "text-zinc-900 dark:text-white"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDiscoveryTabPill"
                        className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xs border border-zinc-200/80 dark:border-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="shrink-0">{tabItem.icon}</span>
                      <span>{tabItem.label}</span>
                      {tabItem.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none ${
                            isActive
                              ? "bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200"
                              : "bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {tabItem.badge}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* ================= TAB 2: MATCHED EDITORS ================= */}
          {activeTab === "matched" && (
            <div className="space-y-6 animate-fade-in">
              {!isGuestMode && (
                <>
                  {/* Clean Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold flex items-center gap-2">
                        <Sparkles className="h-5 w-5" /> Matched Editors
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {recLoading
                          ? "Finding your best matches based on required skills..."
                          : myJobs.length === 0
                            ? "Post a job to automatically match with talented editors."
                            : recommendations.length > 0
                              ? `${recommendations.length} editor${recommendations.length > 1 ? "s" : ""} matched for ${selectedJob ? `"${selectedJob.title}"` : "your open jobs"}`
                              : "No freelancers match all required skills for this job yet."}
                      </p>
                    </div>
                    {myJobs.length > 0 && (
                      <button
                        onClick={() => navigate("/jobs/postings")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-blue-500/50 hover:text-blue-500 transition cursor-pointer self-start sm:self-auto shadow-2xs"
                      >
                        <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Manage Jobs</span>
                      </button>
                    )}
                  </div>

                  {/* Job selector chips & matching skills bar */}
                  {myJobs.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-100 dark:border-white/5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setSelectedJobId("all")}
                          className={chip(selectedJobId === "all")}
                        >
                          All open jobs
                        </button>
                        {myJobs.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setSelectedJobId(j.id)}
                            className={`${chip(selectedJobId === j.id)} max-w-[220px] truncate`}
                            title={j.title}
                          >
                            {j.title}
                          </button>
                        ))}
                      </div>

                      {activeJobSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] text-zinc-400 font-medium mr-0.5">
                            Required skills:
                          </span>
                          {activeJobSkills.slice(0, 5).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold"
                            >
                              {s}
                            </span>
                          ))}
                          {activeJobSkills.length > 5 && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              +{activeJobSkills.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content (Direct Grid with no encasing container) */}
                  {recLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-56 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : myJobs.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center">
                      <Briefcase className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                      <p className="text-sm font-semibold">
                        You have no open job posts with required skills.
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 mb-4">
                        Create one and we'll surface freelancers whose skills fit it.
                      </p>
                      <button
                        onClick={() => navigate("/jobs/postings/choose")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Post a job
                      </button>
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center text-xs text-zinc-500">
                      No freelancers list these skills yet. Try another job or explore everyone in Discover Creators.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendations.map(({ profile }, idx) => {
                        const breakdown = computeDiscoveryScore(
                          profile,
                          activeJobSkills,
                          shuffleSeed
                        );
                        return renderCreatorCard(profile, breakdown, idx);
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= TAB 1: DISCOVER CREATORS ================= */}
          {activeTab === "creators" && (
            <div className="space-y-6">
              <section>
                {/* Header + Search + Shuffle Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <Users className="h-5 w-5" /> Explore Creators
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Discover video editors and creators across the platform.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <form
                      onSubmit={handleSearchSubmit}
                      className="relative flex-1 sm:w-72"
                    >
                      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search name, @handle, or skill..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500/50"
                      />
                    </form>

                    <button
                      type="button"
                      onClick={handleReshuffle}
                      title="Generate a fresh shuffle seed for exploration"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle</span>
                      {shuffleCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-mono">
                          #{shuffleCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filter and Sorting Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-zinc-100 dark:border-white/5">
                  {/* Left: Role Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["All", "Freelancer", "Client", "Enthusiast"].map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRoleFilter(r);
                          setCurrentPage(1);
                        }}
                        className={chip(roleFilter === r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Right: Sort Options + Link to Info */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setSortOption("smart_discovery")}
                      className={chip(sortOption === "smart_discovery")}
                      title="Exploration algorithm: weighted relevance with random discovery"
                    >
                      <Sparkles className="w-3 h-3" />
                      Discovery Feed
                    </button>
                    <button
                      onClick={() => {
                        setSortOption("pure_random");
                        setShuffleSeed(
                          Math.floor(100000 + Math.random() * 900000)
                        );
                      }}
                      className={chip(sortOption === "pure_random")}
                      title="Random exploration pick"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      Random
                    </button>
                    {allMySkills.length > 0 && (
                      <button
                        onClick={() =>
                          setSortOption(
                            sortOption === "best_match"
                              ? "smart_discovery"
                              : "best_match"
                          )
                        }
                        className={chip(sortOption === "best_match")}
                      >
                        Best Match
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setSortOption(
                          sortOption === "top_rated"
                            ? "smart_discovery"
                            : "top_rated"
                        )
                      }
                      className={chip(sortOption === "top_rated")}
                    >
                      Top Rated
                    </button>
                    {!isGuestMode && (
                      <button
                        onClick={() =>
                          setSortOption(
                            sortOption === "following"
                              ? "smart_discovery"
                              : "following"
                          )
                        }
                        className={chip(sortOption === "following")}
                      >
                        Following
                      </button>
                    )}
                    <button
                      onClick={() => navigate("/discovery/info")}
                      className="ml-1 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-500 font-medium transition cursor-pointer px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                      title="Learn how the discovery algorithm works"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How it works</span>
                    </button>
                  </div>
                </div>

                {activeQuery && !loading && (
                  <p className="text-xs text-zinc-500 mb-3">
                    Results for{" "}
                    <span className="text-blue-500 font-medium">
                      "{activeQuery}"
                    </span>{" "}
                    ({scoredProfiles.length})
                    <button
                      onClick={() => {
                        setActiveQuery("");
                        setSearchInput("");
                      }}
                      className="ml-2 underline hover:text-blue-500 cursor-pointer"
                    >
                      clear
                    </button>
                  </p>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-56 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : scoredProfiles.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center">
                    <User className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                    <h3 className="text-sm font-bold">No creators found</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Try a different search or filter.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedProfiles.map(({ profile, breakdown }, idx) =>
                      renderCreatorCard(profile, breakdown, idx)
                    )}
                  </div>
                )}

                {!loading && totalPages > 1 && (
                  <div className="sticky bottom-6 z-50 mx-auto w-fit flex items-center justify-center gap-1 rounded-full border border-gray-200 dark:border-white/20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 shadow-2xl shadow-blue-500/10 mt-8 mb-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm text-gray-500 dark:text-zinc-400 font-medium disabled:opacity-50 cursor-pointer"
                    >
                      Prev
                    </button>

                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      const isActive = page === currentPage;
                      if (
                        totalPages > 5 &&
                        page !== 1 &&
                        page !== totalPages &&
                        Math.abs(page - currentPage) > 1
                      ) {
                        if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        )
                          return (
                            <span key={page} className="px-1 text-gray-400">
                              ...
                            </span>
                          );
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors cursor-pointer ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ================= TAB 3: GENERAL GALLERY ================= */}
          {activeTab === "gallery" && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {galleryLoading ? (
                <p className="text-zinc-500">Loading gallery...</p>
              ) : galleries.length === 0 ? (
                <p className="text-zinc-500">No gallery posts found.</p>
              ) : (
                galleries.map((item, i) => {
                  const cleanPath = item.file_url?.startsWith("/")
                    ? item.file_url.substring(1)
                    : item.file_url;
                  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                  const assetUrl = cleanPath?.startsWith("http")
                    ? cleanPath
                    : `${cloudfrontUrl}/${cleanPath}`;
                  const isVideo = item.file_mimetype?.startsWith("video/");
                  return (
                    <div
                      key={item.gallery_id}
                      onClick={() => setSelectedGalleryItem(item)}
                      className="relative group rounded-2xl overflow-hidden break-inside-avoid bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 cursor-pointer shadow-sm hover:shadow-lg transition-all animate-fade-in"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {isVideo ? (
                        <div className="relative w-full">
                          <video
                            src={assetUrl}
                            className="w-full h-auto object-cover"
                            preload="metadata"
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                            muted
                            loop
                          />
                          <div className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full backdrop-blur-md">
                            <Play
                              className="w-3.5 h-3.5 text-white"
                              fill="currentColor"
                            />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={assetUrl}
                          alt={item.title}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                        <h4 className="text-white font-bold text-lg truncate">
                          {item.title}
                        </h4>
                        <p className="text-white/80 text-xs line-clamp-2 mt-1">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <img
                            src={constructAvatarUrl(
                              item.avatar_url,
                              item.handle || item.title
                            )}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = getFallbackAvatarUrl(
                                item.handle || item.title
                              );
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-white/20 bg-zinc-800 shrink-0"
                          />
                          <span className="text-white/90 text-xs font-medium">
                            @{item.handle}
                          </span>
                          {item.deactivated && <DeactivatedBadge />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= TAB 4: MY STANDING ================= */}
          {activeTab === "standout" &&
            (() => {
              const myProfile: UserProfile | null =
                myProfileData ||
                profiles.find(
                  (p) => String(p.id) === String(userInfo?.account_id)
                ) ||
                freelancers.find(
                  (p) => String(p.id) === String(userInfo?.account_id)
                ) ||
                (userInfo?.account_id
                  ? ({
                      id: String(userInfo.account_id),
                      name:
                        userInfo.name ||
                        userInfo.display_name ||
                        userInfo.username ||
                        "My Profile",
                      username: userInfo.username || userInfo.handle || "me",
                      avatar: constructAvatarUrl(
                        userInfo.avatar || "",
                        userInfo.name || userInfo.username || ""
                      ),
                      bio: userInfo.bio || "",
                      tagline: userInfo.tagline || "",
                      skills: userInfo.skills || [],
                      rawSkills: userInfo.rawSkills || [],
                      verified: !!userInfo.is_verified || !!userInfo.verified,
                      subscriptionType:
                        (userInfo.subscription_tier as any) ||
                        (userInfo.subscriptionType as any) ||
                        "Free",
                      roles: Array.isArray(userInfo.roles)
                        ? userInfo.roles
                        : [
                            {
                              role_id: 1,
                              role_name: userInfo.role || "Freelancer",
                            },
                          ],
                      meritScore: userInfo.merit_score || "No Rating",
                      ratingCount: 0,
                      followersCount: 0,
                      followingCount: 0,
                      isFollowing: false,
                    } as UserProfile)
                  : null);

              if (!myProfile) {
                return (
                  <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 p-12 text-center mt-6">
                    <User className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                    <h3 className="text-sm font-bold">Please log in</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Log in to view your discovery standing, score breakdown, and job matches.
                    </p>
                  </div>
                );
              }

              const myBreakdown = computeDiscoveryScore(
                myProfile,
                otherJobs.flatMap((j) => j.skills),
                shuffleSeed
              );

              const matchResults = otherJobs.map((job) => {
                return { job, match: computeMatch(myProfile, job.skills) };
              });
              const matchedJobs = matchResults.filter(
                (r) => r.match.matched.length > 0
              );

              const avgMatchPercent =
                matchedJobs.length > 0
                  ? Math.round(
                      matchedJobs.reduce((sum, r) => sum + r.match.percent, 0) /
                        matchedJobs.length
                    )
                  : 0;

              const InfoTooltip = ({ text }: { text: string }) => (
                <div className="group relative inline-flex items-center ml-1.5 align-middle">
                  <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-help transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-[11px] leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] text-center shadow-xl pointer-events-none font-normal normal-case tracking-normal">
                    {text}
                  </div>
                </div>
              );

              return (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-extrabold flex items-center gap-2">
                      <Sparkles className="h-6 w-6" /> How You
                      Stand Out
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                      Live preview of your public Discovery card, your{" "}
                      <b>70-point deterministic Discovery Score</b>, and how you
                      match against open jobs.
                    </p>
                  </div>

                  {/* Top Row: Live Card Preview & Discovery Algorithm Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Card Preview with identical width as Discover Creators */}
                    <div className="lg:col-span-6 flex flex-col items-center lg:items-start">
                      <div className="w-full max-w-[460px] mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center">
                            Discovery Card Preview
                            <InfoTooltip text="This is how your card appears in the Discover Creators feed. Click it to preview your 3D Flip Card." />
                          </h3>
                        </div>
                        {otherJobs.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold">
                            <ThumbsUp className="w-3 h-3" />
                            {avgMatchPercent}% Avg Job Match
                          </span>
                        )}
                      </div>

                      <div className="w-full max-w-[460px]">
                        {renderCreatorCard(myProfile, myBreakdown)}
                      </div>
                    </div>

                    {/* Right: Clean, Unified Discovery Score Breakdown */}
                    <div className="lg:col-span-6 flex flex-col">
                      <div className="mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center">
                          Your Discovery Score Breakdown
                          <InfoTooltip text="Your 70-point deterministic score + up to 30 points of random exploration boost per viewer session." />
                        </h3>
                      </div>

                      <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-xs flex flex-col space-y-4">
                        <div className="flex items-baseline justify-between pb-3 border-b border-zinc-100 dark:border-white/10">
                          <div>
                            <span className="text-[11px] font-semibold uppercase text-zinc-400">
                              Base Relevance Score
                            </span>
                            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
                              {myBreakdown.deterministicScore}{" "}
                              <span className="text-sm font-normal text-zinc-400">
                                / 70 pts
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                              +0 to 30 pts exploration window
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3.5 text-xs">
                          <div>
                            <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                              <span>1. Profile Completeness</span>
                              <span className="font-mono text-zinc-500">
                                {myBreakdown.completenessPts} / 20 pts
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${(myBreakdown.completenessPts / 20) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                              <span>2. Skill Relevance & Depth</span>
                              <span className="font-mono text-zinc-500">
                                {myBreakdown.matchPts} / 25 pts
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${(myBreakdown.matchPts / 25) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                              <span>3. Bayesian Merit & Verification</span>
                              <span className="font-mono text-zinc-500">
                                {myBreakdown.reputationPts} / 15 pts
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${(myBreakdown.reputationPts / 15) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1.5">
                              <span>
                                4. Subscription Tier ({myProfile.subscriptionType})
                              </span>
                              <span className="font-mono text-zinc-500">
                                {myBreakdown.tierPts} / 10 pts
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${(myBreakdown.tierPts / 10) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-100 dark:border-white/10 grid grid-cols-2 gap-2.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${myBreakdown.checklist.hasAvatar ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
                            />
                            <span className={myBreakdown.checklist.hasAvatar ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}>
                              Custom Avatar (+5)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${myBreakdown.checklist.hasBioOrTagline ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
                            />
                            <span className={myBreakdown.checklist.hasBioOrTagline ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}>
                              Bio & Tagline (+5)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${myBreakdown.checklist.hasSkillsDepth ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
                            />
                            <span className={myBreakdown.checklist.hasSkillsDepth ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}>
                              3+ Skills Listed (+5)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${myBreakdown.checklist.hasPortfolioActivity ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
                            />
                            <span className={myBreakdown.checklist.hasPortfolioActivity ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}>
                              Active Works (+5)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-xs">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center">
                        Job Matches
                        <InfoTooltip text="Total number of open job postings where you meet at least one required skill." />
                      </div>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {matchedJobs.length}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        out of {otherJobs.length} open jobs
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-xs">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center">
                        Top Match Rate
                        <InfoTooltip text="Your highest skill overlap percentage across open job postings." />
                      </div>
                      <p className="text-2xl font-extrabold text-blue-500 mt-1">
                        {matchedJobs.length > 0
                          ? Math.max(...matchedJobs.map((r) => r.match.percent))
                          : 0}
                        %
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        highest skill overlap
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-xs relative">
                      <button
                        onClick={() => navigate("/profile?tab=performance")}
                        className="absolute top-3 right-3 text-zinc-400 hover:text-blue-500 transition-colors p-1 bg-zinc-50 dark:bg-zinc-800 rounded-full cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center pr-6">
                        Your Rating
                      </div>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 flex items-center gap-1">
                        {myProfile.meritScore !== "No Rating" && (
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        )}
                        {myProfile.meritScore}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        completed jobs & gigs
                      </p>
                    </div>

                    <div
                      className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 shadow-xs relative group/followers cursor-pointer hover:border-blue-500/40 transition-all"
                      onClick={() => setIsFollowersModalOpen(true)}
                    >
                      <button className="absolute top-3 right-3 text-zinc-400 group-hover/followers:text-blue-500 transition-colors p-1 bg-zinc-50 dark:bg-zinc-800 rounded-full">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center pr-6">
                        Followers
                      </div>
                      <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 group-hover/followers:text-blue-500 transition-colors">
                        {myProfile.followersCount}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        creators and clients
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Matching Jobs */}
                  <div className="w-full pt-6 border-t border-zinc-200 dark:border-white/10">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center">
                      Open Jobs Matching Your Skills
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {recLoading ? (
                        [1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-36 rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse"
                          />
                        ))
                      ) : matchedJobs.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic py-4">
                          No job postings currently match your skills. Add more
                          tags on your profile!
                        </p>
                      ) : (
                        matchedJobs.map((r) => {
                          const cloudfrontUrl =
                            import.meta.env.VITE_CLOUDFRONT_URL || "";
                          const bannerUrl = r.job.thumbnailPath
                            ? r.job.thumbnailPath.startsWith("http")
                              ? r.job.thumbnailPath
                              : `${cloudfrontUrl}/${r.job.thumbnailPath}`
                            : null;
                          return (
                            <div
                              key={r.job.id}
                              className="flex flex-col rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() =>
                                navigate(`/jobs/postings/${r.job.id}`)
                              }
                            >
                              <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 relative">
                                {bannerUrl && (
                                  <img
                                    src={bannerUrl}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                )}
                              </div>
                              <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface">
                                <div className="min-w-0 pr-4 flex-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {r.job.title}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
                                    {r.match.matched
                                      .slice(0, 3)
                                      .map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold truncate max-w-[90px]"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    {r.match.matched.length > 3 && (
                                      <span className="text-[10px] text-zinc-500">
                                        +{r.match.matched.length - 3}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500">
                                    {r.match.matched.length} of{" "}
                                    {r.job.skills.length} required skills
                                  </p>
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
              );
            })()}

          {/* ================= TAB 5: HOW DISCOVERY WORKS ================= */}
          {activeTab === "info" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Box */}
              <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                    How Creator Discovery & Weighted Random Exploration Work
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
                  Traditional directories suffer from a permanent <em>rich-get-richer loop</em> where the same top 5 profiles remain locked on Page 1 forever. 
                  Conversely, pure uniform random feeds surface incomplete, abandoned profiles to clients. 
                  Ensemble resolves this through a <strong>100-Point Stratified Exploration Algorithm</strong>: combining a deterministic <strong>70-Point Multi-Factor Quality Score</strong> with a dynamic <strong>30-Point Seeded Random Exploration Window</strong>.
                </p>

                {/* 3-Step Architecture Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-zinc-100 dark:border-white/5">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 01</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">Max 70 pts</span>
                      </div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Quality Base Floor</h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Evaluates profile completeness, skill depth, Bayesian rating, and verified identity. Empty accounts receive low scores and cannot dominate the feed.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 02</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">+0 to 30 pts</span>
                      </div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Seeded Random Jitter</h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        A deterministic session hash adds a variable exploration boost to every candidate. Pagination remains strictly consistent and never duplicates profiles across pages.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">Step 03</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">Dynamic Rotation</span>
                      </div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">Discovery Guarantee</h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Any creator with a complete profile can roll a high jitter boost (+25-30 pts) and jump straight onto Page 1 whenever a client explores or clicks <strong>Shuffle</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Pillars Table */}
              <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                      The 5 Discovery Scoring Factors (100 Points Total)
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    S(p) = Base(70) + RandomSeed(0..30)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                        <th className="py-3 px-4 font-semibold w-14">Factor</th>
                        <th className="py-3 px-4 font-semibold w-28 text-center">
                          Weight
                        </th>
                        <th className="py-3 px-4 font-semibold w-52">
                          Component
                        </th>
                        <th className="py-3 px-4 font-semibold w-64 text-zinc-800 dark:text-zinc-200">
                          Purpose
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          Scoring Rule & Fair Play Mechanism
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                      {[
                        {
                          num: "01",
                          weight: "20 pts",
                          title: "Profile Completeness",
                          detail: "Avatar, Bio/Tagline, Skills & Works",
                          purpose:
                            "Prevents empty or low-effort accounts from floating to the top of random shuffles.",
                          rule: "+5 pts for custom avatar, +5 pts for bio/tagline, +5 pts for 3+ skills, and +5 pts for having published services, jobs, or gallery assets.",
                        },
                        {
                          num: "02",
                          weight: "25 pts",
                          title: "Skill Relevance & Depth",
                          detail: "Job Tag Overlap + Proficiency & Years",
                          purpose:
                            "Prioritizes creators whose skills and experience depth fit the viewer's open job posts.",
                          rule: "85% skill coverage + 15% competency bonus (Expert/Senior level and 2-5+ years experience). If the viewer has no open jobs, rewards overall skill breadth.",
                        },
                        {
                          num: "03",
                          weight: "15 pts",
                          title: "Bayesian Merit & Trust",
                          detail: "Smoothed Rating + ID Verification",
                          purpose:
                            "Rewards 5-star talent while protecting brand-new creators from starting at zero.",
                          rule: "Up to 11 pts from Bayesian-smoothed rating (0-review talent starts at a fair 4.0★ prior = 8.8 pts) + 4 pts for level-2 identity verification.",
                        },
                        {
                          num: "04",
                          weight: "10 pts",
                          title: "Subscription Tier Boost",
                          detail: "Business, Premium, or Free",
                          purpose:
                            "Provides fair promotional value to subscribers without creating a paywall against Free users.",
                          rule: "Business receives +10 pts, Premium receives +5 pts, Free receives +0 pts—a statistical nudge rather than a rigid wall.",
                        },
                        {
                          num: "05",
                          weight: "30 pts",
                          title: "Seeded Exploration Jitter",
                          detail: "Deterministic Hash(profileId, seed)",
                          purpose:
                            "Guarantees fresh discovery on every visit/shuffle and lets new creators leapfrog onto Page 1.",
                          rule: "Generates 0-30 pts per session seed. Stable across pagination so pages never duplicate, and re-rolls immediately when 'Shuffle Feed' is clicked.",
                        },
                      ].map((row) => (
                        <tr
                          key={row.num}
                          className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">
                            {row.num}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border border-zinc-300/80 dark:border-white/15">
                              {row.weight}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900 dark:text-white">
                              {row.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {row.detail}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-900 dark:text-white font-medium leading-relaxed">
                            {row.purpose}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                            {row.rule}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comparison: Why Stratified Exploration Beats Pure Random */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                    <Dices className="w-4 h-4 text-zinc-500" /> Pure Uniform Random Mode
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                    Available via the <b>Random</b> sort chip for unbiased roulette. Every single account in the database has an identical chance of showing up first.
                  </p>
                  <div className="text-[11px] p-2.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                    <strong>Trade-off:</strong> ~35-40% of top spots land on empty test profiles or creators without avatars or listed skills.
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-zinc-300 dark:border-white/20">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-2">
                    <Sparkles className="w-4 h-4 text-zinc-500" /> Discovery Feed (Weighted Random — Recommended)
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                    Our default algorithm filters profiles through the 70-point quality floor before applying a 30-point random exploration boost.
                  </p>
                  <div className="text-[11px] p-2.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                    <strong>Result:</strong> 100% of top recommendations are active, capable creators, while newer accounts regularly surface on Page 1.
                  </div>
                </div>
              </div>

              {/* Section 3: Profile Completeness Checklist (20 Points) */}
              <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      <span>Profile Completeness Checklist (Factor 01 — 20 Points)</span>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Complete all 4 items on your profile to secure the full 20-point base boost in Discovery.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                        <th className="py-2.5 px-4 font-semibold w-1/4">Checklist Item</th>
                        <th className="py-2.5 px-4 font-semibold w-24 text-center">Score</th>
                        <th className="py-2.5 px-4 font-semibold w-1/3 text-zinc-800 dark:text-zinc-200">Purpose</th>
                        <th className="py-2.5 px-4 font-semibold">Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                      {[
                        {
                          item: "Custom Profile Avatar",
                          pts: "+5 pts",
                          purpose: "Builds visual trust and identity recognition in the feed.",
                          req: "Upload a custom profile photo or select an Ensemble character preset.",
                        },
                        {
                          item: "Tagline & Bio Introduction",
                          pts: "+5 pts",
                          purpose: "Helps clients quickly understand your editing niche and workflow.",
                          req: "Write a descriptive bio (30+ chars) or a clear specialty tagline (12+ chars).",
                        },
                        {
                          item: "Skill Tags & Experience Depth",
                          pts: "+5 pts",
                          purpose: "Powers the Matched Editors engine and skill-overlap rings.",
                          req: "List at least 3 specific skills with proficiency level and years of experience.",
                        },
                        {
                          item: "Active Marketplace or Gallery Works",
                          pts: "+5 pts",
                          purpose: "Demonstrates active participation and verifiable portfolio work.",
                          req: "Publish at least 1 active Service (Gig), Gallery post, or open Job post.",
                        },
                      ].map((c) => (
                        <tr key={c.item} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                            <span>{c.item}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {c.pts}
                          </td>
                          <td className="py-3 px-4 text-zinc-900 dark:text-white font-medium">
                            {c.purpose}
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 text-[11px]">
                            {c.req}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Discovery Card Indicators & Badges Reference (Accurate Real-World Guide) */}
              <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-zinc-200 dark:border-white/10">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span>Discovery Card Indicators & Visual Badges</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Quick reference for all status badges and match indicators that appear on creator cards.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                        <th className="py-3 px-4 font-semibold w-56">Visual Indicator</th>
                        <th className="py-3 px-4 font-semibold w-40">Placement</th>
                        <th className="py-3 px-4 font-semibold w-1/3">How It Is Calculated</th>
                        <th className="py-3 px-4 font-semibold">What It Signals to Viewers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                      {/* 1. Matched Chip */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md border border-white/10 text-[10px] font-medium">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Matched</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Top-right of card banner
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          Displays in <b>Discovery Feed</b> when the creator possesses 1 or more skill tags required by your open jobs.
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Instant visual signal that this creator matches your active recruitment criteria.
                        </td>
                      </tr>

                      {/* 2. Random Pick Chip */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md border border-white/10 text-[10px] font-medium">
                            <Dices className="w-3 h-3" />
                            <span>Random Pick</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Top-right of card banner
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          Displays when sorting by <b>Random</b> mode (uniform random shuffle).
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Confirms that the card position was picked entirely at random without algorithmic weighting.
                        </td>
                      </tr>

                      {/* 3. Radial Skill Match Ring */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <MatchRing percent={85} size={32} />
                            <span className="font-bold text-xs text-zinc-900 dark:text-white">85% Match</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Top-right beside avatar
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          The exact percentage of required job skills that overlap with the creator's listed competencies.
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Green (≥ 75%) indicates high fit; Blue (≥ 40%) indicates partial match. Only appears when you have open jobs.
                        </td>
                      </tr>

                      {/* 4. Highlighted Skill Pill */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                            Video Editing | Expert <span className="bg-emerald-500 text-white text-[8px] font-bold px-1 rounded">5y</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Bottom skills row
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          Highlighted in emerald when the skill matches your job post, showing verified proficiency and years of experience.
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Enables immediate seniority verification. Clicking any skill pill instantly filters the entire feed.
                        </td>
                      </tr>

                      {/* 5. Verified & Subscription Badges */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <img
                              src="/icons/verification/lvl2_verified.png"
                              alt="Verified"
                              className="h-4 w-4 object-contain shrink-0"
                            />
                            <img
                              src="/icons/subscription/studio.png"
                              alt="Studio"
                              className="h-4 w-4 object-contain shrink-0"
                            />
                            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">Verified & Tier</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Beside creator name
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          Verified badge earned via ID verification; Studio/Premium icons indicate active platform membership.
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Establishes platform trust and identity authenticity while granting a statistical +4 to +10 pt ranking boost.
                        </td>
                      </tr>

                      {/* 6. Ratings & Social Metrics */}
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <b className="text-zinc-900 dark:text-white">5.0</b>
                            <span className="text-zinc-400">(12)</span>
                            <span>•</span>
                            <span>150 followers</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                          Under username & role
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                          Aggregated client review score with Bayesian dampening, plus follower and completed works count.
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          Demonstrates real client satisfaction. New accounts without reviews show &quot;New talent&quot; with a neutral 4.0 prior.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="bg-white dark:bg-dark-surface border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Want to see your own Discovery Score breakdown?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Check the <b>My Standing</b> tab to audit your 70-point base score or test the live <b>Shuffle Feed</b> in Discover Creators.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {!isGuestMode && (
                    <button
                      type="button"
                      onClick={() => navigate("/discovery/standout")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Check My Standing</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/discovery")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Explore Creators</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for Gallery */}
      {selectedGalleryItem &&
        (() => {
          const currentIndex = galleries.findIndex(
            (i) => i.gallery_id === selectedGalleryItem.gallery_id
          );
          const hasMultiple = galleries.length > 1;

          const handlePrev = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedGalleryItem(
              galleries[(currentIndex - 1 + galleries.length) % galleries.length]
            );
          };

          const handleNext = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedGalleryItem(
              galleries[(currentIndex + 1) % galleries.length]
            );
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
                      const cleanPath = selectedGalleryItem.file_url?.startsWith(
                        "/"
                      )
                        ? selectedGalleryItem.file_url.substring(1)
                        : selectedGalleryItem.file_url;
                      const cloudfrontUrl =
                        import.meta.env.VITE_CLOUDFRONT_URL || "";
                      const assetUrl = cleanPath?.startsWith("http")
                        ? cleanPath
                        : `${cloudfrontUrl}/${cleanPath}`;
                      const isVideo =
                        selectedGalleryItem.file_mimetype?.startsWith("video/");
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
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedGalleryItem.title}
                      </h2>

                      <div className="flex items-center gap-3 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-black/5 dark:border-white/5">
                        <img
                          src={constructAvatarUrl(
                            selectedGalleryItem.avatar_url,
                            selectedGalleryItem.display_name ||
                              selectedGalleryItem.handle
                          )}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = getFallbackAvatarUrl(
                              selectedGalleryItem.display_name ||
                                selectedGalleryItem.handle
                            );
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-white/10 bg-zinc-200 dark:bg-zinc-800 shrink-0"
                        />
                        <div className="hidden sm:block">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                              {selectedGalleryItem.display_name}
                            </p>
                            {selectedGalleryItem.deactivated && (
                              <DeactivatedBadge />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                            @{selectedGalleryItem.handle}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (isGuestMode) {
                              setSelectedGalleryItem(null);
                              setIsModalOpen(true);
                            } else {
                              navigate(
                                `/profile/${selectedGalleryItem.account_id}`
                              );
                            }
                          }}
                          className="ml-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300">
                      {selectedGalleryItem.description ? (
                        <p className="whitespace-pre-wrap">
                          {selectedGalleryItem.description}
                        </p>
                      ) : (
                        <p className="italic text-gray-500 dark:text-zinc-500">
                          No description provided.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                      Uploaded on{" "}
                      {selectedGalleryItem.created_at
                        ? new Date(
                            selectedGalleryItem.created_at
                          ).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown date"}
                    </div>
                  </div>
                </div>

                {hasMultiple && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedGalleryItem(null)}
                  className="absolute top-4 right-4 p-2.5 bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })()}

      {selectedCardUser && (
        <DiscoveryFlipCardModal
          user={selectedCardUser as any}
          onClose={() => setSelectedCardUser(null)}
          onInvite={
            String(selectedCardUser.id) === String(userInfo?.account_id)
              ? undefined
              : () => {
                  if (!userInfo) return setIsModalOpen(true);
                  setIsInviteModalOpen(true);
                }
          }
        />
      )}

      <GuestLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <InviteToJobModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        freelancerId={selectedCardUser?.id || ""}
        freelancerName={selectedCardUser?.name || ""}
      />

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
