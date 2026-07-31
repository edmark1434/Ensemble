import { ScrollArea } from "@/components/ui/scroll-area";
import useDataState from "../store/use-data-state";
import useStore from "../store/use-store";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_ANIMATION, EDIT_OBJECT } from "@designcombo/state";
import React, { useEffect, useState } from "react";
import { IBoxShadow, ITrackItem } from "@designcombo/types";
import {Group, Lock, X} from "lucide-react";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import { TextControls } from "./common/text";
import CaptionWords from "./common/caption-words";
import CaptionColors from "./common/caption-colors";
import AnimationCaption from "./common/animation-caption";
import { Animations } from "./common/animations";
import { Animation, presets } from "../player/animated";
import { PresetName } from "../player/animated/presets";
import { TransitionControls } from "./common/transition-controls";
import { ICompactFont, IFont } from "../interfaces/editor";
import { DEFAULT_FONT } from "../constants/font";
import { Appearance } from "@/features/editor/control-item/common/appearance";
import { LayoutGroup } from "@/features/editor/control-item/common/layout-group";
import PlaybackControls from "@/features/editor/control-item/common/playback";

interface ITransitionLike {
  id: string;
  kind: string;
  duration: number;
  direction?: string;
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
  return fontName.substring(fontFamilyEnd + 1).replace("Italic", " Italic");
};

