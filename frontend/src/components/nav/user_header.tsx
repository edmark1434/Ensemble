import { Bell, ChevronDown, LifeBuoy, Settings, LogOut, User, Search, Sparkles, MessageSquare, Plus, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTourStore } from "@/lib/tour_state";
import { isStaffPlatformViewer } from "@/lib/staffPlatformView";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { signOut } from "firebase/auth";
import { auth } from "@/pages/firebase";

import UserNotificationModal from "./user_notification_modal";
import UserLogoutModal from "./user_logout_modal";
import socket from "@/lib/socket";
import useChatState from "@/components/ui/chat_bubble/chat_state";
import { CreditIcon } from "@/components/ui/credit-icon";
import toast from "react-hot-toast";
import AccountAvatar from "@/components/ui/AccountAvatar";
import { getNotificationIcon, getNotificationLabel } from "@/lib/notificationTypes";
import TicketInviteActions from "@/components/nav/TicketInviteActions";
import { showAccountWarningToast } from "@/components/ui/AccountStanding";
import { isAppealLimitedMember } from "@/lib/appealAccess";
import { DeactivatedBadge } from "@/components/account/DeactivatedBadge";

interface UserHeaderProps {
  pageTitle: string;
  credits?: number;
  userName?: string;
  userAvatar?: string;
  onTopUp?: () => void;
}
interface Notification {
  notification_id: string;
  message: string;
  is_read: boolean;
  reference_table: string;
  reference_prefix: string;
  reference_path: string;
  reference_id: string;
  account_id: string;
  created_at: string;
  deleted_at: string | null;
  userName?: string;
  userAvatar?: string;
  chatMessage?: string;
  chatAction?: string;
  taskType?: string;
  reviewerName?: string;
  reviewerAvatar?: string;
  reviewFeedback?: string | null;
  reviewStars?: number | null;
  actor_account_id?: string;
  is_sealed?: boolean;
  contractCompleted?: boolean;
}

interface CreatorSearchApiAccount {
  account_id: string;
  display_name: string | null;
  handle: string;
  avatar_preset_url: string | null;
  status?: string | null;
}

interface CreatorSearchResult {
  accountId: string;
  name: string;
  username: string;
  avatar: string;
  deactivated?: boolean;
}

const getSubscriptionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "premium":
      return "/icons/subscription/premium.png";
    case "business":
      return "/icons/subscription/studio.png";
    default:
      return "/icons/subscription/freemium.png";
  }
};

const constructAvatarUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Map preset profile avatars (e.g. /public/p1.png or p1.png) to local Vite static assets
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cloudfrontUrl) {
    return `${cloudfrontUrl}/${cleanPath}`;
  }
  return `/${cleanPath}`;
};

const getFallbackAvatar = (name?: string): string => {
  const cleanName = encodeURIComponent((name || 'User').trim());
  return `https://ui-avatars.com/api/?name=${cleanName}&background=71717a&color=fff&size=128`;
};

interface CachedHeaderData {
  accountId: string;
  credits: number;
  avatarUrl: string;
  subscriptionPlan: "Free" | "Premium" | "Business";
  isVerified: boolean;
  lastFetched: number;
}

interface HeaderFetchData {
  credits: number;
  avatarUrl: string;
  subscriptionPlan: "Free" | "Premium" | "Business";
  isVerified: boolean;
}

let cachedHeaderData: CachedHeaderData | null = null;
let pendingHeaderFetch: Promise<HeaderFetchData | null> | null = null;

async function fetchHeaderData(accountId: string): Promise<HeaderFetchData | null> {
  if (pendingHeaderFetch) return pendingHeaderFetch;

  pendingHeaderFetch = (async () => {
    try {
      const [walletResult, avatarResult, planResult, verificationResult] = await Promise.allSettled([
        api.get("/api/accounts/wallet", {
          params: { type: 'account_wallets' },
        }),
        api.get(`/api/accounts/profile/current-avatar`),
        api.get(`/api/subscription/plan-details`),
        api.get('/api/verification/status'),
      ]);

      let planName: "Free" | "Premium" | "Business" = "Free";
      if (planResult.status === 'fulfilled') {
        planName = (planResult.value.data?.planDetails?.plan_name as "Free" | "Premium" | "Business") || "Free";
        useGlobalState.getState().setSubscriptionPlan(planName);
      }

      let verified = false;
      if (verificationResult.status === 'fulfilled') {
        verified = Boolean(verificationResult.value.data?.data?.is_verified);
        useGlobalState.getState().setIsVerified(verified);
      }

      let avatarUrl = '';
      if (avatarResult.status === 'fulfilled' && avatarResult.value.data?.data?.path) {
        avatarUrl = constructAvatarUrl(avatarResult.value.data.data.path);
      }

      let credits = 0;
      if (walletResult.status === 'fulfilled') {
        const rawCredits = walletResult.value.data?.wallet?.balance_credits;
        credits = (rawCredits !== undefined && rawCredits !== null && !isNaN(Number(rawCredits)))
          ? Number(rawCredits)
          : 0;
      } else if (cachedHeaderData?.credits !== undefined) {
        credits = cachedHeaderData.credits;
      } else {
        const currentWallet = useGlobalState.getState().user?.wallet?.balance_credits;
        if (currentWallet !== undefined && currentWallet !== null) {
          credits = Number(currentWallet) || 0;
        }
      }

      const freshData: CachedHeaderData = {
        accountId,
        credits,
        avatarUrl: avatarUrl || cachedHeaderData?.avatarUrl || '',
        subscriptionPlan: planName,
        isVerified: verified,
        lastFetched: Date.now(),
      };

      cachedHeaderData = freshData;

      const currentUser = useGlobalState.getState().user;
      if (currentUser) {
        useGlobalState.getState().setUser({
          ...currentUser,
          ...(avatarUrl ? { avatar_preset_url: avatarUrl } : {}),
          wallet: {
            ...(currentUser.wallet || {}),
            balance_credits: credits,
          },
        });
      }

      return {
        credits,
        avatarUrl,
        subscriptionPlan: planName,
        isVerified: verified,
      };
    } catch (err) {
      console.error("Error refreshing header data:", err);
      return null;
    } finally {
      pendingHeaderFetch = null;
    }
  })();

  return pendingHeaderFetch;
}

// Cache of recent notification IDs to prevent duplicate toasts across renders or re-mounts
const recentToastNotificationKeys = new Set<string>();

