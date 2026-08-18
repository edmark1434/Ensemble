import { useEffect, useState } from "react";
import { Coins, Loader2, ShoppingCart, X } from "lucide-react";
import api from "@/lib/axios";
import { mediaUrl, type AssetPurchaseResponse, type AssetRecord } from "./assetTypes";

interface AssetPurchaseModalProps {
  open: boolean;
  asset: AssetRecord;
  onClose: () => void;
  onPurchased: (result: AssetPurchaseResponse) => void;
}

function requestError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || "Unable to purchase this asset.";
  }
  return "Unable to purchase this asset.";
}

export default function AssetPurchaseModal({ open, asset, onClose, onPurchased }: AssetPurchaseModalProps) {
  if (!open) return null;
  return <OpenAssetPurchaseModal key={asset.market_asset_id} asset={asset} onClose={onClose} onPurchased={onPurchased} />;
}

function OpenAssetPurchaseModal({ asset, onClose, onPurchased }: Omit<AssetPurchaseModalProps, "open">) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ wallet?: { balance_credits?: number } }>("/api/accounts/wallet", {
      params: { type: "account_wallets" },
      signal: controller.signal,
    }).then((response) => {
      setBalance(Number(response.data.wallet?.balance_credits || 0));
    }).catch((requestErrorValue) => {
      if (!controller.signal.aborted) setError(requestError(requestErrorValue));
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingBalance(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !purchasing) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, purchasing]);

  const insufficient = balance !== null && balance < asset.price_credits;
  const balanceAfterPurchase = balance === null ? null : balance - asset.price_credits;
  const confirmPurchase = async () => {
    if (purchasing || loadingBalance || balance === null || insufficient) return;
    setPurchasing(true);
    setError("");
    try {
      const response = await api.post<AssetPurchaseResponse>(`/api/assets/${asset.market_asset_id}/purchase`);
      onPurchased(response.data);
    } catch (requestErrorValue) {
      setError(requestError(requestErrorValue));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="asset-purchase-title">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#10131e]">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 id="asset-purchase-title" className="text-lg font-bold text-gray-900 dark:text-white">{asset.price_credits === 0 ? "Get asset" : "Purchase asset"}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Confirm access to the protected original file.</p>
          </div>
          <button type="button" onClick={onClose} disabled={purchasing} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Close purchase dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-dark-base">
            <img src={mediaUrl(asset.thumbnail_path)} alt="" draggable={false} onContextMenu={(event) => event.preventDefault()} className="h-44 w-full object-contain" />
          </div>
          <h3 className="mt-4 truncate font-bold text-gray-900 dark:text-white">{asset.name}</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">by {asset.creator_name}</p>

          <dl className="mt-5 space-y-3 rounded-xl border border-gray-200 p-4 text-sm dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-400">Total credits</dt>
              <dd className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-300"><Coins className="h-4 w-4" /> {asset.price_credits.toLocaleString()} credits</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-3 dark:border-white/10">
              <dt className="text-gray-500 dark:text-zinc-400">Current balance</dt>
              <dd className={`font-semibold ${insufficient ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                {loadingBalance ? "Checking…" : balance === null ? "Unavailable" : `${balance.toLocaleString()} credits`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-3 dark:border-white/10">
              <dt className="text-gray-500 dark:text-zinc-400">Balance after purchase</dt>
              <dd className={`font-bold ${insufficient ? "text-red-500" : "text-emerald-600 dark:text-emerald-300"}`}>
                {loadingBalance ? "Checking…" : balanceAfterPurchase === null ? "Unavailable" : `${balanceAfterPurchase.toLocaleString()} credits`}
              </dd>
            </div>
          </dl>

          {insufficient && <p className="mt-3 text-sm text-red-600 dark:text-red-300">Your wallet does not have enough credits.</p>}
          {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}

          <div className="mt-5 flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-white/10">
            <button type="button" onClick={onClose} disabled={purchasing} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5">Cancel</button>
            <button type="button" onClick={() => void confirmPurchase()} disabled={purchasing || loadingBalance || balance === null || insufficient} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {purchasing ? "Processing…" : asset.price_credits === 0 ? "Get asset" : "Confirm purchase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
