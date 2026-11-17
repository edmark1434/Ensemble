import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useLayoutStore from "../store/use-layout-store";

import { useEffect } from "react";
import { create } from "zustand";
import useStore from "../store/use-store";
import { useViewOnly } from "../hooks/use-view-only";
import { useSnapshotPreview } from "../hooks/use-snapshot-preview";
import { useIsLargeScreen } from "@/hooks/use-media-query";

export const useWorkspaceAvailability = create<{ key: string; available: boolean }>(() => ({ key: "", available: false }));
export function useWorkspaceVisible() {
  const key = useStore(state => `${state.projectId}:${state.userId}`);
  const availability = useWorkspaceAvailability();
  const viewOnly = useViewOnly();
  const preview = useSnapshotPreview();
  const large = useIsLargeScreen();
  return !viewOnly && !preview && large && availability.key === key && availability.available;
}
export function WorkspaceButton() {
  const projectId = useStore(state => state.projectId);
  const userId = useStore(state => state.userId);
  const visible = useWorkspaceVisible();
  useEffect(() => {
    const controller = new AbortController();
    const key = `${projectId}:${userId}`;
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        const response = await fetch(`/api/projects/${projectId}/workspace`, { cache: "no-store", signal: controller.signal });
        if (response.status === 401 || response.status === 403) {
          if (!controller.signal.aborted) useWorkspaceAvailability.setState({ key, available: false });
          return;
        }
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) useWorkspaceAvailability.setState({ key, available: data.workspaces.length > 0 });
      } catch { /* Retry on focus or the next refresh. */ }
      finally { loading = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      useWorkspaceAvailability.setState({ key: "", available: false });
    };
  }, [projectId, userId]);
  const open = useLayoutStore(s => s.activeRightItem === "workspace");
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);
  if (!visible) return null;
  return (
    <Tooltip delayDuration={10}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Workspace" aria-pressed={open}
          className={cn("hover:!bg-accent/30", open && "bg-accent/30")}
          onClick={() => setActiveRightItem(open ? "controls" : "workspace")}>
          <Briefcase size={20} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={1}>
        {open ? "Close workspace" : "Workspace"}
      </TooltipContent>
    </Tooltip>
  );
}
