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
import {TRANSITIONS} from "@/features/editor/data/transitions";

type TransitionPreset = (typeof TRANSITIONS)[number];

interface ITransitionLike {
  id: string;
  kind: string;
  duration: number;
  direction?: string;
}

interface TransitionControlsProps {
  transition: ITransitionLike;
  disabled?: boolean;
}

const MIN_DURATION_SECONDS = 0.33;
const MAX_DURATION_SECONDS = 5;

export const TransitionControls = ({
  transition,
  disabled = false
}: TransitionControlsProps) => {
  const selectedPreset =
    TRANSITIONS.find(
      (t) =>
        t.kind === transition.kind &&
        (t as any).direction === transition.direction
    ) ?? TRANSITIONS.find((t) => t.kind === transition.kind);

  const [durationSeconds, setDurationSeconds] = useState<number>(
    Math.round((transition.duration / 1000) * 100) / 100
  );

  useEffect(() => {
    setDurationSeconds(Math.round((transition.duration / 1000) * 100) / 100);
  }, [transition.duration]);

  const patchTransition = (patch: Partial<ITransitionLike>) => {
    const canvas = useStore.getState().timeline;
    if (!canvas) return;

    const current = canvas.transitionsMap[transition.id];
    if (!current) return;

    canvas.transitionsMap = {
      ...canvas.transitionsMap,
      [transition.id]: { ...current, ...patch }
    };

    canvas.renderTransitions();
    canvas.requestRenderAll();
    canvas.updateState({ updateHistory: true, kind: "update:details" });
  };

  const handleSelectKind = (t: TransitionPreset) => {
    patchTransition({ kind: t.kind, direction: (t as any).direction });
  };

  const handleChangeDuration = (seconds: number) => {
    setDurationSeconds(seconds);
    patchTransition({ duration: Math.round(seconds * 1000) });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Transition</Label>
      <div className="flex flex-col gap-2">
        <TransitionKindSelect
          selected={selectedPreset}
          onSelect={handleSelectKind}
          disabled={disabled}
        />
        <Duration
          value={durationSeconds}
          onChange={handleChangeDuration}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

const TransitionKindSelect = ({
  selected,
  onSelect,
  disabled
}: {
  selected?: TransitionPreset;
  onSelect: (t: TransitionPreset) => void;
  disabled?: boolean;
}) => {
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
              <p className="truncate">{selected?.name ?? "Select transition"}</p>
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
                {selected?.id === t.id && (
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
  onChange,
  disabled
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const clamp = (v: number) =>
    Math.min(Math.max(v, MIN_DURATION_SECONDS), MAX_DURATION_SECONDS);

  const commit = (v: number) => {
    const clamped = clamp(v);
    setLocalValue(clamped);
    onChange(clamped);
  };

  const handleBlur = () => {
    if (localValue === "") {
      commit(MIN_DURATION_SECONDS);
      return;
    }
    commit(Number(localValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && localValue !== "") {
      commit(Number(localValue));
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Duration
      </div>
      <div className="w-full flex gap-2">
        <Input
          className="w-15 text-center text-sm"
          type="number"
          step={0.1}
          min={MIN_DURATION_SECONDS}
          max={MAX_DURATION_SECONDS}
          value={localValue}
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
          value={[typeof localValue === "number" ? localValue : Number(localValue) || 0]}
          onValueChange={(v) => {
            setLocalValue(v[0]);
            commit(v[0]);
          }}
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