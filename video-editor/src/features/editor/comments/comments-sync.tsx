import { useEffect, useMemo } from "react";
import useStore from "../store/use-store";
import { useCommentsStore } from "../store/use-comments-store";
import { useComments } from "./use-comments";
import type { CollabTarget } from "@/features/editor/collab/collab-target";

export function CommentsSync() {
  const projectId = useStore((s) => s.projectId);
  const blockId = useStore((s) => s.activeSceneBlockId);
  const sync = useCommentsStore((s) => s.sync);

  const target = useMemo<CollabTarget | null>(
    () =>
      blockId ? { kind: "block", id: blockId }
        : projectId ? { kind: "project", id: projectId }
          : null,
    [blockId, projectId],
  );

  const { data, error, post, remove, upload, setStatus } = useComments(target);
  useEffect(() => {
    sync({ data, error, post, remove, upload, setStatus });
  }, [data, error, post, remove, upload, setStatus, sync]);

  return null;
}