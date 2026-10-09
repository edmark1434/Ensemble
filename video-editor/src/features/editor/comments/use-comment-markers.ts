import { useMemo } from "react";
import { useCommentsStore } from "../store/use-comments-store";

export type CommentMarker = { id: string; timeMs: number; type: "comment"; color?: string };

export function useCommentMarkers(): CommentMarker[] {
  const data = useCommentsStore((s) => s.data);
  return useMemo(
    () =>
      (data?.threads ?? [])
        .filter((t) => t.timeMs != null)
        .map((t) => ({ id: t.id, timeMs: t.timeMs as number, type: "comment" as const })),
    [data],
  );
}