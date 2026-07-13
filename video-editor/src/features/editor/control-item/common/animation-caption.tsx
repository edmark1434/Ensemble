import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import useLayoutStore from "../../store/use-layout-store";
import useStore from "../../store/use-store";
import { Label } from "@/components/ui/label";
import { presets } from "../../player/animated";
import {groupCaptionItems} from "@/features/editor/control-item/floating-controls/caption-preset-picker";

const AnimationCaption = () => {
  const { setFloatingControl, trackItem } = useLayoutStore();
  const { trackItemsMap } = useStore();
  const [captionItemIds, setCaptionItemIds] = useState<string[]>([]);

  useEffect(() => {
    const groupedCaptions = groupCaptionItems(trackItemsMap);
    const currentGroupItems = groupedCaptions[trackItem?.metadata?.sourceUrl ?? ""];
    setCaptionItemIds(currentGroupItems?.map((item) => item.id) ?? []);
  }, [trackItemsMap, trackItem]);

  const firstItem = trackItemsMap[captionItemIds[0]];
  const activeAnimationName = firstItem?.animations?.in?.name;
  const label = activeAnimationName
    ? (presets[activeAnimationName as keyof typeof presets]?.name ?? activeAnimationName)
    : "None";

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">Animation</Label>

      <div className="flex flex-col gap-2 flex-1">
        <Button
          className="flex w-full items-center justify-between text-sm"
          variant="outline"
          onClick={() => setFloatingControl("animation-caption")}
        >
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">{label}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
};

export default AnimationCaption;