export type AssetType = "image" | "video" | "audio" | "template";
export type AssetStatus = "draft" | "published";
export type AssetProcessingStatus = "processing" | "ready" | "failed";
export type AssetReviewStatus = "pending" | "scheduled" | "approved" | "rejected" | "delisted" | "draft";

/** One entry in the seller ↔ review team conversation on a submission. */
export type SubmissionMessageKind =
  | "submitted"
  | "resubmitted"
  | "reply"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "rejected_final"
  | "delisted"
  | "rereview";

export interface SubmissionMessage {
  id: string;
  kind: SubmissionMessageKind;
  authorType: "seller" | "staff" | "system";
  authorName: string;
  authorRole: string | null;
  body: string | null;
  publishAt: string | null;
  createdAt: string;
}

/** `GET /api/assets/:id/submission` (owner only). */
export interface AssetSubmission {
  listingId: string;
  number: string;
  status: AssetReviewStatus;
  publishAt: string | null;
  rejectionReason: string | null;
  /** Rejected for good by the review team: no resubmission from the page or the editor. */
  permanentlyRejected?: boolean;
  moderationNote: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  trashed: boolean;
  canResubmit: boolean;
  canReply: boolean;
  messages: SubmissionMessage[];
}

export interface AssetThumbnail {
  media_asset_id: string;
  path: string;
  position: number;
}

export interface AssetMediaFile {
  media_asset_id: string;
  name: string;
  type: Exclude<AssetType, "template">;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  proxy_path: string;
  thumbnail_path: string | null;
  processing_status: AssetProcessingStatus;
  position: number;
}

export interface AssetRecord {
  market_asset_id: string;
  media_asset_id: string | null;
  name: string;
  description: string;
  price_credits: number;
  is_admin_asset?: boolean;
  transaction_fee_percent: number;
  transaction_fee_credits: number;
  owner_net_credits: number;
  status: AssetStatus;
  review_status?: AssetReviewStatus | null;
  rejection_reason?: string | null;
  /** Owner only: delist / re-review reason on the latest listing. */
  review_note?: string | null;
  /** Owner only: go-live time of a scheduled listing (or when it went live). */
  review_publish_at?: string | null;
  trashed_at?: string | null;
  created_at: string;
  updated_at: string;
  type: AssetType;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  proxy_path: string;
  thumbnail_path: string | null;
  thumbnails: AssetThumbnail[];
  thumbnail_count: number;
  mime_type: string | null;
  size_bytes: number | null;
  media_assets: AssetMediaFile[];
  media_asset_count: number;
  has_ydoc: boolean;
  processing_status: AssetProcessingStatus;
  creator_name: string;
  creator_handle: string | null;
  creator_avatar_path: string | null;
  creator_is_verified?: boolean;
  creator_subscription_plan?: string | null;
  owner_account_id: string;
  creator_average_rating: number;
  creator_rating_count: number;
  is_owner: boolean;
  is_purchased: boolean;
  available_license_count: number;
  used_license_count: number;
  used_license_project_id: string | null;
  can_download?: boolean;
  can_review: boolean;
  is_liked: boolean;
  is_saved: boolean;
  like_count: number;
  save_count: number;
  review_count: number;
  purchase_count: number;
  average_rating: number;
  tags: string[];
  comment_count: number;
  reviewQueued?: boolean;
  reviewMessage?: string | null;
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

export interface AssetLicense {
  market_asset_license_id: string;
  market_asset_id: string;
  project_id: string | null;
  credit_transaction_id: string | null;
  price_credits: number;
  status: "active" | "refunded";
  purchased_at: string;
  assigned_at: string | null;
}

export interface AssetPurchaseResponse {
  license: AssetLicense;
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
  if (/^https?:\/\//i.test(path) || path.startsWith("/ensemble") || path.startsWith("/icons") || path.startsWith("/logo")) return path;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return base ? `${base}/${path.replace(/^\/+/, "")}` : path;
}

export function isVideoPreviewPath(path?: string | null) {
  if (!path) return false;
  return /(?:^|\/)thumbnails\/video-5s-(?:320|480)\//i.test(path)
    || /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(path);
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
