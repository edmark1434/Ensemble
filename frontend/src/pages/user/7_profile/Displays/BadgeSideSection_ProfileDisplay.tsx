import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Edit2, ShieldCheck, Calendar, HelpCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export interface BadgeMetadata {
  id: string | number;
  name: string;
  description: string;
  icon: string;
  borderColor: string;
  glowColor: string;
  condition: string;
  dateObtained: string;
  category?: string;
  display_order?: number | null;
}

interface BadgeSectionProps {
  loading?: boolean;
  badges?: BadgeMetadata[];
  isOwner?: boolean; // Added isOwner prop
  onEditClick?: () => void;
}

export const BadgeSideSectionSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 p-5 space-y-3 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-4 w-28 bg-white/10 rounded" />
      <div className="h-4 w-4 bg-white/10 rounded" />
    </div>
    <div className="grid grid-cols-1 gap-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-10 w-full bg-white/5 rounded-xl" />
      ))}
    </div>
  </div>
);

export const BadgeSideSection_ProfileDisplay: React.FC<BadgeSectionProps> = ({
  loading,
  badges = [],
  isOwner = false, // Default to false
  onEditClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  if (loading) return <BadgeSideSectionSkeleton />;

  const displayBadges = badges.slice(0, 5);

  const rarities = [
    {
      tier: "Tier 1",
      label: "Uncommon",
      color: "#10b981",
      badgeClass: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
      desc: "Earned by completing starter tasks and early milestones.",
    },
    {
      tier: "Tier 2",
      label: "Rare",
      color: "#3b82f6",
      badgeClass: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
      desc: "Earned through consistent project work and solid delivery.",
    },
    {
      tier: "Tier 3",
      label: "Epic",
      color: "#a855f7",
      badgeClass: "border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400",
      desc: "Awarded to top contributors, pioneers, and standout editors.",
    },
    {
      tier: "Tier 4",
      label: "Legendary",
      color: "#f59e0b",
      badgeClass: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
      desc: "Reserved for extraordinary achievements and platform mastery.",
    },
    {
      tier: "Tier 5",
      label: "Secret (???)",
      color: "#ef4444",
      badgeClass: "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400",
      desc: "Hidden badges unlocked through mystery milestones.",
    },
  ];

  return (
    <div data-tour="profile-badges" className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base/90 p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus Jakarta Sans',sans-serif] space-y-3 relative z-40">

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Account Badges</h3>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* Question Mark Help Tooltip */}
          <div className="relative group/help">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-help"
              title="View Badge Rarities"
            >
              <HelpCircle className="h-3 w-3" />
            </button>

            <div className="absolute left-full top-0 ml-3.5 w-76 p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 scale-95 pointer-events-none transition-all duration-200 ease-out group-hover/help:opacity-100 group-hover/help:scale-100 z-[100] text-left space-y-2.5 origin-top-left font-['Plus_Jakarta_Sans',sans-serif]">
              {/* Tooltip Arrow */}
              <div className="absolute right-full top-3.5 border-[6px] border-transparent border-r-white dark:border-r-dark-base" />
              <div className="absolute right-full top-3.5 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />

              {/* Title Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">Badge Rarities</span>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">5 Tiers</span>
              </div>

              {/* Rarity Tiers List */}
              <div className="space-y-1.5">
                {rarities.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-colors ${r.badgeClass}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1 shrink-0 animate-pulse"
                      style={{ backgroundColor: r.color, boxShadow: `0 0 6px ${r.color}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white leading-tight">
                          {r.label}
                        </span>
                        <span className="text-[9px] font-semibold opacity-75 uppercase tracking-wider">
                          {r.tier}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium leading-snug mt-0.5">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Edit Button - Only show if user is the owner */}
          {isOwner && (
            <button
              onClick={onEditClick}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group/btn"
              title="Edit Displayed Badges"
            >
              <Edit2 className="h-3 w-3 transition-transform duration-200 group-hover/btn:rotate-12" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white text-gray-500 dark:text-zinc-400 transition-all duration-200"
            title={isCollapsed ? "Expand Layout" : "Collapse into Row View"}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Badges Layout List */}
      {displayBadges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 px-4 bg-gray-50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center space-y-1">
          <ShieldAlert className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium">No active badges showcased.</p>
        </div>
      ) : (
        <div className="relative">
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              /* Collapsed View (Horizontal Row) */
              <motion.div
                key="grid-collapsed"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-5 gap-2 pb-0.5 w-full"
              >
                {displayBadges.map((b) => (
                  <div
                    key={b.id}
                    className="group relative flex items-center justify-center w-[54px] h-[54px] mx-auto rounded-full transition-all duration-200 cursor-help border bg-gray-50 dark:bg-dark-surface border-transparent dark:border-white/[0.03]"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = b.borderColor;
                      e.currentTarget.style.backgroundColor = b.glowColor + "05";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    <div
                      className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 w-12 h-12 p-1.5"
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 10px ${b.glowColor}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    </div>

                    {/* Tooltip */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-80 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_25px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-[100] text-left space-y-4 origin-left">
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white dark:border-r-[#070913]" />
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
                      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-3">
                        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-full p-2 flex items-center justify-center flex-shrink-0 w-16 h-16 shadow-xl relative" style={{ boxShadow: `0 0 20px ${b.glowColor}30` }}>
                          <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-sm text-gray-900 dark:text-white tracking-wide">{b.name}</h4>
                          {b.category && <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">{b.category}</p>}
                          <p className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">{b.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2.5 text-[10px] pt-0.5">
                        <div className="flex items-start gap-2.5 text-gray-500 dark:text-zinc-400">
                          <ShieldCheck className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="leading-normal"><span className="text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Ecosystem Requirement:</span>{b.condition}</p>
                        </div>
                        <div className="flex items-start gap-2.5 text-gray-500 dark:text-zinc-400">
                          <Calendar className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="leading-normal"><span className="text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Ecosystem Authorization:</span>{b.dateObtained}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              /* Expanded View (Vertical Detailed Row) */
              <motion.div
                key="grid-expanded"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-1 gap-2 pb-0.5 w-full"
              >
                {displayBadges.map((b) => (
                  <div
                    key={b.id}
                    className="group relative flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 cursor-help border bg-gray-50 dark:bg-dark-surface border-transparent dark:border-white/[0.03]"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = b.borderColor;
                      e.currentTarget.style.backgroundColor = b.glowColor + "05";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    <div
                      className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 w-8 h-8 p-1"
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 10px ${b.glowColor}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-700 dark:text-zinc-300 tracking-wide truncate text-[11px] group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {b.name}
                      </p>
                      {b.category && (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">{b.category}</p>
                      )}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-80 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_25px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-[100] text-left space-y-4 origin-left">
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white dark:border-r-[#070913]" />
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
                      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-3">
                        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-full p-2 flex items-center justify-center flex-shrink-0 w-16 h-16 shadow-xl relative" style={{ boxShadow: `0 0 20px ${b.glowColor}30` }}>
                          <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-sm text-gray-900 dark:text-white tracking-wide">{b.name}</h4>
                          {b.category && <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">{b.category}</p>}
                          <p className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">{b.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2.5 text-[10px] pt-0.5">
                        <div className="flex items-start gap-2.5 text-gray-500 dark:text-zinc-400">
                          <ShieldCheck className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="leading-normal"><span className="text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Ecosystem Requirement:</span>{b.condition}</p>
                        </div>
                        <div className="flex items-start gap-2.5 text-gray-500 dark:text-zinc-400">
                          <Calendar className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="leading-normal"><span className="text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Ecosystem Authorization:</span>{b.dateObtained}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};