const UserHeader: React.FC<UserHeaderProps> = ({
  pageTitle,
  credits: propCredits,
  userName,
  userAvatar,
  onTopUp,
}) => {
  const navigate = useNavigate();

  const storeTheme = useGlobalState((state) => state.theme);
  const searchTheme = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get('theme') as 'light' | 'dark' | null) : null;
  const theme = searchTheme || storeTheme || 'dark';

  useEffect(() => {
    if (searchTheme) {
      if (searchTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, [searchTheme]);

  const [isProfileOpen, setIsProfileOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("openProfile") === "1";
    }
    return false;
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [profilePillStyle, setProfilePillStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
    isDestructive?: boolean;
  }>({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const profileItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleProfileItemHover = (index: number, isDestructive = false) => {
    const el = profileItemRefs.current[index];
    if (!el) return;
    setProfilePillStyle({
      top: el.offsetTop,
      height: el.offsetHeight,
      opacity: 1,
      isDestructive,
    });
  };

  const handleProfileMenuLeave = () => {
    setProfilePillStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hoverItem = new URLSearchParams(window.location.search).get("hoverProfile");
    if (hoverItem !== null) {
      const idx = parseInt(hoverItem, 10);
      if (!isNaN(idx) && idx >= 0 && idx < 5) {
        const timer = setTimeout(() => handleProfileItemHover(idx, idx === 4), 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isProfileOpen]);

  const [headerSearchInput, setHeaderSearchInput] = useState("");
  const [creatorSearchResults, setCreatorSearchResults] = useState<CreatorSearchResult[]>([]);
  const [isSearchingCreators, setIsSearchingCreators] = useState(false);
  const [isCreatorSearchOpen, setIsCreatorSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const creatorSearchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isPreviewMode = urlParams?.get("preview") === "true";

  const rawUserInfo = useGlobalState((state) => state.user);
  const userInfo = rawUserInfo || (isPreviewMode ? {
    account_id: 999,
    username: "alexander_chen",
    display_name: "Alexander Chen",
    subscription_plan: "Premium",
    is_verified: true,
    wallet: { balance_credits: 4250 },
    avatar_url: "/icons/avatar/default_avatar.png"
  } as any : null);

  const isStaffPreview = isStaffPlatformViewer(userInfo);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const isSessionLoading = !isPreviewMode && (isGlobalLoading || (!userInfo?.account_id && !isGuestMode));
  const isGuestView = !isPreviewMode && (isGuestMode || (!isSessionLoading && !userInfo?.account_id));

  const hasCachedData = Boolean(
    cachedHeaderData &&
    userInfo?.account_id &&
    cachedHeaderData.accountId === String(userInfo.account_id)
  );

  const displayName = userName || userInfo?.display_name || userInfo?.displayName || userInfo?.username || "User";
  const defaultFallback = userAvatar || getFallbackAvatar(displayName);

  const initialRawAvatar = hasCachedData
    ? cachedHeaderData!.avatarUrl
    : (userInfo?.avatar_preset_url || userInfo?.avatar_url || userInfo?.avatar || '');

  const initialAvatar = constructAvatarUrl(initialRawAvatar);

  const initialCredits = (hasCachedData && cachedHeaderData!.credits !== undefined)
    ? cachedHeaderData!.credits
    : (userInfo?.wallet?.balance_credits !== undefined && userInfo?.wallet?.balance_credits !== null
      ? Number(userInfo.wallet.balance_credits)
      : (propCredits !== undefined && propCredits !== null
        ? propCredits
        : (isGuestView ? 0 : null)));

  const initialPlan = hasCachedData
    ? cachedHeaderData!.subscriptionPlan
    : ((userInfo?.subscription_plan as "Free" | "Premium" | "Business") || 'Free');

  const initialVerified = hasCachedData
    ? cachedHeaderData!.isVerified
    : (useGlobalState.getState().isVerified || userInfo?.is_verified || false);

  const canShowImmediately = Boolean(isGuestView || userInfo?.account_id || hasCachedData);

  const [showHeader, setShowHeader] = useState(canShowImmediately);
  const [isCheckingAccess, setIsCheckingAccess] = useState(!canShowImmediately);
  const [userCredits, setCredits] = useState<number | null>(initialCredits);
  // --- CREDITS ANIMATION STATE ---
  const prevCreditsRef = useRef<number | null>(null);
  const pendingReloadDeltaRef = useRef<number | null>((() => {
    try {
      if (typeof window === "undefined") return null;
      const saved = sessionStorage.getItem("ensemble:pending_credits_delta");
      if (saved) {
        sessionStorage.removeItem("ensemble:pending_credits_delta");
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.diff === "number" && Date.now() - (parsed.time || 0) < 20000) {
          return parsed.diff;
        }
      }
    } catch (_) {}
    return null;
  })());
  const [displayCredits, setDisplayCredits] = useState<number | null>(initialCredits);
  const [creditDeltas, setCreditDeltas] = useState<
    Array<{ id: number; amount: number; type: "added" | "deducted" }>
  >([]);
  const [pillAnimState, setPillAnimState] = useState<"idle" | "added" | "deducted">("idle");

  const [userAvatarState, setUserAvatarState] = useState<string>(initialAvatar);
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<"Free" | "Premium" | "Business">(initialPlan);
  const [isVerified, setIsVerified] = useState<boolean>(initialVerified);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [isAskAiLoaded, setIsAskAiLoaded] = useState(false);
  const [isAskAiClickLoading, setIsAskAiClickLoading] = useState(false);

  useEffect(() => {
    if (!isCheckingAccess) {
      const t = setTimeout(() => setIsAskAiLoaded(true), 300);
      return () => clearTimeout(t);
    } else {
      setIsAskAiLoaded(false);
    }
  }, [isCheckingAccess]);
  useEffect(() => {
    if (propCredits !== undefined && propCredits !== null && userCredits === null) {
      setCredits(propCredits);
    }
  }, [propCredits, userCredits]);

  useEffect(() => {
    if (userInfo?.wallet?.balance_credits !== undefined && userInfo?.wallet?.balance_credits !== null) {
      const val = Number(userInfo.wallet.balance_credits);
      if (!isNaN(val)) {
        setCredits(val);
        if (cachedHeaderData) {
          cachedHeaderData.credits = val;
        }
      }
    }
  }, [userInfo?.wallet?.balance_credits]);

  useEffect(() => {
    const rawPath = userInfo?.avatar_preset_url || userInfo?.avatar_url || userInfo?.avatar;
    if (rawPath) {
      const url = constructAvatarUrl(rawPath);
      if (url && (!userAvatarState || userAvatarState !== url)) {
        setUserAvatarState(url);
      }
    }
  }, [userInfo?.avatar_preset_url, userInfo?.avatar_url, userInfo?.avatar]);

  useEffect(() => {
    setHasUnreadNotifications(
      notifications.some((notification) => !notification.is_read)
    );
  }, [notifications]);


useEffect(() => {
  if (!userInfo?.account_id) return;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("joinRoom", userInfo.account_id);

  const handleNotificationRead = ({
    notificationId,
    is_read,
  }: {
    notificationId: string;
    is_read: boolean;
  }) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.notification_id === notificationId
          ? { ...notification, is_read }
          : notification
      )
    );
  };

  const handleAllNotificationsRead = (
    updatedNotifications: Notification[]
  ) => {
    setNotifications(updatedNotifications);
  };

  const handleNewNotification = (notification: Notification) => {
    if (!notification) return;

    const notifKey = notification.notification_id
      ? String(notification.notification_id)
      : (notification.reference_id && notification.reference_prefix)
        ? `${notification.reference_prefix}:${notification.reference_id}:${notification.message || ''}`
        : (notification.message ? `${notification.message}:${notification.created_at || ''}` : null);

    // Deduplicate side effects (toasts and audio): if we already processed this notification recently, abort
    if (notifKey) {
      if (recentToastNotificationKeys.has(notifKey)) {
        return;
      }
      recentToastNotificationKeys.add(notifKey);
      if (recentToastNotificationKeys.size > 200) {
        const oldestKey = recentToastNotificationKeys.values().next().value;
        if (oldestKey) recentToastNotificationKeys.delete(oldestKey);
      }
    }

    // Suppress toasts for actions triggered by the current user themselves
    if (notification.actor_account_id && userInfo?.account_id && String(notification.actor_account_id) === String(userInfo.account_id)) {
      setNotifications((prev) => {
        const exists = prev.some(
          (item) => item.notification_id && item.notification_id === notification.notification_id
        );
        if (exists) return prev;
        return [notification, ...prev];
      });
      return;
    }

    // Display visual toast alert (executed purely OUTSIDE setState to avoid StrictMode double-execution)
    if (notification.message) {
      const toastOptions = notifKey ? { id: `notif-${notifKey}` } : {};

      if (notification.chatMessage && notification.userName) {
        const getActionLabel = (action?: string) => {
          switch (action) {
            case 'progress': return 'Update';
            case 'submitted_for_review': return 'Submission';
            case 'revision_request': return 'Request For Revision';
            case 'approval': return 'Approval';
            case 'client_message': return 'Message';
            default: return 'Message';
          }
        };
        const typeLabel = notification.taskType ? notification.taskType.charAt(0).toUpperCase() + notification.taskType.slice(1) : 'Job';
        const tagText = `${typeLabel} | ${getActionLabel(notification.chatAction)}`;

        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-gray-200 dark:border-white/10 p-4 pt-7 mt-2`}>
            <div className="absolute top-2 left-3">
              <span className="text-[9px] font-bold tracking-wider uppercase text-blue-500 dark:text-blue-400">
                {tagText}
              </span>
            </div>
            <div className="flex-1 w-0 flex items-start text-right justify-end">
              <div className="mr-3 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {notification.userName}
                </p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
                  {notification.chatMessage}
                </p>

              </div>
              <div className="flex-shrink-0 pt-0.5">
                <img src={notification.userAvatar ? constructAvatarUrl(notification.userAvatar) : "/images/default_avatar.png"} alt={notification.userName} className="h-10 w-10 rounded-full object-cover" />
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 5000 });
      } else if (notification.reference_prefix === 'MILESTONE_FUNDS_RELEASED') {
        const creditsMatch = notification.message.match(/^([\d,]+)\s+credits/);
        const creditsAmount = creditsMatch ? creditsMatch[1] : '';
        const milestoneMatch = notification.message.match(/milestone\s+"([^"]+)"/);
        const milestoneName = milestoneMatch ? milestoneMatch[1] : '';

        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-emerald-200 dark:border-emerald-500/20 p-4`}>
            <div className="flex-1 w-0 flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  You Received {creditsAmount ? `${creditsAmount} Credits!` : 'Credits!'}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500 dark:text-zinc-400">
                  {milestoneName ? `From milestone "${milestoneName}"` : 'Funds released to your wallet'}
                </p>
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 6000 });
      } else if (notification.reference_prefix === 'MILESTONE_REVISION_PURCHASED') {
        const milestoneMatch = notification.message.match(/revision for "([^"]+)"/);
        const milestoneName = milestoneMatch ? milestoneMatch[1] : '';
        const nameMatch = notification.message.match(/^([^]+?) purchased/);
        const buyerName = nameMatch ? nameMatch[1] : 'Client';
        
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-blue-200 dark:border-blue-500/20 p-4 pt-7 mt-2`}>
            <div className="absolute top-2 left-3">
              <span className="text-[9px] font-bold tracking-wider uppercase text-blue-500 dark:text-blue-400">
                Revision Purchased
              </span>
            </div>
            <div className="flex-1 w-0 flex items-start text-right justify-end">
              <div className="mr-3 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {buyerName}
                </p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
                  Purchased an additional revision.
                </p>
                <p className="mt-2 text-[11px] font-medium text-gray-400 dark:text-zinc-500 line-clamp-1">
                  {milestoneName ? `For milestone "${milestoneName}"` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                 <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xl">🔄</span>
                </div>
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 6000 });
      } else if (notification.reference_prefix === 'CONTRACT_REVIEW') {
        const isSealed = Boolean(notification.is_sealed || !notification.reviewStars || !notification.contractCompleted);
        const stars = notification.reviewStars || 5;
        const starsDisplay = Array.from({ length: 5 }, (_, i) => i < stars ? '★' : '☆').join('');
        
        toast.custom((t) => (
          <div 
            onClick={() => {
              toast.dismiss(t.id);
              if (notification.reference_path) navigate(notification.reference_path);
            }}
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-gray-200 dark:border-white/10 p-4 pt-7 mt-2 cursor-pointer transition-all hover:scale-[1.01]`}
          >
            <div className="absolute top-2 left-3">
              <span className={`text-[9px] font-bold tracking-wider uppercase ${isSealed ? 'text-amber-600 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400'}`}>
                {isSealed ? 'REVIEW RECEIVED' : 'NEW REVIEW'}
              </span>
            </div>
            <div className="flex-1 w-0 flex items-center justify-between">
              <div className="flex-shrink-0 pl-1 mr-2">
                {isSealed ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <span className="text-sm">🔒</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold">Sealed</span>
                  </div>
                ) : (
                  <span className="text-yellow-500 text-lg tracking-[0.15em] drop-shadow-sm">{starsDisplay}</span>
                )}
              </div>
              <div className="flex flex-1 items-start justify-end text-right">
                <div className="mr-3 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {notification.reviewerName || "User"}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-800 dark:text-gray-200 italic line-clamp-3">
                    {isSealed
                      ? "Submitted a review. Ratings and feedback remain sealed until both reviews are submitted."
                      : `"${notification.reviewFeedback || notification.message}"`}
                  </p>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <img src={notification.reviewerAvatar ? constructAvatarUrl(notification.reviewerAvatar) : "/images/default_avatar.png"} alt={notification.reviewerName || "User"} className="h-10 w-10 rounded-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 6000 });
      } else if (notification.reference_prefix === 'follow') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-emerald-200 dark:border-emerald-500/20 p-4 pt-7 mt-2 cursor-pointer transition-all hover:scale-[1.02]`}
               onClick={() => { toast.dismiss(t.id); window.location.href = notification.reference_path || '#'; }}>
            <div className="absolute top-2 left-3">
              <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-500 dark:text-emerald-400">
                NEW FOLLOWER
              </span>
            </div>
            <div className="flex-1 w-0 flex items-start justify-between">
              <div className="mr-3 flex-1 text-left mt-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {notification.followerName || 'Someone'}
                </p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  started following you
                </p>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                <AccountAvatar url={notification.followerAvatar ? constructAvatarUrl(notification.followerAvatar) : null} name={notification.followerName} />
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 5000 });
      } else if (notification.reference_prefix === 'WARNING' || notification.reference_prefix === 'ACCOUNT_WARNING') {
        showAccountWarningToast({
          violationId: notification.reference_id,
          type: 'Account Warning',
          message: notification.message,
          onNavigate: () => navigate('/notifications'),
        });
      } else if (notification.reference_prefix === 'TICKET_INVITE' && notification.reference_id) {
        const def = getNotificationIcon(notification.reference_prefix);
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto border border-gray-200 dark:border-white/10 p-4 pt-7 mt-2`}>
            <div className="absolute top-2 left-3">
              <span className={`text-[9px] font-bold tracking-wider uppercase ${def.text}`}>
                {getNotificationLabel(notification.reference_prefix)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
            <TicketInviteActions
              ticketId={notification.reference_id}
              compact
              onDone={(result, chatId) => {
                toast.dismiss(t.id);
                if (result === 'accepted' && chatId) navigate('/inbox/direct', { state: { conversationId: chatId } });
              }}
            />
          </div>
        ), { ...toastOptions, duration: 12000 });
      } else {
        const def = getNotificationIcon(notification.reference_prefix);
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} relative max-w-sm w-full bg-white dark:bg-dark-surface shadow-xl rounded-xl pointer-events-auto flex border border-gray-200 dark:border-white/10 p-4 pt-7 mt-2 cursor-pointer transition-all hover:scale-[1.02]`}
               onClick={() => { toast.dismiss(t.id); if (notification.reference_path) navigate(notification.reference_path); }}>
            <div className="absolute top-2 left-3">
              <span className={`text-[9px] font-bold tracking-wider uppercase ${def.text}`}>
                {getNotificationLabel(notification.reference_prefix)}
              </span>
            </div>
            <div className="flex-1 w-0 flex items-start justify-between">
              <p className="mr-3 flex-1 mt-2 text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
                {notification.message}
              </p>
              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 ${def.text}`}>
                {def.icon}
              </div>
            </div>
          </div>
        ), { ...toastOptions, duration: 5000 });
      }
    }

    // Play notification sound
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.play().catch(e => console.log("Audio play blocked:", e));
    } catch {
      // Notification audio is optional and may be blocked by the browser.
    }

    // Pure state updater
    setNotifications((prev) => {
      const exists = prev.some(
        (item) => item.notification_id && item.notification_id === notification.notification_id
      );

      if (exists) {
        return prev;
      }

      return [notification, ...prev];
    });
  };

  const handleWalletBalanceUpdated = ({ balance_credits }: { balance_credits: number }) => {
    const nextBalance = Number(balance_credits);
    if (Number.isFinite(nextBalance)) {
      setCredits(nextBalance);
      if (cachedHeaderData) {
        cachedHeaderData.credits = nextBalance;
      }
      const currentUser = useGlobalState.getState().user;
      if (currentUser) {
        useGlobalState.getState().setUser({
          ...currentUser,
          wallet: {
            ...(currentUser.wallet || {}),
            balance_credits: nextBalance,
          },
        });
      }
    }
  };

  socket.on("notificationRead", handleNotificationRead);
  socket.on("allNotificationsRead", handleAllNotificationsRead);
  socket.on("notification", handleNewNotification);
  socket.on("walletBalanceUpdated", handleWalletBalanceUpdated);

  return () => {
    socket.off("notificationRead", handleNotificationRead);
    socket.off("allNotificationsRead", handleAllNotificationsRead);
    socket.off("notification", handleNewNotification);
    socket.off("walletBalanceUpdated", handleWalletBalanceUpdated);
  };
}, [userInfo?.account_id]);
  
