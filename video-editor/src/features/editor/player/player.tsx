import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";
import {installMediaNetDebug} from "@/features/editor/utils/debug-media-net";

if (process.env.NODE_ENV !== "production") installMediaNetDebug();

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

  useEffect(() => {
    const p = playerRef.current as any;
    if (!p || p.__seekGuarded) return;
    const original = p.seekTo.bind(p);
    p.seekTo = (frame: number) => {
      if (!Number.isFinite(frame)) {
        console.error("[player] dropped seekTo(non-finite):", frame, new Error().stack);
        return; // don't forward NaN
      }
      return original(frame);
    };
    p.__seekGuarded = true;
  }); // no dep array on purpose: re-applies if the ref object is replaced

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      if (!Number.isFinite(e.detail.frame)) console.error("[player] non-finite frame", e.detail.frame);
    };
    p.addEventListener("frameupdate", onFrame);
    return () => p.removeEventListener("frameupdate", onFrame);
  }, []);

  const safeDurationInFrames = (() => {
    const frames = Math.round((duration / 1000) * fps) + 1;
    return Number.isFinite(frames) && frames > 0 ? frames : 1;
  })();

  return (
    <div className="h-full w-full" style={CHECKERBOARD_STYLE}>
      <RemotionPlayer
        // browserMediaControlsBehavior={{ mode: "do-nothing" }}
        acknowledgeRemotionLicense
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