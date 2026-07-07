import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../store/use-data-state";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import React, { useEffect, useState } from "react";
import { IBoxShadow, IText, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import { TextControls } from "./common/text";
import { ICompactFont, IFont } from "../interfaces/editor";
import { DEFAULT_FONT } from "../constants/font";
import { PresetText } from "./common/preset-text";
import { Animations } from "./common/animations";

interface ITextControlProps {
  color: string;
  colorDisplay: string;
  backgroundColor: string;
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

// outside the component
const resolveFontFromDetails = (
  details: (ITrackItem & IText)["details"],
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
  details: (ITrackItem & IText)["details"],
  fontFamilyDisplay?: string
): ITextControlProps => {
  const opacity = details.opacity ?? 1;
  const { lines, color } = splitTextDecoration(details.textDecoration);
  return {
    color: details.color || "#ffffff",
    colorDisplay: details.color || "#ffffff",
    backgroundColor: details.backgroundColor || "transparent",
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
    boxShadow: details.boxShadow
  };
};

const BasicText = ({
  trackItem,
  type
}: {
  trackItem: ITrackItem & IText;
  type?: string;
}) => {
  const showAll = !type;
  const { compactFonts, fonts } = useDataState(); // moved above the useStates

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
    });
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

  const handleColorChange = (color: string) => {
    setProperties((prev) => {
      return {
        ...prev,
        color: color
      } as ITextControlProps;
    });

    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            color: color
          }
        }
      }
    });
  };

  const handleBackgroundChange = (color: string) => {
    setProperties((prev) => {
      return {
        ...prev,
        backgroundColor: color
      } as ITextControlProps;
    });

    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            backgroundColor: color
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

  const components = [
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
          handleColorChange={handleColorChange}
          handleBackgroundChange={handleBackgroundChange}
          onChangeTextAlign={onChangeTextAlign}
          onChangeTextDecorationLines={onChangeTextDecorationLines}
          onChangeTextDecorationColor={onChangeTextDecorationColor}
          handleChangeOpacity={handleChangeOpacity}
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
        />
      )
    },
    {
      key: "animations",
      component: <Animations trackItem={trackItem} properties={properties} />
    },
  ];

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-6 p-4">
          {components
            .filter((comp) => showAll || comp.key === type)
            .map((comp) => (
              <React.Fragment key={comp.key}>{comp.component}</React.Fragment>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BasicText;