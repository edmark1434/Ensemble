import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronDown, Link, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import useStore from "../../store/use-store";
import { ColorPickerField } from "./color-picker-field";

const FRAME_RATE_OPTIONS = [3, 15, 24, 30, 60];

export const CompositionControls = () => {
  const { projectName, setProjectName, size, fps, background, setState } = useStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-semibold">Project</Label>
        <div className="flex flex-col gap-2">
          <ProjectName value={projectName} onCommit={setProjectName} />

          <SizeFields
            width={size.width}
            height={size.height}
            onCommit={(width, height) => setState({ size: { width, height } })}
          />

          {/*<FrameRate value={fps} onChange={(v) => setState({ fps: v })} />*/}

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              Background
            </div>
            <ColorPickerField
              value={background.value}
              onChange={(v) => setState({ background: { type: "color", value: v } })}
              gradient={true}
              mobileControlType="compositionBackground"
              mobileControlLabel="Background"
              disabled={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectName = ({
  value,
  onCommit
}: {
  value: string;
  onCommit: (v: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commit = () => {
    if (localValue.trim() === "") {
      setLocalValue(value);
      return;
    }
    onCommit(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Name
      </div>
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

const SizeFields = ({
  width,
  height,
  onCommit
}: {
  width: number;
  height: number;
  onCommit: (width: number, height: number) => void;
}) => {
  const [isLinked, setIsLinked] = useState(true);

  const commitDimension = (field: "width" | "height", nextValue: number) => {
    let nextW = field === "width" ? nextValue : width;
    let nextH = field === "height" ? nextValue : height;

    if (isLinked) {
      const current = field === "width" ? width : height;
      const factor = current > 0 ? nextValue / current : 1;
      if (field === "width") {
        nextH = Math.round(height * factor);
      } else {
        nextW = Math.round(width * factor);
      }
    }

    onCommit(nextW, nextH);
  };

  return (
    <div className="flex gap-2">
      <div className="flex gap-2 flex-5">
        <SizeDimension
          field="width"
          label="Width"
          value={width}
          isLinked={isLinked}
          onCommit={commitDimension}
        />
        <SizeDimension
          field="height"
          label="Height"
          value={height}
          isLinked={isLinked}
          onCommit={commitDimension}
        />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex flex-1 items-center text-xs text-muted-foreground"></div>
        <div className="flex gap-1 flex-1">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                variant={isLinked ? "default" : "secondary"}
                size="icon"
                onClick={() => setIsLinked((prev) => !prev)}
                aria-label={isLinked ? "Unlink dimensions" : "Link dimensions"}
                aria-pressed={isLinked}
                className="flex-1"
              >
                {isLinked ? <Link size={16} /> : <Unlink size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={"bottom"} align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              {isLinked ? "Unlink dimensions" : "Link dimensions"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

const SizeDimension = ({
  field,
  label,
  value,
  isLinked,
  onCommit
}: {
  field: "width" | "height";
  label: string;
  value: number;
  isLinked: boolean;
  onCommit: (field: "width" | "height", nextValue: number) => void;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(Math.round(value));

  useEffect(() => {
    setLocalValue(Math.round(value));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "") {
      setLocalValue(Math.round(value));
      return;
    }
    const num = Number(localValue);
    if (!Number.isNaN(num) && num > 0) {
      onCommit(field, num);
    } else {
      setLocalValue(Math.round(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && !Number.isNaN(num) && num > 0) {
        onCommit(field, num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                newValue === "" ||
                (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
              ) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={isLinked ? "border-primary" : ""}
          />
        </div>
      </div>
    </div>
  );
};

const FrameRate = ({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Frame rate
      </div>
      <div className="relative w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className="flex w-full items-center justify-between text-sm"
              variant="outline"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate">{value} fps</p>
              </div>
              <ChevronDown className="text-muted-foreground" size={14} />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="z-[300] p-0"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            {FRAME_RATE_OPTIONS.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
              >
                {option} fps
                {option === value && (
                  <Check size={14} className="text-muted-foreground" />
                )}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};