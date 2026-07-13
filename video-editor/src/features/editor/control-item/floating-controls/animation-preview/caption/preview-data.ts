// animation-preview/caption/preview-data

import { ICaption } from "@designcombo/types";

export interface PreviewCaptionWord {
  word: string;
  start: number; // ms
  end: number;   // ms
}

export const PREVIEW_CAPTION_WORDS: PreviewCaptionWord[] = [
  { word: "This", start: 0, end: 380 },
  { word: "is", start: 420, end: 620 },
  { word: "a", start: 660, end: 800 },
  { word: "caption", start: 840, end: 1600 }
];

export const createCaptionPreviewDetails = (width: number, height: number) =>
  ({
    words: PREVIEW_CAPTION_WORDS,
    width,
    height,
    left: 0,
    top: 0,
    // getSlideAnimation (utils/get-animations.ts) parses this string via regex
    // to extract scale, regardless of item type — same assumption text's own
    // preview-data.ts makes for the same reason.
    transform: "scale(1, 1)",
    fontSize: 20,
    color: "var(--muted-foreground)",
    appearedColor: "#ffffff",
    activeColor: "#ffffff",
    // activeFillColor: "var(--primary)",
    isKeywordColor: "transparent",
    preservedColorKeyWord: false,
    showObject: "page",
    animation: "" // word-level animation is a separate picker — not in scope here, see note below
  }) as unknown as ICaption["details"];

export const createCaptionPreviewItem = (width: number, height: number): ICaption =>
  ({
    id: "caption-preview-item",
    type: "caption",
    display: { from: 0, to: PREVIEW_CAPTION_WORDS.at(-1)!.end },
    details: createCaptionPreviewDetails(width, height)
  }) as unknown as ICaption;