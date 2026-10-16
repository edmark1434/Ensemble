import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ban, Bell, Lock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import useGlobalState from '@/lib/global_state';
import socket from '@/lib/socket';
import api from '@/lib/axios';
import { showSuccessToast } from '@/components/utility/toast';

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
          : kind === 'locked'
            ? 'This account is locked. You cannot sign in until an administrator unlocks it.'
            : kind === 'warning'
              ? 'Further violations can suspend this account.'
              : 'You cannot sign in with this account.');
  const tone =
    kind === 'banned'
      ? {
          border: 'border-rose-500/35',
          wash: 'bg-rose-50/90 dark:bg-[#1a1216]/95',
          icon: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
          chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
        }
      : kind === 'locked'
        ? {
            border: 'border-amber-500/35',
            wash: 'bg-amber-50/90 dark:bg-[#1a1510]/95',
            icon: 'bg-amber-500/15 text-amber-500 dark:text-amber-400',
            chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
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
      className={`w-full overflow-hidden rounded-2xl border text-zinc-900 shadow-xl backdrop-blur-md dark:text-zinc-100 ${tone.border} ${tone.wash}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-start gap-3 px-5 py-5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone.chip}`}>
            {label}
          </span>
          <p className="mt-1.5 text-lg font-bold leading-tight">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{detail}</p>
          <ViolationLines violations={standing.violations || []} />
        </div>
      </div>
      {actionLabel && onAction ? (
        <div className="border-t border-black/10 px-5 py-3.5 dark:border-white/10">
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
  const { Icon, detail } = restrictionCopy(standing);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] sm:top-[4.75rem] z-[45] flex justify-center px-3 sm:px-4 animate-enter">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-2.5 rounded-xl border border-amber-400/60 bg-amber-50/95 dark:bg-[#201908]/95 px-3 py-1.5 shadow-md backdrop-blur-md transition-all text-amber-950 dark:text-amber-200"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0">
              Account Suspended:
            </span>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 truncate font-medium" title={detail}>
              {detail}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 px-2.5 py-1 text-xs font-semibold transition-colors"
        >
          <Bell className="h-3 w-3" />
          <span>Notifications</span>
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-xl animate-enter">
        <AccountRestrictionCard standing={standing} actionLabel="Back to sign in" onAction={onSignIn} />
      </div>
    </div>
  );
}

/**
 * Specialized Warning Toast notification with warning details and navigation affordance.
 */
