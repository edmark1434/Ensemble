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

const UserHeader: React.FC<UserHeaderProps> = ({
  pageTitle,
  userAvatar = "https://i.pravatar.cc/150?u=john",
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
  const [showHeader, setShowHeader] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [userCredits, setCredits] = useState(0);
  const [userAvatarState, setUserAvatarState] = useState('');
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<"Free" | "Premium" | "Business">("Free");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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
      } catch (err) {}

      return [notification, ...prev];
    });
  };

  socket.on("notificationRead", handleNotificationRead);
  socket.on("allNotificationsRead", handleAllNotificationsRead);
  socket.on("notification", handleNewNotification);

  return () => {
    socket.off("notificationRead", handleNotificationRead);
    socket.off("allNotificationsRead", handleAllNotificationsRead);
    socket.off("notification", handleNewNotification);
  };
}, [userInfo?.account_id]);
  
useEffect(() => {
  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/api/notifications/");

      const fetchedNotifications: Notification[] =
        data.notifications ?? [];

      // Remove duplicates just in case
      const uniqueNotifications = Array.from(
        new Map(
          fetchedNotifications.map((n) => [
            n.notification_id,
            n,
          ])
        ).values()
      );

      setNotifications(uniqueNotifications);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  fetchNotifications();
}, []);

useEffect(() => {
  console.log(
    "Notifications:",
    notifications.map((n) => n.notification_id)
  );
}, [notifications]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const [, getWalletResponse, getAvatarResponse, getSubscriptionPlanResponse] = await Promise.all([
          api.get("/api/users/check-user-role"),
          api.get("/api/accounts/wallet", {
            params: { type: 'account_wallets' },
          }),
          api.get(`/api/accounts/profile/current-avatar`),
          api.get(`/api/subscription/plan-details`),
        ]);

        // ✅ Fix: Properly construct avatar URL
        setUserSubscriptionPlan(getSubscriptionPlanResponse.data?.planDetails.plan_name);
        let avatarUrl = '';
        if (getAvatarResponse.data?.data?.path) {
          const path = getAvatarResponse.data.data.path;
          
          // Check if it's already a full URL
          if (path.startsWith('http')) {
            avatarUrl = path;
          } else {
            // Use CloudFront URL for profile images
            const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
            // Remove leading slash if exists to avoid double slashes
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            avatarUrl = `${cloudfrontUrl}/${cleanPath}`;
          }
        }

        setUserAvatarState(avatarUrl);
        setCredits(getWalletResponse.data.wallet.balance_credits || 0);
        setShowHeader(true);
      } catch (err) {
        console.error("Error checking user role:", err);
        setShowHeader(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    const query = headerSearchInput.replace(/^@/, "").trim();
    if (query.length < 2) {
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
    navigate("/credits");
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
    try {
      await api.get("/api/users/logout");
      await signOut(auth);
      useGlobalState.getState().clearUser();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLogoutModalOpen(false);
      setIsProfileOpen(false);
      setShowHeader(false);
      navigate("/", { replace: true });
    }
  };



  if (isCheckingAccess) {
    return (
      <header
        className={`sticky top-0 z-50 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#080a12]/95 backdrop-blur-md transition-all duration-300 ${
            (!isCollapsed ? "md:p-0" : "md:pl-20")
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 md:px-8 gap-4">
          <div className="flex items-center gap-8 flex-1 min-w-0">
            <div className="h-7 w-32 bg-gray-200 dark:bg-white/10 rounded animate-pulse shrink-0 hidden sm:block"></div>
            <div className="w-full max-w-xs h-9 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
            <div className="h-9 w-9 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse"></div>
              <div className="hidden md:block space-y-2">
                <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                <div className="h-2 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return showHeader ? (
    <>
      <header
        className={`sticky top-0 z-50 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#080a12]/95 backdrop-blur-md transition-all duration-300 ${
            (!isCollapsed ? "md:p-0" : "md:pl-20")
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 md:px-8 gap-4">

          <div className="flex items-center gap-8 flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0 hidden sm:block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pageTitle}
            </h1>

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

              {isCreatorSearchOpen && headerSearchInput.replace(/^@/, "").trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151824] shadow-xl dark:shadow-2xl">
                  {isSearchingCreators ? (
                    <p className="px-4 py-3 text-center text-xs text-gray-500 dark:text-zinc-400">Searching creators...</p>
                  ) : creatorSearchResults.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto p-1.5">
                      {creatorSearchResults.map((creator) => (
                        <button
                          key={creator.accountId}
                          type="button"
                          onClick={() => handleCreatorSelect(creator)}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <img src={creator.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-gray-900 dark:text-white">
                              {creator.name}
                              {creator.accountId === userInfo?.account_id && (
                                <span className="rounded bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[10px] text-gray-500 dark:text-zinc-400">{creator.username}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-center text-xs text-gray-500 dark:text-zinc-500">No creators found.</p>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Credits */}
            <div className="relative">
              <button
                onClick={handleTopUp}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 px-3 py-1.5 transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <CreditIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-bold text-amber-600 dark:text-yellow-200">{userCredits.toLocaleString()}</span>
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
                  src={userAvatarState || userAvatar} 
                  alt={userInfo?.username || "User"} 
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/20"
                  onError={(e) => {
                    // ✅ Fallback if image fails to load
                    (e.target as HTMLImageElement).src = userAvatar;
                  }}
                />
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{userInfo?.display_name || userInfo?.displayName || userInfo?.username || "User"}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{userSubscriptionPlan} Member</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shadow-xl dark:shadow-2xl backdrop-blur-xl animate-fade-in">
                  <div className="border-b border-gray-200 dark:border-white/10 p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{userInfo?.username || "User"}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500">{userInfo?.email || "user@ensemble.com"}</p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { navigate("/profile"); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 transition hover:bg-gray-100 dark:hover:bg-white/10">
                      <User className="h-4 w-4" /> Profile
                    </button>
                    <button
                      onClick={() => { navigate("/settings"); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 transition hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-white/10 p-2">
                    <button
                      onClick={(e) => { e.preventDefault(); setIsLogoutModalOpen(true); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
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