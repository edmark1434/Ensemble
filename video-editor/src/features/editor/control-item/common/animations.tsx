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
import { useCaptionAnimationSummary } from "./animation-caption";
import {useMixedValue} from "@/features/editor/hooks/use-mixed-value";

interface PresetTextProps {
  trackItem: ITrackItem & any;
  properties: any;
  disabled?: boolean;
  showLoop?: boolean;
  ids?: string[];
  captionIds?: string[];
  animationType?: "text" | "media"; // override for groups — don't infer from a single representative item
}

export const Animations = ({
  properties,
  trackItem,
  disabled = false,
  showLoop = true,
  ids,
  captionIds,
  animationType
}: PresetTextProps) => {
  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Animations</Label>
      <SelectaAnimation
        trackItem={trackItem}
        disabled={disabled}
        showLoop={showLoop}
        ids={ids}
        captionIds={captionIds}
        animationType={animationType ?? undefined}
      />
    </div>
  );
};

const SelectaAnimation = ({ trackItem, disabled, showLoop, ids, captionIds, animationType }: {
  trackItem: ITrackItem & IText;
  disabled: boolean;
  showLoop: boolean;
  ids?: string[];
  captionIds?: string[];
  animationType?: "text" | "media";
}) => {
  const { setFloatingControl, setAnimationPickerInitialTab, setFloatingControlIds } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();
  const activeIds = useStore((state) => state.activeIds);
  const trackItemsMap = useStore((state) => state.trackItemsMap);
  const targetIds = ids && ids.length > 0 ? ids : activeIds;

  const {
    inDuration,
    outDuration,
    loopDuration,
    maxValues,
    handleInChange,
    handleOutChange,
  } = useAnimationDuration(targetIds);

  const hasCaptions = !!captionIds && captionIds.length > 0;
  const { label: captionLabel } = useCaptionAnimationSummary(hasCaptions ? captionIds! : []);

  const { value: inName, isMixed: inMixed } = useMixedValue<string>(
    targetIds,
    (item) => item?.animations?.in?.name ?? "none"
  );
  const { value: outName, isMixed: outMixed } = useMixedValue<string>(
    targetIds,
    (item) => item?.animations?.out?.name ?? "none"
  );
  const { value: loopName, isMixed: loopMixed } = useMixedValue<string>(
    targetIds,
    (item) => item?.animations?.loop?.name ?? "none"
  );

  const hasInAnimation = !inMixed && !!inName && inName !== "none";
  const hasOutAnimation = !outMixed && !!outName && outName !== "none";

  const [inputIn, setInputIn] = useState(String(formatearNumero(inDuration / 1000)));
  const [inputLoop, setInputLoop] = useState(String(formatearNumero(loopDuration / 1000)));
  const [inputOut, setInputOut] = useState(String(formatearNumero(outDuration / 1000)));

  useEffect(() => { setInputIn(String(formatearNumero(inDuration / 1000))); }, [inDuration]);
  useEffect(() => { setInputLoop(String(formatearNumero(loopDuration / 1000))); }, [loopDuration]);
  useEffect(() => { setInputOut(String(formatearNumero(outDuration / 1000))); }, [outDuration]);

  const resolvedAnimationType: "text" | "media" =
    animationType ?? (trackItem.type === "text" ? "text" : "media");

  const openPicker = (tab: "in" | "out" | "loop") => {
    setAnimationPickerInitialTab(tab);
    setFloatingControlIds(targetIds, resolvedAnimationType);
    setFloatingControl("animation-picker");
  };

  const openCaptionPicker = () => {
    setFloatingControlIds(captionIds ?? []);
    setFloatingControl("animation-caption");
  };

  const presetInButtons = createPresetButtons(
    (key) => key.includes("In"),
    "in",
    targetIds,
    resolvedAnimationType,
    trackItemsMap
  );
  const presetOutButtons = createPresetButtons(
    (key) => key.includes("Out"),
    "out",
    targetIds,
    resolvedAnimationType,
    trackItemsMap
  );
  const presetLoopButtons = createPresetButtons(
    (key) => key.includes("Loop"),
    "loop",
    targetIds,
    resolvedAnimationType,
    trackItemsMap
  );

  const getAnimationLabel = (type: "in" | "out" | "loop") => {
    const map = {
      in: { name: inName, mixed: inMixed },
      out: { name: outName, mixed: outMixed },
      loop: { name: loopName, mixed: loopMixed }
    };
    const { name, mixed } = map[type];
    if (mixed) return "Mixed";
    if (!name || name === "none") return "None";
    return presets[name as keyof typeof presets]?.name ?? "None";
  };

  return (
    <div className="flex flex-col gap-3">
      {isLargeScreen ? (
        <>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-1 items-center text-xs text-muted-foreground">
                In
              </div>
              <div className="relative w-full">
                <Button
                  className="flex w-full items-center justify-between text-sm font-normal"
                  variant="outline"
                  onClick={() => openPicker("in")}
                >
                  <div className="w-full text-left">
                    <p className="truncate">{getAnimationLabel("in")}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </div>
            </div>
            {hasInAnimation && (
              <DurationInputSlider
                label="Duration"
                valueMs={inDuration}
                maxMs={maxValues.in}
                onChangeMs={handleInChange}
                disabled={disabled}
              />
            )}
          </div>

          {showLoop && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-1 items-center text-xs text-muted-foreground">
                  Loop
                </div>
                <div className="relative w-full">
                  <Button
                    className="flex w-full items-center justify-between text-sm font-normal"
                    variant="outline"
                    onClick={() => openPicker("loop")}
                  >
                    <div className="w-full text-left">
                      <p className="truncate">{getAnimationLabel("loop")}</p>
                    </div>
                    <ChevronDown className="text-muted-foreground" size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-1 items-center text-xs text-muted-foreground">
                Out
              </div>
              <div className="relative w-full">
                <Button
                  className="flex w-full items-center justify-between text-sm font-normal"
                  variant="outline"
                  onClick={() => openPicker("out")}
                >
                  <div className="w-full text-left">
                    <p className="truncate">{getAnimationLabel("out")}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </div>
            </div>
            {hasOutAnimation && (
              <DurationInputSlider
                label="Duration"
                valueMs={outDuration}
                maxMs={maxValues.out}
                onChangeMs={handleOutChange}
                disabled={disabled}
              />
            )}
          </div>

          {hasCaptions && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-1 items-center text-xs text-muted-foreground">
                  Captions
                </div>
                <div className="relative w-full">
                  <Button
                    className="flex w-full items-center justify-between text-sm font-normal"
                    variant="outline"
                    onClick={openCaptionPicker}
                    disabled={disabled}
                  >
                    <div className="w-full text-left">
                      <p className="truncate">{captionLabel}</p>
                    </div>
                    <ChevronDown className="text-muted-foreground" size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex w-full flex-col gap-6">
          <Tabs defaultValue="in" className="w-full">
            <TabsList className="p-0 grid w-full" style={{
              gridTemplateColumns: `repeat(${2 + (showLoop ? 1 : 0) + (hasCaptions ? 1 : 0)}, 1fr)`
            }}>
              <TabsTrigger value="in">In</TabsTrigger>
              {showLoop && <TabsTrigger value="loop">Loop</TabsTrigger>}
              <TabsTrigger value="out">Out</TabsTrigger>
              {hasCaptions && <TabsTrigger value="captions">Captions</TabsTrigger>}
            </TabsList>
            <TabsContent value="in">
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                  {presetInButtons}
                </div>
              </ScrollArea>
            </TabsContent>
            {showLoop && (
              <TabsContent value="loop">
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                    {presetLoopButtons}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
            <TabsContent value="out">
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 py-4">
                  {presetOutButtons}
                </div>
              </ScrollArea>
            </TabsContent>
            {hasCaptions && (
              <TabsContent value="captions">
                <div className="flex flex-col gap-2 py-4">
                  <Button
                    className="flex w-full items-center justify-between text-sm font-normal"
                    variant="outline"
                    onClick={openCaptionPicker}
                    disabled={disabled}
                  >
                    <p className="truncate">{captionLabel}</p>
                    <ChevronDown className="text-muted-foreground" size={14} />
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
};