import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Filter, Loader2, X } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import {
  BalanceChange,
  CopyId,
  ECONOMY_ACCENT,
  ECONOMY_API,
  formatDateTime,
  LedgerAmount,
  PartyCell,
  StatusPill,
} from './economyUi';
import {
  referenceLabel,
  type EconomyVariant,
  type LedgerBalance,
  type LedgerEntry,
  type LedgerEntryDetailResponse,
  type LedgerFilters,
  type LedgerParty,
} from './creditEconomyTypes';
import { entrySubtitle, entryTitle, LedgerEntryDetail, LedgerLinkChips } from './ledgerShared';

const LINK_LABEL: Record<LedgerEntryDetailResponse['links'][number]['relation'], string> = {
  fee: 'Platform fee taken',
  fee_for: 'Taken from',
  reverses: 'Reverses',
  reversed_by: 'Reversed by',
};

function groupTitle(group: LedgerEntryDetailResponse['groups'][number], entry: LedgerEntry) {
  if (group.relation === 'same_escrow') return 'Contract escrow timeline';
  if (group.relation === 'same_dispute') return 'Everything on this dispute';
  return `Everything on this ${referenceLabel(entry.referenceTable).toLowerCase()}`;
}

type LedgerEntryModalProps = {
  transactionId: string;
  variant: EconomyVariant;
  onClose: () => void;
  /** Show another entry in this modal (replaces `?tx=`). */
  onNavigate: (transactionId: string) => void;
  onOpenWallet: (walletId: string) => void;
  onShowInLedger: (filters: Partial<LedgerFilters>) => void;
};

/**
 * One ledger entry with every row it is tied to: its fee or the sale a fee came from, the
 * reversal pair, and the full timeline of its contract escrow, reference or dispute. Linked
 * rows open in place; Back returns along the trail.
 */
export default function LedgerEntryModal({
  transactionId,
  variant,
  onClose,
  onNavigate,
  onOpenWallet,
  onShowInLedger,
}: LedgerEntryModalProps) {
  const accent = ECONOMY_ACCENT[variant];
  const url = ECONOMY_API.ledgerEntry(transactionId);
  const cached = peekStaffGet(url)?.data;
  const [data, setData] = useState<LedgerEntryDetailResponse | null>(cached?.success ? cached.data : null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState('');
  const [trail, setTrail] = useState<string[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      const hit = peekStaffGet(url)?.data;
      setData(hit?.success ? hit.data : null);
      setLoading(true);
      setError('');
    }
    try {
      const res = await staffGet(url);
      if (res.data?.success) {
        setData(res.data.data);
        setError('');
      } else if (!silent) setError(res.data?.message || 'Could not load this entry.');
    } catch (err) {
      if (silent) return;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not load this entry.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live: a reversal, fee or payout linked to this entry shows up in its trail at once.
  useStaffLive(['economy', 'disputes', 'jobs'], () => load(true), { delayMs: 1000 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (id: string) => {
    if (id === transactionId) return;
    setTrail((t) => [...t, transactionId]);
    onNavigate(id);
  };
  const back = () => {
    const prev = trail[trail.length - 1];
    if (!prev) return;
    setTrail((t) => t.slice(0, -1));
    onNavigate(prev);
  };

  const entry = data?.entry && String(data.entry.id) === String(transactionId) ? data.entry : null;

  const partyBlock = (label: string, p: LedgerParty, balance: LedgerBalance | null | undefined) => (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      {p.walletId && p.walletType === 'Account' ? (
        <button type="button" onClick={() => onOpenWallet(p.walletId as string)} className="block w-full min-w-0 text-left hover:opacity-80" title="Open this wallet">
          <PartyCell party={p} />
        </button>
      ) : (
        <PartyCell party={p} />
      )}
      {balance && (
        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Balance before → after</p>
          <BalanceChange balance={balance} label={null} />
        </div>
      )}
    </div>
  );

  const row = (e: LedgerEntry, label?: string) => {
    const current = String(e.id) === String(transactionId);
    return (
      <li key={`${label || ''}-${e.id}`}>
        <button
          type="button"
          disabled={current}
          onClick={() => go(e.id)}
          className={`flex w-full items-start gap-3 px-3 py-2.5 text-left ${current ? `${accent.row} cursor-default` : 'hover:bg-white/[0.03]'}`}
        >
          <span className="min-w-0 flex-1">
            {label && <span className="block text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>}
            <span className="block text-sm text-white">
              {entryTitle(e)}
              {current && <span className="ml-2 text-[10px] font-medium text-zinc-400">this entry</span>}
            </span>
            <span className="block truncate text-[11px] text-zinc-500">
              {formatDateTime(e.createdAt)} · {e.isAdjustment ? entrySubtitle(e) : `${e.source.name} → ${e.destination.name}`}
            </span>
            <LedgerLinkChips entry={e} />
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <LedgerAmount entry={e} />
            <StatusPill status={e.status} />
          </span>
          {!current && <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-600" />}
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:pl-[260px]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {trail.length > 0 && (
              <button type="button" onClick={back} className="mt-0.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-white" aria-label="Back to the previous entry" title="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accent.label}`}>Ledger entry</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-white">{entry ? entryTitle(entry) : 'Loading…'}</h2>
                {entry && <StatusPill status={entry.status} />}
              </div>
              {entry && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                  <span>{formatDateTime(entry.createdAt)}</span>
                  <span>{entrySubtitle(entry)}</span>
                  <CopyId value={entry.id} />
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading && !entry && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 className={`h-4 w-4 animate-spin ${accent.spinner}`} /> Loading entry…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertTriangle className="h-4 w-4" /> {error}
              <button type="button" onClick={() => void load()} className="ml-auto text-xs underline">
                Retry
              </button>
            </div>
          )}

          {entry && data && (
            <>
              <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
                {partyBlock('From', entry.source, entry.balances?.source)}
                <div className="flex flex-col items-center justify-center px-2 text-center">
                  <span className="text-xl"><LedgerAmount entry={entry} /></span>
                  <span className="text-[10px] text-zinc-600">credits</span>
                </div>
                {entry.isAdjustment ? (
                  <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-500">
                    Same wallet (staff adjustment)
                  </div>
                ) : (
                  partyBlock('To', entry.destination, entry.balances?.destination)
                )}
              </div>

              <LedgerEntryDetail
                entry={entry}
                onOpenWallet={onOpenWallet}
                onOpenTransaction={go}
                onShowInLedger={onShowInLedger}
                showOpenEntry={false}
                showLinks={false}
                showBalances={false}
              />

              {data.links.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Linked entries</h3>
                  <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-xl border border-white/[0.06]">
                    {data.links.map((l) => row(l.entry, LINK_LABEL[l.relation]))}
                  </ul>
                </section>
              )}

              {data.groups
                .filter((g) => g.total > 1)
                .map((g) => (
                  <section key={g.relation}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {groupTitle(g, entry)} <span className="ml-1 font-normal normal-case text-zinc-600">{g.total.toLocaleString()} entries, oldest first</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => onShowInLedger(g.filters)}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                      >
                        <Filter className="h-3 w-3" />
                        {g.total > g.items.length ? `Show all ${g.total.toLocaleString()} in the ledger` : 'Open in the ledger'}
                      </button>
                    </div>
                    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-xl border border-white/[0.06]">
                      {g.items.map((e) => row(e))}
                    </ul>
                  </section>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
