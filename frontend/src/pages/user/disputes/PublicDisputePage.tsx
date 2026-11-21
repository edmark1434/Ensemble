import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CornerUpLeft,
  Link2,
  Loader2,
  Lock,
  LogIn,
  MessagesSquare,
  PanelRight,
  Send,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import toast from "react-hot-toast";
import useGlobalState from "@/lib/global_state";
import UserHeader from "@/components/nav/user_header";
import {
  Card,
  DisputeAttachments,
  DisputeDecisionCard,
  StatusPill,
  VisibilityPill,
  formatWhen,
  isClosedStatus,
  isDisputeDecision,
  parseDisputeRuling,
  titleCase,
} from "./disputeUi";
import type { DisputeAttachment, ViewerRole } from "./disputeUi";
import {
  CasePanel,
  CaseProgress,
  DayDivider,
  THREAD_FILTERS,
  ThreadMessage,
  VersusParties,
  When,
  dayKey,
  dayLabel,
  messageCategory,
  quoteSnippet,
  relativeTime,
} from "./publicDisputeParts";
import type { Discussion, DiscussionMessage, ThreadFilter } from "./publicDisputeParts";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import { ChatImagePreview } from "@/components/ui/inbox/inbox_functions/chat_image_preview";

const MAX_LENGTH = 2000;
/** Replies by the same author this close together fold under one header. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

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

/** Add the mention links a live or saved message brought with it. */
function withMentions(current: Discussion, extra?: Record<string, string> | null): Discussion {
  if (!extra || !Object.keys(extra).length) return current;
  return { ...current, mentions: { ...(current.mentions || {}), ...extra } };
}

function sameAuthor(a: DiscussionMessage, b: DiscussionMessage) {
  if (a.senderAccountId && b.senderAccountId) return String(a.senderAccountId) === String(b.senderAccountId);
  return (a.authorName || "") === (b.authorName || "") && (a.authorRole || "") === (b.authorRole || "");
}

function closeInTime(a?: string | null, b?: string | null) {
  const first = a ? new Date(a).getTime() : NaN;
  const second = b ? new Date(b).getTime() : NaN;
  if (Number.isNaN(first) || Number.isNaN(second)) return false;
  return Math.abs(second - first) <= GROUP_WINDOW_MS;
}

/** Bring a message into view and flash a ring around it. */
function highlight(node: HTMLElement) {
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("ring-2", "ring-gray-400", "dark:ring-white/30");
  window.setTimeout(() => {
    node.classList.remove("ring-2", "ring-gray-400", "dark:ring-white/30");
  }, 1400);
}

function LoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 animate-pulse">
      <div className="h-36 shrink-0 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
        <div className="hidden flex-col gap-3 lg:flex">
          <div className="h-28 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
          <div className="h-40 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
        </div>
      </div>
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
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [live, setLive] = useState(socket.connected);
  const [copied, setCopied] = useState(false);
  // Re-render once a minute so "5m ago" stays true while the page is open.
  const [, setClock] = useState(0);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  /** True while the reader is parked at the foot of the thread. */
  const atBottomRef = useRef(true);
  /** Set when the reader's own action should pull the view down. */
  const followRef = useRef(false);
  const lastCountRef = useRef(0);
  /** Messages present on first load don't animate in; anything after does. */
  const initialIdsRef = useRef<Set<string> | null>(null);
  const { mediaList, fileInputRef, openFilePicker, handleFileChange, removeMedia, clearMedia } =
    useInboxUploadMedia(4, 100);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    initialIdsRef.current = null;
    api.get(`/api/accounts/disputes/${id}`)
      .then((res) => {
        if (cancelled) return;
        const data: Discussion | null = res.data?.data || null;
        initialIdsRef.current = new Set((data?.messages || []).map((message) => String(message.id)));
        setDiscussion(data);
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
    const timer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;

    const onLive = (payload: {
      id?: string;
      _id?: string;
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
      authorAvatar?: string | null;
      mentions?: Record<string, string>;
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
          ...withMentions(current, payload.mentions),
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
            senderAccountId: senderId ?? existing?.senderAccountId ?? null,
            authorAvatar: payload.authorAvatar ?? existing?.authorAvatar ?? null,
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
    // Guests cannot open the (signed-in) socket, and a dropped connection misses events:
    // while there is no live connection, read the case back every few seconds instead.
    const POLL_MS = 15_000;
    const pollTimer = window.setInterval(() => {
      if (socket.connected || document.visibilityState !== "visible") return;
      refetch();
    }, POLL_MS);
    // Anything posted while the connection was down is read back on reconnect.
    let dropped = false;
    const onConnect = () => {
      join();
      setLive(true);
      if (dropped) {
        dropped = false;
        refetch();
      }
    };
    const onDisconnect = () => {
      dropped = true;
      setLive(false);
    };

    if (!socket.connected) socket.connect();
    join();
    setLive(socket.connected);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("disputeMessage", onLive);
    socket.on("disputeMessageUpdated", onLive);
    socket.on("disputeVisibilityChanged", onVisibility);
    socket.on("disputeUpdated", onState);
    return () => {
      window.clearTimeout(refetchTimer);
      window.clearInterval(pollTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
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
    setFilter("all");
    setPanelOpen(false);
    if (threadRef.current) threadRef.current.scrollTop = 0;
  }, [id]);

  // The case panel drawer (phones and tablets) closes on Escape.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // The composer grows with its text, up to a cap, then scrolls.
  useLayoutEffect(() => {
    const field = composerRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 168)}px`;
  }, [comment, discussion?.canComment]);

  const jumpToLatest = () => {
    setNewReplies(0);
    const pane = threadRef.current;
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  };

  const messages = useMemo(() => discussion?.messages || [], [discussion?.messages]);
  const messageById = useMemo(
    () => new Map(messages.map((item) => [String(item.id), item])),
    [messages]
  );

  const derived = useMemo(() => {
    const counts: Record<ThreadFilter, number> = { all: messages.length, rulings: 0, parties: 0, community: 0 };
    const people = new Set<string>();
    let latestRuling: DiscussionMessage | undefined;
    let latestCaseRuling: DiscussionMessage | undefined;
    for (const message of messages) {
      const category = messageCategory(message);
      counts[category] += 1;
      if (category === "rulings") {
        const kind = parseDisputeRuling(message.body).kind;
        // Notices (filing summary, "now public" invite) decide nothing, so they are not the latest ruling.
        if (kind !== "notice") latestRuling = message;
        if (kind === "decision" || kind === "reopen") latestCaseRuling = message;
      } else {
        people.add(String(message.senderAccountId || `${message.authorName}|${message.authorRole}`));
      }
    }
    return {
      counts,
      latestRuling,
      reopened: Boolean(
        latestCaseRuling && parseDisputeRuling(latestCaseRuling.body).kind === "reopen"
      ),
      stats: { replies: messages.length - counts.rulings, rulings: counts.rulings, participants: people.size },
    };
  }, [messages]);

  const visibleMessages = useMemo(
    () => (filter === "all" ? messages : messages.filter((message) => messageCategory(message) === filter)),
    [messages, filter]
  );

  const sendComment = async () => {
    const text = comment.trim();
    const pendingFiles = mediaList;
    if (!id || sending || (!text && !pendingFiles.length)) return;
    const pendingId = `pending-${Date.now()}`;
    const parentId = replyToId;
    // Party and community replies stay private to author + staff until staff publishes.
    const heldForReview = !(discussion?.isParty);
    // The reader's own picture for the reply shown while it sends.
    const myAvatar =
      discussion?.viewerRole === "disputer"
        ? discussion.initiator?.avatar
        : discussion?.viewerRole === "disputee"
          ? discussion.respondent?.avatar
          : (discussion?.messages || []).find(
              (item) =>
                viewerAccountId &&
                item.authorAvatar &&
                String(item.senderAccountId) === String(viewerAccountId)
            )?.authorAvatar;
    followRef.current = true;
    // Show the reader's own reply even if they were filtering to rulings.
    setFilter("all");
    setDiscussion((current) =>
      current
        ? {
            ...current,
            messages: [
              ...(current.messages || []),
              {
                id: pendingId,
                authorName: "You",
                authorRole: current.isParty ? current.viewerRole || undefined : "community",
                body: text,
                createdAt: new Date().toISOString(),
                audience: "author_and_staff",
                pendingReview: heldForReview,
                replyToId: parentId,
                senderAccountId: viewerAccountId ? String(viewerAccountId) : null,
                authorAvatar: myAvatar || null,
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
      const saved = res.data?.data?.message as
        | (DiscussionMessage & { mentions?: Record<string, string> })
        | undefined;
      const nextChatId = res.data?.data?.chatId;
      const savedAudience = String(saved?.audience || "author_and_staff").toLowerCase();
      const savedPending =
        res.data?.data?.pendingReview ?? !["parties", "public"].includes(savedAudience);
      // The pending copy already animated in; the saved one replaces it in place.
      if (saved?.id) initialIdsRef.current?.add(String(saved.id));
      setDiscussion((current) => {
        if (!current) return current;
        const withoutPending = (current.messages || []).filter((item) => String(item.id) !== pendingId);
        return {
          ...withMentions(current, saved?.mentions),
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
                senderAccountId:
                  saved.senderAccountId ?? (viewerAccountId ? String(viewerAccountId) : null),
                authorAvatar: saved.authorAvatar ?? myAvatar ?? null,
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
  const replyingTo = replyToId ? messageById.get(String(replyToId)) : undefined;

  /** Scroll to a message, clearing a filter that hides it first. */
  const jumpToMessage = useCallback(
    (messageId: string) => {
      const target = messageById.get(String(messageId));
      const node = document.getElementById(`dispute-message-${messageId}`);
      if (node) {
        highlight(node);
        return;
      }
      if (!target) return;
      setFilter("all");
      window.setTimeout(() => {
        const shown = document.getElementById(`dispute-message-${messageId}`);
        if (shown) highlight(shown);
      }, 80);
    },
    [messageById]
  );

  const openRuling = (messageId: string) => {
    setPanelOpen(false);
    jumpToMessage(messageId);
  };

  const startReply = (messageId: string) => {
    setReplyToId(String(messageId));
    composerRef.current?.focus();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const nearLimit = comment.length > MAX_LENGTH * 0.9;
  const activeFilter = THREAD_FILTERS.find((item) => item.key === filter) || THREAD_FILTERS[0];
  const casePanelProps = discussion
    ? {
        discussion,
        signedIn: Boolean(isAuthenticated),
        reopened: derived.reopened,
        latestRuling: derived.latestRuling,
        stats: derived.stats,
        onOpenRuling: openRuling,
        onPreview: (url: string) => setPreviewUrl(url),
      }
    : null;

  return (
    /* The page itself never grows: only the thread scrolls, so a 300-reply case is
       the same height as a 3-reply one. */
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Dispute" />
      <main className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col gap-3 px-3 pb-3 pt-3 text-gray-900 sm:px-4 sm:pb-4 lg:px-6 dark:text-white">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          {discussion ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 lg:hidden dark:border-white/10 dark:bg-dark-surface dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
              >
                <PanelRight className="h-3.5 w-3.5" />
                Case info
              </button>
            </div>
          ) : null}
        </div>

        {loading ? <LoadingState /> : null}

        {!loading && error ? (
          <div className="flex flex-1 items-start justify-center pt-6 sm:pt-12">
            <Card className="w-full max-w-md px-6 py-10 text-center animate-[console-pop_0.3s_ease-out_backwards] motion-reduce:animate-none">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                <Lock className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
              </span>
              <p className="mt-4 text-base font-bold">This discussion isn’t available</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{error}</p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  Go back
                </button>
                <Link
                  to="/home"
                  className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                >
                  Back home
                </Link>
              </div>
            </Card>
          </div>
        ) : null}

        {!loading && discussion && casePanelProps ? (
          <>
            {/* Case header */}
            <Card className="shrink-0 p-4 animate-[console-rise_0.3s_ease-out_backwards] motion-reduce:animate-none sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-zinc-200">
                      {discussion.number || "Dispute"}
                    </span>
                    <span className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-white/10 dark:text-zinc-400">
                      {titleCase(discussion.type, "Contract")} dispute
                    </span>
                    <VisibilityPill isPublic />
                    <StatusPill status={discussion.status} />
                  </div>
                  <h1 className="mt-2 line-clamp-2 text-lg font-bold leading-snug sm:text-2xl">
                    {discussion.title || "Dispute"}
                  </h1>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    {discussion.createdAt ? (
                      <span>
                        Filed <When value={discussion.createdAt} />
                      </span>
                    ) : null}
                    {discussion.updatedAt ? (
                      <>
                        <span className="text-gray-300 dark:text-zinc-600">•</span>
                        <span>
                          Updated <When value={discussion.updatedAt} />
                        </span>
                      </>
                    ) : null}
                    <span className="text-gray-300 dark:text-zinc-600">•</span>
                    <span>
                      {derived.stats.replies} {derived.stats.replies === 1 ? "reply" : "replies"}
                    </span>
                  </p>
                  <p className="mt-2 truncate text-xs font-medium text-gray-600 sm:hidden dark:text-zinc-300">
                    {discussion.initiator?.name || "Disputer"}
                    <span className="mx-1.5 text-gray-400 dark:text-zinc-500">vs</span>
                    {discussion.respondent?.name || "Disputee"}
                  </p>
                </div>
                <VersusParties discussion={discussion} className="hidden sm:grid lg:w-[440px] lg:shrink-0" />
              </div>
              {/* Tablets only: phones get it in the drawer, desktops in the case column. */}
              <div className="mt-4 hidden border-t border-gray-100 pt-4 md:block lg:hidden dark:border-white/5">
                <CaseProgress discussion={discussion} reopened={derived.reopened} />
              </div>
            </Card>

            <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Discussion */}
              <Card className="relative flex min-h-0 flex-col overflow-hidden animate-[console-rise_0.35s_ease-out_backwards] [animation-delay:60ms] motion-reduce:animate-none">
                <div className="shrink-0 border-b border-gray-100 px-3 pt-3 sm:px-4 dark:border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-bold">
                      <MessagesSquare className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      Discussion
                      <span
                        title={
                          live
                            ? "Updates arrive as they happen"
                            : isAuthenticated
                              ? "Reconnecting… updates will catch up"
                              : "New replies load every few seconds"
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          live
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-400"
                        }`}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {live ? (
                            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
                          ) : null}
                          <span className={`relative h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} />
                        </span>
                        {live ? "Live" : isAuthenticated ? "Reconnecting" : "Auto-updating"}
                      </span>
                    </h2>
                    {messages.length > 4 ? (
                      <button
                        type="button"
                        onClick={jumpToLatest}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        <ArrowDown className="h-3 w-3" />
                        <span className="hidden sm:inline">Latest</span>
                      </button>
                    ) : null}
                  </div>
                  <div role="tablist" aria-label="Filter the discussion" className="-mb-px mt-2 flex gap-1 overflow-x-auto scroll-thin">
                    {THREAD_FILTERS.map((item) => {
                      const active = filter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setFilter(item.key)}
                          className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-xs font-semibold transition ${
                            active
                              ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          {item.label}
                          <span
                            className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                              active
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-400"
                            }`}
                          >
                            {derived.counts[item.key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col">
                <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto pb-3 custom-scrollbar">
                  {visibleMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                        <MessagesSquare className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-zinc-200">{activeFilter.empty}</p>
                      {filter === "all" && discussion.canComment ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Start the discussion below.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div key={filter} className="animate-[console-fade_0.25s_ease-out_backwards] motion-reduce:animate-none">
                      {visibleMessages.map((message, index) => {
                        const previous = index > 0 ? visibleMessages[index - 1] : undefined;
                        const showDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
                        const pending = String(message.id).startsWith("pending-");
                        const decision = isDisputeDecision(message);
                        const animate = Boolean(
                          initialIdsRef.current && !initialIdsRef.current.has(String(message.id))
                        );
                        const divider = showDay ? <DayDivider label={dayLabel(message.createdAt)} /> : null;

                        if (decision) {
                          return (
                            <div key={message.id}>
                              {divider}
                              <div
                                id={`dispute-message-${message.id}`}
                                className={`scroll-mt-4 rounded-2xl px-3 py-3 transition sm:px-4 ${pending ? "opacity-60" : ""} ${
                                  animate ? "animate-[console-rise_0.35s_ease-out_backwards] motion-reduce:animate-none" : ""
                                }`}
                              >
                                <DisputeDecisionCard
                                  body={message.body}
                                  when={pending ? "Sending…" : formatWhen(message.createdAt)}
                                  mentions={discussion.mentions}
                                >
                                  <DisputeAttachments
                                    attachments={message.attachments}
                                    onPreview={(url) => setPreviewUrl(url)}
                                  />
                                </DisputeDecisionCard>
                              </div>
                            </div>
                          );
                        }

                        const continued = Boolean(
                          previous &&
                            !showDay &&
                            !isDisputeDecision(previous) &&
                            sameAuthor(previous, message) &&
                            Boolean(previous.pendingReview) === Boolean(message.pendingReview) &&
                            (previous.audience || "") === (message.audience || "") &&
                            closeInTime(previous.createdAt, message.createdAt)
                        );
                        const mine =
                          pending ||
                          Boolean(
                            viewerAccountId &&
                              message.senderAccountId &&
                              String(message.senderAccountId) === String(viewerAccountId)
                          );
                        const parent = message.replyToId
                          ? messageById.get(String(message.replyToId))
                          : undefined;

                        return (
                          <div key={message.id}>
                            {divider}
                            <ThreadMessage
                              message={message}
                              parent={parent}
                              continued={continued}
                              mine={mine}
                              pending={pending}
                              viewerRole={discussion.viewerRole}
                              mentions={discussion.mentions}
                              canReply={Boolean(discussion.canComment)}
                              animate={animate}
                              onReply={() => startReply(String(message.id))}
                              onJumpToParent={parent ? () => jumpToMessage(String(parent.id)) : undefined}
                              onPreview={(url) => setPreviewUrl(url)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {newReplies > 0 ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={jumpToLatest}
                      className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-gray-800 animate-[console-pop_0.25s_ease-out_backwards] motion-reduce:animate-none dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      {newReplies} new {newReplies === 1 ? "reply" : "replies"}
                    </button>
                  </div>
                ) : null}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-gray-100 p-3 sm:p-4 dark:border-white/5">
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                      <div>
                        <p className="text-sm font-semibold">Join the discussion</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          Sign in to add context. Staff review community replies before they appear.
                        </p>
                      </div>
                      <Link
                        to="/login"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Sign in
                      </Link>
                    </div>
                  ) : discussion.canComment ? (
                    <div>
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition focus-within:border-gray-400 focus-within:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:focus-within:border-white/25 dark:focus-within:bg-white/[0.05]">
                        {replyToId ? (
                          <div className="flex items-start gap-2 border-b border-gray-200 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-gray-600 dark:text-zinc-300">
                                Replying to {replyingTo?.authorName || "a message"}
                              </p>
                              <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400">
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
                          <div className="border-b border-gray-200 dark:border-white/10">
                            <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />
                          </div>
                        ) : null}
                        <textarea
                          ref={composerRef}
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          onKeyDown={(event) => {
                            // Enter sends; Shift+Enter adds a line. Never mid-IME composition.
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              void sendComment();
                            }
                            if (event.key === "Escape" && replyToId) {
                              event.preventDefault();
                              setReplyToId(null);
                            }
                          }}
                          maxLength={MAX_LENGTH}
                          rows={1}
                          aria-label="Write a reply"
                          placeholder={
                            replyToId
                              ? `Reply to ${replyingTo?.authorName || "this message"}…`
                              : discussion.isParty
                                ? "Add to your case…"
                                : "Add context to this discussion…"
                          }
                          className="block max-h-[168px] min-h-[44px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
                          <div className="flex items-center gap-1">
                            <InboxUploadMediaButton
                              fileInputRef={fileInputRef}
                              onFileChange={handleFileChange}
                              onClick={openFilePicker}
                              disabled={sending || mediaList.length >= 4}
                              title="Attach images or files (max 4)"
                            />
                            <span className="hidden text-[11px] text-gray-400 md:inline dark:text-zinc-500">
                              <kbd className="rounded border border-gray-200 px-1 font-sans text-[10px] dark:border-white/10">Enter</kbd>
                              {" to send · "}
                              <kbd className="rounded border border-gray-200 px-1 font-sans text-[10px] dark:border-white/10">Shift</kbd>
                              {" + "}
                              <kbd className="rounded border border-gray-200 px-1 font-sans text-[10px] dark:border-white/10">Enter</kbd>
                              {" new line"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {comment.length ? (
                              <span
                                className={`text-[11px] tabular-nums ${
                                  nearLimit ? "font-semibold text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-zinc-500"
                                }`}
                              >
                                {comment.length}/{MAX_LENGTH}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void sendComment()}
                              disabled={sending || (!comment.trim() && !mediaList.length)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                            >
                              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">{sending ? "Sending" : "Post reply"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-zinc-500">
                        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                        {discussion.isParty
                          ? "Only you and staff see your reply until staff make it visible to the other party or the public."
                          : "You’re not part of this dispute, so only you and staff see your reply until staff make it public."}
                      </p>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-white/[0.03] dark:text-zinc-400">
                      <Lock className="h-4 w-4 shrink-0" />
                      {closed
                        ? `This dispute is closed${
                            discussion.resolvedAt ? ` (${relativeTime(discussion.resolvedAt)})` : ""
                          }. The discussion is read-only.`
                        : "You can’t reply to this dispute right now."}
                    </p>
                  )}
                </div>
              </Card>

              {/* Case panel: a column beside the thread on wide screens */}
              <aside className="hidden min-h-0 overflow-y-auto pb-1 pr-0.5 custom-scrollbar animate-[console-rise_0.35s_ease-out_backwards] [animation-delay:120ms] motion-reduce:animate-none lg:block">
                <CasePanel {...casePanelProps} showProgress />
              </aside>
            </div>

            {/* Case panel: a drawer on phones and tablets */}
            {panelOpen ? (
              <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Case information">
                <button
                  type="button"
                  aria-label="Close case information"
                  onClick={() => setPanelOpen(false)}
                  className="absolute inset-0 bg-black/50 animate-[console-fade_0.2s_ease-out_backwards] motion-reduce:animate-none"
                />
                <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-gray-50 shadow-2xl animate-[slideInFromRight_0.25s_ease-out_backwards] motion-reduce:animate-none dark:bg-dark-base">
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">Case information</p>
                      <p className="truncate text-xs text-gray-500 dark:text-zinc-400">{discussion.number || discussion.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      aria-label="Close"
                      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <CasePanel {...casePanelProps} showProgress showParties />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
      <ChatImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
