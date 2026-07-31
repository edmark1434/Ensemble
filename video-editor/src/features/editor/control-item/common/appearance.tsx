import { Label } from "@/components/ui/label";
import Opacity from "./opacity";
import BorderRadius from "./radius";
import Blur from "./blur";
import Brightness from "./brightness";

interface AppearanceProps {
  id: string;
  ids?: string[];
  opacity: number;
  cornerRadius: number;
  blur?: number;
  brightness?: number;
  disabled?: boolean;
}

export const Appearance = ({
  id,
  ids,
  opacity,
  cornerRadius,
  blur,
  brightness,
  disabled = false
}: AppearanceProps) => {
  const showBlurBrightness = blur !== undefined && brightness !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Appearance</Label>
      <div className="flex flex-col gap-2">
        <Opacity id={id} ids={ids} value={opacity} disabled={disabled} />
        <BorderRadius id={id} ids={ids} value={cornerRadius} disabled={disabled} />

        {showBlurBrightness && (
          <>
            <Blur id={id} ids={ids} value={blur ?? 0} disabled={disabled} />
            <Brightness id={id} ids={ids} value={brightness ?? 100} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  );
};