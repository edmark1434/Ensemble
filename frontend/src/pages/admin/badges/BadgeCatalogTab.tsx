import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { badgesRegistry } from '@/pages/user/7_profile/Utilities/BadgesRegistry';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import {
  emptyBadgeForm,
  errorMessage,
  formFromBadge,
  summarizeUnlock,
  type BadgeFormState,
  type CatalogBadge,
  type RequirementType,
} from './badgeAdminTypes';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/20';

function iconFor(registryId: string) {
  return badgesRegistry.find((badge) => String(badge.id) === registryId)?.icon;
}

function payloadFromForm(form: BadgeFormState) {
  return {
    registryId: form.registryId.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    isSecret: form.isSecret,
    triggerEventCode: form.triggerEventCode,
    conditionValue: form.conditionValue,
  };
}

export default function BadgeCatalogTab() {
  const [badges, setBadges] = useState<CatalogBadge[]>([]);
  const [unlockTypes, setUnlockTypes] = useState<RequirementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'create' | CatalogBadge | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyBadgeForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const [badgeRes, typeRes] = await Promise.all([
      api.get('/api/admin/badges'),
      api.get('/api/admin/badge-requirement-types'),
    ]);
    setBadges(badgeRes.data?.data || []);
    setUnlockTypes(typeRes.data?.data || []);
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
      [badge.name, badge.registry_id, badge.category, summarizeUnlock(badge, unlockTypes)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [badges, search, unlockTypes]);

  const selectedType = unlockTypes.find((item) => item.code === form.triggerEventCode);
  const countUnlock = selectedType?.kind === 'count';
  const groupedTypes = useMemo(() => {
    const groups = new Map<string, RequirementType[]>();
    for (const type of unlockTypes) {
      const list = groups.get(type.group) || [];
      list.push(type);
      groups.set(type.group, list);
    }
    return [...groups.entries()];
  }, [unlockTypes]);

  const openCreate = () => {
    setForm(emptyBadgeForm());
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
    if (!payload.registryId || !payload.name || !payload.description) {
      setFormError('Name, registry ID, and description are required.');
      return;
    }
    if (!payload.category) {
      setFormError('Category is required.');
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

  const editingSystem = editor !== 'create' && Boolean(editor?.is_system);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ID, or unlock"
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
                <th className="px-4 py-3 font-medium">Unlock</th>
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
                    <td className="px-4 py-3 text-zinc-300">{badge.category}</td>
                    <td className="max-w-xs px-4 py-3 text-zinc-400">
                      {summarizeUnlock(badge, unlockTypes)}
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
                  One unlock per badge. Honorary badges stay grant-only until staff send them.
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
                  disabled={editingSystem}
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
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Category</span>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className={fieldClass}
                  maxLength={50}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Unlock</span>
                <select
                  value={form.triggerEventCode}
                  disabled={editingSystem}
                  onChange={(event) => setForm((current) => ({ ...current, triggerEventCode: event.target.value }))}
                  className={`${fieldClass} disabled:opacity-60`}
                >
                  {groupedTypes.map(([group, types]) => (
                    <optgroup key={group} label={group}>
                      {types.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {countUnlock && (
                <label>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">At least</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    disabled={editingSystem}
                    value={form.conditionValue}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      conditionValue: Number(event.target.value || 1),
                    }))}
                    className={`${fieldClass} disabled:opacity-60`}
                  />
                </label>
              )}
              {selectedType?.description && (
                <p className="sm:col-span-2 text-[11px] text-zinc-500">{selectedType.description}</p>
              )}

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
