import { useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, ChevronDown, Loader2 } from 'lucide-react';
import {
  getWarningLiftPreview,
  handleAccountActionError,
  liftWarningPoints,
  type WarningLiftPreview,
} from '../accountActions';

type ActiveWarning = { violationId: string; label: string; points: number };
type Mode = 'points' | 'merit';

const REASON_MIN = 5;

/** Threshold rows a lift from `before` to `after` points takes the member back above. */
function levelsCleared(before: number, after: number, ladder: WarningLiftPreview['ladder']) {
  return ladder.filter((row) => row.minPoints <= before && row.minPoints > after);
}

/**
 * Staff tool to lift warning points: Platform Merit comes back without deleting the warnings.
 * A lift only changes merit. Automatic punishments already running keep their fixed end
 * (staff end those from the Automatic punishments list). Back above a threshold's merit, a
 * later drop past it starts that punishment again. Admin and Support only (same as pardon).
 */
export function LiftWarningPointsPanel({
  accountId,
  activeWarnings,
  onLifted,
}: {
  accountId: string;
  activeWarnings: ActiveWarning[];
  onLifted?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<WarningLiftPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('points');
  const [amount, setAmount] = useState('');
  const [scope, setScope] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPreview(await getWarningLiftPreview(accountId));
    } catch (err) {
      handleAccountActionError(err);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  const scoped = activeWarnings.find((w) => w.violationId === scope) || null;
  const available = scoped ? scoped.points : preview?.points ?? 0;

  const plan = useMemo(() => {
    if (!preview) return null;
    const value = Math.round(Number(amount));
    if (!amount || !Number.isFinite(value)) return null;
    const lift = mode === 'points' ? value : preview.points - Math.max(0, 100 - value);
    if (mode === 'merit' && (value <= preview.merit || value > 100)) {
      return { error: `Pick a merit above ${preview.merit} and up to 100.` };
    }
    if (lift < 1) return { error: 'Lift at least 1 point.' };
    if (lift > available) {
      return { error: `Only ${available} point${available === 1 ? '' : 's'} can be lifted${scoped ? ' from this warning' : ''}.` };
    }
    const after = preview.points - lift;
    return {
      lift,
      after,
      merit: 100 - after,
      cleared: levelsCleared(preview.points, after, preview.ladder),
    };
  }, [amount, mode, preview, available, scoped]);

  const canSubmit = Boolean(plan && !('error' in plan)) && reason.trim().length >= REASON_MIN && !saving;

  const submit = async () => {
    if (!plan || 'error' in plan) return;
    setSaving(true);
    try {
      await liftWarningPoints(accountId, {
        ...(mode === 'points' || scoped ? { points: plan.lift } : { targetMerit: plan.merit }),
        violationId: scoped?.violationId || null,
        reason: reason.trim(),
      });
      setAmount('');
      setReason('');
      setScope('');
      await onLifted?.();
      await load();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <ArrowUpCircle className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-semibold text-white">Lift warning points</span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            Give Platform Merit back without deleting the warnings
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          {loading && !preview ? (
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading warning points…
            </p>
          ) : preview && preview.points === 0 ? (
            <p className="text-sm text-zinc-400">No active warning points. Platform Merit is already 100.</p>
          ) : preview ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-300">
                Platform Merit <span className="font-semibold text-white">{preview.merit}</span>
                {' · '}
                {preview.points} active point{preview.points === 1 ? '' : 's'}
                {preview.punishments.length ? (
                  <span className="text-amber-200">
                    {' · '}
                    {preview.punishments.length} automatic punishment{preview.punishments.length === 1 ? '' : 's'} running
                  </span>
                ) : null}
              </p>
              {preview.punishments.length ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-100/90">
                  Lifting points does not end{' '}
                  {preview.punishments.map((p) => p.label).join(', ')}. Each runs its full time; end one early from
                  Automatic punishments if it should stop now.
                </p>
              ) : null}

              {preview.options.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Quick lifts</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setScope('');
                          setMode('merit');
                          setAmount(String(option.targetMerit));
                        }}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-xs text-zinc-200 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10"
                      >
                        <span className="font-semibold text-white">{option.label}</span>
                        <span className="text-zinc-400">
                          {' '}· lift {option.liftPoints} → merit {option.targetMerit}
                          {option.clears.length ? ` (${option.clears.join(', ')} can start again on a new drop)` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-zinc-400">
                  How
                  <div className="mt-1 flex rounded-lg border border-white/10 p-0.5">
                    {(['points', 'merit'] as Mode[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={value === 'merit' && Boolean(scoped)}
                        onClick={() => {
                          setMode(value);
                          setAmount('');
                        }}
                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                          mode === value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {value === 'points' ? 'Lift points' : 'Restore merit to'}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block text-xs text-zinc-400">
                  {mode === 'points' ? `Points to lift (1–${available})` : `Target merit (${preview.merit + 1}–100)`}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={mode === 'points' ? 1 : preview.merit + 1}
                    max={mode === 'points' ? available : 100}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
                  />
                </label>
              </div>

              {activeWarnings.length > 1 ? (
                <label className="block text-xs text-zinc-400">
                  Take the points from
                  <select
                    value={scope}
                    onChange={(event) => {
                      setScope(event.target.value);
                      setMode('points');
                      setAmount('');
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
                  >
                    <option value="">Any active warning (longest-lasting first)</option>
                    {activeWarnings.map((warning) => (
                      <option key={warning.violationId} value={warning.violationId}>
                        {warning.label} · {warning.points} pt{warning.points === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block text-xs text-zinc-400">
                Why (staff only, the member does not see this)
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="e.g. Good conduct since the warning; reviewed on ticket TCK-1234."
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50"
                />
              </label>

              {plan ? (
                'error' in plan ? (
                  <p className="text-xs text-rose-300">{plan.error}</p>
                ) : (
                  <p className="rounded-lg bg-black/20 px-3 py-2 text-xs text-zinc-300">
                    Lifts <span className="font-semibold text-white">{plan.lift}</span> point{plan.lift === 1 ? '' : 's'} → Platform
                    Merit <span className="font-semibold text-emerald-300">{plan.merit}</span>.
                    {plan.cleared.length
                      ? ` Back above ${plan.cleared.map((row) => `${row.label} (merit ${row.triggerMerit})`).join(', ')}: a later drop past ${plan.cleared.length === 1 ? 'it' : 'them'} starts the punishment again.`
                      : ''}
                    {preview.punishments.length ? ' Running punishments keep their end dates.' : ''}
                    {' '}The warnings stay on the record.
                  </p>
                )
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                  {saving ? 'Lifting…' : 'Lift points'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
