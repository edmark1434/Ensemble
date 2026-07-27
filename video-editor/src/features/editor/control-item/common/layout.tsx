import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useEffect, useState } from "react";
import {FlipHorizontal, FlipVertical, Link, RotateCw, Unlink} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface LayoutControlProps {
  trackItem: ITrackItem & any;
}

export const LayoutControls = ({ trackItem }: LayoutControlProps) => {
  const id = trackItem?.id;
  const details = trackItem?.details ?? {};
  const [isLinked, setIsLinked] = useState(false);

  const rotateBy90 = () => {
    const current = parseFloat(details.rotate as unknown as string) || 0;
    const next = (current + 90) % 360;
    dispatch(EDIT_OBJECT, {
      payload: { [id]: { details: { rotate: `${next}deg` } } }
    });
  };

  const getScaleXY = (transform?: string): [number, number] => {
    const match = (transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
    return match ? [parseFloat(match[1]), parseFloat(match[2])] : [1, 1];
  };

  const flipHorizontal = () => {
    const [sx, sy] = getScaleXY(details.transform);
    dispatch(EDIT_OBJECT, {
      payload: { [id]: { details: { transform: `scale(${-sx}, ${sy})` } } }
    });
  };

  const flipVertical = () => {
    const [sx, sy] = getScaleXY(details.transform);
    dispatch(EDIT_OBJECT, {
      payload: { [id]: { details: { transform: `scale(${sx}, ${-sy})` } } }
    });
  };

  // Unlike LayoutMediaControls, width/height are written to directly here
  // (there's no base-size + scale-transform split for these track items).
  // So "proportional" just means: solve the OTHER field from the ratio of
  // old->new on the field being edited, and dispatch both in one payload.
  const commitDimension = (field: "width" | "height", nextValue: number) => {
    const baseW = details.width ?? 0;
    const baseH = details.height ?? 0;

    let nextW = field === "width" ? nextValue : baseW;
    let nextH = field === "height" ? nextValue : baseH;

    if (isLinked) {
      const current = field === "width" ? baseW : baseH;
      const factor = current > 0 ? nextValue / current : 1;
      if (field === "width") {
        nextH = Math.round(baseH * factor);
      } else {
        nextW = Math.round(baseW * factor);
      }
    }

    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            width: nextW,
            height: nextH
          }
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Layout</Label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex gap-2 flex-5">
            <LayoutDimension
              field="width"
              label="Width"
              value={details.width}
              isLinked={isLinked}
              onCommit={commitDimension}
            />
            <LayoutDimension
              field="height"
              label="Height"
              value={details.height}
              isLinked={isLinked}
              onCommit={commitDimension}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground"></div>
            <div className="flex gap-1 flex-1">
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isLinked ? "default" : "secondary"}
                    size={"icon"}
                    onClick={() => setIsLinked((prev) => !prev)}
                    aria-label={isLinked ? "Unlink dimensions" : "Link dimensions"}
                    aria-pressed={isLinked}
                    className={"flex-1"}
                  >
                    {isLinked ? <Link size={16} /> : <Unlink size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  {isLinked ? "Unlink dimensions" : "Link dimensions"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <LayoutPosition id={id} field="left" label="Left" value={details.left} />
          <LayoutPosition id={id} field="top" label="Top" value={details.top} />
        </div>
        <div className="flex gap-2">
          <LayoutSkew id={id} field="skewX" label="Skew X" value={details.skewX} />
          <LayoutSkew id={id} field="skewY" label="Skew Y" value={details.skewY} />
        </div>
        <div className="flex gap-2">
          <LayoutRotation id={id} value={details.rotate} />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground"></div>
            <div className="flex gap-1 flex-1">
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    onClick={rotateBy90}
                    className={"flex-1"}
                  >
                    <RotateCw size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  Rotate 90 degrees
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    onClick={flipHorizontal}
                    className={"flex-1"}
                  >
                    <FlipHorizontal size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  Flip horizontally
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    onClick={flipVertical}
                    className={"flex-1"}
                  >
                    <FlipVertical size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  Flip vertically
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const parseNumeric = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  const parsed = parseFloat(v ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const LayoutPosition = ({
  id,
  field,
  label,
  value
}: {
  id: string;
  field: "top" | "left";
  label: string;
  value: number | string | undefined;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(
    Math.round(parseNumeric(value))
  );

  const onChange = (v: number) => {
    setLocalValue(v);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            [field]: v
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(parseNumeric(value)));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && localValue !== "-" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              // deliberately NOT copying letter/word spacing's ">= 0" gate —
              // top/left need to go negative (element dragged partly off-canvas).
              // "-" alone is allowed through so the user can type a negative
              // number without the minus sign getting rejected mid-keystroke.
              if (newValue === "" || newValue === "-" || !Number.isNaN(Number(newValue))) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

const LayoutDimension = ({
  field,
  label,
  value,
  isLinked,
  onCommit
}: {
  field: "width" | "height";
  label: string;
  value: number | undefined;
  isLinked: boolean;
  onCommit: (field: "width" | "height", nextValue: number) => void;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(
    Math.round(value ?? 0)
  );

  useEffect(() => {
    setLocalValue(Math.round(value ?? 0));
  }, [value]);

  const commit = (num: number) => {
    onCommit(field, num);
  };

  const handleBlur = () => {
    if (localValue === "") {
      setLocalValue(Math.round(value ?? 0));
      return;
    }
    const num = Number(localValue);
    // strictly > 0, not >= 0 — a dispatched 0-width/height is exactly the
    // class of bug that's been breaking rendering all session (0-frame
    // animations, NaN heights). Never let this field commit one.
    if (!Number.isNaN(num) && num > 0) {
      commit(num);
    } else {
      // reject and snap back to last valid value instead of leaving a
      // bad number sitting in the input with no dispatch behind it
      setLocalValue(Math.round(value ?? 0));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && !Number.isNaN(num) && num > 0) {
        commit(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                newValue === "" ||
                (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
              ) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={isLinked ? "border-primary" : ""}
          />
        </div>
      </div>
    </div>
  );
};

const LayoutSkew = ({
  id,
  field,
  label,
  value
}: {
  id: string;
  field: "skewX" | "skewY";
  label: string;
  value: number | undefined;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(
    Math.round(value ?? 0)
  );

  const onChange = (v: number) => {
    setLocalValue(v);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            [field]: v
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(value ?? 0));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && localValue !== "-" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        {label}
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              // negative allowed (skew direction), 0 allowed (no skew) —
              // same permissive gate as top/left, unlike width/height
              if (newValue === "" || newValue === "-" || !Number.isNaN(Number(newValue))) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

const parseRotate = (v: number | string | undefined): number => {
  const parsed = parseFloat(v as string);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const LayoutRotation = ({
  id,
  value
}: {
  id: string;
  value: number | string | undefined;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(
    Math.round(parseRotate(value))
  );

  const onChange = (v: number) => {
    setLocalValue(v);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            rotate: `${v}deg`
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(parseRotate(value)));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && localValue !== "-" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Rotation
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === "" || newValue === "-" || !Number.isNaN(Number(newValue))) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};