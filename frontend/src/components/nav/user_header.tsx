import { Bell, ChevronDown, Settings, LogOut, User, Search } from "lucide-react";
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
}

interface CreatorSearchApiAccount {
  account_id: string;
  display_name: string | null;
  handle: string;
  avatar_preset_url: string | null;
}

interface CreatorSearchResult {
  accountId: string;
  name: string;
  username: string;
  avatar: string;
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
  return `https://ui-avatars.com/api/?name=${cleanName}&background=0D8ABC&color=fff&size=128`;
};

interface CachedHeaderData {
  accountId: string;
  credits: number;
  avatarUrl: string;
  subscriptionPlan: "Free" | "Premium" | "Business";
  isVerified: boolean;
  lastFetched: number;
}

let cachedHeaderData: CachedHeaderData | null = null;
let pendingHeaderFetch: Promise<void> | null = null;

const UserHeader: React.FC<UserHeaderProps> = ({
  pageTitle,
  credits: propCredits,
  userName,
  userAvatar,
  onTopUp,
}) => {
  const navigate = useNavigate();

  const isCollapsed = useGlobalState((state) => state.isSidebarCollapsed);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [headerSearchInput, setHeaderSearchInput] = useState("");
  const [creatorSearchResults, setCreatorSearchResults] = useState<CreatorSearchResult[]>([]);
  const [isSearchingCreators, setIsSearchingCreators] = useState(false);
  const [isCreatorSearchOpen, setIsCreatorSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const creatorSearchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userInfo = useGlobalState((state) => state.user);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const isSessionLoading = isGlobalLoading || (!userInfo?.account_id && !isGuestMode);
  const isGuestView = isGuestMode || (!isSessionLoading && !userInfo?.account_id);

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

  const initialCredits = propCredits !== undefined && propCredits !== null
    ? propCredits
    : hasCachedData
      ? cachedHeaderData!.credits
      : (userInfo?.wallet?.balance_credits !== undefined ? Number(userInfo?.wallet?.balance_credits) : (isGuestView ? 0 : null));

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
  const [userAvatarState, setUserAvatarState] = useState<string>(initialAvatar);
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<"Free" | "Premium" | "Business">(initialPlan);
  const [isVerified, setIsVerified] = useState<boolean>(initialVerified);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (propCredits !== undefined && propCredits !== null) {
      setCredits(propCredits);
      if (cachedHeaderData) {
        cachedHeaderData.credits = propCredits;
      }
    }
  }, [propCredits]);

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
    setNotifications((prev) => {
      const exists = prev.some(
        (item) =>
          item.notification_id === notification.notification_id
      );

      if (exists) {
        return prev;
      }

      // Play notification sound
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.play().catch(e => console.log("Audio play blocked:", e));
      } catch {
        // Notification audio is optional and may be blocked by the browser.
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
  if (isGuestView) {
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

    const now = Date.now();
    const isCacheFresh = cachedHeaderData &&
      cachedHeaderData.accountId === String(userInfo?.account_id) &&
      (now - cachedHeaderData.lastFetched < 60000);

    if (isCacheFresh) {
      setCredits(cachedHeaderData.credits);
      setUserAvatarState(cachedHeaderData.avatarUrl);
      setUserSubscriptionPlan(cachedHeaderData.subscriptionPlan);
      setIsVerified(cachedHeaderData.isVerified);
      useGlobalState.getState().setIsVerified(cachedHeaderData.isVerified);
      return;
    }

    let cancelled = false;
    const refreshHeaderData = async () => {
      try {
        const [walletResult, avatarResult, planResult, verificationResult] = await Promise.allSettled([
          api.get("/api/accounts/wallet", {
            params: { type: 'account_wallets' },
          }),
          api.get(`/api/accounts/profile/current-avatar`),
          api.get(`/api/subscription/plan-details`),
          api.get('/api/verification/status'),
        ]);

        if (cancelled) return;

        let planName: "Free" | "Premium" | "Business" = "Free";
        if (planResult.status === 'fulfilled') {
          planName = (planResult.value.data?.planDetails?.plan_name as "Free" | "Premium" | "Business") || "Free";
        }

        let verified = false;
        if (verificationResult.status === 'fulfilled') {
          verified = Boolean(verificationResult.value.data?.data?.is_verified);
          useGlobalState.getState().setIsVerified(verified);
        }

        let avatarUrl = '';
        if (avatarResult.status === 'fulfilled' && avatarResult.value.data?.data?.path) {
          avatarUrl = constructAvatarUrl(avatarResult.value.data.data.path);
        } else if (userInfo?.avatar_preset_url || userInfo?.avatar_url || userInfo?.avatar) {
          avatarUrl = constructAvatarUrl(userInfo?.avatar_preset_url || userInfo?.avatar_url || userInfo?.avatar);
        }

        let credits = 0;
        if (walletResult.status === 'fulfilled') {
          credits = Number(walletResult.value.data?.wallet?.balance_credits) || 0;
        } else if (propCredits !== undefined && propCredits !== null) {
          credits = Number(propCredits) || 0;
        } else if (userInfo?.wallet?.balance_credits !== undefined) {
          credits = Number(userInfo.wallet.balance_credits) || 0;
        } else if (cachedHeaderData?.credits !== undefined) {
          credits = cachedHeaderData.credits;
        }

        cachedHeaderData = {
          accountId: String(userInfo?.account_id),
          credits,
          avatarUrl: avatarUrl || cachedHeaderData?.avatarUrl || '',
          subscriptionPlan: planName,
          isVerified: verified,
          lastFetched: Date.now(),
        };

        setUserSubscriptionPlan(planName);
        setIsVerified(verified);
        if (avatarUrl) {
          setUserAvatarState(avatarUrl);
          if (userInfo && userInfo.avatar_preset_url !== avatarUrl) {
            useGlobalState.getState().setUser({
              ...userInfo,
              avatar_preset_url: avatarUrl,
            });
          }
        }
        setCredits(credits);
      } catch (err) {
        if (!cancelled) {
          console.error("Error refreshing header data:", err);
          setCredits((prev) => (prev !== null ? prev : (propCredits ?? (userInfo?.wallet?.balance_credits !== undefined ? Number(userInfo.wallet.balance_credits) : 0))));
        }
      }
    };

    if (!pendingHeaderFetch) {
      pendingHeaderFetch = refreshHeaderData().finally(() => {
        pendingHeaderFetch = null;
      });
    }

    return () => {
      cancelled = true;
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
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
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
              <div className="relative w-full max-w-xs group">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-zinc-600" />
                <div className="w-full h-[36px] bg-gray-100 dark:bg-white/5 border border-transparent rounded-full flex items-center pl-10">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
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
              <form ref={creatorSearchRef} onSubmit={handleHeaderSearchSubmit} className="relative w-full max-w-xs group">
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
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{creator.name}</p>
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
            )}
          </div>

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
                {/* Credits */}
                <div className="relative">
                  <button
                    onClick={handleTopUp}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="group relative flex items-center overflow-hidden rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 px-3 py-1.5 transition-all duration-300 hover:scale-105"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <CreditIcon className={`h-4 w-4 text-yellow-500 transition-all duration-500 ${userCredits === null ? "animate-pulse" : ""}`} />
                    <span
                      className={`text-sm font-bold text-gray-900 dark:text-yellow-200 overflow-hidden whitespace-nowrap transition-all duration-500 ease-out ${
                        userCredits === null ? "max-w-0 opacity-0 ml-0" : "max-w-[120px] opacity-100 ml-2"
                      }`}
                    >
                      {userCredits !== null ? userCredits.toLocaleString() : ""}
                    </span>
                    {isHovered && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg animate-fade-in">
                        Go to Credit Shop
                      </span>
                    )}
                  </button>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
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
                <div className="relative" ref={dropdownRef}>
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
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1b23] shadow-xl dark:shadow-2xl">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/profile");
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 transition hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigate("/settings");
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 transition hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </button>
                        
                        <div className="my-2 border-t border-gray-200 dark:border-white/10" />
                        
                        <button
                          onClick={() => setIsLogoutModalOpen(true)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.15s ease-out; }
        `}</style>
      </header>

      <UserLogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={executeFinalLogout} />
    </>
  ) : null;
};

export default UserHeader;
