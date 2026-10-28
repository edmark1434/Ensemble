"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreditIcon } from "@/components/credit-icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMarketLicenses } from "../store/use-market-licenses";

interface Quote {
  assetId: string;
  asset: { name: string; price_credits: number; is_owner: boolean };
  licensed: boolean;
  hasAvailableLicense: boolean;
  balanceCredits: number | null;
}
const cost = (quote: Quote) => quote.licensed || quote.hasAvailableLicense || quote.asset.is_owner ? 0 : quote.asset.price_credits;

export function MarketExportPurchaseModal({ assetIds, projectId, scope, onClose, onComplete }: {
  assetIds: string[]; projectId: string; scope: "project" | "scene"; onClose: () => void; onComplete: () => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const idsKey = assetIds.join(",");
  const load = useCallback(async (signal?: AbortSignal) => {
    const result: Quote[] = [];
    for (const assetId of idsKey.split(",")) {
      const response = await fetch(`/api/market-assets/${assetId}/purchase?${new URLSearchParams({ projectId })}`, { signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load asset prices.");
      result.push({ ...data, assetId });
    }
    if (!signal?.aborted) setQuotes(result);
  }, [idsKey, projectId]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);
  const total = quotes.reduce((sum, quote) => sum + cost(quote), 0);
  const balance = quotes[quotes.length - 1]?.balanceCredits ?? null;
  const insufficient = total > 0 && (balance === null || balance < total);
  const retry = async () => {
    setLoading(true); setError("");
    try { await load(); } catch (error) { setError(error instanceof Error ? error.message : "Unable to load asset prices."); }
    finally { setLoading(false); }
  };
  const confirm = async () => {
    if (pending || loading || insufficient || !quotes.length) return;
    setPending(true); setError("");
    let completed = 0;
    try {
      for (const quote of quotes) {
        if (!quote.licensed) {
          const response = await fetch(`/api/market-assets/${quote.assetId}/purchase`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, expectedPrice: quote.asset.price_credits, expectedCharge: cost(quote) }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Unable to purchase an asset.");
          completed++;
        }
        useMarketLicenses.getState().update(projectId, [{ assetId: quote.assetId, name: quote.asset.name, priceCredits: quote.asset.price_credits, isOwner: quote.asset.is_owner, licensed: true }]);
      }
      toast.success(`All assets in this ${scope} are licensed for the project.`);
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete the purchases.";
      setError(`${completed ? `${completed} asset${completed === 1 ? " was" : "s were"} licensed. ` : ""}${message} Review the remaining total before retrying.`);
      // Re-read committed results, including ambiguous network failures, before
      // offering another confirmation. The server also makes retries idempotent.
      setQuotes([]);
      try { await load(); } catch { /* Retry button remains available. */ }
    } finally {
      window.dispatchEvent(new Event("market-license-updated"));
      setPending(false);
    }
  };
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose(); }}>
    <DialogContent className="z-[300] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg" onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Pay for assets in the {scope}</DialogTitle>
        <DialogDescription className="leading-relaxed text-pretty">License these assets for everyone in this project, including future edits. Each asset or bundle is counted once.</DialogDescription>
      </DialogHeader>
      <div className="space-y-6 px-6">
        {loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading asset prices…</div> : quotes.length > 0 && <>
          <div className="space-y-3">{quotes.map(quote => <div key={quote.assetId} className="flex items-start justify-between gap-4 text-sm">
            <div className="min-w-0"><p className="break-words font-medium">{quote.asset.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{quote.licensed ? "Already licensed" : quote.asset.is_owner ? "Owner discount (100%)" : quote.hasAvailableLicense ? "Uses your available license" : "One project license"}</p>
            </div>
            <div className="shrink-0 text-right">{cost(quote) !== quote.asset.price_credits && <p className="text-xs text-primary line-through">{quote.asset.price_credits.toLocaleString()} credits</p>}<p>{cost(quote).toLocaleString()} credits</p></div>
          </div>)}</div>
          <dl><div className="flex items-center justify-between gap-4 border-t pt-3 text-base font-semibold"><dt>Total</dt><dd className="flex items-center gap-1.5 text-lg"><CreditIcon className="size-5" />{total.toLocaleString()} credits</dd></div></dl>
          <dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Your balance</dt><dd>{balance?.toLocaleString() ?? "Unavailable"} credits</dd></div>{balance !== null && <div className="flex justify-between gap-4 border-t pt-3"><dt className="text-muted-foreground">Balance after purchase</dt><dd>{(balance - total).toLocaleString()} credits</dd></div>}</dl>
          {insufficient && <p role="alert" className="text-xs text-red-500">{balance === null ? "Your balance is unavailable. Try again." : "You don’t have enough credits for these assets."}</p>}
        </>}
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          {!loading && !quotes.length ? <Button onClick={() => void retry()}>Try again</Button> : <Button disabled={loading || pending || insufficient} onClick={() => void confirm()}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Processing…" : "Confirm purchase"}</Button>}
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>;
}
