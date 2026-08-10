import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Heart, ArrowUpRight, Layers, FileText, Globe, Scale, Upload, Plus, X, ExternalLink, HelpCircle
} from "lucide-react";

export interface PortfolioItem {
  id: string | number;
  type: "project" | "document" | "link" | "tos";
  title: string;
  description: string;
  thumbnail?: string;
  fileUrl?: string;
  externalUrl?: string;
  views?: number;
  likes?: number;
  createdAt?: string;
}

interface ProfilePortfolioProps {
  portfolioItems?: PortfolioItem[];
  isOwner?: boolean;
  onUploadPDF?: (file: File) => Promise<void>;
  onAddExternalLink?: (data: { name: string; url: string; description: string }) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onEditTermsOfService?: () => void;
}

export const Profile_Portfolio: React.FC<ProfilePortfolioProps> = ({
  portfolioItems = [],
  isOwner = false,
  onUploadPDF,
  onAddExternalLink,
  onDeleteItem,
  onEditTermsOfService
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeViewItem, setActiveViewItem] = useState<PortfolioItem | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadPDF) {
      void onUploadPDF(e.target.files[0]);
      e.target.value = "";
    }
  };

  const submitLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onAddExternalLink || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddExternalLink({
        name: linkName.trim(),
        url: linkUrl.trim(),
        description: linkDescription.trim(),
      });
      setLinkName("");
      setLinkUrl("");
      setLinkDescription("");
      setShowLinkModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    project: { label: "Project", icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/10" },
    document: { label: "CV / Resume", icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/10" },
    link: { label: "Website", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/10" },
    tos: { label: "Terms of Service", icon: Scale, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/10" },
    // FIXED: Fallback configuration mapping to handle unexpected item arrays safely
    fallback: { label: "Unknown", icon: HelpCircle, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/10" }
  };

  return (
    <div className="space-y-6 flex-1 TrulyRawFixUnsetOverflow">

      {/* ==================== ACTION UTILITY BAR ==================== */}
      {isOwner && <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-200 dark:border-white/5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-[11px] font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <Upload className="h-3 w-3" />
          <span>Upload CV / Resume (PDF)</span>
        </button>

        <button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-[11px] font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>Embed Website Link</span>
        </button>

        <button
          onClick={onEditTermsOfService}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-[11px] font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <Scale className="h-3 w-3" />
          <span>Configure Terms of Service</span>
        </button>
      </div>}

      {/* ==================== UNIFORM SQUARE GRID ==================== */}
      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 content-start">
        {portfolioItems.map((item) => {
          // FIXED: Safely fetch configuration parameters or cleanly drop back to fallback options
          const cfg = typeConfig[item.type] || typeConfig.fallback;
          const CardIcon = cfg.icon;

          return (
            <div
              key={item.id}
              onClick={() => setActiveViewItem(item)}
              className="group relative flex flex-col aspect-square justify-between bg-white dark:bg-[#121420]/30 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-[#121420]/50 cursor-pointer shadow-lg"
            >
              {isOwner && onDeleteItem && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteItem(String(item.id));
                  }}
                  className="absolute right-2 top-2 z-20 rounded-lg border border-red-200 dark:border-red-500/20 bg-white/90 dark:bg-black/60 p-1.5 text-red-500 dark:text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/20"
                  title="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="relative flex-1 w-full bg-gray-100 dark:bg-zinc-900/40 border-b border-gray-200 dark:border-white/5 flex items-center justify-center overflow-hidden">
                {item.type === "project" && item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : item.type === "document" && item.fileUrl ? (
                  <iframe
                    src={`${item.fileUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                    title={`${item.title} PDF preview`}
                    className="pointer-events-none h-full w-full border-0 bg-white"
                    loading="lazy"
                  />
                ) : item.type === "link" && item.externalUrl ? (
                  <div className="relative h-full w-full bg-gray-100 dark:bg-zinc-950">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`p-4 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        <CardIcon className="h-6 w-6" />
                      </div>
                    </div>
                    <iframe
                      src={item.externalUrl}
                      title={`${item.title} website preview`}
                      className="pointer-events-none relative h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border} transition-transform duration-300 group-hover:scale-110 shadow-inner`}>
                    <CardIcon className="h-6 w-6" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1 text-[11px] font-bold text-white backdrop-blur-[2px]">
                  <span>Expand Item</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                </div>
              </div>

              <div className="p-3.5 space-y-1 bg-white dark:bg-[#0b0e17]/20 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {item.type === "project" && (
                    <span className="text-[9px] text-gray-500 dark:text-zinc-500 font-bold flex items-center gap-1">
                      <Heart className="h-2.5 w-2.5 text-red-400/70" /> {item.likes || 0}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wide truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium leading-normal line-clamp-1 opacity-70">
                  {item.description}
                </p>
                {item.createdAt && (
                  <p className="text-[9px] text-gray-400 dark:text-zinc-600">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {portfolioItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-zinc-500 text-center gap-2 flex-1">
            <Layers className="h-6 w-6 opacity-30 text-zinc-400" />
            <p className="text-xs font-medium italic">No workspace profile items running right now.</p>
          </div>
        )}
      </div>

      {/* ==================== EXPANDED IMMERSIVE DISPLAY MODAL ==================== */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 z-[200001] flex items-center justify-center p-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLinkModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              aria-label="Close website link form"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={submitLink}
              className="relative w-full max-w-md space-y-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12141f] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Embed Website Link</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Add a public portfolio or professional website.</p>
                </div>
                <button type="button" onClick={() => setShowLinkModal(false)} className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="block text-xs text-gray-600 dark:text-zinc-400">
                Display name <span className="text-red-500 dark:text-red-400">*</span>
                <input required maxLength={255} value={linkName} onChange={(e) => setLinkName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-[#0b0e17] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="My portfolio website" />
              </label>
              <label className="block text-xs text-gray-600 dark:text-zinc-400">
                Website URL <span className="text-red-500 dark:text-red-400">*</span>
                <input required type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-[#0b0e17] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="https://example.com" />
              </label>
              <label className="block text-xs text-gray-600 dark:text-zinc-400">
                Description
                <textarea maxLength={2000} rows={3} value={linkDescription} onChange={(e) => setLinkDescription(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-[#0b0e17] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="Describe what visitors will find." />
              </label>
              <button disabled={isSubmitting} type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {isSubmitting ? "Adding..." : "Add Website"}
              </button>
            </motion.form>
          </div>
        )}
        {activeViewItem && (
          <div className="fixed inset-0 flex items-center justify-center z-[200000] p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveViewItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-4xl bg-white/95 dark:bg-[#0b0e17]/95 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 font-['Plus Jakarta Sans',sans-serif]"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black uppercase tracking-widest ${(typeConfig[activeViewItem.type] || typeConfig.fallback).color}`}>
                    {(typeConfig[activeViewItem.type] || typeConfig.fallback).label}
                  </span>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white truncate tracking-wide">
                    {activeViewItem.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveViewItem(null)}
                  className="p-1.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-zinc-950/20 [scrollbar-width:thin]">
                {activeViewItem.type === "project" && activeViewItem.thumbnail && (
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-zinc-900/40">
                    <img src={activeViewItem.thumbnail} alt={activeViewItem.title} className="w-full h-auto max-h-[450px] object-contain mx-auto" />
                  </div>
                )}

                {activeViewItem.type === "document" && activeViewItem.fileUrl && (
                  <div className="w-full h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-[#121420]/30">
                    <iframe
                      src={`${activeViewItem.fileUrl}#toolbar=0`}
                      className="w-full h-full border-none"
                      title={activeViewItem.title}
                    />
                  </div>
                )}

                {activeViewItem.type === "link" && activeViewItem.externalUrl && (
                  <div className="space-y-3">
                    <div className="h-[500px] w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-white">
                      <iframe
                        src={activeViewItem.externalUrl}
                        title={`${activeViewItem.title} website preview`}
                        className="h-full w-full border-0"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] p-3">
                      <p className="min-w-0 truncate text-xs text-gray-500 dark:text-zinc-400">
                        If the website blocks embedded previews, open it in a new tab.
                      </p>
                    <a
                      href={activeViewItem.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500"
                    >
                        <span>Open Website</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    </div>
                  </div>
                )}

                {activeViewItem.type === "tos" && (
                  <div className="p-5 md:p-6 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-[#0d111d]/50 font-sans text-xs text-gray-800 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                    {activeViewItem.description}
                  </div>
                )}

                {activeViewItem.type !== "tos" && (
                  <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-white/5">
                    <h5 className="text-[11px] font-black uppercase text-gray-500 dark:text-zinc-500 tracking-wider">Item Documentation Logs</h5>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">
                      {activeViewItem.description}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
