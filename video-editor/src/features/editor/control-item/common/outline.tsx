import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useEffect, useState } from "react";
import { ColorPickerField } from "./color-picker-field";

function Outline({
                   label,
                   onChageBorderWidth,
                   onChangeBorderColor,
                   valueBorderWidth,
                   valueBorderColor
                 }: {
  label: string;
  onChageBorderWidth: (v: number) => void;
  onChangeBorderColor: (v: string) => void;
  valueBorderWidth: number;
  valueBorderColor: string;
}) {
  const [localValueBorderWidth, setLocalValueBorderWidth] = useState<string | number>(valueBorderWidth);
  const [localValueBorderColor, setLocalValueBorderColor] = useState<string>(valueBorderColor);

  useEffect(() => {
    setLocalValueBorderWidth(valueBorderWidth);
    setLocalValueBorderColor(valueBorderColor);
  }, [valueBorderWidth, valueBorderColor]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">{label}</Label>

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
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Width
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              onChange={(e) => {
                const newValue = e.target.value;

                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) &&
                    Number(newValue) >= 0 &&
                    Number(newValue) <= 100)
                ) {
                  setLocalValueBorderWidth(newValue);

                  if (newValue !== "") {
                    onChageBorderWidth(Number(newValue));
                  }
                }
              }}
              value={localValueBorderWidth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Outline;