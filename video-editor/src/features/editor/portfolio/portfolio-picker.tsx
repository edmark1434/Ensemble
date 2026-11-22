"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import useStore from "../store/use-store";
import { timeMsToUnits } from "../utils/timeline";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { RULER_HEIGHT } from "../timeline/ruler";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import type { MarketExportAssetSpan } from "../utils/market-export-assets";
export { PortfolioClipModal, PortfolioClipModal as PortfolioExport } from "../modals/portfolio-clip-modal";

type Part = "start" | "end" | "window";
type Range = { start: number; end: number };
type QueuePosition = { position: number; total: number };
type PickerProps = { projectId: string; version: string; profileUrl: string; name: string; duration: number; maxSeconds: number | null; marketSpans?: MarketExportAssetSpan[] };
const Picker = createContext<(PickerProps & Range & {
  select: (part: Part, ms: number) => void;
  busy: boolean;
  exporting: boolean;
  publishing: boolean;
  progress: number;
  queuePosition: QueuePosition | null;
  exportStartedAt: number | null;
  error: string | null;
  displayProgressModal: boolean;
  setDisplayProgressModal: (open: boolean) => void;
  cancelExport: () => void;
  resetExport: () => void;
  status: string;
  publish: (title: string, description: string, marketDraft?: boolean) => Promise<void>;
}) | null>(null);

export const usePortfolioPicker = () => useContext(Picker);

const formatTimestamp = (ms: number) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

const parseTimestamp = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3 || parts.some((p) => p.trim() === "" || !/^\d+(\.\d+)?$/.test(p.trim()))) {
    return null;
  }
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  let totalSeconds = 0;
  if (nums.length === 1) {
    totalSeconds = nums[0];
  } else if (nums.length === 2) {
    totalSeconds = nums[0] * 60 + nums[1];
  } else {
    totalSeconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  return Math.round(totalSeconds * 1000);
};

const formatDurationHuman = (ms: number) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [
    hours > 0 ? `${hours}h` : "",
    minutes > 0 ? `${minutes}m` : "",
    secs > 0 || (hours === 0 && minutes === 0) ? `${secs}s` : "",
  ].filter(Boolean).join(" ");
};

