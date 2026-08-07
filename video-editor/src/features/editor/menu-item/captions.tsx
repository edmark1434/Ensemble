import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { generateCaptions } from "../utils/captions";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_CAPTIONS, ADD_ITEMS } from "@designcombo/state";
import { ITrackItem, ITrackItemsMap } from "@designcombo/types";
import {formatTimeToHumanReadable, millisecondsToHHMMSS} from "../utils/format";
import useStore from "../store/use-store";
import {groupBy, uniqBy} from "lodash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PLAYER_SEEK } from "../constants/events";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { generateId } from "@designcombo/timeline";
import { Loader2 } from "lucide-react";
import {seedDefaultFont} from "@/features/editor/utils/seed-default-font";

export const Captions = () => {
  const { trackItemsMap, size } = useStore();
  const [selectMediaItems, setSelectMediaItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedMedia, setSelectedMedia] = useState<string | undefined>();
  const [captionTrackItemsMap, setCaptionTrackItemsMap] = useState<
    Record<string, ITrackItem[]>
  >({});
  const [mediaTrackItems, setMediaTrackItems] = useState<ITrackItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const mediaTrackItems = fetchMediaTrackItems(trackItemsMap);
    setMediaTrackItems(mediaTrackItems);

    const selectMediaOptions = createSelectMediaOptions(mediaTrackItems);
    setSelectMediaItems(selectMediaOptions);

    const groupedCaptions = groupCaptionItems(trackItemsMap);

    for (const key of Object.keys(groupedCaptions)) {
      const captions = groupedCaptions[key];
      const orderedCaptionByDisplayFrom = captions.sort(
        (a, b) => a.display.from - b.display.from
      );
      console.log({ orderedCaptionByDisplayFrom });
      groupedCaptions[key] = orderedCaptionByDisplayFrom as ITrackItem[];
    }
    setCaptionTrackItemsMap(groupedCaptions);
  }, [trackItemsMap]);

  const handleSelectChange = (value: string) => {
    setSelectedMedia(value);
  };

  const createCaptions = async (selectedMedia: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const trackItem = mediaTrackItems.find(
        (m) => m.details.src === selectedMedia
      );

      if (!trackItem) {
        throw new Error("Track item not found");
      }

      const transcribeData = await transcribeMedia(selectedMedia, "ES");
      if (!transcribeData) {
        setErrorMessage("No speech was detected in this media.");
        return;
      }

      const jsonData = transcribeData; // already shaped, no fetch needed

      const defaultFont = await seedDefaultFont();
      if (!defaultFont?.url) {
        throw new Error("Failed to load default font.");
      }
      const fontInfo = {
        fontFamily: defaultFont.postScriptName,
        fontUrl: defaultFont.url,
        fontSize: 64
      };

      const options = {
        containerWidth: size.width,
        linesPerCaption: 1,
        parentId: trackItem.id,
        displayFrom: trackItem.display.from,
        containerHeight: size.height
      };

      await loadFonts([{ name: fontInfo.fontFamily, url: fontInfo.fontUrl }]);
      const captions = generateCaptions(
        { ...jsonData, sourceUrl: selectedMedia },
        fontInfo,
        options
      );

      console.log({ captions });

      dispatch(ADD_ITEMS, {
        payload: {
          trackItems: captions,
          tracks: [
            {
              id: generateId(),
              items: captions.map((item) => item.id),
              type: "caption",
              name: "Captions"
            }
          ]
        }
      });
    } catch (error: any) {
      console.error("Error generating captions:", error);
      setErrorMessage(error.message || "Failed to generate captions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const [elapsedMs, setElapsedMs] = useState(0);
  const CAPTIONS_GENERATE_GRACE_PERIOD = 5000;

  useEffect(() => {
    if (!isGenerating) {
      setElapsedMs(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const selectedTrackItem = mediaTrackItems.find(
    (m) => m.details.src === selectedMedia
  );
  const durationMs = selectedTrackItem
    ? selectedTrackItem.display.to - selectedTrackItem.display.from
    : 0;
  const estimatedMs = Math.ceil(durationMs / 3 + CAPTIONS_GENERATE_GRACE_PERIOD);

  return (
    <div className="h-full w-full flex items-center justify-center flex-1 flex-col gap-4">
      {mediaTrackItems.length === 0 ? (
        <EmptyMediaTrackItems />
      ) : (
        <MediaSection
          selectMediaItems={selectMediaItems}
          selectedMedia={selectedMedia}
          onSelectChange={handleSelectChange}
          captionTrackItemsMap={captionTrackItemsMap}
          createCaptions={createCaptions}
          isGenerating={isGenerating}
          errorMessage={errorMessage}
          estimatedMs={estimatedMs}
          elapsedMs={elapsedMs}
        />
      )}
    </div>
  );
};

const MediaSection = ({
  selectMediaItems,
  selectedMedia,
  onSelectChange,
  captionTrackItemsMap,
  createCaptions,
  isGenerating,
  errorMessage,
  estimatedMs,
  elapsedMs,
}: {
  selectMediaItems: { label: string; value: string }[];
  selectedMedia: string | undefined;
  onSelectChange: (value: string) => void;
  captionTrackItemsMap: Record<string, ITrackItem[]>;
  createCaptions: (selectedMedia: string) => void;
  isGenerating: boolean;
  errorMessage: string | null;
  estimatedMs: number;
  elapsedMs: number;
}) => (
  <div className="flex h-full w-full flex-col">
    <div className="w-full p-4">
      <Select value={selectedMedia} onValueChange={onSelectChange}>
        <SelectTrigger className="w-full truncate overflow-hidden">
          <SelectValue placeholder="Select media" />
        </SelectTrigger>
        <SelectContent className="z-[200]">
          {selectMediaItems.map((item) => (
            <SelectItem value={item.value} key={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>


    {selectedMedia ? (
      captionTrackItemsMap[selectedMedia] ? (
        <ScrollArea className="w-full px-4 pb-4">
          <MediaWithCaptions
            captionTrackItems={captionTrackItemsMap[selectedMedia]}
          />
        </ScrollArea>
      ) : (
        <div className="w-full h-full px-4 pb-4 flex flex-col items-center justify-center">
          <MediaWithNoCaptions
            createCaptions={() => createCaptions(selectedMedia)}
            isGenerating={isGenerating}
            estimatedMs={estimatedMs}
            elapsedMs={elapsedMs}
          />

          {errorMessage && (
            <div className="text-sm text-red-500 text-center my-4">{errorMessage}</div>
          )}
        </div>
      )
    ) : (
      <div className="w-full h-full px-4 pb-4 flex flex-col items-center justify-center">
        <MediaNoSelected />
      </div>
    )}
  </div>
);

const MediaNoSelected = () => (
  <div className="text-center text-sm text-muted-foreground text-pretty pb-4">
    Select video or audio and generate captions automatically.
  </div>
);

const EmptyMediaTrackItems = () => (
  <div className="text-center text-sm text-muted-foreground text-pretty">
    Add video or audio and generate captions automatically.
  </div>
);

const MediaWithNoCaptions = ({
  createCaptions,
  isGenerating,
  estimatedMs,
  elapsedMs
}: {
  createCaptions: () => void;
  isGenerating: boolean;
  estimatedMs: number;
  elapsedMs: number;
}) => (
  <div className="flex flex-col gap-4 items-center pb-4">
    <div className="text-center text-sm text-muted-foreground text-pretty">
      Recognize speech in the selected video/audio and generate captions
      automatically.
    </div>
    <Button
      onClick={createCaptions}
      variant="default"
      className="w-fit"
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {millisecondsToHHMMSS(elapsedMs)}
        </>
      ) : (
        "Generate"
      )}
    </Button>
    <div className="text-center text-xs text-muted-foreground">
      {`Estimated time: ${millisecondsToHHMMSS(estimatedMs)}`}
    </div>
  </div>
);

const MediaWithCaptions = ({
  captionTrackItems
}: {
  captionTrackItems: ITrackItem[];
}) => {
  const { playerRef } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef || null);

  return (
    <div className="flex flex-col gap-2">
      {captionTrackItems.map((item) => (
        <CaptionItem
          isActive={
            currentFrame * (1000 / 30) >= item.display.from &&
            currentFrame * (1000 / 30) <= item.display.to
          }
          key={item.id}
          item={item}
        />
      ))}
    </div>
  );
};
const CaptionItem = ({
  item,
  isActive
}: {
  item: ITrackItem;
  isActive?: boolean;
}) => {
  const { display, details } = item;
  // const [timeline, setTimeline] = useState(0);
  // const { fps, playerRef } = useStore();
  // const currentFrame = useCurrentPlayerFrame(playerRef!);
  // const [inRange, setInRange] = useState(false);
  // useEffect(() => {
  //   setTimeline(currentFrame / fps);
  // }, [currentFrame, fps]);

  // const isInRange = useCallback(() => {
  //   return timeline >= display.from / 1000 && timeline <= display.to / 1000;
  // }, [timeline, display.from, display.to]);

  // useEffect(() => {
  //   setInRange(isInRange());
  // }, [timeline, isInRange]);

  const handleSeek = (time: number) => {
    dispatch(PLAYER_SEEK, { payload: { time: time } });
  };
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg px-1.5 py-2 hover:cursor-pointer hover:bg-accent/30 ${
        isActive
          ? "bg-captions-background text-captions-text font-semibold"
          : "text-muted-foreground"
      }`}
      onClick={() => handleSeek(display.from)}
    >
      <div className="flex items-start gap-2">
        <div className="w-16 flex items-center justify-center">
          <div
            className={`shrink-0 rounded-md px-2 py-0.5 w-fit text-xs ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground/15 text-muted-foreground"
            }`}
          >
            {millisecondsToHHMMSS(display.from)}
          </div>
        </div>
        <div className="flex-1 text-sm">{details.text}</div>
      </div>
    </div>
  );
};

// Helper functions
const fetchMediaTrackItems = (trackItemsMap: ITrackItemsMap) => {
  const items = Object.values(trackItemsMap).filter(
    ({ type }: ITrackItem) => type === "audio" || type === "video"
  );
  return uniqBy(items, (item) => item.details.src);
};

const createSelectMediaOptions = (mediaTrackItems: ITrackItem[]) => {
  return mediaTrackItems.map(({ name, details, metadata }) => ({
    label: metadata?.name || name,
    value: details.src
  }));
};

const groupCaptionItems = (trackItemsMap: ITrackItemsMap) => {
  const captionTrackItems = Object.values(trackItemsMap).filter(
    ({ type }: ITrackItem) => type === "caption"
  );
  return groupBy(captionTrackItems, "metadata.sourceUrl");
};

async function transcribeMedia(mediaUrl: string, targetLanguage: string) {
  const transcribeResponse = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: mediaUrl, targetLanguage })
  });

  const body = await transcribeResponse
    .json()
    .catch(() => ({ message: "Failed to transcribe media." }));

  if (!transcribeResponse.ok) {
    if (body.message === "No speech detected in the media.") {
      return null; // sentinel: not an error, just nothing to caption
    }
    throw new Error(body.message || "Failed to transcribe media.");
  }

  return body.transcribe.data; // { results: { main: { words: [] } } }
}

// async function fetchJsonFromUrl(url: string) {
//   try {
//     const response = await fetch(url);
//
//     if (!response.ok) {
//       throw new Error(`Error fetching JSON: ${response.statusText}`);
//     }
//
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Failed to fetch JSON data:", error);
//     throw error; // Optionally rethrow to handle it in the caller
//   }
// }
