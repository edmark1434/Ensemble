import { ScrollArea } from "@/components/ui/scroll-area";
import {Info, Lock } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { ITrackItem } from "@designcombo/types";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";

import { SceneControls } from "./common/scene-controls";
import { patchBlock } from "./common/composition-controls";
import { patchBlockMeta } from "../collab/remote-patch";
import { applySceneDetailsPatch } from "../collab/scene-content-sync";
import useStore from "../store/use-store";
import type { ISceneDetails } from "../types/ensemble-scene";
import { Appearance } from "@/features/editor/control-item/common/appearance";
import { Animations } from "./common/animations";
import { LayoutMediaControls } from "@/features/editor/control-item/common/layout-media";
import { PlaybackControls } from "./common/playback";
import { Access } from "@/features/editor/control-item/common/access";

interface ISceneControlProps {
  opacity: number;
  borderRadius: number;
  blur: number;
  brightness: number;
  volume: number;
}

const getPropertiesFromDetails = (details: ISceneDetails): ISceneControlProps => ({
  opacity: details.opacity ?? 100,
  borderRadius: details.borderRadius ?? 0,
  blur: details.blur ?? 0,
  brightness: details.brightness ?? 100,
  volume: (details as any).volume ?? 100,
});

const BasicSceneItem = ({
  trackItem,
  type
}: {
  trackItem: ITrackItem & { details: ISceneDetails };
  type?: string;
}) => {
  const showAll = !type;
  const { collabSchema, collabOrigin, projectId, userId } = useStore();
  const { blockId, name } = trackItem.details;

  const [properties, setProperties] = useState<ISceneControlProps>(() =>
    getPropertiesFromDetails(trackItem.details)
  );

  useEffect(() => {
    setProperties(getPropertiesFromDetails(trackItem.details));
  }, [trackItem.details]);

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

  // Still wired for when the size/background controls come back on
  // SceneControls — both write through to the block, not the track item.
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

  const handleChangeVolume = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { volume: v } } }
    });
    setProperties((prev) => ({ ...prev, volume: v }));
  };

  const handleChangeSpeed = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { playbackRate: v } }
    });
  };

  const isLocked = (trackItem.details as any)?.locked === true;

  const components = [
    {
      key: "basic",
      component: (
        <>
          <SceneControls
            name={name ?? ""}
            onNameCommit={handleNameCommit}
            // size={content?.size}
            // onSizeCommit={handleSizeCommit}
            // background={content?.background?.value}
            // onBackgroundChange={handleBackgroundChange}
          />
          <div className="flex gap-2 items-start text-xs text-muted-foreground -mt-3 text-pretty">
            <Info size={16} />
            <span>Double-click the scene to edit scene size, background and content</span>
          </div>
        </>
      )
    },
    {
      // Scenes are scale-locked like media (resizable: false in target.ts),
      // so width/height here resolve to scaleX/scaleY — same panel, same
      // math, minus the crop button a scene has no use for.
      key: "layout",
      component: <LayoutMediaControls trackItem={trackItem} showCrop={false} />
    },
    {
      key: "appearance",
      component: (
        <Appearance
          id={trackItem.id}
          opacity={properties.opacity}
          cornerRadius={properties.borderRadius}
          blur={properties.blur}
          brightness={properties.brightness}
          disabled={isLocked}
        />
      )
    },
    {
      key: "playback",
      component: (
        <PlaybackControls
          speed={trackItem.playbackRate ?? 1}
          volume={properties.volume}
          onChangeSpeed={handleChangeSpeed}
          onChangeVolume={handleChangeVolume}
          disabled={isLocked}
        />
      )
    },
    {
      key: "animations",
      component: (
        <Animations
          trackItem={trackItem}
          properties={properties}
          disabled={isLocked}
          showLoop={false}
        />
      )
    },
    {
      key: "access",
      component: <Access blockId={blockId} />
    },
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset disabled={isLocked} className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          {isLocked && (
            <div className="flex gap-2 items-center text-primary text-sm font-normal">
              <Lock size={16} />
              <span>This item has been locked</span>
            </div>
          )}
          {components
            .filter((comp) => showAll || comp.key === type)
            .map((comp) => (
              <React.Fragment key={comp.key}>{comp.component}</React.Fragment>
            ))}
        </fieldset>
      </ScrollArea>
    </div>
  );
};

export default BasicSceneItem;