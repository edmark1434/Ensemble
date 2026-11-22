import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { useStaffLive } from '@/lib/staffLive';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';

/**
 * What bans closed on this account (jobs, gigs, marketplace listings) and putting them back.
 * An accepted ban appeal restores them on its own; this is for any other lift, or for items an
 * earlier restore skipped. Admin and Support only (bans are theirs). Nothing renders when no
 * ban ever closed anything. docs/punishment-system.md §4.6.
 */

type BanItem = {
  id: string;
  type: 'job' | 'gig' | 'listing';
  title: string | null;
  previousStatus: string;
  closedAt: string;
  restoredAt: string | null;
  restoreSource: 'appeal' | 'staff' | null;
  skippedText: string | null;
  state: 'closed' | 'restored';
};

const TYPE_LABEL: Record<BanItem['type'], string> = { job: 'Job', gig: 'Gig', listing: 'Listing' };

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function BanClosedItemsPanel({
  accountId,
  accountStatus,
}: {
  accountId: string;
  accountStatus?: string | null;
}) {
  const role = useGlobalState((state) => state.user?.role);
  const canRestore = role === 'Admin' || role === 'Support Moderator';
  const [items, setItems] = useState<BanItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const banned = String(accountStatus || '').toLowerCase() === 'banned';

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/accounts/${accountId}/ban-items`);
      setItems(res.data?.data?.items || []);
    } catch {
      // A desk without access, or the table not migrated yet: show nothing.
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  useStaffLive(['accounts', 'teams', 'jobs', 'marketplace'], () => load(), { delayMs: 1000 });

  if (!loaded || items.length === 0) return null;
  const closed = items.filter((item) => item.state === 'closed');

  const restore = async (itemIds: string[] | null, key: string) => {
    setBusy(key);
    try {
      const res = await api.post(`/api/admin/accounts/${accountId}/ban-items/restore`, itemIds ? { itemIds } : {});
      showSuccessToast(res.data?.message || 'Restored.');
      await load();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Could not restore.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Closed by a ban</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {closed.length
              ? `${closed.length} still closed. An accepted ban appeal restores these on its own.`
              : 'Everything the ban closed has been restored.'}
          </p>
        </div>
        {canRestore && closed.length > 0 ? (
          <button
            type="button"
            disabled={banned || busy !== null}
            title={banned ? 'Lift the ban (or accept the appeal) first.' : undefined}
            onClick={() => void restore(null, 'all')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Restore all
          </button>
        ) : null}
      </div>
      {banned && closed.length > 0 ? (
        <p className="mt-2 text-xs text-amber-200/80">The account is still banned, so these stay closed until the ban is lifted.</p>
      ) : null}
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-200">
                <span className="mr-1.5 rounded bg-white/5 px-1.5 py-px text-[10px] uppercase text-zinc-400">
                  {TYPE_LABEL[item.type]}
                </span>
                {item.title || 'Untitled'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Closed {formatWhen(item.closedAt)} · was {item.previousStatus}
                {item.state === 'restored'
                  ? ` · restored ${formatWhen(item.restoredAt)}${item.restoreSource === 'appeal' ? ' (appeal)' : ''}`
                  : item.skippedText
                    ? ` · stayed closed: ${item.skippedText}`
                    : ''}
              </p>
            </div>
            {canRestore && item.state === 'closed' ? (
              <button
                type="button"
                disabled={banned || busy !== null}
                onClick={() => void restore([item.id], item.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === item.id ? 'Restoring…' : 'Restore'}
              </button>
            ) : (
              <span className={`text-[11px] ${item.state === 'restored' ? 'text-emerald-300' : 'text-zinc-500'}`}>
                {item.state === 'restored' ? 'Restored' : 'Closed'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
