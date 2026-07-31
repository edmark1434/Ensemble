import { ColorPickerField } from "@/features/editor/control-item/common/color-picker-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { dispatchGroupEdit } from "@/features/editor/utils/dispatch-group-edit";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";
import { useEffect, useState } from "react";

interface ICaptionColors {
  color: string;
  backgroundColor: string;
  appearedColor: string;
  activeColor: string;
  activeFillColor: string;
  isKeywordColor: string;
  preservedColorKeyWord: boolean;
}

interface ICaptionColorsProps extends ICaptionColors {
  id: string;
  textLikeIds?: string[];
  captionIds?: string[];
  disabled?: boolean;
}

const CaptionColors = ({
  id,
  textLikeIds,
  captionIds,
  color,
  backgroundColor,
  appearedColor,
  activeColor,
  activeFillColor,
  isKeywordColor,
  preservedColorKeyWord,
  disabled = false,
}: ICaptionColorsProps) => {
  const targetTextLikeIds = textLikeIds && textLikeIds.length > 0 ? textLikeIds : [id];
  const targetCaptionIds = captionIds && captionIds.length > 0 ? captionIds : [id];

  const { isMixed: isColorMixed } = useMixedValue<string>(
    targetTextLikeIds,
    (item) => item.details?.color ?? "#ffffff"
  );
  const { isMixed: isBackgroundColorMixed } = useMixedValue<string>(
    targetTextLikeIds,
    (item) => item.details?.backgroundColor ?? "transparent"
  );
  const { isMixed: isAppearedColorMixed } = useMixedValue<string>(
    targetCaptionIds,
    (item) => item.details?.appearedColor ?? "#ffffff"
  );
  const { isMixed: isActiveColorMixed } = useMixedValue<string>(
    targetCaptionIds,
    (item) => item.details?.activeColor ?? "#ffffff"
  );
  const { isMixed: isActiveFillColorMixed } = useMixedValue<string>(
    targetCaptionIds,
    (item) => item.details?.activeFillColor ?? "#ffffff"
  );
  const { isMixed: isEmphasizeColorMixed } = useMixedValue<string>(
    targetCaptionIds,
    (item) => item.details?.isKeywordColor ?? "transparent"
  );

  const [localColor, setLocalColor] = useState<string>(color);
  const [localBackgroundColor, setLocalBackgroundColor] = useState<string>(backgroundColor);
  const [localAppearedColor, setLocalAppearedColor] = useState<string>(appearedColor);
  const [localActiveColor, setLocalActiveColor] = useState<string>(activeColor);
  const [localActiveFillColor, setLocalActiveFillColor] = useState<string>(activeFillColor);
  const [localEmphasizeColor, setLocalEmphasizeColor] = useState<string>(isKeywordColor);
  const [localPreservedColor, setLocalPreservedColor] = useState<boolean>(preservedColorKeyWord);

  const onChangeColor = (v: string) => {
    setLocalColor(v);
    dispatchGroupEdit(targetTextLikeIds, { color: v });
  };

  const onChangeBackgroundColor = (v: string) => {
    setLocalBackgroundColor(v);
    dispatchGroupEdit(targetTextLikeIds, { backgroundColor: v });
  };

  const onChangeAppearedColor = (v: string) => {
    setLocalAppearedColor(v);
    dispatchGroupEdit(targetCaptionIds, { appearedColor: v });
  };

  const onChangeActiveColor = (v: string) => {
    setLocalActiveColor(v);
    dispatchGroupEdit(targetCaptionIds, { activeColor: v });
  };

  const onChangeActiveFillColor = (v: string) => {
    setLocalActiveFillColor(v);
    dispatchGroupEdit(targetCaptionIds, { activeFillColor: v });
  };

  const onChangeEmphasizeColor = (v: string) => {
    setLocalEmphasizeColor(v);
    dispatchGroupEdit(targetCaptionIds, { isKeywordColor: v });
  };

  const onChangePreservedColor = (v: boolean) => {
    setLocalPreservedColor(v);
    dispatchGroupEdit(targetCaptionIds, { preservedColorKeyWord: v });
  };

  useEffect(() => {
    setLocalColor(color);
    setLocalBackgroundColor(backgroundColor);
    setLocalAppearedColor(appearedColor);
    setLocalActiveColor(activeColor);
    setLocalActiveFillColor(activeFillColor);
    setLocalEmphasizeColor(isKeywordColor);
    setLocalPreservedColor(preservedColorKeyWord);
  }, [color, backgroundColor, appearedColor, activeColor, activeFillColor, isKeywordColor, preservedColorKeyWord]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Colors</Label>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Text (Start)</div>
          <ColorPickerField
            value={localColor}
            onChange={onChangeColor}
            gradient={true}
            mobileControlType="color"
            mobileControlLabel="Text Color"
            disabled={disabled}
            mixed={isColorMixed}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Appeared</div>
          <ColorPickerField
            value={localAppearedColor}
            onChange={onChangeAppearedColor}
            gradient={true}
            mobileControlType="appearedColor"
            mobileControlLabel="Appeared Color"
            disabled={disabled}
            mixed={isAppearedColorMixed}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Active</div>
          <ColorPickerField
            value={localActiveColor}
            onChange={onChangeActiveColor}
            gradient={true}
            mobileControlType="activeColor"
            mobileControlLabel="Active Color"
            disabled={disabled}
            mixed={isActiveColorMixed}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Active Background</div>
          <ColorPickerField
            value={localActiveFillColor}
            onChange={onChangeActiveFillColor}
            gradient={true}
            mobileControlType="activeFillColor"
            mobileControlLabel="Active Background Color"
            disabled={disabled}
            mixed={isActiveFillColorMixed}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1 col-span-full">
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Background</div>
          <ColorPickerField
            value={localBackgroundColor}
            onChange={onChangeBackgroundColor}
            gradient={true}
            mobileControlType="backgroundColor"
            mobileControlLabel="Background Color"
            disabled={disabled}
            mixed={isBackgroundColorMixed}
          />
        </div>
      </div>
    </div>
  );
};

export default CaptionColors;