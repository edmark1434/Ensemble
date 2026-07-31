import { ScrollArea } from "@/components/ui/scroll-area";
import { IAudio, ITrackItem } from "@designcombo/types";
import React, {useEffect, useState} from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { Lock } from "lucide-react";
import { PlaybackControls } from "./common/playback";

const BasicAudio = ({
  trackItem,
  type
}: {
  trackItem: ITrackItem & IAudio;
  type?: string;
}) => {
  const showAll = !type;
  const [properties, setProperties] = useState(trackItem);

  useEffect(() => {
    setProperties(trackItem);
  }, [trackItem.id, trackItem.details, trackItem.playbackRate]);

  const handleChangeVolume = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            volume: v
          }
        }
      }
    });

    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          volume: v
        }
      };
    });
  };

  const handleChangeSpeed = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          playbackRate: v
        }
      }
    });

    setProperties((prev) => {
      return {
        ...prev,
        playbackRate: v
      };
    });
  };

  const isLocked = (trackItem.details as any)?.locked === true;

  const components = [
    {
      key: "playback",
      component: (
        <PlaybackControls
          speed={properties.playbackRate ?? 1}
          volume={properties.details.volume ?? 100}
          onChangeSpeed={handleChangeSpeed}
          onChangeVolume={handleChangeVolume}
          disabled={isLocked}
        />
      )
    }
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset disabled={isLocked} className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          {isLocked && (
            <div className="flex gap-2 items-center text-primary text-sm font-normal">
              <Lock size={16} />
              <span>
                This item has been locked
              </span>
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

export default BasicAudio;