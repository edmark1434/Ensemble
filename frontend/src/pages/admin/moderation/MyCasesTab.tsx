import { useMemo, useState } from 'react';
import { Hand, Loader2, Search, Trash2, UserCog } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import ModeratorDisputeDetailModal from '@/pages/moderator/shared/ModeratorDisputeDetailModal';
import { VerificationModal } from '../userTeam/components/AccountModals';
import type { PlatformUserAccount } from '../userTeam/userTeamTypes';
import { ListingCaseDetailModal, ReportCaseDetailModal } from './CaseDetailModals';
import type { ModerationCase } from './moderationTypes';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function titleCase(value: string) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function statusClass(status: string) {
  const s = status.toLowerCase().replace(/_/g, ' ');
  if (s === 'open' || s === 'pending' || s === 'pending review') {
    return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  }
  if (
    s === 'in review' ||
    s === 'in_progress' ||
    s === 'in progress' ||
    s === 'awaiting response' ||
    s === 'under review'
  ) {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  }
  if (s === 'resolved' || s === 'closed' || s === 'approved' || s === 'verified') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  }
  if (s === 'dismissed' || s === 'rejected' || s === 'withdrawn') {
    return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  }
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
}

function sourceClass(source: string) {
  const s = source.toLowerCase();
  if (s === 'dispute') return 'bg-violet-500/15 text-violet-200 border-violet-500/25';
  if (s === 'report') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  if (s === 'listing') return 'bg-sky-500/15 text-sky-200 border-sky-500/25';
  if (s === 'identity') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

type CategoryFilter = 'all' | 'dispute' | 'report' | 'listing' | 'identity';

export default function MyCasesTab({
  cases,
  currentStaffId,
  onUpdated,
}: {
  cases: ModerationCase[];
  currentStaffId?: string | number | null;
  onUpdated: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selected, setSelected] = useState<ModerationCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModerationCase | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [identityUser, setIdentityUser] = useState<PlatformUserAccount | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);

  const counts = useMemo(
    () => ({
      all: cases.length,
      dispute: cases.filter((c) => c.source === 'dispute').length,
      report: cases.filter((c) => c.source === 'report').length,
      listing: cases.filter((c) => c.source === 'listing').length,
      identity: cases.filter((c) => c.source === 'identity').length,
      high: cases.filter((c) => String(c.priority).toLowerCase() === 'high').length,
    }),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (category !== 'all' && c.source !== category) return false;
      if (!q) return true;
      const hay = [
        c.target,
        c.targetHandle,
        c.type,
        c.reason,
        c.source,
        c.status,
        c.priority,
        c.referenceNumber,
        c.assignedStaffName,
        c.assignedRole,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cases, search, category]);

  const filters: { id: CategoryFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All assigned', count: counts.all },
    { id: 'dispute', label: 'Disputes', count: counts.dispute },
    { id: 'report', label: 'Reports', count: counts.report },
    { id: 'listing', label: 'Listings', count: counts.listing },
    { id: 'identity', label: 'Identity', count: counts.identity },
  ];

  const closeDetail = () => {
    setSelected(null);
    setIdentityUser(null);
  };

  const openCase = async (c: ModerationCase) => {
    if (c.source === 'identity') {
      if (!c.accountId) {
        showErrorToast('This identity case has no linked account');
        return;
      }
      setSelected(c);
      setIdentityLoading(true);
      setIdentityUser(null);
      try {
        const res = await api.get('/api/admin/users-management');
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load user');
        const user = (res.data.data.users as PlatformUserAccount[]).find(
          (u) => String(u.accountId) === String(c.accountId)
        );
        if (!user) throw new Error('User not found for this verification case');
        setIdentityUser(user);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to open verification');
        showErrorToast(message);
        closeDetail();
      } finally {
        setIdentityLoading(false);
      }
      return;
    }
    setSelected(c);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await api.delete(`/api/admin/moderation/cases/${deleteTarget.id}`, {
        data: { source: deleteTarget.source },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete case');
      showSuccessToast(res.data.message || 'Case deleted');
      setDeleteTarget(null);
      onUpdated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete case');
      showErrorToast(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Assigned to you" value={counts.all} sub="Open cases in your queue" />
        <SummaryCard label="Disputes" value={counts.dispute} sub="Assigned dispute desk work" />
        <SummaryCard label="Reports" value={counts.report} sub="Member reports you handle" />
        <SummaryCard label="High priority" value={counts.high} sub="Across your assigned cases" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-rose-300" />
              <h2 className="text-sm font-semibold text-white">My cases desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Cases currently assigned to you. Open a row to continue handling — you are already the
              designated handler.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my disputes, reports, listings…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/40"
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategory(f.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                category === f.id
                  ? 'bg-rose-500/15 text-rose-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              {f.label}
              {typeof f.count === 'number' && (
                <span className="ml-1.5 text-[10px] opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Handler</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={`${c.source}-${c.id}`}
                  onClick={() => void openCase(c)}
                  className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{c.target}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                      {c.referenceNumber || c.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${sourceClass(c.source || c.type)}`}
                    >
                      {titleCase(c.source || c.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${priorityClass(c.priority)}`}
                    >
                      {titleCase(c.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass(c.status)}`}
                    >
                      {titleCase(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">
                    {c.assignedStaffName || c.assignedStaffId ? (
                      <>
                        <p className="inline-flex items-center gap-1 text-emerald-200/90">
                          <Hand className="h-3.5 w-3.5" />
                          You
                        </p>
                        <p className="text-[11px] text-zinc-500">{c.assignedRole || 'Staff'}</p>
                      </>
                    ) : (
                      <span className="text-amber-200/90">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{formatDateTime(c.openedAt)}</td>
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {c.canDelete && c.source !== 'identity' ? (
                      <button
                        type="button"
                        title="Delete case"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                    {currentStaffId
                      ? cases.length === 0
                        ? 'No cases are assigned to you yet. Assign yourself to a dispute, report, listing, or identity review to see it here.'
                        : 'No assigned cases match this filter.'
                      : 'Staff session required to show your assigned cases.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected?.source === 'dispute' && (
        <ModeratorDisputeDetailModal
          disputeId={selected.id}
          endpointBase="/api/admin/disputes"
          accent="rose"
          adminMode
          onClose={closeDetail}
          onUpdated={onUpdated}
        />
      )}

      {selected?.source === 'report' && (
        <ReportCaseDetailModal
          reportId={selected.id}
          onClose={closeDetail}
          onUpdated={onUpdated}
        />
      )}

      {selected?.source === 'listing' && (
        <ListingCaseDetailModal
          caseItem={selected}
          onClose={closeDetail}
          onUpdated={onUpdated}
        />
      )}

      {identityLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:pl-[260px]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
        </div>
      )}

      {identityUser && selected?.source === 'identity' && (
        <VerificationModal
          entityName={identityUser.name}
          accountId={identityUser.accountId}
          verification={identityUser.verification}
          loadDiditDetails
          onClose={closeDetail}
          onChanged={() => {
            closeDetail();
            onUpdated();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:pl-[260px]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setDeleteTarget(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Delete this case?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Remove “{deleteTarget.type}” for {deleteTarget.target} from your queue.
              {deleteTarget.source === 'listing'
                ? ' The listing will be marked as rejected.'
                : ' The record will be soft-deleted or closed.'}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
