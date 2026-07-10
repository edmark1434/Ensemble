import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useEffect, useState } from "react";
import {getMinTextDimensions} from "@/features/editor/utils/text";

interface TextContentProps {
  trackItem: ITrackItem & any;
}

export const TextContent = ({ trackItem }: TextContentProps) => {
  const id = trackItem?.id;
  const details = trackItem?.details ?? {};

  const [localValue, setLocalValue] = useState<string>(details.text ?? "");

  useEffect(() => {
    setLocalValue(details.text ?? "");
  }, [details.text]);

  useEffect(() => {
    const details = trackItem?.details;
    if (!details) return;

    const currentWidth = Number(details.width) || 0;
    const currentHeight = Number(details.height) || 0;

    const { minWidth, minHeight } = getMinTextDimensions(
      details,
      details.text ?? "",
      currentWidth
    );

    const width = Math.max(currentWidth, minWidth);
    const height = Math.max(currentHeight, minHeight);

    // only dispatch if the clamp actually changes something —
    // otherwise this fires again every time this dispatch itself
    // updates trackItem.details, looping forever
    if (width !== currentWidth || height !== currentHeight) {
      dispatch(EDIT_OBJECT, {
        payload: { [trackItem.id]: { details: { width, height } } }
      });
    }
  }, [trackItem.details]);

  const onChange = (v: string) => {
    setLocalValue(v);

    const currentWidth = Number(details.width) || 0;
    const currentHeight = Number(details.height) || 0;

    const { minWidth, minHeight } = getMinTextDimensions(details, v, currentWidth);

    // clamp upward only — matches resize-handle behavior, never shrinks
    // a box the user made bigger on purpose
    const width = Math.max(currentWidth, minWidth);
    const height = Math.max(currentHeight, minHeight);

    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: { text: v, width, height }
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">Content</Label>
      <Textarea
        value={localValue}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] resize-none"
      />
    </div>
  );
};