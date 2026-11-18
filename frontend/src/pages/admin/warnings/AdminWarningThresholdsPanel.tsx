import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { DURATION_OPTIONS } from '@/lib/warningLadder';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

type ThresholdEffect = 'none' | 'record' | 'limited' | 'restricted' | 'frozen' | 'auto_suspend';

type Threshold = {
  warning_threshold_id: string;
  minPoints: number;
  effect: ThresholdEffect;
  label: string;
  suspendDays: number | null;
  /** Auto-suspend only: Platform Merit at which the suspension ends early. Null = full clock. */
  liftAtMerit: number | null;
  note: string;
  is_system?: boolean;
};

type ThresholdForm = {
  minPoints: number;
  effect: ThresholdEffect;
  label: string;
  suspendDays: number;
  /** Empty string = no early lift. */
  liftAtMerit: string;
  note: string;
};

/** Platform Merit a member must climb back to before a band starting at `minPoints` ends. */
function meritThatEnds(minPoints: number) {
  return Math.min(100, Math.max(1, 101 - minPoints));
}

const EFFECTS: { id: ThresholdEffect; label: string; hint: string }[] = [
  { id: 'none', label: 'Clear', hint: 'Full access' },
  { id: 'record', label: 'Record only', hint: 'Toast + private record. Site still usable.' },
  { id: 'limited', label: 'Limited', hint: 'No urgent jobs. Marketplace listings go to review.' },
  { id: 'restricted', label: 'Restricted', hint: 'No new jobs, gigs, listings, forum writes, or teams. 3 proposals/day.' },
  { id: 'frozen', label: 'Frozen access', hint: 'No proposals, new DMs, or cashout. Live work stays.' },
  { id: 'auto_suspend', label: 'Auto-suspend', hint: 'Standing cooldown once they cross this total. Not a loop.' },
];

const emptyForm = (): ThresholdForm => ({
  minPoints: 5,
  effect: 'limited',
  label: '',
  suspendDays: 7,
  liftAtMerit: '',
  note: '',
});

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
}

function effectLabel(effect: string) {
  return EFFECTS.find((item) => item.id === effect)?.label || effect;
}

const THRESHOLDS_URL = '/api/admin/warning-thresholds';

function thresholdRows(data: unknown): Threshold[] {
  return ((data || []) as (Threshold & {
    min_points?: number;
    suspend_days?: number | null;
    lift_at_merit?: number | null;
  })[]).map((row) => ({
    ...row,
    minPoints: Number(row.minPoints ?? row.min_points ?? 0),
    suspendDays: row.suspendDays ?? row.suspend_days ?? null,
    liftAtMerit: row.liftAtMerit ?? row.lift_at_merit ?? null,
    note: row.note || '',
  }));
}

