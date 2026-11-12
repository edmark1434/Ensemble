import { useState } from "react";
import { Bookmark, Flag, Heart, MoreHorizontal } from "lucide-react";
import { create } from "zustand";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AssetReportModal } from "@/features/editor/modals/asset-report-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { MarketAssetBundle } from "./market-asset-browser";

type Engagement = { is_liked: boolean; is_saved: boolean; like_count: number };
export const useMarketEngagement = create<{
  items: Record<string, Engagement>;
  pending: Record<string, boolean>;
  update: (id: string, value: Engagement) => void;
  setPending: (id: string, value: boolean) => void;
}>((set) => ({
  items: {}, pending: {},
  update: (id, value) => set((state) => ({ items: { ...state.items, [id]: value } })),
  setPending: (id, value) => set((state) => ({ pending: { ...state.pending, [id]: value } })),
}));

async function marketAction(id: string, payload: Record<string, unknown>, kind: "asset" | "template") {
  const response = await fetch(`/api/market-assets/${id}/action`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    const message = result.error || result.message || `Unable to update this ${kind}.`;
    throw new Error(kind === "template" ? message.replace(/\basset\b/gi, "template") : message);
  }
  return result;
}

export function MarketAssetActions({ bundle, menuOnly = false, kind = "asset" }: { bundle: MarketAssetBundle; menuOnly?: boolean; kind?: "asset" | "template" }) {
  const label = kind === "template" ? "Template" : "Asset";
  const engagement = useMarketEngagement((state) => state.items[bundle.marketAssetId]);
  const update = useMarketEngagement((state) => state.update);
  const current = engagement ?? { is_liked: !!bundle.is_liked, is_saved: !!bundle.is_saved, like_count: bundle.like_count ?? 0 };
  const engagementPending = useMarketEngagement((state) => !!state.pending[bundle.marketAssetId]);
  const pending = engagementPending;
  const [reportOpen, setReportOpen] = useState(false);

  const toggle = async (action: "like" | "save") => {
    const id = bundle.marketAssetId;
    const store = useMarketEngagement.getState();
    if (store.pending[id]) return;
    store.setPending(id, true);
    const enabled = action === "like" ? !current.is_liked : !current.is_saved;
    update(id, action === "like"
      ? { ...current, is_liked: enabled, like_count: Math.max(0, current.like_count + (enabled ? 1 : -1)) }
      : { ...current, is_saved: enabled });
    const toastId = toast.success(action === "like"
      ? enabled ? `${label} liked` : `${label} unliked`
      : enabled ? `${label} saved` : `${label} removed from saved`);
    try {
      const result = await marketAction(id, { action, enabled }, kind);
      update(id, { ...current, ...result });
      window.dispatchEvent(new CustomEvent("market-engagement-updated"));
    } catch (error) {
      update(id, current);
      toast.error(error instanceof Error ? error.message : `Unable to update this ${kind}.`, { id: toastId });
    }
    finally { store.setPending(id, false); }
  };

  return <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    {!menuOnly && <>
      <Button type="button" size="icon" variant="ghost" className={`size-7 ${current.is_liked ? "text-red-400" : "text-muted-foreground"}`} disabled={pending} aria-label={current.is_liked ? "Unlike asset" : "Like asset"} aria-pressed={current.is_liked} onClick={() => void toggle("like")}><Heart className={`size-4 ${current.is_liked ? "fill-current" : ""}`} /></Button>
      <Button type="button" size="icon" variant="ghost" className={`size-7 ${current.is_saved ? "text-amber-400" : "text-muted-foreground"}`} disabled={pending} aria-label={current.is_saved ? "Unsave asset" : "Save asset"} aria-pressed={current.is_saved} onClick={() => void toggle("save")}><Bookmark className={`size-4 ${current.is_saved ? "fill-current" : ""}`} /></Button>
      {!bundle.is_owner && <Button type="button" size="icon" variant="ghost" className="size-7 text-muted-foreground" aria-label="Report asset" onClick={() => setReportOpen(true)}><Flag className="size-4" /></Button>}
    </>}
    {menuOnly && <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" className="size-7 rounded-full bg-black/50 text-white hover:bg-black/60 hover:text-white" aria-label={`Actions for ${bundle.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem disabled={pending} onSelect={() => void toggle("like")}><Heart className={current.is_liked ? "fill-current text-red-400" : ""} />{current.is_liked ? "Unlike" : "Like"}</DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onSelect={() => void toggle("save")}><Bookmark className={current.is_saved ? "fill-current text-amber-400" : ""} />{current.is_saved ? "Unsave" : "Save"}</DropdownMenuItem>
        {!bundle.is_owner && <DropdownMenuItem onSelect={() => setReportOpen(true)}><Flag />Report</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>}
    <AssetReportModal open={reportOpen} onOpenChange={setReportOpen} assetName={bundle.name} busy={engagementPending} kind={kind}
      onSubmit={(report) => marketAction(bundle.marketAssetId, { action: "report", ...report }, kind)} />
  </div>;
}
