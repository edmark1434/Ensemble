export type AssetType = "image" | "video" | "audio" | "template";
export type AssetStatus = "draft" | "published";

export interface AssetThumbnail {
  media_asset_thumbnail_id: string;
  path: string;
  position: number;
}

export interface AssetProjectLink {
  media_asset_project_link_id: string;
  label: string;
  provider: string;
  position: number;
}

export interface AssetBundleFile {
  media_asset_bundle_file_id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  preview_path: string;
  preview_mime_type: string;
  position: number;
}

export interface AssetRecord {
  market_asset_id: string;
  media_asset_id: string;
  name: string;
  description: string;
  price_credits: number;
  transaction_fee_percent: number;
  transaction_fee_credits: number;
  owner_net_credits: number;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
  type: AssetType;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  proxy_path: string;
  thumbnail_path: string;
  thumbnails: AssetThumbnail[];
  thumbnail_count: number;
  project_links: AssetProjectLink[];
  project_link_count: number;
  mime_type: string | null;
  size_bytes: number | null;
  bundle_files: AssetBundleFile[];
  bundle_file_count: number;
  creator_name: string;
  creator_handle: string | null;
  is_owner: boolean;
  is_purchased: boolean;
  can_download?: boolean;
  can_review: boolean;
  is_liked: boolean;
  is_saved: boolean;
  like_count: number;
  save_count: number;
  review_count: number;
  average_rating: number;
  tags: string[];
  comment_count: number;
}

export interface AssetReview {
  asset_review_id: string;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_handle: string | null;
  author_avatar_path: string | null;
  is_owner: boolean;
}

export interface AssetPurchaseResponse {
  asset: AssetRecord;
  transaction: {
    credit_transaction_id: string;
    type: string;
    amount_credits: number;
    status: string;
    created_at: string;
    reference_table: string;
    reference_id: string;
  } | null;
  alreadyPurchased: boolean;
  balanceCredits: number;
}

export interface AssetComment {
  asset_comment_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_handle: string | null;
  author_avatar_path: string | null;
  is_owner: boolean;
  replies: AssetReply[];
}

export interface AssetReply {
  asset_reply_id: string;
  reply: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_handle: string | null;
  author_avatar_path: string | null;
  is_owner: boolean;
}

export interface AssetPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function mediaUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return base ? `${base}/${path.replace(/^\/+/, "")}` : path;
}

export function readableSize(value?: number | null) {
  if (!value || value < 1) return "—";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function readableDuration(seconds?: number | null) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}
