import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useEffect } from "react";
import { CaptionWord, getMinCaptionDimensions } from "@/features/editor/utils/captions";
import { getTargetById } from "@/features/editor/utils/target";

interface CaptionDimensionsSyncProps {
  trackItem: ITrackItem & any;
}

export const CaptionDimensionsSync = ({ trackItem }: CaptionDimensionsSyncProps) => {
  useEffect(() => {
    const details = trackItem?.details;
    if (!details) return;

    const currentWidth = Number(details.width) || 0;
    const currentHeight = Number(details.height) || 0;

    const words: CaptionWord[] = Array.isArray(details.words) ? details.words : [];
    const { minWidth, minHeight } = getMinCaptionDimensions(details, words, currentWidth);

    const width = Math.max(currentWidth, minWidth);
    const height = Math.max(currentHeight, minHeight);

    if (width === currentWidth && height === currentHeight) return;

    // onResize in scene-interactions.tsx doesn't just dispatch — during a
    // manual drag it writes target/animationDiv/textDiv styles directly
    // *before* the dispatch lands. This effect only ever did the dispatch
    // half, which is the one concrete difference between "auto-clamp looks
    // wrong" and "resize handle fixes it." Mirroring that write here.
    const target = getTargetById(trackItem.id) as HTMLDivElement | null;
    if (target) {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;

      const animationDiv = target.firstElementChild?.firstElementChild as HTMLDivElement | null;
      if (animationDiv) {
        animationDiv.style.width = `${width}px`;
        animationDiv.style.height = `${height}px`;
      }
    }

    const textDiv = document.querySelector(`#caption-${trackItem.id}`) as HTMLDivElement | null;
    if (textDiv) {
      textDiv.style.width = `${width}px`;
      textDiv.style.height = `${height}px`;
    }

    dispatch(EDIT_OBJECT, {
      payload: { [trackItem.id]: { details: { width, height } } }
    });
  }, [trackItem.details]);

  return null;
};