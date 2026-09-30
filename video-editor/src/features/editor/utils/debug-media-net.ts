const MEDIA_RE = /\.(mp4|webm|mov|mkv|m4a|mp3|wav|aac|ogg)(\?|$)/i;

const kindOf = (url: string) => {
  if (url.includes("/uploads/")) return "ORIGINAL";
  if (url.includes("/proxies/")) return "proxy";
  if (url.includes("/filmstrips/")) return "filmstrip";
  if (url.includes("/posters/")) return "poster";
  return "other";
};

let installed = false;

export const installMediaNetDebug = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const stack = new Error().stack; // grab it while the caller is still on the stack
    const response = await originalFetch(input, init);
    if (MEDIA_RE.test(url)) {
      if (kindOf(url) === "ORIGINAL") console.warn("[media-net] ORIGINAL fetched by:", stack);
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      console.log("[media-net] fetch", kindOf(url), {
        url,
        range: headers.get("range"),
        status: response.status,
        contentRange: response.headers.get("content-range"),
        contentLength: response.headers.get("content-length"),
        acceptRanges: response.headers.get("accept-ranges")
      });
    }
    return response;
  };

  const logMediaSrc = (source: string, value: unknown) => {
    const url = String(value);
    if (!MEDIA_RE.test(url)) return;
    console.warn("[media-net] element src via " + source, kindOf(url), url);
    console.trace();
  };

  const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
  if (srcDescriptor?.set) {
    const originalSet = srcDescriptor.set;
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      ...srcDescriptor,
      set: function (this: HTMLMediaElement, value: string) {
        logMediaSrc("property", value);
        originalSet.call(this, value);
      }
    });
  }

  const originalSetAttribute = HTMLMediaElement.prototype.setAttribute;
  HTMLMediaElement.prototype.setAttribute = function (
    this: HTMLMediaElement,
    name: string,
    value: string
  ) {
    if (name === "src") logMediaSrc("attribute", value);
    return originalSetAttribute.call(this, name, value);
  };
};