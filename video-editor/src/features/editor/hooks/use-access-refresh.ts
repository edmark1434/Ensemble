// features/editor/hooks/use-access-refresh.ts

import { useEffect, useRef } from "react";
import { onAccessChanged } from "@/features/editor/collab/access-events";

// Calls `refresh` ~150ms after the server pushes an access change, with a slow
// poll as a fallback. Only active while `enabled`.
export function useAccessRefresh(enabled: boolean, refresh: () => void, pollMs = 5_000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const off = onAccessChanged(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refreshRef.current(), 150);
    });
    const poll = setInterval(() => refreshRef.current(), pollMs);
    return () => {
      off();
      clearInterval(poll);
      if (t) clearTimeout(t);
    };
  }, [enabled, pollMs]);
}