// features/editor/hooks/use-editor-role.ts
//
// Resolves the viewer's effective role for whatever's currently open:
// the server-seeded project role at the root, scene access (general +
// specific) once inside a scene. Re-resolves on every scene switch, since
// access can change between clicks — same reasoning as canOpenScene.

import { useEffect, useState } from "react";
import { getSceneRole } from "@/features/editor/utils/scene-access";
import type { EditorRole } from "@/features/editor/types/editor-role";

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

    if (!activeSceneBlockId) {
      setRole(initialProjectRole);
      return;
    }
    const blockId = activeSceneBlockId;

    let cancelled = false;
    (async () => {
      const resolved = await getSceneRole(blockId, uid);
      if (!cancelled) setRole(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, activeSceneBlockId, viewerUserId, initialProjectRole]);

  return role;
}