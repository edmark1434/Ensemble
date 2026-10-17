import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, Search, Snowflake, Unlock, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import TableFilterBar from '../userTeam/components/TableFilterBar';

type VideoOwner = {
  accountId: string;
  userId?: string;
  name: string;
  handle: string | null;
};

export type VideoProject = {
  id: string;
  name: string;
  status: string;
  width: number;
  height: number;
  durationSeconds: number;
  memberCount: number;
  blockCount: number;
  mediaCount: number;
  editCount: number;
  storageBytes: number;
  owner: VideoOwner | null;
  moderationNote: string | null;
  frozenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  members?: {
    userId: string;
    accountId: string;
    name: string;
    handle: string | null;
    role: string;
    joinedAt: string | null;
  }[];
  blocks?: {
    id: string;
    name: string;
    width: number;
    height: number;
    frameRate: number;
    colorSpace: string;
  }[];
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

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (value === 'frozen') return 'bg-sky-500/15 text-sky-200 border-sky-500/30';
  if (value === 'archived') return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
}

function apiMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

export default function VideoManagementSection() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VideoProject | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (nextStatus = status, nextSearch = search) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/moderation/videos', {
        params: { status: nextStatus, search: nextSearch },
      });
      setProjects(res.data?.data || []);
    } catch (err) {
      setError(apiMessage(err, 'Failed to load video projects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('all', '');
  }, []);

  const visible = useMemo(() => {
    const list = [...projects];
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'edits') return b.editCount - a.editCount;
      if (sortBy === 'oldest') return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return list;
  }, [projects, sortBy]);

  const openProject = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setNote('');
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/admin/moderation/videos/${id}`);
      setDetail(res.data?.data || null);
      setNote(res.data?.data?.moderationNote || '');
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load project'));
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const applyFreeze = async (action: 'freeze' | 'unfreeze') => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/admin/moderation/videos/${selectedId}`, {
        action,
        note: action === 'freeze' ? note : undefined,
      });
      setDetail(res.data?.data || null);
      showSuccessToast(res.data?.message || (action === 'freeze' ? 'Project frozen' : 'Project unfrozen'));
      await load();
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update project'));
    } finally {
      setSaving(false);
    }
  };

  const frozen = detail?.status?.toLowerCase() === 'frozen';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <form
            className="relative min-w-[200px] flex-1 sm:max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void load(status, search);
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project or owner…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </form>
          <p className="text-xs text-zinc-500">
            {visible.length} project{visible.length === 1 ? '' : 's'}
          </p>
          <div className="hidden flex-1 lg:block" />
          <TableFilterBar
            filters={[
              {
                id: 'status',
                label: 'Status',
                value: status,
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'frozen', label: 'Frozen' },
                  { value: 'archived', label: 'Archived' },
                ],
              },
            ]}
            sort={{
              value: sortBy,
              options: [
                { value: 'updated', label: 'Recently updated' },
                { value: 'oldest', label: 'Least recently updated' },
                { value: 'edits', label: 'Most edits' },
                { value: 'name', label: 'Name A–Z' },
              ],
            }}
            onFilterChange={(id, value) => {
              if (id !== 'status') return;
              setStatus(value);
              void load(value, search);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setStatus('all');
              setSortBy('updated');
              void load('all', search);
            }}
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects
          </div>
        ) : error ? (
          <p className="px-4 py-16 text-center text-sm text-rose-300">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Edits</th>
                  <th className="px-4 py-3 text-right">People</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr
                    key={project.id}
                    className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02]"
                    onClick={() => void openProject(project.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="text-[11px] text-zinc-600">
                        {project.width}×{project.height} · {formatDuration(project.durationSeconds)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-200">{project.owner?.name || 'No owner'}</p>
                      <p className="text-[11px] text-zinc-600">
                        {project.owner?.handle ? `@${project.owner.handle}` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{project.editCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{project.memberCount}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatWhen(project.updatedAt)}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                      No video projects match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h3 className="text-sm font-semibold text-white">What else this desk can grow into</h3>
        <ul className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
          {[
            'Remove a project from the owner’s library after a takedown',
            'Download a transcript of who edited, and when',
            'Hold new invites while a project is under review',
            'Open the owner in User & Team when the project is part of an account case',
          ].map((item) => (
            <li key={item} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {selectedId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:pl-[260px]">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setSelectedId(null)} aria-label="Close" />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Video project</p>
                <h2 className="mt-1 text-lg font-bold text-white">{detail?.name || 'Project'}</h2>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close" className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading details
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ['Canvas', `${detail.width}×${detail.height}`],
                    ['Duration', formatDuration(detail.durationSeconds)],
                    ['Storage', formatBytes(detail.storageBytes)],
                    ['Saved edits', String(detail.editCount)],
                    ['Media files', String(detail.mediaCount)],
                    ['Scenes', String(detail.blockCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[11px] text-zinc-500">{label}</p>
                      <p className="mt-0.5 text-sm text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className={`rounded-full border px-2 py-0.5 capitalize ${statusClass(detail.status)}`}>{detail.status}</span>
                  <span>Created {formatWhen(detail.createdAt)}</span>
                  <span>Updated {formatWhen(detail.updatedAt)}</span>
                  {detail.frozenAt ? <span>Frozen {formatWhen(detail.frozenAt)}</span> : null}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">People</p>
                  <ul className="mt-2 space-y-1.5">
                    {(detail.members || []).map((member) => (
                      <li key={member.userId} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-sm">
                        <span className="text-white">
                          {member.name}
                          <span className="ml-2 text-xs text-zinc-500">{member.handle ? `@${member.handle}` : ''}</span>
                        </span>
                        <span className="text-xs text-zinc-400">{member.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {(detail.blocks || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Scenes</p>
                    <ul className="mt-2 space-y-1.5">
                      {detail.blocks!.map((block) => (
                        <li key={block.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-sm">
                          <span className="text-white">{block.name}</span>
                          <span className="text-xs text-zinc-500">
                            {block.width}×{block.height} · {block.frameRate} fps · {block.colorSpace}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
                    <Snowflake className="h-4 w-4" />
                    Freeze editing
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    A frozen project stays open for viewing. New timeline edits, scene edits, and renames are rejected until you unfreeze it.
                  </p>
                  {!frozen && (
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Optional note for the activity log"
                      className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  )}
                  {frozen && detail.moderationNote && (
                    <p className="mt-3 text-sm text-zinc-300">{detail.moderationNote}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    {frozen ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void applyFreeze('unfreeze')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"
                      >
                        <Unlock className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Unfreeze'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void applyFreeze('freeze')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                      >
                        <Lock className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Freeze project'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
