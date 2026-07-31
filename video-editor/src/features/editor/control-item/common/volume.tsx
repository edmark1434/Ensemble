import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import React, { useEffect, useState } from "react";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";

const Volume = ({
  value,
  onChange,
  ids,
  disabled
}: {
  value: number;
  onChange: (v: number) => void;
  ids?: string[];
  disabled: boolean;
}) => {
  const { isMixed } = useMixedValue<number>(
    ids ?? [],
    (item) => item.details?.volume ?? 100
  );
  const canonicalValue = isMixed ? "-" : String(Math.round(value));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (num: number) => {
    onChange(num);
    setLocalValue(String(Math.round(num)));
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num) && num >= 0 && num <= 100) commit(num);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Volume
      </div>
      <div className="w-full flex gap-2">
        <Input
          className="w-15 text-center text-sm"
          type="text"
          inputMode="numeric"
          value={localValue}
          onFocus={() => {
            if (localValue === "-") setLocalValue("");
          }}
          onChange={(e) => {
            const raw = e.target.value;
            if (
              raw === "" ||
              (!Number.isNaN(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 100)
            ) {
              setLocalValue(raw);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Slider
          id="volume"
          value={[isMixed ? 0 : Math.round(value)]}
          onValueChange={(v) => commit(v[0])}
          min={0}
          max={100}
          step={1}
          aria-label="Volume"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Volume;