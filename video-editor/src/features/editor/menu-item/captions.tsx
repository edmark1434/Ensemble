import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCaptions } from "../utils/captions";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_CAPTIONS, ADD_ITEMS } from "@designcombo/state";
import { ITrackItem, ITrackItemsMap } from "@designcombo/types";
import { formatTimeToHumanReadable, millisecondsToHHMMSS } from "../utils/format";
import useStore from "../store/use-store";
import { escapeRegExp, groupBy, uniqBy } from "lodash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { generateId } from "@designcombo/timeline";
import { ChevronDown, ChevronUp, Loader2, Search, X } from "lucide-react";
import { seedDefaultFont } from "@/features/editor/utils/seed-default-font";
import { scrollTimelineToFrame } from "@/features/editor/utils/timeline-scroll";
import { useTimelineOffsetX } from "@/features/editor/hooks/use-timeline-offset";

// seek + scroll the timeline to the caption if it's off screen,
// same as jumping to a marker
const useSeekToCaption = () => {
  const timelineOffsetX = useTimelineOffsetX();
  const timelineOffsetXRef = useRef(timelineOffsetX);
  timelineOffsetXRef.current = timelineOffsetX;

  return useCallback((timeMs: number) => {
    const { playerRef, fps } = useStore.getState();
    const frame = Math.round((timeMs / 1000) * fps);
    playerRef?.current?.seekTo(frame);
    scrollTimelineToFrame(frame, "marker", timelineOffsetXRef.current);
  }, []);
};

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

  const [generatingMedia, setGeneratingMedia] = useState<string | undefined>();
  const isGenerating = generatingMedia !== undefined;
  const generatingLabel = selectMediaItems.find(
    (i) => i.value === generatingMedia
  )?.label;

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
      groupedCaptions[key] = orderedCaptionByDisplayFrom as ITrackItem[];
    }
    setCaptionTrackItemsMap(groupedCaptions);
  }, [trackItemsMap]);

  const handleSelectChange = (value: string) => {
    setSelectedMedia(value);
  };

  const createCaptions = async (selectedMedia: string) => {
    setGeneratingMedia(selectedMedia);
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
      setGeneratingMedia(undefined);
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

  const [searchQuery, setSearchQuery] = useState("");
  const trimmedQuery = searchQuery.trim();
  const hasAnyCaptions = Object.keys(captionTrackItemsMap).length > 0;
  const isSearching = hasAnyCaptions && trimmedQuery !== "";

  // all media when none is selected, otherwise just the selected one
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    const needle = trimmedQuery.toLowerCase();
    const pool = selectedMedia
      ? captionTrackItemsMap[selectedMedia] ?? []
      : Object.values(captionTrackItemsMap).flat();
    return pool
      .filter((item) => String(item.details?.text ?? "").toLowerCase().includes(needle))
      .sort((a, b) => a.display.from - b.display.from);
  }, [trimmedQuery, selectedMedia, captionTrackItemsMap]);

  const seekToCaption = useSeekToCaption();

  // seek the first result whenever a result comes up or the result set changes
  const resultsKey = isSearching
    ? `${trimmedQuery}|${searchResults.map((item) => item.id).join(",")}`
    : "";
  useEffect(() => {
    if (!resultsKey || !searchResults.length) return;
    seekToCaption(searchResults[0].display.from);
  }, [resultsKey]);

  // up / down = "click" the previous / next result relative to the playhead
  const seekToResult = (direction: 1 | -1) => {
    if (!searchResults.length) return;
    const { playerRef, fps } = useStore.getState();
    const frameMs = 1000 / fps;
    const nowMs = (playerRef?.current?.getCurrentFrame() ?? 0) * frameMs;
    const target =
      direction === 1
        ? searchResults.find((item) => item.display.from > nowMs + frameMs) ?? searchResults[0]
        : [...searchResults].reverse().find((item) => item.display.from < nowMs - frameMs) ??
        searchResults[searchResults.length - 1];
    seekToCaption(target.display.from);
  };

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
          generatingMedia={generatingMedia}
          generatingLabel={generatingLabel}
          errorMessage={errorMessage}
          estimatedMs={estimatedMs}
          elapsedMs={elapsedMs}
          hasAnyCaptions={hasAnyCaptions}
          isSearching={isSearching}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSeekResult={seekToResult}
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
  generatingMedia,
  generatingLabel,
  errorMessage,
  estimatedMs,
  elapsedMs,
  hasAnyCaptions,
  isSearching,
  searchQuery,
  onSearchChange,
  searchResults,
  onSeekResult,
}: {
  selectMediaItems: { label: string; value: string }[];
  selectedMedia: string | undefined;
  onSelectChange: (value: string) => void;
  captionTrackItemsMap: Record<string, ITrackItem[]>;
  createCaptions: (selectedMedia: string) => void;
  generatingMedia: string | undefined;
  generatingLabel: string | undefined;
  errorMessage: string | null;
  estimatedMs: number;
  elapsedMs: number;
  hasAnyCaptions: boolean;
  isSearching: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchResults: ITrackItem[];
  onSeekResult: (direction: 1 | -1) => void;
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


    {hasAnyCaptions && (
      <CaptionSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        onPrev={() => onSeekResult(-1)}
        onNext={() => onSeekResult(1)}
        hasResults={searchResults.length > 0}
      />
    )}

    {isSearching ? (
      searchResults.length > 0 ? (
        <ScrollArea className="w-full px-4 pb-4">
          <MediaWithCaptions
            captionTrackItems={searchResults}
            query={searchQuery.trim()}
          />
        </ScrollArea>
      ) : (
        <div className="w-full h-full px-4 pb-4 flex flex-col items-center justify-center">
          <div className="text-center text-sm text-muted-foreground text-pretty pb-4">
            No captions found.
          </div>
        </div>
      )
    ) : selectedMedia ? (
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
            isGenerating={generatingMedia === selectedMedia}
            blockedBy={
              generatingMedia && generatingMedia !== selectedMedia
                ? generatingLabel ?? "Another media"
                : undefined
            }
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

const highlightKeyword = (text: string, query?: string) => {
  const q = query?.trim();
  if (!q) return text;
  // split with a capture group: odd indexes are the matches
  return text
    .split(new RegExp(`(${escapeRegExp(q)})`, "gi"))
    .map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
};

const CaptionSearchBar = ({
  value,
  onChange,
  onPrev,
  onNext,
  hasResults
}: {
  value: string;
  onChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasResults: boolean;
}) => (
  <div className="w-full px-4 pb-4">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        placeholder="Search through generated captions..."
        className="pl-9 pr-24"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          e.shiftKey ? onPrev() : onNext();
        }}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onChange("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onPrev}
          disabled={!hasResults}
          aria-label="Previous caption"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onNext}
          disabled={!hasResults}
          aria-label="Next caption"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
    </div>
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
  blockedBy,
  estimatedMs,
  elapsedMs
}: {
  createCaptions: () => void;
  isGenerating: boolean;
  blockedBy?: string;
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
      disabled={isGenerating || !!blockedBy}
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
    <div className="text-center text-xs text-muted-foreground text-pretty">
      {blockedBy ? (
        <>
          <span className="text-primary text-pretty">{blockedBy}</span> is still
          generating captions. Please wait.
        </>
      ) : (
        `Estimated time: ${millisecondsToHHMMSS(estimatedMs)}`
      )}
    </div>
  </div>
);

const MediaWithCaptions = ({
  captionTrackItems,
  query
}: {
  captionTrackItems: ITrackItem[];
  query?: string;
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
          query={query}
        />
      ))}
    </div>
  );
};
const CaptionItem = ({
  item,
  isActive,
  query
}: {
  item: ITrackItem;
  isActive?: boolean;
  query?: string;
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

  const seekToCaption = useSeekToCaption();
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg px-1.5 py-2 hover:cursor-pointer hover:bg-accent/30 ${
        isActive
          ? "bg-captions-background text-captions-text font-semibold"
          : "text-muted-foreground"
      }`}
      onClick={() => seekToCaption(display.from)}
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
        <div className="flex-1 text-sm">{highlightKeyword(details.text, query)}</div>
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

async function transcribeMedia(mediaUrl: string, _targetLanguage: string) {
  const submitRes = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: mediaUrl })
  });
  const submitBody = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok || !submitBody.id) {
    throw new Error(
      submitBody.message || `Failed to start transcription (${submitRes.status}). Try again.`
    );
  }

  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`/api/transcribe/${submitBody.id}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message || `Failed to check transcription (${res.status}). Try again.`);
    }
    if (body.status === "completed") return body.data;
    if (body.status === "empty") return null;
    if (body.status === "error") throw new Error(body.message || "Transcription failed. Try again.");
  }
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