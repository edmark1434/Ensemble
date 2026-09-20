import React from "react";
import { ControlItem } from "./control-item";
import useLayoutStore from "./store/use-layout-store";

// Placeholder panels - swap these out for the real Comments/Saves
// implementations once they exist.
const CommentsPanel = () => (
  <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
    Comments are coming soon.
  </div>
);

const SavesPanel = () => (
  <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
    Save history is coming soon.
  </div>
);

export const RightPanelContent = ({
  panelRef,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const { activeRightItem } = useLayoutStore();

  return (
    <div ref={panelRef} className="bg-card w-full flex flex-none h-full relative">
      <div className="flex w-full h-full">
        {activeRightItem === "controls" && <ControlItem />}
        {activeRightItem === "comments" && <CommentsPanel />}
        {activeRightItem === "saves" && <SavesPanel />}
      </div>
    </div>
  );
};