import { useEffect, useMemo, useState } from 'react';
import { Archive, Loader2, Lock, MessageSquare, Pin, Search, Trash2, Unlock, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import TableFilterBar from '../userTeam/components/TableFilterBar';

type ForumMember = {
  userId: string | number;
  accountId?: string | null;
  name: string;
  handle: string | null;
  role: string;
  isBanned: boolean;
};

type ForumGroup = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  memberCount?: number;
  members?: ForumMember[];
  discussionCount: number;
  tags: { tag_name?: string }[] | string[];
  createdAt: string | null;
};

type ForumComment = {
  commentId: string;
  comment: string;
  author: { userId?: string | number | null; name?: string | null; handle?: string | null };
  likeCount: number;
  isDeleted: boolean;
  createdAt: string | null;
};

type ForumDiscussion = {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  groupName?: string | null;
  author: { userId?: string | number | null; name?: string | null; handle?: string | null };
  commentCount?: number;
  likeCount?: number;
  status: string;
  isLocked: boolean;
  isSticky: boolean;
  createdAt: string | null;
  comments?: ForumComment[];
};

function formatWhen(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function tagLabel(tag: { tag_name?: string } | string) {
  return typeof tag === 'string' ? tag : tag.tag_name || '';
}

function personLabel(person?: { name?: string | null; handle?: string | null; userId?: string | number | null }) {
  if (person?.name) return person.handle ? `${person.name} @${person.handle}` : person.name;
  if (person?.handle) return `@${person.handle}`;
  return person?.userId != null ? String(person.userId) : 'Unknown';
}

function apiMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

export default function ForumManagementSection() {
  const [view, setView] = useState<'groups' | 'discussions'>('groups');
  const [groups, setGroups] = useState<ForumGroup[]>([]);
  const [discussions, setDiscussions] = useState<ForumDiscussion[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [groupDetail, setGroupDetail] = useState<ForumGroup | null>(null);
  const [discussionDetail, setDiscussionDetail] = useState<ForumDiscussion | null>(null);
  const [saving, setSaving] = useState(false);

  const loadGroups = async () => {
    const res = await api.get('/api/admin/moderation/forum/groups');
    setAvailable(res.data?.data?.available !== false);
    setGroups(res.data?.data?.groups || []);
  };

  const loadDiscussions = async (query = search) => {
    const res = await api.get('/api/admin/moderation/forum/discussions', { params: { search: query } });
    setAvailable(res.data?.data?.available !== false);
    setDiscussions(res.data?.data?.discussions || []);
  };

  const load = async () => {
    setLoading(true);
    try {
      await Promise.all([loadGroups(), loadDiscussions(search)]);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load forum content'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (status !== 'all' && group.status.toLowerCase() !== status) return false;
      if (!q) return true;
      return (
        group.name.toLowerCase().includes(q) ||
        (group.description || '').toLowerCase().includes(q) ||
        group.tags.some((tag) => tagLabel(tag).toLowerCase().includes(q))
      );
    });
  }, [groups, search, status]);

  const visibleDiscussions = useMemo(() => {
    if (status === 'all') return discussions;
    return discussions.filter((item) => {
      if (status === 'locked') return item.isLocked;
      if (status === 'removed') return item.status === 'removed';
      if (status === 'active') return item.status !== 'removed';
      return true;
    });
  }, [discussions, status]);

  const openGroup = async (id: string) => {
    setDiscussionDetail(null);
    setGroupDetail(null);
    try {
      const res = await api.get(`/api/admin/moderation/forum/groups/${id}`);
      setGroupDetail(res.data?.data || null);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load group'));
    }
  };

  const openDiscussion = async (id: string) => {
    setGroupDetail(null);
    setDiscussionDetail(null);
    try {
      const res = await api.get(`/api/admin/moderation/forum/discussions/${id}`);
      setDiscussionDetail(res.data?.data || null);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load discussion'));
    }
  };

  const saveGroupStatus = async (next: 'active' | 'inactive') => {
    if (!groupDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/admin/moderation/forum/groups/${groupDetail.id}`, { status: next });
      setGroupDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || 'Group updated');
      await loadGroups();
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
      const res = await api.patch(`/api/admin/moderation/forum/groups/${groupDetail.id}/members/${member.userId}`, {
        isBanned: !member.isBanned,
      });
      setGroupDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || 'Member updated');
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update member'));
    } finally {
      setSaving(false);
    }
  };

  const saveDiscussion = async (patch: { status?: string; isLocked?: boolean; isSticky?: boolean }) => {
    if (!discussionDetail) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/admin/moderation/forum/discussions/${discussionDetail.id}`, patch);
      setDiscussionDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || 'Discussion updated');
      await loadDiscussions(search);
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
      const res = await api.delete(`/api/admin/moderation/forum/discussions/${discussionDetail.id}/comments/${commentId}`);
      setDiscussionDetail(res.data?.data || null);
      showSuccessToast('Comment removed');
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to remove comment'));
    } finally {
      setSaving(false);
    }
  };

  if (!available && !loading) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-4 text-white">Forum content unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">Set MONGODB_URI in backend/.env to manage groups and discussions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {(['groups', 'discussions'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id);
              setStatus('all');
            }}
            className={`rounded-xl px-3.5 py-2 text-sm capitalize ${view === id ? 'bg-rose-500/15 text-white' : 'text-zinc-500'}`}
          >
            {id}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center">
          <form
            className="relative min-w-[200px] flex-1 sm:max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void loadDiscussions(search);
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={view === 'groups' ? 'Search groups…' : 'Search discussions…'}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none"
            />
          </form>
          <TableFilterBar
            filters={[
              {
                id: 'status',
                label: 'Status',
                value: status,
                options: view === 'groups'
                  ? [
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Archived' },
                    ]
                  : [
                      { value: 'active', label: 'Visible' },
                      { value: 'locked', label: 'Locked' },
                      { value: 'removed', label: 'Removed' },
                    ],
              },
            ]}
            sort={{ value: 'newest', options: [{ value: 'newest', label: 'Newest' }] }}
            onFilterChange={(_id, value) => setStatus(value)}
            onSortChange={() => undefined}
            onClear={() => setStatus('all')}
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading forum
          </div>
        ) : view === 'groups' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Members</th>
                  <th className="px-4 py-3 text-right">Discussions</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((group) => (
                  <tr key={group.id} className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02]" onClick={() => void openGroup(group.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{group.name}</p>
                      <p className="max-w-xs truncate text-[11px] text-zinc-600">{group.description || 'No description'}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-300">{group.status}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{group.memberCount ?? group.members?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{group.discussionCount}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatWhen(group.createdAt)}</td>
                  </tr>
                ))}
                {visibleGroups.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No groups match this view.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Discussion</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3 text-right">Comments</th>
                  <th className="px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody>
                {visibleDiscussions.map((item) => (
                  <tr key={item.id} className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02]" onClick={() => void openDiscussion(item.id)}>
                    <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{personLabel(item.author)}</td>
                    <td className="px-4 py-3 text-zinc-500">{item.groupName || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{item.commentCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {item.status === 'removed' ? 'Removed' : 'Visible'}
                      {item.isLocked ? ' · Locked' : ''}
                      {item.isSticky ? ' · Pinned' : ''}
                    </td>
                  </tr>
                ))}
                {visibleDiscussions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No discussions match this view.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(groupDetail || discussionDetail) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:pl-[260px]">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => { setGroupDetail(null); setDiscussionDetail(null); }} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{groupDetail ? 'Forum group' : 'Discussion'}</p>
                <h2 className="mt-1 text-lg font-bold text-white">{groupDetail?.name || discussionDetail?.title}</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => { setGroupDetail(null); setDiscussionDetail(null); }} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {groupDetail && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-zinc-300">{groupDetail.description || 'No description'}</p>
                <p className="text-xs text-zinc-500">
                  {groupDetail.tags.map(tagLabel).filter(Boolean).join(', ') || 'No tags'} · {groupDetail.discussionCount} discussions · created {formatWhen(groupDetail.createdAt)}
                </p>
                <ul className="space-y-1.5">
                  {(groupDetail.members || []).map((member) => (
                    <li key={String(member.userId)} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2 text-sm">
                      <span className="text-white">
                        {personLabel(member)}
                        <span className="ml-2 text-xs text-zinc-500">{member.role}{member.isBanned ? ' · banned' : ''}</span>
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveMemberBan(member)}
                        className="text-xs text-rose-200 disabled:opacity-50"
                      >
                        {member.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  {groupDetail.status === 'active' ? (
                    <button type="button" disabled={saving} onClick={() => void saveGroupStatus('inactive')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-4 py-2 text-sm text-rose-100 disabled:opacity-50">
                      <Archive className="h-4 w-4" />
                      Archive group
                    </button>
                  ) : (
                    <button type="button" disabled={saving} onClick={() => void saveGroupStatus('active')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-50">
                      Reactivate group
                    </button>
                  )}
                </div>
              </div>
            )}

            {discussionDetail && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-zinc-300">{discussionDetail.description || 'No body'}</p>
                <p className="text-xs text-zinc-500">
                  {personLabel(discussionDetail.author)} · {discussionDetail.likeCount ?? 0} likes · {formatWhen(discussionDetail.createdAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={saving} onClick={() => void saveDiscussion({ isLocked: !discussionDetail.isLocked })} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white disabled:opacity-50">
                    {discussionDetail.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {discussionDetail.isLocked ? 'Unlock' : 'Lock replies'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => void saveDiscussion({ isSticky: !discussionDetail.isSticky })} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white disabled:opacity-50">
                    <Pin className="h-3.5 w-3.5" />
                    {discussionDetail.isSticky ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveDiscussion({ status: discussionDetail.status === 'removed' ? 'active' : 'removed' })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-3 py-2 text-xs text-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {discussionDetail.status === 'removed' ? 'Restore post' : 'Remove post'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {(discussionDetail.comments || []).map((comment) => (
                    <li key={comment.commentId} className="rounded-lg border border-white/[0.06] px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-zinc-500">{personLabel(comment.author)} · {formatWhen(comment.createdAt)}</p>
                        {!comment.isDeleted && (
                          <button type="button" disabled={saving} onClick={() => void removeComment(comment.commentId)} className="text-[11px] text-rose-200 disabled:opacity-50">
                            Remove
                          </button>
                        )}
                      </div>
                      <p className={`mt-1 text-sm ${comment.isDeleted ? 'text-zinc-600' : 'text-zinc-200'}`}>{comment.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
