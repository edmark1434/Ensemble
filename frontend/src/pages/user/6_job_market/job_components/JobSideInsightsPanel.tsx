import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Check,
  Loader2,
  Star,
  ExternalLink,
  AlertCircle,
  Lock,
  Wrench,
} from "lucide-react";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { bannerPresetUrl, resolveBannerPreset } from "@/lib/profileBanners";
import { VerificationIcon } from "@/components/ui/VerificationIcon";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";
import { toast } from "react-hot-toast";
import type { Job } from "./job_lists";
import {
  computeDiscoveryScore,
  computeSkillMatch,
  seededRandomUnit,
  type DiscoveryProfileInput,
} from "@/pages/user/14_discovery/discovery_ranking";

import type { SelectedFreelancerPreview } from "./FreelancerPreviewModal";

interface MappedFreelancer extends DiscoveryProfileInput {
  deactivated: boolean;
  ratingCount: number;
  freelancerRating: string;
  bannerPreset?: string | null;
  roles: { role_id: number | string; role_name: string }[];
}

interface JobSideInsightsPanelProps {
  job: Job;
  onCloseDrawer: () => void;
  onOpenLogin?: () => void;
  selectedFreelancerId?: string | null;
  onSelectFreelancer?: (freelancer: SelectedFreelancerPreview) => void;
}

const norm = (s: string) => s.trim().toLowerCase();

const CircularProbabilityRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, size = 38, strokeWidth = 3.5 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-gray-900 dark:text-zinc-100">
        {clamped}%
      </span>
    </div>
  );
};

function mapAccountToProfile(account: any, profileDetails?: any): MappedFreelancer {
  const avatarPath = account.avatar_preset_url || profileDetails?.avatar_preset_url || "";
  const name = account.full_name || account.display_name || profileDetails?.name || account.handle || "Member";
  const rawOverall = profileDetails?.avg_rating ?? account.overall_rating;
  const parsedOverall = parseFloat(String(rawOverall ?? 0));
  const rawFreelancer = profileDetails?.freelancer_rating;
  const parsedFreelancer = parseFloat(String(rawFreelancer ?? 0));
  const ratingCount = parseInt(String(profileDetails?.total_reviews ?? account.rating_count ?? "0"), 10);

  return {
    id: String(account.account_id),
    name,
    username: account.handle || profileDetails?.username || "",
    avatar: constructAvatarUrl(avatarPath, name),
    bio: account.bio || "",
    tagline: account.tagline || "",
    skills: Array.isArray(account.skills) ? account.skills.map((s: any) => s.name).filter(Boolean) : [],
    rawSkills: Array.isArray(account.skills) ? account.skills : [],
    verified: Boolean(account.verification_status ?? profileDetails?.verification_status),
    subscriptionType: account.subscriptiontype || profileDetails?.subscriptionType || "Free",
    starRating: !Number.isNaN(parsedOverall) && parsedOverall > 0 ? parsedOverall.toFixed(1) : "No Rating",
    freelancerRating:
      !Number.isNaN(parsedFreelancer) && parsedFreelancer > 0 ? parsedFreelancer.toFixed(1) : "No Rating",
    ratingCount: Number.isNaN(ratingCount) ? 0 : ratingCount,
    followersCount: parseInt(account.followers_count || "0", 10),
    totalJobs: Number(account.total_jobs) || 0,
    totalServices: Number(account.total_services) || 0,
    totalAssets: Number(account.total_assets) || 0,
    deactivated: String(account.status || "").toLowerCase() === "deactivated",
    bannerPreset: account.banner_preset ?? profileDetails?.banner_preset ?? null,
    roles: Array.isArray(account.roles) ? account.roles : [],
  };
}

