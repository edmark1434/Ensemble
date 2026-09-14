import { ScrollArea } from "@/components/ui/scroll-area";
import { SceneControls } from "./common/scene-controls";
import { patchBlock } from "./common/composition-controls";
import { patchBlockMeta } from "../collab/remote-patch";
import { applySceneDetailsPatch } from "../collab/scene-content-sync";
import useStore from "../store/use-store";
import type { ITrackItem } from "@designcombo/types";
import type { ISceneDetails } from "../types/ensemble-scene";

interface BasicSceneItemProps {
  trackItem: ITrackItem & { details: ISceneDetails };
}

const BasicSceneItem = ({ trackItem }: BasicSceneItemProps) => {
  const { collabSchema, collabOrigin, projectId, userId } = useStore();
  const { blockId, name, content } = trackItem.details;

  const handleNameCommit = async (nextName: string) => {
    if (!collabSchema || !collabOrigin) return;
    const previous = name ?? "";
    applySceneDetailsPatch(collabSchema, trackItem.id, { name: nextName }, collabOrigin);
    try {
      await Promise.all([
        patchBlockMeta(projectId, blockId, userId, { projectName: nextName }),
        patchBlock(blockId, { name: nextName }),
      ]);
    } catch (err) {
      console.error("Failed to save scene name", err);
      applySceneDetailsPatch(collabSchema, trackItem.id, { name: previous }, collabOrigin);
    }
  };

  const handleSizeCommit = async (width: number, height: number) => {
    try {
      await Promise.all([
        patchBlockMeta(projectId, blockId, userId, { size: { width, height } }),
        patchBlock(blockId, { width, height }),
      ]);
    } catch (err) {
      console.error("Failed to save scene size", err);
    }
  };

  const handleBackgroundChange = async (value: string) => {
    try {
      await patchBlockMeta(projectId, blockId, userId, {
        background: { type: "color", value },
      });
    } catch (err) {
      console.error("Failed to save scene background", err);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          <SceneControls
            name={name ?? ""}
            onNameCommit={handleNameCommit}
            // size={content?.size}
            // onSizeCommit={handleSizeCommit}
            // background={content?.background?.value}
            // onBackgroundChange={handleBackgroundChange}
          />
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicSceneItem;