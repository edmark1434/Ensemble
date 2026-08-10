import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  List,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";

const TRANSACTION_CATEGORIES = [
  "Fund Transfer",
  "Credit Purchase",
  "Escrow Hold",
  "Escrow Release",
  "Escrow Refund",
  "Asset Purchase",
  "Asset Refund",
  "Fee",
] as const;

const TYPE_DISPLAY_LABELS: Record<string, string> = {
  "Escrow Hold": "Credits On Hold",
  "Escrow Release": "Credits Released",
  "Escrow Refund": "Credits Refunded",
};

type Direction = "incoming" | "outgoing" | "internal";
type RowLimit = 10 | 25 | 50;
type MainTab = "Summary" | "Credits" | "Assets" | "Fund Transfer" | "Fee";

const ASSET_TYPES = ["Asset Purchase", "Asset Refund"];
const STANDALONE_TYPES = ["Fund Transfer", "Fee"];

interface CreditTransaction {
  id: string;
  type: string;
  amountCredits: number;
  status: string;
  createdAt: string;
  direction: Direction;
  sourceWalletId: string;
  destinationWalletId: string;
  feeTransactionId: string | null;
  referenceTable: string | null;
  referenceId: string | null;
  isCreditPurchase: boolean;
}

interface CreditTransactionsResponse {
  success: boolean;
  transactions: CreditTransaction[];
}

const directionMeta: Record<Direction, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  incoming: { label: "Incoming", icon: ArrowDownLeft, color: "text-emerald-300" },
  outgoing: { label: "Outgoing", icon: ArrowUpRight, color: "text-rose-300" },
  internal: { label: "Internal", icon: ArrowLeftRight, color: "text-blue-300" },
};

