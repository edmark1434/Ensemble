import { AlertTriangle, Ban, CheckCircle2, Clock, Coins, Gavel, Lock, MessageSquareOff, ShieldAlert, Snowflake } from 'lucide-react';
import { formatStandingWhen } from '@/lib/standing';
import type { AppealablePenalty, AppealOptions, AppealTargetType } from './appealShared';

const ICON: Record<AppealTargetType, typeof Lock> = {
  ban: Lock,
  lock: Lock,
  suspension: ShieldAlert,
  forum_timeout: MessageSquareOff,
  warning: AlertTriangle,
  credit_hold: Coins,
  merit_penalty: Snowflake,
};

const TONE: Record<AppealTargetType, string> = {
  ban: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  lock: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  suspension: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  forum_timeout: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  credit_hold: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  merit_penalty: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

function StatePill({ penalty }: { penalty: AppealablePenalty }) {
  const state = penalty.appeal.state;
  const base = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';
  if (state === 'open' || state === 'legacy_open') {
    return <span className={`${base} bg-blue-500/10 text-blue-700 dark:text-blue-300`}><Gavel className="h-3 w-3" /> Appeal open</span>;
  }
  if (state === 'accepted') {
    return <span className={`${base} bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`}><CheckCircle2 className="h-3 w-3" /> Accepted</span>;
  }
  if (state === 'denied') {
    return <span className={`${base} bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400`}><Clock className="h-3 w-3" /> Denied</span>;
  }
  if (state === 'denied_permanent') {
    return <span className={`${base} bg-rose-500/15 text-rose-700 dark:text-rose-300`}><Ban className="h-3 w-3" /> Final</span>;
  }
  return null;
}

/**
 * Every active penalty with its own appeal: appeal it, open its appeal, or why it cannot be
 * appealed right now. The server decides each state (`GET /api/users/appeals`).
 */
export default function PenaltyAppealList({
  options,
  onAppeal,
  onOpenTicket,
}: {
  options: AppealOptions;
  onAppeal: (penalty: AppealablePenalty) => void;
  onOpenTicket: (ticketId: string) => void;
}) {
  const { penalties, legacyOpenAppeal } = options;
  const appealable = penalties.filter((penalty) => penalty.appeal.canAppeal).length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appeal a penalty</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          {penalties.length === 1
            ? 'Each penalty has its own appeal.'
            : `You have ${penalties.length} penalties. Each one is appealed on its own, and a decision on one does not change the others.`}
        </p>
      </div>

      {legacyOpenAppeal ? (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-3 text-sm text-blue-800 dark:text-blue-200">
          <p>
            Your appeal{legacyOpenAppeal.ticketNumber ? ` #${legacyOpenAppeal.ticketNumber}` : ''} covers your whole account.
            Staff will decide it first; after that you can appeal each penalty on its own.
          </p>
          {legacyOpenAppeal.ticketId ? (
            <button
              type="button"
              onClick={() => onOpenTicket(legacyOpenAppeal.ticketId as string)}
              className="mt-2 text-xs font-semibold underline-offset-2 hover:underline"
            >
              Open that appeal
            </button>
          ) : null}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {penalties.map((penalty) => {
          const Icon = ICON[penalty.type] || ShieldAlert;
          const appeal = penalty.appeal;
          return (
            <li key={penalty.key} className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[penalty.type]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold text-gray-900 dark:text-white">
                      {penalty.label}
                      {penalty.number ? <span className="font-normal text-gray-500 dark:text-zinc-400"> · {penalty.number}</span> : null}
                    </p>
                    <StatePill penalty={penalty} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    {[penalty.detail, penalty.endsAt ? `Ends ${formatStandingWhen(penalty.endsAt)}` : 'No end date']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {appeal.message && !appeal.canAppeal ? (
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-zinc-300">{appeal.message}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {appeal.canAppeal ? (
                      <button
                        type="button"
                        onClick={() => onAppeal(penalty)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                      >
                        Appeal this
                      </button>
                    ) : null}
                    {appeal.ticketId && (appeal.state === 'open' || appeal.state === 'accepted' || (!appeal.legacy && appeal.state.startsWith('denied'))) ? (
                      <button
                        type="button"
                        onClick={() => onOpenTicket(appeal.ticketId as string)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        {appeal.state === 'open' ? `Open appeal${appeal.ticketNumber ? ` #${appeal.ticketNumber}` : ''}` : 'See the decision'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {penalties.length > 1 && appealable === 0 && !legacyOpenAppeal ? (
        <p className="text-xs text-gray-500 dark:text-zinc-400">Nothing else can be appealed right now.</p>
      ) : null}
    </div>
  );
}
