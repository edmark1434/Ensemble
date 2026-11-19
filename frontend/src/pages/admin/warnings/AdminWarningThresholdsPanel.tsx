import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

type PunishmentEffect = 'limited' | 'restricted' | 'frozen' | 'mute' | 'auto_suspend';

/**
 * One rung of the automatic punishment ladder: when Platform Merit drops to `100 − minPoints`
 * or lower, `effect` runs for `durationDays`. It runs its full time even if merit recovers.
 */
type Threshold = {
  warning_threshold_id: string;
  minPoints: number;
  effect: PunishmentEffect;
  label: string;
  durationDays: number;
  note: string;
  is_system?: boolean;
};

type ThresholdForm = {
  /** The merit level (0–99) the row starts at. */
  merit: number;
  effect: PunishmentEffect;
  label: string;
  durationDays: number;
  note: string;
};

const EFFECTS: { id: PunishmentEffect; label: string; hint: string; days: number }[] = [
  { id: 'limited', label: 'Limited', hint: 'No urgent jobs. New marketplace listings go to review.', days: 3 },
  {
    id: 'restricted',
    label: 'Restricted',
    hint: 'No new jobs, gigs, listings, forum posts, marketplace comments or teams. 3 proposals a day.',
    days: 5,
  },
  {
    id: 'mute',
    label: 'Mute',
    hint: 'No forum posts, marketplace comments or new conversations. Existing job, gig and contract threads stay open.',
    days: 3,
  },
  {
    id: 'frozen',
    label: 'Frozen access',
    hint: 'Everything Restricted pauses, plus proposals, new conversations and cashout. Live work stays.',
    days: 7,
  },
  {
    id: 'auto_suspend',
    label: 'Suspension',
    hint: 'Read-only account for the whole time. A longer suspension already running is never shortened.',
    days: 7,
  },
];

const DAY_CHIPS = [1, 3, 5, 7, 10, 14, 21, 30];

const emptyForm = (): ThresholdForm => ({
  merit: 90,
  effect: 'mute',
  label: '',
  durationDays: 3,
  note: '',
});

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
}

function effectInfo(effect: string) {
  return EFFECTS.find((item) => item.id === effect);
}

function defaultLabel(effect: PunishmentEffect, days: number) {
  const name = effect === 'auto_suspend' ? 'Auto-suspend' : effectInfo(effect)?.label || effect;
  return `${name} ${days} day${days === 1 ? '' : 's'}`;
}

function clampMerit(value: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(99, n));
}

const THRESHOLDS_URL = '/api/admin/warning-thresholds';

function thresholdRows(data: unknown): Threshold[] {
  return ((data || []) as (Threshold & {
    min_points?: number;
    duration_days?: number | null;
  })[])
    .map((row) => ({
      ...row,
      minPoints: Number(row.minPoints ?? row.min_points ?? 0),
      durationDays: Number(row.durationDays ?? row.duration_days ?? 0) || 0,
      note: row.note || '',
    }))
    .filter((row) => effectInfo(row.effect))
    .sort((a, b) => a.minPoints - b.minPoints || a.effect.localeCompare(b.effect));
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
      merit: clampMerit(100 - row.minPoints),
      effect: row.effect,
      label: row.label,
      durationDays: row.durationDays || effectInfo(row.effect)?.days || 7,
      note: row.note || '',
    });
    setFormError('');
    setEditor(row);
  };

  const save = async () => {
    setSaving(true);
    setFormError('');
    const payload = {
      minPoints: 100 - clampMerit(form.merit),
      effect: form.effect,
      label: form.label.trim(),
      durationDays: Number(form.durationDays),
      note: form.note.trim(),
    };
    try {
      if (editor === 'create') {
        await api.post(THRESHOLDS_URL, payload);
        showSuccessToast('Punishment rule created');
      } else if (editor) {
        await api.patch(`${THRESHOLDS_URL}/${editor.warning_threshold_id}`, payload);
        showSuccessToast('Punishment rule updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save the rule'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Threshold) => {
    if (
      !window.confirm(
        `Remove "${row.label}" at merit ${100 - row.minPoints}? Punishments it already started keep running until they end.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`${THRESHOLDS_URL}/${row.warning_threshold_id}`);
      showSuccessToast('Punishment rule removed');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to remove the rule'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const selectedEffect = effectInfo(form.effect);
  const formPoints = 100 - clampMerit(form.merit);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-zinc-500">
          When a warning takes a member&apos;s <span className="text-zinc-300">Platform Merit</span> down to a
          row&apos;s level (or lower), that punishment starts and runs for its number of days. It runs its full
          time: warnings expiring, points being lifted or merit recovering do not end it, and the punishment never
          changes merit. Lower levels can carry harsher punishments, so they add up as merit keeps dropping. A row
          starts once per drop past it. Edits only affect punishments that start afterwards.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          New rule
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">When merit drops to</th>
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
                  <td className="px-4 py-3 font-medium text-white">
                    {100 - row.minPoints} or lower
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                      {row.minPoints}+ active warning point{row.minPoints === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-rose-300">
                    {row.label}
                    <span className="mt-0.5 block text-[11px] text-zinc-500">{effectInfo(row.effect)?.label}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.durationDays} day{row.durationDays === 1 ? '' : 's'}
                    <span className="mt-0.5 block text-[11px] text-amber-200/80">Runs its full time</span>
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
                    No rules yet, so merit drops never start an automatic punishment. Create one to start.
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
                  {editor === 'create' ? 'New punishment rule' : 'Edit punishment rule'}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Example: merit 90 → Mute 3 days, merit 85 → Mute 5 days. One rule per punishment type at each level.
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
                  When Platform Merit drops to
                </span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={form.merit}
                  onChange={(event) => setForm((current) => ({ ...current, merit: Number(event.target.value) }))}
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Or lower · {formPoints} active warning point{formPoints === 1 ? '' : 's'}. It starts when a new
                  warning takes the member from above this level to it or below.
                </p>
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Punishment
                </span>
                <select
                  value={form.effect}
                  onChange={(event) => {
                    const effect = event.target.value as PunishmentEffect;
                    setForm((current) => ({
                      ...current,
                      effect,
                      durationDays: editor === 'create' ? effectInfo(effect)?.days || current.durationDays : current.durationDays,
                    }));
                  }}
                  className={fieldClass}
                >
                  {EFFECTS.map((effect) => (
                    <option key={effect.id} value={effect.id}>
                      {effect.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">{selectedEffect?.hint}</p>
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Lasts (days)
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.durationDays}
                  onChange={(event) => setForm((current) => ({ ...current, durationDays: Number(event.target.value) }))}
                  className={fieldClass}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DAY_CHIPS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, durationDays: days }))}
                      className={`rounded-lg border px-2 py-1 text-[11px] ${
                        form.durationDays === days
                          ? 'border-rose-400/40 bg-rose-500/10 text-white'
                          : 'border-white/10 text-zinc-400'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Fixed clock from the moment it starts. If the same punishment is already running longer, the
                  longer one decides when it ends.
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
                  placeholder={defaultLabel(form.effect, Number(form.durationDays) || 1)}
                />
              </label>
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
                  {saving ? 'Saving…' : editor === 'create' ? 'Create rule' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
