import React, { useEffect, useState } from "react";
import {
  IAudio,
  ICaption,
  IImage,
  IText,
  ITrackItem,
  ITrackItemAndDetails,
  IVideo
} from "@designcombo/types";
import type StateManager from "@designcombo/state";
import BasicText from "./basic-text";
import BasicImage from "./basic-image";
import BasicVideo from "./basic-video";
import BasicAudio from "./basic-audio";
import BasicCaption from "./basic-caption";
import BasicProject from "./basic-project";
import BasicTransition from "./basic-transition";
import BasicGroup from "./basic-group";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";

type Selection =
  | { type: "none" }
  | { type: "group" }
  | { type: "transition"; transition: any }
  | { type: "trackItem"; item: ITrackItem };

const ActiveControlItem = ({ selection }: { selection: Selection }) => {
  switch (selection.type) {
    case "none":
      return <BasicProject />;
    case "group":
      return <BasicGroup />;
    case "transition":
      return (
        <BasicTransition
          transition={selection.transition}
        />
      );
    case "trackItem": {
      const trackItem = selection.item as ITrackItemAndDetails;
      switch (trackItem.type) {
        case "text":
          return <BasicText trackItem={trackItem as ITrackItem & IText} />;
        case "caption":
          return <BasicCaption trackItem={trackItem as ITrackItem & ICaption} />
        case "image":
          return <BasicImage trackItem={trackItem as ITrackItem & IImage} />;
        case "video":
          return <BasicVideo trackItem={trackItem as ITrackItem & IVideo} />;
        case "audio":
          return <BasicAudio trackItem={trackItem as ITrackItem & IAudio} />;
        default:
          return null;
      }
    }
    default:
      return null;
  }
};

export const ControlItem = () => {
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [selection, setSelection] = useState<Selection>({ type: "none" });
  const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

  useEffect(() => {
    if (activeIds.length === 0) {
      setSelection({ type: "none" });
      setLayoutTrackItem(null);
      return;
    }

    if (activeIds.length > 1) {
      setSelection({ type: "group" });
      setLayoutTrackItem(null);
      return;
    }

    const [id] = activeIds;
    const item = trackItemsMap[id];
    if (item) {
      setSelection({ type: "trackItem", item });
      setLayoutTrackItem(item);
      return;
    }

    const transition = transitionsMap[id];
    if (transition) {
      setSelection({ type: "transition", transition });
      setLayoutTrackItem(null);
      return;
    }

    setSelection({ type: "none" });
    setLayoutTrackItem(null);
  }, [activeIds, trackItemsMap, transitionsMap, setLayoutTrackItem]);

  return (
    <div className="w-full flex-none bg-card hidden lg:block">
      <ActiveControlItem selection={selection} />
    </div>
  );
};