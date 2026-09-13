import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Landmark, Loader2, RefreshCw, Search, ShieldCheck, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import gcashCashoutLogo from "@/assets/gcash-cashout-logo.jpg";
import mayaCashoutLogo from "@/assets/maya-cashout-logo.png";

type WalletRecord = {
  wallet_id: string;
  type: "account wallets" | "escrow wallets";
  status: string;
  balance_credits: number | string;
  frozen_balance_credits: number | string;
};

type CashoutRecord = {
  cashout_id: string;
  xendit_channel_code: string;
  account_no: string;
  amount_credits: number;
  net_amount_php_cents: number;
  status: string;
  failure_code?: string | null;
  created_at: string;
};

type Channel = { code: string; label: string };
type CashoutConfig = { php_cents_per_credit: number; fee_php_cents: number; fee_percent?: number; minimum_credits: number };
type CashoutPagination = { total: number; page: number; page_size: number; total_pages: number };
type AddressSuggestion = { id: string; label: string; street_line_1: string; city: string; province_state: string; postal_code: string };
type AddressErrors = Partial<Record<"street_line_1" | "city" | "province_state" | "postal_code", string>>;
type ContactErrors = Partial<Record<"personal_mobile_number" | "receipt_email", string>>;

const statusStyles: Record<string, string> = {
  SUCCEEDED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-400",
  REVERSED: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  PROCESSING: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

const supportedCashoutMethods = [
  {
    code: "GCASH",
    label: "GCash",
    logo: gcashCashoutLogo,
  },
  {
    code: "PAYMAYA",
    label: "Maya",
    logo: mayaCashoutLogo,
  },
] as const;

function credits(value: number | string | undefined) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pesos(cents: number | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(cents || 0) / 100);
}

