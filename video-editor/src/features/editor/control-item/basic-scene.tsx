import { ScrollArea } from "@/components/ui/scroll-area";
import { SceneControls } from "./common/scene-controls";
import { patchBlock } from "./common/composition-controls";
import useStore from "../store/use-store";
import {patchProjectSceneDetails} from "@/features/editor/collab/remote-patch";
import {useViewOnly} from "@/features/editor/hooks/use-view-only";
import {Eye} from "lucide-react";
import React from "react";

const BasicScene = () => {
  const {
    activeSceneBlockId,
    activeSceneItemId,
    currentBlockName,
    setCurrentBlockName,
    size,
    background,
    setState,
    collabSchema,
    collabOrigin,
    projectId,
    userId,
  } = useStore();

  const handleNameCommit = async (name: string) => {
    if (!activeSceneBlockId) return;
    const previous = currentBlockName ?? "";
    setCurrentBlockName(name);
    if (collabSchema && collabOrigin) {
      collabSchema.doc.transact(() => {
        collabSchema.meta.set("projectName", name);
      }, collabOrigin);
    }
    try {
      await Promise.all([
        patchBlock(activeSceneBlockId, { name }),
        activeSceneItemId
          ? patchProjectSceneDetails(projectId, activeSceneItemId, userId, { name })
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Failed to save scene name", err);
      setCurrentBlockName(previous);
    }
  };

  const handleSizeCommit = async (width: number, height: number) => {
    if (!activeSceneBlockId) return;
    const previous = size;
    setState({ size: { width, height } });
    try {
      await patchBlock(activeSceneBlockId, { width, height });
    } catch (err) {
      console.error("Failed to save scene size", err);
      setState({ size: previous });
    }
  };

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
          <SceneControls
            name={currentBlockName ?? ""}
            onNameCommit={handleNameCommit}
            size={size}
            onSizeCommit={handleSizeCommit}
            background={background.value}
            onBackgroundChange={(v) => setState({ background: { type: "color", value: v } })}
            disabled={viewOnly}
          />
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicScene;