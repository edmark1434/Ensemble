import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Crown,
  Download,
  Heart,
  Loader2,
  Lock,
  MessageSquare,
  MessagesSquare,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Undo2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import TableFilterBar from '../userTeam/components/TableFilterBar';
import {
  apiMessage,
  downloadCsv,
  formatDateTime,
  formatNumber,
  formatRelative,
  formatShortDateTime,
  personLabel,
  statusClass,
} from './moderationFormat';

type ForumPerson = {
  userId: string | number | null;
  accountId?: string | null;
  name: string | null;
  handle: string | null;
  isVerified?: boolean;
};

type ForumMember = ForumPerson & {
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  joinedAt: string | null;
};

type ForumComment = {
  commentId: string;
  comment: string;
  replyToCommentId: string | null;
  replyCount: number;
  author: ForumPerson;
  likeCount: number;
  attachmentCount: number;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ForumDiscussion = {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  groupName?: string | null;
  groupStatus?: string | null;
  author: ForumPerson;
  tags?: ({ tag_name?: string } | string)[];
  attachmentCount?: number;
  commentCount: number;
  removedCommentCount: number;
  totalCommentCount: number;
  likeCount: number;
  saveCount: number;
  status: string;
  isLocked: boolean;
  isSticky: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  removedAt: string | null;
  lastCommentAt: string | null;
  lastActivityAt: string | null;
  comments?: ForumComment[];
};

type ForumGroup = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  tags: ({ tag_name?: string } | string)[];
  memberCount: number;
  bannedMemberCount: number;
  adminCount: number;
  moderatorCount: number;
  owner: ForumPerson | null;
  discussionCount: number;
  activeDiscussionCount: number;
  removedDiscussionCount: number;
  lockedDiscussionCount: number;
  pinnedDiscussionCount: number;
  commentCount: number;
  removedCommentCount: number;
  likeCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  members?: ForumMember[];
  discussions?: ForumDiscussion[];
};

type ForumStats = {
  groups: { total: number; active: number; archived: number };
  members: { total: number; banned: number };
  discussions: { total: number; active: number; removed: number; locked: number; pinned: number };
  comments: { total: number; removed: number; visible: number };
  lastActivityAt: string | null;
} | null;

/**
 * Both consoles mount this desk. The admin console passes
 * `/api/admin/moderation/forum`; the Forum Moderator desk passes
 * `/api/moderator/forum`. The two route sets share one backend service, so the
 * payloads, guards and audit entries are identical.
 */
function forumDeskApi(base: string) {
  const root = base.replace(/\/$/, '');
  return { groups: `${root}/groups`, discussions: `${root}/discussions` };
}

type View = 'groups' | 'discussions';

function tagLabel(tag: { tag_name?: string } | string) {
  return typeof tag === 'string' ? tag : tag.tag_name || '';
}

function tagList(tags?: ({ tag_name?: string } | string)[]) {
  return (tags || []).map(tagLabel).filter(Boolean);
}

/** The state words that matter on a discussion row, in one line. */
function discussionState(item: ForumDiscussion) {
  const parts = [item.status === 'removed' ? 'Removed' : 'Visible'];
  if (item.isLocked) parts.push('Locked');
  if (item.isSticky) parts.push('Pinned');
  return parts;
}

function groupParams(search: string, status: string) {
  return { search, status };
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  );
}

