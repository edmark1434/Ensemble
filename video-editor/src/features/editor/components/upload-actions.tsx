"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Trash2, AudioLines, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useMasonryRows } from "../hooks/use-masonry-rows";
import { millisecondsToHHMMSS } from "@/features/editor/utils/format";
import { MarketPreview } from "@/components/market-asset-browser";
import { useUploadDeletion } from "../store/use-upload-deletion";

type Upload = {
  id: string;
  fileName: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  videoPreviewUrl?: string;
  daysRemaining?: number;
  details?: { width?: number; height?: number; duration?: number };
};

export function UploadActions({ item, permanent = false }: { item: Upload; permanent?: boolean }) {
  const [pending, setPending] = useState(false);
  const client = useQueryClient();
  const update = async (action: "delete" | "restore") => {
    if (pending) return;
    setPending(true);
    try {
      if (action === "restore") await axios.patch(`/api/media-assets/${item.id}`, { action: "restore" });
      else await axios.delete(`/api/media-assets/${item.id}${permanent ? "?permanent=true" : ""}`);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["media-assets"] }),
        client.invalidateQueries({ queryKey: ["media-storage-usage"] }),
        client.invalidateQueries({ queryKey: ["upload-availability"] }),
      ]);
    } catch { toast.error(`Unable to ${action} this upload. Please try again.`); }
    finally { setPending(false); }
  };
  return <div onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" disabled={pending} aria-label={`Options for ${item.fileName}`} className="size-7 rounded-full bg-black/50 text-white hover:bg-black/60 hover:text-white"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200]" onCloseAutoFocus={event => {
        if (useUploadDeletion.getState().open) event.preventDefault();
      }}>
        {permanent && <DropdownMenuItem disabled={pending} onSelect={() => void update("restore")}><RotateCcw />Restore</DropdownMenuItem>}
        <DropdownMenuItem variant="destructive" disabled={pending} onSelect={() => { if (permanent) useUploadDeletion.setState({ upload: item, open: true }); else void update("delete"); }}><Trash2 />{permanent ? "Delete forever" : "Delete"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function DeletedUploads({ items }: { items: Upload[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const layoutItems = useMemo(() => items.map(item => item.type === "audio"
    ? { ...item, details: { width: 1, height: 1 } }
    : item), [items]);
  const rows = useMasonryRows(layoutItems, containerWidth, {
    gap: 8,
    targetRowHeight: 140,
    minRowHeight: 120,
    maxRowHeight: 999999,
  });

  return <div className="flex min-h-0 flex-1 flex-col">
    <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground text-pretty text-center">Recently deleted uploads are kept for 30 days before being permanently deleted</p>
    <ScrollArea className="min-h-0 flex-1 px-4">
      <div ref={containerRef} className="flex w-full min-w-0 flex-col gap-2 pb-4">
        {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No recently deleted uploads</p>}
        {rows.map((row, rowIndex) => <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
          {row.items.map(({ item, width }) => <div key={item.id} className="group relative h-full shrink-0 overflow-hidden rounded-md bg-muted/30" style={{ width }} title={item.fileName}>
            {item.type === "audio" ? <div className="flex h-full flex-col items-center justify-center gap-2 px-3 pb-3 pt-9">
              <AudioLines className="size-8 shrink-0 text-muted-foreground" />
              <p className="line-clamp-2 w-full break-words text-center text-xs text-muted-foreground">{item.fileName}</p>
            </div> : item.type === "video" && item.videoPreviewUrl ? <MarketPreview src={item.videoPreviewUrl} type="video" /> : item.type === "video" ? <video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" onMouseEnter={event => { void event.currentTarget.play().catch(() => {}); }} onMouseLeave={event => { event.currentTarget.pause(); event.currentTarget.currentTime = 0; }} onTimeUpdate={event => { if (event.currentTarget.currentTime >= 5) event.currentTarget.currentTime = 0; }} onLoadedMetadata={event => {
              const video = event.currentTarget;
              if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
            }} /> : <img src={item.thumbnailUrl || item.url} alt={item.fileName} draggable={false} className="size-full object-cover" />}
            <span className="absolute left-2 top-2 rounded-md bg-secondary/90 px-2 py-0.5 text-xs text-secondary-foreground/90">{item.daysRemaining} days</span>
            {item.type === "video" && item.details?.duration ? <span className="absolute bottom-2 right-2 rounded-md bg-secondary/90 px-2 py-0.5 text-xs text-secondary-foreground/90">{millisecondsToHHMMSS(Math.floor(item.details.duration) * 1000)}</span> : null}
            <div className="absolute right-1 top-1"><UploadActions item={item} permanent /></div>
          </div>)}
        </div>)}
      </div>
    </ScrollArea>
  </div>;
}
