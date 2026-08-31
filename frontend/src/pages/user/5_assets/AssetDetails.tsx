import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Bookmark, Calendar, CheckCircle2, Clock3, Coins, CornerDownRight, Download, Edit3, Eye, FileAudio, FileImage, FileVideo, Heart, Loader2, MessageSquare, PackageOpen, Pencil, Ruler, Send, ShoppingCart, Star, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import useGlobalState from "@/lib/global_state";
import AssetEditorModal from "./AssetEditorModal";
import AssetMedia from "./AssetMedia";
import AssetOriginalModal from "./AssetOriginalModal";
import AssetPurchaseModal from "./AssetPurchaseModal";
import { mediaUrl, readableDuration, readableSize, type AssetBundleFile, type AssetComment, type AssetPurchaseResponse, type AssetRecord, type AssetReply, type AssetReview } from "./assetTypes";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string }; status?: number } }).response;
    return { message: response?.data?.error || fallback, status: response?.status };
  }
  return { message: fallback, status: undefined };
}

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse p-5 md:p-8">
      <div className="mb-5 h-10 w-36 rounded-xl bg-gray-200 dark:bg-white/5" />
      <div className="h-[52vh] rounded-2xl bg-gray-200 dark:bg-white/5" />
      <div className="mt-6 h-8 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
      <div className="mt-4 h-28 rounded-2xl bg-gray-100 dark:bg-white/5" />
    </div>
  );
}

