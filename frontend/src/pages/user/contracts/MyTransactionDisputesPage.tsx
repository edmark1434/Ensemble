import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, CornerUpLeft, Loader2, Lock, Plus, Send, X } from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import UserHeader from "@/components/nav/user_header";
import toast from "react-hot-toast";
import {
  AudiencePill,
  Avatar,
  Card,
  DECISION_CARD_CLASS,
  DecisionHeader,
  DisputeAttachments,
  RoleChip,
  StatusPill,
  VisibilityPill,
  audienceNotice,
  formatWhen,
  isClosedStatus,
  isDisputeDecision,
} from "@/pages/user/disputes/disputeUi";
import type { DisputeAttachment, ViewerRole } from "@/pages/user/disputes/disputeUi";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import { ChatImagePreview } from "@/components/ui/inbox/inbox_functions/chat_image_preview";

type DisputeMessage = {
  id: string;
  authorName?: string;
  authorType?: string;
  body?: string;
  createdAt?: string | null;
  conversationId?: string;
  replyToId?: string | null;
  audience?: string;
  authorRole?: string | null;
  attachments?: DisputeAttachment[];
};

type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  type?: string;
  status?: string;
  reason?: string;
  visibility?: boolean;
  filedByMe?: boolean;
  viewerRole?: ViewerRole;
  canAddInformation?: boolean;
  updatedAt?: string;
  chatId?: string | null;
};

const MAX_LENGTH = 2000;

