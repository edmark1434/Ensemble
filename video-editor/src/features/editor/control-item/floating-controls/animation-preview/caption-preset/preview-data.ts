// animation-preview/caption-preset/preview-data
//
// Preview item builder for STYLE_CAPTION_PRESETS (colors/font/border/shadow),
// as opposed to caption/preview-data.ts which is for the *animation* presets.

import { ICaption } from "@designcombo/types";
import {
  ICaptionsControlProps,
  getSanitizedPreset
} from "../../caption-preset-picker";
import { PREVIEW_CAPTION_WORDS } from "../caption/preview-data";

export { PREVIEW_CAPTION_WORDS };
export const PREVIEW_KEYWORD_INDEX = PREVIEW_CAPTION_WORDS.length - 1; // "caption"

export const createCaptionStylePreviewDetails = (
  preset: ICaptionsControlProps,
  width: number,
  height: number
) => {
  const sanitized = getSanitizedPreset(preset);
  return {
    words: PREVIEW_CAPTION_WORDS,
    width,
    height,
    left: 0,
    top: 0,
    transform: "scale(1, 1)",
    fontSize: 20,
    fontWeight: "normal",
    showObject: "page",
    ...sanitized
  } as unknown as ICaption["details"];
};

export const createCaptionStylePreviewItem = (
  preset: ICaptionsControlProps,
  width: number,
  height: number
): ICaption =>
  ({
    id: "caption-style-preview-item",
    type: "caption",
    display: { from: 0, to: PREVIEW_CAPTION_WORDS.at(-1)!.end },
    details: createCaptionStylePreviewDetails(preset, width, height)
  }) as unknown as ICaption;