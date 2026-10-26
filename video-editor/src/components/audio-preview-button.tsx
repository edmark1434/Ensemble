import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "./ui/button";

export function AudioPreviewButton({ src, name, isPlaying, onToggle, onStop, onDuration }: {
  src?: string;
  name: string;
  isPlaying: boolean;
  onToggle: () => void;
  onStop: () => void;
  onDuration?: (seconds: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(onStop);
  useEffect(() => { stopRef.current = onStop; }, [onStop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    let active = true;
    let frame = 0;
    const updateProgress = () => {
      setProgress(Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(1, audio.currentTime / audio.duration) : 0);
      frame = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      void audio.play().catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) stopRef.current();
      });
      frame = requestAnimationFrame(updateProgress);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      audio.pause();
    };
  }, [isPlaying, src]);

  return <>
    <audio ref={audioRef} src={src} preload="none" className="hidden"
      onEnded={onStop} onError={() => { if (isPlaying) onStop(); }}
      onLoadedMetadata={(event) => onDuration?.(event.currentTarget.duration)} />
    <Button type="button" size="icon" variant="ghost" disabled={!src} onClick={onToggle}
      aria-label={`${isPlaying ? "Pause" : "Play"} ${name}`}
      className="relative size-8 shrink-0 rounded-full bg-black/10 text-zinc-700 hover:bg-black/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10">
      {isPlaying && <svg viewBox="0 0 32 32" aria-hidden="true"
        className="pointer-events-none absolute inset-0 !size-8 -rotate-90 text-primary">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2"
          pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} strokeLinecap="round" />
      </svg>}
      {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
    </Button>
  </>;
}
