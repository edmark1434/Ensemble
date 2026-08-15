import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Mail, Calendar, ChevronDown, Edit2, MessageCircle, Share2, Cake, HelpCircle, ShieldCheck, X, Tag } from "lucide-react";
import { ProfileTags } from "../Utilities/ProfileTags.tsx";

interface TopSectionProps {
  loading?: boolean;
  username?: string;
  name?: string;
  middleName?: string;
  suffix?: string;
  role?: {
    role_id: number;
    role_name: string;
  }[];
  tagline?: string;
  location?: string;
  emailAddress?: string;
  joinedDate?: string;
  birthdate?: string;
  country?: string;
  zipCode?: string;
  bio?: string;
  avatarUrl?: string;
  isOwner?: boolean;
  verificationLevel?: boolean;
  verificationLevel?: number | boolean;
  onEditAvatar?: () => void;
  onEditProfile?: () => void;
  onChatClick?: () => void;
  onVerificationClick?: () => void;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export const TopSection_ProfileDisplay: React.FC<TopSectionProps> = ({
  loading,
  username,
  name,
  middleName,
  suffix,
  role,
  tagline,
  location,
  emailAddress,
  joinedDate,
  birthdate,
  country,
  zipCode,
  bio,
  avatarUrl,
  isOwner,
  verificationLevel = false,
  subscriptionType = "Free",
  onEditAvatar,
  onEditProfile,
  onChatClick,
  onVerificationClick,
  followersCount = 0,
  followingCount = 0,
  isFollowing = false,
  isFollowedBy = false,
  onFollow,
  onUnfollow,
  onFollowersClick,
  onFollowingClick
}) => {
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMetadataOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return <div className="h-48 w-full bg-gray-200 dark:bg-white/5 animate-pulse rounded-2xl" />;



  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white dark:from-white/[0.03] to-transparent p-6 shadow-xl font-['Plus Jakarta Sans',sans-serif]">
      <div className="flex flex-col gap-6 md:flex-row items-center md:items-start">

        {/* Left Side: Avatar Asset Element */}
        <div className="relative flex-shrink-0">
          <div 
            onClick={() => { if (avatarUrl) setIsAvatarExpanded(true); }}
            className={`h-28 w-28 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-700 dark:to-zinc-800 p-0.5 shadow-xl shadow-gray-500/5 ${avatarUrl ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
          >
            <div className="h-full w-full rounded-full bg-gray-100 dark:bg-[#080a12] overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile Media" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-gray-400 dark:text-white">{name?.charAt(0)}</span>
              )}
            </div>
          </div>
          {isOwner && (
            <button onClick={onEditAvatar} className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 transition shadow-md z-10">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ==================== EXPANDED AVATAR MODAL ==================== */}
        {createPortal(
          <AnimatePresence>
            {isAvatarExpanded && avatarUrl && (
              <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAvatarExpanded(false)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
                  aria-label="Close avatar view"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative max-w-2xl w-full max-h-[85vh] flex items-center justify-center pointer-events-none z-10"
                >
                  <button 
                    onClick={() => setIsAvatarExpanded(false)}
                    className="absolute -top-12 right-0 md:-right-12 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition pointer-events-auto"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <img 
                    src={avatarUrl} 
                    alt="Enlarged Profile" 
                    className="rounded-full md:rounded-2xl w-full h-auto object-contain max-h-[80vh] shadow-2xl ring-1 ring-white/10 pointer-events-auto"
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Right Side: Primary Info Cluster Blocks */}
        <div className="flex-1 text-center md:text-left space-y-1.5 w-full">

          {/* Row 1: Tags Wrapper */}
          <ProfileTags
            role={role}
            verificationLevel={verificationLevel}
            subscriptionType={subscriptionType}
            onEditRole={isOwner ? onEditProfile : undefined}
          />

          {/* Row 2: Full Name Header Block */}
          <div className="relative inline-flex items-center justify-center md:justify-start gap-3 w-full md:w-auto mt-1" ref={dropdownRef}>

            <h1 className="flex items-center flex-wrap gap-2 text-2xl font-black text-gray-900 dark:text-white tracking-tight md:text-3xl">
              <span>
                {(() => {
                  const nameParts = name ? name.split(/\s+/) : [];
                  const firstName = nameParts.length > 0 ? nameParts[0] : "";
                  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
                  
                  const firstMid = [firstName, middleName].filter(Boolean).join(" ");
                  if (lastName) {
                    return `${firstMid}, ${lastName} ${suffix || ""}`.trim();
                  }
                  return firstMid;
                })()}
              </span>
              <span className={`flex items-center gap-1 text-sm font-bold px-2.5 py-0.5 rounded-lg ml-1 ${subscriptionType === 'Business' ? 'animate-rainbow' : subscriptionType === 'Premium' ? 'animate-gold-solid' : 'silver-solid'}`}>
                <Tag className="w-3.5 h-3.5" />
                {tagline || "Add Tagline"}
              </span>
            </h1>

            {/* Tooltip & Trigger Node Group Wrapper */}
            <div className="relative group flex items-center">
              <button
                onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                className={`text-zinc-500 hover:text-blue-400 transition-colors p-0.5 rounded-full outline-none ${isMetadataOpen ? 'text-blue-400' : ''}`}
              >
                <HelpCircle className="h-5 w-5" />
              </button>

              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block pointer-events-none z-30">
                <div className="bg-gray-800 dark:bg-zinc-950/90 text-white border border-gray-700 dark:border-white/15 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap tracking-wide shadow-md backdrop-blur-sm">
                  Click for Info
                </div>
              </div>

              {/* Floating Meta Dashboard Pane */}
              {isMetadataOpen && (
                <div className="absolute top-full left-1/2 md:left-0 transform -translate-x-1/2 md:translate-x-0 mt-2 w-80 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#0b0e17] p-3 shadow-2xl z-50 animate-fadeIn font-mono text-[11px] text-gray-600 dark:text-zinc-400 space-y-1.5">
                  <div className="absolute -top-1 left-1/2 md:left-4 transform -translate-x-1/2 md:translate-x-0 w-2 h-2 bg-white dark:bg-[#0b0e17] border-t border-l border-gray-200 dark:border-white/15 rotate-45" />
                  <div className="flex items-start gap-2 border-b border-gray-200 dark:border-white/10 pb-1.5 mb-1.5">
                    <span className="font-bold text-gray-700 dark:text-zinc-300">Full Name:</span>
                    <span className="leading-normal text-gray-800 dark:text-white">
                      {(() => {
                        const nameParts = name ? name.split(/\s+/) : [];
                        const firstName = nameParts.length > 0 ? nameParts[0] : "";
                        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
                        return [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
                      })()}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-normal text-gray-800 dark:text-zinc-300">{`${location}, ${country} ${zipCode}`}</span>
                  </div>
                  <div className="flex items-center gap-2"><Cake className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" /> <span>Born: {birthdate ? new Date(birthdate).toLocaleDateString() : "Not Specified"}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" /> <span>Joined: {joinedDate ? new Date(joinedDate).toLocaleDateString() : "N/A"}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Email Address + Ecosystem Username + Geographic Location Chips */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              <span>{emailAddress}</span>
            </div>
            <span className="text-zinc-600 hidden sm:inline select-none">|</span>
            <span className="text-gray-800 dark:text-zinc-500 font-medium tracking-wide bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[11px]">@{username}</span>
            <span className="text-zinc-600 hidden sm:inline select-none">|</span>

            <div className="flex items-center gap-1 text-gray-700 dark:text-zinc-400 font-medium tracking-wide bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 px-2 py-0.5 rounded text-[11px]">
              <MapPin className="h-3 w-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>Cebu City | Cebu | Philippines</span>
            </div>
          </div>

          {/* Row 4: Bio / Tagline */}
          <div className="pt-2 pb-1 max-w-xl">
            <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed font-normal">
              {bio || "This person seems shy on introducing themselves..."}
            </p>
          </div>
          
          {/* Row 5: Followers Stats */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-sm font-semibold text-gray-700 dark:text-zinc-300">
            <button onClick={onFollowersClick} className="hover:text-blue-500 dark:hover:text-blue-400 hover:underline decoration-blue-400/50 underline-offset-4 transition">
              <span className="text-gray-900 dark:text-white">{followersCount}</span> <span className="text-gray-500 dark:text-zinc-500 font-normal">Followers</span>
            </button>
            <button onClick={onFollowingClick} className="hover:text-blue-500 dark:hover:text-blue-400 hover:underline decoration-blue-400/50 underline-offset-4 transition">
              <span className="text-gray-900 dark:text-white">{followingCount}</span> <span className="text-gray-500 dark:text-zinc-500 font-normal">Following</span>
            </button>
          </div>

        </div>

        {/* Action Controls Row */}
        <div className="flex flex-row gap-2 flex-shrink-0">
          {isOwner && (
            <button
              onClick={onEditProfile}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition shadow-sm"
              title="Modify Properties"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onChatClick}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition shadow-sm"
            title="Open Communications Hub"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          
          {!isOwner && (
            <button
              onClick={isFollowing ? onUnfollow : onFollow}
              className={`px-4 py-2 text-sm font-bold rounded-xl border transition shadow-sm ${
                isFollowing
                  ? "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 dark:hover:text-red-400"
                  : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:border-blue-400"
              }`}
            >
              {isFollowing ? "Following" : isFollowedBy ? "Follow Back" : "Follow"}
            </button>
          )}

          {!verificationLevel && isOwner && (
          <button
            onClick={onVerificationClick}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-emerald-500/20 transition shadow-sm"
            title="Account Verification Status"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          )}
          <button
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition"
            title="Share Profile Workspace"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
};