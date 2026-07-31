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
}

function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    dragState.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragState.current) return;
    const { x, y, offsetX, offsetY } = dragState.current;
    setOffset({
      x: offsetX + (e.clientX - x),
      y: offsetY + (e.clientY - y)
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return { offset, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp } };
}

function DraggableColorPanel({
  title = "Color",
  onClose,
  children
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { offset, dragHandleProps } = useDraggable();

  return (
    <div
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div
        className="handle flex cursor-grab select-none items-center justify-between active:cursor-grabbing"
        style={{ touchAction: "none" }}
        {...dragHandleProps}
      >
        <p className="text-sm font-semibold">{title}</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onPointerDown={(e) => {
            // Stop the drag handle from capturing this event
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
      {children}
    </div>
  );
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
  mixed = false
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
        className="w-3xs border-0 bg-transparent p-0 shadow-none"
      >
        <DraggableColorPanel title={popoverTitle} onClose={() => setOpen(false)}>
          <ColorPicker
            value={localValue}
            format="hex"
            gradient={gradient}
            solid={solid}
            onChange={handleChange}
          />
        </DraggableColorPanel>
      </PopoverContent>
    </Popover>
  );
}