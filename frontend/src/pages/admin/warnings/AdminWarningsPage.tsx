import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { warningLadderSummary, WARNING_POINT_LADDER } from '@/lib/warningLadder';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

const CATEGORIES = [
  'Conduct', 'Forums', 'Inbox', 'Jobs', 'Gigs', 'Marketplace',
  'Teams', 'Identity', 'Money', 'Editor', 'Other',
] as const;

const DESK_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'support', label: 'Support' },
  { id: 'forum', label: 'Forums' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'jobs', label: 'Jobs & Gigs' },
] as const;

type WarningDef = {
  warning_def_id: string;
  slug: string;
  id: string;
  label: string;
  category: string;
  points: number;
  desks: string[];
  note: string;
  is_system: boolean;
  meritHit: number;
  durationDays: number;
};

type DefForm = {
  label: string;
  category: string;
  points: number;
  desks: string[];
  note: string;
};

const emptyForm = (): DefForm => ({
  label: '',
  category: 'Conduct',
  points: 5,
  desks: ['admin', 'support'],
  note: '',
});

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
}

export default function AdminWarningsPage() {
  const [defs, setDefs] = useState<WarningDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'create' | WarningDef | null>(null);
  const [form, setForm] = useState<DefForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const res = await api.get('/api/admin/warning-defs');
    setDefs(res.data?.data || []);
  };

  useEffect(() => {
    void load()
      .catch((err) => showErrorToast(errorMessage(err, 'Unable to load warnings')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return defs;
    return defs.filter((def) =>
      [def.label, def.slug, def.category, def.note, String(def.points)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [defs, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditor('create');
  };

  const openEdit = (def: WarningDef) => {
    setForm({
      label: def.label,
      category: def.category,
      points: def.points,
      desks: def.desks?.length ? def.desks : ['admin'],
      note: def.note || '',
    });
    setFormError('');
    setEditor(def);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
    setFormError('');
  };

  const toggleDesk = (desk: string) => {
    setForm((current) => {
      const has = current.desks.includes(desk);
      if (has && desk === 'admin') return current;
      const desks = has ? current.desks.filter((item) => item !== desk) : [...current.desks, desk];
      return { ...current, desks };
    });
  };

  const save = async () => {
    if (!form.label.trim()) {
      setFormError('A warning name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      label: form.label.trim(),
      category: form.category,
      points: Number(form.points),
      desks: form.desks,
      note: form.note.trim(),
    };
    try {
      if (editor === 'create') {
        await api.post('/api/admin/warning-defs', payload);
        showSuccessToast('Warning created');
      } else if (editor) {
        await api.patch(`/api/admin/warning-defs/${editor.warning_def_id}`, payload);
        showSuccessToast('Warning updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save warning'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (def: WarningDef) => {
    if (!window.confirm(`Hide "${def.label}" from staff desks? Existing issued warnings stay on the record.`)) return;
    try {
      await api.delete(`/api/admin/warning-defs/${def.warning_def_id}`);
      showSuccessToast('Warning removed from desks');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to remove warning'));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen md:pl-[260px]">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="px-6 py-4 md:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Admin</p>
          <h1 className="text-xl font-bold text-white">Warnings</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Create named warnings and lock their points. Merit taken is always points × 2, and duration follows the 1–10 ladder.
          </p>
        </div>
      </header>

      <div className="space-y-5 px-6 py-6 md:px-8 md:py-8">
        <section className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Merit conversion</p>
          <div className="flex min-w-max gap-2">
            {WARNING_POINT_LADDER.map((row) => (
              <div key={row.points} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-center">
                <p className="text-[11px] font-semibold text-white">{row.points} pt</p>
                <p className="text-[11px] text-rose-300">−{row.meritHit} merit</p>
                <p className="text-[10px] text-zinc-500">{row.durationDays}d</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, category, or points"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
          >
            <Plus className="h-4 w-4" />
            New warning
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Warning</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                  <th className="px-4 py-3 font-medium">Merit</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Desks</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((def) => (
                  <tr key={def.warning_def_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{def.label}</p>
                          <p className="truncate text-[11px] text-zinc-500">
                            {def.category}
                            {def.is_system ? ' · seeded' : ' · custom'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{def.points} pt</td>
                    <td className="px-4 py-3 text-rose-300">−{def.meritHit}</td>
                    <td className="px-4 py-3 text-zinc-400">{def.durationDays} days</td>
                    <td className="px-4 py-3 text-zinc-500">{(def.desks || []).join(', ')}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(def)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                        aria-label={`Edit ${def.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(def)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Delete ${def.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      {search ? 'No warnings match that search.' : 'No warnings in the library yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editor === 'create' ? 'New warning' : `Edit ${editor.label}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Points lock the merit hit (×2) and how long the warning lasts. Staff pick this row; they cannot type a custom score.
                </p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-1.5 text-zinc-500 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3">
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Name</span>
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  className={fieldClass}
                  maxLength={120}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Warning points</span>
                  <select
                    value={form.points}
                    onChange={(event) => setForm((current) => ({ ...current, points: Number(event.target.value) }))}
                    className={fieldClass}
                  >
                    {WARNING_POINT_LADDER.map((row) => (
                      <option key={row.points} value={row.points}>
                        {row.points} pt · −{row.meritHit} merit · {row.durationDays} days
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-zinc-400">{warningLadderSummary(form.points)}</p>
              <fieldset>
                <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Visible on desks</legend>
                <div className="flex flex-wrap gap-2">
                  {DESK_OPTIONS.map((desk) => {
                    const checked = form.desks.includes(desk.id);
                    return (
                      <label
                        key={desk.id}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                          checked ? 'border-rose-400/40 bg-rose-500/10 text-white' : 'border-white/10 text-zinc-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={desk.id === 'admin'}
                          onChange={() => toggleDesk(desk.id)}
                        />
                        {desk.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Staff note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className={fieldClass}
                  maxLength={500}
                  placeholder="When to use this warning"
                />
              </label>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
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
                  {saving ? 'Saving…' : editor === 'create' ? 'Create warning' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
