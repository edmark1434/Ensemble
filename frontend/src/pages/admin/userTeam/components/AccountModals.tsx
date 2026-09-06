import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, X } from 'lucide-react';
import api from '@/lib/axios';
import {
  adjustAccountCredits,
  freezeAccountCredits,
  handleAccountActionError,
  pardonAccount,
  setAccountVerification,
  warnAccount,
} from '../accountActions';
import type {
  CreditActivityItem,
  AdminVerificationDetails,
  PlatformTeam,
  PlatformUserAccount,
  VerificationDetail,
} from '../userTeamTypes';
import { getBusinessDocumentLabel } from '@/pages/user/9_verification/businessVerificationConfig';

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

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return null;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
}

function ProfileAvatar({
  path,
  name,
  size = 'lg',
}: {
  path: string | null | undefined;
  name: string;
  size?: 'lg' | 'xl';
}) {
  const [failed, setFailed] = useState(false);
  const url = buildAvatarUrl(path);
  const dims = size === 'xl' ? 'h-24 w-24 text-3xl' : 'h-16 w-16 text-2xl';

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={`${name} avatar`}
        onError={() => setFailed(true)}
        className={`${dims} shrink-0 rounded-2xl border border-white/[0.1] object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-rose-500/20 font-bold text-rose-100`}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
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
  action: 'ban' | 'suspend' | 'restore' | 'lock' | 'unban' | 'unsuspend' | 'unlock';
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
    unban: {
      title: 'Unban account',
      verb: 'unban',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    unsuspend: {
      title: 'Unsuspend account',
      verb: 'unsuspend',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    unlock: {
      title: 'Unlock account',
      verb: 'unlock',
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
        This updates the account status in the database immediately.
        {['unban', 'unsuspend', 'unlock', 'restore'].includes(action)
          ? ' The account will regain normal platform access.'
          : ' Use Unban / Unsuspend / Unlock later to return them to Active.'}
      </p>
    </ModalShell>
  );
}

export function PardonAccountModal({
  entityName,
  accountId,
  onClose,
  onChanged,
}: {
  entityName: string;
  accountId: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [note, setNote] = useState('Administrative pardon');
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell
      title="Pardon account"
      subtitle={`${entityName} — clear active violations and restore access`}
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
                await pardonAccount(accountId, note);
                onChanged?.();
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Pardoning…' : 'Issue pardon'}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-zinc-300">
        A <span className="text-white">pardon</span> records forgiveness in the{' '}
        <code className="text-xs text-zinc-400">pardons</code> table, marks active violations as
        pardoned, ends open restrictions, and sets the account back to Active.
      </p>
      <label className="block text-xs text-zinc-500">
        Note (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
        />
      </label>
    </ModalShell>
  );
}

export function BulkConfirmModal({
  count,
  actionLabel,
  resultLabel,
  tone = 'bg-rose-500/90 hover:bg-rose-500',
  onClose,
  onConfirm,
}: {
  count: number;
  actionLabel: string;
  resultLabel: string;
  tone?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell
      title={actionLabel}
      subtitle={`${count} selected account${count === 1 ? '' : 's'} → ${resultLabel}`}
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
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${tone}`}
          >
            {saving ? 'Applying…' : `Apply to ${count}`}
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-300">
        This runs the same action on every highlighted row. Accounts that fail individually will be
        reported without blocking the rest.
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
}: {
  team: PlatformTeam;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
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
            Credits & wallet
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
            Violations & disputes
          </button>
        </div>
      }
    >
      {/* Identity header with team avatar */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
        <ProfileAvatar path={team.avatarPath} name={team.name} size="xl" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">{team.name}</p>
          {team.handle && <p className="text-sm text-zinc-400">@{team.handle}</p>}
          {team.tagline && <p className="mt-1 text-sm italic text-zinc-500">“{team.tagline}”</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">{team.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {team.verificationStatus}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {team.description && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">About</p>
          <p className="mt-1 text-sm text-zinc-300">{team.description}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-500">Team leader</p>
            <p className="font-semibold text-white">{team.leaderName}</p>
            {team.leaderEmail && <p className="text-xs text-zinc-500">{team.leaderEmail}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Members</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {team.members.map((m) => (
                <li key={String(m.id)}>
                  {m.name} <span className="text-zinc-600">· {m.role}</span>
                  {m.email && <span className="ml-1 text-xs text-zinc-600">({m.email})</span>}
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
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Merit score</dt>
              <dd className="text-emerald-300">{(team.meritCredits ?? 0).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Wallet balance', (team.walletBalance ?? team.stats.totalCredits).toLocaleString()],
              ['Frozen credits', (team.frozenBalance ?? 0).toLocaleString()],
              ['Total assets', team.stats.totalAssets],
              ['Total jobs', team.stats.totalJobs],
              ['Job earnings', team.stats.totalJobEarnings.toLocaleString()],
              ['Total revenue', `${team.stats.totalRevenue.toLocaleString()}`],
              ['Total posts', team.stats.totalPosts.toLocaleString()],
              ['Reactions', team.stats.totalReactions.toLocaleString()],
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
  frozenBalance = 0,
  totalRevenue,
  onClose,
  onChanged,
}: {
  title: string;
  accountId: string;
  activity: CreditActivityItem[];
  totalCredits: number;
  frozenBalance?: number;
  totalRevenue?: number;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('Admin credit adjustment');
  const [saving, setSaving] = useState(false);
  const isFrozen = frozenBalance > 0;

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
            {!isFrozen && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void run(() => freezeAccountCredits(accountId, true))}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
              >
                Freeze credits
              </button>
            )}
            {isFrozen && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void run(() => freezeAccountCredits(accountId, false))}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Unfreeze
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-8 text-sm">
        <div>
          <p className="text-zinc-500">Total credits</p>
          <p className="text-xl font-bold text-white">{totalCredits.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-zinc-500">Frozen credits</p>
          <p className={`text-xl font-bold ${isFrozen ? 'text-amber-300' : 'text-zinc-500'}`}>
            {frozenBalance.toLocaleString()}
          </p>
        </div>
        {totalRevenue != null && (
          <div>
            <p className="text-zinc-500">Total revenue</p>
            <p className="text-xl font-bold text-emerald-300">{totalRevenue.toLocaleString()}</p>
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

const VERIFICATION_DURATION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
] as const;

function VerificationStatusBadge({ status }: { status: string | null }) {
  const value = status || 'Unavailable';
  const normalized = value.toLowerCase();
  const tone = normalized.includes('approv') || normalized.includes('complete')
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : normalized.includes('declin') || normalized.includes('reject')
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${tone}`}>{value}</span>;
}

function VerificationImage({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <img
        src={url}
        alt={label}
        referrerPolicy="no-referrer"
        className="h-32 w-full rounded-lg border border-white/[0.08] bg-black/30 object-cover transition group-hover:border-white/20"
      />
    </a>
  );
}

function verificationAttachmentUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  return cloudfront ? `${cloudfront}/${path.replace(/^\/+/, '')}` : path;
}

function DiditVerificationPanel({
  details,
  loading,
  error,
}: {
  details: AdminVerificationDetails | null;
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="rounded-xl border border-white/[0.08] p-4 text-sm text-zinc-400">Loading verification activity...</p>;
  if (error) return <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">{error}</p>;
  if (!details) return null;

  if (details.isTeam) {
    const attachments = details.attachments || [];
    const business = details.businessDetails;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs text-zinc-500">Verification status</p>
            <VerificationStatusBadge status={details.verificationStatus} />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Business account</p>
            <p className={`font-medium ${details.isVerified ? 'text-emerald-300' : 'text-zinc-300'}`}>
              {details.isVerified ? 'Verified' : 'Unverified'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Submitted documents</p>
            <p className="font-medium text-white">{attachments.length}</p>
          </div>
        </div>

        {business && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <h4 className="mb-3 text-sm font-semibold text-white">Business information</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Business type</p>
                <p className="mt-1 text-sm text-white">{business.businessType}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registered business name</p>
                <p className="mt-1 text-sm text-white">{business.registeredBusinessName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registration number</p>
                <p className="mt-1 text-sm text-white">{business.registrationNumber}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registration country</p>
                <p className="mt-1 text-sm text-white">{business.registrationCountry}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Submitted by</p>
                <p className="mt-1 text-sm text-white">{business.submittedByName}</p>
                {business.submittedByHandle && (
                  <p className="text-xs text-zinc-500">@{business.submittedByHandle}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500">Submitter's role / relationship</p>
                <p className="mt-1 text-sm text-white">{business.relationshipToBusiness}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h4 className="mb-3 text-sm font-semibold text-white">Business verification documents</h4>
          {attachments.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {attachments.map((attachment) => {
                const url = verificationAttachmentUrl(attachment.path);
                const documentLabel = getBusinessDocumentLabel(attachment.documentType);
                const isImage = attachment.mimeType.startsWith('image/');
                const isPdf = attachment.mimeType === 'application/pdf';
                return (
                  <div
                    key={attachment.fileId}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 transition hover:border-blue-400/30"
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={documentLabel}
                        className="h-48 w-full bg-black/30 object-contain"
                      />
                    ) : isPdf ? (
                      <iframe
                        src={`${url}#toolbar=0&navpanes=0`}
                        title={`${documentLabel} preview`}
                        className="h-48 w-full bg-white"
                      />
                    ) : (
                      <div className="grid h-48 place-items-center bg-black/30 text-xs text-zinc-500">
                        Preview unavailable for this file type
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{documentLabel}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${attachment.isRequired ? 'bg-rose-500/15 text-rose-300' : 'bg-white/5 text-zinc-400'}`}>
                          {attachment.isRequired ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-400">{attachment.name}</p>
                      <p className="mt-1 break-all text-[10px] text-zinc-600">{attachment.path}</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Open document
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No business documents submitted.</p>
          )}
        </div>
      </div>
    );
  }

  if (details.activity === 'none') {
    return <p className="rounded-xl border border-dashed border-white/[0.1] p-5 text-center text-sm text-zinc-500">No Verification Activity</p>;
  }

  if (details.activity !== 'details' || !details.decision) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] p-3">
            <p className="text-xs text-zinc-400">Verification status</p>
            <VerificationStatusBadge status={details.verificationStatus} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] p-3">
            <p className="text-xs text-zinc-400">KYC status</p>
            <VerificationStatusBadge status={details.kycStatus} />
          </div>
        </div>
        {details.activity === 'details_unavailable' && (
          <p className="mt-2 text-xs text-amber-300">Detailed verification results are temporarily unavailable.</p>
        )}
      </div>
    );
  }

  const { idVerification, liveness, faceMatch, ipAnalysis } = details.decision;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-3">
        <div><p className="mb-2 text-xs text-zinc-500">Verification status</p><VerificationStatusBadge status={details.verificationStatus} /></div>
        <div><p className="mb-2 text-xs text-zinc-500">KYC status</p><VerificationStatusBadge status={details.kycStatus} /></div>
        <div><p className="mb-2 text-xs text-zinc-500">Didit decision</p><VerificationStatusBadge status={details.decision.status} /></div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">ID verification</h4>
            {idVerification?.documentType && <p className="text-xs text-zinc-500">{idVerification.documentType}</p>}
          </div>
          <VerificationStatusBadge status={idVerification?.status || null} />
        </div>
        {idVerification ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <VerificationImage label="ID front" url={idVerification.frontImage} />
            <VerificationImage label="ID back" url={idVerification.backImage} />
            <VerificationImage label="ID portrait" url={idVerification.portraitImage} />
          </div>
        ) : <p className="text-xs text-zinc-500">No ID verification result.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h4 className="text-sm font-semibold text-white">Liveness</h4>{liveness?.score != null && <p className="text-xs text-zinc-500">Score: {liveness.score}</p>}</div>
            <VerificationStatusBadge status={liveness?.status || null} />
          </div>
          <VerificationImage label="Liveness image" url={liveness?.referenceImage || null} />
          {liveness?.videoUrl && <a href={liveness.videoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-sky-300 hover:underline">Open liveness video</a>}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h4 className="text-sm font-semibold text-white">Face match</h4>{faceMatch?.score != null && <p className="text-xs text-zinc-500">Score: {faceMatch.score}</p>}</div>
            <VerificationStatusBadge status={faceMatch?.status || null} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <VerificationImage label="Source face" url={faceMatch?.sourceImage || null} />
            <VerificationImage label="Target face" url={faceMatch?.targetImage || null} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Device and IP analysis</h4>
          <VerificationStatusBadge status={ipAnalysis?.status || null} />
        </div>
        {ipAnalysis ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-zinc-500">IP address</dt><dd className="mt-1 text-white">{ipAnalysis.ipAddress || '—'}</dd></div>
            <div><dt className="text-zinc-500">Location</dt><dd className="mt-1 text-white">{[ipAnalysis.city, ipAnalysis.region, ipAnalysis.country].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt className="text-zinc-500">Device</dt><dd className="mt-1 text-white">{[ipAnalysis.deviceBrand, ipAnalysis.deviceModel].filter(Boolean).join(' ') || '—'}</dd></div>
            <div><dt className="text-zinc-500">Browser</dt><dd className="mt-1 text-white">{ipAnalysis.browser || '—'}</dd></div>
            <div><dt className="text-zinc-500">Operating system</dt><dd className="mt-1 text-white">{ipAnalysis.operatingSystem || '—'}</dd></div>
            <div><dt className="text-zinc-500">Network flags</dt><dd className="mt-1 text-white">{ipAnalysis.isVpnOrTor ? 'VPN/Tor detected' : ipAnalysis.isDataCenter ? 'Data center detected' : 'No risk flags'}</dd></div>
          </dl>
        ) : <p className="text-xs text-zinc-500">No device or IP analysis result.</p>}
      </div>
    </div>
  );
}

export function VerificationModal({
  entityName,
  accountId,
  verification,
  onClose,
  onChanged,
  loadDiditDetails = false,
}: {
  entityName: string;
  accountId: string;
  verification: VerificationDetail;
  onClose: () => void;
  onChanged?: () => void;
  loadDiditDetails?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [validityDays, setValidityDays] = useState(365);
  const [customDays, setCustomDays] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionReasonError, setActionReasonError] = useState('');
  const actionReasonRef = useRef<HTMLTextAreaElement>(null);
  const [reverificationRequirements, setReverificationRequirements] = useState({
    idDocument: false,
    liveness: false,
    faceMatch: false,
    ipAnalysis: false,
  });
  const [showReverificationModal, setShowReverificationModal] = useState(false);
  const [diditDetails, setDiditDetails] = useState<AdminVerificationDetails | null>(null);
  const [diditLoading, setDiditLoading] = useState(loadDiditDetails);
  const [diditError, setDiditError] = useState('');
  const [diditRefreshToken, setDiditRefreshToken] = useState(0);

  useEffect(() => {
    if (!loadDiditDetails) return;
    let cancelled = false;
    const load = async () => {
      setDiditLoading(true);
      setDiditError('');
      try {
        const response = await api.get(`/api/admin/accounts/${accountId}/verification-details`);
        if (!cancelled) setDiditDetails(response.data?.data || null);
      } catch {
        if (!cancelled) setDiditError('Unable to load verification activity.');
      } finally {
        if (!cancelled) setDiditLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [accountId, diditRefreshToken, loadDiditDetails]);

  const resolvedDays = useCustom
    ? Math.min(Math.max(Number(customDays) || 0, 1), 3650)
    : validityDays;

  const durationLabel = (() => {
    if (resolvedDays === 365) return '1 year';
    if (resolvedDays === 180) return '6 months';
    if (resolvedDays === 730) return '2 years';
    return `${resolvedDays} day${resolvedDays === 1 ? '' : 's'}`;
  })();

  const storedValidityLabel = (() => {
    const verifiedAt = diditDetails?.verifiedAt;
    const expiresAt = diditDetails?.expiresAt || verification.expiresAt;
    if (!verifiedAt || !expiresAt) return '1 year (default)';

    const days = Math.round(
      (new Date(expiresAt).getTime() - new Date(verifiedAt).getTime()) / 86_400_000
    );
    if (!Number.isFinite(days) || days <= 0) return '—';
    if (Math.abs(days - 365) <= 1 || Math.abs(days - 366) <= 1) return '1 year';
    if (Math.abs(days - 730) <= 2 || Math.abs(days - 731) <= 2) return '2 years';
    if (Math.abs(days - 180) <= 1) return '6 months';
    return `${days} days`;
  })();

  const isAlreadyApproved =
    (diditDetails?.isTeam || String(diditDetails?.kycStatus || '').toLowerCase() === 'approved')
    && ['approved', 'verified'].includes(
      String(diditDetails?.verificationStatus || verification.status || '').toLowerCase()
    )
    && Boolean(diditDetails?.isVerified);

  const requiresActionReason = (action: string) =>
    Boolean(loadDiditDetails)
    && ['approve', 'decline', 'reverify'].includes(action)
    && !(action === 'approve' && isAlreadyApproved);

  // Only personal-account verification is backed by Didit/KYC nodes. Team
  // verification is a separate business-document workflow and must never ask
  // the administrator to select personal identity evidence.
  const isUserDiditVerification = Boolean(loadDiditDetails && diditDetails && !diditDetails.isTeam);

  const focusActionReason = () => {
    window.requestAnimationFrame(() => {
      actionReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      actionReasonRef.current?.focus();
    });
  };

  const apply = async (action: string) => {
    if (requiresActionReason(action) && !actionReason.trim()) {
      setActionReasonError('A reason is required before submitting this action.');
      focusActionReason();
      return false;
    }
    if (action === 'reverify' && isUserDiditVerification && !Object.values(reverificationRequirements).some(Boolean)) {
      setActionReasonError('Select at least one item that the user must resubmit.');
      return false;
    }
    setActionReasonError('');
    setSaving(true);
    try {
      await setAccountVerification(accountId, action, {
        validityDays: action === 'approve' ? resolvedDays : undefined,
        diditWorkflow: loadDiditDetails,
        comment: actionReason.trim() || undefined,
        reverificationRequirements:
          action === 'reverify' && isUserDiditVerification
            ? reverificationRequirements
            : undefined,
      });
      // Refresh the parent record first so prop-based modal content (status, expiry,
      // verification logs) is current, then reload the Didit detail panel.
      await onChanged?.();
      if (loadDiditDetails) setDiditRefreshToken((value) => value + 1);
      return true;
    } catch (err) {
      handleAccountActionError(err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ModalShell
      title={`${entityName} verification`}
      subtitle={
        verification.isExpired
          ? 'Status: Reverification required — previous verification has expired'
          : verification.expiresAt
            ? `Status: ${verification.status} · Valid until ${formatDate(verification.expiresAt)}`
            : `Status: ${verification.status}`
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || (useCustom && (!customDays || Number(customDays) <= 0))}
            onClick={() => void apply('approve')}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Approve for {durationLabel}
          </button>
          {[
            { label: 'Decline', action: 'decline' },
            { label: 'Require reverification now', action: 'reverify' },
          ].map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={saving}
              onClick={() => {
                if (item.action === 'reverify' && isUserDiditVerification) {
                  if (requiresActionReason(item.action) && !actionReason.trim()) {
                    setActionReasonError('A reason is required before submitting this action.');
                    focusActionReason();
                    return;
                  }
                  setShowReverificationModal(true);
                  return;
                }
                void apply(item.action);
              }}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white hover:bg-white/[0.05] disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <label className="mb-4 block text-xs text-zinc-500">
          Reason for verification action{' '}
          <span className="text-red-400">* (required for Didit status actions)</span>
          <textarea
            ref={actionReasonRef}
            value={actionReason}
            onChange={(event) => {
              setActionReason(event.target.value);
              if (event.target.value.trim()) setActionReasonError('');
            }}
            required={Boolean(loadDiditDetails) && !isAlreadyApproved}
            aria-invalid={Boolean(actionReasonError)}
            aria-describedby={actionReasonError ? 'verification-action-reason-error' : undefined}
            maxLength={1000}
            rows={3}
            placeholder="Explain why this verification is being approved, declined, or sent for reverification"
            className={`mt-1 w-full resize-y rounded-lg border bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 ${
              actionReasonError ? 'border-red-500/70' : 'border-white/[0.1]'
            }`}
          />
          {actionReasonError && (
            <span id="verification-action-reason-error" className="mt-1 block text-red-400">
              {actionReasonError}
            </span>
          )}
        </label>
        {showReverificationModal && isUserDiditVerification && (
          <fieldset className="fixed inset-0 z-[60] m-0 flex items-center justify-center border-0 bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12131a] p-5 shadow-2xl">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Required for reverification
            </legend>
            <p className="mb-3 text-xs text-zinc-500">
              Select only the evidence the user must submit again. This selection is applied when you choose “Require reverification now”.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'idDocument', label: 'ID document (front and back)' },
                { key: 'liveness', label: 'Liveness' },
                { key: 'faceMatch', label: 'Face match' },
                { key: 'ipAnalysis', label: 'IP analysis' },
              ].map(({ key, label }) => {
                const checked = reverificationRequirements[key as keyof typeof reverificationRequirements];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
                        : 'border-white/[0.1] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setReverificationRequirements((current) => ({ ...current, [key]: !current[key as keyof typeof current] }));
                        setActionReasonError('');
                      }}
                      className="h-4 w-4 accent-amber-400"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowReverificationModal(false)}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !Object.values(reverificationRequirements).some(Boolean)}
                onClick={() => void apply('reverify').then((submitted) => { if (submitted !== false) setShowReverificationModal(false); })}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Requesting...' : 'Request reverification'}
              </button>
            </div>
            </div>
          </fieldset>
        )}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {loadDiditDetails && (
            <div>
              <p className="text-xs text-zinc-500">Account status</p>
              <p className={`font-medium ${diditDetails?.isVerified ? 'text-emerald-300' : 'text-zinc-300'}`}>
                {diditLoading ? 'Loading...' : diditDetails?.isVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-500">Current status</p>
            <p className={verification.isExpired ? 'font-medium text-amber-300' : 'font-medium text-white'}>
              {diditDetails?.verificationStatus || verification.status}
            </p>
          </div>
          {loadDiditDetails && (
            !diditDetails?.isTeam && (
            <div>
              <p className="text-xs text-zinc-500">KYC status</p>
              <p className="font-medium text-white">
                {diditLoading ? 'Loading...' : diditDetails?.kycStatus || '—'}
              </p>
            </div>
            )
          )}
          <div>
            <p className="text-xs text-zinc-500">Verification expires</p>
            <p className="font-medium text-white">{formatDate(verification.expiresAt)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Validity period</p>
            <p className="font-medium text-white">{storedValidityLabel}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Approval validity period
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VERIFICATION_DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setUseCustom(false);
                  setValidityDays(opt.value);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  !useCustom && validityDays === opt.value
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/[0.08] text-zinc-400 hover:text-white'
                }`}
              >
                {opt.label}
                {opt.value === 365 ? ' (default)' : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                useCustom
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>
          {useCustom && (
            <label className="mt-3 block text-xs text-zinc-500">
              Custom days (1–3650)
              <input
                type="number"
                min={1}
                max={3650}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="e.g. 400"
                className="mt-1 w-36 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white"
              />
            </label>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Approving will set expiry to {durationLabel} from now.
          </p>
        </div>

        {loadDiditDetails ? (
          <DiditVerificationPanel details={diditDetails} loading={diditLoading} error={diditError} />
        ) : verification.document ? (
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
              Verification is tracked via account_verification. Choose a validity period, then approve.
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
    </>
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
  const activeDisputes =
    history.activeDisputes?.length
      ? history.activeDisputes
      : history.activeDispute
        ? [history.activeDispute]
        : [];

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
          <p className="text-xs text-zinc-500">Active disputes</p>
          <p className="text-2xl font-bold text-amber-300">{activeDisputes.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Active disputes</h3>
          {activeDisputes.length > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Needs attention
            </span>
          )}
        </div>
        {activeDisputes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
            No active disputes for this account.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeDisputes.map((d, index) => (
              <li
                key={d.id || `${d.title}-${index}`}
                className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-amber-100">{d.title}</p>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                    {d.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{d.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Handled by {d.handler || d.by || 'Staff'} · Against {d.against || '—'}
                  {d.id ? ` · ${d.id}` : ''}
                  {d.timeAgo ? ` · ${d.timeAgo}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Violation history</h3>
          <ul className="space-y-3">
            {history.violations.length === 0 && (
              <p className="text-sm text-zinc-500">No violations on record.</p>
            )}
            {history.violations.map((v) => (
              <li key={v.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p className="font-medium text-white">{v.type}</p>
                <p className="mt-1 text-zinc-500">{v.reason}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  By: {v.by} · +{v.points} warning points · {v.id} · {v.timeAgo}
                  {v.expiresAt ? ` · expires ${new Date(v.expiresAt).toLocaleDateString()}` : ''}
                  {v.active === false ? ' · inactive' : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">All disputes</h3>
          <ul className="space-y-3">
            {history.disputes.length === 0 && (
              <p className="text-sm text-zinc-500">No disputes on record.</p>
            )}
            {history.disputes.map((d) => {
              const isActive = !String(d.status)
                .toLowerCase()
                .match(/resolv|closed|dismiss/);
              return (
                <li
                  key={d.id}
                  className={`rounded-lg p-3 text-sm ${
                    isActive
                      ? 'border border-amber-500/20 bg-amber-500/[0.06]'
                      : 'bg-white/[0.03]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{d.title}</p>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-zinc-500">{d.description}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    By: {d.by} · {d.status} · {d.id} · {d.timeAgo}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-white">Account activity</h3>
        <ul className="space-y-3">
          {(!history.activity || history.activity.length === 0) && (
            <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
              No account activity recorded yet.
            </p>
          )}
          {(history.activity || []).map((item) => (
            <li key={item.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-white">{item.action}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {item.eventCode.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {item.actorName || 'System'}
                {item.actorRole ? ` · ${item.actorRole}` : ''}
                {' · '}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'}
                {item.referencePrefix && item.referenceId
                  ? ` · ${item.referencePrefix}-${String(item.referenceId).slice(0, 8)}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
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
  const [type, setType] = useState('Account warning');
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
                  type,
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
          Type
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
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
          <span className="mt-1 block text-[11px] text-zinc-600">
            Expires automatically: {Math.max(1, Number(points) || 1) * 30} days from issue
          </span>
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
}: {
  user: PlatformUserAccount;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
}) {
  return (
    <ModalShell
      title={user.name}
      subtitle={`ID: ${user.profileId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          {onOpenCredit && (
            <button
              type="button"
              onClick={onOpenCredit}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Credits & wallet
            </button>
          )}
          {onOpenVerification && (
            <button
              type="button"
              onClick={onOpenVerification}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Verification
            </button>
          )}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Violations & disputes
            </button>
          )}
        </div>
      }
    >
      {/* Identity header with avatar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
        <ProfileAvatar path={user.avatarPath} name={user.name} size="xl" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">
            {[user.profile?.firstName, user.profile?.middleName, user.profile?.lastName, user.profile?.suffix]
              .filter(Boolean)
              .join(' ') || user.name}
          </p>
          <p className="text-sm text-zinc-400">@{user.username}</p>
          {user.tagline && <p className="mt-1 text-sm italic text-zinc-500">“{user.tagline}”</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">{user.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {user.verificationStatus}
            </span>
            {user.profile?.subscriptionPlan && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                {user.profile.subscriptionPlan}
              </span>
            )}
          </div>
        </div>
      </div>

      {user.description && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">About</p>
          <p className="mt-1 text-sm text-zinc-300">{user.description}</p>
        </div>
      )}

      {/* Account */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Account</p>
      <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-white">
            {user.email}
            {user.profile?.isEmailVerified ? (
              <span className="ml-2 text-xs text-emerald-300">Verified</span>
            ) : (
              <span className="ml-2 text-xs text-amber-300">Unverified</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Display name</dt>
          <dd className="text-white">{user.displayName || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Joined</dt>
          <dd className="text-zinc-300">{formatDateTime(user.joinedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Onboarding</dt>
          <dd className="text-zinc-300">{user.profile?.completedOnboarding || 'Not completed'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Payment profile</dt>
          <dd className="text-white">{user.hasPaymentProfile ? 'Linked' : 'Not linked'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Firebase account</dt>
          <dd className="text-white">{user.hasFirebase ? 'Linked' : 'Not linked'}</dd>
        </div>
      </dl>

      {/* Personal details */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Personal details</p>
      <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Birth date</dt>
          <dd className="text-zinc-300">{formatDate(user.profile?.birthDate ?? null)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Country</dt>
          <dd className="text-zinc-300">{user.profile?.country || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Address</dt>
          <dd className="text-zinc-300">{user.profile?.address || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Zip code</dt>
          <dd className="text-zinc-300">{user.profile?.zipCode ?? '—'}</dd>
        </div>
      </dl>

      {/* Team memberships */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Team memberships
          </p>
          <span className="text-xs text-zinc-500">{user.teams?.length ?? 0} team(s)</span>
        </div>
        {user.teams?.length ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {user.teams.map((team) => (
              <div
                key={team.teamId}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <ProfileAvatar path={team.avatarPath} name={team.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{team.name}</p>
                  {team.handle && <p className="text-xs text-zinc-500">@{team.handle}</p>}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                      {team.role}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-400">
                      Membership: {team.membershipStatus}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-400">
                      Team: {team.teamStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Joined {formatDate(team.joinedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
            This user is not part of any team.
          </p>
        )}
      </div>

      {/* Credits & activity */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Credits & activity</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Merit', user.meritCredits.toLocaleString()],
          ['Wallet', user.stats.totalCredits.toLocaleString()],
          ['Frozen', (user.frozenBalance ?? 0).toLocaleString()],
          ['Assets', user.stats.totalAssets],
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
