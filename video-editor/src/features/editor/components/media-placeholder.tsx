import { Loader2 } from "lucide-react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { useCurrentScale } from "remotion";

export const CanvasPreviewZoomContext = createContext(1);

const SCENE_PATTERN = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><path d="M-3 15L15 -3" stroke="white" stroke-opacity=".08" stroke-width="2"/></svg>')}")`;
export function MediaPlaceholder({
  missing = false,
  failed = false,
}: { missing?: boolean; failed?: boolean }) {
  const ref = useRef<HTMLOutputElement>(null);
  const [scale, setScale] = useState(1);
  const previewZoom = useContext(CanvasPreviewZoomContext);
  const playerScale = useCurrentScale({ dontThrowIfOutsideOfRemotion: true });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      if (element.clientWidth > 0) setScale(Math.max(0.05, element.getBoundingClientRect().width / element.clientWidth));
    };
    // CSS transforms do not trigger ResizeObserver on the media element.
    // Watch its ancestors too, including nested scenes and the preview wrapper.
    const observer = new ResizeObserver(update);
    const transforms = new MutationObserver(update);
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor);
      transforms.observe(ancestor, { attributes: true, attributeFilter: ["style", "class"] });
    }
    window.addEventListener("resize", update);
    document.addEventListener("fullscreenchange", update);
    update();
    return () => {
      observer.disconnect();
      transforms.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, [previewZoom, playerScale]);
  return (
    <output
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8 / scale,
        backgroundColor: "#27272a",
        backgroundImage: SCENE_PATTERN,
        backgroundSize: `${12 / scale}px ${12 / scale}px`,
        boxShadow: "inset 0 0 0 99999px rgba(0,0,0,0.25)",
        color: "#d4d4d8",
        fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
        fontSize: 14 / scale,
        fontWeight: 500,
        pointerEvents: "none",
      }}
    >
      {!missing && !failed && <Loader2 className="animate-spin" size={16 / scale} style={{ flexShrink: 0 }} />}
      {missing ? "Missing media" : failed ? "Unable to load media" : "Loading media…"}
    </output>
  );
}
