import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Calendar, CheckCircle2, Clock3, Coins, CornerDownRight, Download, Edit3, Eye, Loader2, MessageSquare, Pencil, Ruler, Send, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import AssetEditorModal from "./AssetEditorModal";
import AssetMedia from "./AssetMedia";
import AssetOriginalModal from "./AssetOriginalModal";
import AssetPurchaseModal from "./AssetPurchaseModal";
import { mediaUrl, readableDuration, readableSize, type AssetComment, type AssetPurchaseResponse, type AssetRecord, type AssetReply } from "./assetTypes";

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
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [comments, setComments] = useState<AssetComment[]>([]);
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
  const [assetToDelete, setAssetToDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    setNotFound(false);
    try {
      const [assetResponse, commentsResponse] = await Promise.all([
        api.get<{ asset: AssetRecord }>(`/api/assets/${assetId}`, { signal }),
        api.get<{ comments: AssetComment[] }>(`/api/assets/${assetId}/comments`, { signal }),
      ]);
      setAsset(assetResponse.data.asset);
      setComments(commentsResponse.data.comments || []);
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

  const postComment = async (event: FormEvent) => {
    event.preventDefault();
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
      if (replyToDelete) {
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

  const downloadOriginal = async () => {
    if (!asset || downloading) return;
    setDownloading(true);
    try {
      const response = await api.get<{ downloadUrl: string }>(`/api/assets/${asset.market_asset_id}/download`);
      if (!response.data.downloadUrl) throw new Error("The download URL was not returned.");
      window.location.assign(response.data.downloadUrl);
    } catch (error) {
      showErrorToast(errorMessage(error, "Unable to download the original asset.").message);
    } finally {
      setDownloading(false);
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

  const deleteDialogOpen = assetToDelete || Boolean(commentToDelete) || Boolean(replyToDelete);
  const deleteDialogTitle = assetToDelete ? "Delete asset?" : replyToDelete ? "Delete reply?" : "Delete comment?";
  const deleteDialogMessage = assetToDelete
    ? "This asset will be removed from the library."
    : replyToDelete
      ? "This reply will be removed permanently."
      : "This comment will be removed permanently.";

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-dark-base"><UserHeader pageTitle="Asset Details" /><DetailSkeleton /></div>;
  }

  if (notFound || loadError || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-white">
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
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-white">
      <UserHeader pageTitle="Asset Details" />
      <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
        <button type="button" onClick={() => navigate("/assets")} className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Assets</button>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface dark:shadow-none">
          <AssetMedia asset={asset} thumbnailOnly />
          <div className="p-5 md:p-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">{asset.type}</span>{asset.is_purchased && !asset.is_owner && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Owned</span>}{asset.is_owner && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${asset.status === "published" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}>{asset.status}</span>}</div>
                <h1 className="mt-3 break-words text-2xl font-bold md:text-3xl">{asset.name}</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">Shared by <span className="font-semibold text-gray-800 dark:text-zinc-200">{asset.creator_name}</span>{asset.creator_handle ? ` · @${asset.creator_handle}` : ""}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="mr-2 inline-flex items-center gap-2 text-lg font-bold text-amber-600 dark:text-amber-300"><Coins className="h-5 w-5" /> {asset.price_credits.toLocaleString()} credits</span>
                {asset.can_download ? (
                  <button type="button" onClick={() => void downloadOriginal()} disabled={downloading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download original
                  </button>
                ) : (
                  <button type="button" onClick={() => setPurchaseOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">
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

            {asset.can_download && (
              <button type="button" onClick={() => setOriginalOpen(true)} className="mt-6 flex w-full flex-col items-stretch gap-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/50 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5">
                <img src={mediaUrl(asset.thumbnail_path || asset.proxy_path)} alt="" draggable={false} className="h-32 w-full shrink-0 rounded-lg bg-black/10 object-cover sm:h-20 sm:w-28" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">Original file</span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-zinc-400">Full-quality {asset.type} · {readableSize(asset.size_bytes)}</span>
                  <span className="mt-1 block text-xs text-gray-400 dark:text-zinc-600">Available only to the creator and purchasers</span>
                </span>
                <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Eye className="h-4 w-4" /> View original</span>
              </button>
            )}

            <dl className="mt-6 grid gap-3 border-t border-gray-200 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
              <Metadata icon={Calendar} label="Published" value={formatDate(asset.created_at)} />
              <Metadata icon={Ruler} label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"} />
              <Metadata icon={Clock3} label="Duration" value={readableDuration(asset.duration_seconds)} />
              <Metadata icon={MessageSquare} label="File size" value={readableSize(asset.size_bytes)} />
            </dl>
          </div>
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-dark-surface">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Comments</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Join the conversation about this asset.</p></div><span className="text-xs text-gray-500 dark:text-zinc-500">{comments.length}</span></div>
            <form onSubmit={postComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={2} placeholder="Write a comment..." className="min-h-20 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-dark-base dark:text-white" />
              <button type="submit" disabled={posting || !comment.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{posting && <Loader2 className="h-4 w-4 animate-spin" />} Post</button>
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
                        <textarea value={editingComment} onChange={(event) => setEditingComment(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-dark-base" />
                        <div className="mt-2 flex gap-2"><button type="button" onClick={() => void saveComment(item)} disabled={savingComment || !editingComment.trim()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button><button type="button" onClick={() => setEditingCommentId(null)} disabled={savingComment} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">Cancel</button></div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-zinc-300">{item.comment}</p>
                    )}

                    <button type="button" onClick={() => { setReplyingToCommentId((current) => current === item.asset_comment_id ? null : item.asset_comment_id); setReplyText(""); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-blue-300">
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
                                  <textarea value={editingReply} onChange={(event) => setEditingReply(event.target.value)} maxLength={2000} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-white/10 dark:bg-dark-base" />
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
                        <textarea autoFocus value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={2000} rows={2} placeholder={`Reply to ${item.author_name}…`} className="min-h-16 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-dark-base" />
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

          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-dark-surface">
            <h2 className="font-bold">Reviews</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-zinc-400">Ratings are not available for library assets yet.</p>
            <p className="mt-2 text-xs leading-5 text-gray-400 dark:text-zinc-600">You can still share feedback with the creator in comments.</p>
          </aside>
        </div>
      </main>

      <AssetEditorModal open={editorOpen} asset={asset} onClose={() => setEditorOpen(false)} onSaved={(updated) => { setAsset(updated); setEditorOpen(false); showSuccessToast("Asset updated."); }} />
      {!asset.is_owner && <AssetPurchaseModal open={purchaseOpen} asset={asset} onClose={() => setPurchaseOpen(false)} onPurchased={handlePurchased} />}
      <AssetOriginalModal open={originalOpen} asset={asset} onClose={() => setOriginalOpen(false)} />
      <ConfirmationModal isOpen={deleteDialogOpen} title={deleteDialogTitle} message={deleteDialogMessage} confirmText={deleting ? "Deleting..." : "Delete"} cancelText="Cancel" onConfirm={() => void deleteSelected()} onCancel={() => { if (!deleting) { setAssetToDelete(false); setCommentToDelete(null); setReplyToDelete(null); } }} />
    </div>
  );
}

function Metadata({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.025]"><Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" /><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">{label}</dt><dd className="mt-0.5 truncate font-medium text-gray-800 dark:text-zinc-200">{value}</dd></div></div>;
}
