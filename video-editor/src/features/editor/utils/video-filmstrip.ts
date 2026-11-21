// The playhead owns playback decoders. Timeline copies share small stills,
// and at most two temporary videos at a time seek for missing tiles so one
// huge upload never stalls every other clip on the timeline.
const frames = new Map<string, HTMLImageElement>();
const firstFramesBySrc = new Map<string, HTMLImageElement>();
const MAX_CACHED_FRAMES = 512;
const MAX_CONCURRENT_EXTRACTORS = 2;
const INITIAL_LOAD_TIMEOUT_MS = 15_000;
const SEEK_TIMEOUT_MS = 6_000;
const MAX_SEEK_FAILURES = 2;

let activeExtractors = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeExtractors < MAX_CONCURRENT_EXTRACTORS) {
    activeExtractors++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function releaseSlot() {
  const next = waiters.shift();
  if (next) next();
  else activeExtractors = Math.max(0, activeExtractors - 1);
}

export function getCachedVideoFrame(src: string): HTMLImageElement | undefined {
  return firstFramesBySrc.get(src);
}

function waitForVideo(video: HTMLVideoElement, event: string, start: () => void, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("Filmstrip frame unavailable")); };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", fail);
    };
    const timer = window.setTimeout(fail, timeoutMs);
    video.addEventListener(event, done);
    video.addEventListener("error", fail);
    try { start(); } catch { fail(); }
  });
}

async function captureFrame(player: HTMLVideoElement): Promise<HTMLImageElement | null> {
  if (!player.videoWidth || !player.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.height = 42;
  canvas.width = Math.max(1, Math.min(512, Math.round(42 * player.videoWidth / player.videoHeight)));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(player, 0, 0, canvas.width, canvas.height);
  const image = new Image();
  image.src = canvas.toDataURL("image/jpeg", 0.72);
  await image.decode();
  return image;
}

function storeFrame(key: string, src: string, image: HTMLImageElement) {
  frames.delete(key);
  frames.set(key, image);
  if (frames.size > MAX_CACHED_FRAMES) frames.delete(frames.keys().next().value!);
  if (!firstFramesBySrc.has(src)) {
    firstFramesBySrc.set(src, image);
    if (firstFramesBySrc.size > 128) firstFramesBySrc.delete(firstFramesBySrc.keys().next().value!);
  }
}

export async function videoFilmstrip(
  src: string,
  seconds: number[],
  previewLength: number | undefined,
  current: () => boolean,
): Promise<Map<number, HTMLImageElement>> {
  const uniqueSeconds = [...new Set(seconds)];
  const tiles = new Map<number, HTMLImageElement>();
  const missing: number[] = [];

  for (const second of uniqueSeconds) {
    const key = JSON.stringify([src, previewLength, second]);
    const cached = frames.get(key);
    if (cached) {
      frames.delete(key);
      frames.set(key, cached);
      tiles.set(second, cached);
    } else {
      missing.push(second);
    }
  }
  if (!missing.length || !current()) return tiles;

  await acquireSlot();
  let video: HTMLVideoElement | undefined;
  try {
    if (!current()) return tiles;

    let fallbackFrame: HTMLImageElement | null = firstFramesBySrc.get(src) ?? null;
    let seekFailures = 0;

    for (const second of missing) {
      if (!current()) break;
      const key = JSON.stringify([src, previewLength, second]);
      const cached = frames.get(key);
      if (cached) {
        tiles.set(second, cached);
        continue;
      }

      if (seekFailures >= MAX_SEEK_FAILURES) {
        if (fallbackFrame) tiles.set(second, fallbackFrame);
        continue;
      }

      try {
        if (!video) {
          video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.muted = true;
          // Use metadata preload so large videos issue small range requests
          // instead of attempting to buffer hundreds of megabytes up front.
          video.preload = "metadata";
          const player = video;
          await waitForVideo(player, "loadeddata", () => { player.src = src; }, INITIAL_LOAD_TIMEOUT_MS);
          if (!current()) break;
          // Immediately grab the decoded initial frame so even if later seeks
          // time out on a massive video, the clip still renders a clean preview.
          if (!fallbackFrame) {
            try {
              fallbackFrame = await captureFrame(player);
              if (fallbackFrame) {
                storeFrame(JSON.stringify([src, previewLength, 0]), src, fallbackFrame);
              }
            } catch { /* fall through to requested seek */ }
          }
        }
        const player = video;
        if (!Number.isFinite(player.duration) || !player.videoHeight) {
          if (fallbackFrame) tiles.set(second, fallbackFrame);
          break;
        }
        const last = Math.max(0, player.duration - 0.05);
        const time = Math.min(last, previewLength ? (second / previewLength) * last : second);
        if (Math.abs(player.currentTime - time) > 0.05) {
          await waitForVideo(player, "seeked", () => { player.currentTime = time; }, SEEK_TIMEOUT_MS);
        }
        if (!current()) break;
        const image = await captureFrame(player);
        if (image) {
          if (!fallbackFrame) fallbackFrame = image;
          storeFrame(key, src, image);
          tiles.set(second, image);
        } else if (fallbackFrame) {
          tiles.set(second, fallbackFrame);
        }
      } catch {
        seekFailures++;
        if (fallbackFrame) tiles.set(second, fallbackFrame);
      }
    }
  } finally {
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
    releaseSlot();
  }
  return tiles;
}
