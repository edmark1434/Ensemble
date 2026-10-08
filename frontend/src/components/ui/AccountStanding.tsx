import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Lock, ShieldAlert } from 'lucide-react';
import useGlobalState from '@/lib/global_state';

export type AccountViolation = {
  type?: string | null;
  reason?: string | null;
  points?: number | null;
  createdAt?: string | null;
};

export type AccountStanding = {
  status?: string | null;
  blocked?: boolean;
  suspended?: boolean;
  code?: string | null;
  message?: string | null;
  violations?: AccountViolation[];
};

const BLOCKING_CODES = new Set([
  'ACCOUNT_BANNED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_DELETED',
]);

export function isBlockingCode(code?: string | null) {
  return BLOCKING_CODES.has(String(code || ''));
}

export function standingFromPayload(payload: unknown): AccountStanding | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as {
    code?: string;
    message?: string;
    restriction?: AccountStanding;
    details?: AccountStanding;
  };
  const standing = data.restriction || data.details;
  if (standing?.blocked || isBlockingCode(standing?.code) || isBlockingCode(data.code)) {
    return {
      status: standing?.status,
      blocked: true,
      code: standing?.code || data.code,
      message: standing?.message || data.message,
      violations: standing?.violations || [],
    };
  }
  return null;
}

function standingKind(standing: AccountStanding) {
  const code = String(standing.code || '');
  const status = String(standing.status || '').toLowerCase();
  if (code === 'ACCOUNT_BANNED' || status === 'banned') return 'banned' as const;
  if (code === 'ACCOUNT_LOCKED' || status === 'locked') return 'locked' as const;
  if (code === 'ACCOUNT_DELETED' || status === 'deleted') return 'closed' as const;
  if (standing.suspended || code === 'ACCOUNT_SUSPENDED' || status === 'suspended') return 'suspended' as const;
  return 'warning' as const;
}

function restrictionCopy(standing: AccountStanding) {
  const kind = standingKind(standing);
  const Icon = kind === 'banned' || kind === 'closed' ? Ban : kind === 'locked' ? Lock : ShieldAlert;
  const label =
    kind === 'banned'
      ? 'Banned'
      : kind === 'suspended'
        ? 'Suspended'
        : kind === 'locked'
          ? 'Locked'
          : kind === 'closed'
            ? 'Closed'
            : 'Violation';
  const title =
    kind === 'banned'
      ? 'Your account is banned'
      : kind === 'suspended'
        ? 'Your account is suspended'
        : kind === 'locked'
          ? 'Your account is locked'
          : kind === 'closed'
            ? 'This account is closed'
            : 'Your account has a violation';
  const detail =
    kind === 'banned'
      ? 'You cannot sign in. A banned account is not allowed to log in to Ensemble.'
      : standing.message ||
        (kind === 'suspended'
          ? 'You can view your account and notifications. Actions are turned off until this is lifted.'
          : kind === 'warning'
            ? 'Further violations can suspend this account.'
            : 'You cannot sign in with this account.');
  const tone =
    kind === 'banned'
      ? {
          border: 'border-rose-500/35',
          wash: 'bg-rose-50/90 dark:bg-[#1a1216]/92',
          icon: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
          chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
        }
      : kind === 'suspended' || kind === 'warning'
        ? {
            border: 'border-amber-500/40',
            wash: 'bg-amber-50/90 dark:bg-[#1a1710]/92',
            icon: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
            chip: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
          }
        : {
            border: 'border-zinc-300 dark:border-white/15',
            wash: 'bg-white/90 dark:bg-[#16171c]/92',
            icon: 'bg-zinc-900/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
            chip: 'bg-zinc-900/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
          };
  return { kind, Icon, label, title, detail, tone };
}

function ViolationLines({ violations }: { violations: AccountViolation[] }) {
  if (!violations.length) return null;
  return (
    <ul className="mt-3 space-y-2">
      {violations.slice(0, 3).map((violation, index) => (
        <li
          key={`${violation.type || 'violation'}-${index}`}
          className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-left dark:border-white/10 dark:bg-white/[0.04]"
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {violation.type || 'Violation'}
            {Number(violation.points) > 0 ? ` · ${violation.points} pts` : ''}
          </p>
          {violation.reason ? (
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{violation.reason}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const RESTRICTION_ACTION =
  'inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200';

export function AccountStandingNotice({
  standing,
}: {
  standing: AccountStanding;
  compact?: boolean;
}) {
  return <AccountRestrictionCard standing={standing} />;
}

export function AccountRestrictionCard({
  standing,
  actionLabel,
  onAction,
}: {
  standing: AccountStanding;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { Icon, label, title, detail, tone } = restrictionCopy(standing);

  return (
    <div
      role="alert"
      className={`w-full overflow-hidden rounded-2xl border text-zinc-900 shadow-sm backdrop-blur-md dark:text-zinc-100 ${tone.border} ${tone.wash}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone.chip}`}>
            {label}
          </span>
          <p className="mt-1.5 text-base font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{detail}</p>
          <ViolationLines violations={standing.violations || []} />
        </div>
      </div>
      {actionLabel && onAction ? (
        <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
          <button type="button" onClick={onAction} className={RESTRICTION_ACTION}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SuspensionBanner({
  standing,
  onOpenNotifications,
}: {
  standing: AccountStanding;
  onOpenNotifications: () => void;
}) {
  const { Icon, detail, tone } = restrictionCopy(standing);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.75rem] z-[45] px-3 sm:px-5">
      <div
        role="alert"
        className={`pointer-events-auto mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center ${tone.border} ${tone.wash}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your account is suspended</p>
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{detail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Notifications
        </button>
      </div>
    </div>
  );
}

function AccountBlockedScreen({
  standing,
  onSignIn,
}: {
  standing: AccountStanding;
  onSignIn: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl">
        <AccountRestrictionCard standing={standing} actionLabel="Back to sign in" onAction={onSignIn} />
      </div>
    </div>
  );
}

export function AccountRestrictionHost() {
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const clearUser = useGlobalState((state) => state.clearUser);
  const [blocked, setBlocked] = useState<AccountStanding | null>(null);

  useEffect(() => {
    const onRestricted = (event: Event) => {
      const standing = standingFromPayload((event as CustomEvent).detail);
      if (!standing) return;
      const path = window.location.pathname;
      if (path === '/login' || path === '/admin' || path === '/staff') return;
      setBlocked(standing);
    };
    window.addEventListener('ensemble:account-restricted', onRestricted);
    return () => window.removeEventListener('ensemble:account-restricted', onRestricted);
  }, []);

  const warning = user?.restriction as AccountStanding | undefined;
  const suspended = Boolean(
    warning &&
      !warning.blocked &&
      (warning.suspended ||
        warning.code === 'ACCOUNT_SUSPENDED' ||
        String(warning.status || '').toLowerCase() === 'suspended')
  );
  const showWarning = Boolean(!suspended && warning && !warning.blocked && (warning.violations || []).length);

  return (
    <>
      {suspended && warning ? (
        <SuspensionBanner standing={warning} onOpenNotifications={() => navigate('/notifications')} />
      ) : null}
      {blocked ? (
        <AccountBlockedScreen
          standing={blocked}
          onSignIn={() => {
            clearUser();
            setBlocked(null);
            navigate('/login', { replace: true });
          }}
        />
      ) : null}
    </>
  );
}
