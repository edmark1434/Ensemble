import { useEffect, useState } from 'react';
import { CheckCircle2, Hand, Loader2, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { ModerationCase } from './moderationTypes';
import type { DisputePermissions } from '@/pages/admin/ticketManagement/ticketTypes';

function titleCaseLabel(value: string) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function statusButtonClass(label: string, active: boolean) {
  const s = String(label || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  if (!active) {
    return 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-200';
  }
  if (s === 'open') return 'border-red-500/40 bg-red-500/20 text-red-200';
  if (s === 'in progress') return 'border-amber-500/40 bg-amber-500/20 text-amber-200';
  if (s === 'resolved') return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200';
  if (s === 'dismissed') return 'border-violet-500/40 bg-violet-500/20 text-violet-200';
  if (s === 'closed') return 'border-zinc-500/40 bg-zinc-500/25 text-zinc-200';
  return 'border-white/25 bg-white/10 text-white';
}

const REPORT_STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'dismissed', 'closed'] as const;

function toApiToken(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ReportDetailPayload = {
  report: {
    id: string | number;
    number: string | null;
    reporter: { name: string; username: string };
    targetType: string;
    targetLabel: string | null;
    reason: string | null;
    description: string | null;
    status: string;
    priority: string;
    assignee: { staffId: string | number; name: string } | null;
    createdAt: string | null;
  };
  permissions?: DisputePermissions;
  assignableStaff: { staffId: string | number; name: string; role: string }[];
};

export function ReportCaseDetailModal({
  reportId,
  onClose,
  onUpdated,
  endpointBase = '/api/admin/reports',
  accent = 'rose',
}: {
  reportId: string | number;
  onClose: () => void;
  onUpdated: () => void;
  endpointBase?: string;
  accent?: 'rose' | 'sky' | 'violet' | 'emerald' | 'amber';
}) {
  const [detail, setDetail] = useState<ReportDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');

  const accentLabel =
    accent === 'sky'
      ? 'text-sky-400'
      : accent === 'violet'
        ? 'text-violet-400'
        : accent === 'emerald'
          ? 'text-emerald-400'
          : accent === 'amber'
            ? 'text-amber-400'
            : 'text-rose-400';
  const accentSpin =
    accent === 'sky'
      ? 'text-sky-400'
      : accent === 'violet'
        ? 'text-violet-400'
        : accent === 'emerald'
          ? 'text-emerald-400'
          : accent === 'amber'
            ? 'text-amber-400'
            : 'text-rose-400';
  const accentBtn =
    accent === 'sky'
      ? 'bg-sky-500/90 hover:bg-sky-500'
      : accent === 'violet'
        ? 'bg-violet-500/90 hover:bg-violet-500'
        : accent === 'emerald'
          ? 'bg-emerald-500/90 hover:bg-emerald-500'
          : accent === 'amber'
            ? 'bg-amber-500/90 hover:bg-amber-500'
            : 'bg-rose-500/90 hover:bg-rose-500';

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${reportId}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load report');
      const data = res.data.data as ReportDetailPayload;
      setDetail(data);
      setStatus(toApiToken(data.report.status));
      setPriority(toApiToken(data.report.priority));
      setAssigneeId(data.report.assignee?.staffId?.toString() || '');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, endpointBase]);

  const save = async (overrideStatus?: string) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: overrideStatus || status,
        priority,
      };
      if (!assigneeLocked) {
        payload.assigned_staff_id = assigneeId || null;
      }
      const res = await api.patch(`${endpointBase}/${reportId}`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update report');
      showSuccessToast(
        overrideStatus === 'resolved'
          ? 'Report resolved'
          : overrideStatus === 'dismissed'
            ? 'Report dismissed'
            : 'Report updated'
      );
      await load();
      onUpdated();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setSaving(false);
    }
  };

  const assignMyself = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`${endpointBase}/${reportId}`, { action: 'self_assign' });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to assign yourself');
      showSuccessToast('You are now assigned');
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to assign yourself');
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const releaseCase = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`${endpointBase}/${reportId}`, { action: 'release' });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to release case');
      showSuccessToast('Case released — another moderator can claim it');
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to release case');
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const report = detail?.report;
  const perms = detail?.permissions;
  const myStaffId = perms?.staffId != null ? String(perms.staffId) : '';
  const reportAssigneeId = report?.assignee?.staffId != null ? String(report.assignee.staffId) : '';
  const alreadyAssignedToMe = Boolean(
    perms?.isAssignee ||
      (myStaffId && reportAssigneeId && myStaffId.toLowerCase() === reportAssigneeId.toLowerCase())
  );
  const canAssignMyself = Boolean(
    !alreadyAssignedToMe &&
      !reportAssigneeId &&
      (perms?.canAssignMyself || perms?.canSelfAssign || Boolean(myStaffId && !report?.assignee))
  );
  const canRelease = Boolean(alreadyAssignedToMe || perms?.canRelease || perms?.isAssignee);
  const assigneeLocked = Boolean(reportAssigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[288px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${accentLabel}`}>Report detail</p>
            <h2 className="text-lg font-bold text-white">{report?.number || 'Report'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className={`h-8 w-8 animate-spin ${accentSpin}`} />
          </div>
        ) : detail && report ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {report.targetLabel || report.targetType}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Reported by {report.reporter.name} (@{report.reporter.username}) ·{' '}
                {formatDateTime(report.createdAt)}
              </p>
              {report.reason && <p className="mt-2 text-sm text-zinc-300">{report.reason}</p>}
              {report.description && report.description !== report.reason && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{report.description}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 text-xs text-zinc-500 sm:col-span-3">
                Status
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Report status">
                  {REPORT_STATUS_OPTIONS.map((s) => {
                    const active = toApiToken(status) === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        aria-pressed={active}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${statusButtonClass(s, active)}`}
                      >
                        {titleCaseLabel(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                >
                  {['low', 'medium', 'high'].map((p) => (
                    <option key={p} value={p}>
                      {titleCaseLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
                Assignee
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={assigneeLocked}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {detail.assignableStaff
                    .filter((s) => {
                      if (!myStaffId) return true;
                      const isMe =
                        String(s.staffId).toLowerCase() === myStaffId.toLowerCase();
                      // Keep current handler visible while locked; otherwise use Assign myself.
                      return !isMe || (assigneeLocked && alreadyAssignedToMe);
                    })
                    .map((s) => (
                      <option key={String(s.staffId)} value={String(s.staffId)}>
                        {s.name} ({s.role})
                        {myStaffId &&
                        String(s.staffId).toLowerCase() === myStaffId.toLowerCase()
                          ? ' (you)'
                          : ''}
                      </option>
                    ))}
                </select>
                {assigneeLocked && (
                  <span className="text-[11px] text-zinc-500">
                    Handler is locked. The assigned moderator must release the case before someone
                    else can claim it.
                  </span>
                )}
              </label>
            </div>

            {canAssignMyself && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void assignMyself()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <Hand className="h-4 w-4" />
                Assign myself
              </button>
            )}
            {canRelease && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void releaseCase()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Release case
              </button>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${accentBtn}`}
              >
                Save report changes
              </button>
              {!['resolved', 'closed', 'dismissed'].includes(toApiToken(report.status)) && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save('resolved')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save('dismissed')}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-zinc-500">Report not found.</p>
        )}
      </div>
    </div>
  );
}

export function ListingCaseDetailModal({
  caseItem,
  onClose,
  onUpdated,
}: {
  caseItem: ModerationCase;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const review = async (status: 'approved' | 'rejected' | 'delisted') => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/admin/moderation/cases/${caseItem.id}`, {
        source: 'listing',
        status,
        rejectionReason: status === 'rejected' ? rejectionReason.trim() || undefined : undefined,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to review listing');
      showSuccessToast(
        status === 'approved'
          ? 'Listing approved'
          : status === 'rejected'
            ? 'Listing rejected'
            : 'Listing delisted'
      );
      onUpdated();
      onClose();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to review listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">
              Listing review
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{caseItem.target}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {caseItem.referenceNumber || caseItem.targetHandle} · {formatDateTime(caseItem.openedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-zinc-400">{caseItem.reason}</p>

        <label className="mt-4 block text-xs text-zinc-500">
          Rejection reason (if rejecting)
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void review('rejected')}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void review('delisted')}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Delist
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void review('approved')}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
