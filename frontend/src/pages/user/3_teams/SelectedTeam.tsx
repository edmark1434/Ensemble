import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  Briefcase,
  Check,
  Copy,
  Edit3,
  Flag,
  Image,
  Info,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MoreVertical,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import EditTeamModal, {
  type TeamFormValues,
} from "./team_modals/EditTeamModal";
import LeaveTeamModal from "./team_modals/LeaveTeamModal";
import RemoveMemberModal from "./team_modals/RemoveMemberModal";
import ReportTeamModal from "./team_modals/ReportTeamModal";
import BusinessVerificationEligibilityModal from "./team_modals/BusinessVerificationEligibilityModal";
import TeamTaskDashboard from "./team_tasks/TeamTaskDashboard";

type PermissionSet = Record<string, boolean>;
type Membership = { role: string; status: string; permissions: PermissionSet };
type Team = {
  team_id: string;
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
  requested_at?: string;
};
type Review = {
  team_review_id: string;
  display_name: string;
  rating: number;
  comment?: string;
};
type Wallet = Record<string, number>;
type TeamTransaction = { credit_transaction_id: string; type: string; amount_credits: number; status: string; created_at: string; recipient_name: string; recipient_handle: string };
type TeamMarketplacePost = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  created_at: string;
  rate_credits_min?: number;
  rate_credits_max?: number | null;
  activity_count?: number;
  thumbnail_path?: string;
};
type Tab =
  | "about"
  | "jobs"
  | "gigs"
  | "assets"
  | "reviews"
  | "members"
  | "tasks"
  | "requests"
  | "wallet"
  | "transactions";

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
  const [transactions, setTransactions] = useState<TeamTransaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [requestSearch, setRequestSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showVerificationEligibility, setShowVerificationEligibility] =
    useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionRecipientId, setDistributionRecipientId] = useState('');
  const [distributionAmount, setDistributionAmount] = useState('');

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
      } else {
        setRequests([]);
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

  const requestToJoin = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await api.post(`/api/teams/${id}/join`);
      const membership = response.data.data as { role: string; status: string };
      setTeam((current) => current ? {
        ...current,
        current_user_membership: {
          role: membership.role,
          status: membership.status,
          permissions: {},
        },
      } : current);
      showSuccessToast("Join request submitted for approval");
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Unable to submit join request"));
    } finally {
      setSaving(false);
    }
  };

  const manageJoinRequest = async (accountId: string, action: "approve" | "deny") => {
    if (saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/teams/${id}/requests/${accountId}/${action}`);
      setRequests((current) => current.filter((request) => request.account_id !== accountId));
      showSuccessToast(action === "approve" ? "Join request approved" : "Join request denied");
      void loadTeam(false);
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Unable to update join request"));
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

  const distributeFunds = async () => {
    const amount = Number(distributionAmount);
    if (!distributionRecipientId) {
      showErrorToast('Select a Team member');
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showErrorToast('Enter a whole number of credits to distribute');
      return;
    }
    if (amount > Number(wallet?.available_balance || 0)) {
      showErrorToast('Distribution amount exceeds the available Team balance');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post(`/api/teams/${id}/wallet/distributions`, {
        recipients: [{ account_id: distributionRecipientId, amount_credits: amount }],
      });
      const result = response.data?.data;
      setWallet((current) => current ? {
        ...current,
        available_balance: result.available_balance,
        total_balance: Number(current.total_balance || 0),
      } : current);
      setDistributionRecipientId('');
      setDistributionAmount('');
      setShowDistribution(false);
      showSuccessToast('Team funds distributed');
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, 'Unable to distribute Team funds'));
    } finally {
      setSaving(false);
    }
    if (tab === 'transactions') void loadTransactions(1);
  };

  const loadTransactions = async (page = transactionPage) => {
    try { const response = await api.get(`/api/teams/${id}/transactions`, { params: { page, pageSize: 10, search: transactionSearch, dateFrom: transactionDate, dateTo: transactionDate } }); setTransactions(response.data.data?.items || []); setTransactionPage(response.data.data?.pagination?.page || page); setTransactionTotalPages(response.data.data?.pagination?.total_pages || 1); } catch (error: unknown) { showErrorToast(axiosMessage(error, 'Unable to load Team transactions')); }
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
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const filteredPendingRequests = pendingRequests.filter((member) =>
    !normalizedRequestSearch
    || member.display_name.toLowerCase().includes(normalizedRequestSearch)
    || member.handle.toLowerCase().includes(normalizedRequestSearch)
  );

  return (
    <Page title={team.display_name}>
      <div className="relative h-48 overflow-hidden bg-dark-surface">
        {team.avatar_path && (
          <img
            src={imageUrl(team.avatar_path)}
            alt={team.display_name}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-base via-transparent to-transparent" />
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
              Verify as Business
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
              onClick={() => setActiveTab("requests")}
              className="relative rounded-full bg-black/50 p-2 text-gray-900 dark:text-white"
              title="View pending join requests"
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
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-2 shadow-2xl">
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
            onClick={() => void requestToJoin()}
            disabled={saving}
            className="mb-6 cursor-pointer rounded-full bg-blue-500 px-5 py-2 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Submitting request..." : "Ask to Join"}
          </button>
        )}
        {membership?.status === "Pending" && (
          <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Your request to join this Team is pending approval.
          </div>
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
          showTasks={activeMember}
          showWallet={Boolean(permissions.can_view_wallet)}
          showRequests={Boolean(permissions.can_manage_requests)}
          requestCount={pendingRequests.length}
          onSelect={selectTab}
        />
        <TeamTabContent
          active={activeTab}
          team={team}
          members={members}
          reviews={reviews}
          wallet={wallet}
          requests={filteredPendingRequests}
          requestSearch={requestSearch}
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
          onDistributeFunds={() => setShowDistribution(true)}
          onRequestSearch={setRequestSearch}
          onApproveRequest={(account) => void manageJoinRequest(account, "approve")}
          onDenyRequest={(account) => void manageJoinRequest(account, "deny")}
          transactionSearch={transactionSearch}
          transactionDate={transactionDate}
          transactionPage={transactionPage}
          transactionTotalPages={transactionTotalPages}
          transactions={transactions}
          onTransactionSearch={setTransactionSearch}
          onTransactionDate={setTransactionDate}
          onLoadTransactions={loadTransactions}
          onReview={() => void addReview()}
        />
      </main>

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
      {showDistribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-dark-base p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Distribute Team funds</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Send credits from the Team account wallet to an active member’s account wallet. Available: {Number(wallet?.available_balance || 0).toLocaleString()} credits.
            </p>
            <label className="mt-4 block text-sm text-zinc-300">
              Team member
              <select value={distributionRecipientId} onChange={(event) => setDistributionRecipientId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-base px-3 py-2 text-white outline-none focus:border-blue-400">
                <option value="">Select a member</option>
                {members.filter((member) => member.status === 'Active').map((member) => <option key={member.account_id} value={member.account_id}>{member.display_name} (@{member.handle})</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm text-zinc-300">
              Credits to distribute
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={distributionAmount}
                onChange={(event) => setDistributionAmount(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none focus:border-blue-400"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setShowDistribution(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]">Cancel</button>
              <button type="button" disabled={saving || !distributionRecipientId || !distributionAmount} onClick={() => void distributeFunds()} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"><ArrowRightLeft className="h-4 w-4" />{saving ? 'Distributing...' : 'Distribute funds'}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function TeamTabs({
  active,
  showTasks,
  showWallet,
  showRequests,
  requestCount,
  onSelect,
}: {
  active: Tab;
  showTasks: boolean;
  showWallet: boolean;
  showRequests: boolean;
  requestCount: number;
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
  if (showTasks) tabs.splice(1, 0, { id: "tasks", label: "Task Dashboard", icon: LayoutDashboard });
  if (showRequests) tabs.push({ id: "requests", label: "Pending Requests", icon: UserPlus });
  if (showWallet) { tabs.push({ id: "wallet", label: "Wallet", icon: Briefcase }); tabs.push({ id: "transactions", label: "Transactions", icon: ArrowRightLeft }); }
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
          {id === "requests" && requestCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {requestCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function TeamMarketplacePosts({ teamId, type }: { teamId: string; type: "jobs" | "gigs" }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TeamMarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get(`/api/teams/${teamId}/marketplace-posts`, { params: { type }, signal: controller.signal })
      .then((response) => setPosts(response.data.data || []))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(axiosMessage(requestError, `Unable to load Team ${type}`));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [teamId, type]);

  if (loading) return <div className="grid gap-3 sm:grid-cols-2"><div className="h-40 animate-pulse rounded-xl bg-white/5" /><div className="h-40 animate-pulse rounded-xl bg-white/5" /></div>;
  if (error) return <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">{error}</div>;
  if (!posts.length) return <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">This Team has no {type === "jobs" ? "job" : "gig"} posts yet.</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => {
        const minimum = Number(post.rate_credits_min || 0);
        const maximum = post.rate_credits_max == null ? null : Number(post.rate_credits_max);
        return (
          <button key={post.id} type="button" onClick={() => navigate(type === "jobs" ? `/jobs/postings/${post.id}` : `/gigs/services/${post.id}`)} className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="h-28 bg-gray-100 dark:bg-white/5">
              {post.thumbnail_path ? <img src={imageUrl(post.thumbnail_path)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Briefcase className="h-8 w-8 text-gray-400 dark:text-zinc-600" /></div>}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 font-semibold text-gray-900 dark:text-white">{post.title}</h3><span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-400">{post.status}</span></div>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-zinc-400">{post.description || "No description provided."}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500"><span>{post.category || "Uncategorized"}</span><span>{maximum && maximum !== minimum ? `${minimum.toLocaleString()}–${maximum.toLocaleString()}` : minimum.toLocaleString()} credits</span></div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">{Number(post.activity_count || 0)} {type === "jobs" ? "proposals" : "orders"} · {new Date(post.created_at).toLocaleDateString()}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
function TeamTabContent({
  active,
  team,
  members,
  reviews,
  wallet,
  requests,
  requestSearch,
  canManage,
  isOwner,
  saving,
  onSuspend,
  onRestore,
  onRemove,
  onRole,
  onTransfer,
  onDistributeFunds,
  onRequestSearch,
  onApproveRequest,
  onDenyRequest,
  transactions, transactionSearch, transactionDate, transactionPage, transactionTotalPages, onTransactionSearch, onTransactionDate, onLoadTransactions,
  onReview,
}: {
  active: Tab;
  team: Team;
  members: Member[];
  reviews: Review[];
  wallet: Wallet | null;
  requests: Member[];
  requestSearch: string;
  canManage: boolean;
  isOwner: boolean;
  saving: boolean;
  onSuspend: (account: string) => void;
  onRestore: (account: string) => void;
  onRemove: (member: Member) => void;
  onRole: (account: string, role: string) => void;
  onTransfer: (account: string) => void;
  onDistributeFunds: () => void;
  onRequestSearch: (value: string) => void;
  onApproveRequest: (account: string) => void;
  onDenyRequest: (account: string) => void;
  transactions: TeamTransaction[]; transactionSearch: string; transactionDate: string; transactionPage: number; transactionTotalPages: number; onTransactionSearch: (value: string) => void; onTransactionDate: (value: string) => void; onLoadTransactions: (page?: number) => void;
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
  if (active === "tasks") return <TeamTaskDashboard teamId={team.team_id} />;
  if (active === "jobs" || active === "gigs")
    return <TeamMarketplacePosts teamId={team.team_id} type={active} />;
  if (active === "assets")
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-12 text-center text-gray-500 dark:text-zinc-400">
        No asset posts available from the Teams API.
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
  if (active === "requests")
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending join requests</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Review people who asked to join this Team.</p>
          </div>
          <label className="flex min-w-64 items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 focus-within:border-blue-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <Search className="mr-2 h-4 w-4 shrink-0" />
            <input
              value={requestSearch}
              onChange={(event) => onRequestSearch(event.target.value)}
              placeholder="Search name or username"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-zinc-600"
            />
          </label>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center dark:border-white/10">
            <UserPlus className="mx-auto h-10 w-10 text-gray-400 dark:text-zinc-600" />
            <p className="mt-3 font-medium text-gray-700 dark:text-zinc-300">
              {requestSearch.trim() ? "No matching join requests" : "No pending join requests"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
              {requestSearch.trim() ? "Try another name or username." : "New requests will appear here for approval."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <article key={request.account_id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-white/10 sm:flex-row sm:items-center">
                {request.avatar_path ? (
                  <img src={imageUrl(request.avatar_path)} alt={request.display_name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-500/15 text-sm font-semibold text-blue-300">
                    {request.display_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{request.display_name}</p>
                  <p className="truncate text-sm text-gray-500 dark:text-zinc-400">@{request.handle}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                    Requested {request.requested_at ? new Date(request.requested_at).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onApproveRequest(request.account_id)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDenyRequest(request.account_id)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Deny
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  if (active === "wallet")
    return wallet ? (
      <div>
        {isOwner && (
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={onDistributeFunds} disabled={saving || Number(wallet.available_balance || 0) <= 0} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowRightLeft className="h-4 w-4" /> Distribute funds
            </button>
          </div>
        )}
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
      </div>
    ) : (
      <p className="text-gray-500 dark:text-zinc-400">Loading wallet…</p>
    );
  if (active === 'transactions') return <div className="rounded-xl border border-white/10 p-4"><div className="mb-4 flex flex-wrap gap-2"><input value={transactionSearch} onChange={(e)=>onTransactionSearch(e.target.value)} placeholder="Search member name" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"/><input type="date" value={transactionDate} onChange={(e)=>onTransactionDate(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"/><button onClick={()=>onLoadTransactions(1)} className="rounded-lg bg-blue-500 px-3 py-2 text-sm text-white">Filter</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-zinc-500"><tr><th className="pb-2">Date</th><th className="pb-2">Recipient</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr></thead><tbody>{transactions.map((item)=><tr key={item.credit_transaction_id} className="border-t border-white/[0.06]"><td className="py-3">{new Date(item.created_at).toLocaleDateString()}</td><td>{item.recipient_name || item.recipient_handle}</td><td>{item.amount_credits.toLocaleString()} credits</td><td>{item.status}</td></tr>)}{!transactions.length&&<tr><td colSpan={4} className="py-6 text-center text-zinc-500">No Team transactions found.</td></tr>}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><button disabled={transactionPage<=1} onClick={()=>onLoadTransactions(transactionPage-1)} className="rounded border border-white/10 px-3 py-1 disabled:opacity-40">Previous</button><span className="px-2 text-sm text-zinc-400">{transactionPage} / {transactionTotalPages}</span><button disabled={transactionPage>=transactionTotalPages} onClick={()=>onLoadTransactions(transactionPage+1)} className="rounded border border-white/10 px-3 py-1 disabled:opacity-40">Next</button></div></div>;
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white">
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
