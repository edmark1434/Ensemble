import { useState, type ReactNode } from 'react';
import { Download, X } from 'lucide-react';
import {
  adjustAccountCredits,
  freezeAccountCredits,
  handleAccountActionError,
  setAccountStatus,
  setAccountVerification,
  warnAccount,
} from './accountActions';
import type {
  CreditActivityItem,
  PlatformTeam,
  PlatformUserAccount,
  VerificationDetail,
} from '../userTeamTypes';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/[0.08] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmStatusModal({
  entityName,
  action,
  onClose,
  onConfirm,
}: {
  entityName: string;
  action: 'ban' | 'suspend' | 'restore' | 'lock';
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const labels = {
    ban: { title: 'Ban account', verb: 'ban', result: 'Banned', tone: 'bg-rose-500/90 hover:bg-rose-500' },
    suspend: {
      title: 'Suspend account',
      verb: 'suspend',
      result: 'Suspended',
      tone: 'bg-amber-500/90 hover:bg-amber-500',
    },
    restore: {
      title: 'Restore account',
      verb: 'restore',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    lock: {
      title: 'Lock account',
      verb: 'lock',
      result: 'Locked',
      tone: 'bg-zinc-200 text-zinc-900 hover:bg-white',
    },
  }[action];

  return (
    <ModalShell
      title={labels.title}
      subtitle={`${entityName} will be set to ${labels.result}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm();
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${labels.tone}`}
          >
            {saving ? 'Saving…' : `Confirm ${labels.verb}`}
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-300">
        This updates the account status in the database immediately. You can reverse most actions with Restore.
      </p>
    </ModalShell>
  );
}

export function TeamOverviewModal({
  team,
  onClose,
  onOpenCredit,
  onOpenVerification,
  onOpenHistory,
  onOpenModeration,
}: {
  team: PlatformTeam;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
  onOpenModeration?: () => void;
}) {
  return (
    <ModalShell
      title={team.name}
      subtitle={`ID: ${team.id}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCredit}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Credit action
          </button>
          <button
            type="button"
            onClick={onOpenVerification}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Verification
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Violations
          </button>
          <button
            type="button"
            onClick={onOpenModeration}
            className="rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
          >
            Moderation
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/30 text-2xl font-bold text-white">
              {team.logoInitial}
            </div>
            <div>
              <p className="text-sm text-zinc-500">Team leader</p>
              <p className="font-semibold text-white">{team.leaderName}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Members</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {team.members.map((m) => (
                <li key={String(m.id)}>
                  {m.name} <span className="text-zinc-600">· {m.role}</span>
                </li>
              ))}
              {team.members.length === 0 && <li className="text-zinc-500">No members linked yet.</li>}
            </ul>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Contact</dt>
              <dd className="text-right text-zinc-300">{team.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Date created</dt>
              <dd className="text-zinc-300">{formatDateTime(team.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Last activity</dt>
              <dd className="text-zinc-300">{formatDateTime(team.lastSeenAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-white">{team.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Verification</dt>
              <dd className="text-white">{team.verificationStatus}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Total assets', team.stats.totalAssets],
              ['Total credits', team.stats.totalCredits.toLocaleString()],
              ['Total jobs', team.stats.totalJobs],
              ['Job earnings', team.stats.totalJobEarnings.toLocaleString()],
              ['Total revenue', `₱${team.stats.totalRevenue.toLocaleString()}`],
              ['Total posts', team.stats.totalPosts.toLocaleString()],
              ['Reactions', team.stats.totalReactions.toLocaleString()],
              ['Comments', team.stats.totalComments.toLocaleString()],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-lg bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase text-zinc-600">{label}</p>
                <p className="font-semibold text-white">{val}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Documents</p>
            <ul className="mt-2 space-y-2">
              {team.documents.length === 0 && (
                <li className="text-sm text-zinc-500">No verification documents on file.</li>
              )}
              {team.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-sm"
                >
                  <span className="text-zinc-300">{d.name}</span>
                  <button type="button" className="text-zinc-500 hover:text-white">
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function CreditActivityModal({
  title,
  accountId,
  activity,
  totalCredits,
  totalRevenue,
  onClose,
  onChanged,
}: {
  title: string;
  accountId: string;
  activity: CreditActivityItem[];
  totalCredits: number;
  totalRevenue?: number;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('Admin credit adjustment');
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      onChanged?.();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`${title} — Credits`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-500">
              Amount
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-28 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 block w-56 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void run(() => adjustAccountCredits(accountId, Math.abs(Number(amount) || 0), note))
              }
              className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Credit +
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void run(() => adjustAccountCredits(accountId, -Math.abs(Number(amount) || 0), note))
              }
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
            >
              Deduct −
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void run(() => freezeAccountCredits(accountId, true))}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
            >
              Freeze credits
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void run(() => freezeAccountCredits(accountId, false))}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Unfreeze
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex gap-8 text-sm">
        <div>
          <p className="text-zinc-500">Total credits</p>
          <p className="text-xl font-bold text-white">{totalCredits.toLocaleString()}</p>
        </div>
        {totalRevenue != null && (
          <div>
            <p className="text-zinc-500">Total revenue</p>
            <p className="text-xl font-bold text-emerald-300">₱{totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>
      <h3 className="mb-4 text-sm font-semibold text-zinc-400">Credits & economy activity feed</h3>
      <ul className="space-y-3">
        {activity.length === 0 && <li className="text-sm text-zinc-500">No credit transactions yet.</li>}
        {activity.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{item.type}</p>
              <p className="text-xs text-zinc-500">
                {item.label} · {item.timeAgo}
              </p>
            </div>
            <p className={`font-semibold tabular-nums ${item.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.positive ? '+' : ''}
              {item.amount.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

export function VerificationModal({
  entityName,
  accountId,
  verification,
  onClose,
  onChanged,
}: {
  entityName: string;
  accountId: string;
  verification: VerificationDetail;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const apply = async (action: string) => {
    setSaving(true);
    try {
      await setAccountVerification(accountId, action);
      onChanged?.();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`${entityName} verification`}
      subtitle={
        verification.reverificationDueDays
          ? `Status: ${verification.status} · Reverification due in ${verification.reverificationDueDays} days`
          : `Status: ${verification.status}`
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Approve', action: 'approve' },
            { label: 'Decline', action: 'decline' },
            { label: 'Pending', action: 'pending' },
            { label: 'Reverify', action: 'reverify' },
          ].map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={saving}
              onClick={() => void apply(item.action)}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white hover:bg-white/[0.05] disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        {verification.document ? (
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-white">{verification.document.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                By: {verification.document.uploadedBy} · Application ID: {verification.applicationId}
              </p>
              <p className="text-xs text-zinc-500">
                {verification.document.pages} pages · {verification.document.sizeMb} MB · Uploaded{' '}
                {formatDateTime(verification.document.uploadedAt)}
              </p>
            </div>
            <button type="button" className="text-zinc-400 hover:text-white">
              <Download className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div>
            <p className="font-medium text-white">No uploaded business document</p>
            <p className="mt-1 text-xs text-zinc-500">Application ID: {verification.applicationId}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Verification is tracked via account_verification. Approve or decline using the actions below.
            </p>
          </div>
        )}
      </div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-400">Verification process logs</h3>
      <ul className="space-y-4 border-l border-white/[0.08] pl-4">
        {verification.logs.length === 0 && <li className="text-sm text-zinc-500">No verification logs yet.</li>}
        {verification.logs.map((log) => (
          <li key={log.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
            <p className="text-sm font-medium text-white">{log.title}</p>
            <p className="text-xs text-zinc-500">
              {log.timeAgo} · By: {log.by} · ID: {log.ref}
            </p>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

export function HistoryModal({
  entityName,
  history,
  onClose,
}: {
  entityName: string;
  history: PlatformTeam['history'];
  onClose: () => void;
}) {
  return (
    <ModalShell title={`${entityName} history`} subtitle={history.summaryLabel} onClose={onClose}>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Total violations</p>
          <p className="text-2xl font-bold text-white">{history.totalViolations}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Total disputes</p>
          <p className="text-2xl font-bold text-white">{history.totalDisputes}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Open disputes</p>
          <p className="text-2xl font-bold text-amber-300">{history.openDisputes}</p>
        </div>
      </div>

      {history.activeDispute && (
        <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-200">{history.activeDispute.title}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Handled by {history.activeDispute.handler} · Against {history.activeDispute.against}
          </p>
          <p className="mt-1 text-sm text-zinc-300">{history.activeDispute.reason}</p>
          <p className="mt-2 text-xs text-amber-300/80">Status: {history.activeDispute.status}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Violation history</h3>
          <ul className="space-y-3">
            {history.violations.length === 0 && (
              <p className="text-sm text-zinc-500">No violations on record.</p>
            )}
            {history.violations.map((v) => (
              <li key={v.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p className="font-medium text-white">{v.title}</p>
                <p className="mt-1 text-zinc-500">{v.reason}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  By: {v.by} · +{v.points} warning points · {v.id} · {v.timeAgo}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Dispute history</h3>
          <ul className="space-y-3">
            {history.disputes.length === 0 && <p className="text-sm text-zinc-500">No disputes on record.</p>}
            {history.disputes.map((d) => (
              <li key={d.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p className="font-medium text-white">{d.title}</p>
                <p className="mt-1 text-zinc-500">{d.reason}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  By: {d.by} · {d.status} · {d.id} · {d.timeAgo}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}

export function ModerationActionModal({
  entityName,
  accountId,
  currentStatus,
  onClose,
  onChanged,
}: {
  entityName: string;
  accountId: string;
  currentStatus: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [reason, setReason] = useState('Moderation action by administrator');
  const [points, setPoints] = useState('1');
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      onChanged?.();
      onClose();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Moderation — ${entityName}`}
      subtitle={`Current status: ${currentStatus}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void run(() =>
                warnAccount(accountId, {
                  title: 'Account warning',
                  reason,
                  points: Number(points) || 1,
                })
              )
            }
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
          >
            Warn
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run(() => setAccountStatus(accountId, 'suspend'))}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Suspend
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run(() => setAccountStatus(accountId, 'lock'))}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Lock
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run(() => setAccountStatus(accountId, 'ban'))}
            className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Ban
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run(() => setAccountStatus(accountId, 'restore'))}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Restore
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-zinc-500 sm:col-span-2">
          Reason / notes
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-zinc-500">
          Warning points
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Warn creates a violation record. Suspend / Ban / Lock / Restore update the account status in Postgres.
      </p>
    </ModalShell>
  );
}

export function WarnAccountModal({
  entityName,
  accountId,
  onClose,
  onChanged,
}: {
  entityName: string;
  accountId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [title, setTitle] = useState('Account warning');
  const [reason, setReason] = useState('Warning issued by administrator');
  const [points, setPoints] = useState('1');
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell
      title={`Warn ${entityName}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await warnAccount(accountId, {
                  title,
                  reason,
                  points: Number(points) || 1,
                });
                onChanged?.();
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Issuing…' : 'Issue warning'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs text-zinc-500">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Points
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
    </ModalShell>
  );
}

export function UserOverviewModal({
  user,
  onClose,
  onOpenCredit,
  onOpenVerification,
  onOpenHistory,
  onOpenModeration,
}: {
  user: PlatformUserAccount;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
  onOpenModeration?: () => void;
}) {
  return (
    <ModalShell
      title={user.name}
      subtitle={`ID: ${user.profileId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCredit}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Credit action
          </button>
          <button
            type="button"
            onClick={onOpenVerification}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Verification
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
          >
            Violations
          </button>
          <button
            type="button"
            onClick={onOpenModeration}
            className="rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
          >
            Moderation
          </button>
        </div>
      }
    >
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-white">{user.email}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Username</dt>
          <dd className="text-white">@{user.username}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="text-white">{user.status}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Verification</dt>
          <dd className="text-white">{user.verificationStatus}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Merit credits</dt>
          <dd className="text-emerald-300">{user.meritCredits}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Payment profile</dt>
          <dd className="text-white">{user.hasPaymentProfile ? 'Linked' : 'Not linked'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Joined</dt>
          <dd className="text-zinc-300">{formatDateTime(user.joinedAt)}</dd>
        </div>
        {user.tagline && (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Tagline</dt>
            <dd className="text-zinc-300">{user.tagline}</dd>
          </div>
        )}
      </dl>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Assets', user.stats.totalAssets],
          ['Credits', user.stats.totalCredits.toLocaleString()],
          ['Jobs', user.stats.totalJobs],
          ['Posts', user.stats.totalPosts],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-lg bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase text-zinc-600">{l}</p>
            <p className="font-bold text-white">{v}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
