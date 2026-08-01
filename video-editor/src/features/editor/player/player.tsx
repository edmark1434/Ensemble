import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
  backgroundSize: "32px",
  backgroundRepeat: "repeat"
};

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size, muted } = useStore();

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

  const safeDurationInFrames = (() => {
    const frames = Math.round((duration / 1000) * fps) + 1;
    return Number.isFinite(frames) && frames > 0 ? frames : 1;
  })();

  return (
    <div className="h-full w-full" style={CHECKERBOARD_STYLE}>
      <RemotionPlayer
        ref={playerRef}
        component={Composition}
        durationInFrames={safeDurationInFrames}
        compositionWidth={size.width}
        compositionHeight={size.height}
        className="h-full w-full"
        fps={fps}
        overflowVisible
        initialVolume={muted ? 0 : 1}
        // controls={true}
      />
    </div>
  );
};
export default Player;