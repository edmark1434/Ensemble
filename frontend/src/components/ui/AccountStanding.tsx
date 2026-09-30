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

function AccountBlockedScreen({
  standing,
  onSignIn,
}: {
  standing: AccountStanding;
  onSignIn: () => void;
}) {
  const tone = toneFor(standing);
  const Icon = tone.Icon;
  const violations = standing.violations || [];
  const screen =
    tone.label === 'Banned'
      ? 'bg-rose-700 text-white'
      : tone.label === 'Locked'
        ? 'bg-zinc-100 text-zinc-950'
        : tone.label === 'Closed'
          ? 'bg-zinc-950 text-white'
          : 'bg-amber-400 text-zinc-950';
  const button =
    tone.label === 'Banned' || tone.label === 'Closed'
      ? 'bg-white text-zinc-950'
      : 'bg-zinc-950 text-white';

  return (
    <div className={`fixed inset-0 z-[90] flex items-center justify-center px-6 py-10 ${screen}`}>
      <div className="w-full max-w-3xl text-center">
        <Icon className="mx-auto h-16 w-16" />
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em]">{tone.label}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">
          Your account is {tone.label.toLowerCase()}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed sm:text-2xl">
          {standing.message || 'You cannot use Ensemble until this restriction is lifted.'}
        </p>
        <div className="mt-8 flex flex-col items-center gap-8">
          {violations.length ? (
            <ul className="w-full max-w-2xl space-y-3 text-left">
              {violations.map((violation, index) => (
                <li
                  key={`${violation.type || 'violation'}-${index}`}
                  className="rounded-2xl bg-white px-5 py-4 text-zinc-950"
                >
                  <p className="text-lg font-bold">
                    {violation.type || 'Violation'}
                    {Number(violation.points) > 0 ? ` · ${violation.points} pts` : ''}
                  </p>
                  {violation.reason ? <p className="mt-1 text-base leading-relaxed">{violation.reason}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={onSignIn}
            className={`rounded-2xl px-8 py-4 text-lg font-bold ${button}`}
          >
            Back to sign in
          </button>
        </div>
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
        <div className="sticky top-0 z-[80] border-b-4 border-amber-950 bg-amber-400 px-4 py-4 text-zinc-950 sm:px-8">
          <AccountStandingNotice standing={warning} />
        </div>
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
