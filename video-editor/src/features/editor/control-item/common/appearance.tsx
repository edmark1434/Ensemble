import { Label } from "@/components/ui/label";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import Opacity from "./opacity";
import BorderRadius from "./radius";
import Blur from "./blur";
import Brightness from "./brightness";

interface AppearanceProps {
  id: string;
  opacity: number;
  cornerRadius: number;
  blur?: number;
  brightness?: number;
  disabled?: boolean;
}

export const Appearance = ({
                             id,
                             opacity,
                             cornerRadius,
                             blur,
                             brightness,
                             disabled = false
                           }: AppearanceProps) => {
  const showBlurBrightness = blur !== undefined && brightness !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-medium">Appearance</Label>
      <div className="flex flex-col gap-2">
        <Opacity id={id} value={opacity} disabled={disabled} />
        <BorderRadius id={id} value={cornerRadius} disabled={disabled} />

        {showBlurBrightness && (
          <>
            <Blur id={id} value={blur ?? 0} disabled={disabled} />
            <Brightness id={id} value={brightness ?? 100} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  );
};