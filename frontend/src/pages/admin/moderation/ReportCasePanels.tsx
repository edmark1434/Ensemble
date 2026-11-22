import { useState, type ReactNode } from 'react';
import {
  Activity,
  EyeOff,
  Flag,
  Loader2,
  MessageSquare,
  MessagesSquare,
  ShieldAlert,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { CaseAccountSummary } from '@/pages/admin/ticketManagement/ticketTypes';
import {
  StaffStandingSummary,
  StatusPill,
  caseLabel,
  caseWhen,
} from '@/pages/moderator/shared/StaffStandingSummary';

/* ------------------------------------------------------------------ */
/* Types (GET …/reports/:id)                                           */
/* ------------------------------------------------------------------ */

/** Forum item a report is about, as staff see it (removed and hidden items included). */
export type ReportForumContent = {
  kind: 'discussion' | 'comment' | 'group';
  discussionId?: string | null;
  discussionTitle?: string | null;
  discussionStatus?: string | null;
  commentId?: string | null;
  groupId?: string | null;
  /** `active`, `removed`, `inactive` (group) or `missing`. */
  status: string;
  removedBy?: string | null;
  /** The staff member (or member) who removed it. */
  removedByName?: string | null;
  removalReason?: string | null;
  /** Live text when the author edited it after the report. */
  currentText?: string | null;
};

export type ReportForumFootprint = {
  available: boolean;
  totals: {
    discussions: number;
    removedDiscussions: number;
    moderatedDiscussions: number;
    comments: number;
    removedComments: number;
    moderatedComments: number;
  };
  groups: {
    joined: number;
    owned: number;
    bannedFrom: number;
    list: { id: string; name: string; role: string; banned: boolean }[];
  };
  recentDiscussions: {
    id: string;
    title: string;
    groupId: string | null;
    groupName: string | null;
    status: string;
    removedBy: string | null;
    commentCount: number;
    createdAt: string | null;
  }[];
  recentComments: {
    discussionId: string;
    discussionTitle: string;
    groupName: string | null;
    commentId: string | null;
    isReply: boolean;
    snippet: string;
    removed: boolean;
    removedBy: string | null;
    createdAt: string | null;
  }[];
};

export type ReportedAccountContext = {
  standing: CaseAccountSummary | null;
  warnings: {
    id: string;
    number: string | null;
    type: string;
    reason: string | null;
    points: number;
    status: string;
    active: boolean;
    issuedBy: string | null;
    createdAt: string;
    expiresAt: string | null;
  }[];
  restrictions: {
    id: string;
    type: string;
    module: string | null;
    active: boolean;
    issuedBy: string | null;
    startsAt: string;
    endsAt: string | null;
  }[];
  recentActivity: {
    id: string;
    action: string;
    eventCode: string | null;
    label: string;
    category: string;
    severity: string;
    actor: { kind: 'staff' | 'self'; name: string | null; role: string | null } | null;
    createdAt: string;
  }[];
  otherReports: {
    id: string;
    number: string | null;
    type: string;
    status: string;
    priority: string | null;
    targetType: string | null;
    reporter: string | null;
    createdAt: string;
  }[];
  forum: ReportForumFootprint | null;
  notes: string[];
};

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function SectionLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {icon}
      {children}
    </p>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-zinc-500">{children}</p>;
}

