import { useCallback, useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";
import { useSharePlayhead } from "../collab/position-presence";
import { usePortfolioPicker } from "../portfolio/portfolio-picker";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>\')',
  backgroundSize: "32px",
  backgroundRepeat: "repeat"
};

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size, muted } = useStore();
  const clip = usePortfolioPicker();
  useSharePlayhead(playerRef, fps);

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

  const safeDurationInFrames = (() => {
    const frames = Math.round((duration / 1000) * fps) + 1;
    return Number.isFinite(frames) && frames > 0 ? frames : 1;
  })();

  const lastFrame = safeDurationInFrames - 1;
  const start = clip ? Math.min(lastFrame, Math.round(clip.start * fps / 1000)) : undefined;
  const end = clip && start !== undefined
    ? Math.max(start, Math.min(lastFrame, Math.round(clip.end * fps / 1000) - 1,
        clip.maxSeconds == null ? Infinity : start + Math.floor(clip.maxSeconds * fps) - 1))
    : undefined;

  // Every editor seek (ruler, keyboard, transport and playhead drag) uses this ref.
  const attachPlayer = useCallback((player: PlayerRef | null) => {
    if (!player || start === undefined || end === undefined) {
      playerRef.current = player;
      return;
    }
    const boundedPlayer: PlayerRef = Object.create(player);
    boundedPlayer.seekTo = frame => player.seekTo(Math.max(start, Math.min(end, frame)));
    playerRef.current = boundedPlayer;
  }, [start, end]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || start === undefined || end === undefined) return;
    const beginPlayback = () => {
      const frame = player.getCurrentFrame();
      if (start === end) player.pause();
      if (frame < start || frame >= end) player.seekTo(start);
    };
    player.addEventListener("play", beginPlayback);
    return () => player.removeEventListener("play", beginPlayback);
  }, [start, end]);

  return (
    <div className="h-full w-full" style={CHECKERBOARD_STYLE}>
      <RemotionPlayer
        acknowledgeRemotionLicense
        ref={attachPlayer}
        component={Composition}
        durationInFrames={safeDurationInFrames}
        inFrame={start}
        outFrame={end !== undefined && start !== undefined && end > start ? end : undefined}
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
