import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Check, ChevronDown, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@designcombo/timeline";
import type { IDesign } from "@designcombo/types";
import type StateManager from "@designcombo/state";
import { useIsMediumScreen } from "@/hooks/use-media-query";
import { RenderPayload, useDownloadState } from "./store/use-download-state";
import useStore from "./store/use-store";
import {
  AUDIO_BITRATE_RANGE_KBPS,
  DEFAULT_EXPORT_FORMAT,
  EXPORT_TYPE_OPTIONS,
  ExportType,
  FORMATS_BY_TYPE,
  FRAME_RATE_OPTIONS,
  SelectOption,
  VIDEO_BITRATE_RANGE_KBPS,
  getResolutionOptions, getDefaultVideoBitrateKbps, getMaxVideoBitrateKbps, GIF_MAXIMUM_DURATION_MS
} from "./constants/download-options";
import { DraggablePanel } from "@/components/draggable-panel";
import { useMarketLicenses } from "./store/use-market-licenses";
import { loadMarketLicenses } from "./utils/load-market-licenses";
import { collectMarketExportAssetIds } from "./utils/market-export-assets";
import { MarketExportPurchaseModal } from "./modals/market-export-purchase-modal";
import { getSafeCurrentFrame } from "@/features/editor/utils/time";
import { useEditorPlan } from "./hooks/use-editor-plan";
import { PlanIcon } from "./components/plan-icon";

