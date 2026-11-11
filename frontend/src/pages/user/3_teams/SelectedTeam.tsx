import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Bell,
  Briefcase,
  Check,
  Copy,
  Edit3,
  FileText,
  Flag,
  Globe,
  Info,
  LayoutDashboard,
  Coins,
  Film,
  Video,
  Lock,
  LogOut,
  MessageCircle,
  MoreVertical,
  Search,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { TeamOverviewTab } from "./team_components/TeamOverviewTab";
import { TeamTaskboard } from "./team_components/TeamTaskboard";
import { TeamChatTab } from "./team_components/TeamChatTab";
import { TeamVideoProjectsTab } from "./team_components/TeamVideoProjectsTab";
import { TeamContractsTab } from "./team_components/TeamContractsTab";
import { TeamGalleryTab } from "./team_components/TeamGalleryTab";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import UserHeader from "@/components/nav/user_header";
import SmartTabBar, { type SmartTabItem } from "@/components/ui/SmartTabBar";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import EditTeamModal, {
  type TeamFormValues,
} from "./team_modals/EditTeamModal";
import LeaveTeamModal from "./team_modals/LeaveTeamModal";
import RemoveMemberModal from "./team_modals/RemoveMemberModal";
import ReportTeamModal from "./team_modals/ReportTeamModal";
import AddTeamReviewModal from "./team_modals/AddTeamReviewModal";
import BusinessVerificationEligibilityModal from "./team_modals/BusinessVerificationEligibilityModal";
import { AddTeamFundsModal } from "./team_modals/AddTeamFundsModal";
import { InviteTeamModal } from "./team_modals/InviteTeamModal";
import TeamTaskDashboard from "./team_tasks/TeamTaskDashboard";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

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
  visibility?: "Public" | "Private";
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
type TeamMarketplaceProposal = {
  id: string;
  title: string;
  counterparty: string;
  status: string;
  amount_credits: number;
  created_at: string;
  summary?: string;
  detail_path: string;
};
type Tab =
  | "overview"
  | "taskboard"
  | "tasks"
  | "services"
  | "gigs"
  | "chat"
  | "video-projects"
  | "contracts"
  | "members"
  | "about"
  | "gallery"
  | "reviews"
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
  const location = useLocation();
  const returnFrom = (location.state as { from?: string } | null)?.from;

  const handleReturn = () => {
    if (returnFrom) {
      navigate(returnFrom);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(isGuest ? "/discovery/teams" : "/teams");
    }
  };
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
  // Collapsible banner state matching Workspace
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ensemble_team_banner_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBannerCollapse = () => {
    setIsBannerCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ensemble_team_banner_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (urlTab === "chat") return "overview";
    if (urlTab === "gigs") return "services";
    return urlTab || "about";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam) {
      if (tabParam === "chat") {
        setActiveTab("overview");
      } else {
        setActiveTab(tabParam === "gigs" ? "services" : tabParam);
      }
    } else if (team) {
      const isMember = team.current_user_status === "Active" || team.current_user_role === "Owner";
      if (isMember && activeTab === "about") {
        setActiveTab("overview");
      }
    }
  }, [searchParams, team]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showVerificationEligibility, setShowVerificationEligibility] =
    useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionRecipientId, setDistributionRecipientId] = useState('');
  const [distributionAmount, setDistributionAmount] = useState('');
  const { user, isGuestMode } = useGlobalState();
  const isGuest = Boolean(isGuestMode || !user || user?.role === "guest");
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const theme = useGlobalState((state) => state.theme);
  const [isInitializingTeam, setIsInitializingTeam] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializingTeam(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number>(() => Number(user?.wallet?.balance_credits || user?.credits || 0));

  useEffect(() => {
    if (user?.wallet?.balance_credits !== undefined && user?.wallet?.balance_credits !== null) {
      setPersonalBalance(Number(user.wallet.balance_credits));
    }
  }, [user?.wallet?.balance_credits]);

  const loadTeam = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [teamResponse, membersResponse, reviewsResponse] =
        await Promise.all([
          api.get(`/api/teams/${id}`),
          api.get(`/api/teams/${id}/members`),
          api.get(`/api/teams/${id}/reviews`),
        ]);
      const nextTeam: Team & { team_type?: string } = teamResponse.data.data;
      if (nextTeam.team_type === 'contractual') {
        navigate(`/team-project/${nextTeam.team_id}`, { replace: true });
        return;
      }
      setTeam(nextTeam);
      setMembers(membersResponse.data.data || []);
      setReviews(reviewsResponse.data.data || []);
      if (nextTeam.current_user_membership?.permissions.can_manage_requests) {
        const response = await api.get(`/api/teams/${id}/requests`);
        setRequests(response.data.data || []);
      } else {
        setRequests([]);
      }
      const isMember = nextTeam.current_user_status === 'Active' || nextTeam.current_user_role === 'Owner';
      if (isMember || nextTeam.current_user_membership?.permissions?.can_view_wallet) {
        try {
          const walletResponse = await api.get(`/api/teams/${id}/wallet`);
          setWallet(walletResponse.data.data);
        } catch (_) {}
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
    if (isGuest) {
      setIsGuestModalOpen(true);
      return;
    }
    const verified = await continueIfAccountVerified(
      () => {},
      false,
      "Account Verification is required before joining a Team. Please verify your identity first."
    );
    if (!verified) return;
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

  const openInviteModal = () => {
    setShowMenu(false);
    setShowInviteModal(true);
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
        visibility: values.visibility,
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
        visibility: values.visibility,
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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
    if (tab === "wallet" && !wallet) {
      try {
        const response = await api.get(`/api/teams/${id}/wallet`);
        setWallet(response.data.data);
      } catch (error: unknown) {
        showErrorToast(axiosMessage(error, "Unable to load Team wallet"));
      }
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    try {
      await api.post(`/api/teams/${id}/reviews`, {
        rating,
        comment: comment.trim() || undefined,
      });
      showSuccessToast("Review submitted successfully");
      setShowReviewModal(false);
      void loadTeam(false);
    } catch (error: unknown) {
      showErrorToast(axiosMessage(error, "Unable to submit review"));
      throw error;
    }
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
    const maxAllowed = Number(wallet?.unreserved_balance ?? wallet?.available_balance ?? 0);
    if (amount > maxAllowed) {
      showErrorToast(`Distribution amount exceeds the unreserved Team balance (${maxAllowed.toLocaleString()} credits)`);
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
        unreserved_balance: result.unreserved_balance,
        contract_reserved_balance: result.contract_reserved_balance,
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

  const openAddFundsModal = async () => {
    try {
      const [userWalletRes, teamWalletRes] = await Promise.allSettled([
        api.get("/api/accounts/wallet", { params: { type: 'account_wallets' } }),
        !wallet ? api.get(`/api/teams/${id}/wallet`) : Promise.resolve(null),
      ]);
      if (userWalletRes.status === 'fulfilled') {
        const credits = userWalletRes.value.data?.wallet?.balance_credits;
        if (credits !== undefined && credits !== null) {
          setPersonalBalance(Number(credits));
        }
      }
      if (teamWalletRes.status === 'fulfilled' && teamWalletRes.value?.data?.data) {
        setWallet(teamWalletRes.value.data.data);
      }
    } catch (_) {}
    setShowAddFunds(true);
  };

  const handleAddFundsSuccess = (result: { added_credits: number; team_wallet: any; user_balance_credits: number }) => {
    if (result.team_wallet) {
      setWallet(result.team_wallet);
    } else if (result.added_credits) {
      setWallet((current) => current ? {
        ...current,
        available_balance: Number(current.available_balance || 0) + result.added_credits,
        unreserved_balance: Number(current.unreserved_balance ?? current.available_balance ?? 0) + result.added_credits,
        total_balance: Number(current.total_balance || 0) + result.added_credits,
      } : current);
    }
    if (result.user_balance_credits !== undefined) {
      setPersonalBalance(result.user_balance_credits);
      const currentUser = useGlobalState.getState().user;
      if (currentUser) {
        useGlobalState.getState().setUser({
          ...currentUser,
          wallet: {
            ...(currentUser.wallet || {}),
            balance_credits: result.user_balance_credits,
          },
        });
      }
    }
    if (activeTab === 'transactions') {
      void loadTransactions(1);
    }
  };

  if (loading || isInitializingTeam) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden">
        {/* Background Grid Animation */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Loading Team Workspace
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Gathering team details, collaborative tasks, and collective services...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }
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
  const userRole = String(membership?.role || '').toLowerCase();
  const isOwnerOrAdminOrLeader = activeMember &&
    ['owner', 'admin', 'team leader', 'leader', 'manager'].includes(userRole);
  const canAddFunds = Boolean(permissions.can_add_funds || isOwnerOrAdminOrLeader);
  const pendingRequests = requests.filter(
    (member) => member.status === "Pending",
  );
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const filteredPendingRequests = pendingRequests.filter((member) =>
    !normalizedRequestSearch
    || member.display_name.toLowerCase().includes(normalizedRequestSearch)
    || member.handle.toLowerCase().includes(normalizedRequestSearch)
  );

  const reviewCount = reviews.length > 0 ? reviews.length : Number(team.review_count || 0);
  const numericRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length
      : team.average_rating
      ? Number(team.average_rating)
      : 0;
  const hasRating = reviewCount > 0 && numericRating > 0;
  const teamRating = hasRating ? numericRating.toFixed(1) : null;

  return (
    <Page title={team.display_name}>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-36 space-y-6">
        {/* Navigation & Breadcrumbs: Return to Teams / Return to Discovery */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReturn}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{returnFrom?.includes("discovery") ? "Return to Discovery" : "Return to Teams"}</span>
          </button>

          {permissions.can_manage_requests && pendingRequests.length > 0 && (
            <button
              type="button"
              onClick={() => selectTab("requests")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pendingRequests.length} Pending Join {pendingRequests.length === 1 ? 'Request' : 'Requests'}</span>
            </button>
          )}
        </div>

        {/* Team Header Banner Card (Contained rounded card matching Workspace) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs transition-all duration-300">
          {/* Top banner visual (Collapsible) */}
          <div
            className={`w-full bg-zinc-900 dark:bg-zinc-950 relative rounded-t-2xl overflow-hidden transition-all duration-300 ease-in-out ${
              isBannerCollapsed ? 'max-h-0 opacity-0' : 'h-36 sm:h-52 opacity-100'
            }`}
          >
            {team.avatar_path ? (
              <img
                src={imageUrl(team.avatar_path)}
                alt={team.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 dark:bg-zinc-900 flex items-center justify-center">
                <Users className="w-16 h-16 text-zinc-600 dark:text-zinc-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

            {/* Public or Private Indicator on banner top-left */}
            <div className="absolute top-3.5 left-3.5 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-black/60 text-white border border-white/15 shadow-sm">
                {team.visibility === "Private" ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-300" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-300" />
                )}
                <span>{team.visibility === "Private" ? "Private" : "Public"}</span>
              </span>
            </div>

            {/* Verify as Business and Message on banner bottom-right */}
            <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-2">
              {isTeamOwner &&
                !team.is_business_verified &&
                !team.business_verification_status && (
                <button
                  type="button"
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white transition hover:border-emerald-400/40 hover:bg-emerald-500/20 hover:text-emerald-200 active:scale-[0.98] shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify as Business</span>
                </button>
              )}
              {isTeamOwner &&
                !team.is_business_verified &&
                team.business_verification_status && (
                <button
                  type="button"
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/25 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/35 active:scale-[0.98] shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>View Verification Status</span>
                </button>
              )}
              {activeMember && (
                <button
                  type="button"
                  onClick={() => void openChat()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] px-3.5 py-2 text-xs font-semibold text-white transition shadow-sm"
                  title="Message Team"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Message</span>
                </button>
              )}
            </div>
          </div>

          {/* Header Metadata */}
          <div className={`transition-all duration-300 ${isBannerCollapsed ? 'p-4 sm:px-6' : 'p-5 sm:p-6'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {isBannerCollapsed && (
                  team.avatar_path ? (
                    <img
                      src={imageUrl(team.avatar_path)}
                      alt={team.display_name}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-zinc-500" />
                    </div>
                  )
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">
                  {team.display_name}
                </h1>
              </div>

              {/* Action Buttons: Verify as Business / Message (when collapsed) + Ask to Join + Collapse toggle + 3-dot menu */}
              <div className="flex items-center gap-2 shrink-0">
                {isBannerCollapsed && (
                  <>
                    {isTeamOwner && !team.is_business_verified && (
                      <button
                        type="button"
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
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer"
                        title="Verify as Business"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Verify as Business</span>
                      </button>
                    )}
                    {activeMember && (
                      <button
                        type="button"
                        onClick={() => void openChat()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition cursor-pointer"
                        title="Message Team"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Message</span>
                      </button>
                    )}
                  </>
                )}

                {!membership && (
                  <button
                    type="button"
                    onClick={() => void requestToJoin()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {saving ? "Submitting..." : "Ask to Join"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleBannerCollapse}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer"
                  title={isBannerCollapsed ? 'Expand banner' : 'Collapse banner'}
                >
                  {isBannerCollapsed ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Expand Banner</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="hidden sm:inline">Collapse Banner</span>
                    </>
                  )}
                </button>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer"
                    title="More options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                        {permissions.can_update_team && (
                          <button
                            onClick={() => { setShowMenu(false); setShowEdit(true); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer text-left"
                          >
                            <Edit3 className="w-4 h-4 text-zinc-500" />
                            <span>Edit Team</span>
                          </button>
                        )}
                        {permissions.can_manage_members && (
                          <button
                            onClick={openInviteModal}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer text-left"
                          >
                            <UserPlus className="w-4 h-4 text-zinc-500" />
                            <span>Invite Member</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            if (isGuest) {
                              setIsGuestModalOpen(true);
                              return;
                            }
                            setShowReport(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer text-left"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report Team</span>
                        </button>
                        {activeMember && membership?.role !== "Owner" && (
                          <button
                            onClick={() => { setShowMenu(false); setShowLeave(true); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Leave Team</span>
                          </button>
                        )}
                        {permissions.can_delete_team && (
                          <button
                            onClick={() => { setShowMenu(false); void deleteTeam(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Team</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              {team.description || "This team seems lazy to provide a description..."}
            </p>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              {/* Public or Private Indicator Tag */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {team.visibility === "Private" ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                )}
                <span>{team.visibility === "Private" ? "Private Team" : "Public Team"}</span>
              </span>

              {/* Verified Business Tag */}
              {team.is_business_verified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Verified Business</span>
                </span>
              )}

              {/* Handle */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                @{team.handle}
              </span>

              {/* Members */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                <Users className="w-3 h-3 text-zinc-500" />
                <span>{team.member_count} {team.member_count === 1 ? 'member' : 'members'}</span>
              </span>

              {/* Rating */}
              {hasRating ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{teamRating}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">({reviewCount})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700">
                  <Star className="w-3 h-3 text-zinc-400" />
                  <span>No Rating</span>
                </span>
              )}

              {/* Team Leader */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                <span className="text-zinc-500">Leader:</span>
                <strong className="font-semibold text-zinc-900 dark:text-white">{team.owner_name}</strong>
              </span>

              {/* Team Join Code */}
              {team.join_code && (
                <button
                  type="button"
                  onClick={() => void copyTeamCode()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 cursor-pointer transition"
                  title="Click to copy Team Code"
                >
                  {codeCopied ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500" />
                  )}
                  <span>{codeCopied ? "Copied!" : team.join_code}</span>
                </button>
              )}

              {/* Wallet */}
              {wallet && (permissions.can_view_wallet || isOwnerOrAdminOrLeader) && (
                <button
                  type="button"
                  onClick={() => selectTab("wallet")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-500/20 cursor-pointer transition"
                  title="View Team Wallet & Escrow"
                >
                  <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{Number(wallet.available_balance || 0).toLocaleString()} cr</span>
                  {Number(wallet.escrow_balance || 0) > 0 && (
                    <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                      ({Number(wallet.escrow_balance).toLocaleString()} in escrow)
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs attached at bottom of the card */}
          <TeamTabs
            active={activeTab}
            isMember={Boolean(activeMember)}
            showWallet={Boolean(permissions.can_view_wallet || isOwnerOrAdminOrLeader)}
            showRequests={Boolean(permissions.can_manage_requests)}
            requestCount={pendingRequests.length}
            onSelect={selectTab}
          />
        </div>

        {/* Pending / Invited Status Alerts */}
        {membership?.status === "Pending" && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Your request to join this Team is pending approval.</span>
          </div>
        )}

        {membership?.status === "Invited" && (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="text-emerald-200">You have been invited to join this Team!</span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() =>
                  void continueIfAccountVerified(
                    () => void mutate("/invitations/accept", "patch"),
                    false,
                    "Account Verification is required before accepting a Team invitation. Please verify your identity first."
                  )
                }
                className="cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] px-4 py-1.5 text-xs font-bold text-white transition shadow-sm"
              >
                Accept invitation
              </button>
              <button
                onClick={() => void mutate("/invitations/decline", "patch")}
                className="cursor-pointer rounded-xl border border-red-500/40 hover:bg-red-500/10 active:scale-[0.98] px-4 py-1.5 text-xs font-bold text-red-400 transition"
              >
                Decline
              </button>
            </div>
          </div>
        )}

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
          isMember={Boolean(activeMember)}
          canAddFunds={canAddFunds}
          onAddFunds={() => void openAddFundsModal()}
          onSelectTab={selectTab}
          onOpenInviteModal={openInviteModal}
          onOpenChat={() => void openChat()}
          copyTeamCode={() => void copyTeamCode()}
          codeCopied={codeCopied}
          canViewMarketplaceProposals={activeMember && ["Owner", "Representative", "Admin"].includes(membership?.role || "")}
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
          transactions={transactions}
          transactionSearch={transactionSearch}
          transactionDate={transactionDate}
          transactionPage={transactionPage}
          transactionTotalPages={transactionTotalPages}
          onTransactionSearch={setTransactionSearch}
          onTransactionDate={setTransactionDate}
          onLoadTransactions={loadTransactions}
          onReview={() => {
            if (isGuest) {
              setIsGuestModalOpen(true);
              return;
            }
            setShowReviewModal(true);
          }}
        />
      </main>

      <GuestLoginModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
      />

      <AddTeamFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        teamId={id}
        teamName={team.display_name}
        teamBalance={Number(wallet?.available_balance || 0)}
        userBalance={personalBalance}
        onSuccess={handleAddFundsSuccess}
      />

      <InviteTeamModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        team={team}
        onInvited={() => void loadTeam(false)}
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
      <AddTeamReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        teamName={team.display_name}
        onSubmit={handleReviewSubmit}
      />
      <EditTeamModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        teamName={team.display_name}
        teamHandle={team.handle}
        teamTagline={team.tagline}
        teamDescription={team.description}
        teamVisibility={team.visibility || "Public"}
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
              Send general team credits to an active member’s personal account wallet.
            </p>
            <div className="mt-3 space-y-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Liquid Team Balance:</span>
                <span className="font-semibold text-white">{Number(wallet?.available_balance || 0).toLocaleString()} cr</span>
              </div>
              {Number(wallet?.contract_reserved_balance || 0) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Reserved for Contracts (Locked):</span>
                  <span>-{Number(wallet?.contract_reserved_balance).toLocaleString()} cr</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-1 font-medium text-emerald-400">
                <span>Unreserved Available:</span>
                <span>{Number(wallet?.unreserved_balance ?? wallet?.available_balance ?? 0).toLocaleString()} cr</span>
              </div>
            </div>
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
              <button type="button" disabled={saving} onClick={() => setShowDistribution(false)} className="cursor-pointer rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition active:scale-[0.98]">Cancel</button>
              <button type="button" disabled={saving || !distributionRecipientId || !distributionAmount} onClick={() => void distributeFunds()} className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-[0.98] px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"><ArrowRightLeft className="h-4 w-4" />{saving ? 'Distributing...' : 'Distribute funds'}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function TeamTabs({
  active,
  isMember,
  showWallet,
  showRequests,
  requestCount,
  onSelect,
}: {
  active: Tab;
  isMember: boolean;
  showWallet: boolean;
  showRequests: boolean;
  requestCount: number;
  onSelect: (tab: Tab) => void;
}) {
  const memberTabs: Array<SmartTabItem<Tab>> = [
    { id: "overview", label: "Overview", icon: Info, group: "Collaboration" },
    { id: "taskboard", label: "Taskboard", icon: LayoutDashboard, group: "Collaboration" },
    { id: "services", label: "Services", icon: Briefcase, group: "Collaboration" },

    { id: "video-projects", label: "Video Projects", icon: Video, group: "Collaboration" },
    { id: "contracts", label: "Contracts", icon: FileText, group: "Management" },
    { id: "members", label: "Members", icon: Users, group: "Management" },
  ];

  const visitorTabs: Array<SmartTabItem<Tab>> = [
    { id: "about", label: "About", icon: Info, group: "Team" },
    { id: "services", label: "Services", icon: Briefcase, group: "Team" },
    { id: "gallery", label: "Gallery", icon: Film, group: "Team" },
    { id: "reviews", label: "Rate & Reviews", icon: Star, group: "Team" },
    { id: "members", label: "Members", icon: Users, group: "Team" },
  ];

  const tabs: Array<SmartTabItem<Tab>> = isMember ? [...memberTabs] : [...visitorTabs];

  if (isMember) {
    if (showRequests) {
      tabs.push({
        id: "requests",
        label: "Pending Requests",
        icon: UserPlus,
        badge: requestCount > 0 ? requestCount : undefined,
        badgeColor: "bg-red-500 text-white",
        group: "Management",
      });
    }
    if (showWallet) {
      tabs.push({ id: "wallet", label: "Wallet", icon: Coins, group: "Management" });
      tabs.push({ id: "transactions", label: "Transactions", icon: ArrowRightLeft, group: "Management" });
    }
  }

  const normalizedActive = (
    active === "tasks" ? "taskboard" : active === "gigs" ? "services" : active
  ) as Tab;

  return (
    <SmartTabBar<Tab>
      tabs={tabs}
      activeTab={normalizedActive}
      onSelectTab={onSelect}
      jumpMenuTitle="Team Tabs"
    />
  );
}

function TeamServicesSection({
  team,
  canManage,
  isMember,
  isOwner,
}: {
  team: Team;
  canManage: boolean;
  isMember: boolean;
  isOwner: boolean;
}) {
  const navigate = useNavigate();
  const [services, setServices] = useState<TeamMarketplacePost[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<"services" | "orders">("services");
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api.get(`/api/teams/${team.team_id}/marketplace-posts`, { params: { type: "gigs" } })
      .then((res) => {
        if (mounted) setServices(res.data.data || []);
      })
      .catch((err) => {
        if (mounted) setError(axiosMessage(err, "Unable to load Team services"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [team.team_id]);

  useEffect(() => {
    if (!isMember) return;
    let mounted = true;
    setLoadingOrders(true);
    api.get("/api/gigs/orders/incoming", {
      params: {
        teamId: team.team_id,
        teamAccountId: team.account_id,
      },
    })
      .then((res) => {
        if (mounted) {
          const records = Array.isArray(res.data.data) ? res.data.data : [];
          // Double filter to guarantee only orders for this team's services or account
          const teamGigIds = new Set(services.map((s) => String(s.id)));
          const filtered = records.filter((ord: any) => {
            if (team.account_id && ord.freelancer_account_id) {
              return String(ord.freelancer_account_id) === String(team.account_id);
            }
            if (teamGigIds.size > 0) {
              return teamGigIds.has(String(ord.gig_id));
            }
            return true;
          });
          setOrders(filtered);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingOrders(false);
      });
    return () => { mounted = false; };
  }, [isMember, team.team_id, team.account_id, services]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <span>Team Services</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Services offered collectively by {team.display_name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isMember && (
            <button
              type="button"
              onClick={() => navigate(`/gigs/create?teamId=${team.team_id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Offer a Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs for Members: Services Offered vs Orders */}
      {isMember && (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setSubTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "services"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Services Offered ({services.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subTab === "orders"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <span>Client Orders</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500 text-white font-extrabold">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Services Grid */}
      {subTab === "services" && (
        <>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
              {error}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-12 text-center bg-white/50 dark:bg-white/[0.02]">
              <Briefcase className="w-10 h-10 text-gray-400 dark:text-zinc-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                No Services Offered Yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                {isMember
                  ? "Your team hasn't listed any collective services yet. Create a service listing so clients can order from your team."
                  : "This team has not listed any public services yet. Check back soon!"}
              </p>
              {isMember && (
                <button
                  type="button"
                  onClick={() => navigate(`/gigs/create?teamId=${team.team_id}`)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Offer First Service</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const minimum = Number(service.rate_credits_min || 0);
                return (
                  <div
                    key={service.id}
                    onClick={() => navigate(`/gigs/services/${service.id}`)}
                    className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400/40 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative h-40 bg-zinc-900 overflow-hidden shrink-0">
                      {service.thumbnail_path ? (
                        <img
                          src={imageUrl(service.thumbnail_path)}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Briefcase className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />
                      {service.category && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/15">
                          {service.category}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-500 transition-colors">
                          {service.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-400 line-clamp-2">
                          {service.description || "No description provided."}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">
                            Starting at
                          </p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">
                            {minimum.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">credits</span>
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-500 group-hover:translate-x-0.5 transition-transform">
                          Order Service →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Orders View (for Team Members & Leader) */}
      {subTab === "orders" && isMember && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-600 dark:text-blue-400">
            {isOwner
              ? "As Team Leader, you receive and manage incoming client orders for this team. All team members are notified of incoming orders."
              : "Incoming client orders for this team. The Team Leader manages and accepts these orders on behalf of the team."}
          </div>

          {loadingOrders ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-10 text-center bg-white/50 dark:bg-white/[0.02]">
              <p className="text-xs text-gray-500 dark:text-zinc-400">No active client orders found for this team yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord: any) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {ord.gig_title || "Team Service Order"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      Ordered by: <strong className="text-gray-700 dark:text-zinc-300">{ord.client_name || ord.client_handle || "Client"}</strong>
                      {ord.price && ` · ${Number(ord.price).toLocaleString()} credits`}
                      {ord.created_at && ` · ${new Date(ord.created_at).toLocaleDateString()}`}
                    </p>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => navigate(ord.gig_id && ord.id ? `/gigs/orders/incoming/${ord.gig_id}/order/${ord.id}` : `/gigs/orders/incoming/${ord.gig_id || ''}`)}
                      className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition hover:opacity-90 shrink-0 cursor-pointer"
                    >
                      Manage Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
  isMember,
  canAddFunds,
  onAddFunds,
  onSelectTab,
  onOpenInviteModal,
  onOpenChat,
  copyTeamCode,
  codeCopied,
  canViewMarketplaceProposals,
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
  transactions,
  transactionSearch,
  transactionDate,
  transactionPage,
  transactionTotalPages,
  onTransactionSearch,
  onTransactionDate,
  onLoadTransactions,
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
  isMember: boolean;
  canAddFunds: boolean;
  onAddFunds: () => void;
  onSelectTab: (tab: Tab) => void;
  onOpenInviteModal: () => void;
  onOpenChat: () => void;
  copyTeamCode: () => void;
  codeCopied: boolean;
  canViewMarketplaceProposals: boolean;
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
  transactions: TeamTransaction[];
  transactionSearch: string;
  transactionDate: string;
  transactionPage: number;
  transactionTotalPages: number;
  onTransactionSearch: (value: string) => void;
  onTransactionDate: (value: string) => void;
  onLoadTransactions: (page?: number) => void;
  onReview: () => void;
}) {
  if (active === "overview") {
    return (
      <TeamOverviewTab
        team={team}
        members={members}
        reviews={reviews}
        wallet={wallet}
        canAddFunds={canAddFunds}
        onAddFunds={onAddFunds}
        onSelectTab={onSelectTab}
        onOpenInviteModal={onOpenInviteModal}
        onOpenChat={onOpenChat}
        copyTeamCode={copyTeamCode}
        codeCopied={codeCopied}
      />
    );
  }

  if (active === "taskboard" || active === "tasks") {
    return (
      <TeamTaskboard
        team={team}
        members={members}
        canManage={canManage}
        onBackToOverview={() => onSelectTab("overview")}
      />
    );
  }

  if (active === "services" || active === "gigs" || active === ("jobs" as any)) {
    return (
      <TeamServicesSection
        team={team}
        canManage={canManage}
        isMember={isMember}
        isOwner={isOwner}
      />
    );
  }

  if (active === "chat") {
    return (
      <TeamOverviewSection
        team={team}
        teamName={team.display_name}
        memberCount={members.length}
        members={members}
      />
    );
  }

  if (active === "video-projects") {
    return (
      <TeamVideoProjectsTab
        team={team}
        teamName={team.display_name}
        canManage={canManage}
        isOwner={isOwner}
        teamLeaderName={team.owner_name}
      />
    );
  }

  if (active === "contracts") {
    return (
      <TeamContractsTab
        team={team}
        teamAccountId={team.account_id}
        canViewProposals={canViewMarketplaceProposals}
      />
    );
  }

  if (active === "gallery") {
    return (
      <TeamGalleryTab
        team={team}
        teamName={team.display_name}
      />
    );
  }

  if (active === "about") {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs p-6 font-['Plus_Jakarta_Sans',sans-serif]">
        <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">About this Team</h3>
        <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">{team.description}</p>
        {team.tagline && <p className="text-xs text-gray-400 mt-2 font-medium">{team.tagline}</p>}
      </div>
    );
  }

  if (active === "reviews") {
    return (
      <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Ratings & Reviews ({reviews.length})
          </h3>
          <button
            disabled={saving}
            onClick={onReview}
            className="cursor-pointer rounded-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] px-5 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            Add Review
          </button>
        </div>

        {reviews.length ? (
          <div className="grid gap-3">
            {reviews.map((review) => (
              <div
                key={review.team_review_id}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <b className="text-sm text-gray-900 dark:text-white">{review.display_name}</b>
                  <p className="text-amber-400 text-sm">{"★".repeat(review.rating)}</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-300">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-12 text-center text-xs text-gray-500 dark:text-zinc-400">
            No reviews yet. Be the first to review this team!
          </div>
        )}
      </div>
    );
  }

  if (active === "requests") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-white/[0.03] font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Pending Join Requests</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Review people who asked to join this Team.</p>
          </div>
          <label className="flex min-w-64 items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 focus-within:border-blue-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0" />
            <input
              value={requestSearch}
              onChange={(e) => onRequestSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>

        {requests.length ? (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {requests.map((member) => (
              <div
                key={member.team_member_id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{member.display_name}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">@{member.handle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() => onApproveRequest(member.account_id)}
                    className="cursor-pointer rounded-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => onDenyRequest(member.account_id)}
                    className="cursor-pointer rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-[0.98] px-4 py-1.5 text-xs font-bold text-gray-600 dark:text-zinc-300 transition disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">No pending join requests.</div>
        )}
      </section>
    );
  }

  if (active === "wallet") {
    const available = Number(wallet?.available_balance || 0);
    const escrowed = Number(wallet?.escrow_balance || 0);
    const reserved = Number(wallet?.contract_reserved_balance || 0);
    const total = Number(wallet?.total_balance ?? (available + escrowed));

    return (
      <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Team Treasury & Escrow</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Financial overview, liquid funds, and secured escrow balances for {team.display_name}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canAddFunds && (
                <button
                  type="button"
                  onClick={onAddFunds}
                  className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Funds</span>
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={onDistributeFunds}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-700 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                >
                  Distribute Funds
                </button>
              )}
            </div>
          </div>

          {/* Treasury Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {/* Available Balance */}
            <div className="p-4.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Available Balance
              </p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 font-mono">
                {available.toLocaleString()} <span className="text-xs font-normal text-gray-400">credits</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                Liquid credits available for collective services, tools, or distribution.
              </p>
            </div>

            {/* Escrow Balance */}
            <div className="p-4.5 rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                In Escrow
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                {escrowed.toLocaleString()} <span className="text-xs font-normal text-gray-400">credits</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                Safely locked in escrow for ongoing contracts and milestone deliverables.
              </p>
            </div>

            {/* Total Balance */}
            <div className="p-4.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Total Team Valuation
              </p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 font-mono">
                {total.toLocaleString()} <span className="text-xs font-normal text-gray-400">credits</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                Aggregate team assets including available liquidity and escrow.
              </p>
            </div>
          </div>

          {reserved > 0 && (
            <div className="mt-4 p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between text-xs">
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Contract Reserved Payouts:
              </span>
              <span className="font-bold text-purple-900 dark:text-purple-200 font-mono">
                {reserved.toLocaleString()} credits
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (active === "transactions") {
    return (
      <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Transaction History</h3>
          <input
            type="text"
            placeholder="Search transactions..."
            value={transactionSearch}
            onChange={(e) => onTransactionSearch(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>

        {transactions.length ? (
          <div className="divide-y divide-gray-100 dark:divide-white/5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-xs">
            {transactions.map((tx) => (
              <div key={tx.transaction_id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{tx.description || tx.type}</p>
                  <p className="text-gray-400 text-[11px]">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${Number(tx.amount_credits) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {Number(tx.amount_credits) >= 0 ? "+" : ""}{Number(tx.amount_credits).toLocaleString()} cr
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-400 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
            No transactions found.
          </div>
        )}
      </div>
    );
  }

  // Fallback: Members tab
  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Team Members ({members.length})
        </h3>
        {canManage && (
          <button
            onClick={onOpenInviteModal}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] px-4 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Member
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div
            key={member.team_member_id}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={imageUrl(member.avatar_path) || "/placeholders/avatar.png"}
                alt={member.display_name}
                className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-white/5"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {member.display_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                  @{member.handle} · <span className="font-semibold text-blue-500">{member.role}</span>
                </p>
              </div>
            </div>

            {canManage && member.role !== "Owner" && (
              <button
                disabled={saving}
                onClick={() => onRemove(member)}
                className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Remove Member"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      <UserHeader pageTitle="Team" />
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
