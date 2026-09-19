import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Check, ChevronDown, Info, Users } from "lucide-react";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import useBlockMembersStore from "@/features/editor/store/use-block-members-store";

type GeneralAccessOption =
  | "Anyone can edit"
  | "Anyone can comment"
  | "Anyone can view"
  | "Restricted";

const GENERAL_ACCESS_OPTIONS: GeneralAccessOption[] = [
  "Anyone can edit",
  "Anyone can comment",
  "Anyone can view",
  "Restricted"
];

// Same popover-list pattern used by the font controls (e.g. word break,
// font style) — a button trigger with a checkmark against the active option.
const SelectPopover = ({
  value,
  options,
  onChange,
  disabled = false
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex w-full items-center justify-between text-sm font-normal"
          variant="outline"
          disabled={disabled}
        >
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">{value}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[300] p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        {options.map((option) => (
          <div
            key={option}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
            className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
          >
            {option}
            {option === value && (
              <Check size={14} className="text-muted-foreground" />
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export const Access = ({ blockId }: { blockId: string }) => {
  // General access is still local-only — it isn't part of block_members.
  const [generalAccess, setGeneralAccess] = useState<string>("Anyone can edit");
  const { floatingControl, setFloatingControl } = useLayoutStore();
  const {
    blockId: loadedBlockId,
    status,
    owner,
    members,
    canManage,
    load
  } = useBlockMembersStore();

  useEffect(() => {
    void load(blockId);
  }, [blockId, load]);

  const summary = (() => {
    // The store may still be holding the previously selected scene for a
    // render or two — don't show its numbers under this scene's name.
    if (loadedBlockId !== blockId || status === "idle" || status === "loading") {
      return "Loading…";
    }
    if (status === "error") return "Couldn't load";

    const others = members.length;
    if (canManage) {
      return others === 0
        ? "Only you"
        : `You and ${others} other${others === 1 ? "" : "s"}`;
    }
    const total = others + (owner ? 1 : 0);
    return `${total} ${total === 1 ? "person" : "people"}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Access</Label>

      <div className="flex gap-2 items-start text-xs text-muted-foreground -mt-1 text-pretty">
        <Info size={16} className="shrink-0" />
        <span>Only the scene owner can control access inside a scene</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">General</div>
          <SelectPopover
            value={generalAccess}
            options={GENERAL_ACCESS_OPTIONS}
            onChange={setGeneralAccess}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Specific</div>
          {/* Opens the same floating panel system as the font/animation
              pickers — the add-people field and the user list both live
              there, see ./floating/access-picker */}
          <Button
            variant="outline"
            className="flex w-full items-center justify-between text-sm font-normal"
            onClick={() => {
              const next = floatingControl === "access-picker" ? "" : "access-picker";
              setFloatingControl(next);
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden text-left">
              {/*<Users size={14} className="text-muted-foreground shrink-0" />*/}
              <p className="truncate">{summary}</p>
            </div>
            <ChevronDown className="text-muted-foreground" size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Access;