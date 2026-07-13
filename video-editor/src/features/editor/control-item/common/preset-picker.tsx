import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ICaptionsControlProps,
  NONE_PRESET,
  STYLE_CAPTION_PRESETS,
  findMatchingCaptionPreset
} from "../floating-controls/caption-preset-picker";
import { LazyCaptionStylePresetPreview } from "../floating-controls/animation-preview/caption-preset/preview-scene";

interface PresetGridProps {
  presets: ICaptionsControlProps[];
  captionItemIds: string[];
  captionsData: any[];
  matchedPreset: ICaptionsControlProps | null;
  onPresetClick: (
    preset: ICaptionsControlProps,
    captionItemIds: string[],
    captionsData: any[]
  ) => void;
}

const PresetGrid = ({
                      presets,
                      captionItemIds,
                      captionsData,
                      matchedPreset,
                      onPresetClick
                    }: PresetGridProps) => (
  <div className="grid grid-cols-2 gap-2 pb-4">
    <div
      onClick={() => onPresetClick(NONE_PRESET, captionItemIds, captionsData)}
      className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
    >
      <div
        className={cn(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800 group",
          matchedPreset === NONE_PRESET ? "border border-primary" : ""
        )}
      >
        <Ban className="text-muted-foreground" size={24} />
      </div>
    </div>

    {presets.map((preset, index) => (
      <div
        key={index}
        onClick={() => onPresetClick(preset, captionItemIds, captionsData)}
        className="flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-start"
      >
        <div
          className={cn(
            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-800 group",
            matchedPreset === preset ? "border border-primary" : ""
          )}
        >
          <LazyCaptionStylePresetPreview preset={preset} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <div className="rounded-full p-1" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface PresetPickerProps {
  captionItemIds: string[];
  captionsData: any[];
  currentDetails?: any;
  onPresetClick: (
    preset: ICaptionsControlProps,
    captionItemIds: string[],
    captionsData: any[]
  ) => void;
  className?: string;
}

export const PresetPicker = ({
                               captionItemIds,
                               captionsData,
                               currentDetails,
                               onPresetClick,
                               className = ""
                             }: PresetPickerProps) => {
  const wordPresets = STYLE_CAPTION_PRESETS.filter((preset) => preset.type === "word");
  const linePresets = STYLE_CAPTION_PRESETS.filter((preset) => preset.type !== "word");
  const matchedPreset = useMemo(
    () => findMatchingCaptionPreset(currentDetails),
    [currentDetails]
  );

  return (
    <Tabs defaultValue="words" className={`w-full ${className}`}>
      <TabsList className="h-9 mx-4 w-[calc(100%-32px)] grid grid-cols-2">
        <TabsTrigger value="words">Words</TabsTrigger>
        <TabsTrigger value="lines">Lines</TabsTrigger>
      </TabsList>

      <TabsContent value="words">
        <ScrollArea className="h-[400px] w-full px-4">
          <PresetGrid
            presets={wordPresets}
            captionItemIds={captionItemIds}
            captionsData={captionsData}
            matchedPreset={matchedPreset}
            onPresetClick={onPresetClick}
          />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="lines">
        <ScrollArea className="h-[400px] w-full px-4">
          <PresetGrid
            presets={linePresets}
            captionItemIds={captionItemIds}
            captionsData={captionsData}
            matchedPreset={matchedPreset}
            onPresetClick={onPresetClick}
          />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};