function computeApplicationProbability(
  profile: MappedFreelancer,
  job: Job
): {
  probability: number;
  label: "High" | "Moderate" | "Competitive" | "Closed";
  skillFitPts: number;
  readinessPts: number;
  competitionPts: number;
  matchedSkills: string[];
  missingSkills: string[];
  skillMatchPercent: number;
  openSeats: number;
  tip: string;
} {
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const skillMatch = computeSkillMatch(profile, jobSkills);
  const matchedSet = new Set(skillMatch.matched.map(norm));
  const missingSkills = jobSkills.filter((s) => !matchedSet.has(norm(s)));

  const positionsNeeded = Math.max(1, Number(job.positionsNeeded) || 1);
  const hiredCount = Math.max(0, Number(job.hiredCount) || 0);
  const openSeats = Math.max(0, positionsNeeded - hiredCount);
  const applicants = Math.max(0, Number(job.applicantsCount) || 0);
  const isClosed = String(job.status || "").toLowerCase() === "closed" || openSeats === 0;

  if (isClosed) {
    return {
      probability: 0,
      label: "Closed",
      skillFitPts: 0,
      readinessPts: 0,
      competitionPts: 0,
      matchedSkills: skillMatch.matched,
      missingSkills,
      skillMatchPercent: skillMatch.percent,
      openSeats,
      tip: "This job post is no longer accepting new proposals.",
    };
  }

  // 1. Skill Fit (0 - 45 pts)
  const skillFitPts =
    jobSkills.length === 0
      ? 28
      : Math.round((skillMatch.rawScore / 1000) * 45);

  // 2. Profile Readiness & Reputation (0 - 30 pts)
  let readinessPts = 4; // baseline
  if (profile.verified) readinessPts += 10;
  const numericRating = parseFloat(String(profile.starRating));
  if (!Number.isNaN(numericRating) && numericRating > 0) {
    readinessPts += Math.round((Math.min(5, numericRating) / 5) * 10);
  } else {
    readinessPts += 4; // fair starting baseline for unrated talent
  }
  const activityCount = (profile.totalJobs || 0) + (profile.totalServices || 0) + (profile.totalAssets || 0);
  if (activityCount >= 5) readinessPts += 6;
  else if (activityCount >= 1) readinessPts += 3;
  readinessPts = Math.min(30, readinessPts);

  // 3. Competition & Seat Availability (0 - 25 pts)
  const applicantsPerSeat = applicants / openSeats;
  let competitionPts = 25;
  if (applicantsPerSeat >= 15) competitionPts = 6;
  else if (applicantsPerSeat >= 10) competitionPts = 10;
  else if (applicantsPerSeat >= 6) competitionPts = 15;
  else if (applicantsPerSeat >= 3) competitionPts = 20;

  const probability = Math.max(5, Math.min(96, skillFitPts + readinessPts + competitionPts));
  const label: "High" | "Moderate" | "Competitive" =
    probability >= 70 ? "High" : probability >= 45 ? "Moderate" : "Competitive";

  let tip = "Strong alignment—tailor your cover pitch and milestones to stand out.";
  if (!profile.verified) {
    tip = "Verify your account to unlock proposals and boost client trust.";
  } else if (missingSkills.length > 0 && skillMatch.percent < 60) {
    tip = `Adding ${missingSkills.slice(0, 2).join(", ")} to your skills can improve your match.`;
  } else if (applicantsPerSeat < 3) {
    tip = "Low competition right now—applying early gives you strong visibility.";
  }

  return {
    probability,
    label,
    skillFitPts,
    readinessPts,
    competitionPts,
    matchedSkills: skillMatch.matched,
    missingSkills,
    skillMatchPercent: skillMatch.percent,
    openSeats,
    tip,
  };
}

