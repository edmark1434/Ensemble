import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Clock,
  Download,
  Film,
  HardDrive,
  History,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Snowflake,
  Trash2,
  Undo2,
  Unlock,
  Users,
  Video,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import TableFilterBar from '../userTeam/components/TableFilterBar';
import {
  apiMessage,
  downloadCsv,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRelative,
  formatShortDateTime,
  severityClass,
  statusClass,
} from './moderationFormat';

type VideoOwner = {
  accountId: string;
  userId?: string;
  name: string;
  handle: string | null;
  accountStatus?: string | null;
};

type ProjectMember = {
  userId: string;
  accountId: string;
  name: string;
  handle: string | null;
  role: string;
  accountStatus?: string | null;
  joinedAt: string | null;
};

type ProjectBlock = {
  id: string;
  name: string;
  width: number;
  height: number;
  frameRate: number;
  colorSpace: string;
  editCount?: number;
};

type ProjectMedia = {
  id: string;
  name: string;
  type: string;
  width: number | null;
  height: number | null;
  durationSeconds: number;
  sizeBytes: number;
  createdAt: string | null;
};

type ProjectHistoryEntry = {
  id: string;
  action: string;
  eventCode: string;
  eventLabel: string;
  severity: string;
  at: string | null;
  by: string;
  byRole: string | null;
  note: string | null;
};

export type VideoProject = {
  id: string;
  name: string;
  status: string;
  storedStatus?: string;
  statusBeforeFreeze?: string | null;
  width: number;
  height: number;
  durationSeconds: number;
  memberCount: number;
  blockCount: number;
  mediaCount: number;
  editCount: number;
  commentCount?: number;
  storageBytes: number;
  owner: VideoOwner | null;
  moderationNote: string | null;
  frozenAt: string | null;
  frozenBy?: { staffId: string; name: string; role: string | null } | null;
  removedAt: string | null;
  trashedAt?: string | null;
  ownerDeleted?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastEditAt?: string | null;
  members?: ProjectMember[];
  memberRoles?: Record<string, number>;
  blocks?: ProjectBlock[];
  media?: ProjectMedia[];
  history?: ProjectHistoryEntry[];
};

type VideoStats = {
  total: number;
  active: number;
  frozen: number;
  archived: number;
  removed: number;
  trashed: number;
  activeLast7d: number;
  durationSeconds: number;
  storageBytes: number;
} | null;

const VIDEOS_URL = '/api/admin/moderation/videos';

type DetailTab = 'overview' | 'people' | 'scenes' | 'media' | 'history';

const DETAIL_TABS: { id: DetailTab; label: string; icon: typeof Film }[] = [
  { id: 'overview', label: 'Overview', icon: Film },
  { id: 'people', label: 'People', icon: Users },
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'media', label: 'Media', icon: HardDrive },
  { id: 'history', label: 'History', icon: History },
];

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

/**
 * Moderation → Management → Video.
 *
 * Lists every editor project with the numbers that decide an action — size,
 * activity, collaborators, state — then opens one project with its roster,
 * scenes, media and its own moderation history. Freezing and removal are
 * reversible and both are written to the activity log against the owner.
 */
