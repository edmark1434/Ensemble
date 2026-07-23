import React from "react";
import { Ban } from "lucide-react";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRANSITIONS } from "../data/transitions";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";

export const Transitions = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  return (
    <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col gap-2 p-4">
        <p className="text-center text-xs text-muted-foreground">
          Add a transition by dragging a preset between two clips in the timeline
        </p>
      </div>

      <ScrollArea className="flex-1 px-4 h-full">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 pb-4">
          {TRANSITIONS.map((transition, index) => (
            <TransitionsMenuItem
              key={index}
              transition={transition}
              shouldDisplayPreview={!isDraggingOverTimeline}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const TransitionsMenuItem = ({
  transition,
  shouldDisplayPreview
}: {
  transition: Partial<any>;
  shouldDisplayPreview: boolean;
}) => {
  const isNone = transition.kind === "none";

  const previewStyle = React.useMemo(
    () =>
      isNone
        ? undefined
        : ({
          backgroundImage: `url(${transition.preview})`,
          backgroundSize: "cover"
        } as React.CSSProperties),
    [transition.preview, isNone]
  );

  return (
    <Draggable
      data={transition}
      renderCustomPreview={
        <div
          className="flex aspect-square w-30 items-center justify-center rounded-md bg-zinc-800 border border-primary"
          style={previewStyle}
        >
          {isNone && <Ban className="text-muted-foreground" size={24} />}
        </div>
      }
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div className="w-full flex flex-col gap-2">
        <div
          className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-zinc-800 group"
          style={previewStyle}
          draggable={false}
        >
          {isNone && <Ban className="text-muted-foreground" size={24} />}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <div className="rounded-full p-1" />
          </div>
        </div>
        <div className="flex w-full items-center justify-center text-center overflow-hidden text-ellipsis whitespace-nowrap text-[12px] capitalize text-muted-foreground">
          {transition.name || transition.kind}
        </div>
      </div>
    </Draggable>
  );
};

export default Transitions;