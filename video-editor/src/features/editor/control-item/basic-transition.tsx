import { ScrollArea } from "@/components/ui/scroll-area";
import { TransitionControls } from "./common/transition-controls";
import {useViewOnly} from "@/features/editor/hooks/use-view-only";
import {Eye} from "lucide-react";

interface ITransitionLike {
  id: string;
  kind: string;
  duration: number;
  direction?: string;
}

const BasicTransition = ({ transition }: { transition: ITransitionLike }) => {
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
          <TransitionControls id={transition.id} disabled={viewOnly} />
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicTransition;