// The playhead owns playback decoders. Timeline copies share small stills,
// and only one temporary video at a time is allowed to seek for missing tiles.
const frames = new Map<string, HTMLImageElement>();
let queue: Promise<void> = Promise.resolve();

function waitForVideo(video: HTMLVideoElement, event: string, start: () => void) {
  return new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("Filmstrip frame unavailable")); };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", fail);
    };
    const timer = window.setTimeout(fail, 8000);
    video.addEventListener(event, done);
    video.addEventListener("error", fail);
    try { start(); } catch { fail(); }
  });
}

export function videoFilmstrip(src: string, seconds: number[], previewLength: number | undefined, current: () => boolean) {
  const work = queue.then(async () => {
    const tiles = new Map<number, HTMLImageElement>();
    let video: HTMLVideoElement | undefined;
    try {
      for (const second of new Set(seconds)) {
        if (!current()) break;
        const key = JSON.stringify([src, previewLength, second]);
        let image = frames.get(key);
        if (!image) {
          if (!video) {
            video = document.createElement("video");
            video.crossOrigin = "anonymous";
            video.muted = true;
            video.preload = "auto";
            const player = video;
            await waitForVideo(player, "loadeddata", () => { player.src = src; });
          }
          const player = video;
          if (!Number.isFinite(player.duration) || !player.videoHeight) break;
          const last = Math.max(0, player.duration - 0.05);
          const time = Math.min(last, previewLength ? second / previewLength * last : second);
          if (Math.abs(player.currentTime - time) > 0.001) {
            await waitForVideo(player, "seeked", () => { player.currentTime = time; });
          }
          const canvas = document.createElement("canvas");
          canvas.height = 42;
          canvas.width = Math.max(1, Math.min(512, Math.round(42 * player.videoWidth / player.videoHeight)));
          const context = canvas.getContext("2d");
          if (!context) break;
          context.drawImage(player, 0, 0, canvas.width, canvas.height);
          image = new Image();
          image.src = canvas.toDataURL("image/jpeg");
          await image.decode();
        }
        frames.delete(key);
        frames.set(key, image);
        if (frames.size > 512) frames.delete(frames.keys().next().value!);
        tiles.set(second, image);
      }
    } finally {
      if (video) { video.removeAttribute("src"); video.load(); }
    }
    return tiles;
  });
  queue = work.then(() => {}, () => {});
  return work;
}
