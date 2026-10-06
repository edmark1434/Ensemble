import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const Avatar = ({
  name,
  avatarUrl,
  className
}: {
  name: string;
  avatarUrl?: string | null;
  // Overrides the default h-9 w-9 (and anything else), e.g. "h-6 w-6 text-[10px]".
  className?: string;
}) => {
  // Falls back to initials when there's no avatar or the image fails to load.
  const [failed, setFailed] = useState(false);

  // A new URL (e.g. after a refresh) deserves a fresh attempt.
  useEffect(() => setFailed(false), [avatarUrl]);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn("h-9 w-9 shrink-0 rounded-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};