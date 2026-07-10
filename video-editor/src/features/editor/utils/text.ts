type BaseProps = {
  family: string;
  fontSize: string;
  lineHeight: string;
  text: string;
  fontWeight: string;
  letterSpacing: string;
  textShadow: string;
  webkitTextStroke: string;
  id?: string;
  textTransform: string;
};

type TextHeightProps = BaseProps & {
  width: string;
};

export function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  const lines: string[] = [];

  for (const child of div.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;

      if (el.tagName === "BR") {
        lines.push("");
      } else if (el.tagName === "DIV" || el.tagName === "P") {
        const text = el.textContent?.replace(/\u00A0/g, "");
        lines.push(text || "");
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      lines.push(child.textContent || "");
    }
  }

  return lines.join("\n");
}

export const sanitizeHtmlRemoveHeights = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const removeHeights = (element: HTMLElement) => {
    element.style.removeProperty("height");
    for (const child of Array.from(element.children)) {
      removeHeights(child as HTMLElement);
    }
  };

  for (const el of Array.from(doc.body.children)) {
    removeHeights(el as HTMLElement);
  }

  return doc.body.innerHTML;
};

// ---- shared text style props ----
// fontFamily already encodes weight/style variant — no separate fontWeight/fontStyle.
// wordBreak intentionally omitted — min-width is always driven by the longest word.

export type TextStyleDetails = {
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

type TextStyleProps = {
  family: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  wordSpacing: string;
  textShadow: string;
  webkitTextStroke: string;
  textTransform: string;
  wordBreak: string;
  text: string;
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

export function textDetailsToStyleProps(
  details: TextStyleDetails,
  text: string
): TextStyleProps {
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
    text
  };
}

// ---- measurement ----

function createMeasureBase(props: Omit<TextStyleProps, "text">): HTMLDivElement {
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
// window.__DEBUG_TEXT_MEASURE__ = true
const isMeasureDebugOn = () =>
  typeof window !== "undefined" && (window as any).__DEBUG_TEXT_MEASURE__;

let debugHeightDiv: HTMLDivElement | null = null;
let debugWidthDiv: HTMLDivElement | null = null;

// textarea-sourced text uses literal "\n" for line breaks; HTML-sourced
// text (rich/contentEditable) already encodes breaks as <div>/<br> and
// won't contain literal "\n". Converting is a no-op when none are present,
// and necessary when they are — HTML collapses a raw "\n" into a single
// rendered space under white-space: normal, which is the actual bug.
const toRenderableHtml = (html: string): string => html.replace(/\n/g, "<br>");

export const calculateTextHeight = (
  props: TextStyleProps & { width: string }
): number => {
  const { text, width, ...styleProps } = props;

  const div = createMeasureBase(styleProps);
  const cleanText = sanitizeHtmlRemoveHeights(text);
  div.innerHTML = toRenderableHtml(cleanText) || "a";

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
      background: "rgba(255,0,128,0.08)",
      outline: "2px dashed magenta",
      zIndex: "999999",
      pointerEvents: "none"
    });
    div.title = `height=${height}px width=${width} lineHeight=${styleProps.lineHeight}`;
    debugHeightDiv = div;
    // console.log("[textMeasure:height]", { height, width, ...styleProps });
  } else {
    document.body.removeChild(div);
  }

  return height;
};

export const calculateMinWidth = (props: TextStyleProps): number => {
  const { text, wordBreak, ...styleProps } = props;

  const plainText = htmlToPlainText(text);
  const isBreakAll = wordBreak === "break-all";

  const units = isBreakAll
    ? Array.from(plainText.replace(/\n/g, "")).filter((c) => c.trim() !== "")
    : plainText
      .split("\n")
      .flatMap((line) => line.split(/\s+/))
      .filter(Boolean);

  if (units.length === 0) units.push("a");

  const div = createMeasureBase({ ...styleProps, wordBreak, text: "" } as any);
  div.style.whiteSpace = "pre";
  div.style.width = "max-content";

  document.body.appendChild(div);

  let maxWidth = 0;
  for (const unit of units) {
    div.textContent = unit;
    // getBoundingClientRect gives the real sub-pixel width;
    // offsetWidth rounds and can round DOWN, which then gets reused
    // as an exact container width elsewhere and causes false wraps.
    maxWidth = Math.max(maxWidth, div.getBoundingClientRect().width);
  }

  document.body.removeChild(div);

  // Round UP with a small safety margin. Rounding down here is what
  // caused the word to wrap against its own measured width.
  return Math.ceil(maxWidth) + 1;
};
export const calculateCaptionHeight = calculateTextHeight;

/**
 * minWidth: width of the longest word (words can't break, so the box
 * can never be narrower than this).
 * minHeight: wrapped-text height at max(width, minWidth).
 */
export function getMinTextDimensions(
  details: TextStyleDetails,
  text: string,
  width: number
): { minWidth: number; minHeight: number } {
  const styleProps = textDetailsToStyleProps(details, text);
  const minWidth = calculateMinWidth(styleProps);
  const effectiveWidth = Math.max(width, minWidth);
  const minHeight = calculateTextHeight({
    ...styleProps,
    width: `${effectiveWidth}px`
  });
  return { minWidth, minHeight };
}
