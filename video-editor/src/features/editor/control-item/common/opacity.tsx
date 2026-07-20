import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { useEffect, useState } from "react";

const Opacity = ({
                   id,
                   value,
                   disabled
                 }: {
  id: string;
  value: number;
  disabled?: boolean;
}) => {
  const [localValue, setLocalValue] = useState<number>(value);

  const onChange = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            opacity: v
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(value));
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Opacity
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
          id="opacity"
          value={[localValue]}
          onValueChange={(e) => {
            setLocalValue(e[0]);
            onChange(e[0]);
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