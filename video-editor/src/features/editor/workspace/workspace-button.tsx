import { BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useLayoutStore from "../store/use-layout-store";

export function WorkspaceButton() {
  const open = useLayoutStore(s => s.activeRightItem === "workspace");
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);
  return (
    <Tooltip delayDuration={10}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Workspace" aria-pressed={open}
          className={cn("hover:!bg-accent/30", open && "bg-accent/30")}
          onClick={() => setActiveRightItem(open ? "controls" : "workspace")}>
          <BriefcaseBusiness size={20} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={1}>
        {open ? "Close workspace" : "Workspace"}
      </TooltipContent>
    </Tooltip>
  );
}
