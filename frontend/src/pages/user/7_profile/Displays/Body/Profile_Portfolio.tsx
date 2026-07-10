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
}

interface ProfilePortfolioProps {
  portfolioItems?: PortfolioItem[];
  onUploadPDF?: (file: File) => void;
  onAddExternalLink?: () => void;
  onEditTermsOfService?: () => void;
}

export const Profile_Portfolio: React.FC<ProfilePortfolioProps> = ({
  portfolioItems = [],
  onUploadPDF,
  onAddExternalLink,
  onEditTermsOfService
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeViewItem, setActiveViewItem] = useState<PortfolioItem | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadPDF) {
      onUploadPDF(e.target.files[0]);
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
      <div className="flex flex-wrap gap-2 pb-1 border-b border-white/5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Upload className="h-3 w-3" />
          <span>Upload CV / Resume (PDF)</span>
        </button>

        <button
          onClick={onAddExternalLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>Embed Website Link</span>
        </button>

        <button
          onClick={onEditTermsOfService}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Scale className="h-3 w-3" />
          <span>Configure Terms of Service</span>
        </button>
      </div>

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
              className="group relative flex flex-col aspect-square justify-between bg-[#121420]/30 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/15 hover:bg-[#121420]/50 cursor-pointer shadow-lg"
            >
              <div className="relative flex-1 w-full bg-zinc-900/40 border-b border-white/5 flex items-center justify-center overflow-hidden">
                {item.type === "project" && item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
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

              <div className="p-3.5 space-y-1 bg-[#0b0e17]/20 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {item.type === "project" && (
                    <span className="text-[9px] text-zinc-500 font-bold flex items-center gap-1">
                      <Heart className="h-2.5 w-2.5 text-red-400/70" /> {item.likes || 0}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-white tracking-wide truncate group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium leading-normal line-clamp-1 opacity-70">
                  {item.description}
                </p>
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
              className="relative w-full max-w-4xl bg-[#0b0e17]/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 font-['Plus Jakarta Sans',sans-serif]"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.01]">
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black uppercase tracking-widest ${(typeConfig[activeViewItem.type] || typeConfig.fallback).color}`}>
                    {(typeConfig[activeViewItem.type] || typeConfig.fallback).label}
                  </span>
                  <h3 className="text-sm font-black text-white truncate tracking-wide">
                    {activeViewItem.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveViewItem(null)}
                  className="p-1.5 rounded-xl border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/20 [scrollbar-width:thin]">
                {activeViewItem.type === "project" && activeViewItem.thumbnail && (
                  <div className="w-full rounded-xl overflow-hidden border border-white/5 bg-zinc-900/40">
                    <img src={activeViewItem.thumbnail} alt={activeViewItem.title} className="w-full h-auto max-h-[450px] object-contain mx-auto" />
                  </div>
                )}

                {activeViewItem.type === "document" && activeViewItem.fileUrl && (
                  <div className="w-full h-[500px] rounded-xl overflow-hidden border border-white/5 bg-[#121420]/30">
                    <iframe
                      src={`${activeViewItem.fileUrl}#toolbar=0`}
                      className="w-full h-full border-none"
                      title={activeViewItem.title}
                    />
                  </div>
                )}

                {activeViewItem.type === "link" && activeViewItem.externalUrl && (
                  <div className="p-8 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] text-center space-y-4">
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 w-fit mx-auto border border-emerald-500/20">
                      <Globe className="h-8 w-8" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-white">External Platform Destination Integration</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        This link directs externally toward the user's primary workspace endpoint hub or verified project network domain.
                      </p>
                    </div>
                    <a
                      href={activeViewItem.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all cursor-pointer"
                    >
                      <span>Visit Target Domain</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {activeViewItem.type === "tos" && (
                  <div className="p-5 md:p-6 rounded-xl border border-white/5 bg-[#0d111d]/50 font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                    {activeViewItem.description}
                  </div>
                )}

                {activeViewItem.type !== "tos" && (
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <h5 className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">Item Documentation Logs</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
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