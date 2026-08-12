import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Check,
  Copy,
  Edit3,
  Flag,
  Image,
  Info,
  LogOut,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import JoinRequestsModal from "./team_modals/JoinRequestsModal";
import EditTeamModal, {
  type TeamFormValues,
} from "./team_modals/EditTeamModal";
import LeaveTeamModal from "./team_modals/LeaveTeamModal";
import RemoveMemberModal from "./team_modals/RemoveMemberModal";
import ReportTeamModal from "./team_modals/ReportTeamModal";
import BusinessVerificationEligibilityModal from "./team_modals/BusinessVerificationEligibilityModal";

type PermissionSet = Record<string, boolean>;
type Membership = { role: string; status: string; permissions: PermissionSet };
type Team = {
  account_id: string;
  display_name: string;
  handle: string;
  tagline?: string;
  description: string;
  avatar_path?: string;
  category?: string;
  location?: string;
  website?: string;
  member_count: number;
  owner_name: string;
  join_code?: string;
  is_business_verified: boolean;
  current_user_is_verified: boolean;
  business_verified_at?: string;
  business_verification_status?: string;
  current_user_membership?: Membership;
};
type Member = {
  account_id: string;
  display_name: string;
  handle: string;
  role: string;
  status: string;
  avatar_path?: string;
};
type Review = {
  team_review_id: string;
  display_name: string;
  rating: number;
  comment?: string;
};
type Wallet = Record<string, number>;
type Tab =
  | "about"
  | "jobs"
  | "gigs"
  | "assets"
  | "reviews"
  | "members"
  | "wallet";

const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
  /\/$/,
  "",
);
const imageUrl = (path?: string) =>
  !path
    ? ""
    : /^https?:\/\//i.test(path)
      ? path
      : `${cloudfront}/${path.replace(/^\/+/, "")}`;

