import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../store/use-data-state";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_ANIMATION, EDIT_OBJECT } from "@designcombo/state";
import React, { useEffect, useState } from "react";
import { IBoxShadow, ICaption, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import CaptionWords from "./common/caption-words";
import CaptionColors from "./common/caption-colors";
import { TextControls } from "./common/text";
import { Animation, presets } from "../player/animated";
import { PresetName } from "../player/animated/presets";
import {Lock, X} from "lucide-react";
import { ICompactFont, IFont } from "../interfaces/editor";
import { DEFAULT_FONT } from "../constants/font";
import { PresetCaption } from "./common/preset-caption";
import AnimationCaption from "./common/animation-caption";
import {LayoutControls} from "@/features/editor/control-item/common/layout";
import {CaptionDimensionsSync} from "@/features/editor/control-item/common/caption-dimensions-sync";
import {Appearance} from "@/features/editor/control-item/common/appearance";

interface ITextControlProps {
  color: string;
  colorDisplay: string;
  appearedColor: string;
  activeColor: string;
  activeFillColor: string;
  fontSize: number;
  fontSizeDisplay: string;
  fontFamily: string;
  fontFamilyDisplay: string;
  opacityDisplay: string;
  textAlign: string;
  textDecoration: string;
  textDecorationLines: string;
  textDecorationColor: string;
  borderWidth: number;
  borderColor: string;
  opacity: number;
  boxShadow: IBoxShadow;
  isKeywordColor: string;
  preservedColorKeyWord: boolean;
  backgroundColor: string;
}

const DECORATION_LINE_VALUES = ["underline", "overline", "line-through"];

function splitTextDecoration(raw: string | undefined): { lines: string; color: string } {
  const tokens = (raw || "").trim().split(/\s+/).filter(Boolean);
  const lines = tokens.filter((t) => DECORATION_LINE_VALUES.includes(t)).join(" ");
  const color = tokens.find((t) => t.startsWith("#")) ?? "";
  return { lines, color };
}

function joinTextDecoration(lines: string, color: string): string {
  const parts = [lines, color].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "none";
}

const getStyleNameFromFontName = (fontName: string) => {
  const fontFamilyEnd = fontName.lastIndexOf("-");
  const styleName = fontName
    .substring(fontFamilyEnd + 1)
    .replace("Italic", " Italic");
  return styleName;
};

const resolveFontFromDetails = (
  details: (ITrackItem & ICaption)["details"],
  fonts: IFont[],
  compactFonts: ICompactFont[]
): ICompactFont | undefined => {
  const fontFamily = details.fontFamily || DEFAULT_FONT.postScriptName;
  const currentFont = fonts.find((font) => font.postScriptName === fontFamily);
  if (!currentFont) return undefined;

  const matched = compactFonts.find((font) => font.family === currentFont.family);
  if (!matched) return undefined;

  return { ...matched, name: getStyleNameFromFontName(currentFont.postScriptName) };
};

const getPropertiesFromDetails = (
  details: (ITrackItem & ICaption)["details"],
  fontFamilyDisplay?: string
): ITextControlProps => {
  const opacity = details.opacity ?? 100;
  const { lines, color } = splitTextDecoration(details.textDecoration);
  return {
    color: details.color || "#ffffff",
    colorDisplay: details.color || "#ffffff",
    appearedColor: details.appearedColor || "#ffffff",
    activeColor: details.activeColor || "#ffffff",
    activeFillColor: details.activeFillColor || "#ffffff",
    isKeywordColor: details.isKeywordColor || "transparent",
    preservedColorKeyWord: details.preservedColorKeyWord || false,
    fontSize: details.fontSize || 62,
    fontSizeDisplay: `${details.fontSize || 62}px`,
    fontFamily: details.fontFamily,
    fontFamilyDisplay: fontFamilyDisplay || details.fontFamily,
    opacity,
    opacityDisplay: `${opacity}%`,
    textAlign: details.textAlign || "left",
    textDecoration: details.textDecoration || "none",
    textDecorationLines: lines,
    textDecorationColor: color,
    borderWidth: details.borderWidth || 0,
    borderColor: details.borderColor || "#000000",
    boxShadow: details.boxShadow || {
      color: "#000000",
      x: 0,
      y: 0,
      blur: 0
    },
    backgroundColor: details.backgroundColor || "transparent",
  };
};

const BasicCaption = ({
  trackItem,
  type
}: {
  trackItem: ITrackItem & ICaption;
  type?: string;
}) => {
  const showAll = !type;
  const [activeModalAnimation, setActiveModalAnimation] =
    useState<boolean>(false);
  const handleModalAnimation = (newState?: boolean) => {
    if (newState !== undefined) {
      setActiveModalAnimation(newState);
    } else {
      setActiveModalAnimation(!activeModalAnimation);
    }
  };
  const { compactFonts, fonts } = useDataState();

  const initialFont =
    resolveFontFromDetails(trackItem.details, fonts, compactFonts) ?? {
      family: DEFAULT_FONT.family,
      styles: [],
      default: DEFAULT_FONT,
      name: "Regular"
    };

  const [selectedFont, setSelectedFont] = useState<ICompactFont>(initialFont);

  const [properties, setProperties] = useState<ITextControlProps>(() =>
    getPropertiesFromDetails(trackItem.details, initialFont.family)
  );

  useEffect(() => {
    const resolved = resolveFontFromDetails(trackItem.details, fonts, compactFonts);
    if (!resolved) return;

    setSelectedFont(resolved);
    setProperties(getPropertiesFromDetails(trackItem.details, resolved.family));
  }, [trackItem.details]);

  const handleChangeFontStyle = async (font: IFont) => {
    const fontName = font.postScriptName;
    const fontUrl = font.url;
    const styleName = getStyleNameFromFontName(fontName);
    await loadFonts([
      {
        name: fontName,
        url: fontUrl
      }
    ]);
    setSelectedFont({ ...selectedFont, name: styleName });
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            fontFamily: fontName,
            fontUrl: fontUrl
          }
        }
      }
    });
  };

  const onChangeBorderWidth = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            borderWidth: v
          }
        }
      }
    });
    setProperties((prev) => {
      return {
        ...prev,
        borderWidth: v
      } as ITextControlProps;
    });
  };

  const onChangeBorderColor = (v: string) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            borderColor: v
          }
        }
      }
    });
    setProperties((prev) => {
      return {
        ...prev,
        borderColor: v
      } as ITextControlProps;
    });
  };

  const handleChangeOpacity = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            opacity: v
          }
        }
      }
    });
    setProperties((prev) => {
      return {
        ...prev,
        opacity: v
      } as ITextControlProps;
    }); // Update local state
  };

  const onChangeBoxShadow = (boxShadow: IBoxShadow) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            boxShadow: boxShadow
          }
        }
      }
    });

    setProperties((prev) => {
      return {
        ...prev,
        boxShadow
      } as ITextControlProps;
    });
  };

  const onChangeFontSize = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            fontSize: v
          }
        }
      }
    });
    setProperties((prev) => {
      return {
        ...prev,
        fontSize: v
      } as ITextControlProps;
    });
  };

  const onChangeFontFamily = async (font: ICompactFont) => {
    const fontName = font.default.postScriptName;
    const fontUrl = font.default.url;

    await loadFonts([
      {
        name: fontName,
        url: fontUrl
      }
    ]);
    setSelectedFont({ ...font, name: getStyleNameFromFontName(fontName) });
    setProperties({
      ...properties,
      fontFamily: font.default.family,
      fontFamilyDisplay: font.default.family
    });

    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            fontFamily: fontName,
            fontUrl: fontUrl
          }
        }
      }
    });
  };

  const onChangeTextAlign = (v: string) => {
    setProperties((prev) => {
      return {
        ...prev,
        textAlign: v
      } as ITextControlProps;
    });
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            textAlign: v
          }
        }
      }
    });
  };

  const onChangeTextDecorationLines = (v: string) => {
    const combined = joinTextDecoration(v, properties.textDecorationColor);
    setProperties((prev) => ({
      ...prev,
      textDecoration: combined,
      textDecorationLines: v
    } as ITextControlProps));
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { textDecoration: combined } } }
    });
  };

  const onChangeTextDecorationColor = (v: string) => {
    const combined = joinTextDecoration(properties.textDecorationLines, v);
    setProperties((prev) => ({
      ...prev,
      textDecoration: combined,
      textDecorationColor: v
    } as ITextControlProps));
    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { textDecoration: combined } } }
    });
  };

  const applyAnimation = (presetName: PresetName, type: "in" | "out") => {
    if (!trackItem.id) {
      console.warn("No active ID to apply the animation to.");
      return;
    }
    const presetAnimation = presets[presetName];
    const composition: Animation[] = [presetAnimation];

    dispatch(ADD_ANIMATION, {
      payload: {
        id: trackItem.id,
        animations: {
          [type]: {
            name: presetName,
            composition
          }
        }
      }
    });
  };
  const createPresetButtons = (
    filter: (key: string) => boolean,
    type: "in" | "out"
  ) =>
    Object.keys(presets)
      .filter(filter)
      .map((presetKey) => {
        const preset = presets[presetKey as "scaleIn"];
        const style = React.useMemo(
          () => ({
            backgroundImage: `url(${preset.previewUrl})`,
            backgroundSize: "cover",
            width: "50px",
            height: "50px",
            borderRadius: "8px"
          }),
          [preset.previewUrl]
        );
        if (
          preset.property?.toLowerCase().includes("text") ||
          preset.property?.toLowerCase().includes("shake")
        )
          return;

        return (
          <div
            key={presetKey}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"
            onClick={() => applyAnimation(presetKey as PresetName, type)}
          >
            <div style={style} draggable={false} />
            <div>{preset.name}</div>
          </div>
        );
      });

  const presetInButtons = createPresetButtons(
    (key) => key.includes("In"),
    "in"
  );

  const isLocked = (trackItem.details as any)?.locked === true;

  const components = [
    {
      key: "layout",
      component: <LayoutControls trackItem={trackItem} />
    },
    {
      key: "captionWords",
      component: (
        <CaptionWords
          id={trackItem.id}
          handleModalAnimation={handleModalAnimation}
          trackItem={trackItem}
        />
      )
    },
    {
      key: "appearance",
      component: (
        <Appearance
          id={trackItem.id}
          opacity={properties.opacity}
          cornerRadius={trackItem.details?.borderRadius ?? 0}
          disabled={isLocked}
        />
      )
    },
    {
      key: "textControls",
      component: (
        <TextControls
          trackItem={trackItem}
          properties={properties}
          selectedFont={selectedFont}
          onChangeFontFamily={onChangeFontFamily}
          handleChangeFontStyle={handleChangeFontStyle}
          onChangeFontSize={onChangeFontSize}
          onChangeTextAlign={onChangeTextAlign}
          onChangeTextDecorationLines={onChangeTextDecorationLines}
          onChangeTextDecorationColor={onChangeTextDecorationColor}
          showFill={false}
          disabled={isLocked}
        />
      )
    },
    {
      key: "captionColors",
      component: (
        <CaptionColors
          id={trackItem.id}
          color={properties.color}
          backgroundColor={properties.backgroundColor}
          activeColor={properties.activeColor}
          activeFillColor={properties.activeFillColor}
          appearedColor={properties.appearedColor}
          isKeywordColor={properties.isKeywordColor}
          preservedColorKeyWord={properties.preservedColorKeyWord}
          disabled={isLocked}
        />
      )
    },
    {
      key: "fontStroke",
      component: (
        <Outline
          label="Stroke"
          onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
          onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
          valueBorderWidth={properties.borderWidth as number}
          valueBorderColor={properties.borderColor as string}
          disabled={isLocked}
        />
      )
    },
    {
      key: "fontShadow",
      component: (
        <Shadow
          label="Shadow"
          onChange={(v: IBoxShadow) => onChangeBoxShadow(v)}
          value={properties.boxShadow}
          disabled={isLocked}
        />
      )
    },
    {
      key: "animations",
      component: <AnimationCaption />
    },
    {
      key: "captionDimensionsSync",
      component: <CaptionDimensionsSync trackItem={trackItem} />
    },
  ];
  return (
    <>
      {activeModalAnimation && (
        <div
          className="absolute right-[275px] top-1/2 z-[200] mt-6 flex h-[calc(100%-180px)] w-[250px] -translate-y-1/2 rounded-lg bg-background/80 shadow-lg transition duration-300 ease-in-out"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex h-full flex-col gap-2 p-4">
            <div className="flex justify-between">
              <p>Animations</p>
              <X
                width={16}
                className="cursor-pointer"
                onClick={() => {
                  handleModalAnimation();
                }}
              />
            </div>
            <div className="h-full overflow-hidden">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-3 gap-2 py-4">
                  {presetInButtons}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

export default BasicCaption;