export default function VideoManagementSection() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [stats, setStats] = useState<VideoStats>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VideoProject | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (nextStatus: string, nextSearch: string) => {
    const params = { status: nextStatus, search: nextSearch };
    const cached = peekStaffGet(VIDEOS_URL, params);
    if (cached?.data?.data) applyPayload(cached.data.data);
    else if (firstLoad.current) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await staffGet(VIDEOS_URL, params);
      if (!res.data?.data) throw new Error('Failed to load video projects');
      applyPayload(res.data.data);
    } catch (err) {
      if (!cached) setError(apiMessage(err, 'Failed to load video projects'));
    } finally {
      firstLoad.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  function applyPayload(payload: { projects?: VideoProject[]; stats?: VideoStats } | VideoProject[]) {
    // The endpoint returns { projects, stats }; tolerate a bare array from cache.
    if (Array.isArray(payload)) {
      setProjects(payload);
      return;
    }
    setProjects(payload.projects || []);
    if (payload.stats) setStats(payload.stats);
  }

  useEffect(() => {
    void load(status, query);
  }, [load, status, query]);

  const visible = useMemo(() => {
    const list = [...projects];
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'edits') return b.editCount - a.editCount;
      if (sortBy === 'storage') return b.storageBytes - a.storageBytes;
      if (sortBy === 'people') return b.memberCount - a.memberCount;
      if (sortBy === 'created')
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest')
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return list;
  }, [projects, sortBy]);

  const openProject = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setNote('');
    setConfirmRemove(false);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const res = await api.get(`${VIDEOS_URL}/${id}`);
      setDetail(res.data?.data || null);
      setNote(res.data?.data?.moderationNote || '');
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to load project'));
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const applyAction = async (action: 'freeze' | 'unfreeze' | 'remove' | 'restore') => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await api.patch(`${VIDEOS_URL}/${selectedId}`, {
        action,
        note: action === 'freeze' || action === 'remove' ? note.trim() || undefined : undefined,
      });
      setDetail(res.data?.data || null);
      setConfirmRemove(false);
      showSuccessToast(res.data?.message || 'Project updated');
      await load(status, query);
    } catch (err) {
      showErrorToast(apiMessage(err, 'Failed to update project'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!visible.length) {
      showErrorToast('There is nothing to export in this view');
      return;
    }
    downloadCsv(
      `video-projects-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Project',
        'Status',
        'Owner',
        'Owner handle',
        'Owner account ID',
        'Canvas',
        'Duration (s)',
        'People',
        'Scenes',
        'Media files',
        'Saved edits',
        'Comments',
        'Storage (bytes)',
        'Created',
        'Updated',
        'Frozen at',
        'Frozen by',
        'Removed at',
        'Moderation note',
        'Project ID',
      ],
      visible.map((project) => [
        project.name,
        project.status,
        project.owner?.name || '',
        project.owner?.handle || '',
        project.owner?.accountId || '',
        `${project.width}x${project.height}`,
        project.durationSeconds,
        project.memberCount,
        project.blockCount,
        project.mediaCount,
        project.editCount,
        project.commentCount ?? '',
        project.storageBytes,
        project.createdAt || '',
        project.updatedAt || '',
        project.frozenAt || '',
        project.frozenBy?.name || '',
        project.removedAt || '',
        project.moderationNote || '',
        project.id,
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Projects"
          value={formatNumber(stats?.total ?? 0)}
          hint={`${formatNumber(stats?.active ?? 0)} active · ${formatNumber(stats?.archived ?? 0)} archived`}
        />
        <StatTile
          label="Under moderation"
          value={`${formatNumber(stats?.frozen ?? 0)} · ${formatNumber(stats?.removed ?? 0)}`}
          hint="Frozen · removed from library"
        />
        <StatTile
          label="Edited this week"
          value={formatNumber(stats?.activeLast7d ?? 0)}
          hint={`${formatNumber(stats?.trashed ?? 0)} deleted by owners`}
        />
        <StatTile
          label="Media storage"
          value={formatBytes(stats?.storageBytes ?? 0)}
          hint={`${formatDuration(stats?.durationSeconds ?? 0)} of timeline`}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project name, owner or handle…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-9 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
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
            {formatNumber(visible.length)} project{visible.length === 1 ? '' : 's'} in view
          </p>
          <div className="hidden flex-1 lg:block" />
          <button
            type="button"
            onClick={() => void load(status, query)}
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
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'frozen', label: 'Frozen' },
                  { value: 'archived', label: 'Archived' },
                  { value: 'removed', label: 'Removed by staff' },
                  { value: 'trashed', label: 'Deleted by owner' },
                ],
              },
            ]}
            sort={{
              value: sortBy,
              options: [
                { value: 'updated', label: 'Recently updated' },
                { value: 'oldest', label: 'Least recently updated' },
                { value: 'created', label: 'Newest project' },
                { value: 'edits', label: 'Most edits' },
                { value: 'storage', label: 'Largest storage' },
                { value: 'people', label: 'Most collaborators' },
                { value: 'name', label: 'Name A–Z' },
              ],
            }}
            onFilterChange={(id, value) => {
              if (id === 'status') setStatus(value);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setStatus('all');
              setSortBy('updated');
              setSearch('');
            }}
          />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => void load(status, query)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Activity</th>
                  <th className="px-4 py-3 text-right">Content</th>
                  <th className="px-4 py-3 text-right">Storage</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr
                    key={project.id}
                    className="cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02]"
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
                      <p className="text-[10px] text-zinc-600">
                        {project.owner?.handle ? `@${project.owner.handle}` : '—'}
                        {project.owner?.accountStatus &&
                        project.owner.accountStatus.toLowerCase() !== 'active'
                          ? ` · ${project.owner.accountStatus}`
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass(project.status)}`}
                      >
                        {project.status === 'trashed' ? 'Owner deleted' : project.status}
                      </span>
                      {project.frozenAt ? (
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          frozen {formatRelative(project.frozenAt)}
                        </p>
                      ) : null}
                      {project.removedAt ? (
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          removed {formatRelative(project.removedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="tabular-nums text-zinc-200">
                        {formatNumber(project.editCount)} edits
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {formatNumber(project.memberCount)} people
                        {project.commentCount
                          ? ` · ${formatNumber(project.commentCount)} comments`
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="tabular-nums text-zinc-200">
                        {formatNumber(project.blockCount)} scenes
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {formatNumber(project.mediaCount)} media files
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatBytes(project.storageBytes)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-400">{formatShortDateTime(project.updatedAt)}</p>
                      <p className="text-[10px] text-zinc-600">
                        created {formatRelative(project.createdAt)}
                      </p>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      No video projects match this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedId ? (
        <ProjectDetailOverlay
          detail={detail}
          loading={detailLoading}
          tab={detailTab}
          onTabChange={setDetailTab}
          note={note}
          onNoteChange={setNote}
          saving={saving}
          confirmRemove={confirmRemove}
          onConfirmRemoveChange={setConfirmRemove}
          onAction={applyAction}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectDetailOverlay({
  detail,
  loading,
  tab,
  onTabChange,
  note,
  onNoteChange,
  saving,
  confirmRemove,
  onConfirmRemoveChange,
  onAction,
  onClose,
}: {
  detail: VideoProject | null;
  loading: boolean;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  note: string;
  onNoteChange: (value: string) => void;
  saving: boolean;
  confirmRemove: boolean;
  onConfirmRemoveChange: (value: boolean) => void;
  onAction: (action: 'freeze' | 'unfreeze' | 'remove' | 'restore') => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const frozen = detail?.status?.toLowerCase() === 'frozen';
  const removed = detail?.status?.toLowerCase() === 'removed';
  const ownerDeleted = Boolean(detail?.ownerDeleted);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-10 md:pl-[260px]">
      <button type="button" className="fixed inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <header className="sticky top-0 z-10 rounded-t-2xl border-b border-white/[0.06] bg-[#12131a]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Video project
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-white">
                <Video className="h-4 w-4 text-zinc-500" />
                {detail?.name || 'Project'}
              </h2>
              {detail ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {detail.owner ? `${detail.owner.name}` : 'No owner'}
                  {detail.owner?.handle ? ` @${detail.owner.handle}` : ''} · created{' '}
                  {formatDateTime(detail.createdAt)}
                </p>
              ) : null}
              {detail ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass(detail.status)}`}
                  >
                    {detail.status === 'trashed' ? 'Deleted by owner' : detail.status}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                    {detail.width}×{detail.height}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                    {formatDuration(detail.durationSeconds)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                    {formatBytes(detail.storageBytes)}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {detail ? (
            <div className="mt-4 flex gap-1 overflow-x-auto">
              {DETAIL_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    tab === id
                      ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {loading || !detail ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading details
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            {tab === 'overview' ? (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Canvas" value={`${detail.width}×${detail.height}`} />
                  <Metric label="Duration" value={formatDuration(detail.durationSeconds)} />
                  <Metric label="Storage" value={formatBytes(detail.storageBytes)} />
                  <Metric label="Saved edits" value={formatNumber(detail.editCount)} />
                  <Metric label="Media files" value={formatNumber(detail.mediaCount)} />
                  <Metric label="Scenes" value={formatNumber(detail.blockCount)} />
                  <Metric label="Collaborators" value={formatNumber(detail.memberCount)} />
                  <Metric label="Comments" value={formatNumber(detail.commentCount ?? 0)} />
                  <Metric
                    label="Last edit"
                    value={detail.lastEditAt ? formatRelative(detail.lastEditAt) : 'No saved edits'}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Metric label="Created" value={formatDateTime(detail.createdAt)} />
                  <Metric label="Updated" value={formatDateTime(detail.updatedAt)} />
                  {detail.frozenAt ? (
                    <Metric
                      label="Frozen"
                      value={
                        <>
                          {formatDateTime(detail.frozenAt)}
                          {detail.frozenBy ? (
                            <span className="ml-1.5 text-xs text-zinc-500">
                              by {detail.frozenBy.name}
                              {detail.frozenBy.role ? ` (${detail.frozenBy.role})` : ''}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                  {detail.removedAt ? (
                    <Metric label="Removed by staff" value={formatDateTime(detail.removedAt)} />
                  ) : null}
                  {detail.trashedAt ? (
                    <Metric label="Deleted by owner" value={formatDateTime(detail.trashedAt)} />
                  ) : null}
                </div>

                {detail.moderationNote ? (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">
                      Moderation note
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                      {detail.moderationNote}
                    </p>
                  </div>
                ) : null}

                <ModerationPanel
                  frozen={frozen}
                  removed={removed}
                  ownerDeleted={ownerDeleted}
                  note={note}
                  onNoteChange={onNoteChange}
                  saving={saving}
                  confirmRemove={confirmRemove}
                  onConfirmRemoveChange={onConfirmRemoveChange}
                  onAction={onAction}
                />
              </>
            ) : null}

            {tab === 'people' ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Collaborators ({formatNumber((detail.members || []).length)})
                </h3>
                {detail.memberRoles && Object.keys(detail.memberRoles).length ? (
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {Object.entries(detail.memberRoles)
                      .map(([role, count]) => `${count} ${role.toLowerCase()}`)
                      .join(' · ')}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1.5">
                  {(detail.members || []).map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">
                          {member.name}
                          {member.handle ? (
                            <span className="ml-1.5 text-xs text-zinc-500">@{member.handle}</span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          joined {formatRelative(member.joinedAt)}
                          {member.accountStatus && member.accountStatus.toLowerCase() !== 'active'
                            ? ` · account ${member.accountStatus.toLowerCase()}`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300">
                        {member.role}
                      </span>
                    </li>
                  ))}
                  {(detail.members || []).length === 0 ? (
                    <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                      This project has no members.
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {tab === 'scenes' ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Scenes ({formatNumber((detail.blocks || []).length)})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {(detail.blocks || []).map((block) => (
                    <li
                      key={block.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <p className="min-w-0 truncate text-sm text-white">{block.name}</p>
                      <p className="shrink-0 text-xs text-zinc-500">
                        {block.width}×{block.height} · {block.frameRate} fps · {block.colorSpace}
                        {block.editCount != null ? ` · ${formatNumber(block.editCount)} edits` : ''}
                      </p>
                    </li>
                  ))}
                  {(detail.blocks || []).length === 0 ? (
                    <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                      No scenes in this project.
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {tab === 'media' ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Media files ({formatNumber((detail.media || []).length)} of{' '}
                  {formatNumber(detail.mediaCount)})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {(detail.media || []).map((asset) => (
                    <li
                      key={asset.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{asset.name}</p>
                        <p className="text-[11px] text-zinc-600">
                          {asset.type}
                          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                          {asset.durationSeconds
                            ? ` · ${formatDuration(asset.durationSeconds)}`
                            : ''}
                          {' · added '}
                          {formatRelative(asset.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                        {formatBytes(asset.sizeBytes)}
                      </span>
                    </li>
                  ))}
                  {(detail.media || []).length === 0 ? (
                    <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                      No media files in this project.
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {tab === 'history' ? (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Moderation history
                </h3>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Every staff action on this project, newest first. The same entries appear in
                  Moderation → Activity log.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(detail.history || []).map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm text-white">
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${severityClass(entry.severity)}`}
                            >
                              {entry.severity}
                            </span>
                            <span className="truncate">{entry.action}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-600">
                            {entry.by}
                            {entry.byRole ? ` (${entry.byRole})` : ''} ·{' '}
                            {formatShortDateTime(entry.at)}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400">
                              {entry.note}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[10px] text-zinc-600">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {formatRelative(entry.at)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {(detail.history || []).length === 0 ? (
                    <li className="rounded-xl border border-white/[0.06] px-3 py-6 text-center text-xs text-zinc-500">
                      No moderation action has been taken on this project.
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ModerationPanel({
  frozen,
  removed,
  ownerDeleted,
  note,
  onNoteChange,
  saving,
  confirmRemove,
  onConfirmRemoveChange,
  onAction,
}: {
  frozen: boolean;
  removed: boolean;
  ownerDeleted: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  saving: boolean;
  confirmRemove: boolean;
  onConfirmRemoveChange: (value: boolean) => void;
  onAction: (action: 'freeze' | 'unfreeze' | 'remove' | 'restore') => void;
}) {
  return (
    <div className="space-y-3">
      {!removed ? (
        <section className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
            <Snowflake className="h-4 w-4" />
            Freeze editing
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            A frozen project stays open for viewing. New timeline edits, scene edits and renames are
            rejected until you unfreeze it. The note below is shown in the activity log.
          </p>
          {!frozen ? (
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Why is this project being frozen?"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-sky-500/20"
            />
          ) : null}
          <div className="mt-3 flex justify-end">
            {frozen ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onAction('unfreeze')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" />
                {saving ? 'Saving…' : 'Unfreeze project'}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onAction('freeze')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {saving ? 'Saving…' : 'Freeze project'}
              </button>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
        <p className="text-sm font-medium text-rose-100">Library access</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Removing hides the project from the owner and every collaborator. The edit history is kept,
          so it can be restored. Projects the owner deleted themselves cannot be restored from here.
        </p>
        {!removed && !confirmRemove ? (
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Reason for removal (saved to the activity log)"
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-rose-500/15"
          />
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          {removed ? (
            ownerDeleted ? (
              <p className="text-xs text-zinc-500">
                The owner deleted this project, so moderation cannot restore it.
              </p>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onAction('restore')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                {saving ? 'Saving…' : 'Restore project'}
              </button>
            )
          ) : confirmRemove ? (
            <>
              <button
                type="button"
                onClick={() => onConfirmRemoveChange(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onAction('remove')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {saving ? 'Removing…' : 'Confirm remove'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onConfirmRemoveChange(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Remove from library
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
