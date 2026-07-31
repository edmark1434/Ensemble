import {Ban, X} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {ADD_ANIMATION, EDIT_OBJECT} from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import useStore from "../../store/use-store";
import { Animation, presets } from "../../player/animated";
import React, {useEffect, useMemo, useRef, useState} from "react";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/use-click-outside";
import { Easing } from "remotion";
import { PresetName } from "../../player/animated/presets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimationDuration } from "../common/animation-duration";
import {cn} from "@/lib/utils";
import { LazyPresetPreview } from "@/features/editor/control-item/floating-controls/animation-preview/text/preview-scene";

export const createPresetButtons = (
  filter: (key: string) => boolean,
  type: "in" | "out" | "loop",
  ids: string[],
  animationType: "text" | "media",
  trackItemsMap: any
) => {
  const isNoneSelected = ids.every((id) => !trackItemsMap?.[id]?.animations?.[type]);

  const noneButton = (
    <div
      key="none"
      className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
      onClick={() => clearAnimation(type, ids, trackItemsMap)}
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

  const presetButtons = Object.keys(presets)
    .filter(filter)
    .map((presetKey) => {
      const preset = presets[presetKey as "scaleIn"];

      if (animationType === "media" && preset.property?.toLowerCase().includes("text"))
        return null;

      const isSelected = ids.every((id) => {
        const animations = trackItemsMap?.[id]?.animations;
        return ["in", "out", "loop"].some((t) => animations?.[t]?.name === presetKey);
      });

      return (
        <div
          key={presetKey}
          className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
          onClick={() => applyAnimation(presetKey as PresetName, type, ids, trackItemsMap)}
        >
          <div
            className={cn(
              "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800 group",
              isSelected ? "border border-primary" : ""
            )}
          >
            <LazyPresetPreview presetKey={presetKey as PresetName} type={type} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
              <div className="rounded-full p-1" />
            </div>
          </div>
          <div>{preset.name}</div>
        </div>
      );
    });

  return [noneButton, ...presetButtons];
};

const applyAnimation = (
  presetName: PresetName,
  type: "in" | "out" | "loop",
  ids: string[],
  trackItemsMap: any
) => {
  if (!ids.length) {
    console.warn("No active ID to apply the animation to.");
    return;
  }

  ids.forEach((id) => {
    // Spread instead of referencing presets[presetName] directly — the old
    // code mutated composition[0].from/.to on the shared preset object
    // itself, corrupting it for every future use of that preset.
    const presetAnimation: any = { ...presets[presetName] };
    const composition: Animation[] = [presetAnimation];

    if (presetName.includes("rotate") && presetName.includes("In")) {
      composition.push(presets.scaleIn);
    } else if (presetName.includes("shake") && presetName.includes("In")) {
      const shakeMovX = trackItemsMap[id].details.width / 6;
      const shakeMovY = trackItemsMap[id].details.height / 6;
      composition[0].from = presetName.includes("Horizontal") ? shakeMovX : shakeMovY;
      composition[0].to = presetName.includes("Horizontal") ? -shakeMovX : -shakeMovY;
      composition.push({
        property: "scale",
        from: 2,
        to: 1,
        durationInFrames: 30,
        ease: Easing.ease,
        previewUrl: "https://cdn.designcombo.dev/animations/ScaleIn.webp",
        name: "Scale"
      });
    } else if (presetName.includes("shake") && presetName.includes("Out")) {
      const shakeMovX = trackItemsMap[id].details.width / 6;
      const shakeMovY = trackItemsMap[id].details.height / 6;
      composition[0].from = presetName.includes("Horizontal") ? -shakeMovX : -shakeMovY;
      composition[0].to = presetName.includes("Horizontal") ? shakeMovX : shakeMovY;
      composition.push({
        property: "scale",
        from: 1,
        to: 2,
        durationInFrames: 30,
        ease: Easing.ease,
        previewUrl: "https://cdn.designcombo.dev/animations/ScaleOut.webp",
        name: "Scale"
      });
    }

    dispatch(ADD_ANIMATION, {
      payload: { id, animations: { [type]: { name: presetName, composition } } }
    });
  });
};

export const clearAnimation = (
  type: "in" | "out" | "loop",
  ids: string[],
  trackItemsMap: any
) => {
  if (!ids.length) {
    console.warn("No active ID to clear the animation from.");
    return;
  }

  const payload: Record<string, any> = {};
  ids.forEach((id) => {
    payload[id] = { animations: { [type]: undefined } };
  });

  dispatch(EDIT_OBJECT, { payload });
};

export default function AnimationPicker({
  animationType = "media"
}: {
  animationType?: "text" | "media";
}) {
  const { animationPickerInitialTab, floatingControlIds, setFloatingControl } = useLayoutStore();
  const activeIds = useStore((state) => state.activeIds);
  const trackItemsMap = useStore((state) => state.trackItemsMap);

  const targetIds = floatingControlIds && floatingControlIds.length > 0 ? floatingControlIds : activeIds;
  const currentItem = trackItemsMap[targetIds[0]];

  const [activeTab, setActiveTab] = useState<"in" | "out" | "loop">(animationPickerInitialTab);
  const hasCurrentTabAnimation = !!currentItem?.animations?.[activeTab];

  const idsKey = targetIds.join(",");
  const inKey = targetIds.map((id) => trackItemsMap[id]?.animations?.in?.name ?? "none").join(",");
  const outKey = targetIds.map((id) => trackItemsMap[id]?.animations?.out?.name ?? "none").join(",");
  const loopKey = targetIds.map((id) => trackItemsMap[id]?.animations?.loop?.name ?? "none").join(",");

  const presetInButtons = useMemo(
    () => createPresetButtons((key) => key.includes("In"), "in", targetIds, animationType, trackItemsMap),
    [idsKey, inKey, animationType]
  );
  const presetOutButtons = useMemo(
    () => createPresetButtons((key) => key.includes("Out"), "out", targetIds, animationType, trackItemsMap),
    [idsKey, outKey, animationType]
  );
  const presetLoopButtons = useMemo(
    () => createPresetButtons((key) => key.includes("Loop"), "loop", targetIds, animationType, trackItemsMap),
    [idsKey, loopKey, animationType]
  );

  const floatingRef = useRef<HTMLDivElement>(null);
  useClickOutside(floatingRef as React.RefObject<HTMLElement>, () => setFloatingControl(""));

  return (
    <div
      ref={floatingRef}
      className="w-xs bg-card border flex flex-col rounded-lg"
    >
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">Animations</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onClick={() => setFloatingControl("")}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "in" | "out" | "loop")}
        className="w-full"
      >
        <TabsList className="h-9 mx-4 w-[calc(100%-32px)]">
          <TabsTrigger value="in">In</TabsTrigger>
          {animationType === "text" && (
            <TabsTrigger value="loop">Loop</TabsTrigger>
          )}
          <TabsTrigger value="out">Out</TabsTrigger>
        </TabsList>

        <TabsContent value="in">
          <ScrollArea className="h-[400px] w-full px-4">
            <div className={`grid grid-cols-2 gap-2 ${hasCurrentTabAnimation ? "pb-0" : "pb-4"}`}>{presetInButtons}</div>
          </ScrollArea>
        </TabsContent>
        {animationType === "text" && (
          <TabsContent value="loop">
            <ScrollArea className="h-[400px] w-full px-4">
              <div className={`grid grid-cols-2 gap-2 pb-4`}>{presetLoopButtons}</div>
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="out">
          <ScrollArea className="h-[400px] w-full px-4">
            <div className={`grid grid-cols-2 gap-2 ${hasCurrentTabAnimation ? "pb-0" : "pb-4"}`}>{presetOutButtons}</div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      {hasCurrentTabAnimation && activeTab !== "loop" && <AnimationDuration activeTab={activeTab} />}
    </div>
  );
}
