import React, { FC, useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import { checkFormat } from "./utils";
import { getAlphaValue, onlyDigits, onlyHex } from "./helpers";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "../ui/input";
import { Button } from "@/components/ui/button";

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
  const canonicalHex = hex.toUpperCase();
  const [color, setColor] = useState({
    alpha,
    hex: canonicalHex
  });

  const onChangeAlpha = (alpha: string) => {
    const validAlpha = getAlphaValue(alpha);
    setColor((prev) => ({ ...prev, alpha: Number(validAlpha) }));
  };

  const onChangeHex = (hex: string) => {
    setColor((prev) => ({ ...prev, hex: hex.toUpperCase() }));
  };

  const commit = () => {
    const hasChanged = color.alpha !== alpha || color.hex !== canonicalHex;

    if (!hasChanged) {
      setColor({ hex: canonicalHex, alpha });
      return;
    }

    const normalizedHex = color.hex[0] === "#" ? color.hex : `#${color.hex}`;
    const rgba = tinycolor(normalizedHex);
    rgba.setAlpha(Number(color.alpha) / 100);

    onChange({ hex: normalizedHex, alpha: Number(color.alpha) });
    onSubmitChange?.(checkFormat(rgba.toRgbString(), format, color.alpha));
  };

  const handleBlur = () => {
    setColor({ hex: canonicalHex, alpha });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
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
        <Input
          value={color.hex}
          onChange={(e) => onChangeHex(onlyHex(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="px-3"
          autoFocus={false}
          tabIndex={-1}
        />
      </div>
      <div className="relative">
        <Input
          value={color.alpha}
          onChange={(e) => onChangeAlpha(onlyDigits(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="px-3"
          autoFocus={false}
          tabIndex={-1}
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