import { useMemo, useState } from 'react';
import { Hand, Loader2, Search, ShieldAlert } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import { VerificationModal } from '../userTeam/components/AccountModals';
import type { PlatformUserAccount } from '../userTeam/userTeamTypes';
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
  if (s === 'pending' || s === 'pending review' || s === 'open') {
    return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  }
  if (s === 'unverified') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (s === 'verified' || s === 'approved') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  }
  if (s === 'rejected' || s === 'declined') return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
}

type StatusFilter = 'all' | 'open_queue' | 'unassigned' | 'assigned' | 'pending' | 'unverified';

function verificationOf(c: ModerationCase) {
  return String(c.verificationStatus || c.status || '').toLowerCase();
}

export default function IdentityVerificationTab({
  cases,
  currentStaffId,
  onUpdated,
}: {
  cases: ModerationCase[];
  currentStaffId?: string | number | null;
  onUpdated: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open_queue');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [identityUser, setIdentityUser] = useState<PlatformUserAccount | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);

  const myStaffId =
    currentStaffId != null && currentStaffId !== '' ? String(currentStaffId) : null;

  const counts = useMemo(() => {
    const openQueue = cases.length;
    const unassigned = cases.filter((c) => !c.assignedStaffId).length;
    const assigned = cases.filter((c) => Boolean(c.assignedStaffId)).length;
    const pending = cases.filter((c) => {
      const v = verificationOf(c);
      return v === 'pending' || v === 'pending review';
    }).length;
    const unverified = cases.filter((c) => verificationOf(c) === 'unverified').length;
    return { openQueue, unassigned, assigned, pending, unverified, total: cases.length };
  }, [cases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      const v = verificationOf(c);
      if (statusFilter === 'unassigned' && c.assignedStaffId) return false;
      if (statusFilter === 'assigned' && !c.assignedStaffId) return false;
      if (statusFilter === 'pending' && v !== 'pending' && v !== 'pending review') return false;
      if (statusFilter === 'unverified' && v !== 'unverified') return false;
      if (!q) return true;
      const hay = [
        c.target,
        c.targetHandle,
        c.reason,
        c.verificationStatus,
        c.assignedStaffName,
        c.assignedRole,
        c.status,
        c.priority,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cases, search, statusFilter]);

  const filters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open_queue', label: 'Open queue', count: counts.openQueue },
    { id: 'pending', label: 'Pending review', count: counts.pending },
    { id: 'unverified', label: 'Unverified', count: counts.unverified },
    { id: 'unassigned', label: 'Unassigned', count: counts.unassigned },
    { id: 'assigned', label: 'Assigned', count: counts.assigned },
    { id: 'all', label: 'All', count: counts.total },
  ];

  const isMine = (c: ModerationCase) =>
    myStaffId != null && c.assignedStaffId != null && String(c.assignedStaffId) === myStaffId;

  const openVerification = async (c: ModerationCase) => {
    if (!c.accountId) {
      showErrorToast('This identity case has no linked account');
      return;
    }
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
    } finally {
      setIdentityLoading(false);
    }
  };

  const handleAssignMyself = async (c: ModerationCase) => {
    if (!c.canAssignMyself) return;
    setBusyId(c.id);
    try {
      const res = await api.post(`/api/admin/moderation/cases/${c.id}/assign-myself`, {
        source: c.source,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to assign case');
      showSuccessToast(res.data.message || 'Case assigned to you');
      onUpdated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to assign case');
      showErrorToast(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open reviews" value={counts.openQueue} sub="Identity queue awaiting action" />
        <SummaryCard label="Pending review" value={counts.pending} sub="Submitted and awaiting decision" />
        <SummaryCard label="Unverified" value={counts.unverified} sub="Not yet submitted or incomplete" />
        <SummaryCard label="Unassigned" value={counts.unassigned} sub="Need a designated handler" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-300" />
              <h2 className="text-sm font-semibold text-white">Identity desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Review member identity submissions, assign handlers, and approve or reject verification.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username, status…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/40"
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === f.id
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
                <th className="px-5 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Queue status</th>
                <th className="px-4 py-3 font-medium">Handler</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const verification = c.verificationStatus || c.status;
                return (
                  <tr
                    key={c.id}
                    onClick={() => void openVerification(c)}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{c.target}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">@{c.targetHandle || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass(verification)}`}
                      >
                        {titleCase(verification)}
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
                          <p>{c.assignedStaffName || `Staff #${c.assignedStaffId}`}</p>
                          <p className="text-[11px] text-zinc-500">{c.assignedRole || 'Staff'}</p>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-200/90">
                          <Hand className="h-3.5 w-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-500">{formatDateTime(c.openedAt)}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {c.canAssignMyself && !isMine(c) ? (
                        <button
                          type="button"
                          title="Assign myself"
                          disabled={busyId === c.id}
                          onClick={() => void handleAssignMyself(c)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                        >
                          {busyId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Hand className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                    No identity reviews match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {identityLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:pl-[260px]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
        </div>
      )}

      {identityUser && (
        <VerificationModal
          entityName={identityUser.name}
          accountId={identityUser.accountId}
          verification={identityUser.verification}
          onClose={() => setIdentityUser(null)}
          onChanged={() => {
            setIdentityUser(null);
            onUpdated();
          }}
        />
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
