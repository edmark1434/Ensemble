import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import useDataState from "../../store/use-data-state";
import { dispatchGroupEdit } from "@/features/editor/utils/dispatch-group-edit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight, ArrowRightToLine, Check,
  ChevronDown, Loader2, Percent,
  Search,
  Strikethrough,
  Underline,
  X, XLineTop
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ITrackItem } from "@designcombo/types";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ICompactFont, IFont } from "../../interfaces/editor";
import { DEFAULT_FONT } from "../../constants/font";
import useLayoutStore from "../../store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import { useResolvedLineHeight } from "../../hooks/use-resolved-line-height";
import { useMixedValue } from "../../hooks/use-mixed-value";
import {Slider} from "@/components/ui/slider";
import {ColorPickerField} from "@/features/editor/control-item/common/color-picker-field";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Kbd, KbdGroup} from "@/components/ui/kbd";

interface TextControlsProps {
  trackItem: ITrackItem & any;
  properties: any;
  selectedFont: ICompactFont;
  ids?: string[];
  onChangeFontFamily: (font: ICompactFont) => void;
  handleChangeFontStyle: (font: IFont) => void;
  onChangeFontSize: (v: number) => void;
  handleColorChange?: (color: string) => void;
  handleBackgroundChange?: (color: string) => void;
  onChangeTextAlign: (v: string) => void;
  onChangeTextDecorationLines: (v: string) => void;
  onChangeTextDecorationColor: (v: string) => void;
  showFill?: boolean;
  disabled?: boolean;
}