function StatePill({ children, value }: { children: ReactNode; value: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass(value)}`}>
      {children}
    </span>
  );
}

const DESK_ACCENT = {
  rose: {
    tabOn: 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]',
    tabIcon: 'text-rose-400',
    focus: 'focus:ring-rose-500/15',
  },
  violet: {
    tabOn: 'bg-violet-500/15 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]',
    tabIcon: 'text-violet-400',
    focus: 'focus:ring-violet-500/15',
  },
} as const;

type DeskAccent = keyof typeof DESK_ACCENT;

/**
 * Forum content moderation, shared by the admin console (Moderation →
 * Management → Forum) and the Forum Moderator desk.
 *
 * Two views over the same data: groups (ownership, roster, bans, archiving) and
 * discussions (visibility, locking, pinning, comment removal). Every row shows
 * the counts a moderator needs before opening anything, and every action here
 * writes an entry to the moderation activity log.
 */
export default function ForumModerationDesk({
  apiBase,
  initialView = 'groups',
  accent = 'rose',
  onViewChange,
}: {
  /** Root of this console's forum routes, without a trailing slash. */
  apiBase: string;
  initialView?: View;
  /** Admin Management uses rose; Forum Moderator console uses violet. */
  accent?: DeskAccent;
  /** Optional sync when the desk toggles Discussions ↔ Groups. */
  onViewChange?: (view: View) => void;
}) {
  const theme = DESK_ACCENT[accent] || DESK_ACCENT.rose;
  const { groups: FORUM_GROUPS_URL, discussions: FORUM_DISCUSSIONS_URL } = useMemo(
    () => forumDeskApi(apiBase),
    [apiBase]
  );
  const [view, setView] = useState<View>(initialView);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const [groups, setGroups] = useState<ForumGroup[]>([]);
  const [discussions, setDiscussions] = useState<ForumDiscussion[]>([]);
  const [stats, setStats] = useState<ForumStats>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [groupDetail, setGroupDetail] = useState<ForumGroup | null>(null);
  const [discussionDetail, setDiscussionDetail] = useState<ForumDiscussion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const firstLoad = useRef(true);

  // Debounce the search box: both desks query the server.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (nextView: View, nextQuery: string, nextStatus: string) => {
      const url = nextView === 'groups' ? FORUM_GROUPS_URL : FORUM_DISCUSSIONS_URL;
      const params = groupParams(nextQuery, nextStatus);
      const cached = peekStaffGet(url, params);
      if (cached?.data?.data) applyPayload(nextView, cached.data.data);
      else if (firstLoad.current) setLoading(true);
      else setRefreshing(true);
      setError('');
      try {
        const res = await staffGet(url, params);
        const payload = res.data?.data;
        if (!payload) throw new Error('Failed to load forum content');
        applyPayload(nextView, payload);
      } catch (err) {
        if (!cached) setError(apiMessage(err, 'Failed to load forum content'));
      } finally {
        firstLoad.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [FORUM_GROUPS_URL, FORUM_DISCUSSIONS_URL]
  );

  function applyPayload(nextView: View, payload: Record<string, unknown>) {
    setAvailable(payload.available !== false);
    if (payload.stats) setStats(payload.stats as ForumStats);
    if (nextView === 'groups') setGroups((payload.groups as ForumGroup[]) || []);
    else setDiscussions((payload.discussions as ForumDiscussion[]) || []);
  }

  useEffect(() => {
    void load(view, query, status);
  }, [load, view, query, status]);

  const switchView = (next: View) => {
    if (next === view) return;
    setView(next);
    setStatus('all');
    setSortBy('recent');
    onViewChange?.(next);
  };

  useEffect(() => {
    if (initialView !== view) {
      setView(initialView);
      setStatus('all');
      setSortBy('recent');
    }
    // Only react when the parent changes the URL-driven initial view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView]);

  const visibleGroups = useMemo(() => {
    const list = [...groups];
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'members') return b.memberCount - a.memberCount;
      if (sortBy === 'discussions') return b.discussionCount - a.discussionCount;
      if (sortBy === 'flagged') return b.removedDiscussionCount - a.removedDiscussionCount;
      if (sortBy === 'created')
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });
    return list;
  }, [groups, sortBy]);

  const visibleDiscussions = useMemo(() => {
    const list = [...discussions];
    list.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'comments') return b.commentCount - a.commentCount;
      if (sortBy === 'likes') return b.likeCount - a.likeCount;
      if (sortBy === 'created')
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });
    return list;
  }, [discussions, sortBy]);

  const openGroup = async (id: string) => {
    setDiscussionDetail(null);
    setGroupDetail(null);
    setReason('');
    setMemberFilter('');
    setDetailLoading(true);
    try {
      const res = await api.get(`${FORUM_GROUPS_URL}/${id}`);
      setGroupDetail(res.data?.data || null);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load group'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openDiscussion = async (id: string) => {
    setGroupDetail(null);
    setDiscussionDetail(null);
    setReason('');
    setDetailLoading(true);
    try {
      const res = await api.get(`${FORUM_DISCUSSIONS_URL}/${id}`);
      setDiscussionDetail(res.data?.data || null);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load discussion'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setGroupDetail(null);
    setDiscussionDetail(null);
    setReason('');
  };

  const saveGroupStatus = async (next: 'active' | 'inactive') => {
    if (!groupDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(`${FORUM_GROUPS_URL}/${groupDetail.id}`, {
        status: next,
        reason: reason.trim() || undefined,
      });
      setGroupDetail(res.data?.data || null);
      setReason('');
      showSuccessToast(res.data?.message || 'Group updated');
      await load('groups', query, status);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update group'));
    } finally {
      setSaving(false);
    }
  };

  const saveMemberBan = async (member: ForumMember) => {
    if (!groupDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(
        `${FORUM_GROUPS_URL}/${groupDetail.id}/members/${member.userId}`,
        { isBanned: !member.isBanned, reason: reason.trim() || undefined }
      );
      setGroupDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || 'Member updated');
      await load('groups', query, status);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update member'));
    } finally {
      setSaving(false);
    }
  };

  const saveDiscussion = async (patch: {
    status?: string;
    isLocked?: boolean;
    isSticky?: boolean;
  }) => {
    if (!discussionDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(`${FORUM_DISCUSSIONS_URL}/${discussionDetail.id}`, {
        ...patch,
        reason: reason.trim() || undefined,
      });
      setDiscussionDetail(res.data?.data || null);
      setReason('');
      showSuccessToast(res.data?.message || 'Discussion updated');
      await load('discussions', query, status);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update discussion'));
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!discussionDetail) return;
    setSaving(true);
    try {
      const res = await api.delete(
        `${FORUM_DISCUSSIONS_URL}/${discussionDetail.id}/comments/${commentId}`
      );
      setDiscussionDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || 'Comment removed');
      await load('discussions', query, status);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to remove comment'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (view === 'groups') {
      if (!visibleGroups.length) {
        showErrorToast('There is nothing to export in this view');
        return;
      }
      downloadCsv(
        `forum-groups-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          'Group',
          'Status',
          'Owner',
          'Owner handle',
          'Members',
          'Banned members',
          'Moderators',
          'Discussions',
          'Removed discussions',
          'Locked',
          'Pinned',
          'Comments',
          'Removed comments',
          'Likes',
          'Created',
          'Last activity',
          'Group ID',
        ],
        visibleGroups.map((group) => [
          group.name,
          group.status,
          group.owner?.name || '',
          group.owner?.handle || '',
          group.memberCount,
          group.bannedMemberCount,
          group.moderatorCount,
          group.discussionCount,
          group.removedDiscussionCount,
          group.lockedDiscussionCount,
          group.pinnedDiscussionCount,
          group.commentCount,
          group.removedCommentCount,
          group.likeCount,
          group.createdAt || '',
          group.lastActivityAt || '',
          group.id,
        ])
      );
      return;
    }
    if (!visibleDiscussions.length) {
      showErrorToast('There is nothing to export in this view');
      return;
    }
    downloadCsv(
      `forum-discussions-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Discussion',
        'Group',
        'Author',
        'Author handle',
        'Status',
        'Locked',
        'Pinned',
        'Comments',
        'Removed comments',
        'Likes',
        'Saves',
        'Created',
        'Last activity',
        'Discussion ID',
      ],
      visibleDiscussions.map((item) => [
        item.title,
        item.groupName || '',
        item.author?.name || '',
        item.author?.handle || '',
        item.status,
        item.isLocked ? 'yes' : 'no',
        item.isSticky ? 'yes' : 'no',
        item.commentCount,
        item.removedCommentCount,
        item.likeCount,
        item.saveCount,
        item.createdAt || '',
        item.lastActivityAt || '',
        item.id,
      ])
    );
  };

  if (!available && !loading) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-4 text-white">Forum content unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">
          Set MONGODB_URI in backend/.env to manage groups, discussions and comments.
        </p>
      </div>
    );
  }

  const count = view === 'groups' ? visibleGroups.length : visibleDiscussions.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Groups"
          value={formatNumber(stats?.groups.total ?? 0)}
          hint={`${formatNumber(stats?.groups.active ?? 0)} active · ${formatNumber(stats?.groups.archived ?? 0)} archived`}
        />
        <StatTile
          label="Members in groups"
          value={formatNumber(stats?.members.total ?? 0)}
          hint={`${formatNumber(stats?.members.banned ?? 0)} banned from a group`}
        />
        <StatTile
          label="Discussions"
          value={formatNumber(stats?.discussions.total ?? 0)}
          hint={`${formatNumber(stats?.discussions.removed ?? 0)} removed · ${formatNumber(stats?.discussions.locked ?? 0)} locked · ${formatNumber(stats?.discussions.pinned ?? 0)} pinned`}
        />
        <StatTile
          label="Comments"
          value={formatNumber(stats?.comments.visible ?? 0)}
          hint={`${formatNumber(stats?.comments.removed ?? 0)} removed by moderators`}
        />
      </div>

      <div className="inline-flex gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {(
          [
            { id: 'discussions' as const, label: 'Discussions', icon: MessagesSquare },
            { id: 'groups' as const, label: 'Groups', icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchView(id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              view === id ? theme.tabOn : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-4 w-4 ${view === id ? theme.tabIcon : ''}`} />
            {label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                view === 'groups' ? 'Search name, description, tag…' : 'Search title or body…'
              }
              className={`w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-9 text-sm text-white outline-none focus:ring-2 ${theme.focus}`}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">
            {formatNumber(count)} {view === 'groups' ? 'group' : 'discussion'}
            {count === 1 ? '' : 's'}
            {stats?.lastActivityAt ? ` · last activity ${formatRelative(stats.lastActivityAt)}` : ''}
          </p>
          <div className="hidden flex-1 lg:block" />
          <button
            type="button"
            onClick={() => void load(view, query, status)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <TableFilterBar
            filters={[
              {
                id: 'status',
                label: 'Status',
                value: status,
                options:
                  view === 'groups'
                    ? [
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Archived' },
                      ]
                    : [
                        { value: 'active', label: 'Visible' },
                        { value: 'removed', label: 'Removed' },
                        { value: 'locked', label: 'Locked' },
                        { value: 'pinned', label: 'Pinned' },
                      ],
              },
            ]}
            sort={{
              value: sortBy,
              options:
                view === 'groups'
                  ? [
                      { value: 'recent', label: 'Recent activity' },
                      { value: 'created', label: 'Newest group' },
                      { value: 'members', label: 'Most members' },
                      { value: 'discussions', label: 'Most discussions' },
                      { value: 'flagged', label: 'Most removed posts' },
                      { value: 'name', label: 'Name A–Z' },
                    ]
                  : [
                      { value: 'recent', label: 'Recent activity' },
                      { value: 'created', label: 'Newest post' },
                      { value: 'comments', label: 'Most comments' },
                      { value: 'likes', label: 'Most likes' },
                      { value: 'name', label: 'Title A–Z' },
                    ],
            }}
            onFilterChange={(id, value) => {
              if (id === 'status') setStatus(value);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setStatus('all');
              setSortBy('recent');
              setSearch('');
            }}
          />
        </div>

        {error ? (
          <p className="px-4 py-14 text-center text-sm text-rose-300">{error}</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading forum
          </div>
        ) : view === 'groups' ? (
          <GroupsTable groups={visibleGroups} onOpen={openGroup} />
        ) : (
          <DiscussionsTable discussions={visibleDiscussions} onOpen={openDiscussion} />
        )}
      </section>

      {(groupDetail || discussionDetail || detailLoading) && (
        <DetailOverlay onClose={closeDetail}>
          {detailLoading || (!groupDetail && !discussionDetail) ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading details
            </div>
          ) : groupDetail ? (
            <GroupDetail
              group={groupDetail}
              saving={saving}
              reason={reason}
              onReasonChange={setReason}
              memberFilter={memberFilter}
              onMemberFilterChange={setMemberFilter}
              onClose={closeDetail}
              onStatusChange={saveGroupStatus}
              onMemberBan={saveMemberBan}
              onOpenDiscussion={openDiscussion}
            />
          ) : discussionDetail ? (
            <DiscussionDetail
              discussion={discussionDetail}
              saving={saving}
              reason={reason}
              onReasonChange={setReason}
              onClose={closeDetail}
              onSave={saveDiscussion}
              onRemoveComment={removeComment}
              onOpenGroup={openGroup}
            />
          ) : null}
        </DetailOverlay>
      )}
    </div>
  );
}

