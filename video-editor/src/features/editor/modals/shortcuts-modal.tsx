"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { useViewOnly } from "../hooks/use-view-only";
import { useCanComment } from "../hooks/use-can-comment";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  label: string;
  keys: string[];
  alt?: string[];
  disabled?: boolean;
  access?: "view" | "comment";
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    title: "Global",
    items: [
      { label: "Play or pause", keys: ["Space"], access: "view" },

      { label: "Select all", keys: ["Ctrl", "A"] },

      { label: "Copy", keys: ["Ctrl", "C"] },
      { label: "Duplicate", keys: ["Ctrl", "D"] },
      { label: "Cut", keys: ["Ctrl", "X"] },
      { label: "Paste", keys: ["Ctrl", "V"] },

      { label: "Delete", keys: ["Backspace"], alt: ["Del"] },

      { label: "Undo", keys: ["Ctrl", "Z"] },
      { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
    ]
  },
  {
    title: "Timeline",
    items: [
      { label: "Toggle timeline height", keys: ["`"], access: "view" },

      { label: "Zoom in", keys: ["="], alt: ["+"], access: "view" },
      { label: "Zoom out", keys: ["-"], access: "view" },
      { label: "Zoom to fit", keys: ["Shift", "Z"], access: "view" },

      { label: "Go to last frame", keys: ["Ctrl", "🡠"] },
      { label: "Go to next frame", keys: ["Ctrl", "🡢"] },

      { label: "Jump 1s back", keys: ["Ctrl", "Shift", "🡠"] },
      { label: "Jump 1s ahead", keys: ["Ctrl", "Shift", "🡢"] },
    ]
  },
  {
    title: "Timeline",
    items: [
      { label: "Jump to start", keys: ["Home"], access: "view" },
      { label: "Jump to end", keys: ["End"], access: "view" },

      { label: "Split", keys: ["Ctrl", "B"] },
      { label: "Delete left", keys: ["Q"] },
      { label: "Delete right", keys: ["W"] },

      { label: "Extend to playhead", keys: ["Shift", "E"] },
      { label: "Move to playhead", keys: ["Ctrl", "Shift", "E"] },
    ]
  },
  {
    title: "Collaboration",
    items: [
      { label: "Add scene", keys: ["S"] },
      { label: "Go back from scene", keys: ["H"], access: "view" },

      { label: "Add or remove markers", keys: ["M"] },
      { label: "Go to last marker", keys: ["M", "🡠"], access: "view" },
      { label: "Go to next marker", keys: ["M", "🡢"], access: "view" },

      { label: "Add comment", keys: ["C"], access: "comment" },
      { label: "Jump to last comment", keys: ["C", "🡠"], access: "comment" },
      { label: "Jump to next comment", keys: ["C", "🡢"], access: "comment" },
    ]
  },
  {
    title: "Canvas",
    items: [
      { label: "Toggle fullscreen", keys: ["F"], access: "view" },
      { label: "Mute preview", keys: ["Ctrl", "M"], access: "view" },

      { label: "Move up 1 px", keys: ["🡡"] },
      { label: "Move down 1 px", keys: ["🡣"] },
      { label: "Move left 1 px", keys: ["🡠"] },
      { label: "Move right 1 px", keys: ["🡢"] },

      { label: "Move 5 px", keys: ["Shift", "Arrow Keys"] }
    ]
  }
];

const KeyCombo = ({ keys }: { keys: string[] }) => (
  <KbdGroup>
    {keys.map((key, i) => (
      <React.Fragment key={i}>
        <Kbd className="bg-zinc-800 border-zinc-700 text-zinc-300 min-w-6">
          {key}
        </Kbd>
        {i < keys.length - 1 && <span>+</span>}
      </React.Fragment>
    ))}
  </KbdGroup>
);

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const viewOnly = useViewOnly();
  const canComment = useCanComment();
  const shortcuts = SHORTCUTS.map((category) => ({
    ...category,
    items: category.items.filter((item) =>
      item.access === "view" || (item.access === "comment" ? canComment : !viewOnly)
    ),
  })).filter((category) => category.items.length > 0).reduce<ShortcutCategory[]>((columns, category) => {
    const timelineColumn = viewOnly && category.title === "Timeline"
      ? columns.find((column) => column.title === "Timeline")
      : undefined;
    if (timelineColumn) {
      timelineColumn.items.push(...category.items);
    } else {
      columns.push(category);
    }
    return columns;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[300] md:max-w-7xl w-full max-w-5xl border bg-card px-2 py-8 gap-6 overflow-hidden">
        <DialogHeader className="px-6 -mt-0.75 flex flex-row gap-4">
          <DialogTitle className="text-md font-semibold">Keyboard shortcuts</DialogTitle>
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
          {/* gap-8 (32px) between columns of the same category; a category change adds ml-6 on top = 56px, divider sits at half (-right-7 = 28px) */}
          <div className="flex gap-8">
            {shortcuts.map((category, index) => (
              <div
                key={category.title + index}
                className={cn(
                  "flex flex-1 flex-col gap-6 relative",
                  index > 0 && shortcuts[index - 1].title !== category.title && "ml-6"
                )}
              >
                <h3
                  className={cn(
                    "text-sm font-semibold",
                    index > 0 && shortcuts[index - 1].title === category.title && "invisible"
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
                      <div className="flex items-center gap-1.5">
                        <KeyCombo keys={item.keys} />
                        {item.alt && (
                          <>
                            <span>/</span>
                            <KeyCombo keys={item.alt} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {index < shortcuts.length - 1 && shortcuts[index + 1].title !== category.title && (
                  <>
                    <div className="md:hidden">
                      <Separator className="my-4 bg-zinc-800" />
                    </div>
                    <div className="hidden md:block absolute -right-7 top-0 bottom-0 w-[1px] bg-zinc-800" />
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
