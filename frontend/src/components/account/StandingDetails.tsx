import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Clock, Coins, Lock, MessageSquareOff, ShieldAlert, Snowflake, X } from 'lucide-react';
import {
  APPEAL_PATH,
  type StandingCondition,
  formatCountdown,
  formatStandingWhen,
} from '@/lib/standing';

/** Current time, ticking while mounted. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const TONE = {
  rose: {
    border: 'border-rose-500/30',
    wash: 'bg-rose-500/[0.06]',
    icon: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
  },
  amber: {
    border: 'border-amber-500/30',
    wash: 'bg-amber-500/[0.06]',
    icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    chip: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  },
  sky: {
    border: 'border-sky-500/30',
    wash: 'bg-sky-500/[0.06]',
    icon: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    chip: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  },
} as const;

export function conditionIcon(id: StandingCondition['id']) {
  if (id === 'credit_hold') return Coins;
  if (id === 'frozen_access') return Snowflake;
  if (id === 'forum_timeout') return MessageSquareOff;
  if (id === 'locked' || id === 'banned') return Lock;
  return ShieldAlert;
}

export function toneClasses(tone: StandingCondition['tone']) {
  return TONE[tone];
}

function EndsAt({ condition, now }: { condition: StandingCondition; now: number }) {
  if (!condition.endsAt) {
    return <span className="text-zinc-700 dark:text-zinc-300">{condition.openEnded}</span>;
  }
  const remaining = new Date(condition.endsAt).getTime() - now;
  if (remaining <= 0) {
    return <span className="text-zinc-700 dark:text-zinc-300">Ending now — refresh in a moment.</span>;
  }
  return (
    <span className="text-zinc-700 dark:text-zinc-300">
      {formatStandingWhen(condition.endsAt)}{' '}
      <span className="font-semibold text-zinc-900 dark:text-white">· in {formatCountdown(remaining)}</span>
    </span>
  );
}

export function StandingConditionCard({
  condition,
  now,
  onAppeal,
}: {
  condition: StandingCondition;
  now: number;
  onAppeal?: () => void;
}) {
  const tone = toneClasses(condition.tone);
  const Icon = conditionIcon(condition.id);
  return (
    <article className={`rounded-2xl border p-4 ${tone.border} ${tone.wash}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.chip}`}>
            {condition.label}
          </span>
          <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-white">{condition.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{condition.summary}</p>
          {condition.reason ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
              <span className="font-semibold">Reason:</span> {condition.reason}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> When it ends
          </dt>
          <dd className="mt-1">
            <EndsAt condition={condition} now={now} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">What is paused</dt>
          <dd className="mt-1">
            <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
              {condition.paused.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">How to get back to normal</dt>
          <dd className="mt-1">
            <ol className="list-decimal space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
              {condition.recover.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </dd>
        </div>
      </dl>

      {condition.canAppeal && onAppeal ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onAppeal}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
          >
            File an appeal
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function StandingConditionList({
  conditions,
  onAppeal,
}: {
  conditions: StandingCondition[];
  onAppeal?: () => void;
}) {
  const now = useNow();
  if (!conditions.length) return null;
  return (
    <div className="space-y-3">
      {conditions.map((condition) => (
        <StandingConditionCard key={condition.id} condition={condition} now={now} onAppeal={onAppeal} />
      ))}
    </div>
  );
}

export function StandingDetailsModal({
  open,
  conditions,
  onClose,
}: {
  open: boolean;
  conditions: StandingCondition[];
  onClose: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="standing-details-title"
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 id="standing-details-title" className="text-lg font-bold text-zinc-900 dark:text-white">
              Your account status
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              What is limited, when it ends, and how to get back to normal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {conditions.length ? (
            <StandingConditionList
              conditions={conditions}
              onAppeal={() => {
                onClose();
                navigate(APPEAL_PATH);
              }}
            />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Your account is in good standing.</p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(APPEAL_PATH);
            }}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-white/15 dark:text-white"
          >
            View record and appeals
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
