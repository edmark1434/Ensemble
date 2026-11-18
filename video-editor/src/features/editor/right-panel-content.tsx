import React, { useEffect } from "react";
import { useWorkspaceVisible } from "./workspace/workspace-button";
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
  const workspaceVisible = useWorkspaceVisible();
  useEffect(() => {
    if (activeRightItem === "workspace" && !workspaceVisible) setActiveRightItem("controls");
  }, [activeRightItem, workspaceVisible, setActiveRightItem]);

  return (
    <div ref={panelRef} className="bg-card w-full flex flex-none h-full relative">
      <div className="flex w-full h-full">
        {activeRightItem === "controls" && <ControlItem />}
        {activeRightItem === "comments" && <CommentsPanel />}
        {activeRightItem === "workspace" && workspaceVisible && <WorkspacePanel />}
        {activeRightItem === "saves" && <SavesPanel />}
      </div>
    </div>
  );
};
