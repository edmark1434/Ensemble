import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IBoxShadow } from "@designcombo/types";
import React, { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import ColorPicker from "@/components/color-picker";
import {ChevronDown, X} from "lucide-react";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import useLayoutStore from "../../store/use-layout-store";
import {Button} from "@/components/ui/button";
import { formatColorDisplay } from "@/components/color-picker/helpers";
import tinycolor from "tinycolor2";

function Shadow({
  label,
  value,
  onChange
}: {
  label: string;
  value: IBoxShadow;
  onChange: (v: IBoxShadow) => void;
}) {
  const [localValue, setLocalValue] = useState<IBoxShadow>(value);
  const [open, setOpen] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const { setControItemDrawerOpen, setTypeControlItem, setLabelControlItem } =
    useLayoutStore();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleColorClick = () => {
    if (!isLargeScreen) {
      setControItemDrawerOpen(true);
      setTypeControlItem("shadowColor");
      setLabelControlItem("Shadow Color");
    }
  };

  const fullHex = localValue.color || "#ffffffff";
  const solidColor = fullHex.slice(0, 7);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">{label}</Label>

      <div className="flex gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            X
          </div>
          <div className="relative w-full">
            <Input
              value={localValue.x}
              onChange={(e) => {
                const newValue = e.target.value;

                // Allow empty string or validate as a number
                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalValue((prev) => ({
                    ...prev,
                    x: (newValue === ""
                      ? ""
                      : Number(newValue)) as unknown as number
                  })); // Update local state

                  // Only propagate if it's a valid number and not empty
                  if (newValue !== "") {
                    onChange({
                      ...localValue,
                      x: Number(newValue)
                    }); // Propagate as a number
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              Y
            </div>
            <div className="relative w-full">
              <Input
                value={localValue.y}
                onChange={(e) => {
                  const newValue = e.target.value;

                  // Allow empty string or validate as a number
                  if (
                    newValue === "" ||
                    (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                  ) {
                    setLocalValue((prev) => ({
                      ...prev,
                      y: (newValue === ""
                        ? ""
                        : Number(newValue)) as unknown as number
                    })); // Update local state

                    // Only propagate if it's a valid number and not empty
                    if (newValue !== "") {
                      onChange({
                        ...localValue,
                        y: Number(newValue)
                      }); // Propagate as a number
                    }
                  }
                }}
              />
            </div>
          </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Blur
          </div>
          <div className="relative w-full">
            <Input
              value={localValue.blur}
              onChange={(e) => {
                const newValue = e.target.value;

                // Allow empty string or validate as a number
                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalValue((prev) => ({
                    ...prev,
                    blur: (newValue === ""
                      ? ""
                      : Number(newValue)) as unknown as number
                  })); // Update local state

                  // Only propagate if it's a valid number and not empty
                  if (newValue !== "") {
                    onChange({
                      ...localValue,
                      blur: Number(newValue)
                    }); // Propagate as a number
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {/*<div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
        {/*  Color*/}
        {/*</div>*/}

        {isLargeScreen ? (
          <div className="relative w-full flex gap-1">
            <div className="relative h-9 w-9 flex-none overflow-hidden rounded-md border border-border">
              {/* Left half: solid, alpha stripped */}
              <div
                className="absolute inset-y-0 left-0 w-1/2"
                style={{ background: solidColor }}
              />

              {/* Right half: checkerboard + real color with actual alpha */}
              <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                <div
                  className="absolute inset-0 rounded-r-md"
                  style={{
                    backgroundImage:
                      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
                    backgroundSize: "6px",
                    backgroundRepeat: "repeat"
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: fullHex }}
                />
              </div>
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="flex-1 flex w-full items-center justify-between text-sm px-3"
                  variant="secondary"
                >
                  <div className="w-full overflow-hidden text-left">
                    <p className="truncate">
                      {formatColorDisplay(localValue.color)}
                    </p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom" align="start"
                className="w-3xs bg-card border flex flex-col gap-4 rounded-lg"
              >
                <div className="handle flex cursor-grab justify-between items-center">
                  <p className="text-sm font-medium">Color</p>
                  <X
                    className="h-4 w-4 cursor-pointer text-muted-foreground"
                    onClick={() => setOpen(false)}
                  />
                </div>

                <ColorPicker
                  value={localValue.color}
                  format="hex"
                  gradient={true}
                  solid={true}
                  onChange={(v) => {
                    setLocalValue({ ...localValue, color: v });
                    onChange({
                      ...localValue,
                      color: v
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="relative w-32">
            <div className="relative" onClick={handleColorClick}>
              <div
                style={{ background: localValue.color || "#ffffff" }}
                className="absolute left-0.5 top-0.5 h-7 w-7 flex-none rounded-md border border-border"
              />
              <Input
                className="pointer-events-none pl-10"
                value={formatColorDisplay(localValue.color)}
                onChange={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Shadow;
