import { X } from 'lucide-react';
import type { EconomyWallet } from './creditEconomyTypes';

type WalletDetailModalProps = {
  wallet: EconomyWallet;
  onClose: () => void;
};

export default function WalletDetailModal({ wallet, onClose }: WalletDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {wallet.name}{' '}
              <span className="text-sm font-normal text-zinc-500">{wallet.accountType}</span>
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{wallet.email}</p>
            <p className="text-[10px] text-zinc-600">{wallet.walletId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {wallet.frozen && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                Credits frozen
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-400">
              Merit: {wallet.meritScore}
            </span>
          </div>

          <h3 className="mb-3 text-sm font-semibold text-zinc-400">Recent transactions</h3>
          <ul className="space-y-3">
            {wallet.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{tx.type}</p>
                  <p className="text-xs text-zinc-500">
                    {tx.label} · {tx.timeAgo}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{tx.status}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-semibold tabular-nums ${tx.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.positive ? '+' : ''}
                    {tx.amount.toLocaleString()}
                  </p>
                  {tx.reversible && (
                    <button
                      type="button"
                      className="mt-1 text-[10px] text-rose-400 underline hover:text-rose-300"
                    >
                      Reverse transaction
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/[0.08] px-5 py-4">
          <div className="mb-4 flex gap-8">
            <div>
              <p className="text-xs text-zinc-500">Total credits</p>
              <p className="text-xl font-bold tabular-nums text-white">
                {wallet.totalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total revenue</p>
              <p className="text-xl font-bold tabular-nums text-emerald-300">
                ₱{wallet.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`w-full rounded-xl border py-2.5 text-sm font-medium ${
              wallet.frozen
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            }`}
          >
            {wallet.frozen ? 'Unfreeze credits' : 'Freeze credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
