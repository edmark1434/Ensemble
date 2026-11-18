import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useLayoutStore from "../store/use-layout-store";
import { PlanIcon } from "../components/plan-icon";

// Rendered only for editors on large screens outside previews (see navbar).
export function SavesButton() {
  const open = useLayoutStore(s => s.activeRightItem === "saves");
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);
  return (
    <Tooltip delayDuration={10}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Saves" aria-pressed={open}
          className={cn("hover:!bg-accent/30", open && "bg-accent/30")}
          onClick={() => setActiveRightItem(open ? "controls" : "saves")}>
          <span className="relative inline-flex">
            <History size={20} />
            <PlanIcon plan="Premium" className="absolute -right-2 -top-2 size-3.5" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={1}>
        {open ? "Close saves" : "Saves"}
      </TooltipContent>
    </Tooltip>
  );
}
