import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useEffect, useState } from "react";
import { Link, RotateCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LayoutGroupProps {
  items: (ITrackItem & any)[];
}

interface GroupBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const parseNumeric = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  const parsed = parseFloat(v ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const computeBounds = (items: (ITrackItem & any)[]): GroupBounds => {
  if (items.length === 0) return { left: 0, top: 0, width: 0, height: 0 };

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  items.forEach((item) => {
    const details = item.details ?? {};
    const left = parseNumeric(details.left);
    const top = parseNumeric(details.top);
    const width = parseNumeric(details.width);
    const height = parseNumeric(details.height);
    minLeft = Math.min(minLeft, left);
    minTop = Math.min(minTop, top);
    maxRight = Math.max(maxRight, left + width);
    maxBottom = Math.max(maxBottom, top + height);
  });

  return {
    left: minLeft,
    top: minTop,
    width: maxRight - minLeft,
    height: maxBottom - minTop
  };
};

const buildPayload = (
  ids: string[],
  detailsForId: (id: string) => Record<string, unknown>
) => {
  const payload: Record<string, { details: Record<string, unknown> }> = {};
  ids.forEach((id) => {
    payload[id] = { details: detailsForId(id) };
  });
  return payload;
};

export const LayoutGroup = ({ items }: LayoutGroupProps) => {
  const bounds = computeBounds(items);
  const itemIds = items.map((i) => i.id);

  const [localWidth, setLocalWidth] = useState<string | number>(Math.round(bounds.width));
  const [localHeight, setLocalHeight] = useState<string | number>(Math.round(bounds.height));
  const [localLeft, setLocalLeft] = useState<string | number>(Math.round(bounds.left));
  const [localTop, setLocalTop] = useState<string | number>(Math.round(bounds.top));
  const [localRotate, setLocalRotate] = useState<string | number>(0);

  useEffect(() => {
    setLocalWidth(Math.round(bounds.width));
    setLocalHeight(Math.round(bounds.height));
    setLocalLeft(Math.round(bounds.left));
    setLocalTop(Math.round(bounds.top));
    setLocalRotate(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.left, bounds.top, bounds.width, bounds.height]);

  // Group dimensions are always linked — resizing one axis scales the other
  // by the same factor for every item, and every item's position is scaled
  // around the group bounding box's top-left corner.
  const commitDimension = (field: "width" | "height", nextValue: number) => {
    if (nextValue <= 0 || items.length === 0) return;
    const current = field === "width" ? bounds.width : bounds.height;
    const factor = current > 0 ? nextValue / current : 1;

    dispatch(EDIT_OBJECT, {
      payload: buildPayload(itemIds, (id) => {
        const item = items.find((i) => i.id === id)!;
        const details = item.details ?? {};
        const itemLeft = parseNumeric(details.left);
        const itemTop = parseNumeric(details.top);
        const itemWidth = parseNumeric(details.width);
        const itemHeight = parseNumeric(details.height);
        return {
          width: Math.round(itemWidth * factor),
          height: Math.round(itemHeight * factor),
          left: Math.round(bounds.left + (itemLeft - bounds.left) * factor),
          top: Math.round(bounds.top + (itemTop - bounds.top) * factor)
        };
      })
    });
  };

  const commitPosition = (field: "left" | "top", nextValue: number) => {
    if (items.length === 0) return;
    const current = field === "left" ? bounds.left : bounds.top;
    const delta = nextValue - current;

    dispatch(EDIT_OBJECT, {
      payload: buildPayload(itemIds, (id) => {
        const item = items.find((i) => i.id === id)!;
        const details = item.details ?? {};
        const itemLeft = parseNumeric(details.left);
        const itemTop = parseNumeric(details.top);
        return field === "left"
          ? { left: Math.round(itemLeft + delta) }
          : { top: Math.round(itemTop + delta) };
      })
    });
  };

  // The group has no single rotation of its own — "Rotation" sets every
  // item to the same absolute angle, so the field resets to 0 whenever
  // the selection changes.
  const commitRotate = (value: number) => {
    if (items.length === 0) return;
    const next = ((value % 360) + 360) % 360;
    dispatch(EDIT_OBJECT, { payload: buildPayload(itemIds, () => ({ rotate: `${next}deg` })) });
    setLocalRotate(next);
  };

  const rotateBy90 = () => commitRotate((Number(localRotate) || 0) + 90);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Layout</Label>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex gap-2 flex-5">
            <GroupDimensionInput
              label="Width"
              value={localWidth}
              onChangeLocal={setLocalWidth}
              onCommit={(v) => commitDimension("width", v)}
              fallback={Math.round(bounds.width)}
            />
            <GroupDimensionInput
              label="Height"
              value={localHeight}
              onChangeLocal={setLocalHeight}
              onCommit={(v) => commitDimension("height", v)}
              fallback={Math.round(bounds.height)}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground"></div>
            <div className="flex gap-1 flex-1">
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    disabled
                    aria-label="Dimensions linked"
                    aria-pressed
                    className="flex-1 border-primary"
                  >
                    <Link size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" sideOffset={1} className="flex gap-2 items-center">
                  Group dimensions always scale together
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <GroupPositionInput
            label="Left"
            value={localLeft}
            onChangeLocal={setLocalLeft}
            onCommit={(v) => commitPosition("left", v)}
          />
          <GroupPositionInput
            label="Top"
            value={localTop}
            onChangeLocal={setLocalTop}
            onCommit={(v) => commitPosition("top", v)}
          />
        </div>
        <div className="flex gap-2">
          <GroupPositionInput
            label="Rotation"
            value={localRotate}
            onChangeLocal={setLocalRotate}
            onCommit={(v) => commitRotate(v)}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground"></div>
            <div className="flex gap-1 flex-1">
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={rotateBy90} className="flex-1">
                    <RotateCw size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" sideOffset={1} className="flex gap-2 items-center">
                  Rotate 90 degrees
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupDimensionInput = ({
  label,
  value,
  onChangeLocal,
  onCommit,
  fallback
}: {
  label: string;
  value: string | number;
  onChangeLocal: (v: string | number) => void;
  onCommit: (v: number) => void;
  fallback: number;
}) => {
  const commit = () => {
    if (value === "") {
      onChangeLocal(fallback);
      return;
    }
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      onCommit(num);
    } else {
      onChangeLocal(fallback);
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === "" || (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)) {
                onChangeLocal(newValue);
              }
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            className="border-primary"
          />
        </div>
      </div>
    </div>
  );
};

const GroupPositionInput = ({
  label,
  value,
  onChangeLocal,
  onCommit
}: {
  label: string;
  value: string | number;
  onChangeLocal: (v: string | number) => void;
  onCommit: (v: number) => void;
}) => {
  const commit = () => {
    if (value === "" || value === "-") return;
    const num = Number(value);
    if (!Number.isNaN(num)) onCommit(num);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === "" || newValue === "-" || !Number.isNaN(Number(newValue))) {
                onChangeLocal(newValue);
              }
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
          />
        </div>
      </div>
    </div>
  );
};