useEffect(() => {
  if (isGuestView || isAppealLimitedMember(userInfo)) {
    setNotifications([]);
    return;
  }

  let cancelled = false;
  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/api/notifications/");
      if (cancelled) return;

      const fetchedNotifications: Notification[] = data.notifications ?? [];
      const uniqueNotifications = Array.from(
        new Map(
          fetchedNotifications.map((notification) => [
            notification.notification_id,
            notification,
          ])
        ).values()
      );

      setNotifications(uniqueNotifications);
    } catch (err) {
      if (!cancelled) console.error("Failed to fetch notifications", err);
    }
  };

  void fetchNotifications();
  return () => { cancelled = true; };
}, [isSessionLoading, isGuestView, userInfo?.account_id]);

  useEffect(() => {
    if (isSessionLoading) {
      if (!canShowImmediately) setIsCheckingAccess(true);
      return;
    }
    if (isGuestView) {
      setShowHeader(true);
      setIsCheckingAccess(false);
      return;
    }

    setShowHeader(true);
    setIsCheckingAccess(false);

    if (cachedHeaderData && cachedHeaderData.accountId === String(userInfo?.account_id)) {
      setCredits(cachedHeaderData.credits);
      setUserAvatarState(cachedHeaderData.avatarUrl);
      setUserSubscriptionPlan(cachedHeaderData.subscriptionPlan);
      setIsVerified(cachedHeaderData.isVerified);
      useGlobalState.getState().setIsVerified(cachedHeaderData.isVerified);
    }

    let isMounted = true;
    const accountId = String(userInfo?.account_id || '');
    if (accountId && !isAppealLimitedMember(userInfo)) {
      fetchHeaderData(accountId).then((data) => {
        if (!isMounted || !data) return;
        setCredits(data.credits);
        if (data.avatarUrl) {
          setUserAvatarState(data.avatarUrl);
        }
        setUserSubscriptionPlan(data.subscriptionPlan);
        setIsVerified(data.isVerified);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [canShowImmediately, isGuestView, isSessionLoading, userInfo?.account_id]);

  useEffect(() => {
    const query = headerSearchInput.replace(/^@/, "").trim();
    if (query.length < 1) {
      setCreatorSearchResults([]);
      setIsSearchingCreators(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearchingCreators(true);
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { handle: query },
        });
        const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
        const accounts = (response.data?.data || []) as CreatorSearchApiAccount[];
        const results = accounts.map((account) => {
          const avatarPath = account.avatar_preset_url || "";
          const name = account.display_name || account.handle;
          return {
            accountId: String(account.account_id),
            name,
            username: `@${account.handle}`,
            avatar: avatarPath
              ? /^https?:\/\//i.test(avatarPath)
                ? avatarPath
                : `${cloudfront}/${avatarPath.replace(/^\/+/, "")}`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=71717a&color=fff`,
            deactivated: String(account.status || "").toLowerCase() === "deactivated",
          };
        });
        if (!cancelled) setCreatorSearchResults(results);
      } catch {
        if (!cancelled) setCreatorSearchResults([]);
      } finally {
        if (!cancelled) setIsSearchingCreators(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [headerSearchInput]);

  useEffect(() => {
    const closeCreatorSearch = (event: MouseEvent) => {
      if (!creatorSearchRef.current?.contains(event.target as Node)) {
        setIsCreatorSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", closeCreatorSearch);
    return () => document.removeEventListener("mousedown", closeCreatorSearch);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isProfileOpen) {
      setProfilePillStyle({ top: 0, height: 0, opacity: 0 });
    }
  }, [isProfileOpen]);

  const handleTopUp = () => {
    if (onTopUp) {
      onTopUp();
    } else {
      navigate("/credits");
    }
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearchInput.trim()) {
      navigate(`/search/user/${encodeURIComponent(headerSearchInput.trim())}`);
      setHeaderSearchInput("");
    }
  };

  const handleCreatorSelect = (creator: CreatorSearchResult) => {
    setHeaderSearchInput("");
    setCreatorSearchResults([]);
    setIsCreatorSearchOpen(false);
    navigate(`/profile/${encodeURIComponent(creator.accountId)}`);
  };

  const executeFinalLogout = async () => {
    setIsLogoutModalOpen(false);
    setIsProfileOpen(false);

    const [serverLogout, firebaseLogout] = await Promise.allSettled([
      api.post("/api/users/logout"),
      signOut(auth),
    ]);

    if (serverLogout.status === "rejected") {
      console.error("Unable to close the server session during logout.");
    }
    if (firebaseLogout.status === "rejected") {
      console.error("Unable to close the Firebase session during logout.");
    }

    cachedHeaderData = null;
    useChatState.getState().reset();
    useGlobalState.getState().clearUser();
    setShowHeader(false);
    navigate("/", { replace: true });
  };

  const currentCredits = userCredits !== null
    ? userCredits
    : (userInfo?.wallet?.balance_credits !== undefined && userInfo?.wallet?.balance_credits !== null
      ? Number(userInfo.wallet.balance_credits)
      : (hasCachedData && cachedHeaderData?.credits !== undefined
        ? cachedHeaderData.credits
        : (propCredits !== undefined && propCredits !== null ? propCredits : null)));

  // --- REAL-TIME CREDITS ADDED / DEDUCTED ANIMATION ENGINE ---
  useEffect(() => {
    if (currentCredits === null) return;

    // First mount baseline: set display or trigger reload-persisted animation
    if (prevCreditsRef.current === null) {
      if (pendingReloadDeltaRef.current !== null && pendingReloadDeltaRef.current !== 0) {
        const diff = pendingReloadDeltaRef.current;
        pendingReloadDeltaRef.current = null;

        // Baseline before the change
        const preBalance = Math.max(0, currentCredits - diff);
        prevCreditsRef.current = preBalance;
        setDisplayCredits(preBalance);

        // Schedule animation right after header mounts into view (350ms)
        const t = setTimeout(() => {
          const type: "added" | "deducted" = diff > 0 ? "added" : "deducted";
          const deltaId = Date.now() + Math.random();

          setCreditDeltas((prev) => [...prev, { id: deltaId, amount: diff, type }]);
          setPillAnimState(type);

          setTimeout(() => {
            setCreditDeltas((prev) => prev.filter((d) => d.id !== deltaId));
          }, 2400);

          setTimeout(() => {
            setPillAnimState("idle");
          }, 900);

          const startValue = preBalance;
          const targetValue = currentCredits;
          const startTime = performance.now();
          const duration = 750;

          let animFrameId: number;
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(startValue + (targetValue - startValue) * ease);
            setDisplayCredits(val);

            if (progress < 1) {
              animFrameId = requestAnimationFrame(step);
            } else {
              setDisplayCredits(targetValue);
            }
          };

          animFrameId = requestAnimationFrame(step);
          prevCreditsRef.current = currentCredits;
        }, 350);

        return () => clearTimeout(t);
      }

      prevCreditsRef.current = currentCredits;
      setDisplayCredits(currentCredits);
      return;
    }

    if (currentCredits !== prevCreditsRef.current) {
      const diff = currentCredits - prevCreditsRef.current;
      const type: "added" | "deducted" = diff > 0 ? "added" : "deducted";
      const deltaId = Date.now() + Math.random();

      // Trigger floating delta bubble
      setCreditDeltas((prev) => [...prev, { id: deltaId, amount: diff, type }]);
      setPillAnimState(type);

      // Dismiss floating bubble after 2.4s
      const timerDelta = setTimeout(() => {
        setCreditDeltas((prev) => prev.filter((d) => d.id !== deltaId));
      }, 2400);

      // Reset pill highlight after 900ms
      const timerPill = setTimeout(() => {
        setPillAnimState("idle");
      }, 900);

      // Smooth number count-up / count-down animation over 650ms
      const startValue = displayCredits ?? prevCreditsRef.current;
      const targetValue = currentCredits;
      const startTime = performance.now();
      const duration = 650;

      let animFrameId: number;
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(startValue + (targetValue - startValue) * ease);
        setDisplayCredits(val);

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          setDisplayCredits(targetValue);
        }
      };

      animFrameId = requestAnimationFrame(step);
      prevCreditsRef.current = currentCredits;

      return () => {
        clearTimeout(timerDelta);
        clearTimeout(timerPill);
        cancelAnimationFrame(animFrameId);
      };
    }
  }, [currentCredits]);

  // Global custom event listener & console test helper
  useEffect(() => {
    const handleCustomCreditAnimate = (e: any) => {
      const { amount, newBalance } = e.detail || {};
      if (typeof newBalance === "number") {
        setCredits(newBalance);
      } else if (typeof amount === "number" && currentCredits !== null) {
        setCredits(currentCredits + amount);
      }
    };

    window.addEventListener("ensemble:animate-credits" as any, handleCustomCreditAnimate);

    if (typeof window !== "undefined") {
      (window as any).simulateCreditChange = (diff: number) => {
        const base = currentCredits ?? 3143;
        const next = Math.max(0, base + diff);
        setCredits(next);
        const curUser = useGlobalState.getState().user;
        if (curUser) {
          useGlobalState.getState().setUser({
            ...curUser,
            wallet: {
              ...(curUser.wallet || {}),
              balance_credits: next,
            },
          });
        }
        console.log(`[Credits Animation] Simulated change: ${diff > 0 ? "+" : ""}${diff} (New: ${next})`);
      };
    }

    return () => {
      window.removeEventListener("ensemble:animate-credits" as any, handleCustomCreditAnimate);
    };
  }, [currentCredits]);

  if (isCheckingAccess) {
    return (
      <header
        className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base/95 backdrop-blur-md transition-all duration-300"
      >
        <div className={`flex items-center justify-between px-5 md:px-5 gap-4 ${isGuestView ? 'py-5' : 'py-4'}`}>
          <div className="flex items-center gap-8 flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0 hidden sm:block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pageTitle}
            </h1>
            {!isGuestView && (
              <div className="flex items-center gap-3 w-full max-w-md">
                <div className="relative w-full max-w-xs group">
                  <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-zinc-600" />
                  <div className="w-full h-[36px] bg-gray-100 dark:bg-white/5 border border-transparent rounded-full flex items-center pl-10">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                  </div>
                </div>
                {!isStaffPreview && (
                  <div className="h-[36px] w-[36px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse border border-gray-100 dark:border-white/5 shadow-sm"></div>
                )}
              </div>
            )}
          </div>
          {!isStaffPreview && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-[36px] w-20 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse shadow-sm"></div>
            <div className="h-[36px] w-[36px] bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse"></div>
            <div className="flex items-center gap-3 h-[44px] pl-3 ml-1">
              <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse ring-2 ring-gray-100 dark:ring-white/5"></div>
              <div className="hidden md:flex flex-col gap-1.5 w-28">
                <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded animate-pulse w-3/4"></div>
                <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded animate-pulse w-1/2"></div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-300 dark:text-zinc-700" />
            </div>
          </div>
          )}
        </div>
      </header>
    );
  }

  return showHeader ? (
    <>
      <header
        className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base/95 backdrop-blur-md transition-all duration-300"
      >
        <div className={`flex items-center justify-between px-5 md:px-5 gap-4 ${isGuestView ? 'py-5' : 'py-4'}`}>
          <div className="flex items-center gap-8 flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0 hidden sm:block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pageTitle}
            </h1>

            {!isGuestView && (
              <div className="flex items-center gap-3 w-full max-w-md">
                <form data-tour="header-search-creators" ref={creatorSearchRef} onSubmit={handleHeaderSearchSubmit} className="relative w-full max-w-xs group">
                  <Search
                    onClick={handleHeaderSearchSubmit}
                    className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-zinc-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search creators..."
                    value={headerSearchInput}
                    onFocus={() => setIsCreatorSearchOpen(true)}
                    onChange={(e) => {
                      setHeaderSearchInput(e.target.value);
                      setIsCreatorSearchOpen(true);
                    }}
                    className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 pl-9 pr-14 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-gray-400 dark:placeholder-zinc-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded">
                      Alt+K
                    </kbd>
                  </div>

                  {isCreatorSearchOpen && headerSearchInput.replace(/^@/, "").trim().length > 0 && (
                    <div className="absolute top-full mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-xl z-50 overflow-hidden">
                      {isSearchingCreators ? (
                        <div className="p-4 text-center text-xs text-gray-500 dark:text-zinc-400">Searching...</div>
                      ) : creatorSearchResults.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {creatorSearchResults.map((creator) => (
                            <div
                              key={creator.accountId}
                              onClick={() => {
                                navigate(`/search/user/${creator.username}`);
                                setIsCreatorSearchOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-gray-100 dark:border-white/5 last:border-none"
                            >
                              <img src={creator.avatar} alt={creator.name} className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{creator.name}</p>
                                  {creator.deactivated && <DeactivatedBadge />}
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">@{creator.username}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-500 dark:text-zinc-400">No creators found</div>
                      )}
                    </div>
                  )}
                </form>

                {!isStaffPreview && (
                <button
                  onClick={() => {
                    if (isAskAiClickLoading) return;
                    setIsAskAiClickLoading(true);
                    setTimeout(() => {
                      setIsAskAiClickLoading(false);
                      navigate("/landing/AskOurChatbot");
                    }, 800);
                  }}
                  data-tour="header-ask-ai"
                  className={`group relative flex items-center justify-center overflow-hidden rounded-full border transition-all duration-700 ease-in-out border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:scale-105 hover:shadow-[0_0_15px_rgba(156,163,175,0.2)] h-[36px] bg-white dark:bg-dark-base ${
                    isAskAiLoaded ? 'w-[86px] px-3' : 'w-[36px] px-0'
                  }`}
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-60 dark:group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-full pointer-events-none"
                  >
                    <div
                      className="absolute top-0 left-0 h-full w-[200%]"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #fef08a 0%, #e9d5ff 16.66%, #bfdbfe 33.33%, #fef08a 50%, #e9d5ff 66.66%, #bfdbfe 83.33%, #fef08a 100%)',
                        animation: 'moveGradient 3s linear infinite',
                      }}
                    />
                  </div>
                  <style>{`
                    @keyframes moveGradient {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                    @keyframes passiveShine {
                      0% { transform: translateX(-100%); }
                      25% { transform: translateX(100%); }
                      100% { transform: translateX(100%); }
                    }
                  `}</style>
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/80 dark:via-white/20 to-transparent z-10"
                    style={{ animation: 'passiveShine 3s ease-in-out infinite' }}
                  />
                  
                  {isAskAiClickLoading ? (
                    <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-700 dark:border-t-gray-300 rounded-full animate-spin z-20 shrink-0" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-800 dark:group-hover:text-gray-800 shrink-0 z-20 transition-colors duration-300" />
                  )}
                  
                  <span className={`text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-700 ease-in-out z-20 text-gray-500 dark:text-zinc-400 group-hover:text-gray-800 dark:group-hover:text-gray-800 ${
                    isAskAiLoaded ? 'max-w-[50px] opacity-100 ml-1.5' : 'max-w-0 opacity-0 ml-0'
                  }`}>
                    Ask AI
                  </span>
                </button>
                )}
              </div>
            )}
          </div>

          {!isStaffPreview && (
          <div className="flex items-center gap-4 shrink-0">
            {isGuestView ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
                >
                  Sign up
                </button>
              </div>
            ) : (
              <>
                {/* Credits Balance & Top-Up Pill with Animated Feedback */}
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  {/* Floating Delta Badge (+Credits in Emerald, -Credits in Rose) */}
                  <AnimatePresence>
                    {creditDeltas.map((delta) => (
                      <motion.div
                        key={delta.id}
                        initial={{
                          opacity: 0,
                          y: delta.type === "added" ? 6 : -6,
                          scale: 0.6,
                        }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: delta.type === "added" ? -28 : 28,
                          scale: [0.6, 1.1, 1, 0.9],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 2.2,
                          times: [0, 0.15, 0.75, 1],
                          ease: "easeOut",
                        }}
                        className={`pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black shadow-lg backdrop-blur-md select-none ${
                          delta.type === "added"
                            ? "top-0 bg-emerald-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-300/50"
                            : "bottom-0 bg-rose-500 text-white shadow-rose-500/40 ring-2 ring-rose-300/50"
                        }`}
                      >
                        <span>{delta.type === "added" ? `+${delta.amount.toLocaleString()}` : delta.amount.toLocaleString()}</span>
                        <CreditIcon className="h-3 w-3 text-white fill-current shrink-0" />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.button
                    data-tour="credits-pill"
                    onClick={handleTopUp}
                    onFocus={() => setIsHovered(true)}
                    onBlur={() => setIsHovered(false)}
                    animate={
                      pillAnimState === "added"
                        ? {
                            scale: [1, 1.12, 0.96, 1.05, 1],
                          }
                        : pillAnimState === "deducted"
                        ? {
                            x: [0, -3, 3, -3, 3, 0],
                            scale: [1, 0.94, 1],
                          }
                        : { scale: 1, x: 0 }
                    }
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    aria-label={`Credits balance: ${currentCredits !== null ? currentCredits.toLocaleString() : "loading"}. Click to top up.`}
                    className={`group relative flex items-center h-9 pl-2.5 pr-1.5 py-1 rounded-full border transition-all duration-300 select-none overflow-hidden cursor-pointer ${
                      pillAnimState === "added"
                        ? "border-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                        : pillAnimState === "deducted"
                        ? "border-rose-400 bg-rose-50/90 dark:bg-rose-950/40 ring-2 ring-rose-400/60 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
                        : "border-amber-300/80 bg-amber-50/90 hover:bg-amber-100/90 hover:border-amber-400 shadow-xs dark:border-amber-500/30 dark:bg-zinc-900/90 dark:hover:bg-zinc-800/90 dark:hover:border-amber-400/60 dark:shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    {/* Contained Hover Shine */}
                    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent" />
                    </div>

                    {/* Active Added Pulse Shine */}
                    {pillAnimState === "added" && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/40 dark:via-emerald-400/30 to-transparent pointer-events-none"
                      />
                    )}

                    {/* Animated Coin Icon */}
                    <motion.div
                      animate={
                        pillAnimState === "added"
                          ? { rotate: [0, 360], scale: [1, 1.35, 1] }
                          : pillAnimState === "deducted"
                          ? { rotate: [-12, 12, -8, 8, 0], scale: [1, 0.85, 1] }
                          : { rotate: 0, scale: 1 }
                      }
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="shrink-0 flex items-center justify-center"
                    >
                      <CreditIcon className={`h-4 w-4 text-amber-500 shrink-0 transition-transform duration-300 group-hover:scale-110 ${currentCredits === null ? "animate-pulse" : ""}`} />
                    </motion.div>

                    {/* Rolling Number Display with Dynamic Color Highlight */}
                    <span
                      className={`text-xs sm:text-sm font-black tracking-tight overflow-hidden whitespace-nowrap transition-colors duration-300 ${
                        pillAnimState === "added"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : pillAnimState === "deducted"
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-amber-950 dark:text-amber-200"
                      } ${
                        currentCredits === null ? "max-w-0 opacity-0 ml-0" : "max-w-[120px] opacity-100 ml-1.5 sm:ml-2"
                      }`}
                    >
                      {displayCredits !== null ? displayCredits.toLocaleString() : (currentCredits !== null ? currentCredits.toLocaleString() : "")}
                    </span>

                    {/* Plus Button */}
                    <span
                      className={`ml-2 flex items-center justify-center h-5 w-5 rounded-full transition-all duration-200 shrink-0 ${
                        pillAnimState === "added"
                          ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-300"
                          : pillAnimState === "deducted"
                          ? "bg-rose-200 text-rose-900 dark:bg-rose-400/20 dark:text-rose-300"
                          : "bg-amber-200/70 text-amber-900 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-400/15 dark:text-amber-300 dark:group-hover:bg-amber-400 dark:group-hover:text-zinc-950"
                      }`}
                      title="Add Credits"
                    >
                      <Plus className="h-3 w-3 stroke-[2.75]" />
                    </span>
                  </motion.button>

                  {/* Tooltip positioned BELOW the pill */}
                  {isHovered && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-zinc-800 border border-gray-700/50 dark:border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl animate-fade-in pointer-events-none z-50">
                      Top up Credits
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-zinc-800 border-t border-l border-gray-700/50 dark:border-white/10 rotate-45" />
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationRef} data-tour="notifications-button">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsProfileOpen(false);
                    }}
                    className={`relative rounded-lg p-2 transition duration-200 ${
                      isNotificationsOpen ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {hasUnreadNotifications && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#080a12]" />
                    )}
                  </button>
                  <UserNotificationModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} notificationsData={notifications} 
                    setNotifications={setNotifications}
                  />
                </div>

                {/* Profile */}
                <div className="relative" ref={dropdownRef} data-tour="user-profile-button">
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <img 
                      src={userAvatarState || defaultFallback} 
                      alt={userInfo?.username || "User"} 
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/20"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== defaultFallback) {
                          target.src = defaultFallback;
                        }
                      }}
                    />
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{userInfo?.display_name || userInfo?.displayName || userInfo?.username || "User"}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500">
                          <img src={isVerified ? "/icons/verification/lvl2_verified.png" : "/icons/verification/lvl1_verified.png"} alt={isVerified ? "Verified User" : "Unverified User"} className="w-4 h-4 object-contain" title={isVerified ? "Verified" : "Unverified"} />
                          <img src={getSubscriptionIcon(userSubscriptionPlan || "Free")} alt={`${userSubscriptionPlan || "Free"} Tier`} className="h-4 w-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
                          {userSubscriptionPlan || "Free"}
                        </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {isProfileOpen && (
                    <div
                      data-tour="user-profile-dropdown"
                      className="absolute right-0 top-full mt-3.5 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xl dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] origin-top-right transition-all duration-200 animate-in fade-in zoom-in-95"
                    >
                      {/* Pointing tip */}
                      <svg
                        className="absolute -top-[7px] right-[5px] z-[2] overflow-visible"
                        width="14"
                        height="8"
                        viewBox="0 0 14 8"
                        aria-hidden="true"
                      >
                        {/* Triangle fill */}
                        <path
                          d="M0 8L5.58579 1.41421C6.36684 0.633165 7.63316 0.633165 8.41421 1.41421L14 8H0Z"
                          className="fill-white dark:fill-[#18181b]"
                        />
                        {/* Angled borders */}
                        <path
                          d="M0 8L5.58579 1.41421C6.36684 0.633165 7.63316 0.633165 8.41421 1.41421L14 8"
                          fill="none"
                          className="stroke-zinc-200 dark:stroke-zinc-800"
                          strokeWidth="1"
                        />
                        {/* Mask underlying card border */}
                        <rect
                          x="0.5"
                          y="7"
                          width="13"
                          height="2"
                          className="fill-white dark:fill-[#18181b]"
                        />
                      </svg>

                      <div
                        className="relative p-2 space-y-1 z-[1]"
                        onMouseLeave={handleProfileMenuLeave}
                      >
                        {/* Animated sliding glide pill */}
                        <span
                          className="pointer-events-none absolute left-2 right-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                          style={{
                            top: `${profilePillStyle.top}px`,
                            height: `${profilePillStyle.height}px`,
                            opacity: profilePillStyle.opacity,
                            backgroundColor: profilePillStyle.isDestructive
                              ? (theme === "dark" ? "rgba(239, 68, 68, 0.14)" : "rgba(239, 68, 68, 0.08)")
                              : (theme === "dark" ? "#27272a" : "#f1f5f9"),
                            transitionProperty: "top, height, opacity, background-color",
                          }}
                          aria-hidden="true"
                        />

                        <button
                          data-tour="profile-menu-profile"
                          ref={(el) => { profileItemRefs.current[0] = el; }}
                          onMouseEnter={() => handleProfileItemHover(0, false)}
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/profile");
                          }}
                          className="relative z-[1] flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 font-medium transition-colors duration-150 hover:text-gray-900 dark:hover:text-white outline-none"
                        >
                          <User className="h-4 w-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                          Profile
                        </button>

                        <button
                          data-tour="profile-menu-settings"
                          ref={(el) => { profileItemRefs.current[1] = el; }}
                          onMouseEnter={() => handleProfileItemHover(1, false)}
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/settings", { state: { tab: "account" } });
                          }}
                          className="relative z-[1] flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 font-medium transition-colors duration-150 hover:text-gray-900 dark:hover:text-white outline-none"
                        >
                          <Settings className="h-4 w-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                          Settings
                        </button>
                        
                        <button
                          ref={(el) => { profileItemRefs.current[2] = el; }}
                          onMouseEnter={() => handleProfileItemHover(2, false)}
                          onClick={() => {
                            setIsProfileOpen(false);
                            useTourStore.getState().startTour();
                            navigate("/home");
                          }}
                          className="relative z-[1] flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-gray-700 dark:text-zinc-300 font-medium transition-colors duration-150 hover:text-gray-900 dark:hover:text-white outline-none"
                        >
                          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>
                            <span className="block text-sm flex items-center gap-1.5">
                              Platform Walkthrough
                              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">Guide</span>
                            </span>
                            <span className="block text-xs font-normal text-gray-500 dark:text-zinc-500">Interactive guide to platform tools</span>
                          </span>
                        </button>

                        <button
                          ref={(el) => { profileItemRefs.current[3] = el; }}
                          onMouseEnter={() => handleProfileItemHover(3, false)}
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/landing/SendAFeedback");
                          }}
                          data-tour="profile-menu-feedback"
                          className="relative z-[1] flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 font-medium transition-colors duration-150 hover:text-gray-900 dark:hover:text-white outline-none"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                          Submit Feedback
                        </button>

                        <div className="my-2 border-t border-gray-100 dark:border-zinc-800" />

                        <button
                          ref={(el) => { profileItemRefs.current[4] = el; }}
                          onMouseEnter={() => handleProfileItemHover(4, false)}
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/support/ticket");
                          }}
                          data-tour="profile-menu-support"
                          className="relative z-[1] flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-gray-700 dark:text-zinc-300 font-medium transition-colors duration-150 hover:text-gray-900 dark:hover:text-white outline-none"
                        >
                          <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                          <span>
                            <span className="block text-sm">Get Support</span>
                            <span className="block text-xs font-normal text-gray-500 dark:text-zinc-500">Help, tickets, and support requests</span>
                          </span>
                        </button>
                        
                        <div className="my-2 border-t border-gray-100 dark:border-zinc-800" />
                        
                        <button
                          ref={(el) => { profileItemRefs.current[5] = el; }}
                          onMouseEnter={() => handleProfileItemHover(5, true)}
                          onClick={() => setIsLogoutModalOpen(true)}
                          className="relative z-[1] flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors duration-150 hover:text-red-700 dark:hover:text-red-300 outline-none"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          )}
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.15s ease-out; }
        `}</style>
      </header>

      {!isStaffPreview && (
        <UserLogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={executeFinalLogout} />
      )}
    </>
  ) : null;
};

export default UserHeader;