export const DownloadPopover = ({ stateManager }: { stateManager: StateManager }) => {
  const isMediumScreen = useIsMediumScreen();
  const { data: policy, isError: planError, refetch: refetchPlan } = useEditorPlan();
  const maxFps = policy?.maxFps ?? 0;
  const {
    actions,
    type,
    format,
    compositionWidth,
    compositionHeight,
    resolution,
    fps,
    bitrate,
    exporting,
    output,
    error,
    queuePosition,
    downloadStatus
  } =
    useDownloadState();

  const { duration, trackItemIds, size, projectName, background, activeSceneBlockId, trackItemsMap, projectId } = useStore();
  const inScene = !!activeSceneBlockId;
  const isEmpty = trackItemIds.length === 0;

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) void refetchPlan();
  }, [open, refetchPlan]);
  const [assetStepScope, setAssetStepScope] = useState<string | null>(null);
  const assets = useMarketLicenses(state => state.assets);
  const licenseProjectId = useMarketLicenses(state => state.projectId);
  const assetIdsKey = useMemo(() => collectMarketExportAssetIds({ trackItemIds, trackItemsMap }).join(","), [trackItemIds, trackItemsMap]);
  const scopeKey = `${projectId}:${activeSceneBlockId || "project"}:${assetIdsKey}`;
  const [checkedScope, setCheckedScope] = useState("");
  const [checkError, setCheckError] = useState("");
  const [checkRetry, setCheckRetry] = useState(0);
  const [purchaseIds, setPurchaseIds] = useState<string[] | null>(null);
  const licensesReady = !assetIdsKey || checkedScope === scopeKey;
  const showAssetStep = assetStepScope === scopeKey;
  const unpaidIds = assetIdsKey.split(",").filter(id => id && licenseProjectId === projectId && assets[id] && !assets[id].licensed && assets[id].priceCredits > 0);
  useEffect(() => {
    if (!open || !assetIdsKey) return;
    const controller = new AbortController();
    setCheckedScope(""); setCheckError("");
    const check = async () => {
      const ids = assetIdsKey.split(",");
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100);
        const result = await loadMarketLicenses(projectId, batch, controller.signal);
        if (result.length !== batch.length) throw new Error("Some assets are unavailable. Review your timeline before exporting.");
        if (!controller.signal.aborted) useMarketLicenses.getState().update(projectId, result);
      }
      if (!controller.signal.aborted) setCheckedScope(scopeKey);
    };
    void check().catch(error => { if (!controller.signal.aborted) setCheckError(error instanceof Error ? error.message : "Unable to check asset licenses."); });
    return () => controller.abort();
  }, [open, assetIdsKey, projectId, scopeKey, checkRetry]);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!open) setDragOffset({ x: 0, y: 0 });
  }, [open]);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y
    };
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const { startX, startY, originX, originY } = dragStateRef.current;
    setDragOffset({
      x: originX + (e.clientX - startX),
      y: originY + (e.clientY - startY)
    });
  };

  const handleDragPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    actions.setCompositionSize(size.width, size.height);
  }, [size.width, size.height]);

  useEffect(() => {
    actions.setProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    actions.setBackground(background);
  }, [background.type, background.value]);

  useEffect(() => {
    if (policy && type !== "audio" && resolution > policy.maxHeight) {
      actions.setResolution(policy.maxHeight);
    }
  }, [policy, type, resolution, actions]);

  useEffect(() => {
    if (policy && fps > maxFps) actions.setFps(maxFps);
  }, [policy, fps, maxFps, actions]);

  const isCompleted = !!output;
  const isFailed = !!error;

  const isLongDuration = duration > GIF_MAXIMUM_DURATION_MS;

  const formatOptions = useMemo(() => {
    if (type === "video" && isLongDuration) {
      return FORMATS_BY_TYPE.video.filter((option) => option.value !== "gif");
    }
    return FORMATS_BY_TYPE[type];
  }, [type, isLongDuration]);

  useEffect(() => {
    if (type === "video" && format === "gif" && isLongDuration) {
      actions.setFormat(DEFAULT_EXPORT_FORMAT);
    }
  }, [type, format, isLongDuration]);

  const buttonLabel = isCompleted && downloadStatus === "idle"
    ? "Export ready"
    : isFailed
      ? "Export failed"
      : exporting
        ? queuePosition
          ? "Export queued"
          : "Export in progress"
        : inScene
          ? "Export scene"
          : "Export project";

  const handleExport = (marketDraft = false) => {
    if (!policy) return;
    if ((type !== "audio" && resolution > policy.maxHeight) || fps > maxFps) {
      window.open(policy.upgradeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const {
      playerRef,
      fps: timelineFps,
      activeSceneBlockId: sceneId,
      currentBlockName
    } = useStore.getState();
    const currentFrame = getSafeCurrentFrame(playerRef);
    const currentTime = (currentFrame / timelineFps) * 1000;

    // The render job echoes projectName back, and the download modal uses it as
    // the file name. Inside a scene, name it after the scene.
    const exportName = sceneId
      ? `${projectName} - ${currentBlockName?.trim() || "Untitled"}`
      : projectName;

    const data: RenderPayload = {
      ...stateManager.toJSON(),
      id: generateId(),
      duration,
      projectName: exportName,
      projectId,
      marketDraft,
      background,
      size,
      type,
      format,
      resolution,
      fps,
      bitrate,
      ...(type === "image" ? { currentTime } : {})
    };

    actions.setState({ payload: data });
    actions.startExport();
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && (isCompleted || isFailed)) {
      actions.setDisplayProgressModal(true);
      return;
    }

    if (nextOpen && exporting) {
      actions.setDisplayProgressModal(true);
      return;
    }

    setAssetStepScope(null);
    setOpen(nextOpen);
  };

  const showResolution = type !== "audio";
  const showFrameRate = type === "video" || type === "image-sequence";
  const showBitrate = (type === "video" || type === "audio") && !(format === "gif" || format === "mov");
  const getRequiredPlan = (value: number, feature: "maxHeight" | "maxFps") => {
    const required = policy?.planOptions.find(option => value <= option[feature])?.plan;
    return required === "Premium" || required === "Business" ? required : undefined;
  };
  // Keep standard choices and include configured caps so a changed limit is
  // selectable even when it is not one of the usual resolution/FPS presets.
  const resolutionOptions = Array.from(new Map([
    ...getResolutionOptions(format),
    ...(policy?.planOptions ?? []).map(option => {
      const value = format === "gif" ? Math.min(option.maxHeight, 640) : option.maxHeight;
      return { value, label: `${value}p` };
    }).filter(option => !getResolutionOptions(format).some(preset => preset.value === option.value)),
  ].map(option => [option.value, option] as const)).values()).sort((a, b) => a.value - b.value);
  const frameRateOptions = Array.from(new Map([
    ...FRAME_RATE_OPTIONS,
    ...(policy?.planOptions ?? []).map(option => ({ value: option.maxFps, label: `${option.maxFps} fps` })),
  ].map(option => [option.value, option] as const)).values()).sort((a, b) => a.value - b.value);

  return (
    <>
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {isEmpty && !isCompleted && !isFailed ? (
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
        <span>
          <Button
            className={cn(
              "flex h-8 gap-2 hover:!bg-accent/30 font-semibold",
              (exporting && !(isCompleted && downloadStatus === "idle") && !isFailed) && "!border-foreground hover:!border-foreground/80",
              isCompleted && downloadStatus === "idle" && "!border-primary text-primary hover:!border-primary/80 hover:text-primary/80",
              isFailed && "!border-red-500 text-red-500 hover:!border-red-500/80 hover:text-red-500/80"
            )}
            variant={"outline"}
            size={isMediumScreen ? "sm" : "icon"}
            disabled={isEmpty && !isCompleted && !isFailed}
          >
            <Download size={16} />{" "}
            <span className="hidden md:block">{buttonLabel}</span>
          </Button>
        </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={1}>
              {inScene ? "Scene is still empty" : "Project is still empty"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className={cn(
              "flex h-8 gap-2 hover:!bg-accent/30 font-semibold",
              (exporting && !(isCompleted && downloadStatus === "idle") && !isFailed) && "!border-foreground hover:!border-foreground/80",
              isCompleted && downloadStatus === "idle" && "!border-primary text-primary hover:!border-primary/80 hover:text-primary/80",
              isFailed && "!border-red-500 text-red-500 hover:!border-red-500/80 hover:text-red-500/80"
            )}
            variant={"outline"}
            size={isMediumScreen ? "sm" : "icon"}
            disabled={isEmpty && !isCompleted && !isFailed}
          >
            <Download size={16} />{" "}
            <span className="hidden md:block">{buttonLabel}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="pointer-events-none z-[250] w-auto border-none bg-transparent p-0 shadow-none"
      >
        <DraggablePanel title="Export" onClose={() => { setOpen(false); setAssetStepScope(null); }} onBack={showAssetStep ? () => setAssetStepScope(null) : undefined} className="w-72">
          {showAssetStep ? <>
            <h3 className="text-sm font-semibold">This {inScene ? "scene" : "project"} contains paid assets</h3>
            {assetIdsKey && checkError ? <><p role="alert" className="text-xs text-red-500">{checkError}</p><Button variant="outline" onClick={() => setCheckRetry(value => value + 1)}>Try again</Button></> : !licensesReady ? <Button disabled>Checking asset licenses…</Button> : unpaidIds.length > 0 ? <>
              <p className="text-xs leading-relaxed text-muted-foreground">This {inScene ? "scene" : "project"} contains paid assets that haven’t been licensed. Pay to remove their watermarks, or export a watermarked draft.</p>
              <div className="space-y-3">
                <Button className="h-auto min-h-9 w-full whitespace-normal py-2" onClick={() => { setPurchaseIds(unpaidIds); setOpen(false); }}>Pay for assets in the {inScene ? "scene" : "project"}</Button>
                <Button variant="outline" className="w-full" onClick={() => handleExport(true)}>Get watermarked draft</Button>
              </div>
            </> : <><p className="text-xs text-muted-foreground">All assets in this {inScene ? "scene" : "project"} are licensed.</p><Button onClick={() => handleExport()}>Export {inScene ? "scene" : "project"}</Button></>}
          </> : <>
          <div className="flex flex-col gap-3">
            <SelectField
              label="Type"
              value={type}
              options={EXPORT_TYPE_OPTIONS}
              onChange={actions.setType}
            />

            <SelectField
              label="Format"
              value={format}
              options={formatOptions}
              onChange={actions.setFormat}
            />

            {showResolution && (
              <SelectField
                label="Resolution"
                value={resolution}
                options={resolutionOptions}
                onChange={actions.setResolution}
                getRequiredPlan={(value) => getRequiredPlan(value, "maxHeight")}
                isLocked={(value) => !policy || value > policy.maxHeight}
                onLockedClick={() => { if (policy) window.open(policy.upgradeUrl, "_blank", "noopener,noreferrer"); }}
              />
            )}

            {showFrameRate && (
              <SelectField
                label="Frame rate"
                value={fps}
                options={frameRateOptions}
                onChange={actions.setFps}
                getRequiredPlan={(value) => getRequiredPlan(value, "maxFps")}
                isLocked={(value) => !policy || value > maxFps}
                onLockedClick={() => { if (policy) window.open(policy.upgradeUrl, "_blank", "noopener,noreferrer"); }}
              />
            )}

            {showBitrate && (
              <BitrateSlider
                type={type}
                value={bitrate ?? 1}
                onChange={actions.setBitrate}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                resolution={resolution}
                fps={fps}
              />
            )}
          </div>

          <div className="space-y-3">
            {planError && <p role="alert" className="text-xs text-red-500">Unable to load your plan. <button type="button" className="underline" onClick={() => void refetchPlan()}>Try again</button></p>}
            {assetIdsKey && checkError ? <><p role="alert" className="text-xs text-red-500">{checkError}</p><Button variant="outline" className="w-full" onClick={() => setCheckRetry(value => value + 1)}>Try again</Button></> : <Button disabled={!licensesReady || !policy} onClick={() => { if (unpaidIds.length) setAssetStepScope(scopeKey); else handleExport(); }} className="w-full">{!policy ? "Loading your plan…" : licensesReady ? `Export ${inScene ? "scene" : "project"}` : "Checking asset licenses…"}</Button>}
          </div>
          </>}
        </DraggablePanel>
      </PopoverContent>
    </Popover>
    {purchaseIds && <MarketExportPurchaseModal key={`${projectId}:${purchaseIds.join(",")}`} assetIds={purchaseIds} projectId={projectId} scope={inScene ? "scene" : "project"} onClose={() => { setPurchaseIds(null); setOpen(true); }} onComplete={() => { setPurchaseIds(null); setAssetStepScope(null); setOpen(true); }} />}
    </>
  );
};

const SelectField = <T extends string | number, >({
  label,
  value,
  options,
  onChange,
  getRequiredPlan,
  isLocked,
  onLockedClick
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  getRequiredPlan?: (value: T) => "Premium" | "Business" | undefined;
  isLocked?: (value: T) => boolean;
  onLockedClick?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className="w-full justify-between" variant="outline">
            <div>{current?.label ?? "-"}</div>
            <ChevronDown width={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[251] p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          {options.map((option) => {
            const locked = isLocked?.(option.value) ?? false;
            const requiredPlan = getRequiredPlan?.(option.value);
            return <button
              type="button"
              key={String(option.value)}
              aria-disabled={locked}
              aria-label={locked && requiredPlan ? `${option.label} — ${requiredPlan} required. Upgrade plan` : option.label}
              onClick={() => {
                if (locked) onLockedClick?.();
                else onChange(option.value);
                setOpen(false);
              }}
              className={cn("flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", locked ? "text-muted-foreground" : "text-zinc-200")}
            >
              <span className="flex items-center gap-2">
                {option.label}
                {requiredPlan && <PlanIcon plan={requiredPlan} />}
              </span>
              <span className="ml-3 flex w-3.5 shrink-0 items-center justify-center">
                {option.value === value && !locked && (
                  <Check size={14} className="text-muted-foreground" />
                )}
              </span>
            </button>;
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
};

const BitrateSlider = ({
  type,
  value,
  onChange,
  compositionWidth,
  compositionHeight,
  resolution,
  fps
}: {
  type: ExportType;
  value: number;
  onChange: (value: number) => void;
  compositionWidth: number;
  compositionHeight: number;
  resolution: number;
  fps: number;
}) => {
  const isAudio = type === "audio";
  const recommended = getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps);
  const min = isAudio ? AUDIO_BITRATE_RANGE_KBPS.min : VIDEO_BITRATE_RANGE_KBPS.min;
  const max = isAudio ? AUDIO_BITRATE_RANGE_KBPS.max
    : getMaxVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps);
  const step = isAudio ? 1 : 5;

  const canonicalValue = isAudio ? String(value) : (value / 1000).toFixed(2);
  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (kbps: number) => {
    if (!Number.isFinite(kbps)) return;
    const clamped = Math.min(max, Math.max(min, Math.round(kbps)));
    setLocalValue(String(isAudio ? clamped : clamped / 1000));
    onChange(clamped);
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "") return;
    const num = Number(localValue);
    if (Number.isNaN(num)) return;
    commit(isAudio ? num : num * 1000);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{`Bitrate (${isAudio ? "kbps" : "Mbps"})`}</Label>
      </div>
      <div className="flex gap-2 items-center">
        <Input
          className="w-20 text-center text-sm"
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || /^\d*(?:\.\d{0,2})?$/.test(raw)) {
              setLocalValue(raw);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <Slider
          value={[value]}
          onValueChange={(v) => commit(v[0])}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {`Recommended: ${isAudio
            ? "320 kbps"
            : `${(recommended / 1000).toFixed(2)} Mbps`}
          `}
        </Label>
      </div>
    </div>
  );
};
