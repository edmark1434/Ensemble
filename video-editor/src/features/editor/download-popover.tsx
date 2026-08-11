import React, {useEffect, useMemo, useRef, useState} from "react";
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
import {Check, ChevronDown, Download, X} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@designcombo/timeline";
import type { IDesign } from "@designcombo/types";
import type StateManager from "@designcombo/state";
import { useIsMediumScreen } from "@/hooks/use-media-query";
import {RenderPayload, useDownloadState} from "./store/use-download-state";
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
  getResolutionOptions, getDefaultVideoBitrateKbps, GIF_MAXIMUM_DURATION_MS
} from "./constants/download-options";
import { DraggablePanel } from "@/components/draggable-panel";
import {getSafeCurrentFrame} from "@/features/editor/utils/time";

export const DownloadPopover = ({ stateManager }: { stateManager: StateManager }) => {
  const isMediumScreen = useIsMediumScreen();
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
  const { duration, trackItemIds, size, projectName, background } = useStore();
  const isEmpty = trackItemIds.length === 0;
  const [open, setOpen] = useState(false);
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
        : "Export";

  const handleExport = () => {
    const { playerRef, fps: timelineFps } = useStore.getState();
    const currentFrame = getSafeCurrentFrame(playerRef);
    const currentTime = (currentFrame / timelineFps) * 1000;

    const data: RenderPayload = {
      ...stateManager.toJSON(),
      id: generateId(),
      duration,
      projectName,
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

    setOpen(nextOpen);
  };

  const showResolution = type !== "audio";
  const showFrameRate = type === "video" || type === "image-sequence";
  const showBitrate = (type === "video" || type === "audio") && !(format === "gif" || format === "mov");

  return (
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
              Project is still empty
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
        <DraggablePanel title="Export" onClose={() => setOpen(false)} className="w-72">
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
                options={getResolutionOptions(format)}
                onChange={actions.setResolution}
              />
            )}

            {showFrameRate && (
              <SelectField
                label="Frame rate"
                value={fps}
                options={FRAME_RATE_OPTIONS}
                onChange={actions.setFps}
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

          <div>
            <Button onClick={handleExport} className="w-full">
              Export
            </Button>
          </div>
        </DraggablePanel>
      </PopoverContent>
    </Popover>
  );
};

const SelectField = <T extends string | number,>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
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
          {options.map((option) => (
            <div
              key={String(option.value)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
            >
              {option.label}
              {option.value === value && (
                <Check size={14} className="text-muted-foreground" />
              )}
            </div>
          ))}
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
  const min = isAudio ? AUDIO_BITRATE_RANGE_KBPS.min : VIDEO_BITRATE_RANGE_KBPS.min;
  const max = isAudio ? AUDIO_BITRATE_RANGE_KBPS.max : VIDEO_BITRATE_RANGE_KBPS.max;
  const step = isAudio ? 1 : 100;

  const canonicalValue = isAudio ? String(value) : (value / 1000).toFixed(1);
  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (kbps: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(kbps)));
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
          className="w-18 text-center text-sm"
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
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
            : Math.round(getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps) / 100) / 10 
              + " Mbps"}
          `}
        </Label>
      </div>
    </div>
  );
};