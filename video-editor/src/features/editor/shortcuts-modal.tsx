"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Kbd, KbdGroup} from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  label: string;
  keys: string[];
  disabled?: boolean;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    title: "Global",
    items: [
      { label: "Play or pause", keys: ["Space"] },

      { label: "Select all", keys: ["Ctrl", "A"] },

      { label: "Copy", keys: ["Ctrl", "C"] },
      { label: "Duplicate", keys: ["Ctrl", "D"] },
      { label: "Cut", keys: ["Ctrl", "X"] },
      { label: "Paste", keys: ["Ctrl", "V"] },

      { label: "Delete", keys: ["Del"] },

      { label: "Undo", keys: ["Ctrl", "Z"] },
      { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
    ]
  },
  {
    title: "Timeline",
    items: [
      { label: "Maximize or minimize", keys: ["`"] },

      { label: "Zoom in", keys: ["Ctrl", "+"] },
      { label: "Zoom out", keys: ["Ctrl", "-"] },
      { label: "Zoom to fit", keys: ["Shift", "Z"] },

      { label: "Last frame", keys: ["Ctrl", "🡠"] },
      { label: "Next frame", keys: ["Ctrl", "🡢"] },

      { label: "Jump by 1s", keys: ["Ctrl", "Shift", "🡠 or 🡢"] },

      { label: "Jump to start", keys: ["Home"] },
      { label: "Jump to end", keys: ["End"] },
    ]
  },
  {
    title: "Timeline",
    items: [
      { label: "Add or remove markers", keys: ["M"] },
      { label: "Jump to last marker", keys: ["Ctrl", "Shift", "M"] },
      { label: "Jump to next marker", keys: ["Shift", "M"] },

      { label: "Split", keys: ["Ctrl", "B"] },
      { label: "Delete left", keys: ["Q"], disabled: true },
      { label: "Delete right", keys: ["W"], disabled: true },

      { label: "Extend to playhead", keys: ["Shift", "E"], disabled: true },
      { label: "Move to playhead", keys: ["Ctrl", "Shift", "E"], disabled: true },
    ]
  },
  {
    title: "Canvas",
    items: [
      { label: "Full screen", keys: ["F"], disabled: true },
      { label: "Mute preview", keys: ["Ctrl", "M"], disabled: true },

      { label: "Move up 1 px", keys: ["🡡"] },
      { label: "Move down 1 px", keys: ["🡣"] },
      { label: "Move left 1 px", keys: ["🡠"] },
      { label: "Move right 1 px", keys: ["🡢"] },

      { label: "Move 5 px", keys: ["Shift", "Arrow Keys"] }
    ]
  }
];

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-6xl w-full max-w-5xl border bg-card px-2 py-8 gap-6 overflow-hidden">
        <DialogHeader className="px-6 -mt-0.75 flex flex-row gap-4">
          <DialogTitle className="text-md font-medium">Keyboard shortcuts</DialogTitle>
          <KbdGroup>
            <Kbd className="bg-zinc-800 border-zinc-700 text-zinc-300 min-w-6">
              Ctrl
            </Kbd>
            <span>+</span>
            <Kbd className="bg-zinc-800 border-zinc-700 text-zinc-300 min-w-6">
              /
            </Kbd>
          </KbdGroup>
        </DialogHeader>
        <div className="px-6">
          <div className="grid grid-cols-4 gap-12">
            {SHORTCUTS.map((category, index) => (
              <div
                key={category.title + index}
                className="flex flex-col gap-6 relative"
              >
                <h3
                  className={cn(
                    "text-sm font-medium",
                    index > 0 && SHORTCUTS[index - 1].title === category.title && "invisible"
                  )}
                >
                  {category.title}
                </h3>
                <div className="flex flex-col gap-5">
                  {category.items.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center justify-between text-sm",
                        item.disabled ? "opacity-40" : ""
                      )}
                    >
                      <span className="text-zinc-300">{item.label}</span>
                      <div className="flex gap-5">
                        <KbdGroup>
                          {item.keys.map((key, i) => (
                            <React.Fragment key={i}>
                              <Kbd className="bg-zinc-800 border-zinc-700 text-zinc-300 min-w-6">
                                {key}
                              </Kbd>
                              {i < item.keys.length - 1 && <span>+</span>}
                            </React.Fragment>
                          ))}
                        </KbdGroup>
                      </div>
                    </div>
                  ))}
                </div>
                {index < SHORTCUTS.length - 1 && SHORTCUTS[index + 1].title !== category.title && (
                  <>
                    <div className="md:hidden">
                      <Separator className="my-4 bg-zinc-800" />
                    </div>
                    <div className="hidden md:block absolute -right-6 top-0 bottom-0 w-[1px] bg-zinc-800" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
