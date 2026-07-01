import React, { FC, useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import { checkFormat } from "./utils";
import { getAlphaValue, onlyDigits, onlyHex } from "./helpers";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "../ui/input";
import {Button} from "@/components/ui/button";

interface IChange {
  hex: string;
  alpha: number;
}

type TProps = {
  hex: string;
  alpha: number;
  format?: "rgb" | "hsl" | "hex";
  onChange: ({ hex, alpha }: IChange) => void;
  onSubmitChange?: (rgba: string) => void;
};

const InputRgba: FC<TProps> = ({
  hex,
  alpha,
  format = "rgb",
  onChange,
  onSubmitChange
}) => {
  const [color, setColor] = useState({
    alpha,
    hex
  });

  const onChangeAlpha = (alpha: string) => {
    const validAlpha = getAlphaValue(alpha);

    setColor({
      ...color,
      alpha: Number(validAlpha)
    });
  };

  const onChangeHex = (hex: string) => {
    setColor({
      ...color,
      hex: hex.toUpperCase()
    });
  };

  const onHandleSubmit = () => {
    const rgba = tinycolor(color.hex[0] === "#" ? color.hex : `#${color.hex}`);
    rgba.setAlpha(Number(color.alpha) / 100);

    if (rgba && (color.alpha !== alpha || color.hex !== hex)) {
      onChange({
        hex: color.hex[0] === "#" ? color.hex : `#${color.hex}`,
        alpha: Number(color.alpha)
      });
      if (onSubmitChange) {
        onSubmitChange(checkFormat(rgba.toRgbString(), format, color.alpha));
      }
    } else {
      setColor({
        hex: hex.toUpperCase(),
        alpha
      });
      onChange({
        hex,
        alpha
      });
    }
  };

  useEffect(() => {
    setColor({
      hex: hex.toUpperCase(),
      alpha
    });
  }, [hex, alpha]);

  return (
    <div
      style={{
        gridTemplateColumns: "4fr 2fr"
      }}
      className="grid gap-2"
    >
      <div className="relative">
        {/*<Popover>*/}
        {/*  <PopoverTrigger className="absolute left-3 top-0 flex h-full items-center gap-1 border-r border-black/15 pr-2 text-sm font-medium">*/}
        {/*    Hex*/}
        {/*    <svg*/}
        {/*      fill="none"*/}
        {/*      stroke="currentColor"*/}
        {/*      strokeWidth="4"*/}
        {/*      viewBox="0 0 48 48"*/}
        {/*      aria-hidden="true"*/}
        {/*      focusable="false"*/}
        {/*      width={12}*/}
        {/*      className="text-muted-foreground"*/}
        {/*    >*/}
        {/*      <path d="M39.6 17.443 24.043 33 8.487 17.443" />*/}
        {/*    </svg>*/}
        {/*  </PopoverTrigger>*/}
        {/*  <PopoverContent className="w-16">*/}
        {/*    <div>Hex</div>*/}
        {/*  </PopoverContent>*/}
        {/*</Popover>*/}
        <Input
          value={color.hex}
          onChange={(e) => onChangeHex(onlyHex(e.target.value))}
          onBlur={onHandleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onHandleSubmit();
            }
          }}
          className="px-3"
          // className="pl-[70px]"
        />
      </div>
      <div className="relative">
        <Input
          value={color.alpha}
          onChange={(e) => onChangeAlpha(onlyDigits(e.target.value))}
          onBlur={onHandleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onHandleSubmit();
            }
          }}
          className="px-3"
        />
        <Button
          size="sm"
          variant="ghost"
          className="pointer-events-none absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-muted-foreground"
        >
          %
        </Button>
      </div>
    </div>
  );
};

export default InputRgba;
