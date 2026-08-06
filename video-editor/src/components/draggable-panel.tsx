import React, { useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { useDraggable } from "@/hooks/use-draggable";
import { cn } from "@/lib/utils";

interface DraggablePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** If provided, the panel spawns `anchorGap`px to the left of this element
   *  instead of wherever Radix's own popper placement lands it. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  anchorGap?: number;
}

export function DraggablePanel({
                                 title,
                                 onClose,
                                 children,
                                 className,
                                 anchorRef,
                                 anchorGap = 16
                               }: DraggablePanelProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { offset, setOffset, dragHandleProps } = useDraggable(nodeRef);

  useLayoutEffect(() => {
    if (!anchorRef?.current || !nodeRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const panelRect = nodeRef.current.getBoundingClientRect();
    // panelRect is still untransformed here (offset is {0,0} on first mount),
    // so panelRect.left/top IS the panel's origin — same trick FloatingControl
    // uses with its hidden measure pass, just without needing a second render.
    const desiredLeft = anchorRect.left - anchorGap - panelRect.width;
    const desiredTop = anchorRect.top + anchorGap;
    setOffset({
      x: desiredLeft - panelRect.left,
      y: desiredTop - panelRect.top
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={nodeRef}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className={cn("pointer-events-auto flex flex-col gap-4 rounded-lg border bg-card p-4", className)}
    >
      <div
        className="handle flex cursor-grab select-none items-center justify-between active:cursor-grabbing"
        style={{ touchAction: "none" }}
        {...dragHandleProps}
      >
        <p className="text-sm font-semibold">{title}</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
      {children}
    </div>
  );
}