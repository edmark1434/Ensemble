// animation-preview/caption/preview-exclusions

import {
  isCustomTextAnimation
} from "@/features/editor/control-item/floating-controls/animation-preview/text/preview-dispatch";

// Captions animate their box (in/out/loop) exclusively through BoxAnim/ContentAnim —
// see Caption.tsx. There's no TextAnimated-equivalent for captions, so any preset that
// requires TextAnimated can't apply or preview correctly here.
// Shake is excluded too: real shake amplitude comes from item width/height, which the
// caption box doesn't carry the same way a media/text item does.

export const isExcludedForCaptions = (presetKey: string) =>
  isCustomTextAnimation(presetKey) || presetKey.toLowerCase().includes("shake");