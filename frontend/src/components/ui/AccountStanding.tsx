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

function toneFor(standing: AccountStanding) {
  const code = String(standing.code || '');
  const status = String(standing.status || '').toLowerCase();
  if (code === 'ACCOUNT_BANNED' || status === 'banned') {
    return {
      Icon: Ban,
      label: 'Banned',
      shell: 'border-rose-300 bg-rose-600 text-white',
      chip: 'bg-white text-rose-700',
    };
  }
  if (code === 'ACCOUNT_LOCKED' || status === 'locked') {
    return {
      Icon: Lock,
      label: 'Locked',
      shell: 'border-zinc-200 bg-zinc-100 text-zinc-950',
      chip: 'bg-zinc-950 text-white',
    };
  }
  if (code === 'ACCOUNT_DELETED' || status === 'deleted') {
    return {
      Icon: Ban,
      label: 'Closed',
      shell: 'border-zinc-300 bg-zinc-900 text-white',
      chip: 'bg-white text-zinc-950',
    };
  }
  return {
    Icon: ShieldAlert,
    label: status === 'suspended' || code === 'ACCOUNT_SUSPENDED' ? 'Suspended' : 'Violation',
    shell: 'border-amber-200 bg-amber-400 text-zinc-950',
    chip: 'bg-zinc-950 text-amber-300',
  };
}

function ViolationList({ violations }: { violations: AccountViolation[] }) {
  if (!violations.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {violations.map((violation, index) => (
        <li
          key={`${violation.type || 'violation'}-${index}`}
          className="rounded-xl border border-black/15 bg-black/10 px-4 py-3 text-left"
        >
          <p className="text-sm font-semibold">
            {violation.type || 'Violation'}
            {Number(violation.points) > 0 ? ` · ${violation.points} pts` : ''}
          </p>
          {violation.reason ? <p className="mt-1 text-sm leading-relaxed">{violation.reason}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function AccountStandingNotice({
  standing,
  compact = false,
}: {
  standing: AccountStanding;
  compact?: boolean;
}) {
  const tone = toneFor(standing);
  const Icon = tone.Icon;
  const violations = standing.violations || [];
  return (
    <div
      role="alert"
      className={`w-full rounded-2xl border-2 px-5 py-4 ${tone.shell}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={compact ? 'mt-0.5 h-6 w-6 shrink-0' : 'mt-1 h-8 w-8 shrink-0'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${tone.chip}`}>
              {tone.label}
            </span>
            {!compact ? (
              <p className="text-lg font-bold leading-tight">
                {standing.blocked || standing.suspended || standing.code === 'ACCOUNT_SUSPENDED'
                  ? `Your account is ${tone.label.toLowerCase()}`
                  : 'Your account has active violations'}
              </p>
            ) : null}
          </div>
          <p className={`${compact ? 'mt-2 text-sm' : 'mt-2 text-base'} font-medium leading-relaxed`}>
            {standing.message ||
              (standing.blocked
                ? 'You cannot use Ensemble until this restriction is lifted.'
                : 'Further violations can suspend this account.')}
          </p>
          <ViolationList violations={violations} />
        </div>
      </div>
    </div>
  );
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

const GLASS_ACTION =
  'shrink-0 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10';

export function AccountRestrictionCard({
  standing,
  actionLabel,
  onAction,
}: {
  standing: AccountStanding;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const kind = standingKind(standing);
  const banned = kind === 'banned';
  const Icon = banned || kind === 'closed' ? Ban : kind === 'locked' ? Lock : ShieldAlert;
  const iconClass = banned
    ? 'text-rose-600 dark:text-rose-300'
    : kind === 'suspended'
      ? 'text-amber-600 dark:text-amber-300'
      : 'text-zinc-600 dark:text-zinc-300';
  const borderClass = banned
    ? 'border-rose-500/30'
    : kind === 'suspended'
      ? 'border-amber-500/25'
      : 'border-black/10 dark:border-white/10';
  const title = banned
    ? 'Your account is banned'
    : kind === 'suspended'
      ? 'Your account is suspended'
      : kind === 'locked'
        ? 'Your account is locked'
        : kind === 'closed'
          ? 'This account is closed'
          : 'Your account has a violation';
  const detail = banned
    ? 'You cannot sign in. A banned account is not allowed to log in to Ensemble.'
    : standing.message ||
      (kind === 'suspended'
        ? 'You can view your account and notifications. Actions are turned off until this is lifted.'
        : 'You cannot sign in with this account.');

  return (
    <div
      role="alert"
      className={`flex w-full items-start gap-3 rounded-2xl border bg-white/70 px-4 py-3 text-zinc-900 shadow-lg backdrop-blur-md dark:bg-[#080a12]/70 dark:text-zinc-100 ${borderClass}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{detail}</p>
        {(standing.violations || []).length ? (
          <ul className="mt-2 space-y-1">
            {(standing.violations || []).slice(0, 3).map((violation, index) => (
              <li key={`${violation.type || 'violation'}-${index}`} className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                  {violation.type || 'Violation'}
                  {Number(violation.points) > 0 ? ` · ${violation.points} pts` : ''}
                </span>
                {violation.reason ? ` — ${violation.reason}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={GLASS_ACTION}>
          {actionLabel}
        </button>
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
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <AccountRestrictionCard standing={standing} actionLabel="Notifications" onAction={onOpenNotifications} />
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
      if (standing) setBlocked(standing);
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
      {showWarning && warning ? (
        <div className="sticky top-0 z-[80] px-3 py-3 sm:px-6">
          <AccountStandingNotice
            standing={{
              ...warning,
              message:
                warning.message ||
                `You have ${warning.violations?.length || 0} active violation${
                  (warning.violations?.length || 0) === 1 ? '' : 's'
                }. Further violations can suspend this account.`,
            }}
          />
        </div>
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
