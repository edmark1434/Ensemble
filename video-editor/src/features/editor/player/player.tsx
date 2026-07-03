import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size, background } = useStore();

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

  const safeDurationInFrames = (() => {
    const frames = Math.round((duration / 1000) * fps) + 1;
    return Number.isFinite(frames) && frames > 0 ? frames : 1;
  })();

  return (
    <RemotionPlayer
      ref={playerRef}
      component={Composition}
      durationInFrames={safeDurationInFrames}
      compositionWidth={size.width}
      compositionHeight={size.height}
      className={`h-full w-full bg-[${background.value}]`}
      fps={30}
      overflowVisible
      // controls={true}
    />
  );
};
export default Player;
