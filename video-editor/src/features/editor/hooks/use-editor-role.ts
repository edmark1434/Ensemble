// features/editor/hooks/use-editor-role.ts
//
// Resolves the viewer's effective role for whatever's currently open:
// the project role at the root, scene access (project role capped by general
// access, plus any specific membership) once inside a scene. Re-resolves on
// every scene switch, since access can change between clicks — same reasoning
// as canOpenScene — and keeps re-checking while something stays open (timer +
// tab focus), since roles can change while someone's inside.

import { useEffect, useState } from "react";
import { getSceneRole } from "@/features/editor/utils/scene-access";
import type { EditorRole } from "@/features/editor/types/editor-role";

const ROLE_REFRESH_MS = 30_000;

// undefined = couldn't tell (network error, expired session, 5xx): callers keep
// whatever role they already have. null = the server says they're not a
// member (any more).
async function fetchProjectRole(projectId: string): Promise<EditorRole | null | undefined> {
  try {
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    if (res.status === 403) return null;
    if (!res.ok) return undefined;
    const data = await res.json();
    return (data.role as EditorRole | undefined) ?? null;
  } catch {
    return undefined;
  }
}

export function useEditorRole(
  projectId: string | null | undefined,
  activeSceneBlockId: string | null | undefined,
  viewerUserId: string | null | undefined,
  initialProjectRole: EditorRole | null,
): EditorRole | null {
  const [role, setRole] = useState<EditorRole | null>(initialProjectRole);

  useEffect(() => {
    if (!viewerUserId) return;
    const uid = viewerUserId;

    let cancelled = false;
    let emptyRefreshes = 0;

    const resolveScene = async (blockId: string, isRefresh: boolean) => {
      const resolved = await getSceneRole(blockId, uid);
      if (cancelled) return;
      // getSceneRole also returns null on a network error, so one empty
      // refresh isn't enough to pull someone's edit rights mid-session;
      // two in a row is.
      if (resolved === null && isRefresh) {
        emptyRefreshes += 1;
        if (emptyRefreshes < 2) return;
      } else {
        emptyRefreshes = 0;
      }
      setRole(resolved);
    };

    const resolveProject = async (pid: string) => {
      const fresh = await fetchProjectRole(pid);
      if (cancelled || fresh === undefined) return;
      setRole(fresh);
    };

    const resolve = (isRefresh: boolean): Promise<void> => {
      if (activeSceneBlockId) return resolveScene(activeSceneBlockId, isRefresh);
      if (projectId) return resolveProject(projectId);
      return Promise.resolve();
    };

    // At the root, start from the seeded role (it can be stale after time
    // spent inside a scene), then correct it from the server right away.
    if (!activeSceneBlockId) setRole(initialProjectRole);
    void resolve(false);

    const timer = setInterval(() => void resolve(true), ROLE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void resolve(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [projectId, activeSceneBlockId, viewerUserId, initialProjectRole]);

  return role;
}