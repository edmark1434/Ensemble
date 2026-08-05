import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import ColorPicker from "@/components/color-picker";
import { formatColorDisplay, isGradientColor } from "@/components/color-picker/helpers";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import useLayoutStore from "../../store/use-layout-store";
import {cn} from "@/lib/utils";
import { DraggablePanel } from "@/components/draggable-panel";
import {useDraggable} from "@/hooks/use-draggable";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
  backgroundSize: "8px",
  backgroundRepeat: "repeat"
};

interface ColorPickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  gradient?: boolean;
  solid?: boolean;
  popoverTitle?: string;
  mobileControlType: string;
  mobileControlLabel: string;
  disabled: boolean;
  mixed?: boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const MIXED_SWATCH_STYLE: React.CSSProperties = {
  background: "radial-gradient(circle at 50% 100%, var(--primary) 0%, var(--primary-foreground) 100%)"
};

function ColorSwatch({ value, disabled, mixed }: { value: string; disabled: boolean; mixed?: boolean }) {
  if (mixed) {
    return (
      <div
        className={cn(
          "relative h-9 w-9 flex-none overflow-hidden rounded-md rounded-r-none border border-border border-r-0",
          disabled ? "opacity-50" : ""
        )}>

        <div className="absolute inset-0" style={MIXED_SWATCH_STYLE} />
      </div>
    );
  }

  const gradient = isGradientColor(value);
  const fullHex = value || "#ffffffff";
  const solidColor = fullHex.slice(0, 7);

  if (gradient) {
    return (
      <div
        className={cn(
          "relative h-9 w-9 flex-none overflow-hidden rounded-md rounded-r-none border border-border border-r-0",
          disabled ? "opacity-50" : ""
        )}>

        <div className="absolute inset-0 rounded-lg" style={CHECKERBOARD_STYLE} />
        <div className="absolute inset-0" style={{ background: value }} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-9 w-9 flex-none overflow-hidden rounded-md rounded-r-none border border-border border-r-0",
        disabled ? "opacity-50" : ""
      )}>

      <div
        className="absolute inset-y-0 left-0 w-1/2"
        style={{ background: solidColor }}
      />
      <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
        <div className="absolute inset-0 rounded-r-none" style={CHECKERBOARD_STYLE} />
        <div className="absolute inset-0" style={{ background: fullHex }} />
      </div>
    </div>
  );
}

export function ColorPickerField({
  value,
  onChange,
  gradient = false,
  solid = true,
  popoverTitle = "Color",
  mobileControlType,
  mobileControlLabel,
  disabled,
  mixed = false,
  anchorRef
}: ColorPickerFieldProps) {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const { setControItemDrawerOpen, setTypeControlItem, setLabelControlItem } =
    useLayoutStore();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocalValue(v);
    onChange(v);
  };

  if (!isLargeScreen) {
    const handleColorClick = () => {
      if (disabled) return;
      setControItemDrawerOpen(true);
      setTypeControlItem(mobileControlType);
      setLabelControlItem(mobileControlLabel);
    };

    return (
      <div className="relative w-32">
        <div className="relative" onClick={handleColorClick}>
          <div
            style={
              mixed
                ? MIXED_SWATCH_STYLE
                : {
                  background: isGradientColor(localValue)
                    ? localValue
                    : localValue || "#ffffff"
                }
            }
            className="absolute left-0.5 top-0.5 h-7 w-7 flex-none rounded-md border border-border"
          />
          <Input
            className="pointer-events-none pl-10 rounded-l-none"
            value={mixed ? "Mixed" : formatColorDisplay(localValue)}
            onChange={() => {}}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverTrigger asChild>
        <div className="relative flex w-full">
          <ColorSwatch value={localValue} disabled={disabled} mixed={mixed} />
          <Button
            className="flex w-full flex-1 items-center justify-between px-3 text-sm rounded-l-none font-normal"
            variant="outline"
            disabled={disabled}
          >
            <div className="w-full overflow-hidden text-left">
              <p className="truncate">{mixed ? "Mixed" : formatColorDisplay(localValue)}</p>
            </div>
            <ChevronDown className="text-muted-foreground" size={14} />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="pointer-events-none w-3xs border-0 bg-transparent p-0 shadow-none"
      >
        <DraggablePanel title={popoverTitle} onClose={() => setOpen(false)} anchorRef={anchorRef}>
          <ColorPicker
            value={localValue}
            format="hex"
            gradient={gradient}
            solid={solid}
            onChange={handleChange}
          />
        </DraggablePanel>
      </PopoverContent>
    </Popover>
  );
}