export default function SelectedTeam() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Member[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showVerificationEligibility, setShowVerificationEligibility] =
    useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const loadTeam = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [teamResponse, membersResponse, reviewsResponse] =
        await Promise.all([
          api.get(`/api/teams/${id}`),
          api.get(`/api/teams/${id}/members`),
          api.get(`/api/teams/${id}/reviews`),
        ]);
      const nextTeam: Team = teamResponse.data.data;
      setTeam(nextTeam);
      setMembers(membersResponse.data.data || []);
      setReviews(reviewsResponse.data.data || []);
      if (nextTeam.current_user_membership?.permissions.can_manage_requests) {
        const response = await api.get(`/api/teams/${id}/requests`);
        setRequests(response.data.data || []);
      }
    } catch (error: unknown) {
      const message = axiosMessage(error, "Unable to load Team");
      showErrorToast(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTeam(true);
  }, [loadTeam]);

  const mutate = async (
    path: string,
    method: "post" | "patch" | "delete" = "post",
    body?: unknown,
  ) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.request({ url: `/api/teams/${id}${path}`, method, data: body });
      showSuccessToast("Team updated");
      void loadTeam(false);
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Action failed"));
    } finally {
      setSaving(false);
    }
  };

  const openChat = async () => {
    try {
      const response = await api.post(`/api/teams/${id}/chat`);
      navigate("/inbox/direct", {
        state: { conversationId: response.data.data.conversationId },
      });
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Unable to open Team Chat"));
    }
  };

  const deleteTeam = async () => {
    if (
      !window.confirm(
        `Delete ${team?.display_name || "this Team"}? This cannot be undone.`,
      )
    )
      return;
    await mutate("", "delete");
    navigate("/teams");
  };

  const inviteMember = async () => {
    const accountId = window.prompt("Enter the user's account ID to invite");
    if (!accountId) return;
    await mutate("/invitations", "post", { accountId, role: "Member" });
  };

  const copyTeamCode = async () => {
    if (!team?.join_code) return;

    try {
      await navigator.clipboard.writeText(team.join_code);
      setCodeCopied(true);
      showSuccessToast("Team code copied");
      window.setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      showErrorToast("Unable to copy the Team code");
    }
  };

  const uploadTeamPhoto = async (photo: File) => {
    const uploaded = await uploadFileWithIntent(photo, "profile");
    return uploaded.fileId;
  };

  const updateTeam = async (values: TeamFormValues) => {
    if (saving) return;

    setSaving(true);

    try {
      const avatarFileId = values.photo
        ? await uploadTeamPhoto(values.photo)
        : undefined;

      const response = await api.patch(`/api/teams/${id}`, {
        name: values.name,
        handle: values.handle,
        tagline: values.tagline,
        description: values.description,
        avatarFileId,
      });

      showSuccessToast("Team updated");
      setShowEdit(false);
      setTeam((current) => current ? {
        ...current,
        ...response.data.data,
        display_name: values.name,
        handle: values.handle,
        tagline: values.tagline,
        description: values.description,
      } : current);
      void loadTeam(false);
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Unable to update Team"));
    } finally {
      setSaving(false);
    }
  };

  const selectTab = async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "wallet" && !wallet) {
      try {
        const response = await api.get(`/api/teams/${id}/wallet`);
        setWallet(response.data.data);
      } catch (error: unknown) {
        showErrorToast(axiosMessage(error, "Unable to load Team wallet"));
      }
    }
  };

  const addReview = async () => {
    const ratingValue = window.prompt("Rating from 1 to 5");
    if (ratingValue === null) return;

    const rating = Number(ratingValue);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      showErrorToast("Rating must be a whole number from 1 to 5");
      return;
    }

    const comment = window.prompt("Write your Team review");
    if (comment === null) return;

    await mutate("/reviews", "post", {
      rating,
      comment: comment.trim(),
    });
  };

  if (loading)
    return (
      <Page title="Team">
        <div className="p-8 text-gray-500 dark:text-zinc-400">Loading Team…</div>
      </Page>
    );
  if (!team)
    return (
      <Page title="Team">
        <div className="p-8 text-gray-500 dark:text-zinc-400">Team not found.</div>
      </Page>
    );

  const membership = team.current_user_membership;
  const permissions = membership?.permissions || {};
  const activeMember = membership?.status === "Active";
  const isTeamOwner = activeMember && membership?.role === "Owner";
  const pendingRequests = requests.filter(
    (member) => member.status === "Pending",
  );

  return (
    <Page title={team.display_name}>
      <div className="relative h-48 overflow-hidden bg-[#1e2130]">
        {team.avatar_path && (
          <img
            src={imageUrl(team.avatar_path)}
            alt={team.display_name}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />
        <button
          onClick={() => navigate("/teams")}
          className="absolute left-4 top-4 rounded-full bg-black/50 p-2 text-gray-900 dark:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-4 right-4 flex gap-2">
          {isTeamOwner &&
            !team.is_business_verified &&
            !team.business_verification_status && (
            <button
              onClick={() => {
                if (!team.current_user_is_verified) {
                  setShowVerificationEligibility(true);
                  return;
                }
                navigate(`/teams/${id}/business-verification`, {
                  state: {
                    teamName: team.display_name,
                    teamHandle: team.handle,
                    teamAccountId: team.account_id,
                    verificationStatus: team.business_verification_status,
                    isOwner: true,
                  },
                });
              }}
              className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/15 bg-black/60 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white transition hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:text-emerald-200"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify Business
            </button>
          )}
          {isTeamOwner &&
            !team.is_business_verified &&
            team.business_verification_status && (
              <button
                onClick={() =>
                  navigate(`/teams/${id}/business-verification`, {
                    state: {
                      teamAccountId: team.account_id,
                      teamName: team.display_name,
                      teamHandle: team.handle,
                      verificationStatus: team.business_verification_status,
                      isOwner: true,
                    },
                  })
                }
                className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/25"
              >
                <ShieldCheck className="h-4 w-4" />
                View Verification Status
              </button>
            )}
          {activeMember && (
            <button
              onClick={() => void openChat()}
              className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
          )}
          {permissions.can_manage_requests && (
            <button
              onClick={() => setShowRequests(true)}
              className="relative rounded-full bg-black/50 p-2 text-gray-900 dark:text-white"
            >
              <Bell className="h-5 w-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px]">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl p-6 md:p-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {team.display_name}
            </h1>
            {team.is_business_verified && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Verified Business
              </div>
            )}
            <p className="mt-2 text-gray-500 dark:text-zinc-400">{team.description}</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-zinc-500">
              @{team.handle} · {team.member_count} members · Owner:{" "}
              {team.owner_name}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] p-2 shadow-2xl">
                {permissions.can_update_team && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:bg-white/10"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Team
                  </button>
                )}
                {permissions.can_manage_members && (
                  <button
                    onClick={() => void inviteMember()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:bg-white/10"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </button>
                )}
                <button
                  onClick={() => setShowReport(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:bg-white/10"
                >
                  <Flag className="h-4 w-4" />
                  Report Team
                </button>
                {activeMember && membership?.role !== "Owner" && (
                  <button
                    onClick={() => setShowLeave(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Leave Team
                  </button>
                )}
                {permissions.can_delete_team && (
                  <button
                    onClick={() => void deleteTeam()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Team
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {!membership && (
          <button
            onClick={() => void mutate("/join")}
            disabled={saving}
            className="mb-6 rounded-full bg-blue-500 px-5 py-2 text-gray-900 dark:text-white disabled:opacity-50"
          >
            Ask to Join
          </button>
        )}
        {membership?.status === "Invited" && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => void mutate("/invitations/accept", "patch")}
              className="rounded-full bg-emerald-500 px-5 py-2 text-gray-900 dark:text-white"
            >
              Accept invitation
            </button>
            <button
              onClick={() => void mutate("/invitations/decline", "patch")}
              className="rounded-full border border-red-500/40 px-5 py-2 text-red-300"
            >
              Decline
            </button>
          </div>
        )}
        {team.join_code && (
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                Team Code
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-[0.16em] text-gray-900 dark:text-white">
                {team.join_code}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void copyTeamCode()}
              className={`group mt-3 inline-flex min-w-32 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 sm:mt-0 ${
                codeCopied
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-600 dark:text-zinc-300 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-gray-900 dark:text-white"
              }`}
            >
              {codeCopied ? (
                <Check className="h-4 w-4 animate-[pulse_0.8s_ease-in-out_1]" />
              ) : (
                <Copy className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" />
              )}
              {codeCopied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        )}

        <TeamTabs
          active={activeTab}
          showWallet={Boolean(permissions.can_view_wallet)}
          onSelect={selectTab}
        />
        <TeamTabContent
          active={activeTab}
          team={team}
          members={members}
          reviews={reviews}
          wallet={wallet}
          canManage={Boolean(permissions.can_manage_members)}
          isOwner={membership?.role === "Owner"}
          saving={saving}
          onSuspend={(account) =>
            void mutate(`/members/${account}/suspend`, "patch")
          }
          onRestore={(account) =>
            void mutate(`/members/${account}/restore`, "patch")
          }
          onRemove={setMemberToRemove}
          onRole={(account, role) =>
            void mutate(`/members/${account}/role`, "patch", { role })
          }
          onTransfer={(account) =>
            void mutate("/transfer-ownership", "patch", { accountId: account })
          }
          onReview={() => void addReview()}
        />
      </main>

      <JoinRequestsModal
        isOpen={showRequests}
        onClose={() => setShowRequests(false)}
        requests={pendingRequests.map((member) => ({
          id: member.account_id,
          name: member.display_name,
          avatar: imageUrl(member.avatar_path),
          requestedAt: "recently",
        }))}
        onAccept={(account) =>
          void mutate(`/requests/${account}/approve`, "patch")
        }
        onReject={(account) =>
          void mutate(`/requests/${account}/deny`, "patch")
        }
      />
      <LeaveTeamModal
        isOpen={showLeave}
        onClose={() => setShowLeave(false)}
        teamName={team.display_name}
        onConfirm={() => void mutate("/leave")}
      />
      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        memberName={memberToRemove?.display_name || ""}
        onConfirm={() =>
          memberToRemove &&
          void mutate(`/members/${memberToRemove.account_id}`, "delete")
        }
      />
      <ReportTeamModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        teamName={team.display_name}
        onSubmit={(category, description) =>
          void mutate("/reports", "post", { category, description })
        }
      />
      <EditTeamModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        teamName={team.display_name}
        teamHandle={team.handle}
        teamTagline={team.tagline}
        teamDescription={team.description}
        teamBanner={imageUrl(team.avatar_path)}
        saving={saving}
        onSave={(values) => void updateTeam(values)}
      />
      <BusinessVerificationEligibilityModal
        isOpen={showVerificationEligibility}
        onClose={() => setShowVerificationEligibility(false)}
        onVerifyAccount={() => {
          setShowVerificationEligibility(false);
          navigate("/account-verification-status");
        }}
      />
    </Page>
  );
}

function TeamTabs({
  active,
  showWallet,
  onSelect,
}: {
  active: Tab;
  showWallet: boolean;
  onSelect: (tab: Tab) => void;
}) {
  const tabs: Array<{ id: Tab; label: string; icon: typeof Info }> = [
    { id: "about", label: "About", icon: Info },
    { id: "jobs", label: "Job Posts", icon: Briefcase },
    { id: "gigs", label: "Gig Posts", icon: Briefcase },
    { id: "assets", label: "Assets", icon: Image },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "members", label: "Members", icon: Users },
  ];
  if (showWallet) tabs.push({ id: "wallet", label: "Wallet", icon: Briefcase });
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-white/10">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm ${active === id ? "border-b-2 border-blue-500 bg-blue-500/5 text-blue-400" : "text-gray-500 dark:text-zinc-400 hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none"}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function TeamTabContent({
  active,
  team,
  members,
  reviews,
  wallet,
  canManage,
  isOwner,
  saving,
  onSuspend,
  onRestore,
  onRemove,
  onRole,
  onTransfer,
  onReview,
}: {
  active: Tab;
  team: Team;
  members: Member[];
  reviews: Review[];
  wallet: Wallet | null;
  canManage: boolean;
  isOwner: boolean;
  saving: boolean;
  onSuspend: (account: string) => void;
  onRestore: (account: string) => void;
  onRemove: (member: Member) => void;
  onRole: (account: string, role: string) => void;
  onTransfer: (account: string) => void;
  onReview: () => void;
}) {
  if (active === "about")
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-6">
        <h3 className="mb-2 text-lg font-semibold">About this Team</h3>
        <p className="text-gray-500 dark:text-zinc-400">{team.description}</p>
        <p className="mt-4 text-sm text-gray-500 dark:text-zinc-500">
          Category: {team.category || "—"} · Location: {team.location || "—"}
        </p>
      </div>
    );
  if (["jobs", "gigs", "assets"].includes(active))
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-12 text-center text-gray-500 dark:text-zinc-400">
        No {active} posts available from the Teams API.
      </div>
    );
  if (active === "reviews")
    return (
      <div className="space-y-3">
        <button
          disabled={saving}
          onClick={onReview}
          className="rounded-full bg-blue-500 px-5 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-50"
        >
          Add Review
        </button>
        {reviews.length ? (
          reviews.map((review) => (
            <div
              key={review.team_review_id}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4"
            >
              <b>{review.display_name}</b>
              <p className="text-amber-300">{"★".repeat(review.rating)}</p>
              <p className="text-gray-500 dark:text-zinc-400">{review.comment}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center text-gray-500 dark:text-zinc-400">
            No reviews yet.
          </div>
        )}
      </div>
    );
  if (active === "wallet")
    return wallet ? (
      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(wallet).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <p className="text-xs capitalize text-gray-500 dark:text-zinc-500">
              {key.replaceAll("_", " ")}
            </p>
            <b>{value} credits</b>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 dark:text-zinc-400">Loading wallet…</p>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <div
          key={member.account_id}
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4"
        >
          {member.avatar_path ? (
            <img
              src={imageUrl(member.avatar_path)}
              alt={member.display_name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-500/20">
              {member.display_name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{member.display_name}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              @{member.handle} · {member.role} · {member.status}
            </p>
            {canManage && member.role !== "Owner" && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <select
                  value={member.role}
                  disabled={saving}
                  onChange={(event) =>
                    onRole(member.account_id, event.target.value)
                  }
                  className="rounded bg-gray-100 dark:bg-white/10 px-1 text-gray-600 dark:text-zinc-300"
                >
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Member</option>
                </select>
                {member.status === "Suspended" ? (
                  <button
                    disabled={saving}
                    onClick={() => onRestore(member.account_id)}
                    className="text-emerald-300"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    disabled={saving}
                    onClick={() => onSuspend(member.account_id)}
                    className="text-amber-300"
                  >
                    Suspend
                  </button>
                )}
                <button
                  disabled={saving}
                  onClick={() => onRemove(member)}
                  className="text-red-300"
                >
                  Remove
                </button>
                {isOwner && member.status === "Active" && (
                  <button
                    disabled={saving}
                    onClick={() => onTransfer(member.account_id)}
                    className="text-blue-300"
                  >
                    Transfer ownership
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Page({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-white">
      <UserHeader pageTitle={title} />
      {children}
    </div>
  );
}
function axiosMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return response?.data?.message || fallback;
  }
  return fallback;
}
