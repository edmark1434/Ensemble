const MAX_DECODED_ENTRIES = 300;
const PREFETCH_CONCURRENCY = 3;

const decodedUrls = new Set<string>();
const inFlight = new Set<string>();
const queue: string[] = [];
let activePrefetches = 0;

export function isImageDecoded(url?: string | null): boolean {
  return !!url && decodedUrls.has(url);
}

export function markImageDecoded(url?: string | null) {
  if (!url) return;
  if (decodedUrls.has(url)) {
    // Refresh recency order
    decodedUrls.delete(url);
  } else if (decodedUrls.size >= MAX_DECODED_ENTRIES) {
    const oldest = decodedUrls.values().next().value;
    if (oldest) decodedUrls.delete(oldest);
  }
  decodedUrls.add(url);
}

function drainQueue() {
  if (typeof window === "undefined" || typeof Image === "undefined") return;
  while (activePrefetches < PREFETCH_CONCURRENCY && queue.length > 0) {
    const url = queue.shift()!;
    if (decodedUrls.has(url) || inFlight.has(url)) continue;
    inFlight.add(url);
    activePrefetches++;
    const img = new Image();
    img.decoding = "async";
    const done = (decoded: boolean) => {
      inFlight.delete(url);
      activePrefetches--;
      if (decoded) markImageDecoded(url);
      drainQueue();
    };
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(() => done(true)).catch(() => done(true));
      } else {
        done(true);
      }
    };
    img.onerror = () => done(false);
    img.src = url;
  }
}

export function prefetchImages(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || url.startsWith("pending-upload:") || url.startsWith("missing-template-media:")) continue;
    if (decodedUrls.has(url) || inFlight.has(url) || queue.includes(url)) continue;
    queue.push(url);
  }
  drainQueue();
}
