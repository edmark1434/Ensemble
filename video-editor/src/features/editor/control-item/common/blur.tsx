import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState, KeyboardEvent } from "react";
import { dispatchGroupEdit } from "@/features/editor/utils/dispatch-group-edit";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";

const Blur = ({
  id,
  ids,
  value,
  disabled
}: {
  id: string;
  ids?: string[];
  value: number;
  disabled?: boolean;
}) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const { value: storeValue, isMixed } = useMixedValue<number>(
    targetIds,
    (item) => item.details?.blur ?? 0
  );
  const resolvedValue = storeValue ?? value;
  const canonicalValue = isMixed ? "-" : String(Math.round(resolvedValue));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (num: number) => {
    dispatchGroupEdit(targetIds, { blur: num });
    setLocalValue(String(Math.round(num)));
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num) && num >= 0 && num <= 100) commit(num);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Blur
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
          id="blur"
          value={[isMixed ? 0 : Math.round(resolvedValue)]}
          onValueChange={(e) => commit(e[0])}
          min={0}
          max={100}
          step={1}
          aria-label="Blur"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Blur;