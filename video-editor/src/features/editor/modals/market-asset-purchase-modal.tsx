"use client";

import { useEffect, useState } from "react";
import { AudioLines, Clapperboard, ImageIcon, Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreditIcon } from "@/components/credit-icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useStore from "../store/use-store";
import { useMarketLicenses } from "../store/use-market-licenses";

interface PurchaseDetails {
  asset: { name: string; type: string; price_credits: number; media_asset_count: number; is_owner: boolean };
  licensed: boolean;
  hasAvailableLicense: boolean;
  balanceCredits: number | null;
}
export function MarketAssetPurchaseModal() {
  const assetId = useMarketLicenses(state => state.purchaseAssetId);
  const projectId = useStore(state => state.projectId);
  return assetId && projectId ? <PurchaseModal key={`${projectId}:${assetId}`} assetId={assetId} projectId={projectId} /> : null;
}
function PurchaseModal({ assetId, projectId }: { assetId: string; projectId: string }) {
  const [details, setDetails] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const close = useMarketLicenses(state => state.closePurchase);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/market-assets/${assetId}/purchase?${new URLSearchParams({ projectId })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load purchase details.");
        if (!controller.signal.aborted) { setDetails(data); setError(""); }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load purchase details."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [assetId, projectId, reload]);
  const price = details?.asset.price_credits ?? 0;
  const ownerDiscount = details?.asset.is_owner ? price : 0;
  const due = details?.hasAvailableLicense || details?.licensed ? 0 : price - ownerDiscount;
  const insufficient = details?.balanceCredits !== null && details?.balanceCredits !== undefined && details.balanceCredits < due;
  const confirm = async () => {
    if (!details || pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/market-assets/${assetId}/purchase`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, expectedPrice: details.asset.price_credits, expectedCharge: due }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (["ASSET_PRICE_CHANGED", "ASSET_LICENSE_COST_CHANGED"].includes(data.code)) { setLoading(true); setReload(value => value + 1); }
        throw new Error(data.error || "Unable to purchase this asset.");
      }
      // The refresh publishes the license together with its direct media URLs.
      window.dispatchEvent(new Event("market-license-updated"));
      toast.success("Watermarks removed. This project is licensed to use the asset.");
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to purchase this asset.");
    } finally { setPending(false); }
  };
  const count = details?.asset.media_asset_count ?? 1;
  const Icon = count > 1 ? PackageOpen : details?.asset.type === "audio" ? AudioLines : details?.asset.type === "video" ? Clapperboard : ImageIcon;
  return <Dialog open onOpenChange={open => { if (!open && !pending) close(); }}>
    <DialogContent className="z-[300] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg" onClick={event => event.stopPropagation()} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Remove watermarks</DialogTitle>
        <DialogDescription className="leading-relaxed text-pretty">Purchase a license to use this asset in the current project. All collaborators and future edits in this project are covered.</DialogDescription>
      </DialogHeader>
      <div className="space-y-6 px-6">
        {loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading purchase details…</div> : details && <>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-4"><Icon className="size-6 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words text-sm font-semibold">{details.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{count > 1 ? `Bundle · ${count} files` : `${details.asset.type[0].toUpperCase()}${details.asset.type.slice(1)} asset`} · One project license</p></div></div>
          {details.asset.is_owner && !details.licensed && <p className="text-sm text-primary text-pretty text-center">You own this asset, so a 100% owner discount applies to this purchase.</p>}
          {details.hasAvailableLicense && !details.asset.is_owner && !details.licensed && <p className="text-sm text-muted-foreground">You already have an unassigned license. Use it for this project at no extra cost.</p>}
          {details.licensed && <p className="text-sm text-muted-foreground">This asset is already licensed for this project.</p>}
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Price</dt><dd>{price.toLocaleString()} credits</dd></div>
            {details.asset.is_owner && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Owner discount (100%)</dt><dd className="text-primary">−{ownerDiscount.toLocaleString()} credits</dd></div>}
            <div className="flex items-center justify-between gap-4 border-t pt-3 text-base font-semibold"><dt>Total</dt><dd className="flex items-center gap-1.5 text-lg"><CreditIcon className="size-5" />{due.toLocaleString()} credits</dd></div>
          </dl>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Your balance</dt><dd>{details.balanceCredits?.toLocaleString() ?? "Unavailable"} credits</dd></div>
            {details.balanceCredits !== null && <div className="flex items-center justify-between gap-4 border-t pt-3"><dt className="text-muted-foreground">Balance after purchase</dt><dd className={insufficient ? "text-red-500" : "font-semibold"}>{(details.balanceCredits - due).toLocaleString()} credits</dd></div>}
          </dl>
          {insufficient && <p role="alert" className="text-xs text-red-500">You don’t have enough credits for this purchase.</p>}
        </>}
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={close}>Cancel</Button>
          {!details && !loading ? <Button onClick={() => { setLoading(true); setReload(value => value + 1); }}>Try again</Button> : <Button disabled={loading || pending || !details || insufficient || (!details.asset.is_owner && !details.hasAvailableLicense && due > 0 && details.balanceCredits === null)} onClick={() => { if (details?.licensed) { window.dispatchEvent(new Event("market-license-updated")); close(); } else void confirm(); }}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Processing…" : details?.licensed ? "Done" : details?.asset.is_owner ? "Confirm purchase" : details?.hasAvailableLicense ? "Use license" : due === 0 ? "Get license" : "Confirm purchase"}</Button>}
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>;
}
