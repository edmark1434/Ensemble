import { useEffect, useMemo, useState } from 'react';
import { Gavel, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { DURATION_OPTIONS, clampDurationDays } from '@/lib/warningLadder';
import {
  PUNISHMENT_KINDS,
  punishmentDurationLabel,
  type PunishmentKind,
} from '@/lib/punishmentCatalog';

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

type PunishmentDef = {
  punishment_def_id: string;
  slug: string;
  id: string;
  kind: PunishmentKind;
  label: string;
  category: string;
  durationDays: number | null;
  desks: string[];
  note: string;
  is_system: boolean;
  permanent?: boolean;
};

type DefForm = {
  label: string;
  kind: PunishmentKind;
  category: string;
  durationDays: number;
  permanent: boolean;
  desks: string[];
  note: string;
};

const emptyForm = (): DefForm => ({
  label: '',
  kind: 'suspend',
  category: 'Conduct',
  durationDays: 7,
  permanent: false,
  desks: ['admin', 'support'],
  note: '',
});

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return response || fallback;
}

export default function AdminPunishmentDefsPanel() {
  const [defs, setDefs] = useState<PunishmentDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | PunishmentKind>('all');
  const [editor, setEditor] = useState<'create' | PunishmentDef | null>(null);
  const [form, setForm] = useState<DefForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const res = await api.get('/api/admin/punishment-defs');
    setDefs(res.data?.data || []);
  };

  useEffect(() => {
    void load()
      .catch((err) => showErrorToast(errorMessage(err, 'Unable to load punishments')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return defs.filter((def) => {
      if (kindFilter !== 'all' && def.kind !== kindFilter) return false;
      if (!term) return true;
      return [def.label, def.slug, def.category, def.kind, def.note]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [defs, search, kindFilter]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditor('create');
  };

  const openEdit = (def: PunishmentDef) => {
    setForm({
      label: def.label,
      kind: def.kind,
      category: def.category,
      durationDays: def.durationDays || 7,
      permanent: def.durationDays == null || Boolean(def.permanent),
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
      setFormError('A punishment name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      label: form.label.trim(),
      kind: form.kind,
      category: form.category,
      durationDays: form.permanent ? null : clampDurationDays(form.durationDays, 7),
      permanent: form.permanent,
      desks: form.kind === 'ban' ? form.desks.filter((desk) => desk === 'admin' || desk === 'support') : form.desks,
      note: form.note.trim(),
    };
    try {
      if (editor === 'create') {
        await api.post('/api/admin/punishment-defs', payload);
        showSuccessToast('Punishment created');
      } else if (editor) {
        await api.patch(`/api/admin/punishment-defs/${editor.punishment_def_id}`, payload);
        showSuccessToast('Punishment updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save punishment'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (def: PunishmentDef) => {
    if (!window.confirm(`Hide "${def.label}" from staff desks? Existing sanctions stay on the record.`)) return;
    try {
      await api.delete(`/api/admin/punishment-defs/${def.punishment_def_id}`);
      showSuccessToast('Punishment removed from desks');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to remove punishment'));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, kind, or category"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as 'all' | PunishmentKind)}
            className={`${fieldClass} sm:w-44`}
          >
            <option value="all">All kinds</option>
            {PUNISHMENT_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>{kind.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          New punishment
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Punishment</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Desks</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((def) => (
                <tr key={def.punishment_def_id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                        <Gavel className="h-4 w-4" />
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
                  <td className="px-4 py-3 capitalize text-zinc-300">{def.kind}</td>
                  <td className="px-4 py-3 text-zinc-400">{punishmentDurationLabel(def)}</td>
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
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {search || kindFilter !== 'all' ? 'No punishments match that search.' : 'No punishments in the library yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editor === 'create' ? 'New punishment' : `Edit ${editor.label}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Staff pick this row for ban, suspend, or timeout. They can override the clock on the case.
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
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Kind</span>
                  <select
                    value={form.kind}
                    onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as PunishmentKind }))}
                    className={fieldClass}
                  >
                    {PUNISHMENT_KINDS.map((kind) => (
                      <option key={kind.id} value={kind.id}>{kind.label}</option>
                    ))}
                  </select>
                </label>
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
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.permanent}
                  onChange={(event) => setForm((current) => ({ ...current, permanent: event.target.checked }))}
                  className="rounded border-white/20 bg-transparent"
                />
                Permanent (until staff lift it)
              </label>
              {!form.permanent ? (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Default length (days)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.durationDays}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      durationDays: clampDurationDays(Number(event.target.value), current.durationDays),
                    }))}
                    className={fieldClass}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DURATION_OPTIONS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, durationDays: days, permanent: false }))}
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
                </label>
              ) : null}
              <fieldset>
                <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Visible on desks</legend>
                <div className="flex flex-wrap gap-2">
                  {DESK_OPTIONS.map((desk) => {
                    const banned = form.kind === 'ban' && desk.id !== 'admin' && desk.id !== 'support';
                    const checked = form.desks.includes(desk.id) && !banned;
                    return (
                      <label
                        key={desk.id}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${
                          checked ? 'border-rose-400/40 bg-rose-500/10 text-white' : 'border-white/10 text-zinc-400'
                        } ${banned ? 'opacity-40' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={desk.id === 'admin' || banned}
                          onChange={() => toggleDesk(desk.id)}
                        />
                        {desk.label}
                      </label>
                    );
                  })}
                </div>
                {form.kind === 'ban' ? (
                  <p className="mt-2 text-[11px] text-zinc-500">Only Admin and Support can ban.</p>
                ) : null}
              </fieldset>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Staff note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className={fieldClass}
                  maxLength={500}
                  placeholder="When to use this punishment"
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
                  {saving ? 'Saving…' : editor === 'create' ? 'Create punishment' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