export function PortfolioPicker({ children, ...props }: PickerProps & { children: ReactNode }) {
  const { duration, maxSeconds, projectId, version, profileUrl } = props;
  const limit = Math.min(duration, maxSeconds == null ? duration : maxSeconds * 1000);
  const [range, setRange] = useState({ start: 0, end: limit });
  const seekFrame = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (seekFrame.current === null) return;
    useStore.getState().playerRef?.current?.seekTo(seekFrame.current);
    seekFrame.current = null;
  }, [range]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const cancelledRef = useRef(false);
  const queuePositionRef = useRef<QueuePosition | null>(null);
  const publishingRef = useRef(false);
  const [job, setJob] = useState("");
  const [progress, setProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null);
  const [exportStartedAt, setExportStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgressModal, setDisplayProgressModal] = useState(false);
  const storageKey = "portfolio-export:" + projectId;
  const endpoint = "/api/portfolio/" + projectId;

  useEffect(() => {
    const savedJob = sessionStorage.getItem(storageKey) || "";
    if (!savedJob) return;
    cancelledRef.current = false;
    setJob(savedJob);
    setExportStartedAt((prev) => prev ?? Date.now());
    setDisplayProgressModal(true);
  }, [storageKey]);

  useEffect(() => {
    if (!job) return;
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(endpoint + "?job=" + encodeURIComponent(job), { cache: "no-store" });
        const data = await response.json();
        if (closed || cancelledRef.current) return;
        if (data.status === "published") {
          sessionStorage.removeItem(storageKey);
          toast.success("Clip added to your portfolio.", { id: "editor-export" });
          window.location.assign(profileUrl);
          return;
        }
        if (data.status === "failed" || response.status === 404 || response.status === 401) {
          const message = data.error || data.message || (response.status === 404 ? "This export is no longer available." : "Clip export failed.");
          sessionStorage.removeItem(storageKey);
          setJob("");
          publishingRef.current = false;
          setPublishing(false);
          queuePositionRef.current = null;
          setQueuePosition(null);
          setError(message);
          setStatus(message);
          setDisplayProgressModal(true);
          toast.error(message, { id: "editor-export" });
          return;
        }
        if (response.ok) {
          const wasQueued = queuePositionRef.current !== null;
          const wasPublishing = publishingRef.current;
          const isPublishing = data.status === "publishing" || (data.status === "pending" && wasPublishing);
          const nextQueue: QueuePosition | null = data.status === "queued" ? (data.queuePosition ?? null) : null;
          queuePositionRef.current = nextQueue;
          publishingRef.current = isPublishing;
          setQueuePosition(nextQueue);
          if (!wasPublishing && isPublishing) {
            setExportStartedAt(Date.now());
          } else if (wasQueued && data.status === "in-progress") {
            setExportStartedAt(Date.now());
          } else if (typeof data.createdAt === "number") {
            setExportStartedAt((prev) => prev ?? data.createdAt);
          }
          setProgress(isPublishing ? 1 : (typeof data.progress === "number" ? data.progress : 0));
          setPublishing(isPublishing);
          setStatus(isPublishing ? "Attaching clip to your portfolio…" : "Exporting to your portfolio…");
        } else {
          setStatus("Reconnecting to the export…");
        }
      } catch {
        if (!closed && !cancelledRef.current) setStatus("Reconnecting to the export…");
      }
      if (!closed && !cancelledRef.current) timer = setTimeout(poll, 1000);
    };
    void poll();
    return () => { closed = true; clearTimeout(timer); };
  }, [job, endpoint, profileUrl, storageKey]);

  const select = (part: Part, ms: number) => {
    if (job || submitting || !Number.isFinite(ms)) return;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
    const { playerRef, fps } = useStore.getState();
    const step = Math.min(limit, Math.max(1, Math.round(1000 / fps)));
    let { start, end } = range;
    if (part === "window") {
      const length = end - start;
      start = clamp(ms, 0, duration - length);
      end = start + length;
    } else if (part === "start") {
      start = clamp(ms, 0, end - step);
      end = Math.min(end, start + limit);
    } else {
      end = clamp(ms, start + step, duration);
      start = Math.max(start, end - limit);
    }
    playerRef?.current?.pause();
    seekFrame.current = part === "end" ? Math.round(end * fps / 1000) - 1 : Math.round(start * fps / 1000);
    setRange({ start, end });
  };

  const resetExport = () => {
    sessionStorage.removeItem(storageKey);
    setJob("");
    setSubmitting(false);
    publishingRef.current = false;
    setPublishing(false);
    setProgress(0);
    queuePositionRef.current = null;
    setQueuePosition(null);
    setError(null);
    setStatus("");
    setDisplayProgressModal(false);
    setExportStartedAt(null);
  };

  const cancelExport = () => {
    cancelledRef.current = true;
    const activeJob = job;
    resetExport();
    if (activeJob) {
      void fetch(endpoint + "?job=" + encodeURIComponent(activeJob), { method: "DELETE" }).catch(() => undefined);
    }
  };

  const publish = async (name: string, description: string, marketDraft = false) => {
    if (sending.current || job) return;
    sending.current = true;
    cancelledRef.current = false;
    setSubmitting(true);
    publishingRef.current = false;
    setPublishing(false);
    setProgress(0);
    queuePositionRef.current = null;
    setQueuePosition(null);
    setError(null);
    setStatus("Submitting export…");
    setExportStartedAt(Date.now());
    setDisplayProgressModal(true);
    toast.info("Export started", { id: "editor-export" });
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, name, description, startMs: range.start, endMs: range.end, marketDraft }) });
      const data = await response.json().catch(() => ({}));
      if (cancelledRef.current) {
        if (response.ok && data.jobId) {
          void fetch(endpoint + "?job=" + encodeURIComponent(data.jobId), { method: "DELETE" }).catch(() => undefined);
        }
        return;
      }
      if (!response.ok) throw new Error(data.message || "Unable to start the clip export.");
      setJob(data.jobId);
      sessionStorage.setItem(storageKey, data.jobId);
    } catch (err) {
      if (!cancelledRef.current) {
        const message = err instanceof Error ? err.message : "Unable to start the clip export.";
        toast.error(message, { id: "editor-export" });
        setError(message);
        setStatus(message);
        setExportStartedAt(null);
      }
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  const exporting = !!job || submitting;
  return (
    <Picker.Provider
      value={{
        ...props,
        ...range,
        select,
        status,
        publish,
        busy: exporting,
        exporting,
        publishing,
        progress,
        queuePosition,
        exportStartedAt,
        error,
        displayProgressModal,
        setDisplayProgressModal,
        cancelExport,
        resetExport,
      }}
    >
      {children}
    </Picker.Provider>
  );
}

