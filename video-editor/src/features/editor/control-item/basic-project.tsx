import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectControls } from "./common/project-controls";
import {useViewOnly} from "@/features/editor/hooks/use-view-only";
import {Eye} from "lucide-react";

const BasicProject = () => {
  const viewOnly = useViewOnly();

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset disabled={viewOnly} className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          {viewOnly && (
            <div className="flex gap-2 items-center text-primary text-sm font-normal">
              <Eye size={16} />
              <span>
                You only have view access to controls
              </span>
            </div>
          )}
          <ProjectControls disabled={viewOnly} />
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicProject;