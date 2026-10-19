import { useEffect, useState } from 'react';
import { ExternalLink, Hand, Loader2, ShieldAlert, X } from 'lucide-react';
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

const REPORT_STATUS_OPTIONS = ['open', 'in_progress', 'closed'] as const;
const DECIDED_REPORT_STATUSES = ['resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned'];

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
    targetId: string | null;
    type: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: { staffId: string | number; name: string } | null;
    createdAt: string | null;
  };
  subject?: {
    headline: string;
    description: string;
    message: {
      unavailable?: boolean;
      content: string;
      attachments: string[];
      sentAt: string | null;
    } | null;
    links: { label: string; path: string }[];
    reportedAccount: {
      accountId: string;
      name: string;
      handle: string | null;
      path: string;
    } | null;
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
  const [sanctionOpen, setSanctionOpen] = useState(false);
  const [sanctionType, setSanctionType] = useState('warning');
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionDays, setSanctionDays] = useState('7');

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
      // Resolve/Dismiss should not re-validate assignee assignment.
      if (!overrideStatus && (!assigneeLocked || perms?.canAssignOthers || perms?.isAdmin)) {
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update report');
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const decide = async (action: 'sanction' | 'deny' | 'archive', extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      const res = await api.patch(`${endpointBase}/${reportId}`, { action, ...extra });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update report');
      showSuccessToast(
        action === 'sanction'
          ? 'Account sanctioned. The reporter has been notified.'
          : action === 'deny'
            ? 'Report denied'
            : 'Report archived'
      );
      setSanctionOpen(false);
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to update report');
      showErrorToast(msg);
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
      (perms?.canAssignMyself || perms?.canSelfAssign || Boolean(myStaffId && !report?.assignee))
  );
  // Reports are not release-locked like disputes — Admin can always reassign.
  const assigneeLocked = false;

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
              <h3 className="text-xl font-semibold text-white">{titleCaseLabel(report.type)}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Target: {titleCaseLabel(report.targetType)}
                {report.targetId ? ` · ${report.targetId}` : ''}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Reported by {report.reporter.name} (@{report.reporter.username}) ·{' '}
                {formatDateTime(report.createdAt)}
              </p>
              {detail.subject?.headline && (
                <p className="mt-2 text-sm font-medium text-zinc-200">{detail.subject.headline}</p>
              )}
            </div>

            {(detail.subject?.links?.length || detail.subject?.reportedAccount) && (
              <div className="flex flex-wrap gap-2">
                {detail.subject?.links?.map((link) => (
                  <a
                    key={link.path}
                    href={link.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-white/[0.08]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {detail.subject?.message && (
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Reported message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                  {detail.subject.message.unavailable && !detail.subject.message.content
                    ? 'This message is no longer available.'
                    : detail.subject.message.content || '[No text content]'}
                </p>
                {detail.subject.message.attachments.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Attachments: {detail.subject.message.attachments.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                {detail.subject?.description || report.description || 'No description was provided.'}
              </p>
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
                {['resolved', 'dismissed'].includes(toApiToken(status)) && (
                  <p className="text-[11px] text-zinc-500">
                    Current status: {titleCaseLabel(status)}
                  </p>
                )}
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
                    Handler is locked. Ask Admin to reassign this report.
                  </span>
                )}
                {!assigneeLocked && reportAssigneeId && (perms?.canAssignOthers || perms?.isAdmin) && (
                  <span className="text-[11px] text-violet-300/80">
                    Admin can reassign this report freely (no release step).
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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${accentBtn}`}
              >
                Save report changes
              </button>
            </div>

            {DECIDED_REPORT_STATUSES.includes(toApiToken(report.status)) ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                This report is {titleCaseLabel(report.status)}.
                {toApiToken(report.status) === 'sanctioned'
                  ? ' The reporter was notified.'
                  : ' The reporter was not notified.'}
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Decision</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Sanction notifies the reporter. Deny and archive do not.
                  </p>
                </div>
                {!perms?.canAct && (
                  <p className="text-xs text-amber-200/90">
                    Assign this report to yourself before you sanction, deny, or archive it.
                  </p>
                )}
                {sanctionOpen && (
                  <div className="space-y-2">
                    <label className="flex flex-col gap-1 text-xs text-zinc-500">
                      Sanction
                      <select
                        value={sanctionType}
                        onChange={(e) => setSanctionType(e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                      >
                        <option value="warning">Warning</option>
                        <option value="suspend">Suspend</option>
                        <option value="ban">Ban</option>
                      </select>
                    </label>
                    {sanctionType === 'suspend' && (
                      <label className="flex flex-col gap-1 text-xs text-zinc-500">
                        Days
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={sanctionDays}
                          onChange={(e) => setSanctionDays(e.target.value)}
                          className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-1 text-xs text-zinc-500">
                      Reason shown to the sanctioned account
                      <textarea
                        value={sanctionReason}
                        onChange={(e) => setSanctionReason(e.target.value)}
                        rows={3}
                        className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                      />
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || !perms?.canAct}
                    onClick={() => {
                      if (!sanctionOpen) {
                        setSanctionReason((current) => current || titleCaseLabel(report.type));
                        setSanctionOpen(true);
                        return;
                      }
                      void decide('sanction', {
                        sanctionType,
                        reason: sanctionReason.trim(),
                        days: sanctionType === 'suspend' ? Number(sanctionDays) : undefined,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {sanctionOpen ? 'Confirm sanction' : 'Sanction'}
                  </button>
                  <button
                    type="button"
                    disabled={saving || !perms?.canAct}
                    onClick={() => void decide('deny')}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    disabled={saving || !perms?.canAct}
                    onClick={() => void decide('archive')}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              </div>
            )}
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
