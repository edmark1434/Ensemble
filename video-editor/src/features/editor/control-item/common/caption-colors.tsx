import { ColorPickerField } from "@/features/editor/control-item/common/color-picker-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
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
  disabled?: boolean;
}

const CaptionColors = ({
  id,
  color,
  backgroundColor,
  appearedColor,
  activeColor,
  activeFillColor,
  isKeywordColor,
  preservedColorKeyWord,
  disabled = false,
}: ICaptionColorsProps) => {
  const [localColor, setLocalColor] = useState<string>(color);
  const [localBackgroundColor, setLocalBackgroundColor] = useState<string>(backgroundColor);
  const [localAppearedColor, setLocalAppearedColor] = useState<string>(appearedColor);
  const [localActiveColor, setLocalActiveColor] = useState<string>(activeColor);
  const [localActiveFillColor, setLocalActiveFillColor] = useState<string>(activeFillColor);
  const [localEmphasizeColor, setLocalEmphasizeColor] = useState<string>(isKeywordColor);
  const [localPreservedColor, setLocalPreservedColor] = useState<boolean>(preservedColorKeyWord);

  const onChangeColor = (v: string) => {
    setLocalColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { color: v } } } });
  };

  const onChangeBackgroundColor = (v: string) => {
    setLocalBackgroundColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { backgroundColor: v } } } });
  };

  const onChangeAppearedColor = (v: string) => {
    setLocalAppearedColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { appearedColor: v } } } });
  };

  const onChangeActiveColor = (v: string) => {
    setLocalActiveColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { activeColor: v } } } });
  };

  const onChangeActiveFillColor = (v: string) => {
    setLocalActiveFillColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { activeFillColor: v } } } });
  };

  const onChangeEmphasizeColor = (v: string) => {
    setLocalEmphasizeColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { isKeywordColor: v } } } });
  };

  const onChangePreservedColor = (v: boolean) => {
    setLocalPreservedColor(v);
    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { preservedColorKeyWord: v } } } });
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
          <div className="flex flex-1 items-center text-xs text-muted-foreground">Upcoming</div>
          <ColorPickerField
            value={localColor}
            onChange={onChangeColor}
            gradient={true}
            mobileControlType="color"
            mobileControlLabel="Text Color"
            disabled={disabled}
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
          />
        </div>

        {/*<div className="flex flex-col gap-2 flex-1">*/}
        {/*  <div className="flex flex-1 items-center text-xs text-muted-foreground">Emphasize</div>*/}
        {/*  <ColorPickerField*/}
        {/*    value={localEmphasizeColor}*/}
        {/*    onChange={onChangeEmphasizeColor}*/}
        {/*    gradient={true}*/}
        {/*    mobileControlType="emphasizeColor"*/}
        {/*    mobileControlLabel="Emphasize Color"*/}
        {/*  />*/}
        {/*</div>*/}
      </div>

      {/*<div className="flex gap-2 items-center">*/}
      {/*  <div className="flex flex-1 items-center text-sm text-muted-foreground">Preserved Color</div>*/}
      {/*  <Switch checked={localPreservedColor} onCheckedChange={onChangePreservedColor} />*/}
      {/*</div>*/}
    </div>
  );
};

export default CaptionColors;