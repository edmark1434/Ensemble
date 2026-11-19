import { tourBlockId, useTourDemo } from "@/features/editor/store/use-tour-demo";
import React, { useEffect } from "react";
import { useWorkspaceVisible } from "./workspace/workspace-button";
import { Access } from "./control-item/common/access";
import { ControlItem } from "./control-item";
import useLayoutStore from "./store/use-layout-store";
import { CommentsPanel } from "./comments/comments-panel";
import { WorkspacePanel } from "./workspace/workspace-panel";
import { SavesPanel } from "./saves/saves-panel";

export const RightPanelContent = ({
  panelRef,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const { activeRightItem, setActiveRightItem } = useLayoutStore();
  const tourAccess = useTourDemo(s => s.access);
  const workspaceVisible = useWorkspaceVisible();
  useEffect(() => {
    if (activeRightItem === "workspace" && !workspaceVisible) setActiveRightItem("controls");
  }, [activeRightItem, workspaceVisible, setActiveRightItem]);

  return (
    <div data-editor-tour="right-panel" ref={panelRef} className="bg-card w-full flex flex-none h-full relative">
      <div className="flex w-full h-full">
        {activeRightItem === "controls" && (tourAccess ? <div data-editor-tour="sample-access" className="h-fit w-full overflow-hidden p-4"><Access blockId={tourBlockId} /></div> : <ControlItem />)}
        {activeRightItem === "comments" && <CommentsPanel />}
        {activeRightItem === "workspace" && workspaceVisible && <WorkspacePanel />}
        {activeRightItem === "saves" && <SavesPanel />}
      </div>
    </div>
  );
};
