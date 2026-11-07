"use client";

import { Eye, LayoutTemplate, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useStore from "../store/use-store";
import { applyTemplate } from "../utils/apply-template";
import { TemplateReplaceConfirmModal } from "./template-replace-confirm-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type TemplateOpenMode = "replace" | "append";

export function TemplateOpenModal({ template, onClose, onPurchase }: {
  template: { marketAssetId: string; name: string };
  onClose: () => void;
  onPurchase: (mode: TemplateOpenMode) => void;
}) {
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [projectId] = useState(() => useStore.getState().projectId);
  const [details, setDetails] = useState<{ licensed: boolean; asset: { price_credits: number } } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDetails(null); setError("");
    fetch(`/api/market-assets/${template.marketAssetId}/purchase?${new URLSearchParams({ projectId })}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check the template license.");
        if (!controller.signal.aborted) setDetails(data);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to check the template license."); });
    return () => controller.abort();
  }, [template.marketAssetId, projectId, reload]);
  const needsPurchase = !!details && !details.licensed && Number(details.asset.price_credits) > 0;
  const proceed = async (mode: TemplateOpenMode) => {
    if (!details || pending) return;
    setError("");
    if (useStore.getState().projectId !== projectId) { setError("The project changed. Open the template again."); return; }
    if (needsPurchase) { onPurchase(mode); return; }
    setPending(true);
    try {
      if (!details.licensed) {
        const response = await fetch(`/api/market-assets/${template.marketAssetId}/purchase`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, expectedPrice: 0, expectedCharge: 0 }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (["ASSET_PRICE_CHANGED", "ASSET_LICENSE_COST_CHANGED"].includes(data.code)) setReload(value => value + 1);
          throw new Error(data.error || "Unable to get the template license.");
        }
        setDetails({ ...details, licensed: true });
        window.dispatchEvent(new Event("market-license-updated"));
      }
      await applyTemplate(template.marketAssetId, projectId, mode);
      toast.success(mode === "replace" ? "Project replaced with the template." : "Template added to the end of the project.");
      onClose();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to apply the template."); }
    finally { setPending(false); }
  };
  if (confirmReplace) return <TemplateReplaceConfirmModal name={template.name} onCancel={() => setConfirmReplace(false)} onConfirm={() => void proceed("replace")}
    needsPurchase={needsPurchase} pending={pending} loading={!details} error={error} onRetry={() => setReload(value => value + 1)} />;
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose(); }}>
    <DialogContent className="z-[300] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg" onClick={event => event.stopPropagation()} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Open template</DialogTitle>
        <DialogDescription className="leading-relaxed text-pretty">How would you like to open this template?</DialogDescription>
      </DialogHeader>
      <div className="space-y-6 px-6">
        <div className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-4">
          <LayoutTemplate className="size-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold">{template.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Template</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
            <a href={`/api/market-templates/${encodeURIComponent(template.marketAssetId)}/preview`} target="_blank" rel="noopener noreferrer"><Eye className="size-4" />Preview</a>
          </Button>
        </div>
        {error && <div role="alert" className="text-xs text-red-500">{error}{!details && <Button variant="ghost" size="sm" onClick={() => setReload(value => value + 1)}>Try again</Button>}</div>}
        <div className="flex items-stretch justify-end gap-2">
          <Button variant="outline" size="sm" disabled={!details || pending} className="h-auto min-h-9 min-w-0 whitespace-normal" onClick={() => setConfirmReplace(true)}>Replace project</Button>
          <Button variant="default" size="sm" disabled={!details || pending} className="h-auto min-h-9 min-w-0 whitespace-normal" onClick={() => void proceed("append")}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Applying…" : "Add template to the end"}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
