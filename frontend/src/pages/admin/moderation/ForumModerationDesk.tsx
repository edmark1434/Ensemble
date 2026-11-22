import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  Bookmark,
  CheckCircle2,
  CornerDownRight,
  Crown,
  Download,
  ExternalLink,
  EyeOff,
  Heart,
  History,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Shield,
  Tag,
  Undo2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import { staffPlatformViewHref } from '@/lib/staffRoutes';
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
import {
  AvatarStack,
  ForumAvatar,
  ForumImageGrid,
  ForumMarkdown,
  GroupImage,
  PersonBadges,
  PersonLine,
  forumTimeAgo,
} from './forumDeskUi';

type ForumPerson = {
  userId: string | number | null;
  accountId?: string | null;
  name: string | null;
  handle: string | null;
  /** Storage path of the member's avatar, as the member forum shows it. */
  avatarUrl?: string | null;
  isVerified?: boolean;
  subscriptionPlan?: string | null;
};

type ForumMember = ForumPerson & {
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  joinedAt: string | null;
};

/** An earlier version of a comment: the text before an edit, or what its author deleted. */
type ForumCommentRevision = {
  kind: 'edited' | 'deleted';
  comment: string | null;
  images?: string[];
  by: ForumPerson | null;
  recordedAt: string | null;
};

