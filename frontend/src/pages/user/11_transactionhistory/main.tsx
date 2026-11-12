import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { CreditIcon } from "@/components/ui/credit-icon";

const TRANSACTION_CATEGORIES = [
  "Credit Purchase",
  "Fund Transfer",
  "Escrow Hold",
  "Escrow Release",
  "Escrow Refund",
  "Asset Purchase",
  "Asset Refund",
  "Cashout",
  "Cashout Refund",
  "Fee",
] as const;

const TYPE_DISPLAY_LABELS: Record<string, string> = {
  "Credit Purchase": "Credit Top-Up",
  "Fund Transfer": "Fund Transfer",
  "Escrow Hold": "Credits On Hold",
  "Escrow Release": "Credits Released",
  "Escrow Refund": "Credits Refunded",
  "Asset Purchase": "Asset Purchase",
  "Asset Refund": "Asset Refund",
  Cashout: "Cashout Payout",
  "Cashout Refund": "Cashout Refund",
  Fee: "Platform Fee",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Credit Purchase": "Credits bought from the Credit Shop and added to your Account Wallet.",
  "Fund Transfer": "Direct credit transfers between users, Team wallets, task payouts, or contract escrow.",
  "Escrow Hold": "Credits reserved in Escrow to protect an active contract or dispute.",
  "Escrow Release": "Protected escrow credits released into an Account Wallet upon milestone or contract completion.",
  "Escrow Refund": "Held escrow credits returned back to the Client's Account Wallet after a cancelled or refunded contract.",
  "Asset Purchase": "Buying a digital asset (outgoing) or earning proceeds from an asset sale (incoming) on the Marketplace.",
  "Asset Refund": "Credits returned when a Marketplace asset purchase is refunded.",
  Cashout: "Credits withdrawn from your Account Wallet to an external payout method.",
  "Cashout Refund": "Credits restored to your Account Wallet when a cashout fails or is reversed.",
  Fee: "Platform commission on milestone payouts or asset sales, or listing/posting fees.",
};

const REFERENCE_TABLE_LABELS: Record<string, string> = {
  payments: "Credit Top-Up Checkout",
  contracts: "Work Contract",
  contract_milestones: "Contract Milestone",
  market_assets: "Marketplace Asset",
  teams: "Team Wallet",
  team_contract_workspaces: "Team Workspace Task",
  cashouts: "Cashout Request",
  accounts: "Direct Account Transfer",
  disputes: "Dispute Case",
  jobs: "Job Posting / Proposal",
  gigs: "Gig Service Listing",
};

type Direction = "incoming" | "outgoing" | "internal";
type DirectionFilter = "all" | Direction;
type RowLimit = 10 | 25 | 50;
type MainTab = "All" | "Credits" | "Assets" | "Transfers" | "Fee" | "Summary";

const CREDITS_ESCROW_TYPES = ["Credit Purchase", "Escrow Hold", "Escrow Release", "Escrow Refund"];
const ASSET_TYPES = ["Asset Purchase", "Asset Refund"];
const TRANSFER_CASHOUT_TYPES = ["Fund Transfer", "Cashout", "Cashout Refund"];
const FEE_TYPES = ["Fee"];

