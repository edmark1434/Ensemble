import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { getSpeedRange } from "../../utils/playback-rate";

const formatSpeedDisplay = (v: string | number): string => {
  if (v === "") return "";
  const str = typeof v === "number" ? v.toString() : v;
  return str.replace(/^0(\.\d{3,})$/, "$1");
};

const Speed = ({
  value,
  onChange,
  disabled
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);
  const [range, setRange] = useState({ min: 0.25, max: 4 }); // conservative default until mounted

  useEffect(() => {
    setRange(getSpeedRange());
  }, []);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const clamp = (v: number) => Math.min(range.max, Math.max(range.min, v));

  const handleBlur = () => {
    if (localValue !== "") {
      const clamped = clamp(Number(localValue));
      setLocalValue(clamped);
      onChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && localValue !== "") {
      const clamped = clamp(Number(localValue));
      setLocalValue(clamped);
      onChange(clamped);
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Speed
      </div>
      <div className="w-full flex gap-2">
        <Input
          className="w-15 text-center text-sm"
          value={formatSpeedDisplay(localValue)}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
              setLocalValue(newValue);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Slider
          id="speed"
          value={[Number(localValue)]}
          onValueChange={(e) => {
            setLocalValue(e[0]);
            onChange(e[0]);
          }}
          min={range.min}
          max={range.max}
          step={0.1}
          aria-label="Speed"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Speed;