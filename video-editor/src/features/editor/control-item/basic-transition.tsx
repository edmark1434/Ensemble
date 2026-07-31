import { ScrollArea } from "@/components/ui/scroll-area";
import { TransitionControls } from "./common/transition-controls";

interface ITransitionLike {
  id: string;
  kind: string;
  duration: number;
  direction?: string;
}

const BasicTransition = ({ transition }: { transition: ITransitionLike }) => {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-6 p-4 min-w-0">
          <TransitionControls id={transition.id} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default BasicTransition;