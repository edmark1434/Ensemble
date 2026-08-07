import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import {
  DEFAULT_AUDIO_BITRATE_KBPS,
  DEFAULT_COMPOSITION_HEIGHT,
  DEFAULT_COMPOSITION_WIDTH,
  DEFAULT_EXPORT_FORMAT,
  DEFAULT_EXPORT_TYPE,
  DEFAULT_FRAME_RATE,
  DEFAULT_RESOLUTION,
  ExportFormat,
  ExportType,
  FORMATS_BY_TYPE,
  getDefaultResolution,
  getDefaultVideoBitrateKbps,
  getResolutionOptions
} from "../constants/download-options";
import {IBackground} from "@/features/editor/store/use-store";

interface Output {
  url: string;
  type: string;
}

interface DownloadState {
  projectId: string;
  jobId: string | null;
  exporting: boolean;
  type: ExportType;
  format: ExportFormat;
  resolution: number;
  fps: number;
  bitrate: number | null;
  compositionWidth: number;
  compositionHeight: number;
  projectName: string;
  background: IBackground;
  progress: number;
  output?: Output;
  error: string | null;
  cancelled: boolean;
  payload?: RenderPayload;
  displayProgressModal: boolean;
  exportStartedAt: number | null;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setType: (type: ExportType) => void;
    setFormat: (format: ExportFormat) => void;
    setResolution: (resolution: number) => void;
    setFps: (fps: number) => void;
    setBitrate: (bitrate: number) => void;
    setCompositionSize: (width: number, height: number) => void;
    setProjectName: (projectName: string) => void;
    setBackground: (background: IBackground) => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    startExport: () => void;
    cancelExport: () => void;
    resetExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

export interface RenderPayload extends IDesign {
  projectName: string;
  background: IBackground;
  type: ExportType;
  format: ExportFormat;
  resolution: number;
  fps: number;
  bitrate: number | null;
  currentTime?: number; // ms
}

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  jobId: null,
  exporting: false,
  type: DEFAULT_EXPORT_TYPE,
  format: DEFAULT_EXPORT_FORMAT,
  resolution: DEFAULT_RESOLUTION,
  fps: DEFAULT_FRAME_RATE,
  compositionWidth: DEFAULT_COMPOSITION_WIDTH,
  compositionHeight: DEFAULT_COMPOSITION_HEIGHT,
  projectName: "My Project",
  background: { type: "color", value: "#000000" },
  bitrate: getDefaultVideoBitrateKbps(
    DEFAULT_COMPOSITION_WIDTH,
    DEFAULT_COMPOSITION_HEIGHT,
    DEFAULT_RESOLUTION,
    DEFAULT_FRAME_RATE
  ),
  progress: 0,
  error: null,
  cancelled: false,
  displayProgressModal: false,
  exportStartedAt: null,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setType: (type) => {
      const format = FORMATS_BY_TYPE[type][0].value;
      const resolution = type === "audio" ? get().resolution : getDefaultResolution(format);
      const fps = DEFAULT_FRAME_RATE;
      const { compositionWidth, compositionHeight } = get();
      const bitrate =
        type === "audio"
          ? DEFAULT_AUDIO_BITRATE_KBPS
          : type === "video"
            ? getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps)
            : null;
      set({ type, format, resolution, fps, bitrate });
    },
    setFormat: (format) => {
      const { type, fps, resolution, compositionWidth, compositionHeight } = get();
      const resolutionOptions = getResolutionOptions(format);
      const nextResolution = resolutionOptions.some((option) => option.value === resolution)
        ? resolution
        : getDefaultResolution(format);
      const bitrate =
        format === "gif" || format === "mov" ? null
          : (type === "video"
            ? getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, nextResolution, fps)
            : get().bitrate
          );
      set({ format, resolution: nextResolution, bitrate });
    },
    setResolution: (resolution) => {
      const { type, fps, compositionWidth, compositionHeight } = get();
      const bitrate =
        type === "video"
          ? getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps)
          : get().bitrate;
      set({ resolution, bitrate });
    },
    setFps: (fps) => {
      const { type, resolution, compositionWidth, compositionHeight } = get();
      const bitrate =
        type === "video"
          ? getDefaultVideoBitrateKbps(compositionWidth, compositionHeight, resolution, fps)
          : get().bitrate;
      set({ fps, bitrate });
    },
    setBitrate: (bitrate) => set({ bitrate }),
    setCompositionSize: (width, height) => {
      const { type, resolution, fps } = get();
      const bitrate =
        type === "video"
          ? getDefaultVideoBitrateKbps(width, height, resolution, fps)
          : get().bitrate;
      set({ compositionWidth: width, compositionHeight: height, bitrate });
    },
    setProjectName: (projectName) => set({ projectName }),
    setBackground: (background) => set({ background }),
    setProgress: (progress) => set({ progress }),
    setState: (state) => set({ ...state }),
    setOutput: (output) => set({ output }),
    setDisplayProgressModal: (displayProgressModal) =>
      set({ displayProgressModal }),
    startExport: async () => {
      const { exporting } = get();

      if (exporting) {
        set({ displayProgressModal: true });
        return;
      }

      try {
        set({
          exporting: true,
          displayProgressModal: true,
          error: null,
          output: undefined,
          cancelled: false,
          progress: 0,
          exportStartedAt: Date.now()
        });

        const { payload } = get();

        if (!payload) throw new Error("Payload is not defined");

        const response = await fetch(`/api/render`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          console.error("Export request failed:", response.status, errorBody?.issues ?? errorBody);
          throw new Error("Failed to submit export request.");
        }

        const jobInfo = await response.json();
        const jobId = jobInfo.jobId;

        set({ jobId });

        const checkStatus = async () => {
          if (get().cancelled) return;

          try {
            const statusResponse = await fetch(`/api/render/${jobId}`, {
              headers: {
                "Content-Type": "application/json"
              }
            });

            if (!statusResponse.ok)
              throw new Error("Failed to fetch export status.");

            const statusInfo = await statusResponse.json();
            const { status, progress, videoUrl } = statusInfo;

            if (get().cancelled) return;

            set({ progress: progress ?? 0 });

            if (status === "completed") {
              set({ exporting: false, output: { url: videoUrl, type: get().format } });
            } else if (status === "in-progress" || status === "queued") {
              setTimeout(checkStatus, 2500);
            } else if (status === "failed") {
              set({ exporting: false, error: "Render failed." });
            }
          } catch (error) {
            console.error(error);
            set({ exporting: false, error: "Failed to check export status." });
          }
        };

        checkStatus();
      } catch (error) {
        console.error(error);
        set({
          exporting: false,
          error: error instanceof Error ? error.message : "Export failed."
        });
      }
    },
    cancelExport: async () => {
      const { jobId } = get();

      set({
        cancelled: true,
        exporting: false,
        displayProgressModal: false,
        exportStartedAt: null
      });

      if (jobId) {
        try {
          const response = await fetch(`/api/render/${jobId}`, { method: "DELETE" });
          if (!response.ok) {
            console.error("Failed to cancel render job:", await response.json().catch(() => null));
          }
        } catch (error) {
          console.error("Failed to cancel render job:", error);
        }
      }
    },
    resetExport: () => {
      set({
        jobId: null,
        exporting: false,
        progress: 0,
        output: undefined,
        error: null,
        cancelled: false,
        displayProgressModal: false,
        exportStartedAt: null
      });
    }
  }
}));