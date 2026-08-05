import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useEffect, useState } from "react";
import {Crop, FlipHorizontal, FlipVertical, Link, RotateCw, Unlink} from "lucide-react";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface LayoutMediaControlsProps {
  trackItem: ITrackItem & any;
}

const getScaleXY = (transform?: string): [number, number] => {
  const match = (transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  return match ? [parseFloat(match[1]), parseFloat(match[2])] : [1, 1];
};

export const LayoutMediaControls = ({ trackItem }: LayoutMediaControlsProps) => {
  const id = trackItem?.id;
  const details = trackItem?.details ?? {};
  const [isLinked, setIsLinked] = useState(true);
  const { setCropTarget } = useLayoutStore();

  const crop = details.crop;
  const hasCrop = !!(crop && crop.width && crop.height);
  const baseW = hasCrop ? crop.width : (details.width ?? 0);
  const baseH = hasCrop ? crop.height : (details.height ?? 0);

  const commitDimension = (axis: "width" | "height", nextDisplay: number) => {
    const [curSx, curSy] = getScaleXY(details.transform);

    const curDisplayW = Math.round(baseW * Math.abs(curSx));
    const curDisplayH = Math.round(baseH * Math.abs(curSy));

    const signX = curSx < 0 ? -1 : 1;
    const signY = curSy < 0 ? -1 : 1;

    let nextDisplayW = axis === "width" ? nextDisplay : curDisplayW;
    let nextDisplayH = axis === "height" ? nextDisplay : curDisplayH;

    if (isLinked) {
      const curEdited = axis === "width" ? curDisplayW : curDisplayH;
      const factor = curEdited > 0 ? nextDisplay / curEdited : 1;
      if (axis === "width") {
        nextDisplayH = curDisplayH * factor;
      } else {
        nextDisplayW = curDisplayW * factor;
      }
    }

    const nextSx = baseW > 0 ? signX * (nextDisplayW / baseW) : curSx;
    const nextSy = baseH > 0 ? signY * (nextDisplayH / baseH) : curSy;

    const deltaW = baseW > 0 ? baseW * (Math.abs(nextSx) - Math.abs(curSx)) : 0;
    const deltaH = baseH > 0 ? baseH * (Math.abs(nextSy) - Math.abs(curSy)) : 0;

    const nextLeft = parseNumeric(details.left) + deltaW / 2;
    const nextTop = parseNumeric(details.top) + deltaH / 2;

    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            transform: `scale(${nextSx}, ${nextSy})`,
            left: nextLeft,
            top: nextTop
          }
        }
      }
    });
  };

  const rotateBy90 = () => {
    const current = parseFloat(details.rotate as unknown as string) || 0;
    const next = (current + 90) % 360;
    dispatch(EDIT_OBJECT, {
      payload: { [id]: { details: { rotate: `${next}deg` } } }
    });
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

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Layout</Label>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <MediaDimension
            axis="width"
            label="Width"
            baseValue={baseW}
            transform={details.transform}
            isLinked={isLinked}
            onCommit={commitDimension}
          />
          <MediaDimension
            axis="height"
            label="Height"
            baseValue={baseH}
            transform={details.transform}
            isLinked={isLinked}
            onCommit={commitDimension}
          />
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

              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    onClick={() => setCropTarget(trackItem)}
                    className={"flex-1"}
                  >
                    <Crop size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  Crop
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <MediaPosition
            id={id}
            axis="left"
            label="Left"
            rawValue={details.left}
            baseSize={baseW}
            transform={details.transform}
          />
          <MediaPosition
            id={id}
            axis="top"
            label="Top"
            rawValue={details.top}
            baseSize={baseH}
            transform={details.transform}
          />
        </div>
        {/*<div className="flex gap-2">*/}
        {/*  <LayoutSkew id={id} field="skewX" label="Skew X" value={details.skewX} />*/}
        {/*  <LayoutSkew id={id} field="skewY" label="Skew Y" value={details.skewY} />*/}
        {/*</div>*/}
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

// The lying field: displays base * |scale| for the given axis, and on
// commit solves scale = displayed / base, preserving sign (so flips don't
// get clobbered) and leaving the other axis's scale untouched. `base` is
// whatever the caller passes in — LayoutMediaControls now passes the
// crop-aware size, so this component itself doesn't need to know crop exists.
const MediaDimension = ({
  axis,
  label,
  baseValue,
  transform,
  isLinked,
  onCommit
}: {
  axis: "width" | "height";
  label: string;
  baseValue: number | undefined;
  transform: string | undefined;
  isLinked: boolean;
  onCommit: (axis: "width" | "height", nextDisplay: number) => void;
}) => {
  const base = baseValue ?? 0;
  const [scaleX, scaleY] = getScaleXY(transform);
  const currentScale = axis === "width" ? scaleX : scaleY;
  const displayValue = Math.round(base * Math.abs(currentScale));

  const [localValue, setLocalValue] = useState<string | number>(displayValue);

  useEffect(() => {
    setLocalValue(displayValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayValue]);

  const commit = (nextDisplay: number) => {
    if (base <= 0) return; // nothing to solve a scale against
    onCommit(axis, nextDisplay);
  };

  const handleBlur = () => {
    if (localValue === "") {
      setLocalValue(displayValue);
      return;
    }
    const num = Number(localValue);
    // same guard as the real width/height field — never commit a
    // 0-or-negative size, snap back to the last valid value instead
    if (!Number.isNaN(num) && num > 0) {
      commit(num);
    } else {
      setLocalValue(displayValue);
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

// Same class of lie as MediaDimension, for the same reason: media is
// scaled around its own center (transformOrigin: center center), so
// details.left/top (the UNSCALED box's position) doesn't match where the
// visible edges actually land once a scale is applied. This shows the
// effective on-screen position and, on edit, solves for the raw left/top
// that would produce it — scale itself is untouched by this field.
// `baseSize` is crop-aware (passed in from LayoutMediaControls), so the
// offset math below is already correct whether or not a crop is active.
const MediaPosition = ({
  id,
  axis,
  label,
  rawValue,
  baseSize,
  transform
}: {
  id: string;
  axis: "left" | "top";
  label: string;
  rawValue: number | string | undefined;
  baseSize: number | undefined;
  transform: string | undefined;
}) => {
  const raw = parseNumeric(rawValue);
  const base = baseSize ?? 0;
  const [scaleX, scaleY] = getScaleXY(transform);
  const scale = Math.abs(axis === "left" ? scaleX : scaleY);
  const offset = (base * (1 - scale)) / 2;
  const effectiveValue = Math.round(raw + offset);

  const [localValue, setLocalValue] = useState<string | number>(effectiveValue);

  useEffect(() => {
    setLocalValue(effectiveValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveValue]);

  const commit = (nextEffective: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            [axis]: nextEffective - offset
          }
        }
      }
    });
  };

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") {
      setLocalValue(effectiveValue);
      return;
    }
    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      commit(num);
    } else {
      setLocalValue(effectiveValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && localValue !== "-" && !Number.isNaN(num)) {
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

const parseNumeric = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  const parsed = parseFloat(v ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
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
      payload: { [id]: { details: { [field]: v } } }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(value ?? 0));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) onChange(num);
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
      payload: { [id]: { details: { rotate: `${v}deg` } } }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(parseRotate(value)));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) onChange(num);
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