export default function AdminWarningThresholdsPanel() {
  const [rows, setRows] = useState<Threshold[]>(() => thresholdRows(peekStaffGet(THRESHOLDS_URL)?.data?.data));
  const [loading, setLoading] = useState(() => !peekStaffGet(THRESHOLDS_URL));
  const [editor, setEditor] = useState<'create' | Threshold | null>(null);
  const [form, setForm] = useState<ThresholdForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const res = await staffGet(THRESHOLDS_URL);
    setRows(thresholdRows(res.data?.data));
  };

  useEffect(() => {
    void load()
      .catch((err) => showErrorToast(errorMessage(err, 'Unable to load thresholds')))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditor('create');
  };

  const openEdit = (row: Threshold) => {
    setForm({
      minPoints: row.minPoints,
      effect: row.effect,
      label: row.label,
      suspendDays: row.suspendDays || 7,
      liftAtMerit: row.liftAtMerit == null ? '' : String(row.liftAtMerit),
      note: row.note || '',
    });
    setFormError('');
    setEditor(row);
  };

  const save = async () => {
    setSaving(true);
    setFormError('');
    const payload = {
      minPoints: Number(form.minPoints),
      effect: form.effect,
      label: form.label.trim(),
      suspendDays: form.effect === 'auto_suspend' ? Number(form.suspendDays) : null,
      liftAtMerit: form.effect === 'auto_suspend' && form.liftAtMerit.trim() !== '' ? Number(form.liftAtMerit) : null,
      note: form.note.trim(),
    };
    try {
      if (editor === 'create') {
        await api.post('/api/admin/warning-thresholds', payload);
        showSuccessToast('Threshold created');
      } else if (editor) {
        await api.patch(`/api/admin/warning-thresholds/${editor.warning_threshold_id}`, payload);
        showSuccessToast('Threshold updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save threshold'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Threshold) => {
    if (!window.confirm(`Remove the ${row.minPoints}+ point threshold (${row.label})?`)) return;
    try {
      await api.delete(`/api/admin/warning-thresholds/${row.warning_threshold_id}`);
      showSuccessToast('Threshold removed');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to remove threshold'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-zinc-500">
          When a user&apos;s <span className="text-zinc-300">active warning points</span> reach a row,
          that punishment applies until points drop below it, so it ends by itself once their Platform
          Merit climbs back to the level shown (warnings expire, or staff rescind or lift points).
          Auto-suspend is a standing cooldown and does not stack if they are already suspended; it can
          also end early once merit recovers.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          New threshold
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">From points</th>
                <th className="px-4 py-3 font-medium">Punishment</th>
                <th className="px-4 py-3 font-medium">How long</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row) => (
                <tr
                  key={row.warning_threshold_id}
                  onClick={() => openEdit(row)}
                  className="cursor-pointer hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-white">{row.minPoints}+</td>
                  <td className="px-4 py-3 text-rose-300">
                    {row.label || effectLabel(row.effect)}
                    <span className="mt-0.5 block text-[11px] text-zinc-500">{effectLabel(row.effect)}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {row.effect === 'auto_suspend' ? (
                      <>
                        {`${row.suspendDays || 7} day cooldown`}
                        <span className="mt-0.5 block text-[11px] text-emerald-300/80">
                          {row.liftAtMerit != null
                            ? `Ends early at merit ${row.liftAtMerit}`
                            : 'Runs the full clock'}
                        </span>
                      </>
                    ) : row.effect === 'none' ? (
                      'Full access'
                    ) : (
                      <>
                        Until points drop below this row
                        <span className="mt-0.5 block text-[11px] text-emerald-300/80">
                          Ends by itself at merit {meritThatEnds(row.minPoints)}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-500">{row.note || '—'}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                      aria-label={`Edit ${row.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Delete ${row.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No thresholds yet. Create one to start automatic limits.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editor === 'create' ? 'New threshold' : 'Edit threshold'}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Highest matching row wins. Example: 8 = Restricted, 16 = Frozen, 20 = auto-suspend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setEditor(null)}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  When active points reach
                </span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={form.minPoints}
                  onChange={(event) => setForm((current) => ({ ...current, minPoints: Number(event.target.value) }))}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Punishment
                </span>
                <select
                  value={form.effect}
                  onChange={(event) => setForm((current) => ({ ...current, effect: event.target.value as ThresholdEffect }))}
                  className={fieldClass}
                >
                  {EFFECTS.map((effect) => (
                    <option key={effect.id} value={effect.id}>
                      {effect.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {EFFECTS.find((item) => item.id === form.effect)?.hint}
                </p>
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Display name
                </span>
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  className={fieldClass}
                  maxLength={80}
                  placeholder={effectLabel(form.effect)}
                />
              </label>
              {form.effect === 'auto_suspend' ? (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Suspend for (days)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.suspendDays}
                    onChange={(event) => setForm((current) => ({ ...current, suspendDays: Number(event.target.value) }))}
                    className={fieldClass}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DURATION_OPTIONS.filter((days) => days <= 90).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, suspendDays: days }))}
                        className={`rounded-lg border px-2 py-1 text-[11px] ${
                          form.suspendDays === days
                            ? 'border-rose-400/40 bg-rose-500/10 text-white'
                            : 'border-white/10 text-zinc-400'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </label>
              ) : null}
              {form.effect === 'auto_suspend' ? (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    End early when Platform Merit recovers to
                  </span>
                  <input
                    type="number"
                    min={meritThatEnds(Number(form.minPoints) || 0)}
                    max={100}
                    value={form.liftAtMerit}
                    placeholder="Empty = run the full suspension"
                    onChange={(event) => setForm((current) => ({ ...current, liftAtMerit: event.target.value }))}
                    className={fieldClass}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    This suspension starts at merit {Math.max(0, 100 - (Number(form.minPoints) || 0))}. Once warnings
                    expire or staff rescind or lift points and merit reaches this number, the suspension ends right
                    away and the member is told. Staff suspensions are never ended this way. Changes apply to new
                    auto-suspensions.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          liftAtMerit: String(meritThatEnds(Number(current.minPoints) || 0)),
                        }))
                      }
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                    >
                      As soon as they drop under this row ({meritThatEnds(Number(form.minPoints) || 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, liftAtMerit: '' }))}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                    >
                      Never, run the full clock
                    </button>
                  </div>
                </label>
              ) : null}
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Admin note
                </span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  rows={2}
                  className={fieldClass}
                  maxLength={500}
                />
              </label>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !saving && setEditor(null)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editor === 'create' ? 'Create threshold' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