function maskAccount(value: string) {
  if (!value) return "—";
  return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export function UserSettingsWallet() {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRecord[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [cashoutConfig, setCashoutConfig] = useState<CashoutConfig>({ php_cents_per_credit: 100, fee_php_cents: 0, fee_percent: 0, minimum_credits: 1 });
  const [cashoutPagination, setCashoutPagination] = useState<CashoutPagination>({ total: 0, page: 1, page_size: 10, total_pages: 1 });
  const [cashoutPage, setCashoutPage] = useState(1);
  const [cashoutSearch, setCashoutSearch] = useState("");
  const [debouncedCashoutSearch, setDebouncedCashoutSearch] = useState("");
  const [cashoutSort, setCashoutSort] = useState<"desc" | "asc">("desc");
  const [cashoutStatus, setCashoutStatus] = useState("");
  const [cashoutChannel, setCashoutChannel] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [addressSelected, setAddressSelected] = useState(false);
  const [form, setForm] = useState({ channel_code: "GCASH", account_name: "", account_no: "", personal_mobile_number: "", receipt_email: "", street_line_1: "", city: "", province_state: "", postal_code: "", amount_credits: "" });

  const fetchWallets = useCallback(async () => {
    try {
      const { data } = await api.get("/api/cashouts/wallets", { params: { page: cashoutPage, page_size: 10, search: debouncedCashoutSearch, sort: cashoutSort, status: cashoutStatus, channel: cashoutChannel } });
      setWallets(data.wallets || []);
      setCashouts(data.cashouts || []);
      if (data.cashout_pagination) setCashoutPagination(data.cashout_pagination);
      setChannels(data.channels || []);
      if (data.cashout_config) setCashoutConfig(data.cashout_config);
      if (data.channels?.length) setForm((current) => ({ ...current, channel_code: current.channel_code || data.channels[0].code }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Unable to load wallet details.");
    } finally {
      setLoading(false);
    }
  }, [cashoutPage, debouncedCashoutSearch, cashoutSort, cashoutStatus, cashoutChannel]);

  useEffect(() => { void fetchWallets(); }, [fetchWallets]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setCashoutPage(1); setDebouncedCashoutSearch(cashoutSearch.trim()); }, 350);
    return () => window.clearTimeout(timeout);
  }, [cashoutSearch]);

  useEffect(() => {
    if (!open || addressQuery.trim().length < 3 || addressSelected) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      try {
        const { data } = await api.get("/api/cashouts/address-suggestions", { params: { q: addressQuery.trim() }, signal: controller.signal });
        setAddressSuggestions(data.addresses || []);
      } catch (error: any) {
        if (error.code !== "ERR_CANCELED") setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setAddressLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [addressQuery, addressSelected, open]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleCashoutUpdate = (cashout: CashoutRecord) => {
      void fetchWallets();
      if (cashout.status === "SUCCEEDED") toast.success("Your cashout was sent successfully.");
      if (["FAILED", "REJECTED", "REVERSED", "CANCELLED", "EXPIRED"].includes(cashout.status)) {
        toast.error("Your cashout was not completed. Reserved credits were returned.");
      }
    };
    socket.on("cashoutUpdated", handleCashoutUpdate);
    return () => { socket.off("cashoutUpdated", handleCashoutUpdate); };
  }, [fetchWallets]);

  const accountWallet = useMemo(() => wallets.find((item) => item.type === "account wallets"), [wallets]);
  const escrowWallet = useMemo(() => wallets.find((item) => item.type === "escrow wallets"), [wallets]);
  const available = Number(accountWallet?.balance_credits || 0);
  const requestedCredits = Number(form.amount_credits) || 0;
  const grossPayoutCents = requestedCredits * cashoutConfig.php_cents_per_credit;
  const cashoutFeeCents = cashoutConfig.fee_percent && cashoutConfig.fee_percent > 0
    ? Math.ceil(grossPayoutCents * cashoutConfig.fee_percent / 100)
    : cashoutConfig.fee_php_cents;
  const netPayoutCents = Math.max(0, grossPayoutCents - cashoutFeeCents);
  const remainingCredits = Math.max(0, available - requestedCredits);

  const submitCashout = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextAddressErrors: AddressErrors = {};
    const nextContactErrors: ContactErrors = {};
    if (!form.street_line_1.trim()) nextAddressErrors.street_line_1 = "Address is required.";
    if (!form.city.trim()) nextAddressErrors.city = "City is required.";
    if (!form.province_state.trim()) nextAddressErrors.province_state = "Province or region is required.";
    if (!/^\d{4}$/.test(form.postal_code)) nextAddressErrors.postal_code = "Enter a valid 4-digit ZIP code.";
    const normalizedMobile = form.personal_mobile_number.replace(/[\s-]/g, "");
    if (!/^(?:\+63|0)9\d{9}$/.test(normalizedMobile)) nextContactErrors.personal_mobile_number = "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
    const normalizedEmail = form.receipt_email.trim();
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextContactErrors.receipt_email = "Enter a valid email address.";
    setAddressErrors(nextAddressErrors);
    setContactErrors(nextContactErrors);
    if (Object.keys(nextAddressErrors).length > 0 || Object.keys(nextContactErrors).length > 0) return toast.error("Correct the highlighted cashout fields.");
    const amount = Number(form.amount_credits);
    if (!Number.isInteger(amount) || amount <= 0) return toast.error("Enter a valid whole credit amount.");
    if (amount < cashoutConfig.minimum_credits) return toast.error(`Minimum cashout is ${credits(cashoutConfig.minimum_credits)} credits.`);
    if (amount > available) return toast.error("Cashout amount exceeds your available balance.");
    if (netPayoutCents <= 0) return toast.error("Cashout amount must be greater than the payout fee.");
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const { data } = await api.post("/api/cashouts", { ...form, amount_credits: amount, idempotency_key: idempotencyKey });
      toast.success(data.message || "Cashout submitted.");
      setOpen(false);
      setForm((current) => ({ ...current, account_name: "", account_no: "", personal_mobile_number: "", receipt_email: "", street_line_1: "", city: "", province_state: "", postal_code: "", amount_credits: "" }));
      setAddressQuery("");
      setAddressErrors({});
      setContactErrors({});
      setAddressSelected(false);
      await fetchWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Cashout could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Wallet</h2>
          <p className="mt-1 text-xs text-zinc-400">Review available and escrow balances, then request a secure payout.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void fetchWallets()} className="rounded-lg border border-white/10 p-2.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white" aria-label="Refresh wallets">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button disabled={!accountWallet || available <= 0} onClick={() => setOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            Cash out
          </button>
        </div>
      </div>

      <section>
        <p className="text-xs font-semibold text-white">Supported cashout methods</p>
        <p className="mt-1 text-[11px] text-zinc-500">These payment methods are currently supported for cashouts on the platform.</p>
        <ul className="mt-3 flex list-none flex-wrap items-center gap-2 p-0">
          {supportedCashoutMethods.map((method) => (
            <li key={method.code} className="text-center">
              <img src={method.logo} alt={`${method.label} logo`} className="h-20 w-32 object-contain object-center" />
              <span className="mt-1 block text-xs font-semibold text-zinc-200">{method.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {loading ? (
        <div className="flex min-h-44 items-center justify-center text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading wallets…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#121521] p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account wallet</span><Wallet className="h-5 w-5 text-blue-400" /></div>
            <p className="mt-5 text-3xl font-bold text-white">{credits(accountWallet?.balance_credits)} <span className="text-sm font-medium text-zinc-500">credits</span></p>
            <p className="mt-2 text-xs text-zinc-500">Available for cashout · {accountWallet?.status || "Unavailable"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#121521] p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Escrow wallet</span><ShieldCheck className="h-5 w-5 text-amber-400" /></div>
            <p className="mt-5 text-3xl font-bold text-white">{credits(escrowWallet?.balance_credits)} <span className="text-sm font-medium text-zinc-500">credits</span></p>
            <p className="mt-2 text-xs text-zinc-500">Protected contract funds · {escrowWallet?.status || "Unavailable"}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="border-b border-white/10 bg-[#121521] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-sm font-semibold text-white">Cashout transactions</h3><div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><input value={cashoutSearch} onChange={(e) => setCashoutSearch(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#171a26] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-blue-500 sm:w-64" placeholder="Search transaction ID" /></label>
            <select value={cashoutChannel} onChange={(e) => { setCashoutChannel(e.target.value); setCashoutPage(1); }} className="rounded-lg border border-white/10 bg-[#171a26] px-3 py-2 text-xs text-white outline-none focus:border-blue-500"><option value="">All methods</option>{channels.map((channel) => <option key={channel.code} value={channel.code}>{channel.label}</option>)}</select>
            <select value={cashoutStatus} onChange={(e) => { setCashoutStatus(e.target.value); setCashoutPage(1); }} className="rounded-lg border border-white/10 bg-[#171a26] px-3 py-2 text-xs text-white outline-none focus:border-blue-500"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="PROCESSING">Processing</option><option value="PENDING_COMPLIANCE">Compliance review</option><option value="SUCCEEDED">Succeeded</option><option value="FAILED">Failed</option><option value="REJECTED">Rejected</option><option value="REVERSED">Reversed</option><option value="CANCELLED">Cancelled</option><option value="EXPIRED">Expired</option></select>
            <select value={cashoutSort} onChange={(e) => { setCashoutSort(e.target.value as "desc" | "asc"); setCashoutPage(1); }} className="rounded-lg border border-white/10 bg-[#171a26] px-3 py-2 text-xs text-white outline-none focus:border-blue-500"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select>
          </div></div>
        </div>
        {cashouts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">No cashout requests yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {cashouts.map((item) => (
              <div key={item.cashout_id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
                <div><p className="text-sm font-semibold text-zinc-200">{channels.find((channel) => channel.code === item.xendit_channel_code)?.label || item.xendit_channel_code}</p><p className="mt-1 text-xs text-zinc-500">{maskAccount(item.account_no)}</p><p className="mt-1 max-w-52 truncate font-mono text-[10px] text-zinc-600" title={item.cashout_id}>{item.cashout_id}</p></div>
                <div><p className="text-sm text-zinc-200">{credits(item.amount_credits)} credits</p><p className="mt-1 text-xs text-zinc-500">Net {pesos(item.net_amount_php_cents)}</p></div>
                <p className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status] || "border-white/10 bg-white/5 text-zinc-400"}`}>{item.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#121521] px-5 py-3"><p className="text-xs text-zinc-500">{cashoutPagination.total === 0 ? "No transactions" : `Page ${cashoutPagination.page} of ${cashoutPagination.total_pages} · ${cashoutPagination.total} total`}</p><div className="flex gap-2"><button type="button" disabled={cashoutPage <= 1} onClick={() => setCashoutPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={cashoutPage >= cashoutPagination.total_pages} onClick={() => setCashoutPage((page) => page + 1)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form noValidate onSubmit={submitCashout} className="max-h-[85vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0d0f1a] p-5 shadow-2xl [scrollbar-color:#3f3f46_#18181b] [scrollbar-width:thin]">
            <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-white">Request cashout</h3><p className="mt-1 text-xs text-zinc-400">Funds are sent through Xendit to your selected account.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Available account-wallet balance</p>
              <p className="mt-2 text-2xl font-bold text-white">{credits(available)} <span className="text-xs font-medium text-zinc-400">credits</span></p>
              <p className="mt-1 text-xs text-zinc-500">Only your account wallet can be used for cashouts. Escrow funds are excluded.</p>
            </div>
            <div className="mt-4 space-y-3.5">
              <label className="block text-xs font-medium text-zinc-300">Cashout method<select value={form.channel_code} onChange={(e) => setForm({ ...form, channel_code: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#171a26] px-3 py-3 text-sm text-white outline-none focus:border-blue-500">{channels.map((channel) => <option key={channel.code} value={channel.code}>{channel.label}</option>)}</select></label>
              <label className="block text-xs font-medium text-zinc-300">Account holder name<input required maxLength={100} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500" placeholder="Name registered with your bank or wallet" /></label>
              <label className="block text-xs font-medium text-zinc-300">Account or mobile number<input required inputMode="numeric" value={form.account_no} onChange={(e) => setForm({ ...form, account_no: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500" placeholder="Enter account number" /></label>
              <label className="block text-xs font-medium text-zinc-300">Contact mobile number<input required inputMode="tel" aria-invalid={Boolean(contactErrors.personal_mobile_number)} value={form.personal_mobile_number} onChange={(e) => { setForm({ ...form, personal_mobile_number: e.target.value }); setContactErrors((current) => ({ ...current, personal_mobile_number: undefined })); }} className={`mt-2 w-full rounded-lg border bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 ${contactErrors.personal_mobile_number ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />{contactErrors.personal_mobile_number && <span className="mt-1.5 block text-[11px] font-normal text-red-400">{contactErrors.personal_mobile_number}</span>}</label>
              <label className="block text-xs font-medium text-zinc-300">Receipt email <span className="font-normal text-zinc-500">(optional)</span><input type="email" maxLength={254} aria-invalid={Boolean(contactErrors.receipt_email)} value={form.receipt_email} onChange={(e) => { setForm({ ...form, receipt_email: e.target.value }); setContactErrors((current) => ({ ...current, receipt_email: undefined })); }} className={`mt-2 w-full rounded-lg border bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 ${contactErrors.receipt_email ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="Email for the Xendit payout receipt" />{contactErrors.receipt_email && <span className="mt-1.5 block text-[11px] font-normal text-red-400">{contactErrors.receipt_email}</span>}</label>
              <label className="relative block text-xs font-medium text-zinc-300">Address
                <div className="relative mt-2">
                  <input required maxLength={160} autoComplete="off" value={addressQuery} onChange={(e) => { const value = e.target.value; setAddressQuery(value); setAddressSelected(false); setForm({ ...form, street_line_1: value }); setAddressErrors((current) => ({ ...current, street_line_1: undefined })); }} className={`w-full rounded-lg border bg-[#171a26] px-3 py-3 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 ${addressErrors.street_line_1 ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="Search or enter your street address" />
                  {addressLoading && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-zinc-500" />}
                </div>
                {addressSuggestions.length > 0 && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#171a26] py-1 shadow-xl [scrollbar-width:thin]">
                  {addressSuggestions.map((address) => <button key={address.id} type="button" onClick={() => { setAddressQuery(address.label); setAddressSelected(true); setForm({ ...form, street_line_1: address.street_line_1, city: address.city, province_state: address.province_state, postal_code: address.postal_code }); setAddressErrors({}); setAddressSuggestions([]); }} className="block w-full px-3 py-2.5 text-left text-xs font-normal text-zinc-200 hover:bg-white/5">{address.label}</button>)}
                </div>}
                {addressErrors.street_line_1 ? <span className="mt-1.5 block text-[11px] font-normal text-red-400">{addressErrors.street_line_1}</span> : <span className="mt-1.5 block text-[11px] font-normal text-zinc-500">Select a suggestion to auto-fill the fields below, or enter them manually.</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-zinc-300">City<input required maxLength={255} value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); setAddressErrors((current) => ({ ...current, city: undefined })); }} className={`mt-2 w-full rounded-lg border bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 ${addressErrors.city ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="City" />{addressErrors.city && <span className="mt-1.5 block text-[11px] text-red-400">{addressErrors.city}</span>}</label>
                <label className="block text-xs font-medium text-zinc-300">Province/Region<input required maxLength={255} value={form.province_state} onChange={(e) => { setForm({ ...form, province_state: e.target.value }); setAddressErrors((current) => ({ ...current, province_state: undefined })); }} className={`mt-2 w-full rounded-lg border bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 ${addressErrors.province_state ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="Province" />{addressErrors.province_state && <span className="mt-1.5 block text-[11px] text-red-400">{addressErrors.province_state}</span>}</label>
              </div>
              <label className="block text-xs font-medium text-zinc-300">ZIP code<input required inputMode="numeric" maxLength={4} value={form.postal_code} onChange={(e) => { setForm({ ...form, postal_code: e.target.value.replace(/\D/g, "").slice(0, 4) }); setAddressErrors((current) => ({ ...current, postal_code: undefined })); }} className={`mt-2 w-full rounded-lg border bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 ${addressErrors.postal_code ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-500"}`} placeholder="4-digit ZIP code" />{addressErrors.postal_code && <span className="mt-1.5 block text-[11px] text-red-400">{addressErrors.postal_code}</span>}</label>
              <label className="block text-xs font-medium text-zinc-300">Amount in credits<input required min={cashoutConfig.minimum_credits} max={available} step={1} type="number" value={form.amount_credits} onChange={(e) => setForm({ ...form, amount_credits: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#171a26] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500" placeholder={`Minimum ${credits(cashoutConfig.minimum_credits)} credits`} /><span className="mt-1.5 block text-[11px] text-zinc-500">Maximum available: {credits(available)} credits</span></label>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#121521] p-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Cashout summary</h4>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Destination</span><span className="font-medium text-zinc-200">{channels.find((channel) => channel.code === form.channel_code)?.label || form.channel_code}</span></div>
                {form.receipt_email && <div className="flex justify-between gap-4"><span className="text-zinc-500">Receipt email</span><span className="max-w-[65%] truncate font-medium text-zinc-200">{form.receipt_email}</span></div>}
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Credits requested</span><span className="font-medium text-zinc-200">{credits(requestedCredits)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Gross payout</span><span className="font-medium text-zinc-200">{pesos(grossPayoutCents)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Cashout fee{cashoutConfig.fee_percent ? ` (${cashoutConfig.fee_percent}%)` : ""}</span><span className="font-medium text-zinc-200">{pesos(cashoutFeeCents)}</span></div>
                <div className="border-t border-white/10 pt-2.5 flex justify-between gap-4"><span className="font-semibold text-zinc-300">You receive</span><span className="font-bold text-emerald-400">{pesos(netPayoutCents)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-zinc-500">Balance after cashout</span><span className={`font-medium ${requestedCredits > available ? "text-red-400" : "text-zinc-200"}`}>{credits(remainingCredits)} credits</span></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-400"><Landmark className="h-4 w-4 shrink-0 text-blue-400" />Verify the account details carefully. Processing time depends on the receiving channel.</div>
            <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5">Cancel</button><button disabled={submitting || requestedCredits < cashoutConfig.minimum_credits || requestedCredits > available || netPayoutCents <= 0} className="flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit cashout</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