export default function AssetDetails() {
  const { assetId = "" } = useParams();
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGuestView = isGuestMode || !user?.account_id;
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [reviews, setReviews] = useState<AssetReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<AssetComment | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingReplyCommentId, setPostingReplyCommentId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<{ commentId: string; reply: AssetReply } | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<AssetReview | null>(null);
  const [assetToDelete, setAssetToDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [isGuestLoginOpen, setIsGuestLoginOpen] = useState(false);
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<AssetBundleFile | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [engagementPending, setEngagementPending] = useState<"like" | "save" | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    setNotFound(false);
    try {
      const [assetResponse, commentsResponse, reviewsResponse] = await Promise.all([
        api.get<{ asset: AssetRecord }>(`/api/assets/${assetId}`, { signal }),
        api.get<{ comments: AssetComment[] }>(`/api/assets/${assetId}/comments`, { signal }),
        api.get<{ reviews: AssetReview[] }>(`/api/assets/${assetId}/reviews`, { signal }),
      ]);
      setAsset(assetResponse.data.asset);
      setComments(commentsResponse.data.comments || []);
      setReviews(reviewsResponse.data.reviews || []);
    } catch (error) {
      if (signal?.aborted) return;
      const parsed = errorMessage(error, "Unable to load this asset.");
      if (parsed.status === 404 || parsed.status === 400) setNotFound(true);
      else setLoadError(parsed.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const applyReviews = (nextReviews: AssetReview[]) => {
    setReviews(nextReviews);
    const average = nextReviews.length
      ? Number((nextReviews.reduce((total, review) => total + Number(review.rating), 0) / nextReviews.length).toFixed(1))
      : 0;
    setAsset((current) => current ? {
      ...current,
      review_count: nextReviews.length,
      average_rating: average,
    } : current);
  };

  const updateEngagement = async (kind: "like" | "save") => {
    if (!asset || engagementPending) return;
    if (isGuestView) {
      setIsGuestLoginOpen(true);
      return;
    }
    const enabled = kind === "like" ? asset.is_liked : asset.is_saved;
    setEngagementPending(kind);
    try {
      const response = enabled
        ? await api.delete<{ is_liked?: boolean; like_count?: number; is_saved?: boolean; save_count?: number }>(`/api/assets/${asset.market_asset_id}/${kind}`)
        : await api.put<{ is_liked?: boolean; like_count?: number; is_saved?: boolean; save_count?: number }>(`/api/assets/${asset.market_asset_id}/${kind}`);
      setAsset((current) => {
        if (!current) return current;
        return kind === "like"
          ? { ...current, is_liked: Boolean(response.data.is_liked), like_count: Number(response.data.like_count || 0) }
          : { ...current, is_saved: Boolean(response.data.is_saved), save_count: Number(response.data.save_count || 0) };
      });
    } catch (error) {
      showErrorToast(errorMessage(error, `Unable to ${kind} this asset.`).message);
    } finally {
      setEngagementPending(null);
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!asset || reviewSaving || !reviewText.trim()) return;
    setReviewSaving(true);
    try {
      if (editingReviewId) {
        const response = await api.patch<{ review: AssetReview }>(
          `/api/assets/${asset.market_asset_id}/reviews/${editingReviewId}`,
          { rating: reviewRating, review: reviewText.trim() }
        );
        applyReviews(reviews.map((review) => review.asset_review_id === editingReviewId
          ? response.data.review
          : review));
        showSuccessToast("Review updated.");
      } else {
        const response = await api.post<{ review: AssetReview }>(
          `/api/assets/${asset.market_asset_id}/reviews`,
          { rating: reviewRating, review: reviewText.trim() }
        );
        applyReviews([response.data.review, ...reviews]);
        showSuccessToast("Review submitted.");
      }
      setEditingReviewId(null);
      setReviewRating(5);
      setReviewText("");
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to save your review.").message);
    } finally {
      setReviewSaving(false);
    }
  };

  const postComment = async (event: FormEvent) => {
    event.preventDefault();
    if (isGuestView) {
      setIsGuestLoginOpen(true);
      return;
    }
    const clean = comment.trim();
    if (!clean) return;
    setPosting(true);
    try {
      const response = await api.post<{ comment: AssetComment }>(`/api/assets/${assetId}/comments`, { comment: clean });
      setComments((current) => [...current, response.data.comment]);
      setAsset((current) => current ? { ...current, comment_count: current.comment_count + 1 } : current);
      setComment("");
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to post the comment.").message);
    } finally {
      setPosting(false);
    }
  };

  const saveComment = async (item: AssetComment) => {
    const clean = editingComment.trim();
    if (!clean) return;
    setSavingComment(true);
    try {
      const response = await api.patch<{ comment: Partial<AssetComment> }>(`/api/assets/${assetId}/comments/${item.asset_comment_id}`, { comment: clean });
      setComments((current) => current.map((existing) => existing.asset_comment_id === item.asset_comment_id ? { ...existing, ...response.data.comment } : existing));
      setEditingCommentId(null);
      setEditingComment("");
      showSuccessToast("Comment updated.");
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to update the comment.").message);
    } finally {
      setSavingComment(false);
    }
  };

  const postReply = async (event: FormEvent, commentId: string) => {
    event.preventDefault();
    if (isGuestView) {
      setIsGuestLoginOpen(true);
      return;
    }
    const clean = replyText.trim();
    if (!clean || postingReplyCommentId) return;
    setPostingReplyCommentId(commentId);
    try {
      const response = await api.post<{ reply: AssetReply }>(
        `/api/assets/${assetId}/comments/${commentId}/replies`,
        { reply: clean }
      );
      setComments((current) => current.map((item) => item.asset_comment_id === commentId
        ? { ...item, replies: [...item.replies, response.data.reply] }
        : item));
      setReplyText("");
      setReplyingToCommentId(null);
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to post the reply.").message);
    } finally {
      setPostingReplyCommentId(null);
    }
  };

  const saveReply = async (commentId: string) => {
    const clean = editingReply.trim();
    if (!editingReplyId || !clean || savingReply) return;
    setSavingReply(true);
    try {
      const response = await api.patch<{ reply: AssetReply }>(
        `/api/assets/${assetId}/comments/${commentId}/replies/${editingReplyId}`,
        { reply: clean }
      );
      setComments((current) => current.map((item) => item.asset_comment_id === commentId
        ? {
            ...item,
            replies: item.replies.map((reply) => reply.asset_reply_id === editingReplyId
              ? response.data.reply
              : reply),
          }
        : item));
      setEditingReplyId(null);
      setEditingReply("");
      showSuccessToast("Reply updated.");
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to update the reply.").message);
    } finally {
      setSavingReply(false);
    }
  };

  const deleteSelected = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      if (reviewToDelete) {
        await api.delete(`/api/assets/${assetId}/reviews/${reviewToDelete.asset_review_id}`);
        applyReviews(reviews.filter((review) => review.asset_review_id !== reviewToDelete.asset_review_id));
        setReviewToDelete(null);
        setEditingReviewId(null);
        setReviewText("");
        showSuccessToast("Review deleted.");
      } else if (replyToDelete) {
        await api.delete(`/api/assets/${assetId}/comments/${replyToDelete.commentId}/replies/${replyToDelete.reply.asset_reply_id}`);
        setComments((current) => current.map((item) => item.asset_comment_id === replyToDelete.commentId
          ? { ...item, replies: item.replies.filter((reply) => reply.asset_reply_id !== replyToDelete.reply.asset_reply_id) }
          : item));
        setReplyToDelete(null);
        showSuccessToast("Reply deleted.");
      } else if (commentToDelete) {
        await api.delete(`/api/assets/${assetId}/comments/${commentToDelete.asset_comment_id}`);
        setComments((current) => current.filter((item) => item.asset_comment_id !== commentToDelete.asset_comment_id));
        setAsset((current) => current ? { ...current, comment_count: Math.max(0, current.comment_count - 1) } : current);
        setCommentToDelete(null);
        showSuccessToast("Comment deleted.");
      } else if (assetToDelete) {
        await api.delete(`/api/assets/${assetId}`);
        showSuccessToast("Asset deleted.");
        navigate("/assets", { replace: true });
      }
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to delete this item.").message);
    } finally {
      setDeleting(false);
    }
  };

  const downloadOriginal = async (bundleFile: AssetBundleFile) => {
    if (!asset || downloadingFileId) return;
    setDownloadingFileId(bundleFile.media_asset_bundle_file_id);
    try {
      const response = await api.get<{ downloadUrl: string }>(`/api/assets/${asset.market_asset_id}/files/${bundleFile.media_asset_bundle_file_id}/download`);
      if (!response.data.downloadUrl) throw new Error("The download URL was not returned.");
      window.location.assign(response.data.downloadUrl);
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to download the original asset.").message);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handlePurchased = (result: AssetPurchaseResponse) => {
    setAsset(result.asset);
    setPurchaseOpen(false);
    showSuccessToast(result.alreadyPurchased
      ? "You already own this asset."
      : result.asset.price_credits === 0
        ? "Asset added to your purchased library."
        : "Asset purchased successfully.");
  };

  const requestPurchase = () => {
    if (isGuestView) {
      setPurchaseOpen(false);
      setIsGuestLoginOpen(true);
      return;
    }
    setPurchaseOpen(true);
  };

  const deleteDialogOpen = assetToDelete || Boolean(commentToDelete) || Boolean(replyToDelete) || Boolean(reviewToDelete);
  const deleteDialogTitle = assetToDelete ? "Delete asset?" : reviewToDelete ? "Delete review?" : replyToDelete ? "Delete reply?" : "Delete comment?";
  const deleteDialogMessage = assetToDelete
    ? "This asset will be removed from the library."
    : reviewToDelete
      ? "Your review will be removed from this asset."
    : replyToDelete
      ? "This reply will be removed permanently."
      : "This comment will be removed permanently.";
  const myReview = reviews.find((review) => review.is_owner) || null;

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]"><UserHeader pageTitle="Asset Details" /><DetailSkeleton /></div>;
  }

  if (notFound || loadError || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#080a12] dark:text-white">
        <UserHeader pageTitle="Asset Details" />
        <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center p-6 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 dark:text-zinc-600" />
          <h1 className="mt-5 text-2xl font-bold">{notFound ? "Asset not found" : "Unable to load asset"}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">{notFound ? "This asset may be private, unavailable, or deleted." : loadError}</p>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => navigate("/assets")} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">Back to Assets</button>
            {!notFound && <button type="button" onClick={() => void load()} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/5">Try again</button>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#080a12] dark:text-white">
      <UserHeader pageTitle="Asset Details" />
      <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
        <button type="button" onClick={() => navigate("/assets")} className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Assets</button>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0d0f1a] dark:shadow-none">
          <AssetMedia asset={asset} thumbnailOnly />
          <div className="p-5 md:p-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">{asset.type}</span>{asset.is_purchased && !asset.is_owner && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Owned</span>}{asset.is_owner && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${asset.status === "published" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}>{asset.status}</span>}</div>
                <h1 className="mt-3 break-words text-2xl font-bold md:text-3xl">{asset.name}</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">Shared by <span className="font-semibold text-gray-800 dark:text-zinc-200">{asset.creator_name}</span>{asset.creator_handle ? ` · @${asset.creator_handle}` : ""}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" onClick={() => void updateEngagement("like")} disabled={Boolean(engagementPending)} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${asset.is_liked ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"}`} aria-pressed={asset.is_liked}><Heart className={`h-4 w-4 ${asset.is_liked ? "fill-current" : ""}`} /> {asset.like_count}</button>
                <button type="button" onClick={() => void updateEngagement("save")} disabled={Boolean(engagementPending)} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${asset.is_saved ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"}`} aria-pressed={asset.is_saved}><Bookmark className={`h-4 w-4 ${asset.is_saved ? "fill-current" : ""}`} /> {asset.is_saved ? "Saved" : "Save"}</button>
                <span className="mr-2 inline-flex items-center gap-2 text-lg font-bold text-amber-600 dark:text-amber-300"><Coins className="h-5 w-5" /> {asset.price_credits.toLocaleString()} credits</span>
                {asset.can_download ? (
                  <button type="button" onClick={() => document.getElementById("asset-bundle-files")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">
                    <PackageOpen className="h-4 w-4" /> View {asset.bundle_file_count} {asset.bundle_file_count === 1 ? "file" : "files"}
                  </button>
                ) : (
                  <button type="button" onClick={requestPurchase} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">
                    <ShoppingCart className="h-4 w-4" /> {asset.price_credits === 0 ? "Get asset" : "Purchase asset"}
                  </button>
                )}
                {asset.is_owner && <><button type="button" onClick={() => setEditorOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"><Pencil className="h-4 w-4" /> Edit</button><button type="button" onClick={() => setAssetToDelete(true)} className="rounded-xl border border-red-500/20 p-2.5 text-red-600 transition hover:bg-red-500/10 dark:text-red-300" aria-label="Delete asset"><Trash2 className="h-4 w-4" /></button></>}
              </div>
            </div>

            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-zinc-300">{asset.description}</p>

            {asset.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Asset tags">
                {asset.tags.map((tag) => (
                  <span key={tag.toLocaleLowerCase()} className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">#{tag}</span>
                ))}
              </div>
            )}

            {asset.is_owner && (
              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <Coins className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Earnings per purchase</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">A {asset.transaction_fee_percent}% marketplace transaction fee is deducted from your sale proceeds.</p>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                      <div><dt className="text-xs text-gray-500 dark:text-zinc-500">Listing price</dt><dd className="mt-1 font-bold">{asset.price_credits.toLocaleString()} credits</dd></div>
                      <div><dt className="text-xs text-gray-500 dark:text-zinc-500">Transaction fee</dt><dd className="mt-1 font-bold text-amber-700 dark:text-amber-300">−{asset.transaction_fee_credits.toLocaleString()} credits</dd></div>
                      <div><dt className="text-xs text-gray-500 dark:text-zinc-500">You receive</dt><dd className="mt-1 font-bold text-emerald-600 dark:text-emerald-300">{asset.owner_net_credits.toLocaleString()} credits</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            <section id="asset-bundle-files" className="mt-6 scroll-mt-24 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Package contents</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{asset.bundle_file_count} protected original {asset.bundle_file_count === 1 ? "file" : "files"}</p></div>
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Low-quality previews · originals require ownership</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {asset.bundle_files.map((bundleFile) => (
                  <BundleFilePreview
                    key={`${bundleFile.media_asset_bundle_file_id}:${asset.can_download}`}
                    bundleFile={bundleFile}
                    canAccessOriginal={Boolean(asset.can_download)}
                    downloading={downloadingFileId === bundleFile.media_asset_bundle_file_id}
                    downloadDisabled={Boolean(downloadingFileId)}
                    onOpen={() => asset.can_download
                      ? setSelectedOriginalFile(bundleFile)
                      : requestPurchase()}
                    onDownload={() => void downloadOriginal(bundleFile)}
                  />
                ))}
              </div>
            </section>

            <dl className="mt-6 grid gap-3 border-t border-gray-200 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
              <Metadata icon={Calendar} label="Published" value={formatDate(asset.created_at)} />
              <Metadata icon={Ruler} label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"} />
              <Metadata icon={Clock3} label="Duration" value={readableDuration(asset.duration_seconds)} />
              <Metadata icon={MessageSquare} label="Package size" value={readableSize(asset.bundle_files.reduce((total, file) => total + Number(file.size_bytes || 0), 0))} />
            </dl>
          </div>
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#0d0f1a]">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Comments</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Join the conversation about this asset.</p></div><span className="text-xs text-gray-500 dark:text-zinc-500">{comments.length}</span></div>
            <form onSubmit={postComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} onClick={() => isGuestView && setIsGuestLoginOpen(true)} readOnly={isGuestView} maxLength={2000} rows={2} placeholder={isGuestView ? "Log in to write a comment..." : "Write a comment..."} className="min-h-20 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#080a12] dark:text-white" />
              <button type="submit" disabled={posting || (!isGuestView && !comment.trim())} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{posting && <Loader2 className="h-4 w-4 animate-spin" />} Post</button>
            </form>

            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/10 dark:text-zinc-500">No comments yet. Start the conversation.</div>
              ) : comments.map((item) => (
                <article key={item.asset_comment_id} className="flex gap-3 border-b border-gray-100 pb-5 last:border-0 dark:border-white/5">
                  {item.author_avatar_path ? (
                    <img src={mediaUrl(item.author_avatar_path)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-300">{item.author_name.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold">{item.author_name}</p><p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-500">{formatDate(item.created_at, true)}</p></div>
                      {item.is_owner && (
                        <div className="flex">
                          <button type="button" onClick={() => { setEditingCommentId(item.asset_comment_id); setEditingComment(item.comment); }} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Edit comment"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setCommentToDelete(item)} className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/10 hover:text-red-500" aria-label="Delete comment"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === item.asset_comment_id ? (
                      <div className="mt-3">
                        <textarea value={editingComment} onChange={(event) => setEditingComment(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#080a12]" />
                        <div className="mt-2 flex gap-2"><button type="button" onClick={() => void saveComment(item)} disabled={savingComment || !editingComment.trim()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button><button type="button" onClick={() => setEditingCommentId(null)} disabled={savingComment} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">Cancel</button></div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-zinc-300">{item.comment}</p>
                    )}

                    <button type="button" onClick={() => { if (isGuestView) { setIsGuestLoginOpen(true); return; } setReplyingToCommentId((current) => current === item.asset_comment_id ? null : item.asset_comment_id); setReplyText(""); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-blue-300">
                      <CornerDownRight className="h-3.5 w-3.5" /> Reply{item.replies.length ? ` · ${item.replies.length}` : ""}
                    </button>

                    {item.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3 dark:border-white/10">
                        {item.replies.map((reply) => (
                          <div key={reply.asset_reply_id} className="flex gap-2.5 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.025]">
                            {reply.author_avatar_path ? (
                              <img src={mediaUrl(reply.author_avatar_path)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-300">{reply.author_name.slice(0, 2).toUpperCase()}</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div><p className="text-xs font-semibold">{reply.author_name}</p><p className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-500">{formatDate(reply.created_at, true)}</p></div>
                                {reply.is_owner && (
                                  <div className="flex">
                                    <button type="button" onClick={() => { setEditingReplyId(reply.asset_reply_id); setEditingReply(reply.reply); }} className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Edit reply"><Edit3 className="h-3 w-3" /></button>
                                    <button type="button" onClick={() => setReplyToDelete({ commentId: item.asset_comment_id, reply })} className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-500" aria-label="Delete reply"><Trash2 className="h-3 w-3" /></button>
                                  </div>
                                )}
                              </div>
                              {editingReplyId === reply.asset_reply_id ? (
                                <div className="mt-2">
                                  <textarea value={editingReply} onChange={(event) => setEditingReply(event.target.value)} maxLength={2000} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#080a12]" />
                                  <div className="mt-2 flex gap-2"><button type="button" onClick={() => void saveReply(item.asset_comment_id)} disabled={savingReply || !editingReply.trim()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button><button type="button" onClick={() => { setEditingReplyId(null); setEditingReply(""); }} disabled={savingReply} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">Cancel</button></div>
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700 dark:text-zinc-300">{reply.reply}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyingToCommentId === item.asset_comment_id && (
                      <form onSubmit={(event) => void postReply(event, item.asset_comment_id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <textarea autoFocus value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={2000} rows={2} placeholder={`Reply to ${item.author_name}…`} className="min-h-16 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#080a12]" />
                        <div className="flex gap-2 sm:flex-col">
                          <button type="submit" disabled={postingReplyCommentId === item.asset_comment_id || !replyText.trim()} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50">{postingReplyCommentId === item.asset_comment_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send</button>
                          <button type="button" onClick={() => { setReplyingToCommentId(null); setReplyText(""); }} disabled={postingReplyCommentId === item.asset_comment_id} className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-semibold dark:border-white/10">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#0d0f1a]">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-bold">Buyer reviews</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Verified purchasers only</p></div>
              <div className="text-right"><p className="inline-flex items-center gap-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-current" /> {asset.average_rating || "—"}</p><p className="mt-1 text-[10px] text-gray-500 dark:text-zinc-500">{asset.review_count} {asset.review_count === 1 ? "review" : "reviews"}</p></div>
            </div>

            {asset.can_review && (!myReview || editingReviewId) ? (
              <form onSubmit={submitReview} className="mt-5 rounded-xl border border-gray-200 p-3 dark:border-white/10">
                <p className="text-xs font-bold">{editingReviewId ? "Edit your review" : "Review this purchase"}</p>
                <div className="mt-3 flex gap-1" aria-label="Review rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button key={rating} type="button" onClick={() => setReviewRating(rating)} className="rounded-md p-1 transition hover:bg-amber-500/10" aria-label={`${rating} star${rating === 1 ? "" : "s"}`} aria-pressed={reviewRating === rating}><Star className={`h-5 w-5 ${rating <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-zinc-600"}`} /></button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={2000} rows={4} placeholder="Share your experience with this asset…" className="mt-3 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-[#080a12]" />
                <div className="mt-3 flex gap-2">
                  <button type="submit" disabled={reviewSaving || !reviewText.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50">{reviewSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {editingReviewId ? "Save review" : "Submit review"}</button>
                  {editingReviewId && <button type="button" onClick={() => { setEditingReviewId(null); setReviewRating(5); setReviewText(""); }} disabled={reviewSaving} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-white/10">Cancel</button>}
                </div>
              </form>
            ) : !asset.can_review && !asset.is_owner ? (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-white/[0.025] dark:text-zinc-400">Purchase this asset to leave a verified review.</p>
            ) : asset.is_owner ? (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-white/[0.025] dark:text-zinc-400">Creators cannot review their own assets.</p>
            ) : null}

            <div className="mt-5 space-y-4">
              {reviews.length === 0 ? (
                <p className="py-5 text-center text-xs text-gray-500 dark:text-zinc-500">No buyer reviews yet.</p>
              ) : reviews.map((review) => (
                <article key={review.asset_review_id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0 dark:border-white/5">
                  <div className="flex items-start gap-2.5">
                    {review.author_avatar_path ? <img src={mediaUrl(review.author_avatar_path)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-300">{review.author_name.slice(0, 2).toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><div><p className="truncate text-xs font-semibold">{review.author_name}</p><div className="mt-1 flex">{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} className={`h-3 w-3 ${rating <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-zinc-700"}`} />)}</div></div>{review.is_owner && <div className="flex"><button type="button" onClick={() => { setEditingReviewId(review.asset_review_id); setReviewRating(review.rating); setReviewText(review.review); }} className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-white/5" aria-label="Edit review"><Pencil className="h-3 w-3" /></button><button type="button" onClick={() => setReviewToDelete(review)} className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-500" aria-label="Delete review"><Trash2 className="h-3 w-3" /></button></div>}</div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-gray-600 dark:text-zinc-300">{review.review}</p>
                      <p className="mt-2 text-[10px] text-gray-400 dark:text-zinc-600">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <AssetEditorModal open={editorOpen} asset={asset} onClose={() => setEditorOpen(false)} onSaved={(updated) => { setAsset(updated); setEditorOpen(false); showSuccessToast("Asset updated."); }} />
      {!asset.is_owner && !isGuestView && <AssetPurchaseModal open={purchaseOpen} asset={asset} onClose={() => setPurchaseOpen(false)} onPurchased={handlePurchased} />}
      <GuestLoginModal
        isOpen={isGuestLoginOpen}
        onClose={() => setIsGuestLoginOpen(false)}
        title="Log in to continue"
        message="Please log in or create an account to purchase, like, save, comment on, or reply about this asset."
      />
      {selectedOriginalFile && <AssetOriginalModal open asset={asset} bundleFile={selectedOriginalFile} onClose={() => setSelectedOriginalFile(null)} />}
      <ConfirmationModal isOpen={deleteDialogOpen} title={deleteDialogTitle} message={deleteDialogMessage} confirmText={deleting ? "Deleting..." : "Delete"} cancelText="Cancel" onConfirm={() => void deleteSelected()} onCancel={() => { if (!deleting) { setAssetToDelete(false); setCommentToDelete(null); setReplyToDelete(null); setReviewToDelete(null); } }} />
    </div>
  );
}

function Metadata({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.025]"><Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" /><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">{label}</dt><dd className="mt-0.5 truncate font-medium text-gray-800 dark:text-zinc-200">{value}</dd></div></div>;
}

function BundleFileIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith("image/") ? FileImage : mimeType.startsWith("video/") ? FileVideo : FileAudio;
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300"><Icon className="h-7 w-7" /></span>;
}

function BundleFilePreview({
  bundleFile,
  canAccessOriginal,
  downloading,
  downloadDisabled,
  onOpen,
  onDownload,
}: {
  bundleFile: AssetBundleFile;
  canAccessOriginal: boolean;
  downloading: boolean;
  downloadDisabled: boolean;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const previewUrl = mediaUrl(bundleFile.preview_path);
  const format = bundleFile.mime_type.split("/")[1] || "file";
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#080a12]">
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-video w-full cursor-pointer overflow-hidden bg-gray-100 text-left dark:bg-black/30"
        aria-label={canAccessOriginal ? `View original ${bundleFile.name}` : `View low-quality preview of ${bundleFile.name}`}
      >
        {previewUrl && !failed ? (
          <img
            src={previewUrl}
            alt={`Preview of ${bundleFile.name}`}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center"><BundleFileIcon mimeType={bundleFile.mime_type} /></span>
        )}
        {!canAccessOriginal && <span className="absolute inset-0 bg-black/5" aria-hidden="true" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100"><Eye className="h-7 w-7 text-white" /></span>
      </button>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">{format} · {readableSize(bundleFile.size_bytes)}</p>
        {canAccessOriginal ? (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={onOpen} className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-500/10 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-300" aria-label={`View ${bundleFile.name}`}><Eye className="h-4 w-4" /></button>
            <button type="button" onClick={onDownload} disabled={downloadDisabled} className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-500/10 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-blue-300" aria-label={`Download ${bundleFile.name}`}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button>
          </div>
        ) : <button type="button" onClick={onOpen} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-300">View preview</button>}
      </div>
    </article>
  );
}
