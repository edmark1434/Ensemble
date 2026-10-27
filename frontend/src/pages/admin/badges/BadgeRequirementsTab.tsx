import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import {
  OPERATORS,
  errorMessage,
  formatRequirement,
  operatorLabel,
  type RequirementDef,
  type RequirementOperator,
  type RequirementType,
} from './badgeAdminTypes';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

type DefForm = {
  name: string;
  description: string;
  metric: string;
  operator: RequirementOperator;
  threshold: number;
};

const emptyForm = (types: RequirementType[]): DefForm => ({
  name: '',
  description: '',
  metric: types[0]?.code || 'followers',
  operator: types[0]?.kind === 'boolean' ? 'eq' : 'gte',
  threshold: 1,
});

export default function BadgeRequirementsTab() {
  const [defs, setDefs] = useState<RequirementDef[]>([]);
  const [types, setTypes] = useState<RequirementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'create' | RequirementDef | null>(null);
  const [form, setForm] = useState<DefForm>(emptyForm([]));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const [defRes, typeRes] = await Promise.all([
      api.get('/api/admin/badge-requirement-defs'),
      api.get('/api/admin/badge-requirement-types'),
    ]);
    setDefs(defRes.data?.data || []);
    setTypes(typeRes.data?.data || []);
  };

  useEffect(() => {
    void load()
      .catch((err) => showErrorToast(errorMessage(err, 'Unable to load requirements')))
      .finally(() => setLoading(false));
  }, []);

  const selectedType = types.find((type) => type.code === form.metric);
  const booleanMetric = selectedType?.kind === 'boolean';

  const groupedTypes = useMemo(() => {
    const groups = new Map<string, RequirementType[]>();
    for (const type of types) {
      const list = groups.get(type.group) || [];
      list.push(type);
      groups.set(type.group, list);
    }
    return [...groups.entries()];
  }, [types]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return defs;
    return defs.filter((def) =>
      [def.name, def.slug, def.metric, def.description, formatRequirement(def, types)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [defs, search, types]);

  const openCreate = () => {
    setForm(emptyForm(types));
    setFormError('');
    setEditor('create');
  };

  const openEdit = (def: RequirementDef) => {
    setForm({
      name: def.name,
      description: def.description || '',
      metric: def.metric,
      operator: (def.operator as RequirementOperator) || 'gte',
      threshold: Number(def.threshold || 1),
    });
    setFormError('');
    setEditor(def);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
    setFormError('');
  };

  const changeMetric = (metric: string) => {
    const type = types.find((item) => item.code === metric);
    setForm((current) => ({
      ...current,
      metric,
      operator: type?.kind === 'boolean' ? 'eq' : current.operator === 'eq' && type?.kind === 'count' ? 'gte' : current.operator,
      threshold: type?.kind === 'boolean' ? 1 : current.threshold,
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.metric) {
      setFormError('Choose a metric.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = editor !== 'create' && editor.is_system
      ? { name: form.name.trim(), description: form.description.trim() }
      : {
          name: form.name.trim(),
          description: form.description.trim(),
          metric: form.metric,
          operator: booleanMetric ? 'eq' : form.operator,
          threshold: booleanMetric ? 1 : Number(form.threshold || 1),
        };
    try {
      if (editor === 'create') {
        await api.post('/api/admin/badge-requirement-defs', payload);
        showSuccessToast('Requirement created');
      } else if (editor) {
        await api.patch(`/api/admin/badge-requirement-defs/${editor.requirement_def_id}`, payload);
        showSuccessToast('Requirement updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save requirement'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (def: RequirementDef) => {
    if (def.is_system) return;
    if (def.attached_count > 0) {
      showErrorToast('Detach this requirement from badges before deleting it');
      return;
    }
    if (!window.confirm(`Delete ${def.name}? Badges will not be able to attach it afterward.`)) return;
    try {
      await api.delete(`/api/admin/badge-requirement-defs/${def.requirement_def_id}`);
      showSuccessToast('Requirement deleted');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to delete requirement'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, metric, or slug"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          New requirement
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Requirement</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Used by</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((def) => {
                const type = types.find((item) => item.code === def.metric);
                return (
                  <tr key={def.requirement_def_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                          <ListChecks className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{def.name}</p>
                          <p className="truncate text-[11px] text-zinc-500">
                            {def.slug}
                            {def.is_system ? ' · product' : ' · custom'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {type?.kind === 'boolean'
                        ? type.label
                        : `${type?.label || def.metric} ${operatorLabel(def.operator)} ${def.threshold}`}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {def.attached_count} badge{def.attached_count === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(def)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                        aria-label={`Edit ${def.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(def)}
                        disabled={def.is_system || def.attached_count > 0}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Delete ${def.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {search ? 'No requirements match that search.' : 'No requirements in the library yet.'}
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
                  {editor === 'create' ? 'New requirement' : `Edit ${editor.name}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Named rules can be attached to any badge. Product rules from the existing catalog stay locked to their metric.
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
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={fieldClass}
                  maxLength={80}
                  placeholder="25 followers"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                  maxLength={500}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Metric</span>
                <select
                  value={form.metric}
                  onChange={(event) => changeMetric(event.target.value)}
                  disabled={editor !== 'create' && editor.is_system}
                  className={`${fieldClass} disabled:opacity-60`}
                >
                  {groupedTypes.map(([group, groupTypes]) => (
                    <optgroup key={group} label={group}>
                      {groupTypes.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {!booleanMetric && (
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Operator</span>
                    <select
                      value={form.operator}
                      onChange={(event) => setForm((current) => ({ ...current, operator: event.target.value as RequirementOperator }))}
                      disabled={editor !== 'create' && editor.is_system}
                      className={`${fieldClass} disabled:opacity-60`}
                    >
                      {OPERATORS.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Threshold</span>
                    <input
                      type="number"
                      min={1}
                      value={form.threshold}
                      onChange={(event) => setForm((current) => ({ ...current, threshold: Number(event.target.value) }))}
                      disabled={editor !== 'create' && editor.is_system}
                      className={`${fieldClass} disabled:opacity-60`}
                    />
                  </label>
                </div>
              )}
              {booleanMetric && (
                <p className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-500">
                  This metric is yes or no. The requirement is met once.
                </p>
              )}
              {selectedType?.description && (
                <p className="text-[11px] text-zinc-500">{selectedType.description}</p>
              )}
            </div>

            {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeEditor} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editor === 'create' ? 'Create requirement' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
