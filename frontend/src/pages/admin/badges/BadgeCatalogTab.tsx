import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { badgesRegistry } from '@/pages/user/7_profile/Utilities/BadgesRegistry';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import {
  emptyBadgeForm,
  errorMessage,
  formFromBadge,
  formatRequirement,
  operatorLabel,
  summarizeRequirements,
  type BadgeCategory,
  type BadgeFormState,
  type CatalogBadge,
  type RequirementDef,
  type RequirementType,
} from './badgeAdminTypes';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

const NEW_CATEGORY = '__new__';

function iconFor(registryId: string) {
  return badgesRegistry.find((badge) => String(badge.id) === registryId)?.icon;
}

function payloadFromForm(form: BadgeFormState) {
  const creatingCategory = form.categoryId === NEW_CATEGORY;
  return {
    registryId: form.registryId.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    isSecret: form.isSecret,
    categoryId: creatingCategory ? undefined : form.categoryId,
    categoryName: creatingCategory ? form.categoryName.trim() : undefined,
    categoryDescription: creatingCategory ? form.categoryDescription.trim() : undefined,
    requirements: form.requirements.map((requirement) => ({
      requirementDefId: requirement.requirement_def_id,
    })),
  };
}

export default function BadgeCatalogTab() {
  const [badges, setBadges] = useState<CatalogBadge[]>([]);
  const [categories, setCategories] = useState<BadgeCategory[]>([]);
  const [requirementTypes, setRequirementTypes] = useState<RequirementType[]>([]);
  const [requirementDefs, setRequirementDefs] = useState<RequirementDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'create' | CatalogBadge | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyBadgeForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const [badgeRes, categoryRes, requirementRes, defRes] = await Promise.all([
      api.get('/api/admin/badges'),
      api.get('/api/admin/badge-categories'),
      api.get('/api/admin/badge-requirement-types'),
      api.get('/api/admin/badge-requirement-defs'),
    ]);
    setBadges(badgeRes.data?.data || []);
    setCategories(categoryRes.data?.data || []);
    setRequirementTypes(requirementRes.data?.data || []);
    setRequirementDefs(defRes.data?.data || []);
  };

  useEffect(() => {
    void load()
      .catch((err) => showErrorToast(errorMessage(err, 'Unable to load badges')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return badges;
    return badges.filter((badge) =>
      [badge.name, badge.registry_id, badge.category_name, summarizeRequirements(badge, requirementTypes)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [badges, search, requirementTypes]);

  const usedDefIds = useMemo(
    () => new Set(form.requirements.map((requirement) => requirement.requirement_def_id)),
    [form.requirements]
  );
  const usedMetrics = useMemo(
    () => new Set(form.requirements.map((requirement) => requirement.metric || requirement.code)),
    [form.requirements]
  );

  const availableDefs = requirementDefs.filter(
    (def) => !usedDefIds.has(def.requirement_def_id) && !usedMetrics.has(def.metric)
  );

  const groupedDefs = useMemo(() => {
    const groups = new Map<string, RequirementDef[]>();
    for (const def of requirementDefs) {
      const type = requirementTypes.find((item) => item.code === def.metric);
      const group = type?.group || 'Other';
      const list = groups.get(group) || [];
      list.push(def);
      groups.set(group, list);
    }
    return [...groups.entries()];
  }, [requirementDefs, requirementTypes]);

  const openCreate = () => {
    setForm({
      ...emptyBadgeForm(),
      categoryId: categories[0]?.badge_category_id || NEW_CATEGORY,
    });
    setFormError('');
    setEditor('create');
  };

  const openEdit = (badge: CatalogBadge) => {
    setForm(formFromBadge(badge));
    setFormError('');
    setEditor(badge);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
    setFormError('');
  };

  const requirementFromDef = (def: RequirementDef) => ({
    requirement_def_id: def.requirement_def_id,
    code: def.metric,
    metric: def.metric,
    name: def.name,
    slug: def.slug,
    operator: def.operator,
    threshold: Number(def.threshold || 1),
    kind: def.kind,
    description: def.description,
  });

  const addRequirement = () => {
    const next = availableDefs[0];
    if (!next) return;
    setForm((current) => ({
      ...current,
      requirements: [...current.requirements, requirementFromDef(next)],
    }));
  };

  const updateRequirement = (index: number, defId: string) => {
    const def = requirementDefs.find((item) => item.requirement_def_id === defId);
    if (!def) return;
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, i) =>
        i === index ? requirementFromDef(def) : requirement
      ),
    }));
  };

  const removeRequirement = (index: number) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter((_, i) => i !== index),
    }));
  };

  const save = async () => {
    const payload = payloadFromForm(form);
    if (!payload.registryId || !payload.name || !payload.description) {
      setFormError('Name, registry ID, and description are required.');
      return;
    }
    if (form.categoryId === NEW_CATEGORY && !payload.categoryName) {
      setFormError('Give the new category a name.');
      return;
    }
    if (form.categoryId !== NEW_CATEGORY && !payload.categoryId) {
      setFormError('Choose a category.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editor === 'create') {
        await api.post('/api/admin/badges', payload);
        showSuccessToast('Badge created');
      } else if (editor) {
        await api.patch(`/api/admin/badges/${editor.badge_id}`, payload);
        showSuccessToast('Badge updated');
      }
      await load();
      setEditor(null);
    } catch (err) {
      setFormError(errorMessage(err, 'Unable to save badge'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (badge: CatalogBadge) => {
    if (badge.is_system) return;
    if (!window.confirm(`Hide ${badge.name} from the catalog? Existing grants stay until you revoke them.`)) return;
    try {
      await api.delete(`/api/admin/badges/${badge.badge_id}`);
      showSuccessToast('Badge removed from catalog');
      await load();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Unable to delete badge'));
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
            placeholder="Search name, ID, or requirement"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          New badge
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Badge</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Requirements</th>
                <th className="px-4 py-3 font-medium">Holders</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((badge) => {
                const icon = iconFor(badge.registry_id);
                return (
                  <tr key={badge.badge_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {icon ? (
                          <img src={icon} alt="" className="h-9 w-9 object-contain" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                            <Award className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{badge.name}</p>
                          <p className="truncate text-[11px] text-zinc-500">
                            {badge.registry_id}
                            {badge.is_system ? ' · product' : ' · honorary'}
                            {badge.is_secret ? ' · secret' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{badge.category_name}</td>
                    <td className="max-w-xs px-4 py-3 text-zinc-400">
                      {summarizeRequirements(badge, requirementTypes)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {badge.claimed_count} claimed · {badge.pending_count} pending
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(badge)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                        aria-label={`Edit ${badge.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(badge)}
                        disabled={badge.is_system}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Delete ${badge.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {search ? 'No badges match that search.' : 'No badges in the catalog yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editor === 'create' ? 'New badge' : `Edit ${editor.name}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Leave requirements empty for an honorary badge. Attach named rules from the Requirements tab; every attached rule must be true before the pending grant is sent.
                </p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-1.5 text-zinc-500 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-1">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={fieldClass}
                  maxLength={50}
                />
              </label>
              <label className="sm:col-span-1">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Registry ID</span>
                <input
                  value={form.registryId}
                  onChange={(event) => setForm((current) => ({ ...current, registryId: event.target.value }))}
                  disabled={editor !== 'create' && editor.is_system}
                  placeholder="honorary-mentor"
                  className={`${fieldClass} disabled:opacity-60`}
                  maxLength={50}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                  maxLength={2000}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Category</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  className={fieldClass}
                >
                  {categories.map((category) => (
                    <option key={category.badge_category_id} value={category.badge_category_id}>
                      {category.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>New category…</option>
                </select>
              </label>
              {form.categoryId === NEW_CATEGORY && (
                <>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Category name</span>
                    <input
                      value={form.categoryName}
                      onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))}
                      className={fieldClass}
                      maxLength={50}
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Category description</span>
                    <input
                      value={form.categoryDescription}
                      onChange={(event) => setForm((current) => ({ ...current, categoryDescription: event.target.value }))}
                      className={fieldClass}
                      maxLength={500}
                    />
                  </label>
                </>
              )}

              <div className="sm:col-span-2 space-y-3 rounded-2xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Requirements</p>
                    <p className="mt-1 text-[11px] text-zinc-500">All of these must be true. Create named rules on the Requirements tab, then attach them here.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRequirement}
                    disabled={!availableDefs.length}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                {form.requirements.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">
                    No requirements. This stays honorary until you grant it from the Grant tab.
                  </p>
                )}

                {form.requirements.map((requirement, index) => {
                  const selected = requirementDefs.find((def) => def.requirement_def_id === requirement.requirement_def_id)
                    || requirement;
                  const type = requirementTypes.find((item) => item.code === selected.metric);
                  return (
                    <div key={`${requirement.requirement_def_id}-${index}`} className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:grid-cols-[1fr_auto]">
                      <select
                        value={requirement.requirement_def_id}
                        onChange={(event) => updateRequirement(index, event.target.value)}
                        className={fieldClass}
                      >
                        {!requirementDefs.some((def) => def.requirement_def_id === requirement.requirement_def_id) && (
                          <option value={requirement.requirement_def_id}>
                            {formatRequirement(requirement, requirementTypes)}
                          </option>
                        )}
                        {groupedDefs.map(([group, defs]) => (
                          <optgroup key={group} label={group}>
                            {defs
                              .filter((def) =>
                                def.requirement_def_id === requirement.requirement_def_id
                                || (!usedDefIds.has(def.requirement_def_id) && !usedMetrics.has(def.metric))
                              )
                              .map((def) => (
                                <option key={def.requirement_def_id} value={def.requirement_def_id}>
                                  {formatRequirement(def, requirementTypes)}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        aria-label="Remove requirement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <p className="sm:col-span-2 text-[11px] text-zinc-500">
                        {type?.kind === 'boolean'
                          ? (selected.description || type.description)
                          : `${type?.label || selected.metric} ${operatorLabel(selected.operator)} ${selected.threshold}${selected.description ? ` · ${selected.description}` : ''}`}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, isSecret: !current.isSecret }))}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left sm:col-span-2"
              >
                <span>
                  <span className="block text-sm text-white">Secret badge</span>
                  <span className="text-[11px] text-zinc-500">Hidden from public lists until claimed.</span>
                </span>
                <span className={`relative h-6 w-11 rounded-full ${form.isSecret ? 'bg-rose-500' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${form.isSecret ? 'left-[22px]' : 'left-0.5'}`} />
                </span>
              </button>
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
                {editor === 'create' ? 'Create badge' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
