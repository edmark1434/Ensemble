import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

import {Check, ChevronDown } from "lucide-react";

import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useRef, useState } from "react";
import useLayoutStore from "../../store/use-layout-store";
import { ICaption, ITrackItem } from "@designcombo/types";
import useStore from "../../store/use-store";
import {applyPreset, groupCaptionItems} from "../floating-controls/caption-preset-picker";
import { dispatch } from "@designcombo/events";
import { ADD_ITEMS, EDIT_OBJECT, LAYER_DELETE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { debounce } from "lodash";
import {PresetPicker} from "@/features/editor/control-item/common/preset-picker";
import {useIsLargeScreen} from "@/hooks/use-media-query";
import {useMixedValue} from "@/features/editor/hooks/use-mixed-value";

export function regroupCaptions(
  captions: ICaption[],
  newLinesPerCaption: number
): ICaption[] {
  const allWords = captions.flatMap((c) => c.details.words);
  if (allWords.length === 0) return [];

  const base = captions[0];
  const fontFamily = base.details.fontFamily || "Arial";
  const fontSize = base.details.fontSize || 16;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px ${fontFamily}`;

  const maxWidth = base.details.width - 80;

  const newCaptions: ICaption[] = [];
  let buffer: typeof allWords = [];
  let currentLineWidth = 0;
  let currentLineCount = 1;

  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    const wordWidth = ctx.measureText(word.word).width;
    const spaceWidth = ctx.measureText(" ").width;

    let nextWidth =
      currentLineWidth === 0
        ? wordWidth
        : currentLineWidth + spaceWidth + wordWidth;

    if (nextWidth > maxWidth) {
      currentLineCount++;
      if (currentLineCount > newLinesPerCaption) {
        const text = buffer.map((w) => w.word).join(" ");
        const from = buffer[0].start;
        const to = buffer[buffer.length - 1].end;

        const newCaption: ICaption = {
          ...base,
          id: generateId(),
          display: { from, to },
          details: {
            ...base.details,
            text,
            linesPerCaption: newLinesPerCaption,
            words: [...buffer]
          }
        };

        newCaptions.push(newCaption);

        buffer = [];
        currentLineWidth = 0;
        currentLineCount = 1;
      } else {
        currentLineWidth = wordWidth;
      }
    } else {
      currentLineWidth = nextWidth;
    }

    buffer.push(word);

    if (i === allWords.length - 1 && buffer.length > 0) {
      const text = buffer.map((w) => w.word).join(" ");
      const from = buffer[0].start;
      const to = buffer[buffer.length - 1].end;

      const newCaption: ICaption = {
        ...base,
        id: generateId(),
        display: { from, to },
        details: {
          ...base.details,
          text,
          linesPerCaption: newLinesPerCaption,
          words: [...buffer]
        }
      };
      newCaptions.push(newCaption);
    }
  }

  return newCaptions;
}
type CaptionTransformType = "punctuationOrPause" | "time" | "singleWord";

export function transformCaptions(
  captions: ICaption[],
  type: CaptionTransformType
): ICaption[] {
  if (!captions.length) return [];

  const allWords = captions.flatMap((c) => c.details.words);

  const base = captions[0];

  const makeCaption = (words: any[]): ICaption => {
    const text = words.map((w) => w.word).join(" ");
    return {
      ...base,
      id: generateId(),
      display: { from: words[0].start, to: words[words.length - 1].end },
      details: {
        ...base.details,
        text,
        words,
        wordsPerLine: type,
        linesPerCaption: 1
      }
    };
  };

  switch (type) {
    case "singleWord":
      return allWords.map((word) => makeCaption([{ ...word }]));

    case "punctuationOrPause":
      const result: ICaption[] = [];
      let buffer: any[] = [];

      for (let i = 0; i < allWords.length; i++) {
        const word = allWords[i];
        const nextWord = allWords[i + 1];

        buffer.push(word);

        let shouldSplit = false;

        if (nextWord) {
          const gap = nextWord.start - word.end;
          if (gap >= 150) {
            shouldSplit = true;
          }
        }

        if (
          !shouldSplit &&
          (/[.,!?;]/.test(word.word) || word.word.endsWith("."))
        ) {
          shouldSplit = true;
        }

        if (shouldSplit) {
          result.push(makeCaption([...buffer]));
          buffer = [];
        }
      }

      if (buffer.length > 0) {
        result.push(makeCaption(buffer));
      }
      return result;

    case "time":
      const interval = 500; // ms (0.5s)
      const chunks: ICaption[] = [];
      let currentStart = allWords[0]?.start || 0;
      let wordIndex = 0;

      while (
        currentStart < (allWords[allWords.length - 1]?.end || 0) &&
        wordIndex < allWords.length
        ) {
        const currentEnd = Math.min(
          currentStart + interval,
          allWords[allWords.length - 1]?.end || 0
        );
        const chunkWords: any[] = [];

        // Collect words that fall within this time interval
        while (
          wordIndex < allWords.length &&
          allWords[wordIndex].start < currentEnd
          ) {
          chunkWords.push(allWords[wordIndex]);
          wordIndex++;
        }

        if (chunkWords.length > 0) {
          chunks.push(makeCaption(chunkWords));
        }

        currentStart = currentEnd;
      }

      return chunks;

    default:
      return captions;
  }
}
const OPTIONS_LINES_PER_PAGE = [
  {
    label: "One",
    value: 1
  },
  {
    label: "Two",
    value: 2
  },

  {
    label: "Three",
    value: 3
  },

  {
    label: "Four",
    value: 4
  },

  {
    label: "Five",
    value: 5
  }
];

const OPTIONS_WORDS_PER_LINE = [
  {
    label: "Space",
    value: "singleWord"
  },
  {
    label: "Punctuation",
    value: "punctuationOrPause"
  },
  {
    label: "Time",
    value: "time"
  },
];

const OPTIONS_WORDS_IN_LINE = [
  {
    label: "Page",
    value: "page"
  },
  {
    label: "Line",
    value: "line"
  },
  {
    label: "Word",
    value: "word"
  }
];
const CaptionWords = ({
  handleModalAnimation,
  trackItem,
  ids
}: {
  id: string;
  ids?: string[];
  handleModalAnimation: (newState?: boolean) => void;
  trackItem: ITrackItem & any;
}) => {
  const { setFloatingControl } = useLayoutStore();
  const { trackItemsMap, size } = useStore();
  const targetIds = ids && ids.length > 0 ? ids : [trackItem.id];

  const [captionsData, setCaptionsData] = useState<any[]>([]);
  const [captionItemIds, setCaptionItemIds] = useState<string[]>([]);
  const [captionSourceGroups, setCaptionSourceGroups] = useState<any[][]>([]);
  const [topPosition, setTopPosition] = useState<string>(() => {
    const topValue = trackItem?.details.top;
    if (topValue === undefined) return "800";
    if (typeof topValue === "string") return topValue.replace("px", "");
    return String(topValue);
  });
  const [leftPosition, setLeftPosition] = useState<string>(() => {
    const leftValue = trackItem?.details.left;
    if (leftValue === undefined) {
      return String((size.width - elementWidth) / 2);
    }
    if (typeof leftValue === "string") return leftValue.replace("px", "");
    return String(leftValue);
  });
  const [data, setData] = useState<{
    linesPerCaption: number;
    wordsPerLine: string;
    captionsTransitions: string;
    showObject: string;
  }>({
    linesPerCaption: trackItem?.details?.linesPerCaption || 2,
    wordsPerLine: trackItem?.details?.wordsPerLine || "punctuationOrPause",
    captionsTransitions: "none",
    showObject: trackItem?.details?.showObject || "page"
  });

  const rawWidth = trackItem?.details.width as string | number | undefined;

  const elementWidth = Number(
    typeof rawWidth === "string" ? rawWidth.replace("px", "") : rawWidth || 0
  );
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const getPositionLabelForItem = (item: any, canvasHeight: number) => {
    const top = Number(item?.details?.top) || 0;
    const elementHeight = Number(item?.details?.height) || 0;
    const upVal = canvasHeight * 0.1;
    const middleVal = canvasHeight / 2 - elementHeight / 2;
    const downVal = canvasHeight * 0.9 - elementHeight;

    if (Math.abs(top - upVal) < 1) return "Top";
    if (Math.abs(top - middleVal) < 1) return "Middle";
    if (Math.abs(top - downVal) < 1) return "Bottom";
    return "Custom";
  };

  const { isMixed: isLinesPerCaptionMixed } = useMixedValue<number>(
    targetIds,
    (item) => item.details?.linesPerCaption ?? 2
  );
  const { isMixed: isWordsPerLineMixed } = useMixedValue<string>(
    targetIds,
    (item) => item.details?.wordsPerLine ?? "punctuationOrPause"
  );
  const { isMixed: isShowObjectMixed } = useMixedValue<string>(
    targetIds,
    (item) => item.details?.showObject ?? "page"
  );
  const { value: positionLabel, isMixed: isPositionMixed } = useMixedValue<string>(
    targetIds,
    (item) => getPositionLabelForItem(item, size.height)
  );

  // Group the currently-selected caption ids by their source audio, since
  // each source's captions represent an independent transcript. Regrouping
  // by lines/words per line has to run per-source, otherwise flattening
  // words across two different audio tracks produces garbage splits.
  useEffect(() => {
    const groupedCaptions = groupCaptionItems(trackItemsMap);

    const sourceUrls = Array.from(
      new Set(
        targetIds
          .map((itemId) => trackItemsMap[itemId]?.metadata?.sourceUrl)
          .filter(Boolean)
      )
    );

    const groups = sourceUrls.map((sourceUrl) => groupedCaptions[sourceUrl] || []);
    const allItems = groups.flat();

    setCaptionSourceGroups(groups);
    setCaptionItemIds(allItems.map((item) => item.id));
    setCaptionsData(allItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackItemsMap, trackItem, ids]);

  useEffect(() => {
    const handleClick = (event: Event) => {
      if (
        popoverRef.current &&
        event.target instanceof Node &&
        !popoverRef.current.contains(event.target)
      ) {
        handleModalAnimation(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const onChange = ({ type, value }: { type: string; value: any }) => {
    setData({ ...data, [type]: value });

    let newGroups: any[][] = [];

    if (type === "linesPerCaption") {
      newGroups = captionSourceGroups.map((group) => regroupCaptions(group, value));
    } else if (type === "wordsPerLine") {
      newGroups = captionSourceGroups.map((group) => transformCaptions(group, value));
    } else if (type === "showObject") {
      newGroups = captionSourceGroups.map((group) =>
        group.map((item) => ({
          ...item,
          details: { ...item.details, showObject: value }
        }))
      );
    } else {
      return;
    }

    dispatch(LAYER_DELETE, {
      payload: {
        trackItemIds: captionsData.map((t) => t.id)
      }
    });

    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: newGroups.flat(),
        tracks: newGroups
          .filter((group) => group.length > 0)
          .map((group) => ({
            id: generateId(),
            items: group.map((item) => item.id),
            type: "caption"
          }))
      }
    });
  };

  const handleSetHorizontalPosition = useCallback(
    debounce((left: number) => {
      const updates = captionsData.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: {
            details: { left }
          }
        }),
        {}
      );

      dispatch(EDIT_OBJECT, { payload: updates });
    }, 200),
    [captionsData]
  );

  const handleSetVerticalPosition = useCallback(
    debounce((computeTop: (item: ITrackItem & any) => number) => {
      const updates = captionsData.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: {
            details: { top: computeTop(item) }
          }
        }),
        {}
      );

      dispatch(EDIT_OBJECT, { payload: updates });
    }, 200),
    [captionsData]
  );

  const handlePresetPosition = (
    position: "left" | "center" | "right" | "up" | "middle" | "down"
  ) => {
    switch (position) {
      case "left": {
        const left = size.width * 0.1;
        setLeftPosition(String(left));
        handleSetHorizontalPosition(left);
        break;
      }
      case "center": {
        const left = (size.width - elementWidth) / 2;
        setLeftPosition(String(left));
        handleSetHorizontalPosition(left);
        break;
      }
      case "right": {
        const left = size.width * 0.9 - elementWidth;
        setLeftPosition(String(left));
        handleSetHorizontalPosition(left);
        break;
      }
      case "up": {
        const top = size.height * 0.1;
        setTopPosition(String(top));
        handleSetVerticalPosition(() => top);
        break;
      }
      case "middle": {
        const elementHeight = trackItem?.details.height || 0;
        setTopPosition(String(size.height / 2 - elementHeight / 2));
        handleSetVerticalPosition(
          (item) => size.height / 2 - (Number(item.details.height) || 0) / 2
        );
        break;
      }
      case "down": {
        const elementHeight = trackItem?.details.height || 0;
        setTopPosition(String(size.height * 0.9 - elementHeight));
        handleSetVerticalPosition(
          (item) => size.height * 0.9 - (Number(item.details.height) || 0)
        );
        break;
      }
    }
  };

  const animationOptions: { key: string; label: string }[] = [
    { key: "none", label: "None" },
    { key: "fade-in-full", label: "Fade" },
    { key: "scale-up-0", label: "Scale" },
    { key: "translate-x", label: "Slide" },
    { key: "scale-up-08", label: "Zoom" },
    { key: "scale-down-12", label: "Pop" },
    { key: "jump", label: "Jump" },
    { key: "pulse", label: "Pulse" }
  ];

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  function toggleOption(option: string) {
    setSelectedOptions((prev) => {
      let newOptions: string[];
      if (prev.includes(option)) {
        newOptions = [];
      } else {
        newOptions = [option];
      }

      const animationString = newOptions.length > 0 ? newOptions[0] : "none";
      selectAnimation(animationString);

      return newOptions;
    });
  }

  const selectAnimation = (animation: string) => {
    const payload = captionItemIds.reduce((acc, id) => {
      return {
        ...acc,
        [id]: {
          details: {
            animation
          }
        }
      };
    }, {});
    dispatch(EDIT_OBJECT, {
      payload
    });
  };

  const getPositionLabel = () => {
    if (isPositionMixed) return "Mixed";
    return positionLabel ?? "Custom";
  };

  const isLargeScreen = useIsLargeScreen();

  const handlePresetClick = (
    preset: any,
    captionItemIds: string[],
    captionsData: any[]
  ) => {
    applyPreset(preset, captionItemIds, captionsData);
  };

  const [showObjectOpen, setShowObjectOpen] = useState(false);
  const [linesPerCaptionOpen, setLinesPerCaptionOpen] = useState(false);
  const [wordsPerLineOpen, setWordsPerLineOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  // const [transitionOpen, setTransitionOpen] = useState(false);

  useEffect(() => {
    setData({
      linesPerCaption: trackItem?.details?.linesPerCaption || 2,
      wordsPerLine: trackItem?.details?.wordsPerLine || "punctuationOrPause",
      captionsTransitions: "none",
      showObject: trackItem?.details?.showObject || "page"
    });

    const topValue = trackItem?.details.top;
    setTopPosition(
      topValue === undefined
        ? "800"
        : typeof topValue === "string"
          ? topValue.replace("px", "")
          : String(topValue)
    );

    const leftValue = trackItem?.details.left;
    setLeftPosition(
      leftValue === undefined
        ? String((size.width - elementWidth) / 2)
        : typeof leftValue === "string"
          ? leftValue.replace("px", "")
          : String(leftValue)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackItem?.id]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Captions</Label>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              Position
            </div>
            <Popover open={positionOpen} onOpenChange={setPositionOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="outline"
                >
                  <div className="w-full overflow-hidden text-left">
                    <p className="truncate">{getPositionLabel()}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="z-[300] p-0"
                style={{ width: "var(--radix-popover-trigger-width)" }}
              >
                <div
                  onClick={() => {
                    handlePresetPosition("up");
                    setPositionOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                >
                  Top
                  {getPositionLabel() === "Top" && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </div>
                <div
                  onClick={() => {
                    handlePresetPosition("middle");
                    setPositionOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                >
                  Middle
                  {getPositionLabel() === "Middle" && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </div>
                <div
                  onClick={() => {
                    handlePresetPosition("down");
                    setPositionOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                >
                  Bottom
                  {getPositionLabel() === "Bottom" && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/*<div className="flex flex-col gap-2 flex-1">*/}
          {/*  <div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
          {/*    Preset*/}
          {/*  </div>*/}
          {/*  {isLargeScreen ? (*/}
          {/*    <Button*/}
          {/*      className="flex w-full items-center justify-between text-sm"*/}
          {/*      variant="outline"*/}
          {/*      onClick={() => setFloatingControl("caption-preset-picker")}*/}
          {/*    >*/}
          {/*      <div className="w-full overflow-hidden text-left">*/}
          {/*        <p className="truncate">None</p>*/}
          {/*      </div>*/}
          {/*      <ChevronDown className="text-muted-foreground" size={14} />*/}
          {/*    </Button>*/}
          {/*  ) : (*/}
          {/*    <PresetPicker*/}
          {/*      captionItemIds={captionItemIds}*/}
          {/*      captionsData={captionsData}*/}
          {/*      onPresetClick={handlePresetClick}*/}
          {/*    />*/}
          {/*  )}*/}
          {/*</div>*/}
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              Object
            </div>
            <Popover open={showObjectOpen} onOpenChange={setShowObjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="outline"
                >
                  <div className="w-full overflow-hidden text-left">
                    <p className="truncate">
                      {isShowObjectMixed
                        ? "Mixed"
                        : OPTIONS_WORDS_IN_LINE.filter(
                          (option) => option.value === data.showObject
                        )[0].label}
                    </p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="z-[300] p-0"
                style={{ width: "var(--radix-popover-trigger-width)" }}
              >
                {OPTIONS_WORDS_IN_LINE.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onChange({ type: "showObject", value: option.value });
                      setShowObjectOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  >
                    {option.label}
                    {!isShowObjectMixed && option.value === data.showObject && (
                      <Check size={14} className="text-muted-foreground" />
                    )}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/*<div className="flex flex-col gap-2 flex-1">*/}
          {/*  <div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
          {/*    Lines per caption*/}
          {/*  </div>*/}
          {/*  <Popover open={linesPerCaptionOpen} onOpenChange={setLinesPerCaptionOpen}>*/}
          {/*    <PopoverTrigger asChild>*/}
          {/*      <Button*/}
          {/*        className="flex w-full items-center justify-between text-sm"*/}
          {/*        variant="outline"*/}
          {/*      >*/}
          {/*        <div className="w-full overflow-hidden text-left">*/}
          {/*          <p className="truncate">*/}
          {/*            {isLinesPerCaptionMixed*/}
          {/*              ? "Mixed"*/}
          {/*              : OPTIONS_LINES_PER_PAGE.filter(*/}
          {/*                (option) => option.value === data.linesPerCaption*/}
          {/*              )[0].label}*/}
          {/*          </p>*/}
          {/*        </div>*/}
          {/*        <ChevronDown className="text-muted-foreground" size={14} />*/}
          {/*      </Button>*/}
          {/*    </PopoverTrigger>*/}

          {/*    <PopoverContent*/}
          {/*      className="z-[300] p-0"*/}
          {/*      style={{ width: "var(--radix-popover-trigger-width)" }}*/}
          {/*    >*/}
          {/*      {OPTIONS_LINES_PER_PAGE.map((option, index) => (*/}
          {/*        <div*/}
          {/*          key={index}*/}
          {/*          onClick={() => {*/}
          {/*            onChange({ type: "linesPerCaption", value: option.value });*/}
          {/*            setLinesPerCaptionOpen(false);*/}
          {/*          }}*/}
          {/*          className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"*/}
          {/*        >*/}
          {/*          {option.label}*/}
          {/*          {!isLinesPerCaptionMixed && option.value === data.linesPerCaption && (*/}
          {/*            <Check size={14} className="text-muted-foreground" />*/}
          {/*          )}*/}
          {/*        </div>*/}
          {/*      ))}*/}
          {/*    </PopoverContent>*/}
          {/*  </Popover>*/}
          {/*</div>*/}

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              Separator
            </div>
            <Popover open={wordsPerLineOpen} onOpenChange={setWordsPerLineOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="flex w-full items-center justify-between text-sm"
                  variant="outline"
                >
                  <div className="w-full overflow-hidden text-left">
                    <p className="truncate">
                      {isWordsPerLineMixed
                        ? "Mixed"
                        : OPTIONS_WORDS_PER_LINE.filter(
                          (option) => option.value === data.wordsPerLine
                        )[0].label}
                    </p>
                  </div>
                  <ChevronDown className="text-muted-foreground" size={14} />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="z-[300] p-0"
                style={{ width: "var(--radix-popover-trigger-width)" }}
              >
                {OPTIONS_WORDS_PER_LINE.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      onChange({ type: "wordsPerLine", value: option.value });
                      setWordsPerLineOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  >
                    {option.label}
                    {!isWordsPerLineMixed && option.value === data.wordsPerLine && (
                      <Check size={14} className="text-muted-foreground" />
                    )}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/*<div className="flex gap-2">*/}
        {/*  <div className="flex flex-col gap-2 flex-1">*/}
        {/*    <div className="flex flex-1 items-center text-xs text-muted-foreground">*/}
        {/*      Transition*/}
        {/*    </div>*/}
        {/*    <Popover>*/}
        {/*      <PopoverTrigger asChild>*/}
        {/*        <Button*/}
        {/*          className="flex w-full items-center justify-between text-sm"*/}
        {/*          variant="outline"*/}
        {/*        >*/}
        {/*          <div className="w-full overflow-hidden text-left">*/}
        {/*            <p className="truncate">*/}
        {/*              {selectedOptions.length === 0*/}
        {/*                ? "None"*/}
        {/*                : animationOptions.find(*/}
        {/*                (opt) => opt.key === selectedOptions[0]*/}
        {/*              )?.label || "None"}*/}
        {/*            </p>*/}
        {/*          </div>*/}
        {/*          <ChevronDown className="text-muted-foreground" size={14} />*/}
        {/*        </Button>*/}
        {/*      </PopoverTrigger>*/}

        {/*      <PopoverContent*/}
        {/*        className="z-[300] p-0"*/}
        {/*        style={{ width: "var(--radix-popover-trigger-width)" }}*/}
        {/*      >*/}
        {/*        {animationOptions.map((opt) => (*/}
        {/*          <div*/}
        {/*            key={opt.key}*/}
        {/*            onClick={() => toggleOption(opt.key)}*/}
        {/*            className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"*/}
        {/*          >*/}
        {/*            {opt.label}*/}
        {/*            {(selectedOptions.includes(opt.key) ||*/}
        {/*              selectedOptions.length === 0 && opt.label === "None") && (*/}
        {/*              <Check size={14} className="text-muted-foreground" />*/}
        {/*            )}*/}
        {/*          </div>*/}
        {/*        ))}*/}
        {/*      </PopoverContent>*/}
        {/*    </Popover>*/}
        {/*  </div>*/}
        {/*</div>*/}
      </div>
    </div>
  );
};

export default CaptionWords;