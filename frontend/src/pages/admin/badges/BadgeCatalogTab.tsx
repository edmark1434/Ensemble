import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { badgesRegistry } from '@/pages/user/7_profile/Utilities/BadgesRegistry';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import {
  TRIGGER_OPTIONS,
  emptyBadgeForm,
  errorMessage,
  formFromBadge,
  type BadgeCategory,
  type BadgeFormState,
  type CatalogBadge,
} from './badgeAdminTypes';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

const NEW_CATEGORY = '__new__';

function triggerLabel(code: string) {
  return TRIGGER_OPTIONS.find((option) => option.value === code)?.label || code;
}

function iconFor(registryId: string) {
  return badgesRegistry.find((badge) => String(badge.id) === registryId)?.icon;
}

function payloadFromForm(form: BadgeFormState) {
  const triggerEventCode =
    form.triggerEventCode === 'custom' ? form.customTrigger.trim() : form.triggerEventCode;
  const creatingCategory = form.categoryId === NEW_CATEGORY;
  return {
    registryId: form.registryId.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    isSecret: form.isSecret,
    triggerEventCode,
    conditionType: form.conditionType,
    conditionValue: form.conditionType === 'boolean' ? 1 : Number(form.conditionValue),
    categoryId: creatingCategory ? undefined : form.categoryId,
    categoryName: creatingCategory ? form.categoryName.trim() : undefined,
    categoryDescription: creatingCategory ? form.categoryDescription.trim() : undefined,
  };
}

export default function BadgeCatalogTab() {
  const [badges, setBadges] = useState<CatalogBadge[]>([]);
  const [categories, setCategories] = useState<BadgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'create' | CatalogBadge | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyBadgeForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const [badgeRes, categoryRes] = await Promise.all([
      api.get('/api/admin/badges'),
      api.get('/api/admin/badge-categories'),
    ]);
    setBadges(badgeRes.data?.data || []);
    setCategories(categoryRes.data?.data || []);
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
      [badge.name, badge.registry_id, badge.category_name, badge.trigger_event_code]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [badges, search]);

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

  const save = async () => {
    const payload = payloadFromForm(form);
    if (!payload.registryId || !payload.name || !payload.description || !payload.triggerEventCode) {
      setFormError('Name, registry ID, description, and trigger are required.');
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
            placeholder="Search name, ID, or category"
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
                <th className="px-4 py-3 font-medium">Trigger</th>
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
                    <td className="px-4 py-3 text-zinc-400">
                      {triggerLabel(badge.trigger_event_code)}
                      {badge.condition_type === 'count' ? ` · ${badge.condition_value}` : ''}
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
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c0d12] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editor === 'create' ? 'New badge' : `Edit ${editor.name}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {editor !== 'create' && editor.is_system
                    ? 'Product badges can be renamed, but their registry ID stays fixed so auto-award still works.'
                    : 'Honorary badges are granted from the Grant tab. Product ranks still evaluate on job, gig, and asset close.'}
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
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Trigger</span>
                <select
                  value={form.triggerEventCode}
                  onChange={(event) => setForm((current) => ({ ...current, triggerEventCode: event.target.value }))}
                  className={fieldClass}
                >
                  {TRIGGER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.triggerEventCode === 'custom' && (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Custom trigger</span>
                  <input
                    value={form.customTrigger}
                    onChange={(event) => setForm((current) => ({ ...current, customTrigger: event.target.value }))}
                    placeholder="staff_honorary"
                    className={fieldClass}
                    maxLength={50}
                  />
                </label>
              )}
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Condition</span>
                <select
                  value={form.conditionType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      conditionType: event.target.value === 'count' ? 'count' : 'boolean',
                      conditionValue: event.target.value === 'count' ? current.conditionValue || '1' : '1',
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="boolean">Already complete</option>
                  <option value="count">Reach a count</option>
                </select>
              </label>
              {form.conditionType === 'count' && (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Count</span>
                  <input
                    type="number"
                    min={1}
                    value={form.conditionValue}
                    onChange={(event) => setForm((current) => ({ ...current, conditionValue: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, isSecret: !current.isSecret }))}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left"
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
