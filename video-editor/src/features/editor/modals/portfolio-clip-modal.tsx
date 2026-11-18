"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleXIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DraggablePanel } from "@/components/draggable-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useIsMediumScreen } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useMarketLicenses } from "../store/use-market-licenses";
import { loadMarketLicenses } from "../utils/load-market-licenses";
import { collectMarketExportAssetSpans } from "../utils/market-export-assets";
import { millisecondsToHHMMSS } from "../utils/format";
import { usePortfolioPicker } from "../portfolio/portfolio-picker";
import { MarketExportPurchaseModal } from "./market-export-purchase-modal";

export function PortfolioClipModal() {
  const picker = usePortfolioPicker();
  const isMediumScreen = useIsMediumScreen();
  const { trackItemIds, trackItemsMap } = useStore();
  const [title, setTitle] = useState(picker?.name || "");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [marketDraft, setMarketDraft] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const projectId = picker?.projectId ?? "";
  const clipStart = picker?.start ?? 0;
  const clipEnd = picker?.end ?? 0;
  const assets = useMarketLicenses((state) => state.assets);
  const licenseProjectId = useMarketLicenses((state) => state.projectId);
  const spans = useMemo(
    () => picker?.marketSpans ?? collectMarketExportAssetSpans({ trackItemIds, trackItemsMap }),
    [picker?.marketSpans, trackItemIds, trackItemsMap],
  );
  const allAssetIdsKey = useMemo(
    () => [...new Set(spans.map((span) => span.assetId))].sort().join(","),
    [spans],
  );
  const assetIdsKey = useMemo(
    () =>
      [...new Set(spans.filter((span) => span.from < clipEnd && span.to > clipStart).map((span) => span.assetId))]
        .sort()
        .join(","),
    [spans, clipStart, clipEnd],
  );
  const scopeKey = `${projectId}:project:${allAssetIdsKey}`;
  const [checkedScope, setCheckedScope] = useState("");
  const [checkError, setCheckError] = useState("");
  const [checkRetry, setCheckRetry] = useState(0);
  const [purchaseIds, setPurchaseIds] = useState<string[] | null>(null);
  const licensesReady = !assetIdsKey || checkedScope === scopeKey;
  const unpaidIds = assetIdsKey
    .split(",")
    .filter((id) => id && licenseProjectId === projectId && assets[id] && !assets[id].licensed && assets[id].priceCredits > 0);

  useEffect(() => {
    if (!projectId) return;
    if (useMarketLicenses.getState().projectId !== projectId) {
      useMarketLicenses.setState({ projectId, assets: {}, purchaseAssetId: null, templateMode: null });
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !allAssetIdsKey) return;
    const controller = new AbortController();
    setCheckedScope("");
    setCheckError("");
    const check = async () => {
      const ids = allAssetIdsKey.split(",");
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100);
        const result = await loadMarketLicenses(projectId, batch, controller.signal);
        if (result.length !== batch.length) {
          throw new Error("Some assets are unavailable. Review your timeline before exporting.");
        }
        if (!controller.signal.aborted) {
          useMarketLicenses.getState().update(projectId, result);
        }
      }
      if (!controller.signal.aborted) setCheckedScope(scopeKey);
    };
    void check().catch((error) => {
      if (!controller.signal.aborted) {
        setCheckError(error instanceof Error ? error.message : "Unable to check asset licenses.");
      }
    });
    return () => controller.abort();
  }, [projectId, allAssetIdsKey, scopeKey, checkRetry]);

  useEffect(() => {
    const onLicenseUpdated = () => setCheckRetry((value) => value + 1);
    window.addEventListener("market-license-updated", onLicenseUpdated);
    return () => window.removeEventListener("market-license-updated", onLicenseUpdated);
  }, []);

  const exporting = picker?.exporting ?? false;
  const exportStartedAt = picker?.exportStartedAt ?? null;

  useEffect(() => {
    if (!exporting || !exportStartedAt) {
      setElapsedMs(0);
      return;
    }

    const tick = () => setElapsedMs(Date.now() - exportStartedAt);
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exporting, exportStartedAt]);

  if (!picker) return null;

  const isFailed = !!picker.error;
  const { queuePosition } = picker;
  const buttonLabel = isFailed
    ? "Export failed"
    : exporting
      ? queuePosition
        ? "Export queued"
        : "Export in progress"
      : "Export portfolio clip";

  const handlePopoverOpenChange = (nextOpen: boolean) => {
    if (nextOpen && (exporting || isFailed)) {
      picker.setDisplayProgressModal(true);
      return;
    }
    if (nextOpen && licensesReady && !checkError && unpaidIds.length === 0) {
      setMarketDraft(false);
      setOpen(true);
      return;
    }
    setPopoverOpen(nextOpen);
  };

  const handleProgressModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isFailed) {
      picker.resetExport();
      return;
    }
    picker.setDisplayProgressModal(nextOpen);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "flex h-8 gap-2 font-semibold",
              isFailed && "!bg-red-500 !text-white hover:!bg-red-500/90"
            )}
            variant="default"
            size={isMediumScreen ? "sm" : "icon"}
          >
            <Download size={16} />{" "}
            <span className="hidden md:block">{buttonLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="pointer-events-none z-[250] w-auto border-none bg-transparent p-0 shadow-none"
        >
          <DraggablePanel
            title="Export"
            onClose={() => setPopoverOpen(false)}
            className="w-96"
          >
            <h3 className="text-sm font-semibold">This project contains paid assets</h3>
            {assetIdsKey && checkError ? (
              <>
                <p role="alert" className="text-xs text-red-500">{checkError}</p>
                <Button variant="outline" onClick={() => setCheckRetry((value) => value + 1)}>
                  Try again
                </Button>
              </>
            ) : !licensesReady ? (
              <Button disabled>Checking asset licenses…</Button>
            ) : unpaidIds.length > 0 ? (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This project contains paid assets that haven’t been licensed. Pay to remove their watermarks, or export a watermarked draft.
                </p>
                <div className="space-y-3">
                  <Button
                    className="h-auto min-h-9 w-full whitespace-normal py-2"
                    onClick={() => {
                      setPurchaseIds(unpaidIds);
                      setPopoverOpen(false);
                    }}
                  >
                    Pay for assets in the project
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMarketDraft(true);
                      setPopoverOpen(false);
                      setOpen(true);
                    }}
                  >
                    Get watermarked draft
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">All assets in this project are licensed.</p>
                <Button
                  onClick={() => {
                    setMarketDraft(false);
                    setPopoverOpen(false);
                    setOpen(true);
                  }}
                >
                  Export portfolio clip
                </Button>
              </>
            )}
          </DraggablePanel>
        </PopoverContent>
      </Popover>

      {purchaseIds && (
        <MarketExportPurchaseModal
          key={`${projectId}:${purchaseIds.join(",")}`}
          assetIds={purchaseIds}
          projectId={projectId}
          scope="project"
          onClose={() => {
            setPurchaseIds(null);
            setPopoverOpen(true);
          }}
          onComplete={() => {
            setPurchaseIds(null);
            setPopoverOpen(true);
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-[300] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg">
          <DialogHeader className="px-6 -mt-0.75">
            <DialogTitle className="text-md font-semibold">Add clip to portfolio</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-6 px-6"
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(false);
              void picker.publish(title.trim(), description.trim(), marketDraft);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="portfolio-clip-title">Title</Label>
              <Input
                id="portfolio-clip-title"
                value={title}
                maxLength={255}
                required
                disabled={picker.busy}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="portfolio-clip-description">Description (optional)</Label>
              <Textarea
                id="portfolio-clip-description"
                rows={4}
                value={description}
                maxLength={2000}
                disabled={picker.busy}
                className="resize-none"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={picker.busy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={picker.busy || !title.trim()}>
                Export to portfolio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={picker.displayProgressModal}
        onOpenChange={handleProgressModalOpenChange}
      >
        <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 overflow-hidden sm:max-w-md">
          <DialogHeader className="px-6 -mt-0.75">
            <DialogTitle className="text-md font-semibold">Export</DialogTitle>
          </DialogHeader>

          <div className="px-6">
            {isFailed ? (
              <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                <CircleXIcon size={32} className="text-red-500" />
                <div className="space-y-1">
                  <div className="font-semibold">Export failed</div>
                  <div className="text-muted-foreground text-sm text-pretty">
                    {picker.error!.split("\n").map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" onClick={picker.resetExport}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                {queuePosition ? (
                  <>
                    <div className="text-4xl font-semibold">
                      #{queuePosition.position}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      <div>Queued — {queuePosition.position} of {queuePosition.total} in line.</div>
                      <div>Your export will start rendering shortly.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-semibold">
                      {Math.max(Math.floor(picker.progress * 100), exporting && elapsedMs >= 1000 ? 1 : 0)}%
                    </div>
                    <div className="text-muted-foreground text-sm">
                      <div>Closing the browser will not cancel the export.</div>
                      <div>The video will be saved in your space.</div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {millisecondsToHHMMSS(elapsedMs)}
                </div>
                <Button variant="outline" onClick={picker.cancelExport}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PortfolioClipModal;
