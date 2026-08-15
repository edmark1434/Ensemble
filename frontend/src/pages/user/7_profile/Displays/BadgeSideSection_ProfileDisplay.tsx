import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Edit2, ShieldCheck, Calendar, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface BadgeMetadata {
  id: string | number;
  name: string;
  description: string;
  icon: string;
  borderColor: string;
  glowColor: string;
  condition: string;
  dateObtained: string;
}

interface BadgeSectionProps {
  loading?: boolean;
  badges?: BadgeMetadata[];
  isOwner?: boolean; // Added isOwner prop
  onEditClick?: () => void;
}

export const BadgeSideSectionSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#0b0e17]/60 p-5 space-y-3 animate-pulse">
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
    { label: "Uncommon", color: "#10b981", bg: "rgba(16,185,129,0.05)", desc: "Standard milestone achievements assigned for early platform tasks." },
    { label: "Rare", color: "#3b82f6", bg: "rgba(59,130,246,0.05)", desc: "Commended performance markers earned through standard work cycles." },
    { label: "Epic", color: "#a855f7", bg: "rgba(168,85,247,0.05)", desc: "High-tier distinctions awarded to platform test pioneers and elite contributors." },
    { label: "Legendary", color: "#eab308", bg: "rgba(234,179,8,0.05)", desc: "Prestigious status emblems reserved for monumental ecosystem dedication." },
    { label: "???", color: "#ef4444", bg: "rgba(239,68,68,0.05)", desc: "Classification protocols restricted or obscured from normal node logs." },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b0e17]/90 p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus Jakarta Sans',sans-serif] space-y-3 relative z-20">

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Account Badges</h3>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* Question Mark Help Tooltip */}
          <div className="relative group/help">
            <button className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-help">
              <HelpCircle className="h-3 w-3" />
            </button>

            <div className="absolute left-full top-0 ml-4 w-80 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#070913] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 scale-95 pointer-events-none transition-all duration-200 ease-out group-hover/help:opacity-100 group-hover/help:scale-100 z-50 text-left space-y-3 origin-top-left">
              <div className="absolute right-full top-3.5 border-[6px] border-transparent border-r-white dark:border-r-[#070913]" />
              <div className="absolute right-full top-3.5 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />

              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 dark:text-zinc-500 border-b border-gray-200 dark:border-white/5 pb-1.5">Badge Classification Hierarchy</p>

              <div className="space-y-2 font-sans">
                {rarities.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-xl border text-[11px]"
                    style={{ borderColor: `${r.color}15`, backgroundColor: r.bg }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-md animate-pulse" style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-gray-900 dark:text-white tracking-wide">{r.label}</span>
                        <span className="text-[8px] font-mono tracking-wider opacity-60" style={{ color: r.color }}>Tier 0{i + 1}</span>
                      </div>
                      <p className="text-gray-600 dark:text-zinc-400 font-medium leading-relaxed text-[10px]">{r.desc}</p>
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
                    className="group relative flex items-center justify-center w-[54px] h-[54px] mx-auto rounded-full transition-all duration-200 cursor-help border bg-gray-50 dark:bg-[#0d111d] border-transparent dark:border-white/[0.03]"
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
                      className="bg-white dark:bg-[#121624] border border-gray-200 dark:border-white/5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 w-12 h-12 p-1.5"
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 10px ${b.glowColor}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    </div>

                    {/* Tooltip */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-80 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#070913] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-50 text-left space-y-4 origin-left">
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white dark:border-r-[#070913]" />
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
                      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-3">
                        <div className="bg-white dark:bg-[#121624] border border-gray-200 dark:border-white/10 rounded-full p-2 flex items-center justify-center flex-shrink-0 w-16 h-16 shadow-xl relative" style={{ boxShadow: `0 0 20px ${b.glowColor}30` }}>
                          <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-sm text-gray-900 dark:text-white tracking-wide">{b.name}</h4>
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
                    className="group relative flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 cursor-help border bg-gray-50 dark:bg-[#0d111d] border-transparent dark:border-white/[0.03]"
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
                      className="bg-white dark:bg-[#121624] border border-gray-200 dark:border-white/5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 w-8 h-8 p-1"
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 10px ${b.glowColor}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-700 dark:text-zinc-300 tracking-wide truncate text-[11px] group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {b.name}
                      </p>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-80 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#070913] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-50 text-left space-y-4 origin-left">
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-white dark:border-r-[#070913]" />
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[6px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
                      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/5 pb-3">
                        <div className="bg-white dark:bg-[#121624] border border-gray-200 dark:border-white/10 rounded-full p-2 flex items-center justify-center flex-shrink-0 w-16 h-16 shadow-xl relative" style={{ boxShadow: `0 0 20px ${b.glowColor}30` }}>
                          <img src={b.icon} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-sm text-gray-900 dark:text-white tracking-wide">{b.name}</h4>
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