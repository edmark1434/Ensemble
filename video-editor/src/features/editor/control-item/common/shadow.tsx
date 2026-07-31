import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IBoxShadow } from "@designcombo/types";
import React, { useEffect, useState } from "react";
import { ColorPickerField } from "./color-picker-field";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";

function Shadow({
  label,
  value,
  onChange,
  ids,
  disabled = false,
}: {
  label: string;
  value: IBoxShadow;
  onChange: (v: IBoxShadow) => void;
  ids?: string[];
  disabled?: boolean;
}) {
  const { isMixed: isXMixed } = useMixedValue<number>(
    ids ?? [],
    (item) => item.details?.boxShadow?.x ?? 0
  );
  const { isMixed: isYMixed } = useMixedValue<number>(
    ids ?? [],
    (item) => item.details?.boxShadow?.y ?? 0
  );
  const { isMixed: isBlurMixed } = useMixedValue<number>(
    ids ?? [],
    (item) => item.details?.boxShadow?.blur ?? 0
  );
  const { isMixed: isColorMixed } = useMixedValue<string>(
    ids ?? [],
    (item) => item.details?.boxShadow?.color ?? "#000000"
  );

  const canonicalX = isXMixed ? "Mixed" : String(Math.round(value.x));
  const canonicalY = isYMixed ? "Mixed" : String(Math.round(value.y));
  const canonicalBlur = isBlurMixed ? "Mixed" : String(Math.round(value.blur));

  const [localValue, setLocalValue] = useState<IBoxShadow>(value);
  const [localX, setLocalX] = useState<string>(canonicalX);
  const [localY, setLocalY] = useState<string>(canonicalY);
  const [localBlur, setLocalBlur] = useState<string>(canonicalBlur);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    setLocalX(canonicalX);
  }, [canonicalX]);

  useEffect(() => {
    setLocalY(canonicalY);
  }, [canonicalY]);

  useEffect(() => {
    setLocalBlur(canonicalBlur);
  }, [canonicalBlur]);

  const handleColorChange = (v: string) => {
    const next = { ...localValue, color: v };
    setLocalValue(next);
    onChange(next);
  };

  const commitX = (num: number) => {
    const next = { ...localValue, x: num };
    setLocalValue(next);
    onChange(next);
    setLocalX(String(Math.round(num)));
  };

  const commitY = (num: number) => {
    const next = { ...localValue, y: num };
    setLocalValue(next);
    onChange(next);
    setLocalY(String(Math.round(num)));
  };

  const commitBlur = (num: number) => {
    const next = { ...localValue, blur: num };
    setLocalValue(next);
    onChange(next);
    setLocalBlur(String(Math.round(num)));
  };

  const handleXKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localX === "" || localX === "Mixed") return;
    const num = Number(localX);
    if (!Number.isNaN(num) && num >= 0) commitX(num);
  };

  const handleYKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localY === "" || localY === "Mixed") return;
    const num = Number(localY);
    if (!Number.isNaN(num) && num >= 0) commitY(num);
  };

  const handleBlurKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localBlur === "" || localBlur === "Mixed") return;
    const num = Number(localBlur);
    if (!Number.isNaN(num) && num >= 0) commitBlur(num);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">{label}</Label>

      <div className="flex gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Left
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              inputMode="numeric"
              value={localX}
              onFocus={() => {
                if (localX === "Mixed") setLocalX("");
              }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalX(newValue);
                }
              }}
              onBlur={() => setLocalX(canonicalX)}
              onKeyDown={handleXKeyDown}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Top
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              inputMode="numeric"
              value={localY}
              onFocus={() => {
                if (localY === "Mixed") setLocalY("");
              }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalY(newValue);
                }
              }}
              onBlur={() => setLocalY(canonicalY)}
              onKeyDown={handleYKeyDown}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">
            Blur
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              inputMode="numeric"
              value={localBlur}
              onFocus={() => {
                if (localBlur === "Mixed") setLocalBlur("");
              }}
              onChange={(e) => {
                const newValue = e.target.value;
                if (
                  newValue === "" ||
                  (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
                ) {
                  setLocalBlur(newValue);
                }
              }}
              onBlur={() => setLocalBlur(canonicalBlur)}
              onKeyDown={handleBlurKeyDown}
              disabled={disabled}
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
          mixed={isColorMixed}
        />
      </div>
    </div>
  );
}

export default Shadow;