export const JobSideInsightsPanel: React.FC<JobSideInsightsPanelProps> = ({
  job,
  onCloseDrawer,
  onOpenLogin,
  selectedFreelancerId,
  onSelectFreelancer,
}) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const userInfo = useGlobalState((state) => state.user) as any;
  const myAccountId = userInfo?.account_id ? String(userInfo.account_id) : "";

  const isOwner = Boolean(job.isOwnPost || job.isManageablePost);
  const isJobClosed = String(job.status || "").toLowerCase() === "closed";

  // Owner state: suggested freelancers
  const [freelancers, setFreelancers] = useState<MappedFreelancer[]>([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState(false);
  const [freelancerError, setFreelancerError] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({});

  // Applicant state: my profile stats
  const [myProfile, setMyProfile] = useState<MappedFreelancer | null>(null);
  const [myContractCounts, setMyContractCounts] = useState<{ completed: number; ongoing: number }>({
    completed: 0,
    ongoing: 0,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Fetch suggested freelancers when viewing own post
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    setLoadingFreelancers(true);
    setFreelancerError("");

    api
      .get("/api/accounts/search-users", { params: { role: "Freelancer" } })
      .then((res) => {
        if (cancelled) return;
        const raw = Array.isArray(res.data?.data) ? res.data.data : [];
        const seen = new Set<string>();
        const mapped: MappedFreelancer[] = [];
        for (const row of raw) {
          const id = String(row.account_id || "");
          if (!id || seen.has(id)) continue;
          if (myAccountId && id === myAccountId) continue;
          seen.add(id);
          const profile = mapAccountToProfile(row);
          if (!profile.deactivated) mapped.push(profile);
        }
        setFreelancers(mapped);
      })
      .catch(() => {
        if (!cancelled) setFreelancerError("Could not load suggested freelancers.");
      })
      .finally(() => {
        if (!cancelled) setLoadingFreelancers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner, job.id, myAccountId]);

  // Fetch current user's profile when viewing someone else's post
  useEffect(() => {
    if (isOwner || isGuestMode || !myAccountId) return;
    let cancelled = false;
    setLoadingProfile(true);

    Promise.all([
      api.get("/api/accounts/search-users", {
        params: { account_id: myAccountId, include_self: "true" },
      }),
      api.get(`/api/accounts/profile/${myAccountId}`).catch(() => null),
      api.get("/api/contracts").catch(() => null),
    ])
      .then(([searchRes, profileRes, contractsRes]) => {
        if (cancelled) return;
        const rows = Array.isArray(searchRes.data?.data) ? searchRes.data.data : [];
        const profileDetails = profileRes?.data?.data || profileRes?.data || null;
        if (rows.length > 0) {
          setMyProfile(mapAccountToProfile(rows[0], profileDetails));
        }

        const contractRows = Array.isArray(contractsRes?.data?.data) ? contractsRes.data.data : [];
        let completed = 0;
        let ongoing = 0;
        for (const c of contractRows) {
          const st = String(c.status || "").trim().toLowerCase();
          if (st === "done" || st === "completed" || st === "closed") {
            completed += 1;
          } else if (st === "active" || st === "waiting" || st === "pending signature" || st === "in progress") {
            ongoing += 1;
          }
        }
        setMyContractCounts({
          completed: completed || (rows[0] ? Number(rows[0].total_jobs) || 0 : 0),
          ongoing,
        });
      })
      .catch(() => {
        if (!cancelled) setMyProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner, isGuestMode, myAccountId]);

  const [randomSeed] = useState<number>(() => Math.floor(100000 + Math.random() * 900000));

  const suggestedFreelancers = useMemo(() => {
    if (!isOwner || freelancers.length === 0) return [];
    const jobSkills = Array.isArray(job.skills) ? job.skills : [];

    const scored = freelancers.map((profile) => {
      const match = computeSkillMatch(profile, jobSkills);
      const discovery = computeDiscoveryScore(profile, jobSkills, 1);
      return {
        profile,
        matched: match.matched,
        percent: match.percent,
        rankScore: match.rawScore + discovery.reputationPts * 8 + (profile.verified ? 40 : 0),
      };
    });

    const matchedList = scored
      .filter((item) => item.percent > 0)
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 5);

    const otherPool = scored
      .filter((item) => item.percent === 0)
      .sort(
        (a, b) =>
          seededRandomUnit(`${job.id}::${a.profile.id}`, randomSeed) -
          seededRandomUnit(`${job.id}::${b.profile.id}`, randomSeed)
      )
      .slice(0, 3);

    return [...matchedList, ...otherPool];
  }, [isOwner, freelancers, job.skills, job.id, randomSeed]);

  const probabilityStats = useMemo(() => {
    if (isOwner || !myProfile) return null;
    return computeApplicationProbability(myProfile, job);
  }, [isOwner, myProfile, job]);

  const handleInvite = async (freelancer: MappedFreelancer) => {
    if (isJobClosed || invitingId || invitedIds[freelancer.id]) return;
    setInvitingId(freelancer.id);
    try {
      await api.post("/api/jobs/invite", {
        jobId: job.id,
        freelancerAccountId: freelancer.id,
        message: "",
      });
      setInvitedIds((prev) => ({ ...prev, [freelancer.id]: true }));
      toast.success(`Invited ${freelancer.name} to apply!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to send invitation.";
      if (msg.toLowerCase().includes("already been invited")) {
        setInvitedIds((prev) => ({ ...prev, [freelancer.id]: true }));
        toast("Already invited to this job.");
      } else {
        toast.error(msg);
      }
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-[410px] xl:w-[440px] shrink-0 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden text-left"
    >
      {isOwner ? (
        <>
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                Suggested Freelancers
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Matched by required skills & standing
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onCloseDrawer();
                navigate("/discovery");
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:underline cursor-pointer"
            >
              <span>Discovery</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="p-3 max-h-[420px] overflow-y-auto thin-scrollbar space-y-2">
            {loadingFreelancers ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-xs">Finding best matches...</span>
              </div>
            ) : freelancerError ? (
              <div className="py-6 px-3 text-center text-xs text-rose-500 flex flex-col items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>{freelancerError}</span>
              </div>
            ) : suggestedFreelancers.length === 0 ? (
              <div className="py-8 px-3 text-center text-xs text-gray-500 dark:text-zinc-400">
                No matching freelancers found yet. Try browsing Discovery.
              </div>
            ) : (
              suggestedFreelancers.map(({ profile, matched, percent }, index) => {
                const isInvited = Boolean(invitedIds[profile.id]);
                const isInviting = invitingId === profile.id;
                const isSelected = selectedFreelancerId === profile.id;
                const prevHasMatch = index > 0 && suggestedFreelancers[index - 1].percent > 0;
                const showDivider = prevHasMatch && percent === 0;

                return (
                  <React.Fragment key={profile.id}>
                    {showDivider && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          Other Freelancers
                        </span>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                      </div>
                    )}
                    <div
                      onClick={() =>
                      onSelectFreelancer?.({
                        id: profile.id,
                        name: profile.name,
                        username: profile.username,
                        avatar: profile.avatar,
                        bio: profile.bio,
                        tagline: profile.tagline,
                        verified: profile.verified,
                        subscriptionType: profile.subscriptionType,
                      })
                    }
                    className={`p-3 rounded-xl border transition space-y-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-gray-100/90 dark:bg-white/[0.07] border-gray-400 dark:border-white/30"
                        : "bg-gray-50/80 dark:bg-white/[0.03] border-gray-200/80 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {profile.name}
                            </span>
                            <VerificationIcon verified={profile.verified} className="h-3.5 w-3.5 shrink-0" />
                            {profile.subscriptionType && profile.subscriptionType !== "Free" && (
                              <SubscriptionIcon plan={profile.subscriptionType} className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500 font-semibold shrink-0 ml-0.5">
                              <Star className="h-3 w-3 fill-current" />
                              {profile.starRating === "No Rating" ? "New" : profile.starRating}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            {profile.username && (
                              <span className="text-[11px] text-zinc-500 font-mono truncate">
                                @{profile.username}
                              </span>
                            )}
                            {(() => {
                              const freelancerRole = profile.roles.find(
                                (r) => r?.role_name?.toLowerCase() === "freelancer"
                              );
                              if (!freelancerRole) return null;
                              return (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-white/5 leading-none">
                                  {freelancerRole.role_name}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {job.skills && job.skills.length > 0 && percent > 0 && (
                          <div title={`${percent}% skill match`}>
                            <CircularProbabilityRing percentage={percent} size={34} strokeWidth={3} />
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isJobClosed || isInviting || isInvited}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvite(profile);
                          }}
                          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                            isInvited
                              ? "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-white/10 cursor-default"
                              : isJobClosed
                              ? "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-white/5 cursor-not-allowed"
                              : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white border-gray-200 dark:border-white/15 cursor-pointer active:scale-95"
                          }`}
                        >
                          {isInviting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isInvited ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Invited</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3" />
                              <span>Invite</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const matchedSet = new Set(matched.map(norm));
                      const skillEntries =
                        Array.isArray(profile.rawSkills) && profile.rawSkills.length > 0
                          ? profile.rawSkills.map((rs) => ({
                              name: rs.name,
                              proficiency: rs.proficiency || "",
                              years: Number(rs.years) || 0,
                              isMatched: matchedSet.has(norm(rs.name)),
                            }))
                          : profile.skills.map((s) => ({
                              name: s,
                              proficiency: "",
                              years: 0,
                              isMatched: matchedSet.has(norm(s)),
                            }));

                      if (skillEntries.length === 0) {
                        return (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200/60 dark:border-white/5 text-[10px] text-gray-400 dark:text-zinc-500">
                            <Wrench className="h-3 w-3 shrink-0 mr-0.5" />
                            <span>No skills listed</span>
                          </div>
                        );
                      }

                      const sortedSkills = [...skillEntries].sort(
                        (a, b) => Number(b.isMatched) - Number(a.isMatched)
                      );

                      return (
                        <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-gray-200/60 dark:border-white/5">
                          <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-500 shrink-0 mr-0.5" />
                          {sortedSkills.map((sk) => {
                            const metaParts = [
                              sk.proficiency ? sk.proficiency : "",
                              sk.years > 0 ? `${sk.years}y` : "",
                            ].filter(Boolean);

                            return (
                              <span
                                key={sk.name}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${
                                  sk.isMatched
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-white/10"
                                }`}
                              >
                                <span>{sk.name}</span>
                                {metaParts.length > 0 && (
                                  <span
                                    className={`text-[9px] ${
                                      sk.isMatched
                                        ? "text-emerald-600/80 dark:text-emerald-300/80"
                                        : "text-gray-400 dark:text-zinc-500"
                                    }`}
                                  >
                                    · {metaParts.join(" · ")}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                Your Stats & Probability
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Estimated fit for this job post
              </p>
            </div>
            {probabilityStats && (
              <div className="flex items-center gap-2 shrink-0" title={`${probabilityStats.probability}% ${probabilityStats.label}`}>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                  {probabilityStats.label}
                </span>
                <CircularProbabilityRing percentage={probabilityStats.probability} />
              </div>
            )}
          </div>

          <div className="p-4 space-y-3.5">
            {isGuestMode || !myAccountId ? (
              <div className="py-4 text-center space-y-2.5">
                <div className="mx-auto h-9 w-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-300">
                  Log in to see your skill match, profile stats, and estimated application probability.
                </p>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition cursor-pointer"
                  >
                    Log In
                  </button>
                )}
              </div>
            ) : loadingProfile ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500 dark:text-zinc-400" />
                <span className="text-xs">Calculating your stats...</span>
              </div>
            ) : !myProfile || !probabilityStats ? (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-zinc-400">
                Unable to load your profile stats right now.
              </div>
            ) : (
              <>
                {/* Profile Banner + Avatar */}
                <div
                  onClick={() =>
                    onSelectFreelancer?.({
                      id: myProfile.id,
                      name: myProfile.name,
                      username: myProfile.username,
                      avatar: myProfile.avatar,
                      bio: myProfile.bio,
                      tagline: myProfile.tagline,
                      verified: myProfile.verified,
                      subscriptionType: myProfile.subscriptionType,
                    })
                  }
                  className={`rounded-xl border overflow-hidden transition cursor-pointer ${
                    selectedFreelancerId === myProfile.id
                      ? "bg-gray-100/90 dark:bg-white/[0.07] border-gray-400 dark:border-white/30"
                      : "bg-gray-50 dark:bg-white/[0.03] border-gray-200/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/25"
                  }`}
                >
                  <div className="relative h-14 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    {bannerPresetUrl(resolveBannerPreset(myProfile.bannerPreset, myProfile.username || myProfile.id)) && (
                      <img
                        src={bannerPresetUrl(resolveBannerPreset(myProfile.bannerPreset, myProfile.username || myProfile.id)) || ""}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/25" />
                  </div>
                  <div className="px-3 pb-3 pt-2 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={myProfile.avatar}
                        alt={myProfile.name}
                        className="h-11 w-11 rounded-full object-cover border-2 border-white dark:border-dark-surface bg-zinc-200 dark:bg-zinc-800 shrink-0 -mt-6 relative z-10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {myProfile.name}
                          </span>
                          <VerificationIcon verified={myProfile.verified} className="h-3.5 w-3.5 shrink-0" />
                          <SubscriptionIcon plan={myProfile.subscriptionType} className="h-3.5 w-3.5 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {myProfile.username && (
                            <p className="text-[11px] text-zinc-500 font-mono truncate">
                              @{myProfile.username}
                            </p>
                          )}
                          {myProfile.roles.map((r, idx) =>
                            r?.role_name ? (
                              <span
                                key={`${r.role_id ?? idx}-${r.role_name}`}
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-white/5"
                              >
                                {r.role_name}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5 text-right">
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-900 dark:text-white">
                        <VerificationIcon verified={myProfile.verified} className="h-3 w-3 shrink-0" />
                        <span>{myProfile.verified ? "Verified" : "Unverified"}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                        <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />
                        <span>
                          {myProfile.starRating === "No Rating"
                            ? `Unrated (${myProfile.ratingCount})`
                            : `${myProfile.starRating} (${myProfile.ratingCount})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700 dark:text-zinc-300">
                      Estimated Chance
                    </span>
                    <span className="font-bold font-mono text-gray-900 dark:text-white">
                      {probabilityStats.probability}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500"
                      style={{ width: `${probabilityStats.probability}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-gray-500 dark:text-zinc-400">
                    <div>
                      Skills: <span className="font-semibold text-gray-800 dark:text-zinc-200">{probabilityStats.skillFitPts}/45</span>
                    </div>
                    <div>
                      Profile: <span className="font-semibold text-gray-800 dark:text-zinc-200">{probabilityStats.readinessPts}/30</span>
                    </div>
                    <div>
                      Demand: <span className="font-semibold text-gray-800 dark:text-zinc-200">{probabilityStats.competitionPts}/25</span>
                    </div>
                  </div>
                </div>

                {/* Your Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                      Completed Jobs
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                      {myContractCounts.completed}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                      Ongoing Jobs
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                      {myContractCounts.ongoing}
                    </div>
                  </div>
                </div>

                {/* Skill Match (only aligned skills have color) */}
                {job.skills && job.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-700 dark:text-zinc-300 inline-flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-500 shrink-0" />
                        <span>Skill Alignment</span>
                      </span>
                      <span className="font-semibold text-gray-500 dark:text-zinc-400">
                        {probabilityStats.matchedSkills.length}/{job.skills.length} matched ({probabilityStats.skillMatchPercent}%)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {probabilityStats.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {probabilityStats.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/10 text-[10px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed border-t border-gray-100 dark:border-white/5 pt-2.5">
                  {probabilityStats.tip}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
