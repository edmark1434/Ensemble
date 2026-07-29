import React, { useState, useRef, useEffect } from "react";
import { MapPin, Mail, Calendar, ChevronDown, Edit2, MessageCircle, Share2, Cake, HelpCircle, ShieldCheck } from "lucide-react";
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
  subscriptionType?: "Free" | "Premium" | "Business";
  onEditAvatar?: () => void;
  onEditProfile?: () => void;
  onChatClick?: () => void;
  onVerificationClick?: () => void;
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
  onVerificationClick
}) => {
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
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

  if (loading) return <div className="h-48 w-full bg-white/5 animate-pulse rounded-2xl" />;

  const getSubscriptionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "premium": return "/icons/subscription/premium.png";
      case "business": return "/icons/subscription/studio.png";
      default: return "/icons/subscription/freemium.png";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 shadow-xl font-['Plus Jakarta Sans',sans-serif]">
      <div className="flex flex-col gap-6 md:flex-row items-center md:items-start">

        {/* Left Side: Avatar Asset Element */}
        <div className="relative flex-shrink-0">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-0.5 shadow-xl shadow-blue-500/5">
            <div className="h-full w-full rounded-full bg-[#080a12] overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile Media" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{name?.charAt(0)}</span>
              )}
            </div>
          </div>
          {isOwner && (
            <button onClick={onEditAvatar} className="absolute bottom-0 right-0 rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 transition shadow-md">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Primary Info Cluster Blocks */}
        <div className="flex-1 text-center md:text-left space-y-1.5 w-full">

          {/* Row 1: Tags Wrapper */}
          <ProfileTags
            role={role}
            verificationLevel={verificationLevel}
            subscriptionType={subscriptionType}
          />

          {/* Row 2: Full Name Header Block + Left-Aligned Subscription Icon */}
          <div className="relative inline-flex items-center justify-center md:justify-start gap-3 w-full md:w-auto" ref={dropdownRef}>
            <img
              src={getSubscriptionIcon(subscriptionType)}
              alt="Tier Identity Icon"
              className="h-10 w-10 object-contain flex-shrink-0 select-none hidden sm:block drop-shadow-[0_0_10px_rgba(255,255,255,0.08)]"
              title={`${subscriptionType} Member`}
            />

            <h1 className="text-2xl font-black text-white tracking-tight md:text-3xl">
              {name} {middleName} {suffix}
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
                <div className="bg-zinc-950/90 text-white border border-white/15 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap tracking-wide shadow-md backdrop-blur-sm">
                  Click for Info
                </div>
              </div>

              {/* Floating Meta Dashboard Pane */}
              {isMetadataOpen && (
                <div className="absolute top-full left-1/2 md:left-0 transform -translate-x-1/2 md:translate-x-0 mt-2 w-80 rounded-xl border border-white/15 bg-[#0b0e17] p-3 shadow-2xl z-50 animate-fadeIn font-mono text-[11px] text-zinc-400 space-y-1.5">
                  <div className="absolute -top-1 left-1/2 md:left-4 transform -translate-x-1/2 md:translate-x-0 w-2 h-2 bg-[#0b0e17] border-t border-l border-white/15 rotate-45" />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-normal text-zinc-300">{`${location}, ${country} ${zipCode}`}</span>
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
            <span className="text-zinc-500 font-medium tracking-wide bg-white/5 px-1.5 py-0.5 rounded text-[11px]">@{username}</span>
            <span className="text-zinc-600 hidden sm:inline select-none">|</span>

            <div className="flex items-center gap-1 text-zinc-400 font-medium tracking-wide bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded text-[11px]">
              <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
              <span>Cebu City | Cebu | Philippines</span>
            </div>
          </div>

          {/* Row 4: Tagline / Title */}
          <p className="text-xs text-blue-400/90 font-bold tracking-wide pt-0.5">
            {tagline || "No specialized tagline configured"}
          </p>

        </div>

        {/* Action Controls Row */}
        <div className="flex flex-row gap-2 flex-shrink-0">
          {isOwner && (
            <button
              onClick={onEditProfile}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition shadow-sm"
              title="Modify Properties"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onChatClick}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition shadow-sm"
            title="Open Communications Hub"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          {!verificationLevel && isOwner && (
          <button
            onClick={onVerificationClick}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-emerald-500 hover:text-emerald-400 hover:bg-white/10 hover:border-emerald-500/20 transition shadow-sm"
            title="Account Verification Status"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          )}
          <button
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition"
            title="Share Profile Workspace"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Introduction Accordion Block */}
      <div className="mt-5 border-t border-white/5 pt-3">
        <button
          onClick={() => setIsBioExpanded(!isBioExpanded)}
          className="group flex items-center justify-between w-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 hover:text-zinc-300 transition-colors duration-200"
        >
          <span>Introduction</span>

          {/* Click Indicator Badge & Animated Arrow */}
          <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-blue-400 transition-colors">
            <span className="text-[9px] lowercase font-mono opacity-80 group-hover:opacity-100">
              {isBioExpanded ? "(click to collapse)" : "(click to expand)"}
            </span>
            <div
              className="transition-transform duration-300 ease-in-out"
              style={{ transform: isBioExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        </button>

        <div
          onClick={() => setIsBioExpanded(!isBioExpanded)}
          className="relative bg-white/[0.01] border border-white/5 p-3 rounded-xl cursor-pointer hover:border-white/10 transition-colors"
        >
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              !isBioExpanded ? "max-h-[7.2rem]" : "max-h-[1000px]"
            }`}
          >
            <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
              {bio || "This person seems shy on introducing itself..."}
            </p>
          </div>

          {/* Fade-out Gradient when Collapsed */}
          {!isBioExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#080a12]/90 to-transparent rounded-b-xl pointer-events-none" />
          )}
        </div>
      </div>

    </div>
  );
};