import { useEffect, useState } from "react";
import type {EditorRole, StoredProjectRole} from "@/features/editor/types/editor-role";
import { onAccessChanged } from "@/features/editor/collab/access-events";

const REFRESH_MS = 30_000;

export function useProjectRole(projectId: string | null | undefined): StoredProjectRole | null {
  const [role, setRole] = useState<StoredProjectRole | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const resolve = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 403) {
          setRole(null);
          return;
        }
        if (!res.ok) return; // couldn't tell: keep what we have
        const data = await res.json();
        if (!cancelled) setRole((data.role as StoredProjectRole | undefined) ?? null);
      } catch {
        // keep current role
      }
    };

    void resolve();
    const timer = setInterval(() => void resolve(), REFRESH_MS);
    const off = onAccessChanged(() => void resolve());
    return () => {
      cancelled = true;
      clearInterval(timer);
      off();
    };
  }, [projectId]);

  return role;
}