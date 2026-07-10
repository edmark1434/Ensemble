import { useCallback, useRef } from "react";

export function useAudio() {
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements lazily on first interaction to comply with browser autoplay policies
  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/hover.mp3");
      hoverAudioRef.current.volume = 0.25; // Keep hover blips quiet and subtle
    }
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio("/sounds/click.mp3");
      clickAudioRef.current.volume = 0.4;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      // Reset timestamp to allow rapid overlapping blips on moving across adjacent elements
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playClick = useCallback(() => {
    initAudio();
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  }, []);

  return { playHover, playClick };
}