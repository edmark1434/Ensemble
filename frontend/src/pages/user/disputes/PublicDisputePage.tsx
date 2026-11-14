import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  Loader2,
  Lock,
  MessagesSquare,
  Send,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";
import UserHeader from "@/components/nav/user_header";
import {
  AudiencePill,
  Avatar,
  Card,
  DisputeAttachments,
  DisputeDecisionCard,
  DisputeSettlementCard,
  RoleChip,
  StatusPill,
  VisibilityPill,
  audienceNotice,
  formatWhen,
  isClosedStatus,
  isDisputeDecision,
  titleCase,
} from "./disputeUi";
import type { DisputeAttachment, DisputeSettlement, ViewerRole } from "./disputeUi";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import { ChatImagePreview } from "@/components/ui/inbox/inbox_functions/chat_image_preview";

type DiscussionMessage = {
  id: string;
  authorName?: string;
  authorRole?: string | null;
  body?: string;
  createdAt?: string | null;
  audience?: string;
  pendingReview?: boolean;
  replyToId?: string | null;
  authorType?: string | null;
  attachments?: DisputeAttachment[];
};

type DiscussionPerson = {
  accountId?: string | null;
  name?: string;
  handle?: string | null;
};

type Discussion = {
  id: string;
  number?: string | null;
  title?: string;
  type?: string;
  status?: string;
  description?: string | null;
  initiator?: DiscussionPerson;
  respondent?: DiscussionPerson;
  isParty?: boolean;
  viewerRole?: ViewerRole;
  canComment?: boolean;
  commentsNeedApproval?: boolean;
  /** Parties only: who receives what from the ruling, and when. */
  settlement?: DisputeSettlement | null;
  chatId?: string | null;
  messages: DiscussionMessage[];
};

const MAX_LENGTH = 2000;

function quoteSnippet(body?: string, limit = 160) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** The quoted message as shown above a reply. Null when the viewer can't see the parent. */
function QuotedMessage({
  parent,
  onJump,
}: {
  parent?: DiscussionMessage;
  onJump?: () => void;
}) {
  if (!parent) {
    return (
      <p className="mb-2 flex items-center gap-1.5 rounded-lg border-l-2 border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] italic text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
        <CornerUpLeft className="h-3 w-3 shrink-0" />
        Replying to a message you can’t see
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onJump}
      className="mb-2 block w-full rounded-lg border-l-2 border-gray-300 bg-gray-50 px-2.5 py-1.5 text-left transition hover:bg-gray-100 dark:border-white/20 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-zinc-300">
        <CornerUpLeft className="h-3 w-3 shrink-0" />
        {parent.authorName || "Member"}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-zinc-400">
        {quoteSnippet(parent.body)}
      </span>
    </button>
  );
}

/**
 * Mirrors the backend audience rules so a live message lands with the right people.
 * A staff reply aimed at one party must reach that party and nobody else.
 */
function canViewerSeeAudience(
  audience: string,
  viewerRole: ViewerRole,
  { senderId, viewerAccountId }: { senderId?: string | null; viewerAccountId?: string | null }
) {
  if (audience === "public") return true;
  if (audience === "parties") return viewerRole === "disputer" || viewerRole === "disputee";
  if (audience === "disputer") return viewerRole === "disputer";
  if (audience === "disputee") return viewerRole === "disputee";
  if (audience === "author_and_staff") {
    return Boolean(viewerAccountId && senderId && String(senderId) === String(viewerAccountId));
  }
  return false;
}

