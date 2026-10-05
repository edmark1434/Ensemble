import React, { useEffect, useState } from "react";

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const Avatar = ({
  name,
  avatarUrl
}: {
  name: string;
  avatarUrl?: string | null;
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
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200">
      {getInitials(name)}
    </div>
  );
};