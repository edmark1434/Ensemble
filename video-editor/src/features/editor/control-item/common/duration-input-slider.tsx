import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { formatearNumero } from "../../hooks/use-animation-duration";

interface DurationInputSliderProps {
  label: string;
  valueMs: number;
  maxMs: number;
  onChangeMs: (ms: number) => void;
  disabled?: boolean;
}

const MIN_DURATION_MS = 330; // 10 frames

export const DurationInputSlider = ({
  label,
  valueMs,
  maxMs,
  onChangeMs,
  disabled,
}: DurationInputSliderProps) => {
  const safeMaxMs = Math.max(0, maxMs);
  // if max available is smaller than the floor, floor can't exceed max
  const floorMs = Math.min(MIN_DURATION_MS, safeMaxMs);

  const clampedValueMs = Math.min(Math.max(valueMs, floorMs), safeMaxMs);
  const canonicalValue = String(formatearNumero(clampedValueMs / 1000));

  const [localMs, setLocalMs] = useState<number>(clampedValueMs);
  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalMs(clampedValueMs);
    setLocalValue(canonicalValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedValueMs]);

  const commitSeconds = (seconds: number) => {
    const ms = Math.min(Math.max(seconds * 1000, floorMs), safeMaxMs);
    setLocalMs(ms);
    setLocalValue(String(formatearNumero(ms / 1000)));
    onChangeMs(ms);
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "") return;
    const seconds = Number(localValue);
    if (!Number.isNaN(seconds)) commitSeconds(seconds);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="w-full flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          className="w-16 shrink-0 text-center text-sm"
          value={localValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
              setLocalValue(raw);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Slider
          value={[localMs]}
          min={floorMs}
          max={safeMaxMs}
          step={1}
          onValueChange={(v) => {
            const clamped = Math.min(Math.max(v[0], floorMs), safeMaxMs);
            setLocalMs(clamped);
            setLocalValue(String(formatearNumero(clamped / 1000)));
            onChangeMs(clamped);
          }}
          className="w-full"
          aria-label={label}
          disabled={disabled}
        />
      </div>
    </div>
  );
};