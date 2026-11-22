import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Check, Loader2, Search, Send, Trash2, X } from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import { badgesRegistry } from '@/pages/user/7_profile/Utilities/BadgesRegistry';
import { errorMessage, type CatalogBadge } from './badgeAdminTypes';

interface Recipient {
  account_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_preset_url: string | null;
  badge_status: 'pending' | 'claimed' | 'revoked' | null;
}

interface Holder extends Omit<Recipient, 'badge_status'> {
  account_badge_id: string;
  status: 'pending' | 'claimed';
  created_at: string;
  claimed_at: string | null;
  grant_message: string | null;
  /** The staff member who granted it (null when the grant did not record one). */
  granted_by_name?: string | null;
  granted_by_role?: string | null;
}

const MAX_MESSAGE = 500;
const RECIPIENT_PAGE_SIZE = 50;

const avatarUrl = (path?: string | null, name?: string | null) => {
  if (!path) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=71717a&color=fff&size=64`;
  if (/^https?:\/\//.test(path)) return path;
  const preset = path.match(/p\d+\.png$/i);
  if (preset) return `/profile_presets/${preset[0]}`;
  const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return cloudfront ? `${cloudfront}/${clean}` : `/${clean}`;
};

const CATALOG_URL = '/api/admin/badges';

function cachedCatalog(): CatalogBadge[] | null {
  const cached = peekStaffGet(CATALOG_URL);
  return cached ? cached.data?.data || [] : null;
}

export default function BadgeGrantTab() {
  const [catalog, setCatalog] = useState<CatalogBadge[]>(() => cachedCatalog() || []);
  const [catalogLoading, setCatalogLoading] = useState(() => !cachedCatalog());
  const [selectedId, setSelectedId] = useState<string | null>(() => cachedCatalog()?.[0]?.registry_id ?? null);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [holders, setHolders] = useState<Holder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);

  const registryById = useMemo(() => new Map(badgesRegistry.map((b) => [String(b.id), b])), []);
  const selectedBadge = catalog.find((b) => b.registry_id === selectedId) || null;
  const selectedMeta = selectedId ? registryById.get(selectedId) : undefined;
  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, CatalogBadge[]>();
    for (const badge of catalog) {
      const key = badge.category || 'Uncategorized';
      const list = groups.get(key) || [];
      list.push(badge);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [catalog]);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await staffGet(CATALOG_URL);
      const rows: CatalogBadge[] = res.data?.data || [];
      setCatalog(rows);
      setSelectedId((current) => current ?? rows[0]?.registry_id ?? null);
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err, 'Unable to load badges') });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadHolders = useCallback(async (registryId: string, silent = false) => {
    if (!silent) setHoldersLoading(true);
    try {
      const res = await api.get(`/api/admin/badges/${encodeURIComponent(registryId)}/holders`);
      setHolders(res.data?.data || []);
    } catch {
      if (!silent) setHolders([]);
    } finally {
      if (!silent) setHoldersLoading(false);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  // Live: grants by other admins and members claiming a badge update the catalog and holders.
  useStaffLive(['badges', 'accounts'], (batch) => {
    if (batch.resync || batch.topics.includes('badges')) setRefreshKey((k) => k + 1);
    return Promise.all([loadCatalog(), selectedId ? loadHolders(selectedId, true) : null]);
  });

  useEffect(() => {
    if (!selectedId) return;
    setSelected([]);
    setFeedback(null);
    void loadHolders(selectedId);
  }, [selectedId, loadHolders]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/api/admin/badges/recipients', {
          params: { search, registryId: selectedId, limit: RECIPIENT_PAGE_SIZE, offset: 0 },
        });
        if (cancelled) return;
        setResults(res.data?.data?.recipients || []);
        setHasMore(Boolean(res.data?.data?.hasMore));
      } catch {
        if (cancelled) return;
        setResults([]);
        setHasMore(false);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, selectedId, refreshKey]);

  const loadMoreRecipients = async () => {
    if (!selectedId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get('/api/admin/badges/recipients', {
        params: { search, registryId: selectedId, limit: RECIPIENT_PAGE_SIZE, offset: results.length },
      });
      const next: Recipient[] = res.data?.data?.recipients || [];
      setResults((current) => {
        const seen = new Set(current.map((r) => r.account_id));
        return [...current, ...next.filter((r) => !seen.has(r.account_id))];
      });
      setHasMore(Boolean(res.data?.data?.hasMore));
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err, 'Unable to load more users') });
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleRecipient = (recipient: Recipient) => {
    setSelected((current) =>
      current.some((r) => r.account_id === recipient.account_id)
        ? current.filter((r) => r.account_id !== recipient.account_id)
        : [...current, recipient]
    );
  };

  const sendGrant = async () => {
    if (!selectedId || !selected.length) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await api.post(`/api/admin/badges/${encodeURIComponent(selectedId)}/grants`, {
        accountIds: selected.map((r) => r.account_id),
        message,
      });
      const { granted = 0, skipped = 0 } = res.data?.data || {};
      setFeedback({
        type: 'ok',
        text: `Sent to ${granted} user${granted === 1 ? '' : 's'}${skipped ? ` · ${skipped} already had this badge` : ''}.`,
      });
      setSelected([]);
      setMessage('');
      setRefreshKey((k) => k + 1);
      await Promise.all([loadCatalog(), loadHolders(selectedId)]);
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err, 'Unable to send badge') });
    } finally {
      setSending(false);
    }
  };

  const revoke = async (holder: Holder) => {
    if (!selectedId) return;
    if (!window.confirm(`Revoke ${selectedBadge?.name || 'this badge'} from ${holder.display_name || holder.handle}?`)) return;
    try {
      await api.delete(`/api/admin/badges/grants/${holder.account_badge_id}`);
      await Promise.all([loadCatalog(), loadHolders(selectedId)]);
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err, 'Unable to revoke badge') });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Badges</p>
        {catalogLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
        ) : catalog.length === 0 ? (
          <p className="px-2 py-6 text-sm text-zinc-500">No badges found. Add one on the Catalog tab.</p>
        ) : (
          <div className="space-y-3">
            {groupedCatalog.map(([category, badges]) => (
              <div key={category}>
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{category}</p>
                <div className="space-y-1">
                  {badges.map((badge) => {
                    const meta = registryById.get(badge.registry_id);
                    const active = badge.registry_id === selectedId;
                    return (
                      <button
                        key={badge.badge_id}
                        onClick={() => setSelectedId(badge.registry_id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                          active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        {meta?.icon ? (
                          <img src={meta.icon} alt="" className="h-9 w-9 shrink-0 object-contain" />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400"><Award className="h-4 w-4" /></span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">{badge.name}</span>
                          <span className="block text-[11px] text-zinc-500">{badge.claimed_count} claimed · {badge.pending_count} pending</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedBadge && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-start gap-4">
              {selectedMeta?.icon && <img src={selectedMeta.icon} alt="" className="h-16 w-16 object-contain" />}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">{selectedBadge.name}</h2>
                {selectedBadge.category && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{selectedBadge.category}</p>
                )}
                <p className="mt-1 text-sm text-zinc-400">{selectedMeta?.description || selectedBadge.description}</p>
                {selectedMeta?.condition && <p className="mt-1 text-xs text-zinc-500">Criteria: {selectedMeta.condition}</p>}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold text-zinc-400">Recipients</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users by name, @handle, or email"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />}
              </div>

              {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.map((r) => (
                    <span key={r.account_id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 py-1 pl-1 pr-2 text-xs text-blue-200">
                      <img src={avatarUrl(r.avatar_preset_url, r.display_name)} alt="" className="h-5 w-5 rounded-full object-cover" />
                      {r.display_name || `@${r.handle}`}
                      <button onClick={() => toggleRecipient(r)} aria-label="Remove"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/[0.06]">
                {results.length === 0 ? (
                  <p className="p-4 text-center text-sm text-zinc-500">{searching ? 'Searching…' : 'No users found.'}</p>
                ) : results.map((r) => {
                  const isSelected = selected.some((s) => s.account_id === r.account_id);
                  const held = r.badge_status === 'pending' || r.badge_status === 'claimed';
                  return (
                    <button
                      key={r.account_id}
                      disabled={held}
                      onClick={() => toggleRecipient(r)}
                      className="flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-2 text-left last:border-b-0 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <img src={avatarUrl(r.avatar_preset_url, r.display_name)} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{r.display_name || r.handle}</span>
                        <span className="block truncate text-[11px] text-zinc-500">@{r.handle}</span>
                      </span>
                      {held ? (
                        <span className="text-[11px] capitalize text-zinc-500">{r.badge_status}</span>
                      ) : (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                      )}
                    </button>
                  );
                })}
                {hasMore && (
                  <button
                    onClick={() => void loadMoreRecipients()}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Load more users
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 flex justify-between text-xs font-semibold text-zinc-400">
                <span>Message (optional)</span>
                <span className="font-normal text-zinc-500">{message.length}/{MAX_MESSAGE}</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                rows={3}
                placeholder="Thanks for helping us test Ensemble!"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className={`text-sm ${feedback?.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{feedback?.text}</p>
              <button
                onClick={() => void sendGrant()}
                disabled={!selected.length || sending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to {selected.length || ''} user{selected.length === 1 ? '' : 's'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Current holders</h3>
            {holdersLoading ? (
              <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
            ) : holders.length === 0 ? (
              <p className="text-sm text-zinc-500">Nobody has this badge yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {holders.map((h) => (
                  <div key={h.account_badge_id} className="flex items-center gap-3 py-2">
                    <img src={avatarUrl(h.avatar_preset_url, h.display_name)} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{h.display_name || h.handle} <span className="text-zinc-500">@{h.handle}</span></p>
                      {h.grant_message && <p className="truncate text-[11px] text-zinc-500">“{h.grant_message}”</p>}
                      <p className="truncate text-[11px] text-zinc-600">
                        {h.granted_by_name
                          ? `Granted by ${h.granted_by_name}${h.granted_by_role ? ` (${h.granted_by_role})` : ''}`
                          : 'Granted by staff (name not recorded)'}
                        {h.created_at ? ` · ${new Date(h.created_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${h.status === 'claimed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {h.status === 'claimed' ? 'Claimed' : 'Pending'}
                    </span>
                    <button onClick={() => void revoke(h)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label="Revoke">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
