import Timeline from "@designcombo/timeline";
import {
  IComposition,
  ISize,
  ITimelineScaleState,
  ITimelineScrollState,
  ITrack,
  ITrackItem,
  ITransition,
  ItemStructure
} from "@designcombo/types";
import { Moveable } from "@interactify/toolkit";
import { PlayerRef } from "@remotion/player";
import { create } from "zustand";
import {TIMELINE_ZOOM_LEVELS} from "@/features/editor/constants/scale";
import {nanoid} from "nanoid";

interface ITimelineStore {
  duration: number;
  fps: number;
  scale: ITimelineScaleState;
  scroll: ITimelineScrollState;
  size: ISize;
  tracks: ITrack[];
  trackItemIds: string[];
  transitionIds: string[];
  transitionsMap: Record<string, ITransition>;
  trackItemsMap: Record<string, ITrackItem>;
  structure: ItemStructure[];
  activeIds: string[];
  timeline: Timeline | null;
  setTimeline: (timeline: Timeline) => void;
  setScale: (scale: ITimelineScaleState) => void;
  setScroll: (scroll: ITimelineScrollState) => void;
  playerRef: React.RefObject<PlayerRef> | null;
  setPlayerRef: (playerRef: React.RefObject<PlayerRef> | null) => void;

  sceneMoveableRef: React.RefObject<Moveable> | null;
  setSceneMoveableRef: (ref: React.RefObject<Moveable>) => void;
  setState: (state: any) => Promise<void>;
  compositions: Partial<IComposition>[];
  setCompositions: (compositions: Partial<IComposition>[]) => void;

  background: {
    type: "color" | "image";
    value: string;
  };
  viewTimeline: boolean;
  setViewTimeline: (viewTimeline: boolean) => void;

  timelineHeight: number;
  setTimelineHeight: (height: number) => void;
  timelineContainerRef: React.RefObject<HTMLDivElement> | null;
  setTimelineContainerRef: (ref: React.RefObject<HTMLDivElement>) => void;
  toggleTimelineFullHeight: () => void;

  isShortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;

  markers: IMarker[];
  addMarker: (timeMs: number, type?: "marker" | "comment") => void;
  removeMarker: (id: string) => void;
  playheadSnapped: boolean;

  muted: boolean;
  setMuted: (muted: boolean) => void;

  projectName: string;
  setProjectName: (name: string) => void;
}

export interface IMarker {
  id: string;
  timeMs: number;
  label?: string;
  color?: string;
  type: "marker" | "comment";
}

const useStore = create<ITimelineStore>((set, get) => ({
  compositions: [],
  structure: [],
  setCompositions: (compositions) => set({ compositions }),
  size: {
    width: 1920,
    height: 1080
  },

  background: {
    type: "color" as const,
    value: "#000000"
  },
  viewTimeline: true,
  setViewTimeline: (viewTimeline) => set({ viewTimeline }),

  timeline: null,
  duration: 0,
  fps: 30,
  scale: TIMELINE_ZOOM_LEVELS[27],
  scroll: {
    left: 0,
    top: 0
  },
  playerRef: null,

  activeIds: [],
  targetIds: [],
  tracks: [],
  trackItemIds: [],
  transitionIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  sceneMoveableRef: null,

  setTimeline: (timeline: Timeline) =>
    set(() => ({
      timeline: timeline
    })),
  setScale: (scale: ITimelineScaleState) =>
    set(() => ({
      scale: scale
    })),
  setScroll: (scroll: ITimelineScrollState) =>
    set(() => ({
      scroll: scroll
    })),
  setState: async (state) => {
    return set((currentState) => ({ ...currentState, ...state }));
  },
  setPlayerRef: (playerRef: React.RefObject<PlayerRef> | null) =>
    set({ playerRef }),
  setSceneMoveableRef: (ref) => set({ sceneMoveableRef: ref }),

  timelineHeight: typeof window !== "undefined" ? window.innerHeight * 0.45 : 0,
  timelineContainerRef: null,
  setTimelineHeight: (height: number) => set({ timelineHeight: height }),
  setTimelineContainerRef: (ref: React.RefObject<HTMLDivElement>) =>
    set({ timelineContainerRef: ref }),
  toggleTimelineFullHeight: () => {
    const { timelineHeight, timelineContainerRef, timeline } = get();
    const FULL_HEIGHT = window.innerHeight;
    const DEFAULT_HEIGHT = window.innerHeight * 0.45;
    const isFull = timelineHeight >= FULL_HEIGHT;
    const newHeight = isFull ? DEFAULT_HEIGHT : FULL_HEIGHT;

    if (timelineContainerRef?.current) {
      timelineContainerRef.current.style.height = `${newHeight}px`;
    }

    const containerHeight =
      (document.getElementById("playhead")?.clientHeight || 0) -
      (document.getElementById("playhead-handle")?.clientHeight || 0);
    timeline?.resize({ height: containerHeight });

    set({ timelineHeight: newHeight });
  },

  isShortcutsModalOpen: false,
  setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),

  markers: [],
  addMarker: (timeMs, type = "marker") => set((state) => ({
    markers: [
      ...state.markers,
      {
        id: nanoid(),
        timeMs,
        type,
      }
    ]
  })),
  removeMarker: (id) => set((state) => ({
    markers: state.markers.filter((m) => m.id !== id)
  })),

  playheadSnapped: false,

  muted: false,
  setMuted: (muted: boolean) => set({ muted }),

  projectName: "My Project",
  setProjectName: (name: string) => set({ projectName: name }),
}));

export default useStore;
