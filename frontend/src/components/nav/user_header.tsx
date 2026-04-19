import { Bell, ChevronDown, Settings, LogOut, User, CircleDollarSign } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UserHeaderProps {
  pageTitle: string;
  credits?: number;
  userName?: string;
  userAvatar?: string;
  onTopUp?: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  pageTitle,
  credits = 1250,
  userName = "John Paul Mahilom",
  userAvatar = "https://i.pravatar.cc/150?u=john",
                                               }) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTopUp = () => {
    // Navigate to credit shop page
    navigate("/credits");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080a12]/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 md:px-8">

        {/* Left Side - Page Title */}
        <div>
          <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {pageTitle}
          </h1>
        </div>

        {/* Right Side - Credits & Notifications & Profile */}
        <div className="flex items-center gap-4">

          {/* Credits Display - Clickable Coin Style */}
          <div className="relative">
            <button
              onClick={handleTopUp}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 px-3 py-1.5 transition-all duration-300 hover:scale-105 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/20"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Coin Icon */}
              <div className="relative">
                <CircleDollarSign className="h-4 w-4 text-yellow-500" />
              </div>

              {/* Credits Amount */}
              <span className="text-sm font-bold text-yellow-200">
                {credits.toLocaleString()}
              </span>
              <span className="text-xs text-yellow-500/80">credits</span>

              {/* Top-up hint that appears on hover */}
              {isHovered && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg animate-fade-in">
                  Go to Credit Shop
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </span>
              )}
            </button>
          </div>

          {/* Notification Bell */}
          <button className="relative rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#080a12]" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-white/10"
            >
              <img
                src={userAvatar}
                alt={userName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
              />
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-white">{userName.split(" ")[0]}</p>
                <p className="text-xs text-zinc-500">Premium Member</p>
              </div>
              <ChevronDown className={`hidden lg:block h-4 w-4 text-zinc-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in">
                <div className="border-b border-white/10 p-3">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-zinc-500">{userName.split(" ")[0].toLowerCase()}@ensemble.com</p>
                </div>

                <div className="p-2">
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-white/10 p-2">
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </header>
  );
};

export default UserHeader;