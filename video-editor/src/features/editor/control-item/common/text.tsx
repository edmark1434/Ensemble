import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../../store/use-data-state";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown, Loader2, Percent,
  Search,
  Strikethrough,
  Underline,
  X, XLineTop
} from "lucide-react";
import React, { useEffect, useState } from "react";
import Opacity from "./opacity";
import { Input } from "@/components/ui/input";
import { ITrackItem } from "@designcombo/types";
import { Label } from "@/components/ui/label";
import ColorPicker from "@/components/color-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ICompactFont, IFont } from "../../interfaces/editor";
import useLayoutStore from "../../store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import { useResolvedLineHeight } from "../../hooks/use-resolved-line-height";
import {Slider} from "@/components/ui/slider";
import { formatColorDisplay } from "@/components/color-picker/helpers";

interface TextControlsProps {
  trackItem: ITrackItem & any;
  properties: any;
  selectedFont: ICompactFont;
  onChangeFontFamily: (font: ICompactFont) => void;
  handleChangeFontStyle: (font: IFont) => void;
  onChangeFontSize: (v: number) => void;
  handleColorChange: (color: string) => void;
  handleBackgroundChange: (color: string) => void;
  onChangeTextAlign: (v: string) => void;
  onChangeTextDecorationLines: (v: string) => void;
  onChangeTextDecorationColor: (v: string) => void;
  handleChangeOpacity: (v: number) => void;
}

export const TextControls = ({
  trackItem,
  properties,
  selectedFont,
  onChangeFontFamily,
  handleChangeFontStyle,
  onChangeFontSize,
  handleColorChange,
  handleBackgroundChange,
  onChangeTextAlign,
  onChangeTextDecorationLines,
  onChangeTextDecorationColor,
  handleChangeOpacity,
}: TextControlsProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-medium">Appearance</Label>
        <div className="flex flex-col gap-2">
          <Opacity
            onChange={(v: number) => handleChangeOpacity(v)}
            value={properties.opacity ?? 100}
          />
          <BorderRadius id={trackItem.id} value={trackItem.details?.borderRadius ?? 0} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-medium">Typography</Label>
        <div className="flex flex-col gap-2">
          <FontFamily
            handleChangeFont={onChangeFontFamily}
            fontFamilyDisplay={properties.fontFamilyDisplay}
          />

          <div className="flex gap-2">
            <FontStyle
              selectedFont={selectedFont}
              handleChangeFontStyle={handleChangeFontStyle}
            />
            <FontSize value={properties.fontSize} onChange={onChangeFontSize} />
          </div>

          <div className="flex gap-2">
            <FontLineHeight
              id={trackItem.id}
              value={trackItem.details?.lineHeight}
              fontFamily={properties.fontFamily}
              fontSize={properties.fontSize}
            />
            <FontWordBreak id={trackItem.id} value={trackItem.details?.wordBreak ?? "normal"} />
          </div>

          <div className="flex gap-2">
            <FontLetterSpacing id={trackItem.id} value={trackItem.details?.letterSpacing} />
            <FontWordSpacing id={trackItem.id} value={trackItem.details?.wordSpacing} />
          </div>

          <div className="flex gap-2">
            <Alignment value={properties.textAlign} onChange={onChangeTextAlign} />
            <FontCase id={trackItem.id} value={trackItem.details?.textTransform ?? "none"} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-medium">Decoration</Label>
        <div className="flex flex-col gap-2">
          <TextDecorationLines
            value={properties.textDecorationLines}
            onChange={onChangeTextDecorationLines}
          />
          <TextDecorationColor
            value={properties.textDecorationColor}
            onChange={onChangeTextDecorationColor}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-medium">Fill</Label>
        <div className="flex flex-col gap-2">
          <FontColor
            value={properties.color}
            handleColorChange={handleColorChange}
          />
          <FontBackground
            value={properties.backgroundColor}
            handleColorChange={handleBackgroundChange}
          />
        </div>
      </div>
    </div>
  );
};

