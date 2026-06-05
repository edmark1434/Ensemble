import { Bell, ChevronDown, Settings, LogOut, User, CircleDollarSign } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state"; // Ensure this is the correct path
import axios from "@/lib/axios";
import { signOut } from "firebase/auth";
import { auth } from "@/pages/firebase";

import UserNotificationModal from "./user_notification_modal";
import UserLogoutModal from "./user_logout_modal";

interface UserHeaderProps {
  pageTitle: string;
  credits?: number;
  userName?: string;
  userAvatar?: string;
  onTopUp?: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  pageTitle,
  credits = 0,
  userName = "",
  userAvatar = "https://i.pravatar.cc/150?u=john",
}) => {
  const navigate = useNavigate();

  // 1. Get the sidebar state from your global store
  const isCollapsed = useGlobalState((state) => state.isSidebarCollapsed);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const userInfo = useGlobalState((state) => state.user);
  const [showHeader, setShowHeader] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      try {
        await axios.get("/api/users/check-user-role");
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

  const handleTopUp = () => {
    navigate("/credits");
  };

  const executeFinalLogout = async () => {
    try {
      await axios.get("/api/users/logout");
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
    return null;
  }

  return showHeader ? (
    <>
      {/* 2. Added dynamic padding-left to match Sidebar width + transition */}
      <header
        className={`sticky top-0 z-50 border-b border-white/10 bg-[#080a12]/95 backdrop-blur-md transition-all duration-300 ${
            (!isCollapsed ? "md:p-0" : "md:pl-20")
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 md:px-8">
          {/* Left Side */}
          <div>
            <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pageTitle}
            </h1>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Credits */}
            <div className="relative">
              <button
                onClick={handleTopUp}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 px-3 py-1.5 transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <CircleDollarSign className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-200">{credits.toLocaleString()}</span>
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
                  isNotificationsOpen ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#080a12]" />
              </button>
              <UserNotificationModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
            </div>

            {/* Profile */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-white/10"
              >
                <img src={userAvatar} alt={userName} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{userInfo?.display_name || userInfo?.displayName || "User"}</p>
                  <p className="text-xs text-zinc-500">Premium Member</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl animate-fade-in">
                  <div className="border-b border-white/10 p-3">
                    <p className="text-sm font-medium text-white">{ userInfo.username}</p>
                    <p className="text-xs text-zinc-500">{userInfo?.email || "user@ensemble.com"}</p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { navigate("/profile"); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
                      <User className="h-4 w-4" /> Profile
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button
                      onClick={(e) => { e.preventDefault(); setIsLogoutModalOpen(true); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
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