type ForumComment = {
  commentId: string;
  comment: string;
  replyToCommentId: string | null;
  replyCount: number;
  author: ForumPerson;
  likeCount: number;
  attachmentCount: number;
  images?: string[];
  isEdited?: boolean;
  /** Staff-only history, oldest first. */
  revisions?: ForumCommentRevision[];
  isDeleted: boolean;
  deletedAt: string | null;
  removedBy?: string | null;
  removalReason?: string | null;
  canRestore?: boolean;
  restoreBlockedReason?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ForumDiscussion = {
  id: string;
  title: string;
  description: string | null;
  /** Plain-text start of the post body (lists). */
  excerpt?: string | null;
  /** Full post body as written, Markdown (detail only). */
  content?: string | null;
  /** First few image paths (lists) or all of them (detail). */
  images?: string[];
  imageCount?: number;
  groupId: string | null;
  groupName?: string | null;
  groupStatus?: string | null;
  groupImageUrl?: string | null;
  author: ForumPerson;
  tags?: ForumTag[];
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
  removedBy?: string | null;
  removalReason?: string | null;
  canRestore?: boolean;
  restoreBlockedReason?: string | null;
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
  tags: ForumTag[];
  memberCount: number;
  /** Owner first, then other members (list only). */
  memberPreview?: (ForumPerson & { role: string })[];
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
  archivedBy?: string | null;
  archiveReason?: string | null;
  canReactivate?: boolean;
  reactivateBlockedReason?: string | null;
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
type Layout = 'cards' | 'table';

/** Discussion tags carry `tag_name`; group tags carry `tag`. */
type ForumTag = { tag_name?: string; tag?: string } | string;

function tagLabel(tag: ForumTag) {
  return typeof tag === 'string' ? tag : tag.tag_name || tag.tag || '';
}

function tagList(tags?: ForumTag[]) {
  return (tags || []).map(tagLabel).filter(Boolean);
}

/** Card or table layout is a per-browser preference. */
const LAYOUT_KEY = 'forumDesk.layout';

function readLayout(): Layout {
  try {
    return window.localStorage.getItem(LAYOUT_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

function saveLayout(layout: Layout) {
  try {
    window.localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}

/** Where members see this content, or why they can't right now. */
function memberVisibility(kind: 'discussion' | 'group', item: ForumDiscussion | ForumGroup) {
  if (kind === 'group') {
    return (item as ForumGroup).status === 'active' ? null : 'Archived: members cannot open this group.';
  }
  const discussion = item as ForumDiscussion;
  if (discussion.status === 'removed') return 'Removed: members cannot open this discussion.';
  if (discussion.groupStatus && discussion.groupStatus !== 'active') {
    return 'Its group is archived, so members cannot open it.';
  }
  return null;
}

/**
 * Opens the member page in this console's platform view (new tab), so staff see the
 * discussion or group exactly as members do while this desk stays open.
 */
function MemberViewLink({
  consolePath,
  memberPath,
  hiddenReason,
  compact = false,
}: {
  consolePath: string;
  memberPath: string;
  hiddenReason?: string | null;
  compact?: boolean;
}) {
  const label = compact ? 'Member view' : 'Open as member';
  return (
    <Link
      to={staffPlatformViewHref(consolePath, memberPath)}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={hiddenReason || 'See this page the way members do (opens platform view)'}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/20 hover:text-white ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <ExternalLink className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {label}
    </Link>
  );
}

/** The state words that matter on a discussion row, in one line. */
function discussionState(item: ForumDiscussion) {
  const parts = [item.status === 'removed' ? 'Removed' : 'Visible'];
  if (item.isLocked) parts.push('Locked');
  if (item.isSticky) parts.push('Pinned');
  return parts;
}

/** Who took content down. Only the author's own delete cannot be restored. */
const REMOVED_BY_LABEL: Record<string, string> = {
  author: 'Deleted by its author',
  discussion_owner: 'Removed by the discussion author',
  group_moderator: 'Removed by a group moderator',
  staff: 'Removed by staff',
};

function removedByLabel(value?: string | null) {
  return value ? REMOVED_BY_LABEL[value] || 'Removed' : 'Removed (source not recorded)';
}

function archivedByLabel(value?: string | null) {
  if (value === 'owner') return 'Deleted by its owner';
  if (value === 'staff') return 'Archived by staff';
  return 'Archived (source not recorded)';
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
  openTarget = null,
  onDetailClose,
}: {
  /** Root of this console's forum routes, without a trailing slash. */
  apiBase: string;
  initialView?: View;
  /** Admin Management uses rose; Forum Moderator console uses violet. */
  accent?: DeskAccent;
  /** Optional sync when the desk toggles Discussions ↔ Groups. */
  onViewChange?: (view: View) => void;
  /** Opens this group or discussion when it changes (deep links such as `?discussion=`). */
  openTarget?: { kind: 'group' | 'discussion'; id: string } | null;
  /** Called when the open group or discussion is closed. */
  onDetailClose?: () => void;
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
  const [layout, setLayout] = useState<Layout>(readLayout);
  const { pathname: consolePath } = useLocation();
  const firstLoad = useRef(true);

  const changeLayout = (next: Layout) => {
    setLayout(next);
    saveLayout(next);
  };

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
    onDetailClose?.();
  };

  // A deep link opens its group or discussion once; the same link opens it again after a close.
  const openedTarget = useRef<string | null>(null);
  useEffect(() => {
    if (!openTarget?.id) {
      openedTarget.current = null;
      return;
    }
    const key = `${openTarget.kind}:${openTarget.id}`;
    if (openedTarget.current === key) return;
    openedTarget.current = key;
    if (openTarget.kind === 'group') void openGroup(openTarget.id);
    else void openDiscussion(openTarget.id);
    // openGroup / openDiscussion only read the API roots, which the target change already covers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTarget?.kind, openTarget?.id]);

  // Live: new posts, comments, members, reports and other staff actions update the list and
  // the open group or discussion. Filters, sort and the typed reason stay.
  useStaffLive(
    ['forum', 'reports', 'moderation', 'accounts'],
    async () => {
      const openGroupId = groupDetail?.id;
      const openDiscussionId = discussionDetail?.id;
      await Promise.all([
        load(view, query, status),
        openGroupId
          ? api
              .get(`${FORUM_GROUPS_URL}/${openGroupId}`)
              .then((res) => {
                const next = res.data?.data;
                if (next) setGroupDetail((current) => (current?.id === openGroupId ? next : current));
              })
              .catch(() => undefined)
          : null,
        openDiscussionId
          ? api
              .get(`${FORUM_DISCUSSIONS_URL}/${openDiscussionId}`)
              .then((res) => {
                const next = res.data?.data;
                if (next) setDiscussionDetail((current) => (current?.id === openDiscussionId ? next : current));
              })
              .catch(() => undefined)
          : null,
      ]);
    },
    { enabled: !saving, delayMs: 1200 },
  );

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

  // Hiding keeps the comment's text on the server, so restore can bring it back.
  const setCommentHidden = async (commentId: string, hidden: boolean) => {
    if (!discussionDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(
        `${FORUM_DISCUSSIONS_URL}/${discussionDetail.id}/comments/${commentId}`,
        { hidden, reason: reason.trim() || undefined }
      );
      setDiscussionDetail(res.data?.data || null);
      setReason('');
      showSuccessToast(res.data?.message || (hidden ? 'Comment hidden' : 'Comment restored'));
      await load('discussions', query, status);
    } catch (err) {
      showErrorToast(apiMessage(err, hidden ? 'Failed to hide comment' : 'Failed to restore comment'));
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
          hint={`${formatNumber(stats?.comments.removed ?? 0)} hidden or deleted`}
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
          <div role="group" aria-label="Layout" className="inline-flex rounded-xl border border-white/[0.08] p-0.5">
            {(
              [
                { id: 'cards' as const, label: 'Member view', icon: LayoutGrid },
                { id: 'table' as const, label: 'Table', icon: List },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={layout === id}
                onClick={() => changeLayout(id)}
                title={id === 'cards' ? 'Cards laid out like the member forum' : 'Compact table with every count'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  layout === id ? theme.tabOn : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${layout === id ? theme.tabIcon : ''}`} />
                {label}
              </button>
            ))}
          </div>
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
          layout === 'cards' ? (
            <GroupCards groups={visibleGroups} onOpen={openGroup} consolePath={consolePath} />
          ) : (
            <GroupsTable groups={visibleGroups} onOpen={openGroup} />
          )
        ) : layout === 'cards' ? (
          <DiscussionCards
            discussions={visibleDiscussions}
            onOpen={openDiscussion}
            onOpenGroup={openGroup}
            consolePath={consolePath}
          />
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
              consolePath={consolePath}
            />
          ) : discussionDetail ? (
            <DiscussionDetail
              discussion={discussionDetail}
              saving={saving}
              reason={reason}
              onReasonChange={setReason}
              onClose={closeDetail}
              onSave={saveDiscussion}
              onCommentHidden={setCommentHidden}
              onOpenGroup={openGroup}
              consolePath={consolePath}
            />
          ) : null}
        </DetailOverlay>
      )}
    </div>
  );
}

/** Enter / Space open a card, unless the key was meant for a control inside it. */
function openOnKey(event: ReactKeyboardEvent, open: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    open();
  }
}

function EmptyCards({ children }: { children: ReactNode }) {
  return <p className="px-4 py-14 text-center text-sm text-zinc-500">{children}</p>;
}

/** Only the states worth flagging on a card: visible is the normal case. */
function flaggedStates(item: ForumDiscussion) {
  return discussionState(item).filter((state) => state !== 'Visible');
}

/**
 * Discussions laid out like the member forum feed (author, group, title, body, images,
 * likes / replies / saves), with the moderation state on top so nothing is missed.
 */
function DiscussionCards({
  discussions,
  onOpen,
  onOpenGroup,
  consolePath,
}: {
  discussions: ForumDiscussion[];
  onOpen: (id: string) => void;
  onOpenGroup: (id: string) => void;
  consolePath: string;
}) {
  if (!discussions.length) return <EmptyCards>No discussions match this view.</EmptyCards>;
  return (
    <ul className="grid gap-3 p-4 xl:grid-cols-2">
      {discussions.map((item) => {
        const removed = item.status === 'removed';
        const tags = tagList(item.tags);
        const states = flaggedStates(item);
        return (
          <li key={item.id} className="min-w-0">
            <article
              tabIndex={0}
              onClick={() => onOpen(item.id)}
              onKeyDown={(event) => openOnKey(event, () => onOpen(item.id))}
              aria-label={`Review discussion ${item.title}`}
              className={`flex h-full cursor-pointer flex-col rounded-xl border p-4 transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                removed
                  ? 'border-rose-500/25 bg-rose-500/[0.03]'
                  : item.isSticky
                    ? 'border-violet-500/25 bg-[#101117]'
                    : 'border-white/[0.08] bg-[#101117]'
              }`}
            >
              <div className="flex items-start gap-3">
                <ForumAvatar person={item.author} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate text-sm font-medium text-white">
                        {item.author?.name || 'Unknown member'}
                      </span>
                      <PersonBadges person={item.author} />
                    </span>
                    {item.author?.handle ? (
                      <span className="text-[11px] text-zinc-500">@{item.author.handle}</span>
                    ) : null}
                    <span className="text-[11px] text-zinc-500">· {forumTimeAgo(item.createdAt)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {item.groupId ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenGroup(item.groupId as string);
                        }}
                        title="Open this group"
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        <GroupImage
                          name={item.groupName || 'Group'}
                          imageUrl={item.groupImageUrl}
                          size="xs"
                          circle
                        />
                        <span className="truncate">{item.groupName || 'Group'}</span>
                        {item.groupStatus && item.groupStatus !== 'active' ? (
                          <span className="text-amber-200/80">· archived</span>
                        ) : null}
                      </button>
                    ) : null}
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                    {tags.length > 3 ? (
                      <span className="text-[10px] text-zinc-500">+{tags.length - 3}</span>
                    ) : null}
                  </div>
                </div>
                {states.length ? (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {states.map((state) => (
                      <StatePill key={state} value={state}>
                        {state}
                      </StatePill>
                    ))}
                  </div>
                ) : null}
              </div>

              <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-white">{item.title}</h3>
              {item.excerpt ? (
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-400">{item.excerpt}</p>
              ) : (
                <p className="mt-1 text-sm italic text-zinc-600">No body text</p>
              )}
              {item.images?.length ? (
                <div className="mt-3">
                  <ForumImageGrid images={item.images} total={item.imageCount} compact />
                </div>
              ) : null}
              {removed ? (
                <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1.5 text-[11px] text-rose-100/90">
                  {removedByLabel(item.removedBy)}
                  {item.removalReason ? ` · “${item.removalReason}”` : ''}
                </p>
              ) : null}

              <div className="min-h-3 flex-1" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5" title="Likes">
                  <Heart className="h-3.5 w-3.5" />
                  {formatNumber(item.likeCount)}
                </span>
                <span className="inline-flex items-center gap-1.5" title="Replies">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {formatNumber(item.commentCount)} replies
                  {item.removedCommentCount ? (
                    <span className="text-rose-200/80">· {formatNumber(item.removedCommentCount)} hidden</span>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1.5" title="Saves">
                  <Bookmark className="h-3.5 w-3.5" />
                  {formatNumber(item.saveCount)}
                </span>
                <span className="text-[11px] text-zinc-600">active {formatRelative(item.lastActivityAt)}</span>
                <span className="flex-1" />
                <MemberViewLink
                  compact
                  consolePath={consolePath}
                  memberPath={`/forums/discussion/${item.id}`}
                  hiddenReason={memberVisibility('discussion', item)}
                />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** Groups laid out like the member forum's group cards, plus their moderation counts. */
function GroupCards({
  groups,
  onOpen,
  consolePath,
}: {
  groups: ForumGroup[];
  onOpen: (id: string) => void;
  consolePath: string;
}) {
  if (!groups.length) return <EmptyCards>No groups match this view.</EmptyCards>;
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const archived = group.status !== 'active';
        const tags = tagList(group.tags);
        const flagged =
          group.removedDiscussionCount || group.lockedDiscussionCount || group.removedCommentCount || group.bannedMemberCount;
        return (
          <li key={group.id} className="min-w-0">
            <article
              tabIndex={0}
              onClick={() => onOpen(group.id)}
              onKeyDown={(event) => openOnKey(event, () => onOpen(group.id))}
              aria-label={`Review group ${group.name}`}
              className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-[#101117] transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                archived ? 'border-amber-500/25' : 'border-white/[0.08]'
              }`}
            >
              <div className={`relative ${archived ? 'opacity-60' : ''}`}>
                <GroupImage name={group.name} imageUrl={group.imageUrl} variant="banner" />
                <span className="absolute right-2 top-2 rounded-full bg-black/55 backdrop-blur">
                  <StatePill value={group.status}>{archived ? 'Archived' : 'Active'}</StatePill>
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="truncate text-sm font-semibold text-white">{group.name}</h3>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-500">
                  {group.owner ? (
                    <>
                      <Crown className="h-3 w-3 shrink-0 text-amber-300" />
                      <ForumAvatar person={group.owner} size="xs" />
                      <span className="truncate text-zinc-300">{group.owner.name || 'Unknown owner'}</span>
                      <PersonBadges person={group.owner} />
                    </>
                  ) : (
                    <span>No owner</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {group.description || 'No description'}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-zinc-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-zinc-500" />
                    {formatNumber(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3 text-zinc-500" />
                    {formatNumber(group.activeDiscussionCount)}{' '}
                    {group.activeDiscussionCount === 1 ? 'discussion' : 'discussions'}
                  </span>
                  <span className="text-zinc-500">{formatNumber(group.commentCount)} replies</span>
                </div>
                {tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
                        {tag}
                      </span>
                    ))}
                    {tags.length > 3 ? (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500">
                        +{tags.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {archived ? (
                  <p className="mt-2.5 text-[11px] text-amber-200/80">
                    {archivedByLabel(group.archivedBy)}
                    {group.archiveReason ? ` · “${group.archiveReason}”` : ''}
                  </p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-1">
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
                      {group.removedCommentCount} comments hidden
                    </span>
                  ) : null}
                  {group.bannedMemberCount ? (
                    <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">
                      {group.bannedMemberCount} banned
                    </span>
                  ) : null}
                  {!flagged ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80">
                      <CheckCircle2 className="h-3 w-3" />
                      Clear
                    </span>
                  ) : null}
                </div>
                <div className="min-h-3 flex-1" />
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <AvatarStack people={group.memberPreview || []} total={group.memberCount} />
                  <span className="flex-1" />
                  <MemberViewLink
                    compact
                    consolePath={consolePath}
                    memberPath={`/forums/group/${group.id}`}
                    hiddenReason={memberVisibility('group', group)}
                  />
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  Active {formatRelative(group.lastActivityAt)} · created {formatRelative(group.createdAt)}
                </p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
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
                <div className="flex items-start gap-3">
                  <GroupImage name={group.name} imageUrl={group.imageUrl} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-white">{group.name}</p>
                    <p className="max-w-xs truncate text-[11px] text-zinc-600">
                      {group.description || 'No description'}
                    </p>
                    {tagList(group.tags).length ? (
                      <p className="mt-0.5 max-w-xs truncate text-[10px] text-zinc-600">
                        {tagList(group.tags).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {group.owner ? (
                  <PersonLine person={group.owner} fallback="Unknown owner" />
                ) : (
                  <p className="text-zinc-500">No owner</p>
                )}
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
                  {item.excerpt || item.description || 'No body text'}
                </p>
                {item.imageCount ? (
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {item.imageCount} image{item.imageCount === 1 ? '' : 's'}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <PersonLine person={item.author} fallback="Unknown" />
              </td>
              <td className="px-4 py-3">
                {item.groupName ? (
                  <span className="flex items-center gap-2">
                    <GroupImage name={item.groupName} imageUrl={item.groupImageUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-zinc-300">{item.groupName}</span>
                      {item.groupStatus && item.groupStatus !== 'active' ? (
                        <span className="block text-[10px] text-amber-200/80">group archived</span>
                      ) : null}
                    </span>
                  </span>
                ) : (
                  <p className="text-zinc-500">—</p>
                )}
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
  media,
  actions,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  chips?: ReactNode;
  /** Avatar or group picture beside the title. */
  media?: ReactNode;
  /** Buttons beside Close (for example Open as member). */
  actions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 rounded-t-2xl border-b border-white/[0.06] bg-[#12131a]/95 px-6 py-5 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {media ? <div className="shrink-0 pt-0.5">{media}</div> : null}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-bold leading-snug text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
            {chips ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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

/** "What members see" label above a preview block. */
function MemberViewCaption({ hiddenReason }: { hiddenReason?: string | null }) {
  return (
    <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      As members see it
      {hiddenReason ? (
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 normal-case tracking-normal text-amber-200">
          {hiddenReason}
        </span>
      ) : null}
    </p>
  );
}

function RoleChip({ role }: { role: string }) {
  if (role === 'Admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">
        <Crown className="h-2.5 w-2.5" />
        Owner
      </span>
    );
  }
  if (role === 'Moderator') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-200">
        <Shield className="h-2.5 w-2.5" />
        Moderator
      </span>
    );
  }
  return null;
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
  consolePath,
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
  consolePath: string;
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
  const tags = tagList(group.tags);
  const hiddenReason = memberVisibility('group', group);

  return (
    <>
      <DetailHeader
        eyebrow="Forum group"
        title={group.name}
        media={<GroupImage name={group.name} imageUrl={group.imageUrl} size="lg" />}
        actions={
          <MemberViewLink
            consolePath={consolePath}
            memberPath={`/forums/group/${group.id}`}
            hiddenReason={hiddenReason}
          />
        }
        subtitle={
          <>
            Created {formatDateTime(group.createdAt)} · last activity{' '}
            {formatRelative(group.lastActivityAt)}
            {group.deletedAt ? ` · archived ${formatRelative(group.deletedAt)}` : ''}
          </>
        }
        chips={
          <StatePill value={group.status}>
            {group.status === 'active' ? 'Active' : 'Archived'}
          </StatePill>
        }
        onClose={onClose}
      />

      <div className="space-y-6 px-6 py-5">
        <section>
          <MemberViewCaption hiddenReason={hiddenReason} />
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0f1016]">
            <GroupImage name={group.name} imageUrl={group.imageUrl} variant="banner" bannerHeight="h-32" />
            <div className="p-4">
              <p className="text-base font-semibold text-white">{group.name}</p>
              {group.owner ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
                  by
                  <ForumAvatar person={group.owner} size="xs" />
                  <span className="text-zinc-300">{group.owner.name || 'Unknown owner'}</span>
                  <PersonBadges person={group.owner} />
                  {group.owner.handle ? <span>@{group.owner.handle}</span> : null}
                </div>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {group.description || 'No description.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-zinc-300">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-zinc-500" />
                  {formatNumber(group.memberCount)} {group.memberCount === 1 ? 'member' : 'members'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3 text-zinc-500" />
                  {formatNumber(group.activeDiscussionCount)}{' '}
                  {group.activeDiscussionCount === 1 ? 'discussion' : 'discussions'}
                </span>
              </div>
              {tags.length ? (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

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
          <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {filteredMembers.map((member) => (
              <li
                key={String(member.userId)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  member.isBanned ? 'border-rose-500/20 bg-rose-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ForumAvatar person={member} size="md" className={member.isBanned ? 'opacity-60' : ''} />
                  <div className="min-w-0">
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-white">
                      <span className="truncate">{member.name}</span>
                      <PersonBadges person={member} />
                      <RoleChip role={member.role} />
                      {member.isBanned ? (
                        <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">
                          Banned
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {member.handle ? `@${member.handle}` : 'No handle'}
                      {member.joinedAt ? ` · joined ${formatRelative(member.joinedAt)}` : ''}
                      {member.isBanned && member.bannedAt ? ` · banned ${formatRelative(member.bannedAt)}` : ''}
                    </p>
                  </div>
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
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {(group.discussions || []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDiscussion(item.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left hover:bg-white/[0.04] ${
                      item.status === 'removed'
                        ? 'border-rose-500/20 bg-rose-500/[0.03]'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ForumAvatar person={item.author} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{item.title}</p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {personLabel(item.author)} · {formatNumber(item.commentCount)} replies ·{' '}
                          {forumTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {flaggedStates(item).map((state) => (
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
          {group.status !== 'active' ? (
            <p className="mt-2 text-xs text-zinc-300">
              {archivedByLabel(group.archivedBy)}
              {group.archiveReason ? ` · “${group.archiveReason}”` : ''}
            </p>
          ) : null}
          <div className="mt-3 space-y-3">
            <ReasonField
              value={reason}
              onChange={onReasonChange}
              hint="Why is this group being archived or restored?"
            />
            {group.status !== 'active' && group.canReactivate === false ? (
              <p className="text-xs text-amber-200/80">
                {group.reactivateBlockedReason || 'This group cannot be reactivated.'}
              </p>
            ) : null}
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
                  disabled={saving || group.canReactivate === false}
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

/** Replies nest under the comment they answer, like the member thread. */
function buildCommentTree(comments: ForumComment[]) {
  const ids = new Set(comments.map((comment) => comment.commentId));
  const children = new Map<string, ForumComment[]>();
  const roots: ForumComment[] = [];
  for (const comment of comments) {
    const parent = comment.replyToCommentId;
    if (parent && parent !== comment.commentId && ids.has(parent)) {
      children.set(parent, [...(children.get(parent) || []), comment]);
    } else {
      roots.push(comment);
    }
  }
  return { roots, children };
}

/** Deeper replies stop indenting here so long threads stay readable. */
const MAX_COMMENT_INDENT = 4;

function RevisionBody({ revision }: { revision: ForumCommentRevision }) {
  return (
    <>
      <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">
        {revision.comment || <span className="italic text-zinc-600">No text</span>}
      </p>
      {revision.images?.length ? (
        <div className="mt-2">
          <ForumImageGrid images={revision.images} compact />
        </div>
      ) : null}
    </>
  );
}

/**
 * Staff-only: what the author deleted (shown up front) and the text before
 * each edit (behind a toggle). Members never receive this history.
 */
function CommentHistory({ comment }: { comment: ForumComment }) {
  const [open, setOpen] = useState(false);
  const revisions = comment.revisions || [];
  if (!revisions.length) return null;

  const deleted = [...revisions].reverse().find((revision) => revision.kind === 'deleted') || null;
  const edits = revisions.filter((revision) => revision.kind === 'edited');

  return (
    <div className="mt-2 space-y-2 pl-9">
      {deleted ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-300/80">
            <Shield className="h-3 w-3" />
            Deleted by {deleted.by?.name || 'the author'}
            {deleted.recordedAt ? ` · ${formatDateTime(deleted.recordedAt)}` : ''}
            <span className="font-normal normal-case tracking-normal text-zinc-500">· staff only</span>
          </p>
          <RevisionBody revision={deleted} />
        </div>
      ) : null}
      {edits.length ? (
        <div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            <History className="h-3 w-3" />
            {open ? 'Hide' : 'Show'} edit history ({edits.length} earlier {edits.length === 1 ? 'version' : 'versions'})
          </button>
          {open ? (
            <ol className="mt-2 space-y-2">
              {[...edits].reverse().map((revision, index) => (
                <li
                  key={`${revision.recordedAt || 'edit'}-${index}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <p className="mb-1 text-[10px] text-zinc-500">
                    Before edit
                    {revision.recordedAt ? ` · ${formatDateTime(revision.recordedAt)}` : ''}
                    {revision.by && String(revision.by.userId) !== String(comment.author?.userId)
                      ? ` · edited by ${revision.by.name || 'another member'}`
                      : ''}
                  </p>
                  <RevisionBody revision={revision} />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentNode({
  comment,
  childrenOf,
  depth,
  seen,
  showRemoved,
  saving,
  onCommentHidden,
}: {
  comment: ForumComment;
  childrenOf: Map<string, ForumComment[]>;
  depth: number;
  seen: Set<string>;
  showRemoved: boolean;
  saving: boolean;
  onCommentHidden: (commentId: string, hidden: boolean) => void;
}) {
  if (seen.has(comment.commentId)) return null;
  seen.add(comment.commentId);
  const replies = childrenOf.get(comment.commentId) || [];
  const collapsed = comment.isDeleted && !showRemoved;

  return (
    <li className={depth > 0 ? 'border-l border-white/[0.08] pl-3' : ''}>
      {collapsed ? (
        <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-1.5 text-[11px] italic text-zinc-600">
          Removed comment{replies.length ? ` · ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'} below` : ''}
        </p>
      ) : (
        <div
          className={`rounded-xl border px-3 py-2.5 ${
            comment.isDeleted ? 'border-rose-500/15 bg-rose-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <ForumAvatar person={comment.author} size="sm" className={comment.isDeleted ? 'opacity-60' : ''} />
              <div className="min-w-0">
                <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
                  <span className="truncate font-medium text-zinc-100">{comment.author?.name || 'Unknown member'}</span>
                  <PersonBadges person={comment.author} />
                  {comment.author?.handle ? <span className="text-zinc-500">@{comment.author.handle}</span> : null}
                </p>
                <p className="text-[10px] text-zinc-600">
                  {forumTimeAgo(comment.createdAt)}
                  {comment.isEdited ? ' · edited' : ''}
                  {comment.likeCount ? ` · ${formatNumber(comment.likeCount)} likes` : ''}
                  {comment.isDeleted && comment.deletedAt ? ` · removed ${formatRelative(comment.deletedAt)}` : ''}
                </p>
              </div>
            </div>
            {comment.isDeleted ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">
                  {removedByLabel(comment.removedBy)}
                </span>
                {comment.canRestore ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onCommentHidden(comment.commentId, false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    <Undo2 className="h-3 w-3" />
                    Restore
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onCommentHidden(comment.commentId, true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
              >
                <EyeOff className="h-3 w-3" />
                Hide
              </button>
            )}
          </div>
          <p
            className={`mt-1.5 whitespace-pre-wrap break-words pl-9 text-sm ${comment.isDeleted ? 'italic text-zinc-500' : 'text-zinc-200'}`}
          >
            {comment.comment}
          </p>
          {comment.images?.length ? (
            <div className="mt-2 pl-9">
              <ForumImageGrid images={comment.images} compact />
            </div>
          ) : null}
          <CommentHistory comment={comment} />
          {comment.isDeleted && (comment.removalReason || comment.restoreBlockedReason) ? (
            <p className="mt-1 pl-9 text-[10px] text-zinc-500">
              {comment.removalReason ? `Reason: “${comment.removalReason}”` : ''}
              {comment.removalReason && comment.restoreBlockedReason ? ' · ' : ''}
              {comment.restoreBlockedReason || ''}
            </p>
          ) : null}
        </div>
      )}
      {replies.length ? (
        <ul className={`mt-2 space-y-2 ${depth < MAX_COMMENT_INDENT ? 'ml-4' : ''}`}>
          {replies.map((reply) => (
            <CommentNode
              key={reply.commentId}
              comment={reply}
              childrenOf={childrenOf}
              depth={depth + 1}
              seen={seen}
              showRemoved={showRemoved}
              saving={saving}
              onCommentHidden={onCommentHidden}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DiscussionDetail({
  discussion,
  saving,
  reason,
  onReasonChange,
  onClose,
  onSave,
  onCommentHidden,
  onOpenGroup,
  consolePath,
}: {
  discussion: ForumDiscussion;
  saving: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSave: (patch: { status?: string; isLocked?: boolean; isSticky?: boolean }) => void;
  onCommentHidden: (commentId: string, hidden: boolean) => void;
  onOpenGroup: (id: string) => void;
  consolePath: string;
}) {
  const comments = useMemo(() => discussion.comments || [], [discussion.comments]);
  const [showRemoved, setShowRemoved] = useState(true);
  const [plainBody, setPlainBody] = useState(false);
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const isRemoved = discussion.status === 'removed';
  const restoreBlocked = isRemoved && discussion.canRestore === false;
  const hiddenReason = memberVisibility('discussion', discussion);
  const body = discussion.content ?? discussion.description ?? '';
  const tags = tagList(discussion.tags);
  const seen = new Set<string>();

  return (
    <>
      <DetailHeader
        eyebrow="Forum discussion"
        title={discussion.title}
        media={<ForumAvatar person={discussion.author} size="lg" />}
        actions={
          <MemberViewLink
            consolePath={consolePath}
            memberPath={`/forums/discussion/${discussion.id}`}
            hiddenReason={hiddenReason}
          />
        }
        subtitle={
          <>
            {personLabel(discussion.author)} · posted {formatDateTime(discussion.createdAt)}
            {discussion.updatedAt ? ` · edited ${formatRelative(discussion.updatedAt)}` : ''}
            {discussion.removedAt ? ` · removed ${formatRelative(discussion.removedAt)}` : ''}
          </>
        }
        chips={discussionState(discussion).map((state) => (
          <StatePill key={state} value={state}>
            {state}
          </StatePill>
        ))}
        onClose={onClose}
      />

      <div className="space-y-6 px-6 py-5">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MemberViewCaption hiddenReason={hiddenReason} />
            {body ? (
              <button
                type="button"
                onClick={() => setPlainBody((value) => !value)}
                className="mb-2 text-[11px] text-zinc-400 underline-offset-2 hover:text-white hover:underline"
              >
                {plainBody ? 'Show formatted' : 'Show plain text'}
              </button>
            ) : null}
          </div>
          <article
            className={`rounded-xl border p-4 ${
              isRemoved ? 'border-rose-500/25 bg-rose-500/[0.03]' : 'border-white/[0.08] bg-[#0f1016]'
            }`}
          >
            <div className="flex items-start gap-3">
              <ForumAvatar person={discussion.author} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-sm font-medium text-white">
                      {discussion.author?.name || 'Unknown member'}
                    </span>
                    <PersonBadges person={discussion.author} />
                  </span>
                  {discussion.author?.handle ? (
                    <span className="text-[11px] text-zinc-500">@{discussion.author.handle}</span>
                  ) : null}
                  <span className="text-[11px] text-zinc-500">· {forumTimeAgo(discussion.createdAt)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {discussion.groupId ? (
                    <button
                      type="button"
                      onClick={() => onOpenGroup(discussion.groupId as string)}
                      className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    >
                      <ArrowLeft className="ml-1 h-3 w-3" />
                      <GroupImage
                        name={discussion.groupName || 'Group'}
                        imageUrl={discussion.groupImageUrl}
                        size="xs"
                        circle
                      />
                      <span className="truncate">{discussion.groupName || 'Group'}</span>
                    </button>
                  ) : null}
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="mt-3 text-base font-semibold text-white">{discussion.title}</h3>
            <div className="mt-2">
              {!body ? (
                <p className="text-sm italic text-zinc-600">No body text.</p>
              ) : plainBody ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">{body}</p>
              ) : (
                <ForumMarkdown text={body} />
              )}
            </div>
            {discussion.images?.length ? (
              <div className="mt-3">
                <ForumImageGrid images={discussion.images} />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-300" />
                {formatNumber(discussion.likeCount)} likes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                {formatNumber(discussion.commentCount)} replies
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5" />
                {formatNumber(discussion.saveCount)} saves
              </span>
              <span className="text-[11px] text-zinc-600">
                {discussion.lastCommentAt ? `last reply ${formatRelative(discussion.lastCommentAt)}` : 'No replies yet'}
              </span>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-white">Moderation actions</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Locking keeps the discussion readable but stops new replies. Removing hides the post, and
            Hide does the same for one comment. Nothing is deleted, so both can be restored. Every
            action is logged against the author, with the reason below.
          </p>
          {isRemoved ? (
            <p className="mt-2 text-xs text-zinc-300">
              {removedByLabel(discussion.removedBy)}
              {discussion.removalReason ? ` · “${discussion.removalReason}”` : ''}
            </p>
          ) : null}
          <div className="mt-3 space-y-3">
            <ReasonField
              value={reason}
              onChange={onReasonChange}
              hint="Which rule does this breach, or why is it being restored?"
            />
            {restoreBlocked ? (
              <p className="text-xs text-amber-200/80">
                {discussion.restoreBlockedReason || 'This discussion cannot be restored.'}
              </p>
            ) : null}
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
                disabled={saving || restoreBlocked}
                onClick={() => onSave({ status: isRemoved ? 'active' : 'removed' })}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${
                  isRemoved
                    ? 'border-white/10 text-white hover:bg-white/5'
                    : 'border-rose-500/40 text-rose-100 hover:bg-rose-500/10'
                }`}
              >
                {isRemoved ? <Undo2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {isRemoved ? 'Restore post' : 'Remove post'}
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
          {tree.roots.length ? (
            <ul className="mt-2 space-y-2">
              {tree.roots.map((comment) => (
                <CommentNode
                  key={comment.commentId}
                  comment={comment}
                  childrenOf={tree.children}
                  depth={0}
                  seen={seen}
                  showRemoved={showRemoved}
                  saving={saving}
                  onCommentHidden={onCommentHidden}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
              <CornerDownRight className="h-3.5 w-3.5" />
              No comments on this discussion.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
