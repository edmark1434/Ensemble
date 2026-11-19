import { useEffect, useState } from 'react';
import { ChevronDown, Clock, Loader2, ShieldAlert, Snowflake, VolumeX } from 'lucide-react';
import {
  endMeritPenaltyEarly,
  getAccountMeritPenalties,
  handleAccountActionError,
  unfreezeAccount,
  type AccountMeritPenalties,
  type MeritPenaltyRow,
} from '../accountActions';

const REASON_MIN = 5;

const END_REASON: Record<string, string> = {
  expired: 'ran its full time',
  staff: 'ended early by staff',
  pardoned: 'ended by a pardon',
  appeal: 'ended after an accepted appeal',
  rescinded: 'its warning was rescinded',
  reversed: 'its warning was reversed',
  rebalanced: 'ended when the rules were eased',
};

function when(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function remaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'ending now';
  const hours = Math.floor(ms / 3600000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.ceil(ms / 60000))}m left`;
}

function EffectIcon({ effect }: { effect: string }) {
  if (effect === 'mute') return <VolumeX className="h-3.5 w-3.5" />;
  if (effect === 'frozen') return <Snowflake className="h-3.5 w-3.5" />;
  return <ShieldAlert className="h-3.5 w-3.5" />;
}

function RunningRow({
  row,
  canEnd,
  onEnd,
}: {
  row: MeritPenaltyRow;
  canEnd: boolean;
  onEnd: (row: MeritPenaltyRow, reason: string) => Promise<void>;
}) {
  const [ending, setEnding] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const suspension = row.effect === 'auto_suspend';

  const submit = async () => {
    setSaving(true);
    try {
      await onEnd(row, reason.trim());
      setEnding(false);
      setReason('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <span className="text-amber-300"><EffectIcon effect={row.effect} /></span>
            {row.label}
            {row.ruleLabel && row.ruleLabel !== row.label ? (
              <span className="text-xs font-normal text-zinc-500">· {row.ruleLabel}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Rule at merit {row.triggerMerit} · started {when(row.startsAt)} at merit {row.meritAtStart}
            {row.violationNumber ? ` · from ${row.violationNumber}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-200">Ends {when(row.endsAt)}</p>
          <p className="inline-flex items-center gap-1 text-[11px] text-amber-200">
            <Clock className="h-3 w-3" /> {remaining(row.endsAt)}
          </p>
        </div>
      </div>
      {canEnd ? (
        suspension ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            End an automatic suspension from Change standing → Unsuspend. That closes this record too.
          </p>
        ) : ending ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Why it ends early (staff only, the member does not see this)"
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEnding(false);
                  setReason('');
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || reason.trim().length < REASON_MIN}
                onClick={() => void submit()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                End now
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setEnding(true)}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-amber-400/40 hover:text-white"
            >
              End early
            </button>
          </div>
        )
      ) : null}
    </li>
  );
}

/**
 * Automatic merit punishments on a member: what is running (with its fixed end) and what ran
 * before. They started when Platform Merit dropped to a threshold and run their full time;
 * merit recovering or points being lifted does not end them. Admin and Support can end one
 * early with a staff-only reason.
 */
export function MeritPenaltiesPanel({
  accountId,
  canEnd = false,
  refreshKey,
  onChanged,
}: {
  accountId: string;
  canEnd?: boolean;
  /** Change it to reload (e.g. after a warning or lift elsewhere on the page). */
  refreshKey?: unknown;
  onChanged?: () => void | Promise<void>;
}) {
  const [data, setData] = useState<AccountMeritPenalties | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [unfreezing, setUnfreezing] = useState(false);
  const [unfreezeReason, setUnfreezeReason] = useState('');
  const [unfreezeSaving, setUnfreezeSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await getAccountMeritPenalties(accountId));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, refreshKey]);

  const end = async (row: MeritPenaltyRow, reason: string) => {
    try {
      await endMeritPenaltyEarly(accountId, row.id, reason);
      await load();
      await onChanged?.();
    } catch (err) {
      handleAccountActionError(err);
    }
  };

  const unfreezeAll = async () => {
    setUnfreezeSaving(true);
    try {
      await unfreezeAccount(accountId, { reason: unfreezeReason.trim() });
      setUnfreezing(false);
      setUnfreezeReason('');
      await load();
      await onChanged?.();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setUnfreezeSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <p className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading automatic punishments…
      </p>
    );
  }
  if (!data) return null;
  if (!data.ready) {
    return (
      <p className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
        Timed automatic punishments start once the latest database migration has run.
      </p>
    );
  }

  const past = data.history.filter((row) => !data.active.some((active) => active.id === row.id));
  const endable = data.active.filter((row) => row.effect !== 'auto_suspend');

  return (
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldAlert className="h-4 w-4 text-amber-300" />
          Automatic punishments
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {data.active.length} running
          </span>
        </p>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-zinc-500">Started by merit thresholds · each runs its full time</p>
          {canEnd && endable.length > 0 && !unfreezing ? (
            <button
              type="button"
              onClick={() => setUnfreezing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
            >
              <Snowflake className="h-3 w-3" />
              Unfreeze all
            </button>
          ) : null}
        </div>
      </div>

      {unfreezing ? (
        <div className="mt-3 space-y-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] px-3 py-2.5">
          <p className="text-xs text-zinc-300">
            Ends {endable.map((row) => row.label).join(', ')} now. Merit and the warnings stay as they are
            {data.active.some((row) => row.effect === 'auto_suspend') ? '; the suspension ends with Remove suspension' : ''}.
          </p>
          <textarea
            value={unfreezeReason}
            onChange={(event) => setUnfreezeReason(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Why (staff only, the member does not see this)"
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-sky-400/50"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setUnfreezing(false);
                setUnfreezeReason('');
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={unfreezeSaving || unfreezeReason.trim().length < REASON_MIN}
              onClick={() => void unfreezeAll()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {unfreezeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Unfreeze now
            </button>
          </div>
        </div>
      ) : null}

      {data.active.length ? (
        <ul className="mt-3 space-y-2">
          {data.active.map((row) => (
            <RunningRow key={row.id} row={row} canEnd={canEnd} onEnd={end} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">Nothing automatic is running on this account.</p>
      )}

      {past.length ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Earlier punishments ({past.length})
          </button>
          {showHistory ? (
            <ul className="mt-2 space-y-1.5">
              {past.map((row) => (
                <li key={row.id} className="text-[11px] text-zinc-400">
                  <span className="text-zinc-200">{row.label}</span>
                  {` · ${row.durationDays}d from ${when(row.startsAt)} at merit ${row.meritAtStart}`}
                  {` · ${END_REASON[row.endReason || 'expired'] || row.endReason}`}
                  {row.endedAt ? ` ${when(row.endedAt)}` : ''}
                  {row.endNote ? <span className="block text-zinc-500">Staff note: {row.endNote}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
