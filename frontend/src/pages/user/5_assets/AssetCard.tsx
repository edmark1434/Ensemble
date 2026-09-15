import React from "react";
import { Heart, Star, Pencil, Trash2, CheckCircle2, Bookmark, Clock, Image as ImageIcon, Video, AudioLines, LayoutTemplate, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditIcon } from "@/components/ui/credit-icon";
import AssetMedia from "./AssetMedia";
import type { AssetRecord } from "./assetTypes";
import { mediaUrl } from "./assetTypes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "video": return <Video className="h-3 w-3" />;
    case "image": return <ImageIcon className="h-3 w-3" />;
    case "audio": return <AudioLines className="h-3 w-3" />;
    case "template": return <LayoutTemplate className="h-3 w-3" />;
    default: return null;
  }
}

export interface AssetCardProps {
  asset: AssetRecord;
  view?: "discover" | "mine" | "purchased" | "saved";
  engagementPending?: Set<string>;
  onUpdateEngagement?: (asset: AssetRecord, kind: "like" | "save") => void;
  onEdit?: (asset: AssetRecord) => void;
  onDelete?: (asset: AssetRecord) => void;
  hideActions?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  view = "discover",
  engagementPending = new Set(),
  onUpdateEngagement,
  onEdit,
  onDelete,
  hideActions = false,
}) => {
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate(`/assets/${asset.market_asset_id}`)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-dark-surface dark:shadow-none dark:hover:border-blue-500/50"
    >
      <div className="relative overflow-hidden">
        <AssetMedia asset={asset} compact />
        <div className="absolute left-2 top-2 right-14 flex flex-wrap items-center gap-1.5 z-10">
          <span className="relative overflow-hidden flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10 uppercase tracking-wider">
            <span className="relative z-10 flex items-center gap-1.5">
              {getTypeIcon(asset.type)}
              {asset.type}
            </span>
            <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[10px] font-semibold border border-white/10 text-white">
            <Star className={`h-3 w-3 ${asset.average_rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"}`} />
            <span className={asset.average_rating > 0 ? "text-yellow-400" : "text-gray-300 dark:text-zinc-400"}>
              {asset.average_rating > 0 ? asset.average_rating.toFixed(1) : "N/A"}
            </span>
          </span>
          {asset.is_purchased && !asset.is_owner && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-600 text-[10px] font-semibold uppercase text-white shadow-sm border border-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> Owned
            </span>
          )}
          {asset.is_owner && (
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border ${
              asset.status === "published" ? "bg-emerald-600 border-emerald-500" : "bg-amber-600 border-amber-500"
            }`}>
              {asset.status}
            </span>
          )}
        </div>
        {!hideActions && onUpdateEngagement && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 z-10" onClick={(event) => event.stopPropagation()}>
            <motion.button
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => onUpdateEngagement(asset, "like")}
              disabled={engagementPending.has(`like:${asset.market_asset_id}`)}
              className={`flex items-center gap-1 p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors disabled:opacity-50 ${
                asset.is_liked 
                  ? "text-red-500" 
                  : "text-gray-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
              } ${asset.like_count > 0 ? "px-2" : ""}`}
            >
              <motion.div
                initial={false}
                animate={asset.is_liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <Heart className={`h-3.5 w-3.5 ${asset.is_liked ? "fill-current" : ""}`} />
              </motion.div>
              {asset.like_count > 0 && <span className="text-[10px] font-bold">{asset.like_count}</span>}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => onUpdateEngagement(asset, "save")}
              disabled={engagementPending.has(`save:${asset.market_asset_id}`)}
              className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors disabled:opacity-50 ${
                asset.is_saved 
                  ? "text-yellow-500" 
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <motion.div
                initial={false}
                animate={asset.is_saved ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <Bookmark className={`h-3.5 w-3.5 ${asset.is_saved ? "fill-current" : ""}`} />
              </motion.div>
            </motion.button>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        {/* Price Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CreditIcon className="h-5 w-5" />
            <span className="text-lg font-bold text-amber-500 dark:text-amber-400">
              {asset.price_credits > 0 ? asset.price_credits.toLocaleString() : "Free"}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
            <ShoppingCart className="h-3.5 w-3.5" /> 
            {asset.purchase_count} {asset.purchase_count === 1 ? 'Sale' : 'Sales'}
          </span>
        </div>

        {/* Title */}
        <h2 className="line-clamp-1 font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">
          {asset.name}
        </h2>

        {/* Description */}
        <p className="line-clamp-2 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
          {asset.description || "No description provided."}
        </p>

        {/* Divider */}
        <div className="my-1 h-px w-full bg-gray-100 dark:bg-white/5" />

        {/* Footer (Creator & Date/Stats) */}
        <div className="flex items-center justify-between">
          {/* Creator */}
          <div className="flex items-center gap-2 min-w-0">
            {asset.creator_avatar_path ? (
              <img
                src={mediaUrl(asset.creator_avatar_path)}
                alt={asset.creator_name}
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {asset.creator_name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                {asset.creator_name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className={`h-2.5 w-2.5 ${asset.average_rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-500"}`} />
                <span className={`text-[10px] font-semibold ${asset.average_rating > 0 ? "text-yellow-400" : "text-gray-500 dark:text-zinc-500"}`}>
                  {asset.average_rating > 0 ? asset.average_rating.toFixed(1) : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500 shrink-0">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(asset.created_at)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        {!hideActions && asset.is_owner && onEdit && onDelete && (
          <div className="mt-1 flex gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(asset)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-300"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(asset)}
              className="inline-flex items-center justify-center rounded-lg border border-red-500/20 px-3 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
              aria-label={`Delete ${asset.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
