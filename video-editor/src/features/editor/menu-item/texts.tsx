import { Button, buttonVariants } from "@/components/ui/button";
import { ADD_AUDIO, ADD_IMAGE, ADD_TEXT } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TEXT_PRESETS,
  getTextShadow
} from "../control-item/floating-controls/text-preset-picker";
import {PlusIcon} from "lucide-react";

export const Texts = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddText = () => {
    dispatch(ADD_TEXT, {
      payload: { ...TEXT_ADD_PAYLOAD, id: nanoid() },
      options: {}
    });
  };

  const handleAddAudio = () => {
    dispatch(ADD_AUDIO, {
      payload: {
        id: nanoid(),
        details: {
          src: "https://cdn.designcombo.dev/preset76.mp3"
        }
      },
      options: {}
    });
  };

  const handleAddImage = () => {
    dispatch(ADD_IMAGE, {
      payload: {
        id: nanoid(),
        details: {
          src: "https://cdn.designcombo.dev/rect-gray.png"
        }
      },
      options: {}
    });
  };

  const handleAddPresetText = (preset: any) => {
    dispatch(ADD_TEXT, {
      payload: {
        ...TEXT_ADD_PAYLOAD,
        id: nanoid(),
        details: {
          ...TEXT_ADD_PAYLOAD.details,
          ...preset,
          boxShadow: preset.boxShadow || {
            color: "transparent",
            x: 0,
            y: 0,
            blur: 0
          }
        }
      },
      options: {}
    });
  };

  const buildPresetPayload = (preset: any) => ({
    ...TEXT_ADD_PAYLOAD,
    id: nanoid(),
    details: {
      ...TEXT_ADD_PAYLOAD.details,
      ...preset,
      boxShadow: preset.boxShadow || {
        color: "transparent",
        x: 0,
        y: 0,
        blur: 0
      }
    }
  });

  return (
    <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col gap-2 p-4">
        <Draggable
          data={TEXT_ADD_PAYLOAD}
          renderCustomPreview={
            <Button variant="secondary" className="w-60">
              Add text
            </Button>
          }
          shouldDisplayPreview={!isDraggingOverTimeline}
        >
          <div
            onClick={handleAddText}
            className={cn(
              buttonVariants({ variant: "default" }),
              "cursor-pointer"
            )}
          >
            Add text
          </div>
        </Draggable>
      </div>

      <ScrollArea className="flex-1 px-4 h-full">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 pb-4">
          {TEXT_PRESETS.map((preset, index) => {
            const previewStyle = {
              backgroundColor: preset.backgroundColor,
              color: preset.color,
              borderRadius: `${preset.borderRadius / 3}px`,
              WebkitTextStroke: `2px ${preset.borderColor}`,
              paintOrder: "stroke fill",
              fontWeight: preset.fontWeight,
              textShadow: getTextShadow(preset.boxShadow)
            } as React.CSSProperties;

            return (
              <Draggable
                key={index}
                data={buildPresetPayload(preset)}
                renderCustomPreview={
                  <div className="flex aspect-square w-30 items-center justify-center rounded-md bg-zinc-800 border border-primary">
                    <div style={previewStyle} className="place-content-center px-2 text-2xl">
                      Text
                    </div>
                  </div>
                }
                shouldDisplayPreview={!isDraggingOverTimeline}
              >
                <div
                  onClick={() => handleAddPresetText(preset)}
                  className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-zinc-800 group"
                >
                  <div style={previewStyle} className="place-content-center px-2 text-2xl">
                    Text
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <div className="rounded-full p-1">
                    </div>
                  </div>
                </div>
              </Draggable>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};