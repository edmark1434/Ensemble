import { IDesign } from "@designcombo/types";
import { create } from "zustand";
interface Output {
  url: string;
  type: string;
}

interface DownloadState {
  projectId: string;
  jobId: string | null;
  exporting: boolean;
  exportType: "json" | "mp4";
  progress: number;
  output?: Output;
  error: string | null;
  cancelled: boolean;
  payload?: IDesign;
  displayProgressModal: boolean;
  exportStartedAt: number | null;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setExportType: (exportType: "json" | "mp4") => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    startExport: () => void;
    cancelExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  jobId: null,
  exporting: false,
  exportType: "mp4",
  progress: 0,
  error: null,
  cancelled: false,
  displayProgressModal: false,
  exportStartedAt: null,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setExportType: (exportType) => set({ exportType }),
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
              set({ exporting: false, output: { url: videoUrl, type: get().exportType } });
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
    }
  }
}));