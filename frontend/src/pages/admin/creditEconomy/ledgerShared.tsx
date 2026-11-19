import type { ReactNode } from 'react';
import { ArrowUpRight, Filter, Receipt, Undo2 } from 'lucide-react';
import { CopyId, downloadCsv, formatCredits, shortId, StatusPill } from './economyUi';
import { referenceLabel, type LedgerEntry, type LedgerFilters, type LedgerParty } from './creditEconomyTypes';

/**
 * Ledger pieces shared by the Ledger tab, the wallet modal and the entry modal: the URL
 * form of the filters, CSV export, the link chips on a row and the expanded entry detail.
 */

export const LEDGER_DEFAULTS: LedgerFilters = {
  search: '',
  kind: 'all',
  type: 'all',
  status: 'all',
  from: '',
  to: '',
  minAmount: '',
  maxAmount: '',
  sort: 'newest',
  walletId: '',
  accountId: '',
  direction: 'all',
  referenceId: '',
  referenceTable: '',
  disputeId: '',
  contractId: '',
};

/** URL parameter for each filter (`?tab=ledger&status=Failed&from=…`). `wallet` / `tx` open modals. */
const PARAM: Record<keyof LedgerFilters, string> = {
  search: 'q',
  kind: 'kind',
  type: 'type',
  status: 'status',
  from: 'from',
  to: 'to',
  minAmount: 'min',
  maxAmount: 'max',
  sort: 'sort',
  walletId: 'walletId',
  accountId: 'accountId',
  direction: 'direction',
  referenceId: 'ref',
  referenceTable: 'refTable',
  disputeId: 'dispute',
  contractId: 'contract',
};

export const LEDGER_PARAM_KEYS = Object.values(PARAM);
const FILTER_KEYS = Object.keys(PARAM) as (keyof LedgerFilters)[];

export function readLedgerFilters(params: URLSearchParams): LedgerFilters {
  const out = { ...LEDGER_DEFAULTS };
  for (const key of FILTER_KEYS) {
    const value = params.get(PARAM[key]);
    if (value != null && value !== '') out[key] = value;
  }
  return out;
}

/** Writes the given filters into `params` (defaults and blanks are removed). Mutates and returns it. */
export function writeLedgerFilters(params: URLSearchParams, patch: Partial<LedgerFilters>) {
  for (const key of Object.keys(patch) as (keyof LedgerFilters)[]) {
    const name = PARAM[key];
    if (!name) continue;
    const value = patch[key];
    if (value == null || value === '' || value === LEDGER_DEFAULTS[key]) params.delete(name);
    else params.set(name, String(value));
  }
  return params;
}

/** Callbacks a ledger view can offer; each is optional so the detail fits every host. */
export type LedgerNav = {
  onOpenWallet?: (walletId: string) => void;
  onOpenTransaction?: (transactionId: string) => void;
  /** Open the Ledger tab with exactly these filters (replacing the current ones). */
  onShowInLedger?: (filters: Partial<LedgerFilters>) => void;
};

export function partyLabel(p: LedgerParty) {
  return p.handle ? `${p.name} (@${p.handle})` : p.name;
}

export function entryTitle(e: LedgerEntry) {
  return e.isAdjustment ? 'Staff adjustment' : e.type;
}