function credits(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function displayType(type: string) {
  return TYPE_DISPLAY_LABELS[type] || type || "Unknown";
}

function transactionCategory(transaction: CreditTransaction) {
  return transaction.isCreditPurchase ? "Credit Purchase" : transaction.type;
}

function shortId(value: string) {
  return value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatStatus(value: string) {
  return value.trim().replace(/[_-]+/g, " ") || "Unknown";
}

function statusClasses(status: string) {
  const value = status.toLowerCase();
  if (value === "completed") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (["failed", "cancelled", "canceled"].includes(value)) return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  if (["refunded", "released"].includes(value)) return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  return "border-amber-500/20 bg-amber-500/10 text-amber-200";
}

function isCompleted(status: string) {
  return status.toLowerCase() === "completed";
}

function CreditAmount({ transaction }: { transaction: CreditTransaction }) {
  const sign = transaction.direction === "incoming" ? "+" : transaction.direction === "outgoing" ? "−" : "";
  const color = transaction.direction === "incoming"
    ? "text-emerald-300"
    : transaction.direction === "outgoing"
      ? "text-rose-300"
      : "text-blue-300";

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${color}`}>
      <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
      {sign}{credits(transaction.amountCredits)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none p-5 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-500">{label}</p>
      <p className={`mt-3 flex items-center gap-2 text-2xl font-bold tabular-nums ${color}`}>
        <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
        {credits(value)}
      </p>
      <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">{detail}</p>
    </div>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.025] p-3.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">{label}</dt>
      <dd className={`mt-1.5 break-all text-sm text-gray-700 dark:text-zinc-200 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

export const TransactionHistoryMain = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("Summary");
  const [activeChildTab, setActiveChildTab] = useState("All Credits");
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<RowLimit>(10);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<CreditTransactionsResponse>("/api/transactions/credits");
      setTransactions(Array.isArray(response.data.transactions) ? response.data.transactions : []);
    } catch {
      setError("We couldn't load your credit history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const types = useMemo(() => {
    const found = new Set(transactions.map(transactionCategory));
    const unknown = [...found].filter((type) => !TRANSACTION_CATEGORIES.includes(type as typeof TRANSACTION_CATEGORIES[number]));
    return [...TRANSACTION_CATEGORIES, ...unknown.sort((a, b) => a.localeCompare(b))];
  }, [transactions]);

  const creditTypes = useMemo(
    () => types.filter((type) => !ASSET_TYPES.includes(type) && !STANDALONE_TYPES.includes(type)),
    [types],
  );

  const assetTypes = useMemo(
    () => types.filter((type) => ASSET_TYPES.includes(type)),
    [types],
  );

  const tabTransactions = useMemo(
    () => {
      if (activeMainTab === "Summary") return [];
      if (STANDALONE_TYPES.includes(activeMainTab)) {
        return transactions.filter((transaction) => transactionCategory(transaction) === activeMainTab);
      }
      const groupTypes = activeMainTab === "Assets" ? assetTypes : creditTypes;
      const allLabel = activeMainTab === "Assets" ? "All Assets" : "All Credits";
      return activeChildTab === allLabel
        ? transactions.filter((transaction) => groupTypes.includes(transactionCategory(transaction)))
        : transactions.filter((transaction) => transactionCategory(transaction) === activeChildTab);
    },
    [activeChildTab, activeMainTab, assetTypes, creditTypes, transactions],
  );

  const totals = useMemo(() => transactions.reduce(
    (result, transaction) => {
      if (isCompleted(transaction.status) && transaction.direction === "incoming") {
        result.incoming += transaction.amountCredits;
      }
      if (isCompleted(transaction.status) && transaction.direction === "outgoing") {
        result.outgoing += transaction.amountCredits;
      }
      if (transaction.type === "Escrow Hold" && !isCompleted(transaction.status)) {
        result.held += transaction.amountCredits;
      }
      return result;
    },
    { incoming: 0, outgoing: 0, held: 0 },
  ), [transactions]);

  const typeTotals = useMemo(() => types.map((type) => {
    const matching = transactions.filter((transaction) => transactionCategory(transaction) === type);
    return {
      type,
      count: matching.length,
      credits: matching.reduce((sum, transaction) => sum + transaction.amountCredits, 0),
    };
  }), [transactions, types]);

  const totalPages = Math.max(1, Math.ceil(tabTransactions.length / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visibleTransactions = tabTransactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeChildTab, activeMainTab, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedTransaction) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTransaction(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTransaction]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-white">
      <UserHeader pageTitle="Transaction History" />

      <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Account ledger</span>
            </div>
            <h1 className="text-2xl font-bold">Credit transaction history</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-zinc-400">
              Review purchases, transfers, held credits, releases, refunds, and fees in one ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/credits")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
            Purchase credits
          </button>
        </div>

        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/60 shadow-sm dark:shadow-none shadow-2xl">
          <div className="border-b border-gray-200 dark:border-white/10 p-3" role="tablist" aria-label="Transaction views">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
              {(["Summary", "Credits", "Assets", "Fund Transfer", "Fee"] as MainTab[]).map((tab) => {
                const isActive = activeMainTab === tab;
                const count = tab === "Summary" ? null : transactions.filter((transaction) => {
                  const category = transactionCategory(transaction);
                  if (tab === "Assets") return ASSET_TYPES.includes(category);
                  if (tab === "Credits") return !ASSET_TYPES.includes(category) && !STANDALONE_TYPES.includes(category);
                  return category === tab;
                }).length;
                const TabIcon = tab === "Summary" ? LayoutDashboard : tab === "Assets" ? ShoppingBag : CircleDollarSign;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveMainTab(tab);
                      if (tab === "Credits") setActiveChildTab("All Credits");
                      if (tab === "Assets") setActiveChildTab("All Assets");
                    }}
                    className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-transparent text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:bg-white/[0.03] hover:text-gray-700 dark:text-zinc-200"}`}
                  >
                    <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab}
                    {count !== null && <span className="rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-500">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {(activeMainTab === "Credits" || activeMainTab === "Assets") && (
            <div className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.015] p-3" role="tablist" aria-label={`${activeMainTab} transaction types`}>
              <div className="flex flex-wrap gap-1.5">
                {[
                  activeMainTab === "Assets" ? "All Assets" : "All Credits",
                  ...(activeMainTab === "Assets" ? assetTypes : creditTypes),
                ].map((tab) => {
                  const isActive = activeChildTab === tab;
                  const count = tab.startsWith("All ")
                    ? transactions.filter((transaction) => (
                      activeMainTab === "Assets"
                        ? ASSET_TYPES.includes(transactionCategory(transaction))
                        : !ASSET_TYPES.includes(transactionCategory(transaction)) && !STANDALONE_TYPES.includes(transactionCategory(transaction))
                    )).length
                    : transactions.filter((transaction) => transactionCategory(transaction) === tab).length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveChildTab(tab)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-gray-100 dark:border-white/5 text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:bg-white/[0.03] hover:text-gray-700 dark:text-zinc-200"}`}
                    >
                      <List className="h-3.5 w-3.5" aria-hidden="true" />
                      {tab.startsWith("All ") ? tab : displayType(tab)}
                      <span className="rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-500">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-gray-500 dark:text-zinc-400" role="status">
              <LoaderCircle className="h-7 w-7 animate-spin text-blue-400" aria-hidden="true" />
              <p className="text-sm">Loading your credit ledger…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-5 text-center" role="alert">
              <p className="text-sm text-rose-200">{error}</p>
              <button type="button" onClick={() => void loadTransactions()} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && activeMainTab === "Summary" && (
            <div className="space-y-6 p-5 md:p-6">
              <section aria-label="Credit summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard label="Settled incoming" value={totals.incoming} detail="Completed incoming transactions" color="text-emerald-300" />
                <SummaryCard label="Settled outgoing" value={totals.outgoing} detail="Completed outgoing transactions" color="text-rose-300" />
                <SummaryCard label="Credits on hold" value={totals.held} detail="Credits currently waiting for release or refund" color="text-amber-200" />
              </section>

              <section aria-labelledby="activity-breakdown-title" className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.015]">
                <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4">
                  <h2 id="activity-breakdown-title" className="font-semibold text-gray-900 dark:text-zinc-100">Activity by transaction type</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">All-time transaction volume in your account ledger.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                  {typeTotals.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setActiveMainTab(
                          STANDALONE_TYPES.includes(item.type)
                            ? item.type as MainTab
                            : ASSET_TYPES.includes(item.type) ? "Assets" : "Credits",
                        );
                        setActiveChildTab(item.type);
                      }}
                      className="border-b border-gray-100 dark:border-white/5 p-4 text-left transition hover:bg-gray-50 dark:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:border-r"
                    >
                      <span className="text-xs font-semibold text-gray-600 dark:text-zinc-300">{displayType(item.type)}</span>
                      <span className="mt-3 flex items-end justify-between gap-3">
                        <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{credits(item.credits)}</span>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-600">{item.count} entries</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!loading && !error && activeMainTab !== "Summary" && tabTransactions.length === 0 && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center">
              <CircleDollarSign className="h-9 w-9 text-zinc-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-700 dark:text-zinc-200">No transactions found</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">There are no entries in this transaction tab yet.</p>
              </div>
            </div>
          )}

          {!loading && !error && activeMainTab !== "Summary" && tabTransactions.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-500">
                      <th className="px-5 py-3.5">Date & time</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Direction</th>
                      <th className="px-5 py-3.5 text-right">Credits</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visibleTransactions.map((transaction) => {
                      const meta = directionMeta[transaction.direction];
                      const DirectionIcon = meta.icon;
                      const createdAt = new Date(transaction.createdAt);
                      const validDate = Number.isFinite(createdAt.getTime());
                      return (
                        <tr
                          key={transaction.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${displayType(transactionCategory(transaction))} transaction`}
                          onClick={() => setSelectedTransaction(transaction)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTransaction(transaction);
                            }
                          }}
                          className="cursor-pointer transition hover:bg-gray-100 dark:hover:bg-white/[0.04] focus-visible:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-zinc-400">
                            {validDate ? createdAt.toLocaleString() : "—"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-900 dark:text-zinc-100">{displayType(transactionCategory(transaction))}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}>
                              <DirectionIcon className="h-4 w-4" aria-hidden="true" /> {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right"><CreditAmount transaction={transaction} /></td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(transaction.status)}`}>
                              {formatStatus(transaction.status)}
                            </span>
                          </td>
                          <td className="max-w-52 px-5 py-4 text-xs text-gray-500 dark:text-zinc-400">
                            {transaction.referenceTable || transaction.referenceId ? (
                              <div title={transaction.referenceId || undefined}>
                                <p className="capitalize text-gray-600 dark:text-zinc-300">{transaction.referenceTable?.replace(/_/g, " ") || "Reference"}</p>
                                <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{transaction.referenceId ? shortId(transaction.referenceId) : "—"}</p>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-gray-500 dark:text-zinc-500" title={transaction.id}>{shortId(transaction.id)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 dark:border-white/10 p-4 text-xs text-gray-500 dark:text-zinc-400 sm:flex-row">
                <label className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value) as RowLimit)} className="rounded-lg border border-gray-200 dark:border-white/10 bg-[#151722] px-2 py-1.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                  </select>
                </label>
                <div className="flex items-center gap-4">
                  <span>{tabTransactions.length} result{tabTransactions.length === 1 ? "" : "s"} · Page {page} of {totalPages}</span>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30">
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30">
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTransaction(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/95 p-5 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Transaction details</p>
                <h2 id="transaction-detail-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{displayType(transactionCategory(selectedTransaction))}</h2>
              </div>
              <button
                type="button"
                aria-label="Close transaction details"
                onClick={() => setSelectedTransaction(null)}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-2 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.025] p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Credit amount</p>
                  <div className="mt-2 text-xl"><CreditAmount transaction={selectedTransaction} /></div>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${statusClasses(selectedTransaction.status)}`}>
                  {formatStatus(selectedTransaction.status)}
                </span>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Direction" value={directionMeta[selectedTransaction.direction].label} />
                <DetailItem label="Date and time" value={Number.isFinite(new Date(selectedTransaction.createdAt).getTime()) ? new Date(selectedTransaction.createdAt).toLocaleString() : "—"} />
                <DetailItem label="Transaction ID" value={selectedTransaction.id} mono />
                <DetailItem label="Transaction type" value={displayType(transactionCategory(selectedTransaction))} />
                <DetailItem label="Source wallet ID" value={selectedTransaction.sourceWalletId} mono />
                <DetailItem label="Destination wallet ID" value={selectedTransaction.destinationWalletId} mono />
                <DetailItem label="Fee transaction ID" value={selectedTransaction.feeTransactionId || "—"} mono />
                <DetailItem label="Reference table" value={selectedTransaction.referenceTable?.replace(/_/g, " ") || "—"} />
                <div className="sm:col-span-2">
                  <DetailItem label="Reference ID" value={selectedTransaction.referenceId || "—"} mono />
                </div>
              </dl>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryMain;
