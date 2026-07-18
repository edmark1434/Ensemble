import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IBoxShadow } from "@designcombo/types";
import React, { useEffect, useState } from "react";
import { ColorPickerField } from "./color-picker-field";
import tinycolor from "tinycolor2";

function Shadow({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: IBoxShadow;
  onChange: (v: IBoxShadow) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState<IBoxShadow>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleColorChange = (v: string) => {
    const next = { ...localValue, color: v };
    setLocalValue(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">{label}</Label>

      <div className="flex gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Left
          </div>
          <div className="relative w-full">
            <Input
              value={localValue.x}
              onChange={(e) => {
                const newValue = e.target.value;

                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalValue((prev) => ({
                    ...prev,
                    x: (newValue === ""
                      ? ""
                      : Number(newValue)) as unknown as number
                  }));

                  if (newValue !== "") {
                    onChange({
                      ...localValue,
                      x: Number(newValue)
                    });
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Top
          </div>
          <div className="relative w-full">
            <Input
              value={localValue.y}
              onChange={(e) => {
                const newValue = e.target.value;

                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalValue((prev) => ({
                    ...prev,
                    y: (newValue === ""
                      ? ""
                      : Number(newValue)) as unknown as number
                  }));

                  if (newValue !== "") {
                    onChange({
                      ...localValue,
                      y: Number(newValue)
                    });
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

                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalValue((prev) => ({
                    ...prev,
                    blur: (newValue === ""
                      ? ""
                      : Number(newValue)) as unknown as number
                  }));

                  if (newValue !== "") {
                    onChange({
                      ...localValue,
                      blur: Number(newValue)
                    });
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <ColorPickerField
          value={localValue.color}
          onChange={handleColorChange}
          gradient={false}
          mobileControlType="shadowColor"
          mobileControlLabel="Shadow Color"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default Shadow;