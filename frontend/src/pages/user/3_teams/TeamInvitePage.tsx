import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Users, ShieldCheck, ArrowRight, LoaderCircle, AlertCircle, Sparkles, CheckCircle2, Lock, Globe } from "lucide-react";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { getImageUrl } from "@/lib/utils";

interface TeamInviteData {
  team_id: string;
  display_name: string;
  handle: string;
  tagline?: string | null;
  description?: string | null;
  avatar_path?: string | null;
  member_count: number;
  category?: string | null;
  visibility: "Public" | "Private";
  join_policy: "Open" | "Approval";
  website?: string | null;
  location?: string | null;
  is_business_verified: boolean;
  owner_name: string;
  owner_handle: string;
  current_user_status?: "Active" | "Pending" | "Suspended" | "Invited" | "Left" | null;
  current_user_role?: string | null;
}

export default function TeamInvitePage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const { user } = useGlobalState();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamInviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!joinCode) {
      setError("No invite code provided.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .get(`/api/teams/invite/${encodeURIComponent(joinCode)}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data?.data) {
          setTeam(res.data.data);
        } else {
          setError("Invite link is invalid or has expired.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err.response?.data?.message || "Invite link is invalid or has expired.";
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [joinCode]);

  const handleJoin = async () => {
    if (!team || !joinCode) return;

    if (!user) {
      navigate(`/login?redirect=/teams/join/${encodeURIComponent(joinCode)}`);
      return;
    }

    if (team.current_user_status === "Active") {
      navigate(`/teams/${team.team_id}`);
      return;
    }

    setJoining(true);
    try {
      const res = await api.post("/api/teams/join-by-code", {
        code: joinCode,
      });

      const result = res.data?.data;
      const targetTeamId = result?.team_id || team.team_id;

      if (result?.status === "Active" || team.join_policy === "Open") {
        showSuccessToast(`Welcome to ${team.display_name}!`);
      } else {
        showSuccessToast("Join request submitted! Team admins will review it.");
      }

      navigate(`/teams/${targetTeamId}`);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showErrorToast(msg || "Unable to join this team.");
      setJoining(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white transition-colors duration-200">
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Brand logo top link */}
      <div className="relative mb-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition"
        >
          <img src="/ensemble_lg.svg" alt="Ensemble" className="h-8 w-8" />
          <span>Ensemble</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-7 sm:p-9 shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <LoaderCircle className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-zinc-400">Loading invite details…</p>
          </div>
        ) : error || !team ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Invalid Invite Link
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {error || "This invite link may have expired or is incorrect."}
              </p>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => navigate("/teams")}
                className="cursor-pointer inline-flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 px-6 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] shadow-sm"
              >
                Browse Teams
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {/* Header prompt: Discord style */}
            <p className="text-[11px] font-semibold tracking-wider text-gray-400 dark:text-zinc-400 uppercase mb-6">
              You've been invited to join a team
            </p>

            {/* Team Avatar */}
            <div className="relative mx-auto mb-4 inline-block">
              {team.avatar_path ? (
                <img
                  src={getImageUrl(team.avatar_path)}
                  alt={team.display_name}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-gray-100 dark:ring-white/10 shadow-lg mx-auto"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-blue-500/20 text-3xl font-extrabold text-blue-400 ring-4 ring-gray-100 dark:ring-white/10 shadow-lg mx-auto">
                  {team.display_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {team.is_business_verified && (
                <div
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white dark:ring-dark-surface"
                  title="Verified Business"
                >
                  <ShieldCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Team Title & Handle */}
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {team.display_name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
              @{team.handle}
            </p>

            {/* Description or Tagline */}
            {(team.tagline || team.description) && (
              <p className="mt-3 line-clamp-3 text-xs text-gray-600 dark:text-zinc-300 px-2 leading-relaxed">
                {team.tagline || team.description}
              </p>
            )}

            {/* Badges / Stats Container */}
            <div className="my-6 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-4 text-xs">
              <div className="flex items-center justify-around gap-2 text-gray-600 dark:text-zinc-300">
                {/* Member Count */}
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Users className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                  <span>
                    {team.member_count} {team.member_count === 1 ? "Member" : "Members"}
                  </span>
                </div>

                <span className="text-gray-300 dark:text-zinc-700">|</span>

                {/* Visibility */}
                <div className="flex items-center gap-1">
                  {team.visibility === "Private" ? (
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span>{team.visibility} Team</span>
                </div>

                <span className="text-gray-300 dark:text-zinc-700">|</span>

                {/* Owner */}
                <span className="truncate max-w-[120px]" title={`Owner: @${team.owner_handle || team.owner_name}`}>
                  @{team.owner_handle || team.owner_name}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                <CheckCircle2 className="h-3 w-3 text-blue-400" />
                <span>
                  {team.join_policy === "Open"
                    ? "Direct Join — No approval required"
                    : "Approval Required — Request submitted to team admins"}
                </span>
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-3">
              {!user ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/login?redirect=/teams/join/${encodeURIComponent(joinCode || "")}`
                      )
                    }
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 hover:bg-blue-400 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] shadow-md shadow-blue-500/20"
                  >
                    Log In to Accept Invite
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Don't have an account?{" "}
                    <Link
                      to={`/signup?redirect=/teams/join/${encodeURIComponent(joinCode || "")}`}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Sign up
                    </Link>
                  </p>
                </>
              ) : team.current_user_status === "Active" ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/teams/${team.team_id}`)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] shadow-md shadow-emerald-500/20"
                  >
                    Already a Member — Open Team
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    You're currently an active member of this team.
                  </p>
                </>
              ) : team.current_user_status === "Pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/teams/${team.team_id}`)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] shadow-md shadow-amber-500/20"
                  >
                    Join Request Pending — View Team
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    Your request has been submitted and is awaiting admin approval.
                  </p>
                </>
              ) : team.current_user_status === "Suspended" ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-400">
                  Your membership in this team has been suspended.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={joining}
                  onClick={() => void handleJoin()}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 hover:bg-blue-400 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {team.join_policy === "Open" ? "Joining Team..." : "Sending Request..."}
                    </>
                  ) : team.join_policy === "Open" ? (
                    <>
                      Accept Invite & Join
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Request to Join Team
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <div className="mt-8 text-center text-xs text-gray-500 dark:text-zinc-500">
        <Link to="/teams" className="hover:text-blue-500 transition">
          Browse All Teams
        </Link>
        <span className="mx-2">·</span>
        <Link to="/home" className="hover:text-blue-500 transition">
          Home
        </Link>
      </div>
    </div>
  );
}
