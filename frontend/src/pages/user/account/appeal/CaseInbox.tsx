import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Gavel, Inbox, LifeBuoy, Loader2, Send, XCircle } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast } from '@/components/utility/toast';
import { formatStandingWhen } from '@/lib/standing';
import {
  type AppealDecision,
  type CaseSelection,
  type DisputeRow,
  type ThreadMessage,
  type TicketRow,
  APPEAL_LIMITS,
  errorMessage,
  isAppealTicket,
  isClosedStatus,
  statusPillClass,
} from './appealShared';
import { AttachButton, MessageAttachments, PendingFileList, uploadPendingFiles, usePendingFiles } from './appealAttachments';
import { DisputeDecisionCard, isDisputeDecision, type MentionMap } from '@/pages/user/disputes/disputeUi';

const POLL_MS = 20_000;

type ThreadState = {
  loading: boolean;
  error: string | null;
  messages: ThreadMessage[];
  status?: string;
  type?: string;
  appealDecision?: AppealDecision;
  /** Dispute only: mirrors the checks in `postPublicDisputeComment`. */
  dispute?: { visible: boolean; filedByMe: boolean; limited: boolean };
  /** Dispute only: "@handle" → account id for links in rulings. */
  mentions?: MentionMap;
};

const EMPTY_THREAD: ThreadState = { loading: false, error: null, messages: [] };

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass(status)}`}>
      {status}
    </span>
  );
}

function CaseRow({
  title,
  meta,
  status,
  active,
  appeal,
  onClick,
}: {
  title: string;
  meta: string;
  status?: string;
  active: boolean;
  appeal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
        active
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{title}</span>
        <StatusPill status={status} />
      </span>
      <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-zinc-500">
        {appeal ? <Gavel className="h-3 w-3 shrink-0" /> : null}
        <span className="truncate">{meta}</span>
      </span>
    </button>
  );
}

function ListHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-4 pb-1.5 pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{label}</h3>
      <span className="text-[11px] tabular-nums text-gray-400 dark:text-zinc-600">{count}</span>
    </div>
  );
}

function DecisionNotice({ decision }: { decision: AppealDecision }) {
  if (!decision) return null;
  if (decision === 'accepted') {
    return (
      <div className="flex items-start gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Appeal accepted. The penalty ends within 24 hours, and this page updates when it does.</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {decision === 'denied_permanent'
          ? 'Appeal denied permanently. This account cannot file another appeal.'
          : 'Appeal denied. You can appeal again in 12 months, or sooner if a new penalty is issued.'}
      </span>
    </div>
  );
}

export default function CaseInbox({
  tickets,
  disputes,
  listsLoading,
  listsError,
  selection,
  onSelect,
  onRefreshLists,
  accountId,
  replyLimited,
  onAppealDecision,
}: {
  tickets: TicketRow[];
  disputes: DisputeRow[];
  listsLoading: boolean;
  listsError: boolean;
  selection: CaseSelection | null;
  onSelect: (selection: CaseSelection | null) => void;
  onRefreshLists: () => Promise<void>;
  accountId: string;
  /** Banned, locked and suspended members can reply only on their appeal ticket. */
  replyLimited: boolean;
  /** Called with the ticket id whenever an opened appeal ticket carries a decision. */
  onAppealDecision?: (ticketId: string) => void;
}) {
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadState>(EMPTY_THREAD);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const replyFiles = usePendingFiles();
  const clearReplyFiles = replyFiles.clear;
  const requestRef = useRef(0);
  const selectionRef = useRef<CaseSelection | null>(selection);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  const onAppealDecisionRef = useRef(onAppealDecision);
  selectionRef.current = selection;
  onAppealDecisionRef.current = onAppealDecision;

  const loadThread = useCallback(async (target: CaseSelection, silent = false) => {
    const requestId = ++requestRef.current;
    if (!silent) setThread({ ...EMPTY_THREAD, loading: true });
    try {
      const res = await api.get(
        target.kind === 'ticket' ? `/api/users/tickets/${target.id}` : `/api/users/disputes/${target.id}`
      );
      if (requestId !== requestRef.current) return;
      const data = res.data?.data || {};
      if (target.kind === 'ticket' && data.ticket?.appealDecision) onAppealDecisionRef.current?.(target.id);
      setThread({
        loading: false,
        error: null,
        messages: data.messages || [],
        status: target.kind === 'ticket' ? data.ticket?.status : data.status,
        type: data.ticket?.type,
        appealDecision: data.ticket?.appealDecision ?? null,
        dispute:
          target.kind === 'dispute'
            ? { visible: Boolean(data.visibility), filedByMe: Boolean(data.filedByMe), limited: Boolean(data.limited) }
            : undefined,
        mentions: target.kind === 'dispute' ? data.mentions || {} : undefined,
      });
    } catch (err) {
      if (requestId !== requestRef.current || silent) return;
      setThread({ ...EMPTY_THREAD, error: errorMessage(err, 'Could not load this conversation.') });
    }
  }, []);

  useEffect(() => {
    lastCountRef.current = 0;
    setReply('');
    clearReplyFiles();
    if (selection) void loadThread(selection);
    else {
      requestRef.current += 1;
      setThread(EMPTY_THREAD);
    }
  }, [selection, loadThread, clearReplyFiles]);

  // Staff replies arrive without a reload: refresh while the tab is visible.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void onRefreshLists().catch(() => undefined);
      if (selectionRef.current) void loadThread(selectionRef.current, true);
    };
    const timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [onRefreshLists, loadThread]);

  // Scroll the thread itself (never the window) when new messages arrive.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || thread.messages.length === lastCountRef.current) return;
    lastCountRef.current = thread.messages.length;
    el.scrollTop = el.scrollHeight;
  }, [thread.messages.length]);

  const selectedTicket = selection?.kind === 'ticket' ? tickets.find((t) => t.id === selection.id) || null : null;
  const selectedDispute = selection?.kind === 'dispute' ? disputes.find((d) => d.id === selection.id) || null : null;
  const ticketStatus = thread.status || selectedTicket?.status;
  const ticketType = thread.type || selectedTicket?.type;
  const ticketClosed = isClosedStatus(ticketStatus);
  const blockedByPenalty = replyLimited && !isAppealTicket({ type: ticketType });

  // Disputes: the backend blocks writes for banned, locked and suspended members, closed
  // disputes, and private disputes the member did not file.
  const disputeStatus = thread.status || selectedDispute?.status;
  const disputeClosed = isClosedStatus(disputeStatus);
  const disputeInfo = thread.dispute;
  const disputeCanReply = Boolean(
    disputeInfo && !replyLimited && !disputeClosed && !disputeInfo.limited && (disputeInfo.visible || disputeInfo.filedByMe)
  );
  const disputeReadOnlyReason = replyLimited
    ? 'While this penalty is active, disputes are read-only.'
    : disputeClosed
      ? 'This dispute is closed. The discussion is read-only.'
      : disputeInfo && !disputeInfo.visible && !disputeInfo.filedByMe
        ? 'You can reply once staff open this dispute.'
        : 'This dispute is read-only.';

  const canCompose =
    selection?.kind === 'ticket' ? !ticketClosed && !blockedByPenalty : selection?.kind === 'dispute' && disputeCanReply;
  const replyMax = selection?.kind === 'dispute' ? APPEAL_LIMITS.disputeReply : APPEAL_LIMITS.description;

  async function sendReply() {
    if (!selection || !canCompose || sending || thread.loading) return;
    const body = reply.trim();
    const files = replyFiles.files;
    if (!body && !files.length) return;
    const target = selection;
    setSending(true);
    setReply('');
    if (replyRef.current) replyRef.current.style.height = 'auto';
    try {
      const attachments = await uploadPendingFiles(
        files,
        target.kind === 'ticket' ? 'ticket-attachments' : 'chat-attachments'
      );
      const payload = { body, ...(attachments.length ? { attachments } : {}) };
      if (target.kind === 'ticket') {
        await api.post(`/api/users/tickets/${target.id}/messages`, payload);
      } else {
        await api.post(`/api/accounts/disputes/${target.id}/messages`, payload);
      }
      if (selectionRef.current?.kind === target.kind && selectionRef.current.id === target.id) {
        replyFiles.clear();
        await loadThread(target, true);
      }
      void onRefreshLists().catch(() => undefined);
    } catch (err) {
      setReply(body);
      showErrorToast(errorMessage(err, err instanceof Error && err.message ? err.message : 'Could not send that reply.'));
    } finally {
      setSending(false);
    }
  }

  function messageIsOwn(message: ThreadMessage) {
    const sender = message.senderId || message.senderAccountId;
    if (sender && accountId) return String(sender) === accountId;
    return String(message.authorType || '').toLowerCase() === 'user';
  }

  const threadTitle = selectedTicket
    ? selectedTicket.subject || selectedTicket.number || 'Ticket'
    : selectedDispute?.title || selectedDispute?.number || 'Dispute';
  const threadMeta = selectedTicket
    ? selectedTicket.number || 'Ticket'
    : selectedDispute?.number || 'Dispute';

  return (
    <section
      aria-label="Your tickets and disputes"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface"
    >
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
          <Inbox className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tickets and disputes</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Reply to staff and attach screenshots or files. Updates every few seconds.</p>
        </div>
      </div>

      <div className="flex h-[34rem] lg:h-[38rem]">
        {/* List: full width on phones until a case is opened. */}
        <aside
          className={`${selection ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-gray-200 lg:w-80 lg:border-r dark:border-white/10`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto pb-3">
            {listsLoading ? (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : listsError ? (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-zinc-400">
                Could not load your tickets and disputes.{' '}
                <button type="button" onClick={() => void onRefreshLists().catch(() => undefined)} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Try again
                </button>
              </div>
            ) : (
              <>
                <ListHeading label="Tickets" count={tickets.length} />
                {tickets.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-gray-500 dark:text-zinc-500">No tickets yet.</p>
                ) : (
                  tickets.map((ticket) => (
                    <CaseRow
                      key={ticket.id}
                      title={ticket.subject || ticket.number || 'Ticket'}
                      meta={[ticket.number, formatStandingWhen(ticket.lastMessageAt || ticket.updatedAt)].filter(Boolean).join(' · ')}
                      status={ticket.status}
                      appeal={isAppealTicket(ticket)}
                      active={selection?.kind === 'ticket' && selection.id === ticket.id}
                      onClick={() => onSelect({ kind: 'ticket', id: ticket.id })}
                    />
                  ))
                )}
                <ListHeading label="Disputes" count={disputes.length} />
                {disputes.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-gray-500 dark:text-zinc-500">No disputes.</p>
                ) : (
                  disputes.map((dispute) => (
                    <CaseRow
                      key={dispute.id}
                      title={dispute.title || dispute.number || 'Dispute'}
                      meta={[dispute.number, formatStandingWhen(dispute.updatedAt)].filter(Boolean).join(' · ')}
                      status={dispute.status}
                      active={selection?.kind === 'dispute' && selection.id === dispute.id}
                      onClick={() => onSelect({ kind: 'dispute', id: dispute.id })}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </aside>

        <div className={`${selection ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col bg-gray-50 dark:bg-dark-base`}>
          {!selection ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <LifeBuoy className="h-8 w-8 text-gray-300 dark:text-zinc-700" />
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Pick a conversation</p>
              <p className="max-w-xs text-xs text-gray-500 dark:text-zinc-500">Open a ticket or dispute to read it and reply.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-dark-surface">
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  aria-label="Back to the list"
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{threadTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-500">{threadMeta}</p>
                </div>
                <StatusPill status={selectedTicket ? ticketStatus : disputeStatus} />
              </div>

              {selectedTicket ? <DecisionNotice decision={thread.appealDecision ?? null} /> : null}

              <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                {thread.loading ? (
                  <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : thread.error ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-zinc-400">
                    <p>{thread.error}</p>
                    <button type="button" onClick={() => void loadThread(selection)} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col">
                    {thread.messages.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">No messages yet.</p>
                    ) : null}
                    {thread.messages.map((message) => {
                      // Rulings, the filing summary and the "now public" invite: the same card as every other view.
                      if (selection.kind === 'dispute' && isDisputeDecision(message)) {
                        return (
                          <div key={message.id} className="my-3">
                            <DisputeDecisionCard
                              body={message.body}
                              when={formatStandingWhen(message.createdAt)}
                              mentions={thread.mentions}
                            >
                              <MessageAttachments attachments={message.attachments} own={false} />
                            </DisputeDecisionCard>
                          </div>
                        );
                      }
                      if (String(message.messageType || message.authorType || '').toLowerCase() === 'system') {
                        return (
                          <div key={message.id} className="my-3 flex justify-center">
                            <span className="max-w-[90%] rounded-full bg-white px-4 py-1.5 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-zinc-400">
                              {message.body}
                            </span>
                          </div>
                        );
                      }
                      const own = messageIsOwn(message);
                      const name = own
                        ? 'You'
                        : String(message.authorType || '').toLowerCase() === 'staff'
                          ? 'Staff'
                          : message.authorName || 'Staff';
                      return (
                        <div key={message.id} className={`my-2 flex ${own ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex max-w-[85%] flex-col sm:max-w-[75%]">
                            <span className={`mb-1 px-1 text-[11px] font-medium text-gray-500 dark:text-zinc-500 ${own ? 'self-end' : 'self-start'}`}>
                              {name} · {formatStandingWhen(message.createdAt)}
                            </span>
                            {message.body ? (
                              <div
                                className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${own ? 'self-end' : 'self-start'} ${
                                  own
                                    ? 'rounded-br-md bg-blue-600 text-white'
                                    : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-white/10 dark:bg-dark-elevated dark:text-zinc-100'
                                }`}
                              >
                                {message.body}
                              </div>
                            ) : null}
                            <MessageAttachments attachments={message.attachments} own={own} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selection.kind === 'dispute' && disputeInfo && !disputeCanReply ? (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                  <span>{disputeReadOnlyReason}</span>
                  {!replyLimited ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/disputes/${selection.id}`)}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open dispute page <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : selection.kind === 'ticket' && ticketClosed ? (
                <div className="border-t border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                  This ticket is closed. You cannot reply.
                </div>
              ) : selection.kind === 'ticket' && blockedByPenalty ? (
                <div className="border-t border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                  While this penalty is active you can only reply on your appeal ticket.
                </div>
              ) : (
                <div
                  className="flex flex-col gap-2 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-dark-surface"
                  onDragOver={(event) => {
                    if (canCompose && event.dataTransfer.types.includes('Files')) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!canCompose || sending) return;
                    event.preventDefault();
                    replyFiles.add(event.dataTransfer.files);
                  }}
                >
                  {selection.kind === 'dispute' ? (
                    <p className="flex flex-wrap items-center gap-x-2 px-1 text-xs text-gray-500 dark:text-zinc-500">
                      <span>Only you and staff see your replies until staff share them.</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/disputes/${selection.id}`)}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Open dispute page <ExternalLink className="h-3 w-3" />
                      </button>
                    </p>
                  ) : null}
                  <PendingFileList files={replyFiles.files} onRemove={replyFiles.remove} disabled={sending} />
                  <div className="flex items-end gap-2">
                    <AttachButton
                      onPick={replyFiles.add}
                      disabled={sending || thread.loading || !canCompose}
                      count={replyFiles.files.length}
                    />
                    <textarea
                      ref={replyRef}
                      value={reply}
                      rows={1}
                      maxLength={replyMax}
                      disabled={thread.loading || !canCompose}
                      aria-label={selection.kind === 'dispute' ? 'Reply on this dispute' : 'Reply to staff'}
                      placeholder="Write a reply… (Shift + Enter for a new line)"
                      onPaste={(event) => {
                        const pasted = Array.from(event.clipboardData.files || []);
                        if (!pasted.length) return;
                        event.preventDefault();
                        replyFiles.add(pasted);
                      }}
                      onChange={(event) => {
                        setReply(event.target.value);
                        const el = event.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          void sendReply();
                        }
                      }}
                      className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-dark-base dark:text-white dark:placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={sending || !canCompose || (!reply.trim() && !replyFiles.files.length)}
                      className="rounded-xl bg-blue-600 p-2.5 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
