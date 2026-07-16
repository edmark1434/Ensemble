import { generateId } from "@designcombo/timeline";
import { ICaption, ICaptionWord } from "@designcombo/types";

interface Word {
  start: number;
  end: number;
  word: string;
}

interface ICaptionLine {
  text: string;
  words: Word[];
  width: number;
  start: number;
  end: number;
}

export const generateCaption = (
  captionLine: ICaptionLine,
  fontInfo: FontInfo,
  options: Options,
  sourceUrl: string
): ICaption => {
  const caption = {
    id: generateId(),
    type: "caption",
    name: "Caption",
    display: {
      from: options.displayFrom + captionLine.start * 1000,
      to: options.displayFrom + captionLine.end * 1000
    },
    metadata: {
      sourceUrl,
      parentId: options.parentId
    },
    details: {
      // top: 100,
      appearedColor: "#FFFFFF",
      activeColor: "#FFFFFF",
      activeFillColor: "#AD3EEC",
      color: "#808084",
      backgroundColor: "transparent",
      borderColor: "#000000",
      borderWidth: 0,
      borderRadius: 30,
      text: captionLine.text,
      fontSize: fontInfo.fontSize,
      width: options.containerWidth,
      fontFamily: fontInfo.fontFamily,
      fontUrl: fontInfo.fontUrl,
      textAlign: "center",
      linesPerCaption: options.linesPerCaption,
      words: captionLine.words.map((w) => ({
        ...w,
        start: w.start * 1000,
        end: w.end * 1000
      }))
    } as unknown
  };
  return caption as ICaption;
};

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface CaptionsInput {
  sourceUrl: string;
  results: {
    main: {
      words: Word[];
    };
  };
}

function createCaptionLines(
  input: CaptionsInput,
  fontInfo: FontInfo,
  options: Options
): ICaptionLine[] {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [];
  context.font = `${fontInfo.fontSize}px ${fontInfo.fontFamily}`;

  const captionLines: ICaptionLine[] = [];
  const words: Word[] = input.results.main.words;

  let currentLine: ICaptionLine = {
    text: "",
    words: [],
    width: 0,
    start: words.length > 0 ? words[0].start : 0,
    end: 0
  };
  let linesCount = 0;

  words.forEach((wordObj, index) => {
    const wordWidth = context.measureText(wordObj.word).width;

    if (
      currentLine.width + wordWidth > options.containerWidth - 100 ||
      currentLine.text.endsWith(".")
    ) {
      const advance = currentLine.text.endsWith(".");
      // Check if it's time to start a new caption set
      if (linesCount + 1 === options.linesPerCaption || advance) {
        // Only push when lines count is correct
        captionLines.push(currentLine);
        linesCount = 0;

        // Reset currentLine for the next set of lines
        currentLine = {
          text: "",
          words: [],
          width: 0,
          start: wordObj.start,
          end: wordObj.end
        };
      } else {
        linesCount += 1;

        // Reset currentLine.width but keep other details to continue accumulation
        currentLine.width = 0;
      }
    }

    // Accumulate words and width for the current line
    currentLine.text += (currentLine.text ? " " : "") + wordObj.word;
    currentLine.words.push(wordObj);
    currentLine.width += wordWidth;
    currentLine.end = wordObj.end;

    // Push the final line if it's the last word
    if (index === words.length - 1 && currentLine.text) {
      captionLines.push(currentLine);
    }
  });

  return captionLines;
}
interface FontInfo {
  fontFamily: string;
  fontUrl: string;
  fontSize: number;
}

interface Options {
  containerWidth: number;
  linesPerCaption: number;
  parentId: string;
  displayFrom: number;
}

export function generateCaptions(
  input: CaptionsInput,
  fontInfo: FontInfo,
  options: Options
): ICaption[] {
  const captionLines = createCaptionLines(input, fontInfo, options);

  const captions = captionLines.map((line) =>
    generateCaption(line, fontInfo, options, input.sourceUrl)
  );

  return captions;
}

export type CaptionWord = ICaptionWord;

// ---- shared caption style props ----
// Mirrors TextStyleDetails in utils/text.ts. Captions share the same font
// styling shape as text, so this type is intentionally parallel — the only
// real difference from text.ts is the content itself (words[] vs an HTML
// string), which is why calculateCaptionMinWidth/calculateCaptionTextHeight
// below skip htmlToPlainText / sanitizeHtmlRemoveHeights / toRenderableHtml
// entirely: there's no HTML to unwrap, words are already plain tokens.

export type CaptionStyleDetails = {
  fontFamily: string;
  fontSize: number | string;
  lineHeight: number | string;
  letterSpacing: number | string;
  wordSpacing: number | string;
  textShadow?: string;
  WebkitTextStrokeWidth?: string;
  WebkitTextStrokeColor?: string;
  textTransform?: string;
  wordBreak?: string; // "normal" | "break-all" | "break-word" | "keep-all"
};

type CaptionStyleProps = {
  family: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  wordSpacing: string;
  textShadow: string;
  webkitTextStroke: string;
  textTransform: string;
  wordBreak: string;
  words: CaptionWord[];
};

const toPx = (v: number | string | undefined, fallback = "0px"): string => {
  if (v === undefined || v === null || v === "") return fallback;
  return typeof v === "number" ? `${v}px` : v;
};

