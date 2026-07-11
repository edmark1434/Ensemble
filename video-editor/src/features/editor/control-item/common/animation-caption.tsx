import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import React from "react";
import useLayoutStore from "../../store/use-layout-store";
import { Label } from "@/components/ui/label";

const AnimationCaption = () => {
  const { setFloatingControl } = useLayoutStore();

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">Animation</Label>

      <div className="flex flex-col gap-2 flex-1">
        <Button
          className="flex w-full items-center justify-between text-sm"
          variant="outline"
          onClick={() => setFloatingControl("animation-caption")}
        >
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">None</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
};

export default AnimationCaption;