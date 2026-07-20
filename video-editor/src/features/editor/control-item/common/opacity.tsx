import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

const Opacity = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) => {
  // Create local state to manage opacity
  const [localValue, setLocalValue] = useState(value);

  // Update local state when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Opacity
      </div>
      <div
        className="w-full flex gap-2"
      >
        <Input
          max={100}
          className="w-15 text-center text-sm"
          type="number"
          onChange={(e) => {
            const newValue = Number(e.target.value);
            if (newValue >= 0 && newValue <= 100) {
              setLocalValue(newValue); // Update local state
              onChange(newValue); // Optionally propagate immediately, or adjust as needed
            }
          }}
          value={localValue} // Use local state for input value
          disabled={disabled}
        />
        <Slider
          id="opacity"
          value={[localValue]}
          onValueChange={(e) => {
            setLocalValue(e[0]);
            onChange(e[0]); // propagate immediately on every drag tick
          }}
          min={0}
          max={100}
          step={1}
          aria-label="Opacity"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Opacity;
