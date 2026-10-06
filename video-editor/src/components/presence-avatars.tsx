"use client";

import React, { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import useStore from "../features/editor/store/use-store";
import { usePresentUsers, useMemberDirectory } from "../features/editor/hooks/use-present-users";

const MAX_VISIBLE = 3;
const HOVER_CLOSE_DELAY_MS = 120;

// Avatars of everyone else in the room the editor is connected to: the project
// while browsing it, the scene once you've opened one. Renders nothing when
// you're alone, same as Docs. Hovering (or tapping) opens the full list.
export default function PresenceAvatars({ className }: { className?: string }) {
  const projectId = useStore((s) => s.projectId);
  const inScene = useStore((s) => !!s.activeSceneBlockId);

  const users = usePresentUsers();
  const { directory, memberCount } = useMemberDirectory(
    projectId,
    users.map((u) => u.userId),
  );

  // A project with one member has nobody else to show. Until the members
  // response arrives (or if it fails), fall back to how many people are present.
  const soloProject = memberCount !== null ? memberCount <= 1 : users.length <= 1;
  const hidden = users.length === 0 || soloProject;

  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  };
  useEffect(() => cancelClose, []);

  // Everyone left, the room switched, or the project dropped to one member
  // while the list was open.
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  if (hidden) return null;

  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - visible.length;
  const heading = `${users.length} ${users.length === 1 ? "person" : "people"} ${inScene ? "in this scene" : "in this project"}`;

  return (
    <Popover open={open} onOpenChange={(next) => (next ? openNow() : (cancelClose(), setOpen(false)))}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={heading}
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className={cn(
            "items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <div className="flex -space-x-2">
            {visible.map((user) => {
              const info = directory.get(user.userId);
              return (
                // The presence color is the same one the timeline uses for
                // this person's selection / "inside" borders.
                <span
                  key={user.userId}
                  className="flex shrink-0 rounded-full p-[1px] ring-2 ring-background"
                  style={{ background: user.color }}
                >
                  <Avatar
                    name={info?.name ?? user.name}
                    avatarUrl={info?.avatarUrl}
                    className="h-8 w-8 text-[11px]"
                  />
                </span>
              );
            })}
            {overflow > 0 && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-200 ring-2 ring-background">
                +{overflow}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[250] w-64 p-0"
        onMouseEnter={cancelClose}
        onMouseLeave={closeSoon}
        // Opened by hover: don't steal focus from whatever the user is doing.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">{heading}</p>
        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[240px]">
          <div className="flex flex-col gap-4 px-4 py-3">
            {users.map((user) => {
              const info = directory.get(user.userId);
              const name = info?.name ?? user.name;
              const role = user.role ?? info?.role;
              return (
                <div key={user.userId} className="flex items-center gap-3">
                  <Avatar name={name} avatarUrl={info?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{user.isSelf ? `${name} (you)` : name}</p>
                    {role && <p className="truncate text-xs text-muted-foreground">{role}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}