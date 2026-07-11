import { Fragment, FC } from "react";
import Gradient from "./gradient";
import Solid from "./solid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { IPropsMain } from "./types";
import "./colorpicker.css";
import {isGradientColor} from "@/components/color-picker/helpers";

const ColorPicker: FC<IPropsMain> = ({
  value = "#ffffff",
  format = "rgb",
  gradient = false,
  solid = true,
  debounceMS = 300,
  debounce = true,
  showInputs = true,
  showGradientResult = true,
  showGradientStops = true,
  showGradientMode = true,
  showGradientAngle = true,
  showGradientPosition = true,
  allowAddGradientStops = true,
  colorBoardHeight = 140,

  onChange = () => ({})
}) => {
  const onChangeSolid = (value: string) => {
    onChange(value);
  };

  const onChangeGradient = (value: string) => {
    onChange(value);
  };

  if (solid && gradient) {
    const defaultTab = isGradientColor(value) ? "gradient" : "solid";

    return (
      <div className="w-full">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="h-9 w-full">
            <TabsTrigger value="solid">Solid</TabsTrigger>
            <TabsTrigger value="gradient">Gradient</TabsTrigger>
          </TabsList>
          <TabsContent value="solid">
            <Solid
              onChange={onChangeSolid}
              value={value}
              format={format}
              debounceMS={debounceMS}
              debounce={debounce}
              colorBoardHeight={colorBoardHeight}
            />
          </TabsContent>
          <TabsContent value="gradient">
            <Gradient
              onChange={onChangeGradient}
              value={value}
              format={format}
              debounceMS={debounceMS}
              debounce={debounce}
              showGradientResult={showGradientResult}
              showGradientStops={showGradientStops}
              showGradientMode={showGradientMode}
              showGradientAngle={showGradientAngle}
              showGradientPosition={showGradientPosition}
              allowAddGradientStops={allowAddGradientStops}
              colorBoardHeight={colorBoardHeight}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <>
      {solid || gradient ? (
        <>
          {solid ? (
            <Solid
              onChange={onChangeSolid}
              value={value}
              format={format}
              debounceMS={debounceMS}
              debounce={debounce}
              showInputs={showInputs}
              colorBoardHeight={colorBoardHeight}
            />
          ) : (
            <Fragment />
          )}
          {gradient ? (
            <Gradient
              onChange={onChangeGradient}
              value={value}
              format={format}
              debounceMS={debounceMS}
              debounce={debounce}
              showGradientResult={showGradientResult}
              showGradientStops={showGradientStops}
              showGradientMode={showGradientMode}
              showGradientAngle={showGradientAngle}
              showGradientPosition={showGradientPosition}
              allowAddGradientStops={allowAddGradientStops}
              colorBoardHeight={colorBoardHeight}
            />
          ) : (
            <Fragment />
          )}
        </>
      ) : null}
    </>
  );
};

export default ColorPicker;
