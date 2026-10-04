import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, HelpCircle, Edit2, ChevronDown, ChevronUp } from "lucide-react";

export interface SkillObject {
  tag_id: number | string;
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  years: number;
}

interface SkillsSectionProps {
  loading?: boolean;
  skills?: SkillObject[];
  onEditClick?: () => void;
}

export const SkillsSideSectionSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 p-4 space-y-3 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-4 w-36 bg-white/10 rounded" />
    </div>
    <div className="grid grid-cols-1 gap-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-14 w-full bg-white/5 rounded-xl" />
      ))}
    </div>
  </div>
);

export const SkillsSideSection_ProfileDisplay: React.FC<SkillsSectionProps> = ({
  loading,
  skills = [],
  onEditClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  if (loading) return <SkillsSideSectionSkeleton />;

  const proficiencyConfig = {
    beginner: {
      color: "#3b82f6",
      pill: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30",
      badge: "bg-blue-600 dark:bg-blue-500",
      bar: "bg-blue-500", width: "25%",
    },
    intermediate: {
      color: "#10b981",
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30",
      badge: "bg-emerald-600 dark:bg-emerald-500",
      bar: "bg-emerald-500", width: "50%",
    },
    advanced: {
      color: "#f59e0b",
      pill: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30",
      badge: "bg-amber-500 dark:bg-amber-500",
      bar: "bg-amber-500", width: "75%",
    },
    expert: {
      color: "#ef4444",
      pill: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30",
      badge: "bg-rose-600 dark:bg-rose-500",
      bar: "bg-rose-500", width: "100%",
    },
  } as const;

  return (
    // FIXED: Adjusted z-index to z-10 so top-level page elements / tooltips stack over it properly
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-dark-base/60 backdrop-blur-md p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus Jakarta Sans',sans-serif] space-y-3 relative z-10">

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Skills & Capabilities</h3>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* Info Question Mark Trigger */}
          <div className="relative group/help">
            <button className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-help">
              <HelpCircle className="h-3 w-3" />
            </button>

            {/* Note: Kept high z-index strictly local to this specific tooltip box */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-[0_15px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] opacity-0 scale-95 pointer-events-none transition-all duration-200 group-hover/help:opacity-100 group-hover/help:scale-100 z-[9999] text-left origin-left">
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-white dark:border-r-[#070913]" />
              <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[5px] border-transparent border-r-gray-200 dark:border-r-white/10 -z-10" />
              <p className="text-[10px] text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
                This matrix displays verified user skill sets complete with corresponding Levels of Proficiency and Years of Experience logs.
              </p>
            </div>
          </div>

          {/* Interactive Edit Trigger Pen */}
          {onEditClick && (
            <button
              onClick={onEditClick}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group/btn"
              title="Edit Capabilities Matrix"
            >
              <Edit2 className="h-3 w-3 transition-transform duration-200 group-hover/btn:rotate-12" />
            </button>
          )}

          {/* Collapse Toggle Switcher */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white text-gray-500 dark:text-zinc-400 transition-all duration-200"
            title={isCollapsed ? "Expand Layout View" : "Collapse into Pills"}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Main List Container Area */}
      {!skills || skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 px-4 bg-gray-50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center space-y-1">
          <ShieldAlert className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
          <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium">No capability matrix sets created.</p>
        </div>
      ) : (
        <div className={`relative ${isCollapsed ? "overflow-visible" : "overflow-hidden"}`}>
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              /* 1. COLLAPSED VIEW: Smooth Height Animation for Pills */
              <motion.div
                key="collapsed"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex flex-wrap gap-2 w-full pt-1.5"
              >
                {skills.map((skill) => {
                  const currentConfig = proficiencyConfig[skill.proficiency] || proficiencyConfig.intermediate;
                  return (
                    <div
                      key={`pill-${skill.tag_id}`}
                      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ring-1 ring-inset text-[11px] font-semibold select-none transition-transform hover:-translate-y-0.5 ${currentConfig.pill}`}
                    >
                      <span className="whitespace-nowrap">{skill.name}</span>
                      <span className="opacity-40">|</span>
                      <span className="capitalize font-extrabold whitespace-nowrap">{skill.proficiency}</span>
                      {Number(skill.years) > 0 && (
                        <div className="absolute -top-2 -right-2 group/yoe z-20">
                          <span className={`block min-w-[16px] text-center text-white text-[9px] leading-none font-bold px-1 py-[3px] rounded-md shadow-sm cursor-help ${currentConfig.badge}`}>
                            {skill.years}
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-28 p-1.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-[10px] leading-snug rounded-lg opacity-0 invisible group-hover/yoe:opacity-100 group-hover/yoe:visible transition-all z-[100] text-center shadow-xl pointer-events-none font-medium">
                            {skill.years} {Number(skill.years) === 1 ? "year" : "years"} of experience
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-zinc-200 dark:border-t-white/10" />
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-white dark:border-t-zinc-800 -mt-[1.5px]" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              /* 2. EXPANDED VIEW: Smooth Height Animation for Detailed List */
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full overflow-y-auto max-h-[354px]"
              >
                <div className="grid grid-cols-1 gap-2 w-full pb-0.5">
                  {skills.map((skill) => {
                    const currentConfig = proficiencyConfig[skill.proficiency] || proficiencyConfig.intermediate;
                    return (
                      <div
                        key={`card-${skill.tag_id}`}
                        className="group relative flex flex-col justify-between bg-gray-50 dark:bg-dark-surface/60 hover:bg-gray-100 dark:hover:bg-dark-surface/80 p-2.5 rounded-xl border border-transparent dark:border-white/5 transition-all duration-300 w-full box-border overflow-hidden"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = currentConfig.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '';
                        }}
                      >
                        {/* Title & Proficiency Pill */}
                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <span className="text-xs font-bold text-gray-900 dark:text-white tracking-wide truncate flex-1">
                            {skill.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ring-1 ring-inset capitalize tracking-wide font-bold flex-shrink-0 ${currentConfig.pill}`}>
                            {skill.proficiency}
                          </span>
                        </div>

                        {/* Operational Tenure */}
                        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 dark:text-zinc-500 font-medium relative z-10">
                          <span>Years of Experience</span>
                          <span className="font-bold text-gray-700 dark:text-zinc-300 transition-colors group-hover:text-gray-900 dark:group-hover:text-zinc-100">
                            {skill.years} {skill.years === 1 ? 'Year' : 'Years'}
                          </span>
                        </div>
                        <div className="mt-2 h-1 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${currentConfig.bar}`} style={{ width: currentConfig.width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};