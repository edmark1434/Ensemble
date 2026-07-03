import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { formatearNumero } from "../../hooks/use-animation-duration";

interface DurationInputSliderProps {
  label: string;
  valueMs: number;
  maxMs: number;
  onChangeMs: (ms: number) => void;
}

export const DurationInputSlider = ({
  label,
  valueMs,
  maxMs,
  onChangeMs
}: DurationInputSliderProps) => {
  const safeMaxMs = Math.max(0, maxMs);
  const safeMaxSeconds = formatearNumero(safeMaxMs / 1000);

  // Local buffer so dragging/typing feels instant, same idea as Opacity's
  // localValue — resynced from the real value whenever it changes upstream.
  const [localMs, setLocalMs] = useState(valueMs);
  const [inputValue, setInputValue] = useState(
    String(formatearNumero(valueMs / 1000))
  );

  useEffect(() => {
    setLocalMs(valueMs);
    setInputValue(String(formatearNumero(valueMs / 1000)));
  }, [valueMs]);

  const commitMs = (ms: number) => {
    const clamped = Math.min(Math.max(0, ms), safeMaxMs);
    setLocalMs(clamped);
    onChangeMs(clamped);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="w-full flex items-center gap-2">
        <Input
          type="number"
          min={0}
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
        />
        <Slider
          value={[localMs]}
          min={0}
          max={safeMaxMs}
          step={1}
          onValueChange={(v) => {
            setInputValue(String(formatearNumero(v[0] / 1000)));
            commitMs(v[0]);
          }}
          className="w-full"
          aria-label={label}
        />
      </div>
    </div>
  );
};