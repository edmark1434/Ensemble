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
    beginner: { color: "#3b82f6" },     // Blue
    intermediate: { color: "#10b981" }, // Green
    advanced: { color: "#eab308" },     // Yellow
    expert: { color: "#ef4444" },       // Red
  };

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
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              /* 1. COLLAPSED VIEW: Smooth Height Animation for Pills */
              <motion.div
                key="collapsed"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex flex-wrap gap-1.5 w-full overflow-hidden"
              >
                {skills.map((skill) => {
                  const currentConfig = proficiencyConfig[skill.proficiency] || proficiencyConfig.intermediate;
                  return (
                    <div
                      key={`pill-${skill.tag_id}`}
                      className="group relative flex items-center justify-center bg-white dark:bg-dark-surface/60 hover:bg-gray-100 dark:hover:bg-dark-surface/80 px-3 py-1 rounded-lg border transition-all duration-300 box-border overflow-hidden select-none"
                      style={{ borderColor: currentConfig.color }}
                    >
                      <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-200 tracking-wide transition-colors group-hover:text-gray-900 dark:group-hover:text-white relative z-10 whitespace-nowrap">
                        {skill.name}
                      </span>
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
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono capitalize tracking-wider font-extrabold flex-shrink-0"
                            style={{ backgroundColor: `${currentConfig.color}15`, color: currentConfig.color }}
                          >
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