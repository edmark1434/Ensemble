import React from "react";
import { Heart, Star, Pencil, Trash2, CheckCircle2, BadgeCheck, Bookmark, Clock, Image, Clapperboard, AudioLines, LayoutTemplate, ShoppingCart, AlertTriangle, PackageOpen, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditIcon } from "@/components/ui/credit-icon";
import AssetMedia from "./AssetMedia";
import type { AssetRecord } from "./assetTypes";
import { mediaUrl } from "./assetTypes";

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "video": return <Clapperboard className="h-3 w-3" />;
    case "image": return <Image className="h-3 w-3" />;
    case "audio": return <AudioLines className="h-3 w-3" />;
    case "template": return <LayoutTemplate className="h-3 w-3" />;
    default: return null;
  }
}

function getSubscriptionIcon(type: string) {
  switch (type.toLowerCase()) {
    case "premium": return "/icons/subscription/premium.png";
    case "business": return "/icons/subscription/studio.png";
    default: return "/icons/subscription/freemium.png";
  }
}

export interface AssetCardProps {
  asset: AssetRecord;
  view?: "discover" | "mine" | "purchased" | "saved" | "liked" | "trash";
  engagementPending?: Set<string>;
  onUpdateEngagement?: (asset: AssetRecord, kind: "like" | "save") => void;
  onEdit?: (asset: AssetRecord) => void;
  onDelete?: (asset: AssetRecord) => void;
  onRestore?: (asset: AssetRecord) => void;
  hideActions?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  view = "discover",
  engagementPending = new Set(),
  onUpdateEngagement,
  onEdit,
  onDelete,
  onRestore,
  hideActions = false,
}) => {
  const navigate = useNavigate();
  const unavailable = asset.processing_status === "processing" || asset.processing_status === "failed";

  return (
    <article
      onClick={() => { if (!unavailable) navigate(`/assets/${asset.market_asset_id}`); }}
      aria-disabled={unavailable}
      style={unavailable ? { cursor: "default" } : undefined}
      className="group flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-dark-surface dark:shadow-none dark:hover:border-blue-500/50"
    >
      <div className="relative overflow-hidden">
        <AssetMedia asset={asset} compact />
        <div className="absolute left-2 top-2 right-14 flex flex-wrap items-center gap-1.5 z-10">
          <span className="relative overflow-hidden flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10 uppercase tracking-wider">
            <span className="relative z-10 flex items-center gap-1.5">
              {getTypeIcon(asset.type)}
              {asset.media_asset_count > 1 && <span title="Bundle: all included assets for one price" aria-label="Asset bundle"><PackageOpen className="h-3.5 w-3.5" /></span>}
              {asset.type}{asset.media_asset_count > 1 ? " Bundle" : ""}
            </span>
            <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </span>
        </div>
        <div className="absolute left-2 bottom-2 flex flex-wrap items-center gap-1.5 z-10">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
            <Star className={`h-2.5 w-2.5 ${asset.average_rating > 0 ? "fill-yellow-400 text-yellow-400" : "text-gray-500 dark:text-zinc-400"}`} />
            <span>
              {asset.average_rating > 0 ? asset.average_rating.toFixed(1) : "No Rating"}
            </span>
          </span>
          {asset.is_purchased && !asset.is_owner && asset.available_license_count > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-600 text-[10px] font-semibold uppercase text-white shadow-sm border border-emerald-500">
              <BadgeCheck className="h-3 w-3" /> License available
            </span>
          )}
          {view === "purchased" && asset.is_purchased && !asset.is_owner && asset.available_license_count === 0 && asset.used_license_count > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-700 text-[10px] font-semibold uppercase text-white shadow-sm border border-sky-600">
              <BadgeCheck className="h-3 w-3" /> License used
            </span>
          )}
          {view === "trash" && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border bg-red-600 border-red-500">
              <Trash2 className="h-3 w-3" /> Trashed
            </span>
          )}
          {view === "mine" && asset.is_owner && (
            <>
              {asset.status === "published" ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border bg-emerald-600 border-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Published
                </span>
              ) : asset.review_status === "pending" ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border bg-sky-600 border-sky-500">
                  <Clock className="h-3 w-3" /> Under Review
                </span>
              ) : asset.review_status === "rejected" ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border bg-rose-600 border-rose-500">
                  <AlertTriangle className="h-3 w-3" /> Rejected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase text-white shadow-sm border bg-amber-600 border-amber-500">
                  Draft
                </span>
              )}
            </>
          )}
        </div>
        {!hideActions && !unavailable && onUpdateEngagement && (
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
      <div className="flex flex-1 flex-col gap-3 p-4">
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
            {asset.purchase_count}
          </span>
        </div>

        {/* Title */}
        <h2 className="line-clamp-1 font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">
          {asset.name}
        </h2>
        {asset.processing_status === "processing" && <div className="space-y-2">
          <p className="text-xs text-blue-500">Preparing preview… <span className="float-right">99%</span></p>
          <div role="progressbar" aria-label="Preparing asset preview" aria-valuemin={0} aria-valuemax={100} aria-valuenow={99}
            className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div className="h-full w-[99%] rounded-full bg-blue-500" />
          </div>
        </div>}

        {/* Description */}
        <p className="line-clamp-2 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
          {asset.description || "No description provided."}
        </p>

        {view === "mine" && asset.is_owner && asset.review_status === "rejected" && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-[11px] text-rose-300">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400 mt-0.5" />
              <div className="min-w-0">
                <span className="font-semibold text-rose-200">Rejection note:</span>{" "}
                <span className="line-clamp-2">{asset.rejection_reason || "Moderator rejected this submission. Click edit to revise and resubmit."}</span>
              </div>
            </div>
          </div>
        )}

        {view === "mine" && asset.is_owner && asset.review_status === "pending" && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-2 text-[11px] text-sky-300">
            <div className="flex items-start gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span className="line-clamp-1">In review by moderators — will publish upon approval</span>
            </div>
          </div>
        )}

        <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
            {asset.is_admin_asset || asset.creator_avatar_path === "/ensemble_lg.svg" ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 p-1 dark:bg-white/10">
                <img
                  src="/ensemble_lg.svg"
                  alt={asset.creator_name || "By Ensemble"}
                  className="h-full w-full object-contain invert dark:invert-0"
                />
              </span>
            ) : asset.creator_avatar_path ? (
              <img
                src={mediaUrl(asset.creator_avatar_path)}
                alt={asset.creator_name}
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {(asset.creator_name || "E").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                  {asset.creator_name}
                </p>
                {asset.creator_is_verified && (
                  <img
                    src="/icons/verification/lvl2_verified.png"
                    alt="Verified"
                    className="h-3.5 w-3.5 shrink-0 object-contain"
                    title="Verified"
                  />
                )}
                {asset.creator_subscription_plan && (
                  <img
                    src={getSubscriptionIcon(asset.creator_subscription_plan)}
                    alt={asset.creator_subscription_plan}
                    className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    title={`${asset.creator_subscription_plan} Tier`}
                  />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className={`h-2.5 w-2.5 ${asset.average_rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-500"}`} />
                <span className={`text-[10px] font-semibold ${asset.average_rating > 0 ? "text-yellow-400" : "text-gray-500 dark:text-zinc-500"}`}>
                  {asset.average_rating > 0 ? asset.average_rating.toFixed(1) : "No Rating"}
                </span>
              </div>
            </div>
        </div>
        
        {/* Action Buttons */}
        {!hideActions && view === "trash" && asset.is_owner && onRestore && (
          <div className="mt-1 flex gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => onRestore(asset)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-300"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </button>
          </div>
        )}
        {!hideActions && view === "mine" && asset.is_owner && onEdit && onDelete && (
          <div className="mt-1 flex gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(asset)}
              disabled={asset.processing_status === "processing"}
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