const toLineHeight = (v: number | string | undefined, fallback = "normal"): string => {
  if (v === undefined || v === null || v === "") return fallback;
  return `${v}`;
};

const toWebkitStroke = (width?: string, color?: string): string => {
  if (!width || parseFloat(width) === 0) return "0px transparent";
  return `${width} ${color ?? "transparent"}`;
};

export function captionDetailsToStyleProps(
  details: CaptionStyleDetails,
  words: CaptionWord[]
): CaptionStyleProps {
  return {
    family: details.fontFamily,
    fontSize: toPx(details.fontSize),
    lineHeight: toLineHeight(details.lineHeight),
    letterSpacing: toPx(details.letterSpacing),
    wordSpacing: toPx(details.wordSpacing),
    textShadow: details.textShadow || "none",
    webkitTextStroke: toWebkitStroke(
      details.WebkitTextStrokeWidth,
      details.WebkitTextStrokeColor
    ),
    textTransform: details.textTransform || "none",
    wordBreak: details.wordBreak || "normal",
    words
  };
}

// ---- measurement ----

function createMeasureBase(props: Omit<CaptionStyleProps, "words">): HTMLDivElement {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.pointerEvents = "none";

  div.style.fontFamily = props.family;
  div.style.fontSize = props.fontSize;
  div.style.lineHeight = props.lineHeight;
  div.style.letterSpacing = props.letterSpacing;
  div.style.wordSpacing = props.wordSpacing;
  div.style.wordBreak = props.wordBreak;
  div.style.textShadow = props.textShadow;
  div.style.webkitTextStroke = props.webkitTextStroke;
  div.style.textTransform = props.textTransform;

  return div;
}

// ---- debug measurement (toggle from devtools console) ----
// window.__DEBUG_CAPTION_MEASURE__ = true
const isMeasureDebugOn = () =>
  typeof window !== "undefined" && (window as any).__DEBUG_CAPTION_MEASURE__;

let debugHeightDiv: HTMLDivElement | null = null;
// reserved for a min-width debug overlay, same as debugWidthDiv in
// utils/text.ts — that one's unused there too (calculateMinWidth never
// paints anything), kept here only for parity.
let debugWidthDiv: HTMLDivElement | null = null;

export const calculateCaptionTextHeight = (
  props: CaptionStyleProps & { width: string }
): number => {
  const { words, width, ...styleProps } = props;

  const div = createMeasureBase(styleProps);
  // Plain tokens, no HTML to sanitize/convert — unlike text.ts's
  // innerHTML + toRenderableHtml dance, textContent is enough and safer.
  const text = words.map((w) => w.word).join(" ");
  div.textContent = text || "a";

  div.style.whiteSpace = "normal";
  div.style.overflowWrap = "break-word";
  div.style.width = width;
  div.style.minWidth = "1ch";

  document.body.appendChild(div);
  const height = div.clientHeight;

  if (isMeasureDebugOn()) {
    debugHeightDiv?.remove();
    Object.assign(div.style, {
      visibility: "visible",
      position: "fixed",
      top: "8px",
      right: "8px",
      left: "auto",
      background: "rgba(0,153,255,0.08)",
      outline: "2px dashed dodgerblue",
      zIndex: "999999",
      pointerEvents: "none"
    });
    div.title = `height=${height}px width=${width} lineHeight=${styleProps.lineHeight}`;
    debugHeightDiv = div;
    // console.log("[captionMeasure:height]", { height, width, ...styleProps });
  } else {
    document.body.removeChild(div);
  }

  return height;
};

export const calculateCaptionMinWidth = (props: CaptionStyleProps): number => {
  const { words, wordBreak, ...styleProps } = props;
  const isBreakAll = wordBreak === "break-all";

  // words[] is already tokenized — no htmlToPlainText + whitespace-split
  // round trip needed like in text.ts's calculateMinWidth. break-all mode
  // just fans each word out into characters.
  const units = isBreakAll
    ? words.flatMap((w) => Array.from(w.word)).filter((c) => c.trim() !== "")
    : words.map((w) => w.word).filter(Boolean);

  if (units.length === 0) units.push("a");

  const div = createMeasureBase({ ...styleProps, wordBreak });
  div.style.whiteSpace = "pre";
  div.style.width = "max-content";

  document.body.appendChild(div);

  let maxWidth = 0;
  for (const unit of units) {
    div.textContent = unit;
    // getBoundingClientRect for the sub-pixel width — offsetWidth rounds
    // and can round DOWN, which then gets reused as an exact container
    // width elsewhere and causes false wraps.
    maxWidth = Math.max(maxWidth, div.getBoundingClientRect().width);
  }

  document.body.removeChild(div);

  // Round UP with a small safety margin, same reasoning as text.ts.
  return Math.ceil(maxWidth) + 1;
};

/**
 * minWidth: width of the longest word (words can't break, so the box
 * can never be narrower than this).
 * minHeight: wrapped-words height at max(width, minWidth).
 */
export function getMinCaptionDimensions(
  details: CaptionStyleDetails,
  words: CaptionWord[],
  width: number
): { minWidth: number; minHeight: number } {
  const styleProps = captionDetailsToStyleProps(details, words);
  const minWidth = calculateCaptionMinWidth(styleProps);
  const effectiveWidth = Math.max(width, minWidth);
  const minHeight = calculateCaptionTextHeight({
    ...styleProps,
    width: `${effectiveWidth}px`
  });
  return { minWidth, minHeight };
}