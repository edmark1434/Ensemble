import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import useStore from "../../store/use-store";
import { useMixedTransitionValue } from "../../hooks/use-mixed-value";
import { TRANSITIONS } from "@/features/editor/data/transitions";

type TransitionPreset = (typeof TRANSITIONS)[number];

interface ITransitionLike {
  id: string;
  kind: string;
  duration: number;
  direction?: string;
}

interface TransitionControlsProps {
  id: string;
  ids?: string[];
  disabled?: boolean;
}

const MIN_DURATION_SECONDS = 0.33;
const MAX_DURATION_SECONDS = 5;

export const TransitionControls = ({
  id,
  ids,
  disabled = false
}: TransitionControlsProps) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const { transitionsMap } = useStore();

  const representative = transitionsMap[targetIds[0]] as ITransitionLike | undefined;

  const { isMixed: isKindMixed } = useMixedTransitionValue<[string, string | null]>(
    targetIds,
    (t) => [t.kind, t.direction ?? null]
  );

  const { value: durationValue, isMixed: isDurationMixed } = useMixedTransitionValue<number>(
    targetIds,
    (t) => t.duration
  );

  if (!representative) return null;

  const selectedPreset = !isKindMixed
    ? TRANSITIONS.find(
    (t) =>
      t.kind === representative.kind &&
      (t as any).direction === representative.direction
  ) ?? TRANSITIONS.find((t) => t.kind === representative.kind)
    : undefined;

  const resolvedDurationSeconds =
    Math.round(((durationValue ?? representative.duration) / 1000) * 100) / 100;

  const patchTransitions = (patch: Partial<ITransitionLike>) => {
    const canvas = useStore.getState().timeline;
    if (!canvas) return;

    let changed = false;

    targetIds.forEach((tid) => {
      const current = canvas.transitionsMap[tid];
      if (!current) return;

      // swap + render per id, exactly like the single-item path does
      canvas.transitionsMap = { ...canvas.transitionsMap, [tid]: { ...current, ...patch } };
      canvas.renderTransitions();
      changed = true;
    });

    if (!changed) return;

    canvas.requestRenderAll();
    canvas.updateState({ updateHistory: true, kind: "update:details" });
  };

  const handleSelectKind = (t: TransitionPreset) => {
    patchTransitions({ kind: t.kind, direction: (t as any).direction });
  };

  const handleChangeDuration = (seconds: number) => {
    patchTransitions({ duration: Math.round(seconds * 1000) });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Transition</Label>
      <div className="flex flex-col gap-3">
        <TransitionKindSelect
          selected={selectedPreset}
          isMixed={isKindMixed}
          onSelect={handleSelectKind}
          disabled={disabled}
        />
        <Duration
          value={resolvedDurationSeconds}
          isMixed={isDurationMixed}
          onChange={handleChangeDuration}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

const TransitionKindSelect = ({
  selected,
  isMixed,
  onSelect,
  disabled
}: {
  selected?: TransitionPreset;
  isMixed: boolean;
  onSelect: (t: TransitionPreset) => void;
  disabled?: boolean;
}) => {
  const label = isMixed ? "Mixed" : selected?.name ?? "Select transition";

  return (
    <div className="flex flex-col gap-2 flex-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="flex w-full items-center justify-between text-sm"
            variant="outline"
            disabled={disabled}
          >
            <div className="w-full overflow-hidden text-left">
              <p className="truncate">{label}</p>
            </div>
            <ChevronDown className="text-muted-foreground" size={14} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="z-[300] p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <ScrollArea className="h-[305px] w-full">
            {TRANSITIONS.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelect(t)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
              >
                <span className="flex-1 truncate">{t.name}</span>
                {!isMixed && selected?.id === t.id && (
                  <Check size={14} className="flex-none text-muted-foreground" />
                )}
              </div>
            ))}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const Duration = ({
  value,
  isMixed,
  onChange,
  disabled
}: {
  value: number;
  isMixed: boolean;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => {
  const canonicalValue = isMixed ? "-" : String(value);
  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const clamp = (v: number) =>
    Math.min(Math.max(v, MIN_DURATION_SECONDS), MAX_DURATION_SECONDS);

  const commit = (v: number) => {
    const clamped = clamp(v);
    onChange(clamped);
    setLocalValue(String(clamped));
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) commit(num);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Duration
      </div>
      <div className="w-full flex gap-2">
        <Input
          className="w-15 text-center text-sm"
          type="text"
          inputMode="decimal"
          value={localValue}
          onFocus={() => {
            if (localValue === "-") setLocalValue("");
          }}
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
          id="transition-duration"
          value={[isMixed ? MIN_DURATION_SECONDS : value]}
          onValueChange={(v) => commit(v[0])}
          min={MIN_DURATION_SECONDS}
          max={MAX_DURATION_SECONDS}
          step={0.1}
          aria-label="Duration"
          className="w-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
};