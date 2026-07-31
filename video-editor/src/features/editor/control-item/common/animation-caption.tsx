import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";
import useLayoutStore from "../../store/use-layout-store";
import useStore from "../../store/use-store";
import { Label } from "@/components/ui/label";
import { presets } from "../../player/animated";
import { groupCaptionItems } from "@/features/editor/control-item/floating-controls/caption-preset-picker";
import { useMixedValue } from "@/features/editor/hooks/use-mixed-value";

export function useCaptionGroupIds(ids: string[]) {
  const { trackItemsMap } = useStore();
  const [captionItemIds, setCaptionItemIds] = useState<string[]>([]);
  const [representativeIds, setRepresentativeIds] = useState<string[]>([]);

  useEffect(() => {
    const groupedCaptions = groupCaptionItems(trackItemsMap);
    const sourceUrls = Array.from(
      new Set(ids.map((id) => trackItemsMap[id]?.metadata?.sourceUrl).filter(Boolean))
    );
    const groups = sourceUrls.map((sourceUrl) => groupedCaptions[sourceUrl] || []);
    setCaptionItemIds(groups.flat().map((item) => item.id));
    setRepresentativeIds(groups.map((group) => group[0]?.id).filter(Boolean) as string[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackItemsMap, JSON.stringify(ids)]);

  return { captionItemIds, representativeIds };
}

export function useCaptionAnimationSummary(ids: string[]) {
  const { trackItemsMap } = useStore();
  const { captionItemIds, representativeIds } = useCaptionGroupIds(ids);

  const { value: animationName, isMixed } = useMixedValue<string>(
    representativeIds,
    (item) => item?.animations?.in?.name ?? "none"
  );

  const label = isMixed
    ? "Mixed"
    : animationName && animationName !== "none"
      ? (presets[animationName as keyof typeof presets]?.name ?? animationName)
      : "None";

  return { label, captionItemIds };
}

const AnimationCaption = ({ ids }: { ids?: string[] }) => {
  const { setFloatingControl, setFloatingControlIds, trackItem } = useLayoutStore();
  const targetIds = ids && ids.length > 0 ? ids : trackItem?.id ? [trackItem.id] : [];
  const { label } = useCaptionAnimationSummary(targetIds);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Animation</Label>

      <div className="flex flex-col gap-2 flex-1">
        <Button
          className="flex w-full items-center justify-between text-sm font-normal"
          variant="outline"
          onClick={() => {
            setFloatingControlIds(targetIds);
            setFloatingControl("animation-caption");
          }}
        >
          <div className="w-full overflow-hidden text-left">
            <p className="truncate">{label}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
};

export default AnimationCaption;