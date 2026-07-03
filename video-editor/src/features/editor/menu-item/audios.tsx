import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_ITEMS } from "@designcombo/state";
import { IAudio } from "@designcombo/types";
import {Loader2, Music, Music2, Pause, Play, Search} from "lucide-react";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";
import {useIsDraggingOverTimeline} from "@/features/editor/hooks/is-dragging-over-timeline";

export const Audios = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<IAudio[]>([]);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchMusic = async (query: string, pageNumber: number = 1) => {
    if (pageNumber === 1) {
      setIsLoading(true);
    } else {
      setIsMoreLoading(true);
    }

    try {
      const response = await fetch("/api/audio/music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          limit: 30,
          page: pageNumber,
          query: query ? { keys: [query] } : {}
        })
      });

      const data = await response.json();

      if (data.musics) {
        const mappedMusics = data.musics.map((music: any) => ({
          id: music.id,
          details: {
            src: music.src
          },
          name: music.name,
          type: music.type,
          metadata: {
            author: music.description || ""
          }
        }));

        if (pageNumber === 1) {
          setSearchResults(mappedMusics);
        } else {
          setSearchResults((prev: IAudio[]) => [...prev, ...mappedMusics]);
        }

        setHasMore(data.pagination?.hasMore || false);
      } else {
        if (pageNumber === 1) {
          setSearchResults([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch music:", error);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce((query: string) => {
      setPage(1);
      fetchMusic(query, 1);
    }, 500),
    []
  );

  useEffect(() => {
    fetchMusic("");
  }, []);
  const handleAddAudio = (payload: Partial<IAudio>) => {
    payload.id = generateId();
    payload.metadata = {
      ...payload.metadata,
      name: payload.name,  // store name in metadata
    };
    console.log(payload);
    dispatch(ADD_AUDIO, {
      payload,
      options: {}
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMusic(searchQuery, nextPage);
  };

  const uniqueResults = Array.from(
    new Map(searchResults.map((item: IAudio) => [item.id, item])).values()
  );

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchMusic("");
  };

  // Main view
  return (
    <div className="flex flex-1 flex-col max-w-full h-full">
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Button
            size="sm"
            variant="ghost"
            className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => fetchMusic(searchQuery)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
          <Input
            placeholder="Search Freesound audios..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                fetchMusic(searchQuery);
              }
            }}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearSearch}
            disabled={isLoading}
          >
            Clear
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 h-full max-w-full px-4">
        {isLoading && uniqueResults.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : uniqueResults.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Music2 size={32} className="opacity-50" />
            <span className="text-sm">No music found</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {uniqueResults.map((audio, index) => (
              <AudioItem
                onAdd={handleAddAudio}
                item={audio}
                key={index}
                playingId={playingId}
                setPlayingId={setPlayingId}
              />
            ))}
          </div>
        )}

        {hasMore && uniqueResults.length > 0 && (
          <div className="py-4 flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={loadMore}
              disabled={isMoreLoading}
            >
              {isMoreLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

const AudioItem = ({
   item,
   onAdd,
   playingId,
   setPlayingId
}: {
  item: Partial<IAudio>;
  onAdd: (payload: Partial<IAudio>) => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<string>("--:--");
  const isPlaying = playingId === item.id;
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      setPlayingId(null);
    } else {
      setPlayingId(item.id!);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const seconds = Math.round(audioRef.current.duration);
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      setDuration(`${min}:${sec.toString().padStart(2, "0")}`);
    }
  };

  const style = useMemo(
    () => ({
      backgroundImage:
        "url(https://cdn.designcombo.dev/thumbnails/music-preview.png)",
      backgroundSize: "cover",
      width: "120px",
      height: "120px",
      borderRadius: "6px"
    }),
    []
  );

  return (
    <Draggable
      data={item}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={!isDraggingOverTimeline}
    >
      <div className="group relative flex items-center gap-3 p-2 bg-secondary rounded-md hover:opacity-80 transition-colors">
        <audio
          ref={audioRef}
          src={item.details?.src}
          onEnded={() => setPlayingId(null)}
          onLoadedMetadata={handleLoadedMetadata}
          className="hidden"
        />

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-black/10 dark:bg-white/5 hover:bg-black/15 dark:hover:bg-white/10 shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </Button>

        <div
          onClick={() => onAdd(item)}
          className="flex flex-col min-w-0 flex-1 cursor-pointer"
        >
          <span className="text-sm font-medium truncate mb-0.5 text-zinc-900 dark:text-zinc-300">
            {item.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.metadata?.author && `${item.metadata.author} · `}{duration}
          </span>
        </div>

        {isPlaying && (
          <div className="flex items-end gap-[2px] h-4 shrink-0">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-[3px] bg-primary rounded-full"
                style={{
                  height: "100%",
                  animationName: "wave-bar",
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.8s",
                  animationIterationCount: "infinite",
                  animationTimingFunction: "ease-in-out",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Draggable>
  );
};