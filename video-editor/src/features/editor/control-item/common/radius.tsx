import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { useEffect, useState } from "react";

const BorderRadius = ({
  id,
  value,
  disabled
}: {
  id: string;
  value: number;
  disabled: boolean;
}) => {
  const [localValue, setLocalValue] = useState<number>(value * 2);

  const onChange = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            borderRadius: v / 2
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(value * 2));
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Corner radius
      </div>
      <div className="w-full flex gap-2">
        <Input
          max={100}
          className="w-15 text-center text-sm"
          type="number"
          onChange={(e) => {
            const newValue = Number(e.target.value);
            if (newValue >= 0 && newValue <= 100) {
              setLocalValue(newValue);
              onChange(newValue);
            }
          }}
          value={localValue}
          disabled={disabled}
        />
        <Slider
          id="corner-radius"
          value={[localValue]}
          onValueChange={(e) => {
            setLocalValue(e[0]);
            onChange(e[0]);
          }}
          min={0}
          max={100}
          step={1}
          aria-label="Corner Radius"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default BorderRadius;