import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { formatearNumero } from "../../hooks/use-animation-duration";

interface DurationInputSliderProps {
  label: string;
  valueMs: number;
  maxMs: number;
  onChangeMs: (ms: number) => void;
  disabled: boolean;
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
  const safeMaxSeconds = formatearNumero(safeMaxMs / 1000);
  // if max available is smaller than the floor, floor can't exceed max
  const floorMs = Math.min(MIN_DURATION_MS, safeMaxMs);

  const [localMs, setLocalMs] = useState(Math.min(Math.max(valueMs, floorMs), safeMaxMs));
  const [inputValue, setInputValue] = useState(
    String(formatearNumero(Math.min(Math.max(valueMs, floorMs), safeMaxMs) / 1000))
  );

  const commitMs = (ms: number) => {
    const clamped = Math.min(Math.max(floorMs, ms), safeMaxMs);
    setLocalMs(clamped);
    onChangeMs(clamped);
  };

  useEffect(() => {
    const clamped = Math.min(Math.max(valueMs, floorMs), safeMaxMs);
    setLocalMs(clamped);
    setInputValue(String(formatearNumero(clamped / 1000)));
  }, [valueMs, safeMaxMs, floorMs]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="w-full flex items-center gap-2">
        <Input
          type="number"
          min={floorMs / 1000}
          max={safeMaxSeconds}
          step={0.1}
          className="w-16 shrink-0 text-center text-sm"
          value={inputValue}
          onChange={(e) => {
            const raw = e.target.value;
            setInputValue(raw);
            if (raw === "") return;
            const seconds = Number(raw);
            if (Number.isNaN(seconds) || seconds < 0) return;
            commitMs(seconds * 1000);
          }}
          disabled={disabled}
        />
        <Slider
          value={[localMs]}
          min={floorMs}
          max={safeMaxMs}
          step={1}
          onValueChange={(v) => {
            setInputValue(String(formatearNumero(v[0] / 1000)));
            commitMs(v[0]);
          }}
          className="w-full"
          aria-label={label}
          disabled={disabled}
        />
      </div>
    </div>
  );
};