export function showAccountWarningToast(payload: {
  violationId?: string | null;
  violationNumber?: string | null;
  type?: string | null;
  reason?: string | null;
  points?: number | null;
  message?: string | null;
  activeWarnings?: number | null;
  maxWarningsBeforeSuspend?: number | null;
  onNavigate?: () => void;
}) {
  const warnType = payload.type || 'Account Warning';
  const warnReason = payload.reason || payload.message || '';
  const toastId = `warning-${payload.violationId || payload.violationNumber || Date.now()}`;

  toast.custom(
    (t) => (
      <div
        role="alert"
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } relative max-w-md w-full bg-[#12131a] text-white shadow-2xl rounded-2xl pointer-events-auto border border-amber-500/40 p-4 pt-6 mt-2`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="absolute top-2.5 left-3.5 flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
            ⚠️ Account Warning Issued
          </span>
        </div>
        <div className="flex items-start gap-3 mt-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {warnType}
              {Number(payload.points) > 0 ? ` (+${payload.points} penalty pt${payload.points === 1 ? '' : 's'})` : ''}
            </p>
            {warnReason && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                {warnReason}
              </p>
            )}
            <p className="mt-2 text-[11px] text-amber-300/80">
              Please review community guidelines. Multiple warnings may trigger automatic account suspension.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5">
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              if (payload.onNavigate) payload.onNavigate();
              else window.location.href = '/notifications';
            }}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            View Notifications & Details →
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    ),
    { duration: 8000, id: toastId }
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
      if (standing.suspended || standing.code === 'ACCOUNT_SUSPENDED' || String(standing.status || '').toLowerCase() === 'suspended') return;
      const path = window.location.pathname;
      if (path === '/login' || path === '/admin' || path === '/staff') return;
      setBlocked(standing);
    };
    window.addEventListener('ensemble:account-restricted', onRestricted);
    return () => window.removeEventListener('ensemble:account-restricted', onRestricted);
  }, []);

  // Realtime Socket.IO listener for Ban, Lock, Status Change, and Warnings
  useEffect(() => {
    const accountId = user?.account_id ? String(user.account_id) : null;
    if (!accountId) return;

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('joinRoom', accountId);

    const handleRestricted = (payload: any) => {
      const code = String(payload?.code || payload?.restriction?.code || '');
      const status = String(payload?.status || payload?.restriction?.status || '').toLowerCase();
      // Suspended accounts MUST NEVER be blocked or logged out; they stay signed in with the yellow banner
      if (code === 'ACCOUNT_SUSPENDED' || status === 'suspended') {
        const standing: AccountStanding = payload?.restriction || {
          status: 'Suspended',
          suspended: true,
          blocked: false,
          code: 'ACCOUNT_SUSPENDED',
          message: payload?.message,
        };
        setBlocked(null);
        const currentUser = useGlobalState.getState().user;
        if (currentUser) {
          useGlobalState.getState().setUser({
            ...currentUser,
            status: 'Suspended',
            restriction: standing,
          });
        }
        return;
      }

      const standing = standingFromPayload(payload) || {
        status: payload?.status || (payload?.code === 'ACCOUNT_BANNED' ? 'Banned' : 'Locked'),
        blocked: true,
        code: payload?.code || (payload?.status === 'Banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_LOCKED'),
        message: payload?.message,
        violations: payload?.restriction?.violations || payload?.violations || [],
      };
      const path = window.location.pathname;
      if (path === '/login' || path === '/admin' || path === '/staff') return;
      setBlocked(standing);
      useGlobalState.getState().setIsAuthenticated(false);
      window.dispatchEvent(new CustomEvent('ensemble:account-restricted', { detail: payload }));
    };

    const handleStatusChanged = (payload: any) => {
      const status = String(payload?.status || '').toLowerCase();
      if (status === 'banned' || status === 'locked') {
        handleRestricted(payload);
      } else if (status === 'active') {
        setBlocked(null);
        showSuccessToast('Your account standing has been restored to Active.');
        api.get('api/users/me').then((res) => {
          if (res.data?.user) {
            useGlobalState.getState().setUser(res.data.user);
          }
        }).catch(() => {});
      } else if (status === 'suspended') {
        setBlocked(null);
        const standing: AccountStanding = payload?.restriction || {
          status: 'Suspended',
          suspended: true,
          blocked: false,
          code: 'ACCOUNT_SUSPENDED',
          message: payload?.message,
        };
        const currentUser = useGlobalState.getState().user;
        if (currentUser) {
          useGlobalState.getState().setUser({
            ...currentUser,
            status: 'Suspended',
            restriction: standing,
          });
        }
      }
    };

    const handleWarning = (payload: any) => {
      showAccountWarningToast({
        violationId: payload?.violationId,
        violationNumber: payload?.violationNumber,
        type: payload?.type,
        reason: payload?.reason,
        points: payload?.points,
        message: payload?.message,
        activeWarnings: payload?.activeWarnings,
        maxWarningsBeforeSuspend: payload?.maxWarningsBeforeSuspend,
        onNavigate: () => navigate('/notifications'),
      });
    };

    socket.on('account:restricted', handleRestricted);
    socket.on('account:status_changed', handleStatusChanged);
    socket.on('account:warning', handleWarning);

    return () => {
      socket.off('account:restricted', handleRestricted);
      socket.off('account:status_changed', handleStatusChanged);
      socket.off('account:warning', handleWarning);
    };
  }, [user?.account_id, navigate]);

  const warning = user?.restriction as AccountStanding | undefined;
  const suspended = Boolean(
    warning &&
      !warning.blocked &&
      (warning.suspended ||
        warning.code === 'ACCOUNT_SUSPENDED' ||
        String(warning.status || '').toLowerCase() === 'suspended')
  );

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
            if (socket.connected) socket.disconnect();
            navigate('/login', { replace: true });
          }}
        />
      ) : null}
    </>
  );
}
