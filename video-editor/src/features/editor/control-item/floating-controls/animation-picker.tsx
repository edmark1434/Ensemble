import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADD_ANIMATION } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import useStore from "../../store/use-store";
import { Animation, presets } from "../../player/animated";
import React, {useEffect, useRef, useState} from "react";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/use-click-outside";
import { Easing } from "remotion";
import { PresetName } from "../../player/animated/presets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimationDuration } from "../common/animation-duration";
import {cn} from "@/lib/utils";
import { LazyPresetPreview } from "./animation-preset-preview/preset-preview-scene";

export const createPresetButtons = (
  filter: (key: string) => boolean,
  type: "in" | "out" | "loop",
  activeIds: string[],
  animationType: "text" | "media",
  trackItemsMap: any
) =>
  Object.keys(presets)
    .filter(filter)
    .map((presetKey) => {
      const preset = presets[presetKey as "scaleIn"];

      if (
        animationType === "media" &&
        preset.property?.toLowerCase().includes("text")
      )
        return null;

      let isSelected = false;
      if (trackItemsMap) {
        const currentItem = trackItemsMap[activeIds[0]];
        const animations = currentItem?.animations;
        isSelected = ["in", "out", "loop"].some(
          (t) => animations?.[t]?.name === presetKey
        );
      }

      return (
        <div
          key={presetKey}
          className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
          onClick={() =>
            applyAnimation(presetKey as PresetName, type, activeIds, trackItemsMap)
          }
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

const applyAnimation = (
  presetName: PresetName,
  type: "in" | "out" | "loop",
  activeIds: string[],
  trackItemsMap: any
) => {
  if (!activeIds.length) {
    console.warn("No active ID to apply the animation to.");
    return;
  }
  const presetAnimation: any = presets[presetName];
  const composition: Animation[] = [presetAnimation];
  if (presetName.includes("rotate") && presetName.includes("In"))
    composition.push(presets.scaleIn);
  else if (presetName.includes("shake") && presetName.includes("In")) {
    const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
    const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
    composition[0].from = presetName.includes("Horizontal")
      ? shakeMovX
      : shakeMovY;
    composition[0].to = presetName.includes("Horizontal")
      ? -shakeMovX
      : -shakeMovY;
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
    const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
    const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
    composition[0].from = presetName.includes("Horizontal")
      ? -shakeMovX
      : -shakeMovY;
    composition[0].to = presetName.includes("Horizontal")
      ? shakeMovX
      : shakeMovY;
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
    payload: {
      id: activeIds[0],
      animations: {
        [type]: {
          name: presetName,
          composition
        }
      }
    }
  });
};
export default function AnimationPicker({
  animationType = "media"
}: {
  animationType?: "text" | "media";
}) {
  const { activeIds, trackItemsMap } = useStore();
  const { animationPickerInitialTab } = useLayoutStore();
  const [activeTab, setActiveTab] = useState<"in" | "out" | "loop">(animationPickerInitialTab);
  const currentItem = trackItemsMap[activeIds[0]];
  const hasCurrentTabAnimation = !!currentItem?.animations?.[activeTab];

  const presetInButtons = createPresetButtons(
    (key) => key.includes("In"),
    "in",
    activeIds,
    animationType,
    trackItemsMap
  );
  const presetOutButtons = createPresetButtons(
    (key) => key.includes("Out"),
    "out",
    activeIds,
    animationType,
    trackItemsMap
  );
  const presetLoopButtons = createPresetButtons(
    (key) => key.includes("Loop"),
    "loop",
    activeIds,
    animationType,
    trackItemsMap
  );
  const { setFloatingControl } = useLayoutStore();
  const floatingRef = useRef<HTMLDivElement>(null);

  useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
    setFloatingControl("")
  );
  return (
    <div
      ref={floatingRef}
      className="w-xs bg-card border flex flex-col rounded-lg"
    >
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-medium">Animations</p>
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
          <TabsTrigger value="loop">Loop</TabsTrigger>
          <TabsTrigger value="out">Out</TabsTrigger>
        </TabsList>

        <TabsContent value="in">
          <ScrollArea className="h-[400px] w-full px-4">
            <div className={`grid grid-cols-2 gap-2 ${hasCurrentTabAnimation ? "pb-0" : "pb-4"}`}>{presetInButtons}</div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="loop">
          <ScrollArea className="h-[400px] w-full px-4">
            <div className={`grid grid-cols-2 gap-2 ${hasCurrentTabAnimation ? "pb-0" : "pb-4"}`}>{presetLoopButtons}</div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="out">
          <ScrollArea className="h-[400px] w-full px-4">
            <div className={`grid grid-cols-2 gap-2 ${hasCurrentTabAnimation ? "pb-0" : "pb-4"}`}>{presetOutButtons}</div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      {hasCurrentTabAnimation && <AnimationDuration activeTab={activeTab} />}
    </div>
  );
}
