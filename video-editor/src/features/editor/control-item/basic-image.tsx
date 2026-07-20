import { ScrollArea } from "@/components/ui/scroll-area";
import { IBoxShadow, IImage, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop, Lock } from "lucide-react";
import React, { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import { Animations } from "./common/animations";
import { Appearance } from "@/features/editor/control-item/common/appearance";
import { LayoutControls } from "@/features/editor/control-item/common/layout";
import {LayoutMediaControls} from "@/features/editor/control-item/common/layout-media";

interface IImageControlProps {
  opacity: number;
  borderRadius: number;
  blur: number;
  brightness: number;
}

const getPropertiesFromDetails = (
  details: (ITrackItem & IImage)["details"]
): IImageControlProps => ({
  opacity: details.opacity ?? 100,
  borderRadius: details.borderRadius ?? 0,
  blur: details.blur ?? 0,
  brightness: details.brightness ?? 100,
});

const BasicImage = ({
  trackItem,
  type
}: {
  trackItem: ITrackItem & IImage;
  type?: string;
}) => {
  const showAll = !type;
  const { setCropTarget } = useLayoutStore();

  const [properties, setProperties] = useState<IImageControlProps>(() =>
    getPropertiesFromDetails(trackItem.details)
  );

  useEffect(() => {
    setProperties(getPropertiesFromDetails(trackItem.details));
  }, [trackItem.details]);

  const onChangeBorderWidth = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { borderWidth: v } } }
    });
    setProperties((prev) => ({ ...prev, borderWidth: v }));
  };

  const onChangeBorderColor = (v: string) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { borderColor: v } } }
    });
    setProperties((prev) => ({ ...prev, borderColor: v }));
  };

  const handleChangeOpacity = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { opacity: v } } }
    });
    setProperties((prev) => ({ ...prev, opacity: v }));
  };

  const onChangeBlur = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { blur: v } } }
    });
    setProperties((prev) => ({ ...prev, blur: v }));
  };

  const onChangeBrightness = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { brightness: v } } }
    });
    setProperties((prev) => ({ ...prev, brightness: v }));
  };

  const onChangeBorderRadius = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { borderRadius: v } } }
    });
    setProperties((prev) => ({ ...prev, borderRadius: v }));
  };

  const onChangeBoxShadow = (boxShadow: IBoxShadow) => {
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { boxShadow } } }
    });
    setProperties((prev) => ({ ...prev, boxShadow }));
  };

  const isLocked = (trackItem.details as any)?.locked === true;

  const components = [
    {
      key: "layout",
      component: <LayoutMediaControls trackItem={trackItem} />
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
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <fieldset disabled={isLocked} className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
          {isLocked && (
            <div className="flex gap-2 items-center text-primary text-sm font-normal">
              <Lock size={16} />
              <span>This element has been locked</span>
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

export default BasicImage;