function upsertDiscussionMessage(list: DiscussionMessage[], next: DiscussionMessage) {
  const idx = list.findIndex((item) => String(item.id) === String(next.id));
  if (idx === -1) return [...list, next];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function PartyCard({ role, person }: { role: "disputer" | "disputee"; person?: DiscussionPerson }) {
  const name = person?.name || "Unknown";
  const content = (
    <>
      <Avatar name={name} role={role} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
        <span className="block truncate text-xs text-gray-500 dark:text-zinc-400">
          {person?.handle ? `@${person.handle} · ` : ""}
          {role === "disputer" ? "Filed the dispute" : "Named in the dispute"}
        </span>
      </span>
    </>
  );
  const className =
    "flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10";
  if (!person?.accountId) return <div className={className}>{content}</div>;
  return (
    <Link
      to={`/profile/${person.accountId}`}
      className={`${className} transition hover:border-gray-300 hover:bg-gray-50 dark:hover:border-white/20 dark:hover:bg-white/[0.03]`}
    >
      {content}
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-44 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
      <div className="h-64 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
    </div>
  );
}

export default function PublicDisputePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const viewerAccountId = useGlobalState(
    (state) => state.user?.account_id ?? state.user?.accountId ?? null
  );
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newReplies, setNewReplies] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  /** True while the reader is parked at the foot of the thread. */
  const atBottomRef = useRef(true);
  /** Set when the reader's own action should pull the view down. */
  const followRef = useRef(false);
  const lastCountRef = useRef(0);
  const { mediaList, fileInputRef, openFilePicker, handleFileChange, removeMedia, clearMedia } =
    useInboxUploadMedia(4, 100);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/api/accounts/disputes/${id}`)
      .then((res) => {
        if (!cancelled) setDiscussion(res.data?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.response?.data?.message || "This dispute is not available.";
        setError(message);
        setDiscussion(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const onLive = (payload: {
      id?: string;
      _id?: string;
      conversationId?: string;
      conversation_id?: string;
      disputeId?: string;
      authorName?: string;
      author_name?: string;
      authorRole?: string;
      author_role?: string;
      body?: string;
      message_content?: string;
      createdAt?: string;
      created_at?: string;
      audience?: string;
      senderAccountId?: string | null;
      sender_id?: string | null;
      replyToId?: string | null;
      message_id_reply?: string | null;
      authorType?: string | null;
      author_type?: string | null;
      attachments?: DisputeAttachment[];
    }) => {
      if (!payload?.disputeId || String(payload.disputeId) !== String(id)) return;
      const messageId = payload?.id || payload?._id;
      if (!messageId) return;
      const audience = String(payload.audience || "").toLowerCase();
      if (!audience) return;
      const senderId = payload.senderAccountId ?? payload.sender_id ?? null;
      setDiscussion((current) => {
        if (!current) return current;
        const visible = canViewerSeeAudience(audience, current.viewerRole, {
          senderId,
          viewerAccountId,
        });
        if (!visible) {
          // Either it was never for this viewer, or staff narrowed its audience.
          return {
            ...current,
            messages: (current.messages || []).filter((item) => String(item.id) !== String(messageId)),
          };
        }
        const existing = (current.messages || []).find(
          (item) => String(item.id) === String(messageId)
        );
        if (!existing && !(payload.body || payload.message_content)) return current;
        return {
          ...current,
          messages: upsertDiscussionMessage(current.messages || [], {
            id: String(messageId),
            authorName: payload.authorName || payload.author_name || existing?.authorName || "Member",
            authorRole:
              payload.authorRole || payload.author_role || existing?.authorRole || null,
            body: payload.body || payload.message_content || existing?.body || "",
            createdAt:
              payload.createdAt || payload.created_at || existing?.createdAt || new Date().toISOString(),
            audience: payload.audience,
            pendingReview:
              audience === "author_and_staff" &&
              String(
                payload.authorRole || payload.author_role || existing?.authorRole || ""
              ).toLowerCase() === "community",
            replyToId:
              payload.replyToId ?? payload.message_id_reply ?? existing?.replyToId ?? null,
            authorType: payload.authorType ?? payload.author_type ?? existing?.authorType ?? null,
            attachments: payload.attachments ?? existing?.attachments ?? [],
          }),
        };
      });
    };

    const onVisibility = (payload: { disputeId?: string; visibility?: boolean }) => {
      if (String(payload?.disputeId || "") !== String(id) || payload?.visibility !== false) return;
      setDiscussion(null);
      setError("Staff made this dispute private. The public discussion is no longer available.");
    };

    // The case moved under us — resolved, reopened, parties swapped, a ruling or payout.
    // Patch the status at once, then read the case back: a swap changes who is the disputer
    // (and so which replies this reader may see), and a ruling adds the settlement card.
    let refetchTimer: number | undefined;
    const refetch = () => {
      api
        .get(`/api/accounts/disputes/${id}`)
        .then((res) => {
          if (res.data?.data) setDiscussion(res.data.data);
        })
        .catch((err) => {
          if (err?.response?.status === 404) {
            setDiscussion(null);
            setError("Staff made this dispute private. The public discussion is no longer available.");
          }
        });
    };
    const onState = (payload: {
      disputeId?: string;
      status?: string;
      visibility?: boolean;
      closed?: boolean;
    }) => {
      if (!payload?.disputeId || String(payload.disputeId) !== String(id)) return;
      if (payload.visibility === false) {
        onVisibility(payload);
        return;
      }
      setDiscussion((current) => {
        if (!current) return current;
        const status = String(payload.status || current.status || "").toLowerCase();
        const closed = payload.closed ?? status === "closed";
        return {
          ...current,
          status,
          // A closed dispute is read-only for everyone.
          canComment: closed ? false : current.canComment,
        };
      });
      window.clearTimeout(refetchTimer);
      refetchTimer = window.setTimeout(refetch, 250);
    };

    const join = () => socket.emit("joinDisputeDiscussion", { disputeId: String(id) });

    if (!socket.connected) socket.connect();
    join();
    socket.on("connect", join);
    socket.on("disputeMessage", onLive);
    socket.on("disputeMessageUpdated", onLive);
    socket.on("disputeVisibilityChanged", onVisibility);
    socket.on("disputeUpdated", onState);
    return () => {
      window.clearTimeout(refetchTimer);
      socket.off("connect", join);
      socket.off("disputeMessage", onLive);
      socket.off("disputeMessageUpdated", onLive);
      socket.off("disputeVisibilityChanged", onVisibility);
      socket.off("disputeUpdated", onState);
      socket.emit("leaveDisputeDiscussion", { disputeId: String(id) });
    };
  }, [id, viewerAccountId]);

  // Track whether the reader is at the foot of the thread pane, so arriving replies
  // never yank them away from what they were reading.
  useEffect(() => {
    const pane = threadRef.current;
    if (!pane) return;
    const onScroll = () => {
      const atBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80;
      atBottomRef.current = atBottom;
      if (atBottom) setNewReplies(0);
    };
    onScroll();
    pane.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      pane.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [loading, discussion?.id]);

  /**
   * A public dispute is read from the top, so the first load never auto-scrolls.
   * After that, follow new replies only when the reader is already at the foot or
   * just posted; otherwise offer a "new replies" jump instead of moving the page.
   */
  useEffect(() => {
    const count = discussion?.messages?.length ?? 0;
    const previous = lastCountRef.current;
    lastCountRef.current = count;
    if (count === previous) return;
    if (previous === 0) return;
    if (followRef.current || atBottomRef.current) {
      followRef.current = false;
      const pane = threadRef.current;
      if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
      return;
    }
    if (count > previous) setNewReplies((current) => current + (count - previous));
  }, [discussion?.messages?.length]);

  // A different dispute starts fresh at the top of the thread.
  useEffect(() => {
    lastCountRef.current = 0;
    setNewReplies(0);
    followRef.current = false;
    setShowDetails(true);
    if (threadRef.current) threadRef.current.scrollTop = 0;
  }, [id]);

  const jumpToLatest = () => {
    setNewReplies(0);
    const pane = threadRef.current;
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  };

  const sendComment = async () => {
    const text = comment.trim();
    const pendingFiles = mediaList;
    if (!id || sending || (!text && !pendingFiles.length)) return;
    const pendingId = `pending-${Date.now()}`;
    const parentId = replyToId;
    // Party and community replies stay private to author + staff until staff publishes.
    const heldForReview = !(discussion?.isParty);
    followRef.current = true;
    setDiscussion((current) =>
      current
        ? {
            ...current,
            messages: [
              ...(current.messages || []),
              {
                id: pendingId,
                authorName: "You",
                authorRole: current.isParty ? undefined : "community",
                body: text,
                createdAt: new Date().toISOString(),
                audience: "author_and_staff",
                pendingReview: heldForReview,
                replyToId: parentId,
                attachments: pendingFiles.map((media) => ({
                  attachment_id: media.id,
                  attachment_type: media.type,
                  attachment_key: media.previewUrl,
                  attachment_url: media.previewUrl,
                  attachment_name: media.file.name,
                  attachment_size: media.file.size,
                })),
              },
            ],
          }
        : current
    );
    setComment("");
    setReplyToId(null);
    setSending(true);
    try {
      const uploaded = pendingFiles.length
        ? await Promise.all(pendingFiles.map((media) => uploadChatAttachment(media)))
        : [];
      clearMedia();
      const res = await api.post(`/api/accounts/disputes/${id}/messages`, {
        body: text,
        ...(parentId ? { replyToId: parentId } : {}),
        ...(uploaded.length ? { attachments: uploaded } : {}),
      });
      toast.success(res.data?.message || "Comment posted to the discussion.");
      const saved = res.data?.data?.message as DiscussionMessage | undefined;
      const nextChatId = res.data?.data?.chatId;
      const savedAudience = String(saved?.audience || "author_and_staff").toLowerCase();
      const savedPending =
        res.data?.data?.pendingReview ?? !["parties", "public"].includes(savedAudience);
      setDiscussion((current) => {
        if (!current) return current;
        const withoutPending = (current.messages || []).filter((item) => String(item.id) !== pendingId);
        return {
          ...current,
          chatId: nextChatId ? String(nextChatId) : current.chatId,
          messages: saved?.id
            ? upsertDiscussionMessage(withoutPending, {
                id: String(saved.id),
                authorName: saved.authorName || "You",
                authorRole: saved.authorRole || null,
                body: saved.body || text,
                createdAt: saved.createdAt || new Date().toISOString(),
                audience: savedAudience,
                pendingReview: savedPending,
                replyToId: saved.replyToId ?? res.data?.data?.replyToId ?? parentId,
                attachments: saved.attachments || [],
              })
            : withoutPending,
        };
      });
      if (!saved?.id) {
        const refresh = await api.get(`/api/accounts/disputes/${id}`);
        if (refresh.data?.data) setDiscussion(refresh.data.data);
      }
    } catch (err: any) {
      setDiscussion((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).filter((item) => String(item.id) !== pendingId),
            }
          : current
      );
      setComment(text);
      setReplyToId(parentId);
      toast.error(
        err?.response?.data?.message || err?.message || "Could not send that comment."
      );
    } finally {
      setSending(false);
    }
  };

  const closed = isClosedStatus(discussion?.status);
  const messages = discussion?.messages || [];
  const messageById = new Map(messages.map((item) => [String(item.id), item]));
  const replyingTo = replyToId ? messageById.get(String(replyToId)) : undefined;

  const jumpToMessage = (messageId: string) => {
    const node = document.getElementById(`dispute-message-${messageId}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("ring-2", "ring-gray-400", "dark:ring-white/30");
    window.setTimeout(() => {
      node.classList.remove("ring-2", "ring-gray-400", "dark:ring-white/30");
    }, 1200);
  };

  const startReply = (messageId: string) => {
    setReplyToId(String(messageId));
    composerRef.current?.focus();
  };

  return (
    /* The page itself never grows: only the thread scrolls, so a 300-reply case is
       the same height as a 3-reply one. */
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Dispute" />
      <main className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col gap-3 px-4 pb-4 pt-4 text-gray-900 dark:text-white">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
          className="inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {loading ? <LoadingState /> : null}

        {!loading && error ? (
          <Card className="px-6 py-10 text-center">
            <Lock className="mx-auto h-6 w-6 text-gray-400 dark:text-zinc-500" />
            <p className="mt-3 text-sm font-semibold">This discussion isn’t available</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{error}</p>
            <Link
              to="/home"
              className="mt-4 inline-block rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              Back home
            </Link>
          </Card>
        ) : null}

        {!loading && discussion ? (
          <>
            <Card className="shrink-0 space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  {discussion.number || "Dispute"}
                </span>
                <span className="text-gray-300 dark:text-zinc-600">·</span>
                <span className="text-xs text-gray-500 dark:text-zinc-400">{titleCase(discussion.type, "Contract")}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <VisibilityPill isPublic />
                  <StatusPill status={discussion.status} />
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <h1 className="text-lg font-bold leading-snug sm:text-xl">{discussion.title || "Dispute"}</h1>
                <button
                  type="button"
                  onClick={() => setShowDetails((current) => !current)}
                  aria-expanded={showDetails}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showDetails ? "Hide details" : "Details"}
                </button>
              </div>

              {showDetails ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <PartyCard role="disputer" person={discussion.initiator} />
                    <PartyCard role="disputee" person={discussion.respondent} />
                  </div>

                  {discussion.description ? (
                    <div className="max-h-32 overflow-y-auto rounded-xl bg-gray-50 px-4 py-3 custom-scrollbar dark:bg-white/[0.03]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                        Original complaint
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                        {discussion.description}
                      </p>
                    </div>
                  ) : null}

                  {/* Only the two parties receive this; the community never sees the split. */}
                  <DisputeSettlementCard settlement={discussion.settlement} />
                </>
              ) : (
                <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                  {discussion.initiator?.name || "Disputer"} vs {discussion.respondent?.name || "Disputee"}
                </p>
              )}
            </Card>

            <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-white/5">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <MessagesSquare className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  Discussion
                </h2>
                <span className="flex items-center gap-2">
                  {messages.length > 4 ? (
                    <button
                      type="button"
                      onClick={jumpToLatest}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      Jump to latest
                    </button>
                  ) : null}
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {messages.length} {messages.length === 1 ? "reply" : "replies"}
                  </span>
                </span>
              </div>

              <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-zinc-400">
                  No replies yet. {discussion.canComment ? "Start the discussion below." : ""}
                </p>
              ) : (
                <ol className="divide-y divide-gray-100 dark:divide-white/5">
                  {messages.map((message) => {
                    const pending = String(message.id).startsWith("pending-");
                    const heldForReview = Boolean(message.pendingReview);
                    const parent = message.replyToId
                      ? messageById.get(String(message.replyToId))
                      : undefined;
                    const notice = heldForReview
                      ? null
                      : audienceNotice(message.audience, discussion.viewerRole);
                    const decision = isDisputeDecision(message);

                    if (decision) {
                      return (
                        <li
                          key={message.id}
                          id={`dispute-message-${message.id}`}
                          className={`scroll-mt-4 px-4 py-5 ${pending ? "opacity-60" : ""}`}
                        >
                          <DisputeDecisionCard
                            body={message.body}
                            when={pending ? "Sending…" : formatWhen(message.createdAt)}
                          >
                            <DisputeAttachments
                              attachments={message.attachments}
                              onPreview={(url) => setPreviewUrl(url)}
                            />
                          </DisputeDecisionCard>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={message.id}
                        id={`dispute-message-${message.id}`}
                        className={`group flex scroll-mt-4 gap-3 rounded-lg px-5 py-4 transition ${pending ? "opacity-60" : ""} ${
                          heldForReview || notice ? "bg-amber-50/60 dark:bg-amber-500/[0.06]" : ""
                        }`}
                      >
                        <Avatar name={message.authorName} role={message.authorRole} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {message.authorName || "Member"}
                            </span>
                            <RoleChip role={message.authorRole} />
                            {heldForReview ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                <Lock className="h-2.5 w-2.5" />
                                Awaiting staff review
                              </span>
                            ) : null}
                            {notice ? (
                              <AudiencePill audience={message.audience} viewerRole={discussion.viewerRole} />
                            ) : null}
                            <span className="ml-auto text-[11px] text-gray-400 dark:text-zinc-500">
                              {pending ? "Sending…" : formatWhen(message.createdAt)}
                            </span>
                          </div>
                          {heldForReview ? (
                            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/80">
                              Only you and staff can see this reply until a staff member or admin makes it public.
                            </p>
                          ) : null}
                          {notice ? (
                            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/80">{notice.detail}</p>
                          ) : null}
                          <div className="mt-1.5">
                            {message.replyToId ? (
                              <QuotedMessage
                                parent={parent}
                                onJump={parent ? () => jumpToMessage(String(parent.id)) : undefined}
                              />
                            ) : null}
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                              {message.body}
                            </p>
                            <DisputeAttachments
                              attachments={message.attachments}
                              onPreview={(url) => setPreviewUrl(url)}
                            />
                          </div>
                          {discussion.canComment && !pending ? (
                            <button
                              type="button"
                              onClick={() => startReply(String(message.id))}
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 opacity-0 transition hover:text-gray-700 focus:opacity-100 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-white"
                            >
                              <CornerUpLeft className="h-3 w-3" />
                              Reply
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
                <div ref={threadEndRef} className="h-px" />
              </div>

              {newReplies > 0 ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <button
                    type="button"
                    onClick={jumpToLatest}
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    {newReplies} new {newReplies === 1 ? "reply" : "replies"}
                  </button>
                </div>
              ) : null}
            </Card>

            <Card className="shrink-0 p-3">
              {!isAuthenticated ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600 dark:text-zinc-400">Sign in to join this discussion.</p>
                  <Link
                    to="/login"
                    className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                  >
                    Sign in
                  </Link>
                </div>
              ) : discussion.canComment ? (
                <div className="space-y-2">
                  {replyToId ? (
                    <div className="flex items-start gap-2 rounded-xl border-l-2 border-gray-300 bg-gray-50 px-3 py-2 dark:border-white/20 dark:bg-white/[0.04]">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-zinc-300">
                          <CornerUpLeft className="h-3 w-3 shrink-0" />
                          Replying to {replyingTo?.authorName || "a message"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-zinc-400">
                          {replyingTo ? quoteSnippet(replyingTo.body) : "This message is no longer in the thread."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyToId(null)}
                        aria-label="Cancel reply"
                        className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                  {mediaList.length ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                      <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />
                    </div>
                  ) : null}
                  <textarea
                    ref={composerRef}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        void sendComment();
                      }
                      if (event.key === "Escape" && replyToId) {
                        event.preventDefault();
                        setReplyToId(null);
                      }
                    }}
                    maxLength={MAX_LENGTH}
                    rows={2}
                    placeholder={replyToId ? `Reply to ${replyingTo?.authorName || "this message"}…` : "Write a reply…"}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/30"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                      {discussion.isParty
                        ? "Your reply stays private to you and staff until a staff member or admin makes it visible to the other party or the public."
                        : "You’re not part of this dispute, so your reply stays private to you and staff until a staff member or admin makes it public."}
                      <span className="ml-2 tabular-nums text-gray-400 dark:text-zinc-600">
                        {comment.length}/{MAX_LENGTH}
                      </span>
                    </p>
                    <div className="flex items-center gap-1">
                      <InboxUploadMediaButton
                        fileInputRef={fileInputRef}
                        onFileChange={handleFileChange}
                        onClick={openFilePicker}
                        disabled={sending || mediaList.length >= 4}
                        title="Attach images or files (max 4)"
                      />
                      <button
                        type="button"
                        onClick={() => void sendComment()}
                        disabled={sending || (!comment.trim() && !mediaList.length)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                      >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {sending ? "Sending" : "Post reply"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                  <Lock className="h-4 w-4 shrink-0" />
                  {closed
                    ? "This dispute is closed. The discussion is read-only."
                    : "You can’t reply to this dispute right now."}
                </p>
              )}
            </Card>
          </>
        ) : null}
      </main>
      <ChatImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
