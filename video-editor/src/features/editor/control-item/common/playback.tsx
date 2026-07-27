import { Label } from "@/components/ui/label";
import Volume from "./volume";
import Speed from "./speed";

interface PlaybackControlsProps {
  volume: number;
  speed: number;
  onChangeVolume: (v: number) => void;
  onChangeSpeed: (v: number) => void;
  disabled?: boolean;
}

export const PlaybackControls = ({
  volume,
  speed,
  onChangeVolume,
  onChangeSpeed,
  disabled = false
}: PlaybackControlsProps) => {
  return (
    <div className="flex flex-col gap-3">
      <Label className="font-sans text-sm font-semibold">Playback</Label>
      <div className="flex flex-col gap-2">
        <Volume value={volume} onChange={onChangeVolume} disabled={disabled} />
        {/*<Speed value={speed} onChange={onChangeSpeed} disabled={disabled} />*/}
      </div>
    </div>
  );
};

export default PlaybackControls;