const FontBackground = ({
                          value,
                          handleColorChange
                        }: {
  value: string;
  handleColorChange: (color: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const { setControItemDrawerOpen, setTypeControlItem, setLabelControlItem } =
    useLayoutStore();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleColorClick = () => {
    if (!isLargeScreen) {
      setControItemDrawerOpen(true);
      setTypeControlItem("backgroundColor");
      setLabelControlItem("Background Color");
    }
  };

  const fullHex = localValue || "#ffffffff";
  const solidColor = fullHex.slice(0, 7);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Background
      </div>
      {isLargeScreen ? (
        <div className="relative w-full flex gap-1">
          <div className="relative h-9 w-9 flex-none overflow-hidden rounded-md border border-border">
            {/* Left half: solid, alpha stripped */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{ background: solidColor }}
            />

            {/* Right half: checkerboard + real color with actual alpha */}
            <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <div
                className="absolute inset-0 rounded-r-md"
                style={{
                  backgroundImage:
                    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
                  backgroundSize: "6px",
                  backgroundRepeat: "repeat"
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: fullHex }}
              />
            </div>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                className="flex-1 flex w-full items-center justify-between text-sm px-3"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">
                    {formatColorDisplay(localValue)}
                  </p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom" align="start"
              className="w-3xs bg-card border flex flex-col gap-4 rounded-lg"
            >
              <div className="handle flex cursor-grab justify-between items-center">
                <p className="text-sm font-medium">Color</p>
                <X
                  className="h-4 w-4 cursor-pointer text-muted-foreground"
                  onClick={() => setOpen(false)}
                />
              </div>

              <ColorPicker
                value={localValue}
                format="hex"
                gradient={true}
                solid={true}
                onChange={(v: string) => {
                  setLocalValue(v);
                  handleColorChange(v);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="relative w-32">
          <div className="relative" onClick={handleColorClick}>
            <div
              style={{ background: localValue || "#ffffff" }}
              className="absolute left-0.5 top-0.5 h-7 w-7 flex-none rounded-md border border-border"
            />
            <Input
              className="pointer-events-none pl-10"
              value={formatColorDisplay(localValue)}
              onChange={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FontColor = ({
                     value,
                     handleColorChange
                   }: {
  value: string;
  handleColorChange: (color: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const { setControItemDrawerOpen, setTypeControlItem, setLabelControlItem } =
    useLayoutStore();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleColorClick = () => {
    if (!isLargeScreen) {
      setControItemDrawerOpen(true);
      setTypeControlItem("color");
      setLabelControlItem("Color");
    }
  };

  const fullHex = localValue || "#ffffffff";
  const solidColor = fullHex.slice(0, 7);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Text color
      </div>
      {isLargeScreen ? (
        <div className="relative w-full flex gap-1">
          <div className="relative h-9 w-9 flex-none overflow-hidden rounded-md border border-border">
            {/* Left half: solid, alpha stripped */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{ background: solidColor }}
            />

            {/* Right half: checkerboard + real color with actual alpha */}
            <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <div
                className="absolute inset-0 rounded-r-md"
                style={{
                  backgroundImage:
                    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
                  backgroundSize: "6px",
                  backgroundRepeat: "repeat"
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: fullHex }}
              />
            </div>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                className="flex-1 flex w-full items-center justify-between text-sm px-3"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">
                    {formatColorDisplay(localValue)}
                  </p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom" align="start"
              className="w-3xs bg-card border flex flex-col gap-4 rounded-lg"
            >
              <div className="handle flex cursor-grab justify-between items-center">
                <p className="text-sm font-medium">Color</p>
                <X
                  className="h-4 w-4 cursor-pointer text-muted-foreground"
                  onClick={() => setOpen(false)}
                />
              </div>

              <ColorPicker
                value={localValue}
                format="hex"
                gradient={true}
                solid={true}
                onChange={(v: string) => {
                  setLocalValue(v);
                  handleColorChange(v);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="relative w-32">
          <div className="relative" onClick={handleColorClick}>
            <div
              style={{ background: localValue || "#ffffff" }}
              className="absolute left-0.5 top-0.5 h-7 w-7 flex-none rounded-md border border-border"
            />
            <Input
              className="pointer-events-none pl-10"
              value={formatColorDisplay(localValue)}
              onChange={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FontSize = ({
                    value,
                    onChange
                  }: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  useEffect(() => {
    setLocalValue(Math.round(value));
  }, [value]);

  const handleBlur = () => {
    if (localValue !== "") {
      onChange(Number(localValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (localValue !== "") {
        onChange(Number(localValue));
      }
    }
  };

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative w-full">
        <Input
          value={localValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (
              newValue === "" ||
              (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
            ) {
              setLocalValue(newValue);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

const FontFamily = ({
                      handleChangeFont,
                      fontFamilyDisplay
                    }: {
  handleChangeFont: (font: ICompactFont) => void;
  fontFamilyDisplay: string;
}) => {
  const isLargeScreen = useIsLargeScreen();
  const { setFloatingControl, trackItem, floatingControl } = useLayoutStore();
  const { compactFonts } = useDataState();
  const [value, setValue] = useState("");
  const [fonts, setFonts] = useState<ICompactFont[]>(compactFonts);

  useEffect(() => {
    const filteredFonts = compactFonts.filter((font) =>
      font.family.toLowerCase().includes(value.toLowerCase())
    );
    setFonts(filteredFonts);
  }, [value, compactFonts]);

  return (
    <div className="flex gap-2">
      {isLargeScreen ? (
        <div className="relative w-full">
          <Button
            className="flex w-full items-center justify-between text-sm"
            variant="secondary"
            onClick={() =>
              setFloatingControl(
                floatingControl === "font-family-picker" ? "" : "font-family-picker"
              )
            }
          >
            <div className="w-full overflow-hidden text-left">
              <p className="truncate">{fontFamilyDisplay}</p>
            </div>
            <ChevronDown className="text-muted-foreground" size={14} />
          </Button>
        </div>
      ) : (
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="flex items-center justify-between text-sm w-32"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">{fontFamilyDisplay}</p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="z-[300] w-full p-0 -ml-4">
              <div className="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring pl-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search font..."
                  className="border-0 focus-visible:ring-0 shadow-none !bg-transparent"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[300px] w-full py-2">
                {fonts.length > 0 ? (
                  fonts.map((font, index) => (
                    <div
                      key={index}
                      onClick={() => handleChangeFont(font)}
                      className="cursor-pointer px-2 py-1 hover:bg-zinc-800/50"
                    >
                      <img
                        style={{ filter: "invert(100%)" }}
                        src={font.default.preview}
                        alt={font.family}
                      />
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No font found
                  </p>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

const FontStyle = ({
                     selectedFont,
                     handleChangeFontStyle
}: {
  selectedFont: ICompactFont;
  handleChangeFontStyle: (font: IFont) => void;
}) => {
  return (
    <div className="flex gap-2 flex-1">
      <div className="relative w-full">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="flex w-full items-center justify-between text-sm"
              variant="secondary"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate">{selectedFont.name}</p>
              </div>
              <ChevronDown className="text-muted-foreground" size={14} />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="z-[300] p-0"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            {selectedFont.styles.map((style, index) => {
              const fontFamilyEnd = style.postScriptName.lastIndexOf("-");
              const styleName = style.postScriptName
                .substring(fontFamilyEnd + 1)
                .replace("Italic", " Italic");
              return (
                <div
                  className="flex cursor-pointer items-center px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  key={index}
                  onClick={() => handleChangeFontStyle(style)}
                >
                  {styleName}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const TextDecorationLines = ({
                          value,
                          onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/*<div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
      {/*  Lines*/}
      {/*</div>*/}
      <div className="flex gap-2">
        <div className="relative w-full">
          <ToggleGroup
            value={localValue.split(" ")}
            className="grid grid-cols-3 w-full h-9"
            type="multiple"
            onValueChange={(v) => {
              const next = v.filter((item) => item !== "none").join(" ");
              setLocalValue(next);
              onChange(next);
            }}
          >
            <ToggleGroupItem
              value="underline"
              aria-label="Toggle underline"
            >
              <Underline size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="line-through"
              aria-label="Toggle strikethrough">
              <Strikethrough size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="overline"
              aria-label="Toggle overline"
            >
              <XLineTop size={16} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
};

const TextDecorationColor = ({
                               value,
                               onChange
                             }: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const { setControItemDrawerOpen, setTypeControlItem, setLabelControlItem } =
    useLayoutStore();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleColorClick = () => {
    if (!isLargeScreen) {
      setControItemDrawerOpen(true);
      setTypeControlItem("textDecorationColor");
      setLabelControlItem("Decoration Color");
    }
  };

  const displayValue =
    localValue === ""
      ? "Auto"
      : localValue;

  const fullHex = localValue || "#ffffffff";
  const solidColor = fullHex.slice(0, 7);

  return (
    <div className="flex flex-col gap-2 flex-1">
      {/*<div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
      {/*  Color*/}
      {/*</div>*/}
      {isLargeScreen ? (
        <div className="relative w-full flex gap-1">
          <div className="relative h-9 w-9 flex-none overflow-hidden rounded-md border border-border">
            {/* Left half: solid, alpha stripped */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{ background: solidColor }}
            />

            {/* Right half: checkerboard + real color with actual alpha */}
            <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <div
                className="absolute inset-0 rounded-r-md"
                style={{
                  backgroundImage:
                    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
                  backgroundSize: "6px",
                  backgroundRepeat: "repeat"
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: fullHex }}
              />
            </div>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                className="flex-1 flex w-full items-center justify-between text-sm px-3"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">
                    {formatColorDisplay(localValue)}
                  </p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom" align="start"
              className="w-3xs bg-card border flex flex-col gap-4 rounded-lg"
            >
              <div className="handle flex cursor-grab justify-between items-center">
                <p className="text-sm font-medium">Color</p>
                <X
                  className="h-4 w-4 cursor-pointer text-muted-foreground"
                  onClick={() => setOpen(false)}
                />
              </div>

              <ColorPicker
                value={localValue}
                format="hex"
                gradient={false}
                solid={true}
                onChange={(v: string) => {
                  setLocalValue(v);
                  onChange(v);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="relative w-32">
          <div className="relative" onClick={handleColorClick}>
            <div
              style={{ background: localValue || "#ffffff" }}
              className="absolute left-0.5 top-0.5 h-7 w-7 flex-none rounded-md border border-border"
            />
            <Input className="pointer-events-none pl-10" value={formatColorDisplay(localValue)} onChange={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
};

const Alignment = ({
                     value,
                     onChange
                   }: {
  value: string;
  onChange: (v: string) => void;
}) => {
  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Align
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <RadioGroup
            value={value}
            onValueChange={onChange}
            className="grid grid-cols-3 w-full h-9"
          >
            <RadioGroupItem value="left" aria-label="Align left">
              <AlignLeft size={16} />
            </RadioGroupItem>
            <RadioGroupItem value="center" aria-label="Align center">
              <AlignCenter size={16} />
            </RadioGroupItem>
            <RadioGroupItem value="right" aria-label="Align right">
              <AlignRight size={16} />
            </RadioGroupItem>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
};

const fontCaseOptions = [
  { value: "none", label: "Default" },
  { value: "capitalize", label: "Title case" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" }
];

const FontCase = ({ id, value: initialValue }: { id: string; value: string }) => {
  const [value, setValue] = useState(initialValue ?? "none");

  // Resync if the selected item changes
  useEffect(() => {
    setValue(initialValue ?? "none");
  }, [initialValue]);

  const onChangeFontCase = (v: string) => {
    setValue(v);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            textTransform: v
          }
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Case
      </div>
      <div className="relative w-full">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="flex w-full items-center justify-between text-sm"
              variant="secondary"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate">
                  {fontCaseOptions.find((o) => o.value === value)?.label ?? "Default"}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground" size={14} />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="z-[300] p-0"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            {fontCaseOptions.map((option, index) => {
              return (
                <div
                  onClick={() => onChangeFontCase(option.value)}
                  className="flex cursor-pointer items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  key={index}
                >
                  {option.label}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const FontLineHeight = ({
  id,
  value,
  fontFamily,
  fontSize
}: {
  id: string;
  value: string | number;
  fontFamily?: string;
  fontSize?: number;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(
    (value === "normal" || fontSize === undefined)
      ? "Auto"
      : Math.round(Number(value) * fontSize)
  );

  const onChange = (v: string | number) => {
    let dispatchValue;
    if (v === "normal" || fontSize === undefined) {
      setLocalValue("Auto");
      dispatchValue = "normal";
    } else {
      setLocalValue(Number(v));
      dispatchValue = Number(v) / fontSize;
    }

    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            lineHeight: dispatchValue,
          }
        }
      }
    });
  };

  useEffect(() => {
    if (value === "normal" || fontSize === undefined) {
      setLocalValue("Auto");
    } else {
      const num = Number(value);
      setLocalValue(Number.isNaN(num) ? "Auto" : Math.round(num * fontSize));
      console.log("num", num);
      console.log("fontSize", fontSize);
      console.log("result", Math.round(num * fontSize));
    }
  }, [value]);

  const handleBlur = () => {
    if (localValue === "") {
      onChange("normal");
      return;
    }

    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  const resolvedNormal = useResolvedLineHeight(fontFamily, fontSize);
  const placeholder = localValue === "" && resolvedNormal !== null
    ? String(resolvedNormal)
    : undefined;

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Line height
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            placeholder={placeholder}
            onFocus={() => {
              if (localValue === "Auto") setLocalValue("");
            }}
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                newValue === "" ||
                (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
              ) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

const wordBreakOptions = [
  { value: "normal", label: "Default" },
  { value: "break-word", label: "Break word" },
  { value: "break-all", label: "Break all" }
];

const FontWordBreak = ({ id, value }: { id: string; value: string }) => {
  const [localValue, setLocalValue] = useState<string>(value);

  const onChange = (v: string) => {
    setLocalValue(v);
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            wordBreak: v
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Word break
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="flex w-full items-center justify-between text-sm"
                variant="secondary"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">
                    {wordBreakOptions.find((o) => o.value === localValue)?.label ?? "Default"}
                  </p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="z-[300] p-0"
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              {wordBreakOptions.map((option, index) => {
                return (
                  <div
                    onClick={() => onChange(option.value)}
                    className="flex cursor-pointer items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                    key={index}
                  >
                    {option.label}
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

const FontLetterSpacing = ({ id, value }: { id: string; value: string | number }) => {
  const [localValue, setLocalValue] = useState<string | number>(
    value === "normal" ? "Auto" : Math.round(Number(value))
  );

  const onChange = (v: string | number) => {
    setLocalValue(v === "normal" ? "Auto" : Number(v));
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            letterSpacing: v
          }
        }
      }
    });
  };

  useEffect(() => {
    if (value === "normal") {
      setLocalValue("Auto");
    } else {
      const num = Number(value);
      setLocalValue(Number.isNaN(num) ? "Auto" : Math.round(num));
    }
  }, [value]);

  const handleBlur = () => {
    if (localValue === "") {
      onChange("normal");
      return;
    }

    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Letter spacing
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onFocus={() => {
              if (localValue === "Auto") setLocalValue("");
            }}
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                newValue === "" ||
                (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
              ) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

const FontWordSpacing = ({ id, value }: { id: string; value: string | number }) => {
  const [localValue, setLocalValue] = useState<string | number>(
    value === "normal" ? "Auto" : Math.round(Number(value))
  );

  const onChange = (v: string | number) => {
    setLocalValue(v === "normal" ? "Auto" : Number(v));
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            wordSpacing: v
          }
        }
      }
    });
  };

  useEffect(() => {
    if (value === "normal") {
      setLocalValue("Auto");
    } else {
      const num = Number(value);
      setLocalValue(Number.isNaN(num) ? "Auto" : Math.round(num));
    }
  }, [value]);

  const handleBlur = () => {
    if (localValue === "") {
      onChange("normal");
      return;
    }

    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = Number(localValue);
      if (localValue !== "" && !Number.isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Word spacing
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Input
            value={localValue}
            onFocus={() => {
              if (localValue === "Auto") setLocalValue("");
            }}
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                newValue === "" ||
                (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)
              ) {
                setLocalValue(newValue);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

const BorderRadius = ({ id, value }: { id: string; value: number }) => {
  const [localValue, setLocalValue] = useState<number>(value * 2);

  const onChange = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            borderRadius: v / 2
          }
        }
      }
    });
  };

  useEffect(() => {
    setLocalValue(Math.round(value * 2));
  }, [value]);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Corner radius
      </div>
      <div
        className="w-full flex gap-2"
      >
        <Input
          max={100}
          className="w-15 text-center text-sm"
          type="number"
          onChange={(e) => {
            const newValue = Number(e.target.value);
            if (newValue >= 0 && newValue <= 100) {
              setLocalValue(newValue); // Update local state
              onChange(newValue); // Optionally propagate immediately, or adjust as needed
            }
          }}
          value={localValue} // Use local state for input value
        />
        <Slider
          id="opacity"
          value={[localValue]}
          onValueChange={(e) => {
            setLocalValue(e[0]);
            onChange(e[0]); // propagate immediately on every drag tick
          }}
          min={0}
          max={100}
          step={1}
          aria-label="Corner Radius"
          className="w-full"
        />
      </div>
    </div>
  );
};