const DIRECTION_COLORS = {
  incoming: {
    hex: "#10b981",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  outgoing: {
    hex: "#f43f5e",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    pill: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  internal: {
    hex: "#f59e0b",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    pill: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
} as const;

interface CreditTransaction {
  id: string;
  type: string;
  category?: string;
  title?: string;
  summary?: string;
  counterparty?: string;
  walletFlow?: string;
  amountCredits: number;
  status: string;
  createdAt: string;
  direction: Direction;
  sourceWalletId: string;
  destinationWalletId: string;
  sourceWalletType?: string;
  destinationWalletType?: string;
  feeTransactionId: string | null;
  referenceTable: string | null;
  referenceId: string | null;
  isCreditPurchase: boolean;
}

interface WalletSummary {
  availableCredits: number;
  escrowCredits: number;
  frozenCredits: number;
}

interface CreditTransactionsResponse {
  success: boolean;
  transactions: CreditTransaction[];
  walletSummary?: WalletSummary | null;
}

const directionMeta: Record<Direction, { label: string; sublabel: string }> = {
  incoming: { label: "Incoming", sublabel: "Added to wallet" },
  outgoing: { label: "Outgoing", sublabel: "Deducted from wallet" },
  internal: { label: "Internal", sublabel: "Escrow / between wallets" },
};

function credits(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function transactionCategory(transaction: CreditTransaction): string {
  if (transaction.category) return transaction.category;
  return transaction.isCreditPurchase ? "Credit Purchase" : transaction.type;
}

function displayType(type: string) {
  return TYPE_DISPLAY_LABELS[type] || type || "Unknown";
}

function formatReferenceTable(referenceTable: string | null) {
  if (!referenceTable) return "General Ledger";
  const key = referenceTable.trim().toLowerCase();
  return REFERENCE_TABLE_LABELS[key] || referenceTable.replace(/_/g, " ");
}

function fallbackTitle(transaction: CreditTransaction) {
  if (transaction.title) return transaction.title;
  const cat = transactionCategory(transaction);
  if (cat === "Asset Purchase" && transaction.direction === "incoming") return "Asset Sale Proceeds";
  return displayType(cat);
}

function fallbackSummary(transaction: CreditTransaction) {
  if (transaction.summary) return transaction.summary;
  const cat = transactionCategory(transaction);
  return CATEGORY_DESCRIPTIONS[cat] || "Recorded credit transaction in your account ledger.";
}

function fallbackWalletFlow(transaction: CreditTransaction) {
  if (transaction.walletFlow) return transaction.walletFlow;
  const src =
    transaction.sourceWalletType ||
    (transaction.sourceWalletId === "Platform" ? "Platform Wallet" : shortId(transaction.sourceWalletId));
  const dst =
    transaction.destinationWalletType ||
    (transaction.destinationWalletId === "Platform" ? "Platform Wallet" : shortId(transaction.destinationWalletId));
  return `${src} → ${dst}`;
}

function shortId(value: string) {
  return value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatStatus(value: string) {
  return value.trim().replace(/[_-]+/g, " ") || "Unknown";
}

function statusClasses(status: string) {
  const value = status.toLowerCase();
  if (value === "completed") {
    return "border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-zinc-200";
  }
  if (["failed", "cancelled", "canceled"].includes(value)) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300";
}

function isCompleted(status: string) {
  return status.toLowerCase() === "completed";
}

function CreditAmount({ transaction }: { transaction: CreditTransaction }) {
  const sign =
    transaction.direction === "incoming"
      ? "+"
      : transaction.direction === "outgoing"
        ? "−"
        : "↔ ";
  const color = DIRECTION_COLORS[transaction.direction].text;

  return (
    <span className={`font-bold tabular-nums ${color}`}>
      {sign}
      {credits(transaction.amountCredits)}
    </span>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "—") return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
          {label}
        </dt>
        {copyable && value && value !== "—" && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-200/60 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <dd
        className={`mt-1.5 break-all text-sm text-gray-800 dark:text-zinc-200 ${
          mono ? "font-mono text-xs" : "font-medium"
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function TransactionSummarySkeleton() {
  return (
    <>
      {/* 5 Metric Cards Skeleton */}
      <section
        aria-label="Loading wallet and income summary"
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12"
      >
        {/* Available Balance Hero Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-5 sm:col-span-2 lg:col-span-4">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          <div className="my-3 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-9 w-36 sm:w-44 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
          </div>
          <div className="h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
        </div>

        {/* 4 Supporting Metric Cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-4.5 lg:col-span-2"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="h-2.5 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-4 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="my-2.5 flex h-8 items-center">
              <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
          </div>
        ))}
      </section>

      {/* 2 Chart Skeletons */}
      <section
        aria-label="Loading transaction charts"
        className="mb-6 grid gap-4 lg:grid-cols-12"
      >
        {/* Donut Chart Skeleton */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/70 p-5 lg:col-span-5">
          <div className="space-y-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-2.5 w-48 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-full border-[10px] border-gray-200 dark:border-white/10 bg-transparent" />
            <div className="min-w-[180px] flex-1 space-y-3.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-3 w-14 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                  <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Bar Chart Skeleton */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/70 p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3 w-36 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-2.5 w-44 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 items-end gap-2 pt-2" style={{ height: 148 }}>
            {[45, 80, 60, 95, 70, 50, 85].map((h, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full">
                <div
                  className="flex w-full items-end justify-center gap-1 border-b border-gray-200 dark:border-white/10 pb-1"
                  style={{ height: 115 }}
                >
                  <div
                    className="w-2.5 sm:w-3 animate-pulse rounded-t bg-gray-200 dark:bg-white/10"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="w-2.5 sm:w-3 animate-pulse rounded-t bg-gray-100 dark:bg-white/5"
                    style={{ height: `${h * 0.55}%` }}
                  />
                </div>
                <div className="h-2.5 w-6 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function TransactionTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            <th className="px-5 py-3.5">Date</th>
            <th className="px-5 py-3.5">Transaction</th>
            <th className="px-5 py-3.5">Type</th>
            <th className="px-5 py-3.5">Direction</th>
            <th className="px-5 py-3.5">Counterparty / Wallet</th>
            <th className="px-5 py-3.5 text-right">Credits</th>
            <th className="px-5 py-3.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              {/* Date */}
              <td className="whitespace-nowrap px-5 py-4">
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-2.5 w-14 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </td>
              {/* Transaction Title & Description */}
              <td className="px-5 py-4">
                <div className="space-y-1.5 max-w-sm">
                  <div className="h-3.5 w-44 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-2.5 w-64 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </td>
              {/* Type */}
              <td className="whitespace-nowrap px-5 py-4">
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
              </td>
              {/* Direction */}
              <td className="whitespace-nowrap px-5 py-4">
                <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-white/10" />
              </td>
              {/* Counterparty / Wallet Flow */}
              <td className="px-5 py-4">
                <div className="h-3 w-32 rounded bg-gray-100 dark:bg-white/5" />
              </td>
              {/* Credits */}
              <td className="whitespace-nowrap px-5 py-4 text-right">
                <div className="ml-auto h-4 w-16 rounded bg-gray-200 dark:bg-white/10" />
              </td>
              {/* Status */}
              <td className="whitespace-nowrap px-5 py-4 text-right">
                <div className="ml-auto h-5 w-20 rounded-md bg-gray-100 dark:bg-white/5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Footer Skeleton */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 dark:border-white/10 p-4 sm:flex-row">
        <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

export const TransactionHistoryMain = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("All");
  const [activeChildTab, setActiveChildTab] = useState<string>("All");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<RowLimit>(10);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<CreditTransactionsResponse>("/api/transactions/credits");
      setTransactions(Array.isArray(response.data.transactions) ? response.data.transactions : []);
      setWalletSummary(response.data.walletSummary || null);
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
    const unknown = [...found].filter(
      (type) => !TRANSACTION_CATEGORIES.includes(type as (typeof TRANSACTION_CATEGORIES)[number])
    );
    return [...TRANSACTION_CATEGORIES, ...unknown.sort((a, b) => a.localeCompare(b))];
  }, [transactions]);

  const childCategoriesForMainTab = useMemo(() => {
    if (activeMainTab === "Credits") return CREDITS_ESCROW_TYPES;
    if (activeMainTab === "Assets") return ASSET_TYPES;
    if (activeMainTab === "Transfers") return TRANSFER_CASHOUT_TYPES;
    if (activeMainTab === "Fee") return FEE_TYPES;
    if (activeMainTab === "All") return types;
    return [];
  }, [activeMainTab, types]);

  const tabTransactions = useMemo(() => {
    if (activeMainTab === "Summary") return [];

    const q = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const category = transactionCategory(transaction);

      if (activeMainTab === "Credits" && !CREDITS_ESCROW_TYPES.includes(category)) return false;
      if (activeMainTab === "Assets" && !ASSET_TYPES.includes(category)) return false;
      if (activeMainTab === "Transfers" && !TRANSFER_CASHOUT_TYPES.includes(category)) return false;
      if (activeMainTab === "Fee" && !FEE_TYPES.includes(category)) return false;

      if (activeChildTab !== "All" && category !== activeChildTab) return false;
      if (directionFilter !== "all" && transaction.direction !== directionFilter) return false;

      if (q) {
        const haystack = [
          transaction.id,
          category,
          displayType(category),
          fallbackTitle(transaction),
          fallbackSummary(transaction),
          transaction.counterparty || "",
          fallbackWalletFlow(transaction),
          formatReferenceTable(transaction.referenceTable),
          transaction.referenceId || "",
          transaction.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [activeChildTab, activeMainTab, directionFilter, searchQuery, transactions]);

  const totals = useMemo(() => {
    const acc = {
      incoming: 0,
      outgoing: 0,
      internal: 0,
      earnedIncome: 0,
      topUps: 0,
      escrowHoldLedgerNet: 0,
    };

    for (const tx of transactions) {
      if (!isCompleted(tx.status)) continue;
      const cat = transactionCategory(tx);

      if (tx.direction === "incoming") {
        acc.incoming += tx.amountCredits;
        if (cat === "Credit Purchase") {
          acc.topUps += tx.amountCredits;
        } else {
          acc.earnedIncome += tx.amountCredits;
        }
      } else if (tx.direction === "outgoing") {
        acc.outgoing += tx.amountCredits;
      } else if (tx.direction === "internal") {
        acc.internal += tx.amountCredits;
      }

      if (cat === "Escrow Hold") {
        acc.escrowHoldLedgerNet += tx.amountCredits;
      } else if (cat === "Escrow Release" || cat === "Escrow Refund") {
        acc.escrowHoldLedgerNet = Math.max(0, acc.escrowHoldLedgerNet - tx.amountCredits);
      }
    }

    const authoritativeHeld = walletSummary
      ? walletSummary.escrowCredits + walletSummary.frozenCredits
      : acc.escrowHoldLedgerNet;

    const authoritativeAvailable = walletSummary
      ? walletSummary.availableCredits
      : Math.max(0, acc.incoming - acc.outgoing);

    const netIncome = acc.incoming - acc.outgoing;

    return {
      ...acc,
      held: authoritativeHeld,
      available: authoritativeAvailable,
      grossIncome: acc.incoming,
      netIncome,
    };
  }, [transactions, walletSummary]);

  const typeTotals = useMemo(
    () =>
      types.map((type) => {
        const matching = transactions.filter((transaction) => transactionCategory(transaction) === type);
        return {
          type,
          count: matching.length,
          credits: matching.reduce((sum, transaction) => sum + transaction.amountCredits, 0),
        };
      }),
    [transactions, types]
  );

  // Timeline chart buckets (last 7 active dates or recent days)
  const timelineBuckets = useMemo(() => {
    const map = new Map<
      string,
      { label: string; sortKey: string; incoming: number; outgoing: number; internal: number }
    >();

    for (const tx of transactions) {
      if (!isCompleted(tx.status)) continue;
      const d = new Date(tx.createdAt);
      if (!Number.isFinite(d.getTime())) continue;
      const sortKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const entry = map.get(sortKey) || { label, sortKey, incoming: 0, outgoing: 0, internal: 0 };
      entry[tx.direction] += tx.amountCredits;
      map.set(sortKey, entry);
    }

    const sorted = [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-7);
    return sorted;
  }, [transactions]);

  const totalPages = Math.max(1, Math.ceil(tabTransactions.length / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visibleTransactions = tabTransactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeChildTab, activeMainTab, directionFilter, searchQuery, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedTransaction && !showGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedTransaction) setSelectedTransaction(null);
        else if (showGuide) setShowGuide(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTransaction, showGuide]);

  const jumpToCategory = (category: string) => {
    if (CREDITS_ESCROW_TYPES.includes(category)) {
      setActiveMainTab("Credits");
    } else if (ASSET_TYPES.includes(category)) {
      setActiveMainTab("Assets");
    } else if (TRANSFER_CASHOUT_TYPES.includes(category)) {
      setActiveMainTab("Transfers");
    } else if (FEE_TYPES.includes(category)) {
      setActiveMainTab("Fee");
    } else {
      setActiveMainTab("All");
    }
    setActiveChildTab(category);
  };

  // Donut segments for Incoming vs Outgoing vs Internal
  const flowSegments = useMemo(() => {
    const segments = [
      { label: "Incoming", value: totals.incoming, color: DIRECTION_COLORS.incoming.hex, key: "incoming" as const },
      { label: "Outgoing", value: totals.outgoing, color: DIRECTION_COLORS.outgoing.hex, key: "outgoing" as const },
      {
        label: "Internal / Hold",
        value: Math.max(totals.internal, totals.held),
        color: DIRECTION_COLORS.internal.hex,
        key: "internal" as const,
      },
    ];
    const sum = segments.reduce((s, item) => s + item.value, 0);
    return { segments, sum };
  }, [totals]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white">
      <UserHeader pageTitle="Transaction History" />

      <main className="mx-auto w-full max-w-7xl p-5 md:p-8" data-tour="transactions-table">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
              Account Ledger
            </p>
            <h1 className="mt-1 text-2xl font-bold">Transactions</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-zinc-400">
              View your credit purchases, escrow holds, milestone releases, transfers, cashouts, and fees.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/5"
            >
              How Transactions Work
            </button>
            <button
              type="button"
              onClick={() => navigate("/credits")}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-gray-900 transition hover:opacity-90"
            >
              Purchase Credits
            </button>
          </div>
        </div>

        {/* Top Summary Strip: Hero Available Balance (with Lottie CreditIcon) + Gross, Outgoing, Net, On Hold */}
        {loading && <TransactionSummarySkeleton />}
        {!loading && !error && (
          <>
            <section
              aria-label="Wallet and income summary"
              className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12"
            >
              {/* Hero Available Balance Card (only card with Lottie CreditIcon, bigger display) */}
              <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-5 sm:col-span-2 lg:col-span-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Available Balance
                </p>
                <div className="my-2 flex items-center gap-3">
                  <CreditIcon className="h-9 w-9 sm:h-10 sm:w-10" />
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-white">
                    {credits(totals.available)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Spendable & withdrawable credits in your Account Wallet
                </p>
              </div>

              {/* Gross Income (Incoming) */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-4.5 transition-all hover:border-emerald-500/30 lg:col-span-2">
                <div className="flex h-5 items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Gross Income
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    In
                  </span>
                </div>
                <div className="my-2 flex h-8 items-center">
                  <p className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{credits(totals.grossIncome)}
                  </p>
                </div>
                <div className="flex h-7 items-start">
                  <p className="text-[11px] leading-snug text-gray-500 dark:text-zinc-500 line-clamp-2">
                    Total incoming credits
                  </p>
                </div>
              </div>

              {/* Total Outgoing */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-4.5 transition-all hover:border-rose-500/30 lg:col-span-2">
                <div className="flex h-5 items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Total Outgoing
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-600 dark:text-rose-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Out
                  </span>
                </div>
                <div className="my-2 flex h-8 items-center">
                  <p className="text-2xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                    −{credits(totals.outgoing)}
                  </p>
                </div>
                <div className="flex h-7 items-start">
                  <p className="text-[11px] leading-snug text-gray-500 dark:text-zinc-500 line-clamp-2">
                    Purchases, cashouts & fees
                  </p>
                </div>
              </div>

              {/* Net Income */}
              <div className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-4.5 transition-all lg:col-span-2 ${
                totals.netIncome >= 0 ? "hover:border-emerald-500/30" : "hover:border-rose-500/30"
              }`}>
                <div className="flex h-5 items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Net Income
                  </span>
                  <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold ${
                    totals.netIncome >= 0
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}>
                    {totals.netIncome >= 0 ? "Surplus" : "Deficit"}
                  </span>
                </div>
                <div className="my-2 flex h-8 items-center">
                  <p
                    className={`text-2xl font-extrabold tabular-nums ${
                      totals.netIncome >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {totals.netIncome > 0 ? "+" : totals.netIncome < 0 ? "−" : ""}
                    {credits(Math.abs(totals.netIncome))}
                  </p>
                </div>
                <div className="flex h-7 items-start">
                  <p className="text-[11px] leading-snug text-gray-500 dark:text-zinc-500 line-clamp-2">
                    Incoming minus outgoing
                  </p>
                </div>
              </div>

              {/* Credits On Hold (Internal / Escrow) */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-4.5 transition-all hover:border-amber-500/30 lg:col-span-2">
                <div className="flex h-5 items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Credits On Hold
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Escrow
                  </span>
                </div>
                <div className="my-2 flex h-8 items-center">
                  <p className="text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                    {credits(totals.held)}
                  </p>
                </div>
                <div className="flex h-7 items-start">
                  <p className="text-[11px] leading-snug text-gray-500 dark:text-zinc-500 line-clamp-2">
                    Reserved in Escrow
                  </p>
                </div>
              </div>
            </section>

            {/* Charts Section: Flow Distribution Donut + Activity Bar Chart */}
            <section
              aria-label="Transaction charts"
              className="mb-6 grid gap-4 lg:grid-cols-12"
            >
              {/* Chart 1: Credit Flow Breakdown (Incoming vs Outgoing vs Internal) */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/70 p-5 lg:col-span-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
                      Credit Flow Mix
                    </h2>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-500">
                      Incoming vs. Outgoing vs. Internal Escrow
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-6">
                  {/* SVG Donut */}
                  {(() => {
                    const r = 38;
                    const c = 2 * Math.PI * r;
                    let offset = 0;
                    const total = flowSegments.sum || 1;
                    return (
                      <svg width={128} height={128} viewBox="0 0 100 100" className="shrink-0">
                        <circle
                          cx="50"
                          cy="50"
                          r={r}
                          fill="none"
                          className="stroke-gray-100 dark:stroke-white/[0.06]"
                          strokeWidth="12"
                        />
                        {flowSegments.sum > 0 &&
                          flowSegments.segments
                            .filter((s) => s.value > 0)
                            .map((seg) => {
                              const pct = seg.value / total;
                              const dash = pct * c;
                              const circle = (
                                <circle
                                  key={seg.label}
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth="12"
                                  strokeDasharray={`${dash} ${c - dash}`}
                                  strokeDashoffset={-offset}
                                  transform="rotate(-90 50 50)"
                                />
                              );
                              offset += dash;
                              return circle;
                            })}
                        <text
                          x="50"
                          y="47"
                          textAnchor="middle"
                          className="fill-gray-900 dark:fill-white text-[11px] font-bold"
                        >
                          {credits(flowSegments.sum)}
                        </text>
                        <text
                          x="50"
                          y="58"
                          textAnchor="middle"
                          className="fill-gray-400 dark:fill-zinc-500 text-[6.5px] uppercase"
                        >
                          volume
                        </text>
                      </svg>
                    );
                  })()}

                  {/* Legend & Proportional Bars */}
                  <div className="min-w-[180px] flex-1 space-y-3">
                    {flowSegments.segments.map((seg) => {
                      const pct =
                        flowSegments.sum > 0 ? Math.round((seg.value / flowSegments.sum) * 100) : 0;
                      return (
                        <div key={seg.label}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-zinc-300">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: seg.color }}
                              />
                              {seg.label}
                            </span>
                            <span className="font-bold tabular-nums text-gray-900 dark:text-white">
                              {credits(seg.value)}{" "}
                              <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500">
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: seg.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 2: Activity Timeline Bar Chart (Incoming, Outgoing, Internal colored bars) */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/70 p-5 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
                      Credit Activity Chart
                    </h2>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-500">
                      Daily credit movements by direction
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Incoming
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Outgoing
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Internal
                    </span>
                  </div>
                </div>

                {timelineBuckets.length === 0 ? (
                  <div className="mt-6 flex h-32 items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
                    No completed transaction activity to chart yet.
                  </div>
                ) : (
                  <div className="mt-4">
                    {(() => {
                      const maxVal = Math.max(
                        ...timelineBuckets.flatMap((b) => [b.incoming, b.outgoing, b.internal]),
                        1
                      );
                      const chartH = 115;
                      return (
                        <div className="grid grid-cols-7 items-end gap-2 pt-2" style={{ height: 148 }}>
                          {timelineBuckets.map((bucket) => {
                            const incH = Math.max(
                              Math.round((bucket.incoming / maxVal) * chartH),
                              bucket.incoming > 0 ? 6 : 2
                            );
                            const outH = Math.max(
                              Math.round((bucket.outgoing / maxVal) * chartH),
                              bucket.outgoing > 0 ? 6 : 2
                            );
                            const intH = Math.max(
                              Math.round((bucket.internal / maxVal) * chartH),
                              bucket.internal > 0 ? 6 : 2
                            );

                            return (
                              <div
                                key={bucket.sortKey}
                                className="flex flex-col items-center justify-end gap-1.5"
                                title={`${bucket.label} — Incoming: +${credits(bucket.incoming)} | Outgoing: -${credits(
                                  bucket.outgoing
                                )} | Internal: ${credits(bucket.internal)}`}
                              >
                                <div
                                  className="flex w-full items-end justify-center gap-1 border-b border-gray-200 dark:border-white/10 pb-1"
                                  style={{ height: chartH }}
                                >
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t bg-emerald-500 transition-all"
                                    style={{
                                      height: incH,
                                      opacity: bucket.incoming > 0 ? 1 : 0.18,
                                    }}
                                  />
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t bg-rose-500 transition-all"
                                    style={{
                                      height: outH,
                                      opacity: bucket.outgoing > 0 ? 1 : 0.18,
                                    }}
                                  />
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t bg-amber-500 transition-all"
                                    style={{
                                      height: intH,
                                      opacity: bucket.internal > 0 ? 1 : 0.18,
                                    }}
                                  />
                                </div>
                                <span className="truncate text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                                  {bucket.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Main Ledger Card */}
        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/60 shadow-sm">
          {/* Primary Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-white/10 px-4 pt-3" role="tablist" aria-label="Transaction views">
            <div className="flex flex-wrap gap-2 pb-3">
              {(
                [
                  { id: "All", label: "All Transactions" },
                  { id: "Credits", label: "Credits & Escrow" },
                  { id: "Assets", label: "Assets" },
                  { id: "Transfers", label: "Transfers & Cashouts" },
                  { id: "Fee", label: "Fees" },
                  { id: "Summary", label: "Breakdown" },
                ] as { id: MainTab; label: string }[]
              ).map(({ id: tab, label }) => {
                const isActive = activeMainTab === tab;
                const count =
                  tab === "Summary"
                    ? null
                    : tab === "All"
                      ? transactions.length
                      : transactions.filter((transaction) => {
                          const category = transactionCategory(transaction);
                          if (tab === "Credits") return CREDITS_ESCROW_TYPES.includes(category);
                          if (tab === "Assets") return ASSET_TYPES.includes(category);
                          if (tab === "Transfers") return TRANSFER_CASHOUT_TYPES.includes(category);
                          if (tab === "Fee") return FEE_TYPES.includes(category);
                          return false;
                        }).length;

                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveMainTab(tab);
                      setActiveChildTab("All");
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{label}</span>
                    {count !== null && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isActive
                            ? "bg-white/20 text-white dark:bg-black/15 dark:text-gray-900"
                            : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Colored Direction Pills & Sub-Category Filters */}
          {activeMainTab !== "Summary" && (
            <div className="space-y-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transactions, @handle, or ID..."
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base py-2 pl-10 pr-9 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:border-gray-400 dark:focus:border-white/30 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Colored Direction Filter Pills (Incoming = Emerald, Outgoing = Rose, Internal = Amber) */}
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by direction">
                  <button
                    type="button"
                    onClick={() => setDirectionFilter("all")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      directionFilter === "all"
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter("incoming")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      directionFilter === "incoming"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        directionFilter === "incoming" ? "bg-white" : "bg-emerald-500"
                      }`}
                    />
                    Incoming
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter("outgoing")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      directionFilter === "outgoing"
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        directionFilter === "outgoing" ? "bg-white" : "bg-rose-500"
                      }`}
                    />
                    Outgoing
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter("internal")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      directionFilter === "internal"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        directionFilter === "internal" ? "bg-white" : "bg-amber-500"
                      }`}
                    />
                    Internal
                  </button>
                </div>
              </div>

              {/* Sub-category filter pills */}
              {childCategoriesForMainTab.length > 1 && (
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by transaction category">
                  {["All", ...childCategoriesForMainTab].map((subTab) => {
                    const isActive = activeChildTab === subTab;
                    const count =
                      subTab === "All"
                        ? transactions.filter((t) => childCategoriesForMainTab.includes(transactionCategory(t))).length
                        : transactions.filter((t) => transactionCategory(t) === subTab).length;

                    return (
                      <button
                        key={subTab}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveChildTab(subTab)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          isActive
                            ? "border-gray-400 dark:border-white/30 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                            : "border-transparent text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-800 dark:hover:text-zinc-200"
                        }`}
                      >
                        <span>{subTab === "All" ? "All Types" : displayType(subTab)}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {loading && <TransactionTableSkeleton />}

          {!loading && error && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-5 text-center" role="alert">
              <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => void loadTransactions()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
              </button>
            </div>
          )}

          {/* Category Breakdown View */}
          {!loading && !error && activeMainTab === "Summary" && (
            <div className="p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {typeTotals.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => jumpToCategory(item.type)}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-4 text-left transition hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100/60 dark:hover:bg-white/[0.04]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {displayType(item.type)}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400 line-clamp-2">
                        {CATEGORY_DESCRIPTIONS[item.type] || "Recorded ledger activity."}
                      </p>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-gray-200/60 dark:border-white/5 pt-3">
                      <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                        {credits(item.credits)}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-500">
                        {item.count} {item.count === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && activeMainTab !== "Summary" && tabTransactions.length === 0 && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-2 px-5 text-center">
              <p className="font-semibold text-gray-700 dark:text-zinc-200">No transactions found</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {searchQuery || directionFilter !== "all" || activeChildTab !== "All"
                  ? "Try clearing your search or filters."
                  : "There are no entries in this view yet."}
              </p>
              {(searchQuery || directionFilter !== "all" || activeChildTab !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setDirectionFilter("all");
                    setActiveChildTab("All");
                  }}
                  className="mt-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {/* Clean Transaction Table with Colored Direction & Credits */}
          {!loading && !error && activeMainTab !== "Summary" && tabTransactions.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Transaction</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Direction</th>
                      <th className="px-5 py-3.5">Counterparty / Wallet</th>
                      <th className="px-5 py-3.5 text-right">Credits</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {visibleTransactions.map((transaction) => {
                      const category = transactionCategory(transaction);
                      const dirColors = DIRECTION_COLORS[transaction.direction];
                      const createdAt = new Date(transaction.createdAt);
                      const validDate = Number.isFinite(createdAt.getTime());

                      return (
                        <tr
                          key={transaction.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${fallbackTitle(transaction)}`}
                          onClick={() => setSelectedTransaction(transaction)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTransaction(transaction);
                            }
                          }}
                          className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400"
                        >
                          {/* Date & Time */}
                          <td className="whitespace-nowrap px-5 py-4 text-xs">
                            {validDate ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 dark:text-zinc-200">
                                  {createdAt.toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                  {createdAt.toLocaleTimeString(undefined, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-zinc-500">—</span>
                            )}
                          </td>

                          {/* Transaction Title & Short Explanation */}
                          <td className="max-w-md px-5 py-4">
                            <p className="font-semibold text-gray-900 dark:text-zinc-100">
                              {fallbackTitle(transaction)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400 line-clamp-1">
                              {fallbackSummary(transaction)}
                            </p>
                          </td>

                          {/* Type */}
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-600 dark:text-zinc-300">
                            {displayType(category)}
                          </td>

                          {/* Colored Direction Badge */}
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${dirColors.pill}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${dirColors.dot}`} />
                              {directionMeta[transaction.direction].label}
                            </span>
                          </td>

                          {/* Counterparty / Flow */}
                          <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-300">
                            {transaction.counterparty || fallbackWalletFlow(transaction)}
                          </td>

                          {/* Credits */}
                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                            <CreditAmount transaction={transaction} />
                          </td>

                          {/* Status */}
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                                transaction.status
                              )}`}
                            >
                              {formatStatus(transaction.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 dark:border-white/10 p-4 text-xs text-gray-500 dark:text-zinc-400 sm:flex-row">
                <label className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(event) => setRowsPerPage(Number(event.target.value) as RowLimit)}
                    className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base px-2.5 py-1.5 text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <div className="flex items-center gap-4">
                  <span>
                    {tabTransactions.length} result{tabTransactions.length === 1 ? "" : "s"} · Page {page} of{" "}
                    {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={page === 1}
                      onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                      className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={page === totalPages}
                      onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                      className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Popup Modal: How Ensemble Credit Transactions Work */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowGuide(false);
            }}
          >
            <motion.section
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="transactions-guide-title"
              className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/95 p-5 backdrop-blur-md">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                    Reference Guide
                  </p>
                  <h2 id="transactions-guide-title" className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    How Ensemble Credit Transactions Work
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    Select any transaction type below to filter your ledger by that category.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close transaction guide"
                  onClick={() => setShowGuide(false)}
                  className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-2.5 p-5 sm:grid-cols-2">
                {TRANSACTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      jumpToCategory(cat);
                      setShowGuide(false);
                    }}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-3.5 text-left transition hover:border-gray-400 dark:hover:border-white/25 hover:bg-gray-100/70 dark:hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {displayType(cat)}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </p>
                    </div>
                    <span className="mt-3 text-[11px] font-semibold text-gray-700 dark:text-zinc-300 underline-offset-2 hover:underline">
                      View {displayType(cat)} →
                    </span>
                  </button>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Modal: Detailed Transaction Receipt */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedTransaction(null);
            }}
          >
            <motion.section
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-detail-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/95 p-5 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                  Transaction Details
                </p>
                <h2 id="transaction-detail-title" className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {fallbackTitle(selectedTransaction)}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {fallbackSummary(selectedTransaction)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close transaction details"
                onClick={() => setSelectedTransaction(null)}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Amount & Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Amount ({directionMeta[selectedTransaction.direction].label})
                  </p>
                  <div className="mt-1 text-2xl">
                    <CreditAmount transaction={selectedTransaction} />{" "}
                    <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">credits</span>
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                    selectedTransaction.status
                  )}`}
                >
                  {formatStatus(selectedTransaction.status)}
                </span>
              </div>

              {/* Metadata Grid */}
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Type"
                  value={displayType(transactionCategory(selectedTransaction))}
                />
                <DetailItem
                  label="Date & Time"
                  value={
                    Number.isFinite(new Date(selectedTransaction.createdAt).getTime())
                      ? new Date(selectedTransaction.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <DetailItem
                  label="Wallet Flow"
                  value={fallbackWalletFlow(selectedTransaction)}
                />
                <DetailItem
                  label="Context"
                  value={formatReferenceTable(selectedTransaction.referenceTable)}
                />
                <DetailItem
                  label="Source Wallet"
                  value={selectedTransaction.sourceWalletId}
                  mono
                  copyable
                />
                <DetailItem
                  label="Destination Wallet"
                  value={selectedTransaction.destinationWalletId}
                  mono
                  copyable
                />
                <DetailItem
                  label="Transaction ID"
                  value={selectedTransaction.id}
                  mono
                  copyable
                />
                <DetailItem
                  label="Fee Transaction ID"
                  value={selectedTransaction.feeTransactionId || "None"}
                  mono={Boolean(selectedTransaction.feeTransactionId)}
                  copyable={Boolean(selectedTransaction.feeTransactionId)}
                />
                {selectedTransaction.referenceId && (
                  <div className="sm:col-span-2">
                    <DetailItem
                      label="Reference ID"
                      value={selectedTransaction.referenceId}
                      mono
                      copyable
                    />
                  </div>
                )}
              </dl>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
};

export default TransactionHistoryMain;
