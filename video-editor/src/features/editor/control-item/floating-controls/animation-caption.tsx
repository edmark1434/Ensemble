import { Ban, X } from "lucide-react";
import { EDIT_OBJECT } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animation, presets } from "../../player/animated";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/use-click-outside";
import { PresetName } from "../../player/animated/presets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { groupCaptionItems } from "./caption-preset-picker";
import useStore from "../../store/use-store";
import { LazyCaptionPresetPreview } from "@/features/editor/control-item/floating-controls/animation-preview/caption/preview-scene";
import {
  isExcludedForCaptions
} from "@/features/editor/control-item/floating-controls/animation-preview/caption/preview-exclusions";

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
  const isNoneSelected = !firstItem?.animations?.in;

  const isAnimationActive = (presetName: PresetName) =>
    captionItemIds.some((id) => trackItemsMap[id]?.animations?.in?.name === presetName);

  const applyAnimation = (presetName: PresetName) => {
    if (!captionItemIds.length) {
      console.warn("No caption items to apply the animation to.");
      return;
    }
    const presetAnimation = presets[presetName];
    const composition: Animation[] = [{ ...presetAnimation, durationInFrames: 4 }];

    const payload = captionItemIds.reduce(
      (acc, id) => ({ ...acc, [id]: { animations: { in: { name: presetName, composition } } } }),
      {}
    );
    dispatch(EDIT_OBJECT, { payload });
  };

  const clearAnimation = () => {
    if (!captionItemIds.length) return;
    const payload = captionItemIds.reduce(
      (acc, id) => ({ ...acc, [id]: { animations: { in: undefined } } }),
      {}
    );
    dispatch(EDIT_OBJECT, { payload });
  };

  const idsKey = captionItemIds.join(",");
  const presetButtons = useMemo(() => {
    const noneButton = (
      <div
        key="none"
        className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
        onClick={clearAnimation}
      >
        <div
          className={cn(
            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800 group",
            isNoneSelected ? "border border-primary" : ""
          )}
        >
          <Ban className="text-muted-foreground" size={24} />
        </div>
        <div>None</div>
      </div>
    );

    const buttons = Object.keys(presets)
      .filter((key) => key.includes("In"))
      .filter((key) => !isExcludedForCaptions(key))
      .map((presetKey) => {
        const preset = presets[presetKey as "scaleIn"];
        const isSelected = isAnimationActive(presetKey as PresetName);

        return (
          <div
            key={presetKey}
            className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
            onClick={() => applyAnimation(presetKey as PresetName)}
          >
            <div
              className={cn(
                "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800 group",
                isSelected ? "border border-primary" : ""
              )}
            >
              <LazyCaptionPresetPreview presetKey={presetKey as PresetName} type="in" />
            </div>
            <div>{preset.name}</div>
          </div>
        );
      });

    return [noneButton, ...buttons];
  }, [idsKey, firstItem?.animations?.in?.name]);

  const floatingRef = useRef<HTMLDivElement>(null);
  useClickOutside(floatingRef as React.RefObject<HTMLElement>, () => setFloatingControl(""));

  return (
    <div
      ref={floatingRef}
      className="w-xs bg-card border flex flex-col rounded-lg"
    >
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">Animations</p>
        <X className="h-4 w-4 cursor-pointer text-muted-foreground" onClick={() => setFloatingControl("")} />
      </div>

      <ScrollArea className="h-[400px] w-full px-4">
        <div className="grid grid-cols-2 gap-2 pb-4">{presetButtons}</div>
      </ScrollArea>
    </div>
  );
};

export default AnimationCaption;