function GroupsTable({
  groups,
  onOpen,
}: {
  groups: ForumGroup[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Group</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Members</th>
            <th className="px-4 py-3 text-right">Discussions</th>
            <th className="px-4 py-3 text-right">Comments</th>
            <th className="px-4 py-3">Moderation</th>
            <th className="px-4 py-3">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.id}
              className="cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02]"
              onClick={() => onOpen(group.id)}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-white">{group.name}</p>
                <p className="max-w-xs truncate text-[11px] text-zinc-600">
                  {group.description || 'No description'}
                </p>
                {tagList(group.tags).length ? (
                  <p className="mt-0.5 max-w-xs truncate text-[10px] text-zinc-600">
                    {tagList(group.tags).join(' · ')}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-200">{group.owner?.name || 'No owner'}</p>
                <p className="text-[10px] text-zinc-600">
                  {group.owner?.handle ? `@${group.owner.handle}` : '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <StatePill value={group.status}>
                  {group.status === 'active' ? 'Active' : 'Archived'}
                </StatePill>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-zinc-200">{formatNumber(group.memberCount)}</p>
                <p className="text-[10px] text-zinc-600">
                  {group.moderatorCount + group.adminCount} staff
                  {group.bannedMemberCount ? ` · ${group.bannedMemberCount} banned` : ''}
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-zinc-200">
                  {formatNumber(group.activeDiscussionCount)}
                </p>
                <p className="text-[10px] text-zinc-600">
                  of {formatNumber(group.discussionCount)} total
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-zinc-200">{formatNumber(group.commentCount)}</p>
                <p className="text-[10px] text-zinc-600">{formatNumber(group.likeCount)} likes</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {group.removedDiscussionCount ? (
                    <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">
                      {group.removedDiscussionCount} removed
                    </span>
                  ) : null}
                  {group.lockedDiscussionCount ? (
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">
                      {group.lockedDiscussionCount} locked
                    </span>
                  ) : null}
                  {group.removedCommentCount ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {group.removedCommentCount} comments cut
                    </span>
                  ) : null}
                  {!group.removedDiscussionCount &&
                  !group.lockedDiscussionCount &&
                  !group.removedCommentCount ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80">
                      <CheckCircle2 className="h-3 w-3" />
                      Clear
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-xs text-zinc-400">{formatShortDateTime(group.lastActivityAt)}</p>
                <p className="text-[10px] text-zinc-600">created {formatRelative(group.createdAt)}</p>
              </td>
            </tr>
          ))}
          {groups.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                No groups match this view.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DiscussionsTable({
  discussions,
  onOpen,
}: {
  discussions: ForumDiscussion[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Discussion</th>
            <th className="px-4 py-3">Author</th>
            <th className="px-4 py-3">Group</th>
            <th className="px-4 py-3 text-right">Comments</th>
            <th className="px-4 py-3 text-right">Engagement</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {discussions.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02]"
              onClick={() => onOpen(item.id)}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-white">{item.title}</p>
                <p className="max-w-sm truncate text-[11px] text-zinc-600">
                  {item.description || 'No body'}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-200">{item.author?.name || 'Unknown'}</p>
                <p className="text-[10px] text-zinc-600">
                  {item.author?.handle ? `@${item.author.handle}` : '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-300">{item.groupName || '—'}</p>
                {item.groupStatus && item.groupStatus !== 'active' ? (
                  <p className="text-[10px] text-amber-200/80">group archived</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-zinc-200">{formatNumber(item.commentCount)}</p>
                {item.removedCommentCount ? (
                  <p className="text-[10px] text-rose-200/80">
                    {item.removedCommentCount} removed
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-zinc-200">{formatNumber(item.likeCount)} likes</p>
                <p className="text-[10px] text-zinc-600">{formatNumber(item.saveCount)} saves</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {discussionState(item).map((state) => (
                    <StatePill key={state} value={state}>
                      {state}
                    </StatePill>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-xs text-zinc-400">{formatShortDateTime(item.lastActivityAt)}</p>
                <p className="text-[10px] text-zinc-600">posted {formatRelative(item.createdAt)}</p>
              </td>
            </tr>
          ))}
          {discussions.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                No discussions match this view.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DetailOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-10 md:pl-[260px]">
      <button type="button" className="fixed inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function DetailHeader({
  eyebrow,
  title,
  subtitle,
  chips,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  chips?: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 rounded-t-2xl border-b border-white/[0.06] bg-[#12131a]/95 px-6 py-5 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
          {chips ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div> : null}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function ReasonField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Reason for the activity log (optional)
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder={hint}
        className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-rose-500/15"
      />
    </label>
  );
}

function GroupDetail({
  group,
  saving,
  reason,
  onReasonChange,
  memberFilter,
  onMemberFilterChange,
  onClose,
  onStatusChange,
  onMemberBan,
  onOpenDiscussion,
}: {
  group: ForumGroup;
  saving: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  memberFilter: string;
  onMemberFilterChange: (value: string) => void;
  onClose: () => void;
  onStatusChange: (status: 'active' | 'inactive') => void;
  onMemberBan: (member: ForumMember) => void;
  onOpenDiscussion: (id: string) => void;
}) {
  const members = useMemo(() => group.members || [], [group.members]);
  const filteredMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        String(member.name || '').toLowerCase().includes(q) ||
        String(member.handle || '').toLowerCase().includes(q) ||
        String(member.role || '').toLowerCase().includes(q)
    );
  }, [members, memberFilter]);

  return (
    <>
      <DetailHeader
        eyebrow="Forum group"
        title={group.name}
        subtitle={
          <>
            Created {formatDateTime(group.createdAt)} · last activity{' '}
            {formatRelative(group.lastActivityAt)}
            {group.deletedAt ? ` · archived ${formatRelative(group.deletedAt)}` : ''}
          </>
        }
        chips={
          <>
            <StatePill value={group.status}>
              {group.status === 'active' ? 'Active' : 'Archived'}
            </StatePill>
            {group.owner ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300">
                <Crown className="h-3 w-3 text-amber-300" />
                {personLabel(group.owner)}
              </span>
            ) : null}
            {tagList(group.tags).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </>
        }
        onClose={onClose}
      />

      <div className="space-y-6 px-6 py-5">
        <p className="text-sm leading-relaxed text-zinc-300">
          {group.description || 'No description.'}
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric
            label="Members"
            value={
              <>
                {formatNumber(group.memberCount)}
                <span className="ml-1.5 text-xs text-zinc-500">
                  {group.adminCount} admin · {group.moderatorCount} mod
                </span>
              </>
            }
          />
          <Metric label="Banned members" value={formatNumber(group.bannedMemberCount)} />
          <Metric
            label="Discussions"
            value={
              <>
                {formatNumber(group.activeDiscussionCount)}
                <span className="ml-1.5 text-xs text-zinc-500">
                  of {formatNumber(group.discussionCount)}
                </span>
              </>
            }
          />
          <Metric label="Removed discussions" value={formatNumber(group.removedDiscussionCount)} />
          <Metric
            label="Locked · pinned"
            value={`${formatNumber(group.lockedDiscussionCount)} · ${formatNumber(group.pinnedDiscussionCount)}`}
          />
          <Metric
            label="Comments"
            value={
              <>
                {formatNumber(group.commentCount)}
                <span className="ml-1.5 text-xs text-zinc-500">
                  {formatNumber(group.removedCommentCount)} removed
                </span>
              </>
            }
          />
        </div>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              Member roster ({formatNumber(members.length)})
            </h3>
            {members.length > 6 ? (
              <input
                value={memberFilter}
                onChange={(event) => onMemberFilterChange(event.target.value)}
                placeholder="Filter members…"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none"
              />
            ) : null}
          </div>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filteredMembers.map((member) => (
              <li
                key={String(member.userId)}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {member.name}
                    {member.handle ? (
                      <span className="ml-1.5 text-xs text-zinc-500">@{member.handle}</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      {member.role === 'Admin' ? (
                        <Crown className="h-3 w-3 text-amber-300" />
                      ) : member.role === 'Moderator' ? (
                        <Shield className="h-3 w-3 text-sky-300" />
                      ) : null}
                      {member.role}
                    </span>
                    {member.joinedAt ? ` · joined ${formatRelative(member.joinedAt)}` : ''}
                    {member.isBanned
                      ? ` · banned${member.bannedAt ? ` ${formatRelative(member.bannedAt)}` : ''}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onMemberBan(member)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${
                    member.isBanned
                      ? 'border-white/10 text-zinc-200 hover:bg-white/5'
                      : 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10'
                  }`}
                >
                  {member.isBanned ? <Undo2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  {member.isBanned ? 'Unban' : 'Ban'}
                </button>
              </li>
            ))}
            {filteredMembers.length === 0 ? (
              <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                {members.length ? 'No members match that filter.' : 'This group has no members.'}
              </li>
            ) : null}
          </ul>
        </section>

        {(group.discussions || []).length ? (
          <section>
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <MessagesSquare className="h-3.5 w-3.5 text-zinc-500" />
              Discussions in this group
            </h3>
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {(group.discussions || []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDiscussion(item.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{item.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {personLabel(item.author)} · {formatNumber(item.commentCount)} comments ·{' '}
                        {formatRelative(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {discussionState(item).map((state) => (
                        <StatePill key={state} value={state}>
                          {state}
                        </StatePill>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <p className="text-sm font-medium text-rose-100">Group visibility</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Archiving takes the group and all of its discussions out of the public forums. Nothing is
            deleted, so reactivating brings everything back.
          </p>
          <div className="mt-3 space-y-3">
            <ReasonField
              value={reason}
              onChange={onReasonChange}
              hint="Why is this group being archived or restored?"
            />
            <div className="flex justify-end">
              {group.status === 'active' ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onStatusChange('inactive')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Archive group'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onStatusChange('active')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Reactivate group'}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function DiscussionDetail({
  discussion,
  saving,
  reason,
  onReasonChange,
  onClose,
  onSave,
  onRemoveComment,
  onOpenGroup,
}: {
  discussion: ForumDiscussion;
  saving: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSave: (patch: { status?: string; isLocked?: boolean; isSticky?: boolean }) => void;
  onRemoveComment: (commentId: string) => void;
  onOpenGroup: (id: string) => void;
}) {
  const comments = discussion.comments || [];
  const [showRemoved, setShowRemoved] = useState(true);
  const visibleComments = showRemoved ? comments : comments.filter((c) => !c.isDeleted);

  return (
    <>
      <DetailHeader
        eyebrow="Forum discussion"
        title={discussion.title}
        subtitle={
          <>
            {personLabel(discussion.author)} · posted {formatDateTime(discussion.createdAt)}
            {discussion.updatedAt ? ` · edited ${formatRelative(discussion.updatedAt)}` : ''}
            {discussion.removedAt ? ` · removed ${formatRelative(discussion.removedAt)}` : ''}
          </>
        }
        chips={
          <>
            {discussionState(discussion).map((state) => (
              <StatePill key={state} value={state}>
                {state}
              </StatePill>
            ))}
            {discussion.groupId ? (
              <button
                type="button"
                onClick={() => onOpenGroup(discussion.groupId as string)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/[0.06]"
              >
                <ArrowLeft className="h-3 w-3" />
                {discussion.groupName || 'Group'}
              </button>
            ) : null}
            {tagList(discussion.tags).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </>
        }
        onClose={onClose}
      />

      <div className="space-y-6 px-6 py-5">
        <p className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm leading-relaxed text-zinc-300">
          {discussion.description || 'No body.'}
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric
            label="Comments"
            value={
              <>
                {formatNumber(discussion.commentCount)}
                <span className="ml-1.5 text-xs text-zinc-500">
                  {formatNumber(discussion.removedCommentCount)} removed
                </span>
              </>
            }
          />
          <Metric
            label="Engagement"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-300" />
                {formatNumber(discussion.likeCount)}
                <span className="text-xs text-zinc-500">
                  · {formatNumber(discussion.saveCount)} saves
                </span>
              </span>
            }
          />
          <Metric
            label="Last comment"
            value={
              discussion.lastCommentAt ? formatRelative(discussion.lastCommentAt) : 'No comments yet'
            }
          />
        </div>

        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-white">Moderation actions</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Locking keeps the discussion readable but stops new replies. Removing hides it from the
            forums while keeping it stored for audit. Both are logged against the author.
          </p>
          <div className="mt-3 space-y-3">
            <ReasonField
              value={reason}
              onChange={onReasonChange}
              hint="Which rule does this breach, or why is it being restored?"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => onSave({ isLocked: !discussion.isLocked })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50"
              >
                {discussion.isLocked ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {discussion.isLocked ? 'Unlock replies' : 'Lock replies'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSave({ isSticky: !discussion.isSticky })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5 disabled:opacity-50"
              >
                {discussion.isSticky ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
                {discussion.isSticky ? 'Unpin' : 'Pin to top'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSave({ status: discussion.status === 'removed' ? 'active' : 'removed' })}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${
                  discussion.status === 'removed'
                    ? 'border-white/10 text-white hover:bg-white/5'
                    : 'border-rose-500/40 text-rose-100 hover:bg-rose-500/10'
                }`}
              >
                {discussion.status === 'removed' ? (
                  <Undo2 className="h-3.5 w-3.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {discussion.status === 'removed' ? 'Restore post' : 'Remove post'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
              Comment thread ({formatNumber(comments.length)})
            </h3>
            {discussion.removedCommentCount ? (
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={showRemoved}
                  onChange={(event) => setShowRemoved(event.target.checked)}
                  className="h-3.5 w-3.5 accent-rose-500"
                />
                Show removed comments
              </label>
            ) : null}
          </div>
          <ul className="mt-2 space-y-2">
            {visibleComments.map((comment) => (
              <li
                key={comment.commentId}
                className={`rounded-xl border px-3 py-2.5 ${
                  comment.isDeleted
                    ? 'border-white/[0.04] bg-white/[0.01]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300">
                      {personLabel(comment.author)}
                      {comment.replyToCommentId ? (
                        <span className="ml-1.5 text-[10px] text-zinc-600">in reply</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {formatShortDateTime(comment.createdAt)}
                      {comment.likeCount ? ` · ${formatNumber(comment.likeCount)} likes` : ''}
                      {comment.replyCount ? ` · ${formatNumber(comment.replyCount)} replies` : ''}
                      {comment.isDeleted && comment.deletedAt
                        ? ` · removed ${formatRelative(comment.deletedAt)}`
                        : ''}
                    </p>
                  </div>
                  {comment.isDeleted ? (
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">
                      Removed
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRemoveComment(comment.commentId)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
                <p
                  className={`mt-1.5 whitespace-pre-wrap break-words text-sm ${comment.isDeleted ? 'italic text-zinc-600' : 'text-zinc-200'}`}
                >
                  {comment.comment}
                </p>
              </li>
            ))}
            {visibleComments.length === 0 ? (
              <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                No comments on this discussion.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
