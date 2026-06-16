import { PREVIEW_FRAME_WIDTH } from "../constants/constants";

/**
 * Converts raw timeline units to the readable format.
 * @param units Target unit value.
 * @returns Time in format HH:MM:SS.FPS
 */
export function formatTimelineUnit(units?: number): string {
  if (!units) return "00:00";
  const time = units / PREVIEW_FRAME_WIDTH;

  const frames = Math.trunc(time) % 60;
  const seconds = Math.trunc(time / 60) % 60;
  const minutes = Math.trunc(time / 3600) % 60;
  const hours = Math.trunc(time / 216000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  if (minutes > 0 || seconds > 0) {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  if (frames > 0) {
    return `${frames}f`;
  }
  return "00:00";
}

export function formatTimeToHumanReadable(
  ms: number,
  includeFrames = false
): string {
  if (!ms) return "00:00";

  const fps = 60;
  const msPerFrame = 1000 / fps;

  if (ms < 1000) {
    if (includeFrames) {
      const frames = Math.floor(ms / msPerFrame);
      return `${frames}f`;
    } else {
      // Convert milliseconds to seconds (with one decimal place)
      const seconds = (ms / 1000).toFixed(1);
      return `${seconds}s`;
    }
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function millisecondsToHHMMSS(ms: number): string {
  if (ms < 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0) {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