function Stat({ label, value, tone = 'text-zinc-100' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-sky-400',
  info: 'bg-emerald-400',
  low: 'bg-zinc-500',
};

function removedByLabel(value?: string | null) {
  switch (value) {
    case 'author':
      return 'the author';
    case 'staff':
      return 'staff';
    case 'group_moderator':
      return 'a group moderator';
    case 'discussion_owner':
      return 'the discussion owner';
    default:
      return value ? caseLabel(value).toLowerCase() : 'moderation';
  }
}

/* ------------------------------------------------------------------ */
/* Reported member                                                     */
/* ------------------------------------------------------------------ */

type MemberTab = 'standing' | 'activity' | 'forum' | 'reports';

/**
 * Who was reported, so the handler can decide without leaving the case: standing and merit,
 * recent warnings and restrictions, account activity, other reports and (forum reports) what
 * they posted lately. `onOpen` previews a member page in the platform-view overlay.
 */
export function ReportedMemberPanel({
  context,
  onOpen,
}: {
  context: ReportedAccountContext;
  onOpen?: (path: string, label: string) => void;
}) {
  const forum = context.forum?.available ? context.forum : null;
  const tabs: { id: MemberTab; label: string; count?: number }[] = [
    { id: 'standing', label: 'Standing' },
    { id: 'activity', label: 'Activity', count: context.recentActivity.length },
    ...(forum ? [{ id: 'forum' as const, label: 'Forum', count: forum.totals.discussions + forum.totals.comments }] : []),
    { id: 'reports', label: 'Other reports', count: context.otherReports.length },
  ];
  const [tab, setTab] = useState<MemberTab>('standing');

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel icon={<UserRound className="h-3.5 w-3.5" />}>Reported member</SectionLabel>
        <div className="inline-flex rounded-lg border border-white/[0.08] bg-black/20 p-0.5" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                tab === item.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {item.label}
              {item.count ? <span className="ml-1 tabular-nums text-zinc-500">{item.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {tab === 'standing' && <StandingTab context={context} />}
        {tab === 'activity' && <ActivityTab context={context} />}
        {tab === 'forum' && forum && <ForumTab forum={forum} onOpen={onOpen} />}
        {tab === 'reports' && <ReportsTab context={context} />}
      </div>

      {context.notes.length ? (
        <p className="mt-3 text-[11px] text-amber-200/80">{context.notes.join(' ')}</p>
      ) : null}
    </div>
  );
}

function StandingTab({ context }: { context: ReportedAccountContext }) {
  return (
    <div className="space-y-3">
      <StaffStandingSummary account={context.standing} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <SectionLabel icon={<ShieldAlert className="h-3 w-3" />}>Latest warnings</SectionLabel>
          {context.warnings.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {context.warnings.map((warning) => (
                <li key={warning.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-zinc-200">{warning.type}</span>
                    <span className={`shrink-0 tabular-nums ${warning.active ? 'text-amber-300' : 'text-zinc-500'}`}>
                      {warning.points} pt{warning.points === 1 ? '' : 's'} · {caseLabel(warning.status)}
                    </span>
                  </div>
                  {warning.reason ? <p className="mt-0.5 line-clamp-2 text-zinc-500">{warning.reason}</p> : null}
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {caseWhen(warning.createdAt)}
                    {warning.issuedBy ? ` · ${warning.issuedBy}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1.5">
              <Empty>No warnings on record.</Empty>
            </div>
          )}
        </div>
        <div>
          <SectionLabel icon={<ShieldAlert className="h-3 w-3" />}>Restrictions</SectionLabel>
          {context.restrictions.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {context.restrictions.map((restriction) => (
                <li key={restriction.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-zinc-200">
                      {caseLabel(restriction.type)}
                      {restriction.module ? <span className="text-zinc-500"> · {restriction.module}</span> : null}
                    </span>
                    <span className={`shrink-0 ${restriction.active ? 'text-amber-300' : 'text-zinc-500'}`}>
                      {restriction.active ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {caseWhen(restriction.startsAt)} → {restriction.endsAt ? caseWhen(restriction.endsAt) : 'until lifted'}
                    {restriction.issuedBy ? ` · ${restriction.issuedBy}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1.5">
              <Empty>No restrictions on record.</Empty>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ context }: { context: ReportedAccountContext }) {
  if (!context.recentActivity.length) return <Empty>No recent account activity.</Empty>;
  return (
    <ol className="space-y-2">
      {context.recentActivity.map((item) => (
        <li key={item.id} className="flex gap-2.5 text-xs">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[item.severity] || SEVERITY_DOT.low}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-zinc-200">
              {item.label}
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-zinc-600">{item.category}</span>
            </p>
            <p className="line-clamp-2 text-zinc-500">{item.action}</p>
            <p className="text-[10px] text-zinc-600">
              {caseWhen(item.createdAt)}
              {item.actor?.kind === 'staff' ? ` · by ${item.actor.name || 'Staff'} (${item.actor.role || 'Staff'})` : ''}
              {item.actor?.kind === 'self' ? ' · by the member' : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ForumTab({
  forum,
  onOpen,
}: {
  forum: ReportForumFootprint;
  onOpen?: (path: string, label: string) => void;
}) {
  const { totals, groups } = forum;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Stat label="Discussions" value={totals.discussions} />
        <Stat
          label="Removed by mods"
          value={totals.moderatedDiscussions}
          tone={totals.moderatedDiscussions ? 'text-amber-300' : 'text-zinc-100'}
        />
        <Stat label="Comments" value={totals.comments} />
        <Stat
          label="Hidden by mods"
          value={totals.moderatedComments}
          tone={totals.moderatedComments ? 'text-amber-300' : 'text-zinc-100'}
        />
        <Stat label="Groups" value={groups.joined} />
        <Stat label="Banned from" value={groups.bannedFrom} tone={groups.bannedFrom ? 'text-red-300' : 'text-zinc-100'} />
      </div>

      {groups.list.length ? (
        <div className="flex flex-wrap gap-1.5">
          {groups.list.map((group) => (
            <span
              key={group.id}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${
                group.banned
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300'
              }`}
            >
              <UsersRound className="h-3 w-3" />
              {group.name}
              <span className="text-zinc-500">· {group.banned ? 'banned' : group.role === 'Admin' ? 'owner' : group.role.toLowerCase()}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <SectionLabel icon={<MessagesSquare className="h-3 w-3" />}>Latest discussions</SectionLabel>
          {forum.recentDiscussions.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {forum.recentDiscussions.map((discussion) => {
                const path = `/forums/discussion/${discussion.id}`;
                const canOpen = discussion.status === 'active' && Boolean(onOpen);
                return (
                  <li key={discussion.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => onOpen?.(path, discussion.title)}
                          className="truncate text-left text-sky-200 hover:underline"
                        >
                          {discussion.title}
                        </button>
                      ) : (
                        <span className="truncate text-zinc-200">{discussion.title}</span>
                      )}
                      {discussion.status !== 'active' ? <StatusPill status="removed" /> : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {discussion.groupName ? `${discussion.groupName} · ` : ''}
                      {discussion.commentCount} comment{discussion.commentCount === 1 ? '' : 's'} · {caseWhen(discussion.createdAt)}
                      {discussion.status !== 'active' ? ` · removed by ${removedByLabel(discussion.removedBy)}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-1.5">
              <Empty>No discussions.</Empty>
            </div>
          )}
        </div>
        <div>
          <SectionLabel icon={<MessageSquare className="h-3 w-3" />}>Latest comments</SectionLabel>
          {forum.recentComments.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {forum.recentComments.map((comment) => (
                <li
                  key={`${comment.discussionId}:${comment.commentId}`}
                  className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs"
                >
                  <p className={`line-clamp-2 ${comment.removed ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-300'}`}>
                    {comment.snippet || (comment.removed ? '[deleted by the author]' : '[image only]')}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {comment.isReply ? 'Reply in ' : 'On '}“{comment.discussionTitle}”
                    {comment.groupName ? ` · ${comment.groupName}` : ''} · {caseWhen(comment.createdAt)}
                    {comment.removed ? ` · removed by ${removedByLabel(comment.removedBy)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1.5">
              <Empty>No comments.</Empty>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ context }: { context: ReportedAccountContext }) {
  if (!context.otherReports.length) return <Empty>No other reports against this member.</Empty>;
  return (
    <ul className="space-y-1.5">
      {context.otherReports.map((report) => (
        <li
          key={report.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs"
        >
          <div className="min-w-0">
            <p className="truncate text-zinc-200">
              <Flag className="mr-1 inline h-3 w-3 text-zinc-500" />
              {report.type}
              <span className="ml-1.5 text-zinc-500">· {caseLabel(report.targetType)}</span>
            </p>
            <p className="text-[10px] text-zinc-600">
              <span className="font-mono">{report.number || '—'}</span> · {caseWhen(report.createdAt)}
              {report.reporter ? ` · from ${report.reporter}` : ''}
            </p>
          </div>
          <StatusPill status={report.status} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Forum content actions                                               */
/* ------------------------------------------------------------------ */

const CONTENT_COPY = {
  discussion: { title: 'Reported discussion', verb: 'Remove discussion', done: 'Discussion removed. It can be restored from Forum control.' },
  comment: { title: 'Reported comment', verb: 'Hide comment', done: 'Comment hidden. It can be restored from Forum control.' },
  group: { title: 'Reported group', verb: 'Archive group', done: 'Group archived. It can be reactivated from Forum control.' },
} as const;

/**
 * State of the reported forum item and the one take-down that fits it. Goes through the same
 * forum moderation endpoints as Forum control (`apiBase`), so the same guards, member
 * broadcasts and audit trail apply. Restores stay in Forum control.
 */
export function ReportForumContentCard({
  content,
  apiBase,
  defaultReason,
  onChanged,
}: {
  content: ReportForumContent;
  apiBase: string;
  defaultReason: string;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  const [busy, setBusy] = useState(false);
  const copy = CONTENT_COPY[content.kind];
  const active = content.status === 'active';
  const parentRemoved = content.kind === 'comment' && content.discussionStatus && content.discussionStatus !== 'active';

  const request = () => {
    const body = { reason: reason.trim() || undefined };
    if (content.kind === 'discussion' && content.discussionId) {
      return api.patch(`${apiBase}/discussions/${content.discussionId}`, { ...body, status: 'removed' });
    }
    if (content.kind === 'comment' && content.discussionId && content.commentId) {
      return api.patch(`${apiBase}/discussions/${content.discussionId}/comments/${content.commentId}`, {
        ...body,
        hidden: true,
      });
    }
    if (content.kind === 'group' && content.groupId) {
      return api.patch(`${apiBase}/groups/${content.groupId}`, { ...body, status: 'inactive' });
    }
    return null;
  };

  const takeDown = async () => {
    const pending = request();
    if (!pending) return;
    setBusy(true);
    try {
      await pending;
      showSuccessToast(copy.done);
      setConfirming(false);
      onChanged();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'That change did not go through';
      showErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  let state: ReactNode;
  if (content.status === 'missing') {
    state = <span className="text-xs text-zinc-500">No longer exists. The case keeps the reported snapshot.</span>;
  } else if (!active) {
    state = (
      <span className="text-xs text-zinc-400">
        {content.kind === 'group'
          ? 'Archived or deleted'
          : `Removed by ${
              content.removedByName
                ? `${content.removedByName} (${removedByLabel(content.removedBy)})`
                : removedByLabel(content.removedBy)
            }`}
        {content.removalReason ? ` · “${content.removalReason}”` : ''}
      </span>
    );
  } else if (parentRemoved) {
    state = <span className="text-xs text-zinc-400">Visible on its own, but the discussion holding it was removed.</span>;
  } else {
    state = <span className="text-xs text-emerald-200/90">Still visible to members.</span>;
  }

  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <SectionLabel icon={<Activity className="h-3.5 w-3.5" />}>{copy.title}</SectionLabel>
          <div className="mt-1">{state}</div>
          {content.kind === 'comment' && content.discussionTitle ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">In “{content.discussionTitle}”</p>
          ) : null}
        </div>
        <StatusPill status={content.status === 'missing' ? 'removed' : content.status} />
      </div>

      {content.currentText ? (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
            Edited after it was reported — current text
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-300">{content.currentText}</p>
        </div>
      ) : null}

      {active && !parentRemoved ? (
        confirming ? (
          <div className="mt-3 space-y-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Moderation note (kept on the audit trail)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void takeDown()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : content.kind === 'comment' ? <EyeOff className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                Confirm: {copy.verb.toLowerCase()}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            {content.kind === 'comment' ? <EyeOff className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            {copy.verb}
          </button>
        )
      ) : null}
      <p className="mt-2 text-[11px] text-zinc-600">
        Taking content down does not decide the report. Sanction or deny it below.
      </p>
    </div>
  );
}