export function exportLedger(entries: LedgerEntry[], filename = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`) {
  downloadCsv(
    filename,
    [
      'Transaction ID', 'Date', 'Category', 'Type', 'Status', 'Amount', 'Signed',
      'From', 'From wallet', 'To', 'To wallet', 'Reason', 'By',
      'Fee entry', 'Fee amount', 'Fee charged on', 'Reverses', 'Reversed by',
      'Reference type', 'Reference ID', 'Dispute ID', 'Escrow contract', 'Cashout reference', 'Cashout status',
    ],
    entries.map((e) => [
      e.id,
      e.createdAt,
      e.category,
      e.type,
      e.status,
      e.amount,
      e.signedAmount ?? '',
      partyLabel(e.source),
      e.source.walletId || '',
      partyLabel(e.destination),
      e.destination.walletId || '',
      e.adjustment?.reason || '',
      e.adjustment?.actorName || '',
      e.fee?.id || '',
      e.fee?.amount ?? '',
      e.feeFor?.id || '',
      e.reverses?.id || e.reversesTransactionId || '',
      e.reversedBy?.id || '',
      e.referenceTable || '',
      e.referenceId || '',
      e.relatedDisputeId || '',
      e.source.contractId || e.destination.contractId || '',
      e.cashout?.reference || '',
      e.cashout?.status || '',
    ])
  );
}

const CHIP =
  'inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 transition hover:border-white/20 hover:text-white';

/** Small buttons on a row for its links: fee, fee-for, reverses, reversed by, cashout state. */
export function LedgerLinkChips({ entry: e, onOpenTransaction }: { entry: LedgerEntry; onOpenTransaction?: (id: string) => void }) {
  const chips: { key: string; label: string; id?: string; title: string; tone?: string }[] = [];
  if (e.fee) chips.push({ key: 'fee', label: `Fee ${formatCredits(e.fee.amount)}`, id: e.fee.id, title: 'Open the platform fee taken on this movement' });
  if (e.feeFor) {
    chips.push({ key: 'feeFor', label: `Fee on ${e.feeFor.type || 'entry'}`, id: e.feeFor.id, title: 'Open the movement this fee was charged on' });
  }
  if (e.reverses) chips.push({ key: 'rev', label: `Reverses ${e.reverses.type || 'entry'}`, id: e.reverses.id, title: 'Open the original entry' });
  if (e.reversedBy) {
    chips.push({
      key: 'revBy',
      label: e.reversedBy.status && e.reversedBy.status !== 'Completed' ? `Reversal ${e.reversedBy.status.toLowerCase()}` : 'Reversed by',
      id: e.reversedBy.id,
      title: 'Open the entry that reversed this one',
      tone: 'text-violet-200',
    });
  }
  if (e.cashout?.status && !/^(COMPLETED|SUCCEEDED|PAID)$/i.test(e.cashout.status)) {
    chips.push({ key: 'cash', label: `Payout ${e.cashout.status.toLowerCase()}`, title: 'Status at the payout provider', tone: 'text-amber-200' });
  }
  if (!chips.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {chips.map((c) =>
        c.id && onOpenTransaction ? (
          <button
            key={c.key}
            type="button"
            title={c.title}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenTransaction(c.id as string);
            }}
            className={`${CHIP} ${c.tone || ''}`}
          >
            {c.label}
            <ArrowUpRight className="h-2.5 w-2.5" />
          </button>
        ) : (
          <span key={c.key} title={c.title} className={`${CHIP} cursor-default ${c.tone || ''}`}>
            {c.label}
          </span>
        )
      )}
    </span>
  );
}

function DetailFact({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <div className={`mt-0.5 min-w-0 break-all text-xs text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function LinkCard({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="mt-0.5 shrink-0 text-zinc-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wide text-zinc-500">{title}</span>
        <span className="block truncate text-xs text-zinc-100">{detail}</span>
      </span>
      {onClick && <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />}
    </>
  );
  const base = 'flex min-w-0 items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} transition hover:border-white/20 hover:bg-white/[0.04]`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}

/** Ledger-scope shortcuts for an entry: its wallets, reference, dispute and contract. */
export function relatedScopes(e: LedgerEntry, currentWalletId?: string | null) {
  const scopes: { key: string; label: string; filters: Partial<LedgerFilters> }[] = [];
  const seen = new Set<string>();
  for (const p of e.isAdjustment ? [e.source] : [e.source, e.destination]) {
    if (!p.walletId || p.walletId === currentWalletId || seen.has(p.walletId)) continue;
    seen.add(p.walletId);
    const who = p.walletType === 'Platform' ? 'Platform wallet' : p.walletType === 'Escrow' ? 'This escrow wallet' : p.name;
    scopes.push({ key: `w-${p.walletId}`, label: `${who}: every entry`, filters: { walletId: p.walletId } });
  }
  const contractId = e.source.contractId || e.destination.contractId;
  if (contractId) scopes.push({ key: 'contract', label: 'Whole contract (escrow in and out)', filters: { contractId, sort: 'oldest' } });
  if (e.referenceId && e.referenceId !== contractId) {
    scopes.push({
      key: 'ref',
      label: `Same ${referenceLabel(e.referenceTable).toLowerCase()}`,
      filters: { referenceId: e.referenceId, referenceTable: e.referenceTable || '', sort: 'oldest' },
    });
  }
  if (e.relatedDisputeId) scopes.push({ key: 'dispute', label: 'Same dispute', filters: { disputeId: e.relatedDisputeId, sort: 'oldest' } });
  return scopes;
}

/**
 * Everything about one entry: the adjustment audit, its linked rows (each opens the entry
 * modal), every id with copy, and ledger shortcuts for the rest of its story.
 */
export function LedgerEntryDetail({
  entry: e,
  onOpenWallet,
  onOpenTransaction,
  onShowInLedger,
  currentWalletId,
  showOpenEntry = true,
}: LedgerNav & { entry: LedgerEntry; currentWalletId?: string | null; showOpenEntry?: boolean }) {
  const walletValue = (p: LedgerParty) => {
    if (!p.walletId) return null;
    const canOpen = p.walletType === 'Account' && onOpenWallet && p.walletId !== currentWalletId;
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        {canOpen ? (
          <button
            type="button"
            onClick={() => onOpenWallet!(p.walletId as string)}
            className="font-sans text-xs text-zinc-100 underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            {p.name}
          </button>
        ) : (
          <span className="font-sans text-xs text-zinc-300">{p.name}</span>
        )}
        <CopyId value={p.walletId} label={shortId(p.walletId)} />
      </span>
    );
  };

  const open = onOpenTransaction;
  const links: ReactNode[] = [];
  if (e.fee) {
    links.push(
      <LinkCard
        key="fee"
        icon={<Receipt className="h-3.5 w-3.5" />}
        title="Platform fee on this movement"
        detail={`${formatCredits(e.fee.amount)} credits${e.fee.status && e.fee.status !== 'Completed' ? ` · ${e.fee.status}` : ''} · ${shortId(e.fee.id)}`}
        onClick={open ? () => open(e.fee!.id) : undefined}
      />
    );
  }
  if (e.feeFor) {
    links.push(
      <LinkCard
        key="feeFor"
        icon={<Receipt className="h-3.5 w-3.5" />}
        title="Fee charged on"
        detail={`${e.feeFor.type || 'Entry'} · ${formatCredits(e.feeFor.amount)} credits · ${shortId(e.feeFor.id)}`}
        onClick={open ? () => open(e.feeFor!.id) : undefined}
      />
    );
  }
  if (e.reverses) {
    links.push(
      <LinkCard
        key="rev"
        icon={<Undo2 className="h-3.5 w-3.5" />}
        title="Reverses"
        detail={`${e.reverses.type || 'Entry'}${e.reverses.status ? ` · now ${e.reverses.status}` : ''} · ${shortId(e.reverses.id)}`}
        onClick={open ? () => open(e.reverses!.id) : undefined}
      />
    );
  }
  if (e.reversedBy) {
    links.push(
      <LinkCard
        key="revBy"
        icon={<Undo2 className="h-3.5 w-3.5" />}
        title="Reversed by"
        detail={`${e.reversedBy.status || 'Entry'} · ${shortId(e.reversedBy.id)}`}
        onClick={open ? () => open(e.reversedBy!.id) : undefined}
      />
    );
  }

  const contractId = e.source.contractId || e.destination.contractId;
  const scopes = onShowInLedger ? relatedScopes(e, currentWalletId) : [];

  return (
    <div className="space-y-3">
      {e.isAdjustment && (
        <div
          className={`rounded-xl border p-3 text-xs ${
            e.adjustment?.recorded ? 'border-white/[0.08] bg-white/[0.02] text-zinc-200' : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-100'
          }`}
        >
          {e.adjustment?.recorded ? (
            <>
              <p>
                <span className="font-semibold">{(e.adjustment.delta || 0) > 0 ? 'Granted' : 'Deducted'} {formatCredits(Math.abs(e.adjustment.delta || 0))} credits</span>
                {' '}by {e.adjustment.actorName || 'staff'}
                {e.adjustment.actorRole ? ` (${e.adjustment.actorRole})` : ''}
                {e.adjustment.balanceAfter != null ? ` · spendable after: ${formatCredits(e.adjustment.balanceAfter)}` : ''}
              </p>
              <p className="mt-1 text-zinc-400">{e.adjustment.reason}</p>
            </>
          ) : (
            <p>
              This adjustment was made before staff adjustments were audited. Its direction (grant or deduction), reason
              and author were not recorded.
            </p>
          )}
        </div>
      )}

      {links.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{links}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailFact label="Transaction ID" value={<CopyId value={e.id} className="text-xs text-zinc-200" />} />
        <DetailFact label="Type / category" value={`${e.type} · ${e.category}`} />
        <DetailFact label="From wallet" value={walletValue(e.source)} />
        <DetailFact label="To wallet" value={e.isAdjustment ? 'Same wallet' : walletValue(e.destination)} />
        <DetailFact
          label={referenceLabel(e.referenceTable)}
          value={e.referenceId ? <CopyId value={e.referenceId} className="text-xs text-zinc-200" /> : null}
        />
        {e.relatedDisputeId && <DetailFact label="Dispute" value={<CopyId value={e.relatedDisputeId} className="text-xs text-zinc-200" />} />}
        {contractId && <DetailFact label="Escrow contract" value={<CopyId value={contractId} className="text-xs text-zinc-200" />} />}
        {e.cashout && (
          <DetailFact
            label="Payout"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {e.cashout.reference ? <CopyId value={e.cashout.reference} className="text-xs text-zinc-200" /> : '—'}
                {e.cashout.status && <StatusPill status={e.cashout.status} />}
              </span>
            }
          />
        )}
      </div>

      {(scopes.length > 0 || (showOpenEntry && open)) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
          {showOpenEntry && open && (
            <button
              type="button"
              onClick={() => open(e.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/[0.08]"
            >
              Open entry & everything linked <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
          {scopes.length > 0 && <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-600">Show in ledger</span>}
          {scopes.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onShowInLedger!(s.filters)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-zinc-300 hover:border-white/20 hover:text-white"
            >
              <Filter className="h-3 w-3" /> {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