export const TextControls = ({
  trackItem,
  properties,
  selectedFont,
  ids,
  onChangeFontFamily,
  handleChangeFontStyle,
  onChangeFontSize,
  handleColorChange,
  handleBackgroundChange,
  onChangeTextAlign,
  onChangeTextDecorationLines,
  onChangeTextDecorationColor,
  showFill = true,
  disabled = false,
}: TextControlsProps) => {
  const targetIds = ids && ids.length > 0 ? ids : [trackItem.id];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-semibold">Typography</Label>
        <div className="flex flex-col gap-3">
          <FontFamily
            ids={targetIds}
            handleChangeFont={onChangeFontFamily}
            fontFamilyDisplay={properties.fontFamilyDisplay}
          />

          <div className="flex gap-2">
            <FontStyle
              ids={targetIds}
              selectedFont={selectedFont}
              handleChangeFontStyle={handleChangeFontStyle}
            />
            <FontSize ids={targetIds} value={properties.fontSize} onChange={onChangeFontSize} />
          </div>

          <div className="flex gap-2">
            <FontLineHeight
              id={trackItem.id}
              ids={targetIds}
              value={trackItem.details?.lineHeight}
              fontFamily={properties.fontFamily}
              fontSize={properties.fontSize}
            />
            <FontWordBreak id={trackItem.id} ids={targetIds} value={trackItem.details?.wordBreak ?? "normal"} />
          </div>

          <div className="flex gap-2">
            <FontLetterSpacing id={trackItem.id} ids={targetIds} value={trackItem.details?.letterSpacing} />
            <FontWordSpacing id={trackItem.id} ids={targetIds} value={trackItem.details?.wordSpacing} />
          </div>

          <div className="flex gap-2">
            <Alignment ids={targetIds} value={properties.textAlign} onChange={onChangeTextAlign} />
            <FontCase id={trackItem.id} ids={targetIds} value={trackItem.details?.textTransform ?? "none"} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-semibold">Decoration</Label>
        <div className="flex flex-col gap-3">
          <TextDecorationLines
            ids={targetIds}
            value={properties.textDecorationLines}
            onChange={onChangeTextDecorationLines}
          />
          <TextDecorationColor
            ids={targetIds}
            value={properties.textDecorationColor}
            onChange={onChangeTextDecorationColor}
            disabled={disabled}
          />
        </div>
      </div>

      {showFill && handleColorChange && (
        <div className="flex flex-col gap-3">
          <Label className="font-sans text-sm font-semibold">Colors</Label>
          <div className="flex flex-col gap-3">
            <FontColor
              ids={targetIds}
              value={properties.color}
              handleColorChange={handleColorChange}
              disabled={disabled}
            />

            {handleBackgroundChange && (
              <FontBackground
                ids={targetIds}
                value={properties.backgroundColor}
                handleColorChange={handleBackgroundChange}
                disabled={disabled}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FontBackground = ({
  ids,
  value,
  handleColorChange,
  disabled
}: {
  ids: string[];
  value: string;
  handleColorChange: (color: string) => void;
  disabled: boolean;
}) => {
  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => item.details?.backgroundColor ?? "transparent"
  );

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Background
      </div>
      <ColorPickerField
        value={value}
        onChange={handleColorChange}
        gradient={true}
        mobileControlType="backgroundColor"
        mobileControlLabel="Background Color"
        disabled={disabled}
        mixed={isMixed}
      />
    </div>
  );
};

const FontColor = ({
  ids,
  value,
  handleColorChange,
  disabled
}: {
  ids: string[];
  value: string;
  handleColorChange: (color: string) => void;
  disabled: boolean;
}) => {
  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => item.details?.color ?? "#ffffff"
  );

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Text
      </div>
      <ColorPickerField
        value={value}
        onChange={handleColorChange}
        gradient={true}
        mobileControlType="color"
        mobileControlLabel="Color"
        disabled={disabled}
        mixed={isMixed}
      />
    </div>
  );
};

const FontSize = ({
  ids,
  value,
  onChange
}: {
  ids: string[];
  value: number;
  onChange: (v: number) => void;
}) => {
  const { value: groupValue, isMixed } = useMixedValue<number>(
    ids,
    (item) => item.details?.fontSize ?? 62
  );
  const resolvedValue = groupValue ?? value;
  const canonicalValue = isMixed ? "Mixed" : String(Math.round(resolvedValue));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (num: number) => {
    onChange(num);
    setLocalValue(String(Math.round(num)));
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "" || localValue === "Mixed") return;
    const num = Number(localValue);
    if (!Number.isNaN(num)) commit(num);
  };

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative w-full">
        <Input
          value={localValue}
          onFocus={() => {
            if (localValue === "Mixed") setLocalValue("");
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
  );
};

const FontFamily = ({
  ids,
  handleChangeFont,
  fontFamilyDisplay
}: {
  ids: string[];
  handleChangeFont: (font: ICompactFont) => void;
  fontFamilyDisplay: string;
}) => {
  const isLargeScreen = useIsLargeScreen();
  const { trackItem, floatingControl, setFloatingControl, setFloatingControlIds } = useLayoutStore();
  const { compactFonts } = useDataState();
  const [value, setValue] = useState("");
  const [fonts, setFonts] = useState<ICompactFont[]>(compactFonts);

  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => item.details?.fontFamily ?? DEFAULT_FONT.postScriptName
  );

  useEffect(() => {
    const filteredFonts = compactFonts.filter((font) =>
      font.family.toLowerCase().includes(value.toLowerCase())
    );
    setFonts(filteredFonts);
  }, [value, compactFonts]);

  const displayLabel = isMixed ? "Mixed" : fontFamilyDisplay;

  return (
    <div className="flex gap-2">
      {isLargeScreen ? (
        <div className="relative w-full">
          <Button
            className="flex w-full items-center justify-between text-sm font-normal"
            variant="outline"
            onClick={() => {
              const next = floatingControl === "font-family-picker" ? "" : "font-family-picker";
              setFloatingControlIds(next ? ids : []);
              setFloatingControl(next);
            }}
          >
            <div className="w-full overflow-hidden text-left">
              <p className="truncate">{displayLabel}</p>
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
                variant="outline"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">{displayLabel}</p>
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
  ids,
  selectedFont,
  handleChangeFontStyle
}: {
  ids: string[];
  selectedFont: ICompactFont;
  handleChangeFontStyle: (font: IFont) => void;
}) => {
  const [open, setOpen] = useState(false);

  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => item.details?.fontFamily ?? DEFAULT_FONT.postScriptName
  );

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className="flex w-full items-center justify-between text-sm"
              variant="outline"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate">{isMixed ? "Mixed" : selectedFont.name}</p>
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
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  key={index}
                  onClick={() => {
                    handleChangeFontStyle(style)
                    setOpen(false);
                  }}
                >
                  {styleName}
                  {!isMixed && styleName === selectedFont.name && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const decorationOptions = [
  { value: "underline", label: "Underline", icon: Underline },
  { value: "line-through", label: "Strikethrough", icon: Strikethrough },
  { value: "overline", label: "Overline", icon: XLineTop }
];

function splitTextDecoration(raw: string | undefined): { lines: string; color: string } {
  const tokens = (raw || "").trim().split(/\s+/).filter(Boolean);
  const decorationValues = ["underline", "overline", "line-through"];
  const lines = tokens.filter((t) => decorationValues.includes(t)).join(" ");
  const color = tokens.find((t) => t.startsWith("#")) ?? "";
  return { lines, color };
}

const TextDecorationLines = ({
  ids,
  value,
  onChange
}: {
  ids: string[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => splitTextDecoration(item.details?.textDecoration).lines
  );

  const [localValue, setLocalValue] = useState<string>(value);

  useEffect(() => {
    setLocalValue(isMixed ? "" : value);
  }, [value, isMixed]);

  const activeLines = localValue.split(" ").filter(Boolean);

  const toggleLine = (line: string) => {
    const next = activeLines.includes(line)
      ? activeLines.filter((item) => item !== line)
      : [...activeLines, line];
    const joined = next.filter((item) => item !== "none").join(" ");
    setLocalValue(joined);
    onChange(joined);
  };

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex gap-2">
        <div className="grid grid-cols-3 gap-2 w-full h-9">
          {decorationOptions.map(({ value: lineValue, label, icon: Icon }) => {
            const isActive = activeLines.includes(lineValue);
            return (
              <Tooltip key={lineValue} delayDuration={10}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={isActive ? "default" : "secondary"}
                    aria-label={label}
                    aria-pressed={isActive}
                    onClick={() => toggleLine(lineValue)}
                    className="h-full w-full"
                  >
                    <Icon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side={"bottom"} align="center" sideOffset={1}
                  className={"flex gap-2 items-center"}
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TextDecorationColor = ({
  ids,
  value,
  onChange,
  disabled
}: {
  ids: string[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) => {
  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => splitTextDecoration(item.details?.textDecoration).color
  );

  return (
    <div className="flex flex-col gap-2 flex-1">
      <ColorPickerField
        value={value}
        onChange={onChange}
        gradient={false}
        mobileControlType="textDecorationColor"
        mobileControlLabel="Decoration Color"
        disabled={disabled}
        mixed={isMixed}
      />
    </div>
  );
};

const Alignment = ({
  ids,
  value,
  onChange
}: {
  ids: string[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const { isMixed } = useMixedValue<string>(
    ids,
    (item) => item.details?.textAlign ?? "left"
  );

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Align
      </div>
      <RadioGroup
        value={isMixed ? "" : value}
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
  );
};

const fontCaseOptions = [
  { value: "none", label: "Default" },
  { value: "capitalize", label: "Title case" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" }
];

const FontCase = ({ id, ids, value: initialValue }: { id: string; ids?: string[]; value: string }) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const [value, setValue] = useState(initialValue ?? "none");
  const [open, setOpen] = useState(false);

  const { isMixed } = useMixedValue<string>(
    targetIds,
    (item) => item.details?.textTransform ?? "none"
  );

  useEffect(() => {
    setValue(initialValue ?? "none");
  }, [initialValue]);

  const onChangeFontCase = (v: string) => {
    setValue(v);
    dispatchGroupEdit(targetIds, { textTransform: v });
  };

  const currentLabel = isMixed
    ? "Mixed"
    : fontCaseOptions.find((o) => o.value === value)?.label ?? "Default";

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Case
      </div>
      <div className="relative w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className="flex w-full items-center justify-between text-sm"
              variant="outline"
            >
              <div className="w-full overflow-hidden text-left">
                <p className="truncate">{currentLabel}</p>
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
                  onClick={() => {
                    onChangeFontCase(option.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  key={index}
                >
                  {option.label}
                  {!isMixed && option.value === value && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
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
  ids,
  value,
  fontFamily,
  fontSize
}: {
  id: string;
  ids?: string[];
  value: string | number;
  fontFamily?: string;
  fontSize?: number;
}) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];

  const { isMixed } = useMixedValue<string | number>(
    targetIds,
    (item) => item.details?.lineHeight ?? "normal"
  );
  const { isMixed: isFontSizeMixed } = useMixedValue<number>(
    targetIds,
    (item) => item.details?.fontSize ?? 62
  );
  const { isMixed: isFontFamilyMixed } = useMixedValue<string>(
    targetIds,
    (item) => item.details?.fontFamily ?? DEFAULT_FONT.postScriptName
  );

  const canonicalValue = isMixed
    ? "Mixed"
    : (value === "normal" || fontSize === undefined)
      ? "Auto"
      : String(Math.round(Number(value) * fontSize));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (v: "normal" | number) => {
    if (v === "normal" || fontSize === undefined) {
      dispatchGroupEdit(targetIds, { lineHeight: "normal" });
      setLocalValue("Auto");
    } else {
      dispatchGroupEdit(targetIds, { lineHeight: v / fontSize });
      setLocalValue(String(Math.round(v)));
    }
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "Mixed") return;
    if (localValue === "") {
      commit("normal");
      return;
    }
    const num = Number(localValue);
    if (!Number.isNaN(num)) commit(num);
  };

  const resolvedNormal = useResolvedLineHeight(fontFamily, fontSize);
  const canShowResolvedHint = !isMixed && !isFontSizeMixed && !isFontFamilyMixed;
  const placeholder =
    localValue === "" && resolvedNormal !== null && canShowResolvedHint
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
              if (localValue === "Auto" || localValue === "Mixed") setLocalValue("");
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

const FontWordBreak = ({ id, ids, value }: { id: string; ids?: string[]; value: string }) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const { isMixed } = useMixedValue<string>(
    targetIds,
    (item) => item.details?.wordBreak ?? "normal"
  );

  const [localValue, setLocalValue] = useState<string>(value);
  const [open, setOpen] = useState(false);

  const onChange = (v: string) => {
    setLocalValue(v);
    dispatchGroupEdit(targetIds, { wordBreak: v });
  };

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const currentLabel = isMixed
    ? "Mixed"
    : wordBreakOptions.find((o) => o.value === localValue)?.label ?? "Default";

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex flex-1 items-center text-xs text-muted-foreground">
        Word break
      </div>
      <div className="flex gap-2">
        <div className="relative w-full">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                className="flex w-full items-center justify-between text-sm"
                variant="outline"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">{currentLabel}</p>
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
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                    key={index}
                  >
                    {option.label}
                    {!isMixed && option.value === localValue && (
                      <Check size={14} className="text-muted-foreground" />
                    )}
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

const FontLetterSpacing = ({ id, ids, value }: { id: string; ids?: string[]; value: string | number }) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const { isMixed } = useMixedValue<string | number>(
    targetIds,
    (item) => item.details?.letterSpacing ?? "normal"
  );

  const canonicalValue = isMixed
    ? "Mixed"
    : value === "normal"
      ? "Auto"
      : String(Math.round(Number(value)));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (v: "normal" | number) => {
    if (v === "normal") {
      dispatchGroupEdit(targetIds, { letterSpacing: "normal" });
      setLocalValue("Auto");
    } else {
      dispatchGroupEdit(targetIds, { letterSpacing: v });
      setLocalValue(String(Math.round(v)));
    }
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "Mixed") return;
    if (localValue === "") {
      commit("normal");
      return;
    }
    const num = Number(localValue);
    if (!Number.isNaN(num)) commit(num);
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
              if (localValue === "Auto" || localValue === "Mixed") setLocalValue("");
            }}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === "" || !Number.isNaN(Number(newValue))) {
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

const FontWordSpacing = ({ id, ids, value }: { id: string; ids?: string[]; value: string | number }) => {
  const targetIds = ids && ids.length > 0 ? ids : [id];
  const { isMixed } = useMixedValue<string | number>(
    targetIds,
    (item) => item.details?.wordSpacing ?? "normal"
  );

  const canonicalValue = isMixed
    ? "Mixed"
    : value === "normal"
      ? "Auto"
      : String(Math.round(Number(value)));

  const [localValue, setLocalValue] = useState<string>(canonicalValue);

  useEffect(() => {
    setLocalValue(canonicalValue);
  }, [canonicalValue]);

  const commit = (v: "normal" | number) => {
    if (v === "normal") {
      dispatchGroupEdit(targetIds, { wordSpacing: "normal" });
      setLocalValue("Auto");
    } else {
      dispatchGroupEdit(targetIds, { wordSpacing: v });
      setLocalValue(String(Math.round(v)));
    }
  };

  const handleBlur = () => {
    setLocalValue(canonicalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (localValue === "Mixed") return;
    if (localValue === "") {
      commit("normal");
      return;
    }
    const num = Number(localValue);
    if (!Number.isNaN(num)) commit(num);
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
              if (localValue === "Auto" || localValue === "Mixed") setLocalValue("");
            }}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === "" || !Number.isNaN(Number(newValue))) {
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