const resolveFontFromDetails = (
  details: Record<string, any>,
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

interface IGroupTextProperties {
  color: string;
  backgroundColor: string;
  appearedColor: string;
  activeColor: string;
  activeFillColor: string;
  isKeywordColor: string;
  preservedColorKeyWord: boolean;
  fontSize: number;
  fontFamily: string;
  fontFamilyDisplay: string;
  textAlign: string;
  textDecoration: string;
  textDecorationLines: string;
  textDecorationColor: string;
  borderWidth: number;
  borderColor: string;
  boxShadow: IBoxShadow;
  opacity: number;
}

const getGroupTextProperties = (
  textLikeDetails: Record<string, any> | undefined,
  captionDetails: Record<string, any> | undefined,
  fontFamilyDisplay?: string
): IGroupTextProperties => {
  const details = textLikeDetails ?? {};
  const { lines, color } = splitTextDecoration(details.textDecoration);
  return {
    color: details.color || "#ffffff",
    backgroundColor: details.backgroundColor || "transparent",
    appearedColor: captionDetails?.appearedColor || "#ffffff",
    activeColor: captionDetails?.activeColor || "#ffffff",
    activeFillColor: captionDetails?.activeFillColor || "#ffffff",
    isKeywordColor: captionDetails?.isKeywordColor || "transparent",
    preservedColorKeyWord: captionDetails?.preservedColorKeyWord || false,
    fontSize: details.fontSize || 62,
    fontFamily: details.fontFamily,
    fontFamilyDisplay: fontFamilyDisplay || details.fontFamily,
    textAlign: details.textAlign || "left",
    textDecoration: details.textDecoration || "none",
    textDecorationLines: lines,
    textDecorationColor: color,
    borderWidth: details.borderWidth || 0,
    borderColor: details.borderColor || "#000000",
    boxShadow: details.boxShadow || { color: "#000000", x: 0, y: 0, blur: 0 },
    opacity: details.opacity ?? 100
  };
};

const BasicGroup = ({ type }: { type?: string }) => {
  const showAll = !type;
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const { compactFonts, fonts } = useDataState();

  const transitionIds = activeIds.filter((id) => transitionsMap[id]);
  const transitions = transitionIds.map((id) => transitionsMap[id]) as ITransitionLike[];

  const items = activeIds.map((id) => trackItemsMap[id]).filter(Boolean) as (ITrackItem & any)[];

  const textItems = items.filter((i) => i.type === "text");
  const captionItems = items.filter((i) => i.type === "caption");
  const mediaItems = items.filter((i) => i.type === "image" || i.type === "video");
  const nonAudioItems = items.filter((i) => i.type !== "audio");
  const playableItems = items.filter((i) => i.type === "video" || i.type === "audio");
  const animatableItems = nonAudioItems.filter((i) => i.type !== "caption");

  const hasCaption = captionItems.length > 0;
  const hasText = textItems.length > 0;
  const hasTextOrCaption = hasText || hasCaption;
  const isCaptionOnly = nonAudioItems.length > 0 && captionItems.length === nonAudioItems.length;
  const hasPlayable = playableItems.length > 0;

  const textLikeItems = [...textItems, ...captionItems];
  const textLikeIds = textLikeItems.map((i) => i.id);
  const captionIds = captionItems.map((i) => i.id);
  const nonAudioIds = nonAudioItems.map((i) => i.id);
  const playableIds = playableItems.map((i) => i.id);
  const animatableIds = animatableItems.map((i) => i.id);
  // Media is the more restrictive set — any non-text item in the group
  // pulls everyone down to media-safe presets.
  const groupAnimationType: "text" | "media" =
    animatableItems.length > 0 && animatableItems.every((i) => i.type === "text")
      ? "text"
      : "media";

  const representativeTextLike = textLikeItems[0];
  const representativeCaption = captionItems[0];
  const representativeVisual = nonAudioItems[0];
  const representativeMedia = mediaItems[0];
  const representativePlayable = playableItems[0];

  const initialFont =
    (representativeTextLike && resolveFontFromDetails(representativeTextLike.details, fonts, compactFonts)) ?? {
      family: DEFAULT_FONT.family,
      styles: [],
      default: DEFAULT_FONT,
      name: "Regular"
    };

  const [selectedFont, setSelectedFont] = useState<ICompactFont>(initialFont);
  const [properties, setProperties] = useState<IGroupTextProperties>(() =>
    getGroupTextProperties(representativeTextLike?.details, representativeCaption?.details, initialFont.family)
  );

  useEffect(() => {
    if (!representativeTextLike) return;
    const resolved = resolveFontFromDetails(representativeTextLike.details, fonts, compactFonts);
    if (resolved) setSelectedFont(resolved);
    setProperties(
      getGroupTextProperties(representativeTextLike.details, representativeCaption?.details, resolved?.family)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [representativeTextLike?.id, representativeTextLike?.details, representativeCaption?.details]);

  const [activeModalAnimation, setActiveModalAnimation] = useState(false);
  const handleModalAnimation = (newState?: boolean) => {
    setActiveModalAnimation((prev) => (newState !== undefined ? newState : !prev));
  };

  const buildBroadcastPayload = (ids: string[], details: Record<string, unknown>) => {
    const payload: Record<string, { details: Record<string, unknown> }> = {};
    ids.forEach((id) => {
      payload[id] = { details };
    });
    return payload;
  };

  const handleChangeFontStyle = async (font: IFont) => {
    const fontName = font.postScriptName;
    const fontUrl = font.url;
    const styleName = getStyleNameFromFontName(fontName);
    await loadFonts([{ name: fontName, url: fontUrl }]);
    setSelectedFont((prev) => ({ ...prev, name: styleName }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { fontFamily: fontName, fontUrl }) });
  };

  const onChangeFontFamily = async (font: ICompactFont) => {
    const fontName = font.default.postScriptName;
    const fontUrl = font.default.url;
    await loadFonts([{ name: fontName, url: fontUrl }]);
    setSelectedFont({ ...font, name: getStyleNameFromFontName(fontName) });
    setProperties((prev) => ({ ...prev, fontFamily: font.default.family, fontFamilyDisplay: font.default.family }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { fontFamily: fontName, fontUrl }) });
  };

  const onChangeFontSize = (v: number) => {
    setProperties((prev) => ({ ...prev, fontSize: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { fontSize: v }) });
  };

  const handleColorChange = (color: string) => {
    setProperties((prev) => ({ ...prev, color }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { color }) });
  };

  const handleBackgroundChange = (color: string) => {
    setProperties((prev) => ({ ...prev, backgroundColor: color }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { backgroundColor: color }) });
  };

  const onChangeTextAlign = (v: string) => {
    setProperties((prev) => ({ ...prev, textAlign: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { textAlign: v }) });
  };

  const onChangeTextDecorationLines = (v: string) => {
    const combined = joinTextDecoration(v, properties.textDecorationColor);
    setProperties((prev) => ({ ...prev, textDecoration: combined, textDecorationLines: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { textDecoration: combined }) });
  };

  const onChangeTextDecorationColor = (v: string) => {
    const combined = joinTextDecoration(properties.textDecorationLines, v);
    setProperties((prev) => ({ ...prev, textDecoration: combined, textDecorationColor: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { textDecoration: combined }) });
  };

  const onChangeBorderWidth = (v: number) => {
    setProperties((prev) => ({ ...prev, borderWidth: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { borderWidth: v }) });
  };

  const onChangeBorderColor = (v: string) => {
    setProperties((prev) => ({ ...prev, borderColor: v }));
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(textLikeIds, { borderColor: v }) });
  };

  const onChangeBoxShadow = (boxShadow: IBoxShadow) => {
    const prevBoxShadow = properties.boxShadow;
    setProperties((prev) => ({ ...prev, boxShadow }));

    const changedKeys = (Object.keys(boxShadow) as (keyof IBoxShadow)[]).filter(
      (key) => boxShadow[key] !== prevBoxShadow[key]
    );

    const payload: Record<string, { details: { boxShadow: IBoxShadow } }> = {};
    textLikeIds.forEach((id) => {
      const itemBoxShadow = (trackItemsMap[id]?.details as any)?.boxShadow ?? {
        color: "#000000",
        x: 0,
        y: 0,
        blur: 0
      };
      const merged = { ...itemBoxShadow };
      changedKeys.forEach((key) => {
        (merged as any)[key] = boxShadow[key];
      });
      payload[id] = { details: { boxShadow: merged } };
    });

    dispatch(EDIT_OBJECT, { payload });
  };

  const handleChangeVolume = (v: number) => {
    dispatch(EDIT_OBJECT, { payload: buildBroadcastPayload(playableIds, { volume: v }) });
  };

  const handleChangeSpeed = (v: number) => {
    const payload: Record<string, { playbackRate: number }> = {};
    playableIds.forEach((id) => {
      payload[id] = { playbackRate: v };
    });
    dispatch(EDIT_OBJECT, { payload });
  };

  // "In" preset picker for captions — mirrors BasicCaption's floating
  // animation modal, but applies to every caption in the group at once.
  const applyCaptionAnimation = (presetName: PresetName, animType: "in" | "out") => {
    if (captionIds.length === 0) return;
    const presetAnimation = presets[presetName];
    const composition: Animation[] = [presetAnimation];
    captionIds.forEach((id) => {
      dispatch(ADD_ANIMATION, {
        payload: { id, animations: { [animType]: { name: presetName, composition } } }
      });
    });
  };

  const presetInButtons = Object.keys(presets)
    .filter((key) => key.includes("In"))
    .map((presetKey) => {
      const preset = presets[presetKey as "scaleIn"];
      if (preset.property?.toLowerCase().includes("text") || preset.property?.toLowerCase().includes("shake")) {
        return null;
      }
      return (
        <div
          key={presetKey}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground"
          onClick={() => applyCaptionAnimation(presetKey as PresetName, "in")}
        >
          <div
            style={{
              backgroundImage: `url(${preset.previewUrl})`,
              backgroundSize: "cover",
              width: "50px",
              height: "50px",
              borderRadius: "8px"
            }}
            draggable={false}
          />
          <div>{preset.name}</div>
        </div>
      );
    });

  const isLocked = items.some((item) => (item.details as any)?.locked === true);

  const allComponents = [
    // nonAudioItems.length > 0 && {
    //   key: "layout",
    //   component: <LayoutGroup items={nonAudioItems} />
    // },
    nonAudioItems.length > 0 && {
      key: "appearance",
      component: (
        <Appearance
          id={representativeVisual!.id}
          ids={nonAudioIds}
          opacity={representativeVisual!.details?.opacity ?? 100}
          cornerRadius={representativeVisual!.details?.borderRadius ?? 0}
          {...(!hasTextOrCaption && representativeMedia
            ? {
              blur: representativeMedia.details?.blur ?? 0,
              brightness: representativeMedia.details?.brightness ?? 100
            }
            : {})}
          disabled={isLocked}
        />
      )
    },
    hasPlayable && {
      key: "playback",
      component: (
        <PlaybackControls
          ids={playableIds}
          speed={representativePlayable?.playbackRate ?? 1}
          volume={representativePlayable?.details?.volume ?? 100}
          onChangeSpeed={handleChangeSpeed}
          onChangeVolume={handleChangeVolume}
          disabled={isLocked}
        />
      )
    },
    hasCaption && {
      key: "captionWords",
      component: (
        <CaptionWords
          id={representativeCaption!.id}
          ids={captionIds}
          trackItem={representativeCaption}
          handleModalAnimation={handleModalAnimation}
        />
      )
    },
    hasTextOrCaption && {
      key: "typography",
      component: (
        <>
          <TextControls
            ids={textLikeIds}
            trackItem={representativeTextLike}
            properties={properties}
            selectedFont={selectedFont}
            onChangeFontFamily={onChangeFontFamily}
            handleChangeFontStyle={handleChangeFontStyle}
            onChangeFontSize={onChangeFontSize}
            onChangeTextAlign={onChangeTextAlign}
            onChangeTextDecorationLines={onChangeTextDecorationLines}
            onChangeTextDecorationColor={onChangeTextDecorationColor}
            {...(hasCaption ? { showFill: false } : { handleColorChange, handleBackgroundChange })}
            disabled={isLocked}
          />
          {hasCaption && (
            <CaptionColors
              id={representativeCaption!.id}
              textLikeIds={textLikeIds}
              captionIds={captionIds}
              color={properties.color}
              backgroundColor={properties.backgroundColor}
              activeColor={properties.activeColor}
              activeFillColor={properties.activeFillColor}
              appearedColor={properties.appearedColor}
              isKeywordColor={properties.isKeywordColor}
              preservedColorKeyWord={properties.preservedColorKeyWord}
              disabled={isLocked}
            />
          )}
        </>
      )
    },
    hasTextOrCaption && {
      key: "fontStroke",
      component: (
        <Outline
          label="Stroke"
          ids={textLikeIds}
          onChageBorderWidth={onChangeBorderWidth}
          onChangeBorderColor={onChangeBorderColor}
          valueBorderWidth={properties.borderWidth}
          valueBorderColor={properties.borderColor}
          disabled={isLocked}
        />
      )
    },
    hasTextOrCaption && {
      key: "fontShadow",
      component: (
        <Shadow
          label="Shadow"
          ids={textLikeIds}
          onChange={onChangeBoxShadow}
          value={properties.boxShadow}
          disabled={isLocked} />
      )
    },
    // nonAudioItems.length > 0 && {
    //   key: "animations",
    //   component: isCaptionOnly ? (
    //     <AnimationCaption ids={captionIds} />
    //   ) : (
    //     <Animations
    //       trackItem={representativeVisual}
    //       ids={animatableIds}
    //       properties={{
    //         opacity: representativeVisual?.details?.opacity ?? 100,
    //         borderRadius: representativeVisual?.details?.borderRadius ?? 0,
    //         blur: representativeMedia?.details?.blur ?? 0,
    //         brightness: representativeMedia?.details?.brightness ?? 100
    //       }}
    //       disabled={isLocked}
    //       showLoop={hasText}
    //       captionIds={hasCaption ? captionIds : undefined}
    //       animationType={groupAnimationType}
    //     />
    //   )
    // },
    // transitions.length > 0 && {
    //   key: "transition",
    //   component: (
    //     <TransitionControls
    //       id={transitionIds[0]}
    //       ids={transitionIds}
    //       disabled={isLocked} />
    //   )
    // }
  ].filter(Boolean) as { key: string; component: React.ReactNode }[];

  const visibleComponents = allComponents.filter((comp) => showAll || comp.key === type);

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
              <X width={16} className="cursor-pointer" onClick={() => handleModalAnimation()} />
            </div>
            <div className="h-full overflow-hidden">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-3 gap-2 py-4">{presetInButtons}</div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
        {visibleComponents.length === 0 ? (
          <div className="flex w-full h-full items-center justify-center text-sm text-muted-foreground">
            Multiple items selected
          </div>
        ) : (
          <ScrollArea className="h-full">
            <fieldset disabled={isLocked} className="flex flex-col gap-6 p-4 border-0 m-0 min-w-0">
              <div className="flex gap-2 items-center text-primary text-sm font-normal">
                <Group size={16} />
                <span>
                  Multiple items selected
                </span>
              </div>
              {isLocked && (
                <div className="-mt-3 flex gap-2 items-center text-primary text-sm font-normal">
                  <Lock size={16} />
                  <span>
                  These items have been locked
                </span>
                </div>
              )}

              {visibleComponents.map((comp) => (
                <React.Fragment key={comp.key}>{comp.component}</React.Fragment>
              ))}
            </fieldset>
          </ScrollArea>
        )}
      </div>
    </>
  );
};

export default BasicGroup;