export function PortfolioBand({ scrollLeft }: { scrollLeft?: number }) {
  const picker = useContext(Picker);
  const track = useRef<HTMLDivElement>(null);
  const timeline = useStore(state => state.timeline);
  const overview = scrollLeft === undefined;
  const enabled = !!picker;
  useLayoutEffect(() => {
    const band = track.current;
    if (!enabled || overview || !timeline || !band) return;
    const fitToLanes = () => {
      const transform = timeline.viewportTransform;
      const laneBottom = timeline.getObjects("Track").reduce((bottom, lane) => {
        const rect = lane.getBoundingRect();
        return Math.max(bottom, (rect.top + rect.height) * transform[3] + transform[5]);
      }, 0);
      band.style.height = `${RULER_HEIGHT + Math.min(timeline.height, laneBottom)}px`;
    };
    fitToLanes();
    return timeline.on("after:render", fitToLanes);
  }, [timeline, overview, enabled]);
  const drag = useRef<{ part: Part; grabOffset: number } | null>(null);
  const zoom = useStore(state => state.scale.zoom);
  const offset = useTimelineOffsetX() + TIMELINE_OFFSET_CANVAS_LEFT;
  if (!picker) return null;
  const { start, end, duration, select, busy } = picker;
  const origin = scrollLeft === undefined ? 0 : offset - scrollLeft;
  const units = timeMsToUnits(1, zoom);
  const position = (ms: number) => overview ? `${ms / duration * 100}%` : `${origin + ms * units}px`;
  const time = (event: PointerEvent) => {
    const rect = track.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return overview ? duration * x / rect.width : (x - origin) / units;
  };
  const press = (event: PointerEvent<HTMLDivElement>) => {
    if (busy || event.button !== 0) return;
    const part = (event.target as HTMLElement).closest<HTMLElement>("[data-part]")?.dataset.part as Part | undefined;
    const ms = time(event);
    const grabOffset = part ? ms - (part === "end" ? end : start) : (end - start) / 2;
    event.preventDefault();
    drag.current = { part: part || "window", grabOffset };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!part) select("window", ms - grabOffset);
  };
  return <div ref={track} aria-label="Portfolio clip range" onPointerDown={press}
    onPointerMove={e => { if (drag.current) select(drag.current.part, time(e) - drag.current.grabOffset); }}
    onLostPointerCapture={() => { drag.current = null; }}
    className={overview
      ? "relative mx-[10px] h-7 shrink-0 touch-none select-none bg-muted"
      : "pointer-events-none absolute inset-x-0 top-0 max-h-full select-none overflow-hidden"}>
    <div className="pointer-events-none absolute inset-y-0 z-[8] overflow-hidden border border-primary bg-primary/15"
      style={{ left: position(start), right: `calc(100% - ${position(end)})` }}>
      <div data-part="window" title="Move clip range"
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-[8] touch-none cursor-grab active:cursor-grabbing"
        style={{ top: overview ? 0 : RULER_HEIGHT }} />
    </div>
    <div className="pointer-events-none absolute inset-y-0 z-[11] overflow-hidden"
      style={{
        left: overview ? `calc(${position(start)} - 10px)` : `max(0px, calc(${position(start)} - 10px))`,
        right: overview ? `calc(100% - ${position(end)} - 10px)` : `max(0px, calc(100% - ${position(end)} - 10px))`,
      }}>
      {(["start", "end"] as const).map(edge => (
        <div key={edge} data-part={edge} title={`Drag clip ${edge}`}
          className={`pointer-events-auto absolute inset-y-0 flex w-[10px] max-w-[50%] touch-none items-center justify-center bg-primary cursor-ew-resize ${edge === "start" ? "left-0 rounded-l-[4px]" : "right-0 rounded-r-[4px]"}`}>
          <span aria-hidden className="h-4 w-[2.5px] rounded-full bg-[#333]" />
        </div>
      ))}
    </div>
  </div>;
}

export function PortfolioRangeFields() {
  const picker = usePortfolioPicker();
  if (!picker) return null;
  return <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:gap-x-6">
    {(["start", "end"] as const).map(part => <label key={part} className="flex items-center gap-1.5 text-sm capitalize">
      {part}:
      <Input type="text" inputMode="text" className="h-8 w-20 px-2.5 text-center tabular-nums"
        key={picker[part]}
        defaultValue={formatTimestamp(picker[part])} disabled={picker.busy}
        onBlur={e => {
          const parsed = parseTimestamp(e.currentTarget.value);
          const displayed = formatTimestamp(picker[part]);
          e.currentTarget.value = displayed;
          if (parsed !== null && formatTimestamp(parsed) !== displayed) picker.select(part, parsed);
        }}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
    </label>)}
    <span className="text-muted-foreground">{formatDurationHuman(picker.end - picker.start)} selected{picker.maxSeconds != null && ` / ${formatDurationHuman(picker.maxSeconds * 1000)} allowed`}</span>
  </div>;
}