function quoteSnippet(body?: string, limit = 140) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function upsertNote(list: DisputeMessage[], next: DisputeMessage) {
  const idx = list.findIndex((item) => String(item.id) === String(next.id));
  if (idx === -1) return [...list, next];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function isTransactionDispute(row: DisputeRow) {
  const type = String(row.type || "").toLowerCase();
  return type === "contract" || type === "transaction";
}

function isOpen(row: DisputeRow) {
  return !isClosedStatus(row.status);
}

function DisputeProgress({ dispute }: { dispute: DisputeRow }) {
  const closed = !isOpen(dispute);
  const isPublic = Boolean(dispute.visibility);
  const steps =
    closed && !isPublic
      ? ["Filed", "Staff review", "Closed"]
      : ["Filed", "Staff review", "Public discussion", "Closed"];
  const current = closed ? steps.length - 1 : isPublic ? 2 : 1;

  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const done = index < current || (closed && index === current);
        const active = index === current && !closed;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                done
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : active
                    ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-300"
                    : "border-gray-300 text-gray-400 dark:border-white/15 dark:text-zinc-500"
              }`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={`truncate text-[11px] ${
                active
                  ? "font-semibold text-gray-900 dark:text-white"
                  : done
                    ? "text-gray-600 dark:text-zinc-300"
                    : "text-gray-400 dark:text-zinc-500"
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className={`h-px min-w-3 flex-1 ${done ? "bg-gray-400 dark:bg-zinc-500" : "bg-gray-200 dark:bg-white/10"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DisputeCard({ dispute }: { dispute: DisputeRow }) {
  const open = isOpen(dispute);
  const publicDiscussion = Boolean(dispute.visibility);
  const [notes, setNotes] = useState<DisputeMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(dispute.chatId || null);
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { mediaList, fileInputRef, openFilePicker, handleFileChange, removeMedia, clearMedia } =
    useInboxUploadMedia(4, 100);
  const [loadingNotes, setLoadingNotes] = useState(Boolean(dispute.canAddInformation));

  useEffect(() => {
    if (!dispute.canAddInformation) return;
    let cancelled = false;
    api.get(`/api/users/disputes/${dispute.id}`)
      .then((res) => {
        if (cancelled) return;
        setNotes(Array.isArray(res.data?.data?.messages) ? res.data.data.messages : []);
        if (res.data?.data?.chatId) setChatId(String(res.data.data.chatId));
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispute.canAddInformation, dispute.id]);

  useEffect(() => {
    if (!chatId || !dispute.canAddInformation) return;

    const onLive = (payload: DisputeMessage & {
      conversation_id?: string;
      _id?: string;
      author_name?: string;
      author_type?: string;
      message_content?: string;
      created_at?: string;
      audience?: string;
      message_id_reply?: string | null;
      author_role?: string | null;
      attachments?: DisputeAttachment[];
    }) => {
      const room = payload?.conversationId || payload?.conversation_id;
      if (room && String(room) !== String(chatId)) return;
      const id = payload?.id || payload?._id;
      if (!id) return;
      const audience = String(payload.audience || "").toLowerCase();
      // Staff-only notes never appear in the party's notes panel.
      if (audience === "staff") return;
      setNotes((current) =>
        upsertNote(current, {
          id: String(id),
          authorName: payload.authorName || payload.author_name || "Staff",
          authorType: payload.authorType || payload.author_type,
          body: payload.body || payload.message_content || "",
          createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
          replyToId: payload.replyToId ?? payload.message_id_reply ?? null,
          audience,
          authorRole: payload.authorRole ?? payload.author_role ?? null,
          attachments: payload.attachments ?? [],
        })
      );
    };

    const join = () => socket.emit("joinRoom", { conversation_id: String(chatId) });
    if (!socket.connected) socket.connect();
    join();
    socket.on("connect", join);
    socket.on("disputeMessage", onLive);
    socket.on("disputeMessageUpdated", onLive);
    return () => {
      socket.off("connect", join);
      socket.off("disputeMessage", onLive);
      socket.off("disputeMessageUpdated", onLive);
      socket.emit("leaveRoom", { conversation_id: String(chatId) });
    };
  }, [chatId, dispute.canAddInformation]);

  const sendMoreInformation = async () => {
    const text = draft.trim();
    const pendingFiles = mediaList;
    if (sending || (!text && !pendingFiles.length)) return;
    const parentId = replyToId;
    const pendingId = `pending-${Date.now()}`;
    setNotes((current) => [
      ...current,
      {
        id: pendingId,
        authorName: "You",
        authorType: "user",
        body: text,
        createdAt: new Date().toISOString(),
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
    ]);
    setDraft("");
    setReplyToId(null);
    setSending(true);
    try {
      const uploaded = pendingFiles.length
        ? await Promise.all(pendingFiles.map((media) => uploadChatAttachment(media)))
        : [];
      clearMedia();
      const res = await api.post(`/api/accounts/disputes/${dispute.id}/messages`, {
        body: text,
        ...(parentId ? { replyToId: parentId } : {}),
        ...(uploaded.length ? { attachments: uploaded } : {}),
      });
      toast.success(res.data?.message || "Sent to staff. The other party cannot see this yet.");
      const saved = res.data?.data?.message as DisputeMessage | undefined;
      if (res.data?.data?.chatId) setChatId(String(res.data.data.chatId));
      if (saved?.id) {
        setNotes((current) =>
          upsertNote(
            current.filter((item) => String(item.id) !== pendingId),
            {
              id: String(saved.id),
              authorName: saved.authorName || "You",
              authorType: saved.authorType || "user",
              body: saved.body || text,
              createdAt: saved.createdAt || new Date().toISOString(),
              replyToId: saved.replyToId ?? parentId,
              authorRole: saved.authorRole ?? null,
              attachments: saved.attachments || [],
            }
          )
        );
      } else {
        const refresh = await api.get(`/api/users/disputes/${dispute.id}`);
        setNotes(Array.isArray(refresh.data?.data?.messages) ? refresh.data.data.messages : []);
        if (refresh.data?.data?.chatId) setChatId(String(refresh.data.data.chatId));
      }
    } catch (err: any) {
      setNotes((current) => current.filter((item) => String(item.id) !== pendingId));
      setDraft(text);
      setReplyToId(parentId);
      toast.error(err?.response?.data?.message || "Could not send that information.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
          <span className="font-semibold">{dispute.number || "Dispute"}</span>
          <span className="text-gray-300 dark:text-zinc-600">·</span>
          <span>{dispute.filedByMe ? "Filed by you" : "You are named in this dispute"}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <VisibilityPill isPublic={publicDiscussion} />
            <StatusPill status={dispute.status} />
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {dispute.title || "Transaction dispute"}
          </h3>
          {dispute.reason && dispute.reason !== dispute.title ? (
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-zinc-400">
              {dispute.reason}
            </p>
          ) : null}
        </div>

        <DisputeProgress dispute={dispute} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
          <span className="text-[11px] text-gray-500 dark:text-zinc-500">
            Updated {formatWhen(dispute.updatedAt, false) || "—"}
          </span>
          {publicDiscussion ? (
            <Link
              to={`/disputes/${dispute.id}`}
              className="rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
            >
              {open ? "Open discussion" : "View discussion"}
            </Link>
          ) : open ? (
            <span className="text-xs font-medium text-gray-600 dark:text-zinc-300">
              {dispute.filedByMe ? "Staff are reviewing your dispute" : "Waiting for staff"}
            </span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-zinc-500">Closed before it was made public</span>
          )}
        </div>
      </div>

      {dispute.canAddInformation ? (
        <section className="border-t border-gray-100 bg-gray-50/70 p-5 dark:border-white/5 dark:bg-white/[0.02]">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Private notes for staff</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                Only you and staff can see these. The other party can’t read or reply until staff make the dispute public. Escrow stays frozen meanwhile.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {loadingNotes ? (
              <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading notes…
              </p>
            ) : notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-500">
                No notes yet. Add evidence, dates, or anything staff should know.
              </p>
            ) : (
              notes.map((message) => {
                const fromStaff = String(message.authorType || "").toLowerCase() === "staff";
                const pending = String(message.id).startsWith("pending-");
                const parent = message.replyToId
                  ? notes.find((item) => String(item.id) === String(message.replyToId))
                  : undefined;
                const notice = audienceNotice(message.audience, dispute.viewerRole);
                const decision = isDisputeDecision(message);
                return (
                  <div
                    key={message.id}
                    className={`group flex gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-dark-surface ${
                      pending ? "opacity-60" : ""
                    } ${decision ? DECISION_CARD_CLASS : ""}`}
                  >
                    {decision ? null : (
                      <Avatar
                        name={fromStaff ? message.authorName : "You"}
                        role={fromStaff ? "staff" : "disputer"}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {decision ? (
                          <DecisionHeader
                            title={/reopen/i.test(message.body || "") ? "Case reopened" : "Final decision"}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {fromStaff ? message.authorName || "Staff" : "You"}
                          </span>
                        )}
                        {fromStaff && !decision ? <RoleChip role="staff" /> : null}
                        <AudiencePill audience={message.audience} viewerRole={dispute.viewerRole} />
                        <span className="ml-auto text-[11px] text-gray-400 dark:text-zinc-500">
                          {pending ? "Sending…" : formatWhen(message.createdAt)}
                        </span>
                      </div>
                      {notice ? (
                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300/80">{notice.detail}</p>
                      ) : null}
                      {message.replyToId ? (
                        <p className="mt-1 flex items-center gap-1.5 rounded-lg border-l-2 border-gray-300 bg-gray-50 px-2 py-1 text-[11px] text-gray-500 dark:border-white/20 dark:bg-white/[0.04] dark:text-zinc-400">
                          <CornerUpLeft className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {parent
                              ? `${parent.authorType === "staff" ? parent.authorName || "Staff" : "You"}: ${quoteSnippet(parent.body)}`
                              : "Replying to an earlier note"}
                          </span>
                        </p>
                      ) : null}
                      <p
                        className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${
                          decision
                            ? "font-medium text-gray-900 dark:text-white"
                            : "text-gray-700 dark:text-zinc-300"
                        }`}
                      >
                        {message.body}
                      </p>
                      <DisputeAttachments
                        attachments={message.attachments}
                        onPreview={(url) => setPreviewUrl(url)}
                      />
                      {!pending && !decision ? (
                        <button
                          type="button"
                          onClick={() => setReplyToId(String(message.id))}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 opacity-0 transition hover:text-gray-700 focus:opacity-100 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-white"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          Reply
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 space-y-2">
            {replyToId ? (
              <div className="flex items-start gap-2 rounded-xl border-l-2 border-gray-300 bg-gray-50 px-3 py-2 dark:border-white/20 dark:bg-white/[0.04]">
                <p className="min-w-0 flex-1 truncate text-[11px] text-gray-600 dark:text-zinc-300">
                  <CornerUpLeft className="mr-1 inline h-3 w-3" />
                  Replying to{" "}
                  {quoteSnippet(
                    notes.find((item) => String(item.id) === String(replyToId))?.body,
                    80
                  ) || "an earlier note"}
                </p>
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
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void sendMoreInformation();
                }
                if (event.key === "Escape" && replyToId) {
                  event.preventDefault();
                  setReplyToId(null);
                }
              }}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder={replyToId ? "Reply to this note…" : "Add a note for staff…"}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/30"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tabular-nums text-gray-400 dark:text-zinc-600">
                {draft.length}/{MAX_LENGTH}
              </span>
              <div className="flex items-center gap-1">
                <InboxUploadMediaButton
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  onClick={openFilePicker}
                  disabled={sending || mediaList.length >= 4}
                  title="Attach evidence — images or files (max 4)"
                />
                <button
                  type="button"
                  onClick={() => void sendMoreInformation()}
                  disabled={sending || (!draft.trim() && !mediaList.length)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sending ? "Sending" : "Send to staff"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <ChatImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </Card>
  );
}

export default function MyTransactionDisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "closed">("active");

  useEffect(() => {
    let cancelled = false;
    api.get("/api/users/disputes")
      .then((res) => {
        if (!cancelled) setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Your disputes could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const transactionDisputes = rows.filter(isTransactionDispute);
  const active = transactionDisputes.filter(isOpen);
  const closed = transactionDisputes.filter((row) => !isOpen(row));
  const shown = tab === "active" ? active : closed;

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Disputes" />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8" data-tour="disputes-container">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction disputes</h1>
            <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-zinc-400">
              Disputes you filed, and disputes that name you once staff make them public. Opening a dispute freezes the remaining escrow.
            </p>
          </div>
          <Link
            to="/contracts/dispute-form"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Report a dispute
          </Link>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-dark-surface">
          {([
            ["active", `Active (${active.length})`],
            ["closed", `Closed (${closed.length})`],
          ] as const).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-40 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
            <div className="h-40 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
          </div>
        ) : error ? (
          <Card className="px-6 py-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          </Card>
        ) : shown.length === 0 ? (
          <Card className="px-6 py-10 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-gray-400 dark:text-zinc-500" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              {tab === "active" ? "No active transaction disputes" : "No closed disputes yet"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              {tab === "active"
                ? "Open disputes appear here until staff close them."
                : "Disputes move here once they are closed."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
