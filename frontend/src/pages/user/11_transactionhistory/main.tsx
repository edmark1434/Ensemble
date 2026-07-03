import React, { useState, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Tag,
  ShoppingBag,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Layers,
  Briefcase,
  Megaphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// --- STRUCTURAL TYPES ---
type TransactionType = "Summary" | "Credit Purchases" | "Sales & Earnings" | "Purchases" | "Pending Credits";
type EarningsSubTab = "All" | "From Assets" | "From Jobs" | "From Gigs";
type DateRangeType = "Past Day" | "Past 7 Days" | "Past 30 Days" | "Past Year";
type RowLimitType = 10 | 25 | 50;

// ========================================================
// 📊 SINGLE SOURCE OF TRUTH (CONNECTED LEDGER MATRIX)
// ========================================================

const sampleCreditPurchases = [
  { id: "TX-CP01", date: "2026-06-22", package: "Pro Studio Bundle", paymentMethod: "GCash", credits: 5000.00, amount: "₱5,000.00" },
  { id: "TX-CP02", date: "2026-06-15", package: "Starter Pack", paymentMethod: "Maya", credits: 1500.00, amount: "₱1,500.00" },
  { id: "TX-CP03", date: "2026-05-20", package: "Enterprise Tier Credits", paymentMethod: "Credit Card", credits: 20000.00, amount: "₱19,000.00" },
];

const samplePurchases = [
  { id: "TX-PR01", date: "2026-06-21", assetName: "3D Blender Studio Room Model", seller: "Nexus Design Studio", credits: 15600.00 },
  { id: "TX-PR02", date: "2026-06-10", assetName: "Lo-Fi Beats Extended Audio Asset", seller: "Alpha Developers Lab", credits: 4400.00 },
];

const samplePendingCredits = [
  { id: "TX-PC01", date: "2026-06-23", originType: "Job", source: "Escrow Contract - Wedding Video Milestone 1", project: "Wedding Video Edit", credits: 10000.00 },
  { id: "TX-PC02", date: "2026-06-18", originType: "Gig", source: "Asset Sale Escrow - Premium UI Kit Hold", project: "E-Commerce Figma Kit", credits: 2500.00 },
];

const sampleEarningsItems = [
  { id: "TX-ER01", date: "2026-06-23", source: "Jobs", title: "Wedding Video Editing Contract", customer: "Edmark Talingting", credits: 35000.00 },
  { id: "TX-ER02", date: "2026-06-20", source: "Gigs", title: "Tech Channel Intro Sequence", customer: "Jodeci Pacibe", credits: 12500.00 },
  { id: "TX-ER03", date: "2026-06-19", source: "Assets", title: "Cinematic LUT Pack v2", customer: "Dave Almeda", credits: 2500.00 },
];

// --- TAB EXPLANATIONS FOR TOOLTIPS ---
const tabExplanations: Record<TransactionType, string> = {
  Summary: "An aggregate overview breaking down your overall incoming gains vs outgoing debits.",
  "Credit Purchases": "A detailed history of direct credit token bundles you purchased using legal tender gateways.",
  "Sales & Earnings": "Revenue streams split safely between asset products, milestone contract roles, and short gig fulfillments.",
  Purchases: "Debited financial items mapping external plugin models and assets you bought using your account credits.",
  "Pending Credits": "Secure escrow funds locked temporarily during milestone reviews or safety clearance holds."
};

// --- BRAND CREDIT VALUE DISPLAY (No background/borders) ---
interface CreditValueProps {
  amount: number;
  prefix?: string;
  className?: string;
  colorClass?: string;
}

const CreditValue: React.FC<CreditValueProps> = ({ amount, prefix = "", className = "", colorClass = "text-[#f2e29f]" }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 font-bold select-none ${colorClass} ${className}`}>
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#b48924] text-[9px] font-black text-[#f2e29f]">
        $
      </div>
      <span className="font-sans font-semibold tracking-wide">
        {prefix}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

export const TransactionHistoryMain: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TransactionType>("Summary");
  const [earningsSubTab, setEarningsSubTab] = useState<EarningsSubTab>("All");
  const [dateRange, setDateRange] = useState<DateRangeType>("Past 30 Days");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<RowLimitType>(10);

  const handleTabChange = (tab: TransactionType) => {
    setActiveTab(tab);
    setEarningsSubTab("All");
    setCurrentPage(1);
  };

  // ========================================================
  // 🧮 DYNAMIC MATHEMATICS MATRIX PIPELINE
  // ========================================================
  const totals = useMemo(() => {
    // 1. Core Tab Aggregations
    const creditPurchasesTotal = sampleCreditPurchases.reduce((acc, curr) => acc + curr.credits, 0);
    const purchasesTotal = samplePurchases.reduce((acc, curr) => acc + curr.credits, 0);
    const pendingTotal = samplePendingCredits.reduce((acc, curr) => acc + curr.credits, 0);

    // 2. Sales & Earnings Category Splits
    const jobsEarned = sampleEarningsItems.filter(i => i.source === "Jobs").reduce((acc, c) => acc + c.credits, 0);
    const gigsEarned = sampleEarningsItems.filter(i => i.source === "Gigs").reduce((acc, c) => acc + c.credits, 0);
    const assetsEarned = sampleEarningsItems.filter(i => i.source === "Assets").reduce((acc, c) => acc + c.credits, 0);
    const totalEarnedCombined = jobsEarned + gigsEarned + assetsEarned;

    // 3. Platform Fee Formula Calculation (e.g., Exactly 20% of Gross Earnings matching your image ratio)
    const platformFeeCalculated = totalEarnedCombined * 0.20;
    const netEarningsCalculated = totalEarnedCombined - platformFeeCalculated;

    // 4. Global Interconnected Totals
    const globalIncomingTotal = creditPurchasesTotal + totalEarnedCombined + pendingTotal;
    const globalOutgoingTotal = purchasesTotal + platformFeeCalculated;

    return {
      creditPurchases: creditPurchasesTotal,
      sales: totalEarnedCombined,
      payouts: 0,
      pending: pendingTotal,
      incomingTotal: globalIncomingTotal,
      outgoingPurchases: purchasesTotal,
      platformFee: platformFeeCalculated,
      outgoingTotal: globalOutgoingTotal,

      // Sales Tab Specific Breakdowns
      jobs: jobsEarned,
      gigs: gigsEarned,
      assets: assetsEarned,
      totalEarned: totalEarnedCombined,
      netEarnings: netEarningsCalculated
    };
  }, []);

  const filteredEarningsItems = useMemo(() => {
    if (earningsSubTab === "All") return sampleEarningsItems;
    const sourceKey = earningsSubTab === "From Assets" ? "Assets" : earningsSubTab === "From Jobs" ? "Jobs" : "Gigs";
    return sampleEarningsItems.filter(i => i.source === sourceKey);
  }, [earningsSubTab]);

  // --- INTERACTIVE PAGINATION CONTROLS ---
  const renderPaginationControls = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    return (
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <div className="relative">
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value) as RowLimitType); setCurrentPage(1); }}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value={10} className="bg-[#0d0f1a]">10</option>
              <option value={25} className="bg-[#0d0f1a]">25</option>
              <option value={50} className="bg-[#0d0f1a]">50</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden">
      <UserHeader pageTitle="Transaction History" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">

        {/* Header Title Grid Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Financial Ledgers</h1>
            <p className="text-xs text-zinc-400">Monitor credit operational flows, platform asset purchases, and escrow timelines.</p>
          </div>

          {/* Date Selector Filter */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                className="appearance-none bg-[#0d0f1a]/60 border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white font-bold tracking-wide focus:outline-none focus:border-blue-500/50 cursor-pointer backdrop-blur-sm"
              >
                {["Past Day", "Past 7 Days", "Past 30 Days", "Past Year"].map((range) => (
                  <option key={range} value={range} className="bg-[#0d0f1a] text-white">{range}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Workspace Primary Tabs Segment Controls */}
        <div className="mb-6 flex flex-wrap gap-1 border-b border-white/10">
          {(["Summary", "Credit Purchases", "Sales & Earnings", "Purchases", "Pending Credits"] as TransactionType[]).map((tab) => {
            const icons: Record<TransactionType, React.ReactNode> = {
              Summary: <TrendingUp className="h-4 w-4" />,
              "Credit Purchases": <CreditCard className="h-4 w-4" />,
              "Sales & Earnings": <Tag className="h-4 w-4" />,
              Purchases: <ShoppingBag className="h-4 w-4" />,
              "Pending Credits": <Hourglass className="h-4 w-4" />
            };
            return (
              <div
                key={tab}
                className={`group/tab relative flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-medium transition-all border-b-2 tracking-wide cursor-pointer ${
                  activeTab === tab 
                    ? "text-blue-400 border-blue-500 bg-blue-500/5" 
                    : "text-zinc-400 border-transparent hover:text-white"
                }`}
                onClick={() => handleTabChange(tab)}
              >
                {icons[tab]}
                <span>{tab}</span>

                {/* Help Info Icon Trigger Tooltips */}
                <div className="relative group/help inline-block text-zinc-500 hover:text-zinc-300 transition-colors ml-1 p-0.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/help:block w-48 rounded-lg border border-white/10 bg-[#0d0f1a] p-2.5 shadow-2xl z-50 pointer-events-none animate-fade-in text-center">
                    <p className="text-[11px] font-medium leading-normal normal-case text-zinc-300">
                      {tabExplanations[tab]}
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0d0f1a]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* VIEW INTERFACE LAYOUT 1: SUMMARY TAB                     */}
        {/* ======================================================== */}
        {activeTab === "Summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
            <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-6 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-white">Incoming Credits Summary</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{dateRange}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-zinc-400">Credit Purchases</span>
                  <CreditValue amount={totals.creditPurchases} prefix="+" />
                </div>
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-zinc-400">Sales & Platform Earnings</span>
                  <CreditValue amount={totals.sales} prefix="+" />
                </div>
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl opacity-50">
                  <span className="text-zinc-400">Pending Escrow Credits</span>
                  <CreditValue amount={totals.pending} prefix="~" />
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Incoming Context</span>
                  <CreditValue amount={totals.incomingTotal} prefix="+" className="scale-110 original-origin" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-6 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><TrendingDown className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-white">Outgoing Credits Summary</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{dateRange}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-zinc-400">Marketplace Asset Purchases</span>
                  <CreditValue amount={totals.outgoingPurchases} prefix="-" />
                </div>
                <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-zinc-400">System Platform Fee Deductions</span>
                  <CreditValue amount={totals.platformFee} prefix="-" colorClass="text-red-400" />
                </div>
                <div className="pt-[78px] border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Outgoing Debit</span>
                  <CreditValue amount={totals.outgoingTotal} prefix="-" className="scale-110 original-origin" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW INTERFACE LAYOUT 2: CREDIT PURCHASES TAB             */}
        {/* ======================================================== */}
        {activeTab === "Credit Purchases" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Acquired Credits Ledger</span>
                <div className="mt-1"><CreditValue amount={totals.creditPurchases} /></div>
              </div>
              <button onClick={() => navigate("/credits")} className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 focus:outline-none">
                <Plus className="h-3.5 w-3.5" /> Purchase Credits
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0f1a]/40">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Date Stamp</th>
                    <th className="p-4">Credit Package Info</th>
                    <th className="p-4">Gateway Method</th>
                    <th className="p-4 text-right">Value Credits</th>
                    <th className="p-4 text-right">Fiat Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
                  {sampleCreditPurchases.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-mono text-zinc-500">{row.id}</td>
                      <td className="p-4 text-zinc-400">{row.date}</td>
                      <td className="p-4 font-bold text-white">{row.package}</td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[11px] font-semibold text-zinc-400">{row.paymentMethod}</span></td>
                      <td className="p-4 text-right"><CreditValue amount={row.credits} prefix="+" /></td>
                      <td className="p-4 text-right font-mono text-zinc-400">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPaginationControls(sampleCreditPurchases.length)}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW INTERFACE LAYOUT 3: SALES & EARNINGS TAB             */}
        {/* ======================================================== */}
        {activeTab === "Sales & Earnings" && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-tab ribbon matrix trigger strip */}
            <div className="flex gap-1 border-b border-white/5 pb-2">
              {(["All", "From Assets", "From Jobs", "From Gigs"] as EarningsSubTab[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => { setEarningsSubTab(sub); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    earningsSubTab === sub
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Split Grid Layout mimicking Summary Page parameters */}
            {earningsSubTab === "All" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">

                {/* Column Left: Incoming Revenue Tracker */}
                <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-6 backdrop-blur-sm shadow-xl space-y-6">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><TrendingUp className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-base font-bold text-white">Incoming Revenue Summary</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{dateRange}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                      <span className="text-zinc-400">From Jobs</span>
                      <CreditValue amount={totals.jobs} prefix="+" />
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                      <span className="text-zinc-400">From Gigs</span>
                      <CreditValue amount={totals.gigs} prefix="+" />
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                      <span className="text-zinc-400">From Assets</span>
                      <CreditValue amount={totals.assets} prefix="+" />
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Gross Earnings</span>
                      <CreditValue amount={totals.totalEarned} prefix="+" className="scale-110 original-origin" />
                    </div>
                  </div>
                </div>

                {/* Column Right: Outgoing System Deductions */}
                <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-6 backdrop-blur-sm shadow-xl space-y-6">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><TrendingDown className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-base font-bold text-white">Outgoing Revenue Deductions</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{dateRange}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                      <span className="text-zinc-400">Platform System Fee</span>
                      <CreditValue amount={totals.platformFee} prefix="-" colorClass="text-red-400" />
                    </div>
                    <div className="pt-[140px] border-t border-white/10 flex justify-between items-center font-bold">
                      <span className="text-white">Your Net Earnings</span>
                      <CreditValue amount={totals.netEarnings} className="scale-110 original-origin" />
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* Sliced Sub-tab Records Lists */
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0f1a]/40">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Date Stamp</th>
                        <th className="p-4">Source Category</th>
                        <th className="p-4">Item/Project Scope</th>
                        <th className="p-4">Client/Buyer Entity</th>
                        <th className="p-4 text-right">Revenue Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
                      {filteredEarningsItems.map((row) => {
                        const icons: Record<string, React.ReactNode> = {
                          Assets: <Layers className="h-3.5 w-3.5 text-blue-400" />,
                          Jobs: <Briefcase className="h-3.5 w-3.5 text-green-400" />,
                          Gigs: <Megaphone className="h-3.5 w-3.5 text-purple-400" />
                        };
                        return (
                          <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-mono text-zinc-500">{row.id}</td>
                            <td className="p-4 text-zinc-400">{row.date}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 text-[11px] text-zinc-300 border border-white/5">
                                {icons[row.source]} {row.source}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-white">{row.title}</td>
                            <td className="p-4 text-zinc-400">{row.customer}</td>
                            <td className="p-4 text-right"><CreditValue amount={row.credits} prefix="+" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(filteredEarningsItems.length)}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW INTERFACE LAYOUT 4: ASSET PURCHASES TAB             */}
        {/* ======================================================== */}
        {activeTab === "Purchases" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Cost of Account Investments</span>
                <div className="mt-1"><CreditValue amount={totals.outgoingPurchases} prefix="-" /></div>
              </div>
              <button onClick={() => navigate("/assets")} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white focus:outline-none">
                Browse Library <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0f1a]/40">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Date Stamp</th>
                    <th className="p-4">Acquired Digital Asset</th>
                    <th className="p-4">Vendor Creator</th>
                    <th className="p-4 text-right">Cost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
                  {samplePurchases.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-mono text-zinc-500">{row.id}</td>
                      <td className="p-4 text-zinc-400">{row.date}</td>
                      <td className="p-4 font-bold text-white">{row.assetName}</td>
                      <td className="p-4 text-zinc-400">{row.seller}</td>
                      <td className="p-4 text-right"><CreditValue amount={row.credits} prefix="-" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPaginationControls(samplePurchases.length)}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW INTERFACE LAYOUT 5: PENDING ESCROW METRICS         */}
        {/* ======================================================== */}
        {activeTab === "Pending Credits" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Funds Escrowed Pool (Awaiting Payout)</span>
              <CreditValue amount={totals.pending} />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0f1a]/40">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="p-4">Escrow ID</th>
                    <th className="p-4">Inception Date</th>
                    <th className="p-4">Origin Type</th>
                    <th className="p-4">Source Origin Ledger</th>
                    <th className="p-4">Linked Project Scope</th>
                    <th className="p-4 text-right">Held Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-zinc-300">
                  {samplePendingCredits.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-mono text-zinc-500">{row.id}</td>
                      <td className="p-4 text-zinc-400">{row.date}</td>

                      {/* Dynamic Origin Badges (Job vs Gig) */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          row.originType === "Job" 
                            ? "bg-green-500/10 text-green-400 border-green-500/20" 
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {row.originType === "Job" ? <Briefcase className="h-2.5 w-2.5" /> : <Megaphone className="h-2.5 w-2.5" />}
                          {row.originType}
                        </span>
                      </td>

                      <td className="p-4 text-zinc-400 normal-case">{row.source}</td>
                      <td className="p-4">
                        <button onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold tracking-normal text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm">
                          <span>{row.project}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                        </button>
                      </td>
                      <td className="p-4 text-right"><CreditValue amount={row.credits} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPaginationControls(samplePendingCredits.length)}
          </div>
        )}

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .original-origin { transform-origin: left center; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TransactionHistoryMain;