import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { IText, ITrackItem } from "@designcombo/types";
import { Label } from "@/components/ui/label";
import useLayoutStore from "../../store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useStore from "../../store/use-store";
import { createPresetButtons } from "../floating-controls/animation-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatearNumero, useAnimationDuration } from "../../hooks/use-animation-duration";
import { presets } from "../../player/animated";
import {DurationInputSlider} from "@/features/editor/control-item/common/duration-input-slider";

interface PresetTextProps {
  trackItem: ITrackItem & any;
  properties: any;
}

export const Animations = ({ properties, trackItem }: PresetTextProps) => {
  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">Animations</Label>
      <SelectaAnimation trackItem={trackItem} />
    </div>
  );
};

const SelectaAnimation = ({ trackItem }: { trackItem: ITrackItem & IText }) => {
  const { setFloatingControl, setAnimationPickerInitialTab } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();
  const { activeIds, trackItemsMap } = useStore();
  const {
    inDuration,
    outDuration,
    loopDuration,
    maxValues,
    handleInChange,
    handleOutChange,
    handleLoopChange
  } = useAnimationDuration();

  const [inputIn, setInputIn] = useState(
    String(formatearNumero(inDuration / 1000))
  );
  const [inputLoop, setInputLoop] = useState(
    String(formatearNumero(loopDuration / 1000))
  );
  const [inputOut, setInputOut] = useState(
    String(formatearNumero(outDuration / 1000))
  );

  useEffect(() => {
    setInputIn(String(formatearNumero(inDuration / 1000)));
  }, [inDuration]);
  useEffect(() => {
    setInputLoop(String(formatearNumero(loopDuration / 1000)));
  }, [loopDuration]);
  useEffect(() => {
    setInputOut(String(formatearNumero(outDuration / 1000)));
  }, [outDuration]);

  const handleDurationInput = (
    value: string,
    setLocal: (v: string) => void,
    max: number,
    onChange: (duration: number) => void
  ) => {
    setLocal(value);
    if (value === "") return;
    const seconds = Number(value);
    if (Number.isNaN(seconds) || seconds < 0) return;
    const ms = Math.min(seconds * 1000, Math.max(0, max));
    onChange(ms);
  };

  const openPicker = (tab: "in" | "out" | "loop") => {
    setAnimationPickerInitialTab(tab);
    setFloatingControl("animation-picker");
  };

  const presetInButtons = createPresetButtons(
    (key) => key.includes("In"),
    "in",
    activeIds,
    trackItem.type === "text" ? "text" : "media",
    trackItemsMap
  );
  const presetOutButtons = createPresetButtons(
    (key) => key.includes("Out"),
    "out",
    activeIds,
    trackItem.type === "text" ? "text" : "media",
    trackItemsMap
  );
  const presetLoopButtons = createPresetButtons(
    (key) => key.includes("Loop"),
    "loop",
    activeIds,
    trackItem.type === "text" ? "text" : "media",
    trackItemsMap
  );

  const getAnimationLabel = (type: "in" | "out" | "loop") => {
    const currentItem = trackItemsMap[activeIds[0]];
    const presetKey = currentItem?.animations?.[type]?.name;
    if (!presetKey) return "None";
    return presets[presetKey as keyof typeof presets]?.name ?? "None";
  };

  return (
    <div className="flex flex-col gap-2">
      {isLargeScreen ? (
        <>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-1 items-center text-xs text-muted-foreground">
                In Animation
              </div>
              <div className="relative w-full">
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="secondary"
                  onClick={() => openPicker("in")}
                >
                  <div className="w-full text-left">
                    <p className="truncate">{getAnimationLabel("in")}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </div>
            </div>
            <DurationInputSlider
              label="In Duration"
              valueMs={inDuration}
              maxMs={maxValues.in}
              onChangeMs={handleInChange}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-1 items-center text-xs text-muted-foreground">
                Loop Animation
              </div>
              <div className="relative w-full">
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="secondary"
                  onClick={() => openPicker("loop")}
                >
                  <div className="w-full text-left">
                    <p className="truncate">{getAnimationLabel("loop")}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </div>
            </div>
            <DurationInputSlider
              label="Loop Duration"
              valueMs={loopDuration}
              maxMs={maxValues.loop}
              onChangeMs={handleLoopChange}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-1 items-center text-xs text-muted-foreground">
                Out Animation
              </div>
              <div className="relative w-full">
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="secondary"
                  onClick={() => openPicker("out")}
                >
                  <div className="w-full text-left">
                    <p className="truncate">{getAnimationLabel("out")}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </div>
            </div>
            <DurationInputSlider
              label="Out Duration"
              valueMs={outDuration}
              maxMs={maxValues.out}
              onChangeMs={handleOutChange}
            />
          </div>
        </>
      ) : (
        <div className="flex w-full flex-col gap-6">
          <Tabs defaultValue="in" className="w-full">
            <TabsList className="p-0 grid w-full grid-cols-3">
              <TabsTrigger value="in">In</TabsTrigger>
              <TabsTrigger value="loop">Loop</TabsTrigger>
              <TabsTrigger value="out">Out</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                  {presetInButtons}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="loop">
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                  {presetLoopButtons}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="out">
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                  {presetOutButtons}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};