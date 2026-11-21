import { useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import useLayoutStore from "../store/use-layout-store";
import useStore from "../store/use-store";
import { Transitions } from "./transitions";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import { Images } from "./images";
import { Videos } from "./videos";
import { Captions } from "./captions";
import { VoiceOver } from "./voice-over";
import { Uploads } from "./uploads";
import { AiVoice } from "./ai-voice";
import { SFX } from "./sfx";
import { Templates } from "./templates";

const ActiveMenuItem = () => {
  const { activeMenuItem, replaceTargetId } = useLayoutStore();

  if (replaceTargetId) {
    if (activeMenuItem === "videos") return <Videos />;
    if (activeMenuItem === "uploads") return <Uploads />;
    return <Images />;
  }

  if (activeMenuItem === "templates") return <Templates />;

  if (activeMenuItem === "transitions") {
    return <Transitions />;
  }
  if (activeMenuItem === "texts") {
    return <Texts />;
  }
  if (activeMenuItem === "shapes") {
    return <Elements />;
  }
  if (activeMenuItem === "videos") {
    return <Videos />;
  }
  if (activeMenuItem === "captions") {
    return <Captions />;
  }

  if (activeMenuItem === "audios") {
    return <Audios />;
  }

  if (activeMenuItem === "images") {
    return <Images />;
  }

  if (activeMenuItem === "voiceOver") {
    return <VoiceOver />;
  }
  if (activeMenuItem === "elements") {
    return <Elements />;
  }
  if (activeMenuItem === "uploads") {
    return <Uploads />;
  }

  if (activeMenuItem === "ai-voice") {
    return <AiVoice />;
  }

  if (activeMenuItem === "sfx") {
    return <SFX />;
  }

  return null;
};

export const MenuItem = () => {
  const replaceTargetId = useLayoutStore((state) => state.replaceTargetId);
  const exitReplace = useLayoutStore((state) => state.exitReplace);
  const activeIds = useStore((state) => state.activeIds);
  const trackItemsMap = useStore((state) => state.trackItemsMap);

  useEffect(() => {
    if (!replaceTargetId) return;
    const target = trackItemsMap[replaceTargetId];
    if (!target || (target.type !== "image" && target.type !== "video") || activeIds.length !== 1 || activeIds[0] !== replaceTargetId) {
      exitReplace();
    }
  }, [replaceTargetId, activeIds, trackItemsMap, exitReplace]);

  return (
    <div data-editor-tour="menu-panel" className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-card">
      {replaceTargetId && (
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <RefreshCw className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold">Replace</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Close replace mode"
            onClick={exitReplace}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <ActiveMenuItem />
      </div>
    </div>
  );
};
