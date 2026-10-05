// features/editor/hooks/use-editor-role.ts
//
// Resolves the viewer's effective role for whatever's currently open:
// the project role at the root, scene access (project role capped by general
// access, plus any specific membership) once inside a scene. Re-resolves on
// every scene switch, since access can change between clicks — same reasoning
// as canOpenScene — and keeps re-checking while something stays open (timer +
// tab focus), since roles can change while someone's inside.

import { useEffect, useRef, useState } from "react";
import { getSceneRoleStrict } from "@/features/editor/utils/scene-access";
import { EditorRole, StoredProjectRole, toEditorRole } from "@/features/editor/types/editor-role";
import { onAccessChanged } from "@/features/editor/collab/access-events";

const ROLE_REFRESH_MS = 30_000;

// undefined = couldn't tell: keep whatever we have. null = not a member (any more).
async function fetchProjectRole(projectId: string): Promise<EditorRole | null | undefined> {
  try {
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    if (res.status === 403) return null;
    if (!res.ok) return undefined;
    const data = await res.json();
    return toEditorRole(data.role as StoredProjectRole | undefined);
  } catch {
    return undefined;
  }
}

export function useEditorRole(
  projectId: string | null | undefined,
  activeSceneBlockId: string | null | undefined,
  viewerUserId: string | null | undefined,
  initialProjectRole: EditorRole | null,
  onSceneAccessLost?: () => void,
  onProjectAccessLost?: () => void,
): EditorRole | null {
  const targetKey = activeSceneBlockId ?? "root";
  const [resolved, setResolved] = useState<{ key: string; role: EditorRole | null }>({
    key: "root",
    role: initialProjectRole,
  });
  const lostRef = useRef(onSceneAccessLost);
  lostRef.current = onSceneAccessLost;
  const projectLostRef = useRef(onProjectAccessLost);
  projectLostRef.current = onProjectAccessLost;

  useEffect(() => {
    if (!viewerUserId) return;
    const uid = viewerUserId;
    let cancelled = false;

    const commit = (key: string, role: EditorRole | null) =>
      setResolved((prev) => (prev.key === key && prev.role === role ? prev : { key, role }));

    const resolveScene = async (blockId: string) => {
      const role = await getSceneRoleStrict(blockId, uid);
      if (cancelled || role === undefined) return;
      commit(blockId, role);
      if (role !== null) return;

      // No scene access: just this scene, or the whole project?
      const projectRole = projectId ? await fetchProjectRole(projectId) : undefined;
      if (cancelled) return;
      if (projectRole === null) projectLostRef.current?.();
      else lostRef.current?.();
    };

    const resolveProject = async (pid: string) => {
      const fresh = await fetchProjectRole(pid);
      if (cancelled || fresh === undefined) return;
      commit("root", fresh);
      if (fresh === null) projectLostRef.current?.();
    };

    const resolve = (): Promise<void> => {
      if (activeSceneBlockId) return resolveScene(activeSceneBlockId);
      if (projectId) return resolveProject(projectId);
      return Promise.resolve();
    };

    if (!activeSceneBlockId) commit("root", initialProjectRole);
    void resolve();

    const timer = setInterval(() => void resolve(), ROLE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void resolve();
    };
    document.addEventListener("visibilitychange", onVisible);
    const offAccess = onAccessChanged(() => void resolve());

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      offAccess();
    };
  }, [projectId, activeSceneBlockId, viewerUserId, initialProjectRole]);

  if (resolved.key === targetKey) return resolved.role;
  return activeSceneBlockId ? null : initialProjectRole;
}