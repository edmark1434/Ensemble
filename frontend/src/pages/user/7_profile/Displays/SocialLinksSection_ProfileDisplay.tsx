import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ShieldAlert, Edit2, Check, X, Plus, Trash2 } from "lucide-react";
import {
  SiYoutube, SiTiktok, SiVimeo, SiInstagram, SiFacebook, SiTwitch, SiReddit, SiDiscord, SiGithub, SiFiverr, SiUpwork
} from "@icons-pack/react-simple-icons";

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksProps {
  loading?: boolean;
  socialLinks?: SocialLink[];
  onSaveLinks?: (updatedLinks: SocialLink[]) => void;
}

const PLATFORM_MAP: Record<string, { label: string; icon: any; color: string }> = {
  youtube: { label: "YouTube", icon: SiYoutube, color: "text-red-500" },
  tiktok: { label: "TikTok", icon: SiTiktok, color: "text-pink-500" },
  vimeo: { label: "Vimeo", icon: SiVimeo, color: "text-blue-400" },
  instagram: { label: "Instagram", icon: SiInstagram || "text-pink-500" },
  facebook: { label: "Facebook", icon: SiFacebook, color: "text-blue-600" },
  twitch: { label: "Twitch", icon: SiTwitch, color: "text-purple-500" },
  reddit: { label: "Reddit", icon: SiReddit, color: "text-orange-500" },
  discord: { label: "Discord", icon: SiDiscord, color: "text-indigo-400" },
  github: { label: "GitHub", icon: SiGithub, color: "text-gray-400" },
  fiverr: { label: "Fiverr", icon: SiFiverr, color: "text-green-500" },
  upwork: { label: "Upwork", icon: SiUpwork, color: "text-green-600" }
};

export const SocialLinksSectionSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#0b0e17]/60 p-4 space-y-2.5 animate-pulse">
    <div className="h-4 w-32 bg-white/10 rounded" />
    <div className="h-4 w-full bg-white/5 rounded" />
  </div>
);

export const SocialLinksSection_ProfileDisplay: React.FC<SocialLinksProps> = ({
  loading,
  socialLinks = [],
  onSaveLinks
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editLinks, setEditLinks] = useState<SocialLink[]>([]);

  if (loading) return <SocialLinksSectionSkeleton />;

  const startEditing = () => {
    setEditLinks([...socialLinks]);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSaveLinks) {
      // Filter out completely empty URLs before passing upstream
      onSaveLinks(editLinks.filter(l => l.url.trim() !== ""));
    }
    setIsEditing(false);
  };

  const handleUpdateLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...editLinks];
    updated[index] = { ...updated[index], [field]: value };
    setEditLinks(updated);
  };

  const handleAddLink = () => {
    if (editLinks.length >= 4) return; // Strict validation ceiling barrier constraint
    setEditLinks([...editLinks, { platform: "youtube", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    setEditLinks(editLinks.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#0b0e17]/60 backdrop-blur-md p-4 text-gray-800 dark:text-zinc-300 shadow-xl font-['Plus Jakarta Sans',sans-serif] space-y-3 relative h-fit w-full">

      {/* ==================== HEADER CONTROL PANEL ==================== */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
            {isEditing ? "Configure Network Logs" : "Network Integration Links"}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                title="Cancel Changes"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg border border-blue-500/20 bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all duration-200"
                title="Commit Routing Updates"
              >
                <Check className="h-3 w-3" />
              </button>
            </>
          ) : (
            onSaveLinks && (
              <button
                onClick={startEditing}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group/btn"
                title="Modify Integration Node"
              >
                <Edit2 className="h-3 w-3 transition-transform duration-200 group-hover/btn:rotate-12" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ==================== DISPLAY OR EDIT PORTION ==================== */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isEditing ? (
            /* INTERACTIVE INLINE CONFIG EDITOR VIEW */
            <motion.div
              key="editor-panel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-2.5 w-full"
            >
              {editLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 w-full">
                  {/* Custom System Select Dropdown Input Matrix */}
                  <div className="relative flex-shrink-0">
                    <select
                      value={link.platform.toLowerCase()}
                      onChange={(e) => handleUpdateLink(idx, "platform", e.target.value)}
                      className="appearance-none bg-white dark:bg-[#121624] text-xs text-gray-900 dark:text-white font-bold px-3 py-2 pr-8 rounded-xl border border-gray-200 dark:border-white/5 focus:outline-none focus:border-blue-500/40 cursor-pointer h-[38px] transition-colors"
                    >
                      {Object.keys(PLATFORM_MAP).map((key) => (
                        <option key={key} value={key}>
                          {PLATFORM_MAP[key].label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-zinc-400">
                      <Plus className="h-3 w-3 rotate-45 opacity-60" />
                    </div>
                  </div>

                  {/* Absolute Target Destination Address String Entry */}
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(idx, "url", e.target.value)}
                    placeholder="profile-username or full url..."
                    className="flex-1 bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 focus:bg-white dark:focus:bg-white/[0.02] h-[38px] transition-all min-w-0"
                  />

                  {/* Purge Matrix Log Action Entry */}
                  <button
                    onClick={() => handleRemoveLink(idx)}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 flex-shrink-0 h-[38px] w-[38px] flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Add Integration Log Target Controller Node */}
              {editLinks.length < 4 ? (
                <button
                  onClick={handleAddLink}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.01] p-2.5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.02] text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-250 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Attach Integration Link ({editLinks.length}/4)</span>
                </button>
              ) : (
                <div className="text-center text-[10px] text-gray-500 dark:text-zinc-500 font-medium italic py-1 bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 rounded-xl">
                  Maximum allocation capacity payload matrix reached (4 links).
                </div>
              )}
            </motion.div>
          ) : (
            /* STATIC RENDERING ROUTING DESTINATION LIST VIEW */
            <motion.div
              key="static-panel"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="space-y-2.5 w-full"
            >
              {!socialLinks || socialLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 px-4 bg-gray-50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-center space-y-1">
                  <ShieldAlert className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium">No custom link routing coordinates attached.</p>
                </div>
              ) : (
                socialLinks.map((link, idx) => {
                  const match = PLATFORM_MAP[link.platform.toLowerCase()];
                  const Icon = match ? match.icon : Link2;
                  const colorClass = match ? match.color : "text-gray-500 dark:text-zinc-400";

                  return (
                    <a
                      key={idx}
                      href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/[0.03] bg-gray-50 dark:bg-white/[0.01] p-2 h-[42px] transition-all duration-300 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.02] w-full box-border"
                    >
                      <div className="bg-white dark:bg-[#121624] border border-gray-200 dark:border-white/5 rounded-full p-1.5 flex items-center justify-center flex-shrink-0 w-6 h-6 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-[#161b2c]">
                        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colorClass}`} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400 truncate flex-1 group-hover:text-gray-900 dark:group-hover:text-white transition-colors group-hover:underline">
                        {link.url}
                      </span>
                    </a>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};