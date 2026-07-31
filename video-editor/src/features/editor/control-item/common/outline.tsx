import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useEffect, useState } from "react";
import { ColorPickerField } from "./color-picker-field";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";

function Outline({
  label,
  onChageBorderWidth,
  onChangeBorderColor,
  valueBorderWidth,
  valueBorderColor,
  ids,
  disabled = false,
}: {
  label: string;
  onChageBorderWidth: (v: number) => void;
  onChangeBorderColor: (v: string) => void;
  valueBorderWidth: number;
  valueBorderColor: string;
  ids?: string[];
  disabled?: boolean;
}) {
  const { isMixed: isWidthMixed } = useMixedValue<number>(
    ids ?? [],
    (item) => item.details?.borderWidth ?? 0
  );
  const { isMixed: isColorMixed } = useMixedValue<string>(
    ids ?? [],
    (item) => item.details?.borderColor ?? "#000000"
  );

  const canonicalWidth = isWidthMixed ? "Mixed" : String(Math.round(valueBorderWidth));

  const [localValueBorderWidth, setLocalValueBorderWidth] = useState<string>(canonicalWidth);
  const [localValueBorderColor, setLocalValueBorderColor] = useState<string>(valueBorderColor);

  useEffect(() => {
    setLocalValueBorderWidth(canonicalWidth);
  }, [canonicalWidth]);

  useEffect(() => {
    setLocalValueBorderColor(valueBorderColor);
  }, [valueBorderColor]);

  const commitWidth = (num: number) => {
    onChageBorderWidth(num);
    setLocalValueBorderWidth(String(Math.round(num)));
  };

  const handleWidthBlur = () => {
    setLocalValueBorderWidth(canonicalWidth);
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValueBorderWidth === "" || localValueBorderWidth === "Mixed") return;
    const num = Number(localValueBorderWidth);
    if (!Number.isNaN(num) && num >= 0 && num <= 100) commitWidth(num);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">{label}</Label>

      <div className="flex gap-2">
        <div className="flex flex-col gap-2 flex-2">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Color
          </div>
          <ColorPickerField
            value={localValueBorderColor}
            onChange={(v) => {
              setLocalValueBorderColor(v);
              onChangeBorderColor(v);
            }}
            gradient={false}
            mobileControlType="strokeColor"
            mobileControlLabel="Stroke Color"
            disabled={disabled}
            mixed={isColorMixed}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Width
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              inputMode="numeric"
              value={localValueBorderWidth}
              onFocus={() => {
                if (localValueBorderWidth === "Mixed") setLocalValueBorderWidth("");
              }}
              onChange={(e) => {
                const newValue = e.target.value;

                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) &&
                    Number(newValue) >= 0 &&
                    Number(newValue) <= 100)
                ) {
                  setLocalValueBorderWidth(newValue);
                }
              }}
              onBlur={handleWidthBlur}
              onKeyDown={handleWidthKeyDown}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Outline;