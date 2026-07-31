import { ScrollArea } from "@/components/ui/scroll-area";
import { CompositionControls } from "./common/composition-controls";

const BasicProject = () => {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          <CompositionControls />
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicProject;