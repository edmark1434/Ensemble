import { CheckCircle2, Clock, MessageSquareOff, PauseCircle, ShieldAlert, Snowflake, VolumeX } from 'lucide-react';
import useGlobalState from '@/lib/global_state';
import { formatStandingWhen, type MeritPenalty, type StandingRestriction } from '@/lib/standing';

/**
 * What a member's merit means right now: the automatic punishments running (each on its own
 * clock), next to the merit number. Merit itself only says how many warning points are active;
 * these say what is actually paused and until when. The backend stays the authority.
 */

export type MeritPenaltyLike = Pick<MeritPenalty, 'effect' | 'label' | 'endsAt'> & Partial<MeritPenalty>;

function PunishmentIcon({ effect, className = 'h-3 w-3' }: { effect: string; className?: string }) {
  if (effect === 'mute') return <VolumeX className={className} />;
  if (effect === 'frozen') return <Snowflake className={className} />;
  if (effect === 'auto_suspend') return <PauseCircle className={className} />;
  return <ShieldAlert className={className} />;
}

/** Running automatic punishments, strictest first. Suspensions are left to the status itself. */
export function runningAutomaticPunishments(penalties?: MeritPenaltyLike[] | null) {
  const now = Date.now();
  return (penalties || []).filter((p) => {
    if (!p || p.effect === 'auto_suspend') return false;
    if (!p.endsAt) return true;
    const ends = new Date(p.endsAt).getTime();
    return !Number.isFinite(ends) || ends > now;
  });
}

function shortWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Staff desks (dark): one chip per running automatic punishment with its end, so staff see
 * what is already auto-locked next to the merit number.
 */
export function StaffPunishmentChips({
  penalties,
  className = '',
  showNone = false,
}: {
  penalties?: MeritPenaltyLike[] | null;
  className?: string;
  /** Show "No automatic limits" when nothing is running. */
  showNone?: boolean;
}) {
  const running = runningAutomaticPunishments(penalties);
  if (!running.length) {
    return showNone ? <span className={`text-[11px] text-zinc-500 ${className}`}>No automatic limits</span> : null;
  }
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {running.map((p, index) => (
        <span
          key={p.id || `${p.effect}-${index}`}
          title={`${p.ruleLabel || p.label}${p.endsAt ? ` · ends ${formatStandingWhen(p.endsAt)}` : ''}${
            p.triggerMerit != null ? ` · rule at merit ${p.triggerMerit}` : ''
          }`}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
            p.effect === 'frozen'
              ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          }`}
        >
          <PunishmentIcon effect={p.effect} />
          {p.label}
          {p.endsAt ? <span className="text-zinc-400">· {shortWhen(p.endsAt)}</span> : null}
        </span>
      ))}
    </span>
  );
}

type OwnStatusItem = { key: string; effect: string; label: string; endsAt: string | null };

/**
 * The signed-in member's own status, for their profile next to the merit ring: suspension,
 * staff forum timeout, and every automatic punishment running, each with its end. Shows "No
 * limits running" when merit is reduced but nothing is paused.
 */
export function OwnMeritStatus({ className = '' }: { className?: string }) {
  const restriction = useGlobalState((state) => state.user?.restriction) as StandingRestriction | null | undefined;
  if (!restriction) return null;
  const items: OwnStatusItem[] = [];
  if (restriction.suspended || String(restriction.status || '').toLowerCase() === 'suspended') {
    items.push({ key: 'suspended', effect: 'auto_suspend', label: 'Suspended', endsAt: restriction.suspensionEndsAt || null });
  }
  if (restriction.forumTimeout) {
    items.push({ key: 'timeout', effect: 'timeout', label: 'Forum timeout', endsAt: restriction.forumTimeoutEndsAt || null });
  }
  for (const p of runningAutomaticPunishments(restriction.meritPenalties)) {
    items.push({ key: p.id || p.effect, effect: p.effect, label: p.label, endsAt: p.endsAt || null });
  }

  if (!items.length) {
    return (
      <p className={`flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 ${className}`}>
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        No limits running
      </p>
    );
  }

  return (
    <ul className={`space-y-0.5 ${className}`}>
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300"
          title={item.endsAt ? `Ends ${formatStandingWhen(item.endsAt)}. It runs its full time, even if merit recovers.` : undefined}
        >
          {item.effect === 'timeout' ? (
            <MessageSquareOff className="h-3 w-3 shrink-0" />
          ) : (
            <PunishmentIcon effect={item.effect} className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{item.label}</span>
          {item.endsAt ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-gray-500 dark:text-zinc-400">
              <Clock className="h-2.5 w-2.5" />
              {shortWhen(item.endsAt)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
