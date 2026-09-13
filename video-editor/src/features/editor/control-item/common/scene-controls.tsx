import { Label } from "@/components/ui/label";
import { NameField, SizeFields, BackgroundField } from "./composition-controls";

export interface SceneControlsProps {
  name: string;
  onNameCommit: (name: string) => void;
  size?: { width: number; height: number };
  onSizeCommit?: (width: number, height: number) => void;
  background?: string;
  onBackgroundChange?: (value: string) => void;
}

export const SceneControls = ({
                                name,
                                onNameCommit,
                                size,
                                onSizeCommit,
                                background,
                                onBackgroundChange,
                              }: SceneControlsProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-semibold">Scene</Label>
        <div className="flex flex-col gap-3">
          <NameField value={name} onCommit={onNameCommit} />
          {size && onSizeCommit && (
            <SizeFields width={size.width} height={size.height} onCommit={onSizeCommit} />
          )}
          {background !== undefined && onBackgroundChange && (
            <BackgroundField value={background} onChange={onBackgroundChange} />
          )}
        </div>
      </div>
    </div>
  );
};