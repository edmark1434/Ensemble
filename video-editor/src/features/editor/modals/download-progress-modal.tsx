"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDownloadState } from "../store/use-download-state";
import useStore from "../store/use-store";
import { Button } from "@/components/ui/button";
import { CircleCheckIcon, CircleXIcon, Loader2 } from "lucide-react";
import { download } from "@/utils/download";
import { useEffect, useState } from "react";
import { millisecondsToHHMMSS } from "../utils/format";

export const sanitizeFilename = (name: string): string => {
  const cleaned = Array.from(
    name
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, 150)
    .join("")
    .replace(/[. ]+$/, "");
  return cleaned || "Untitled";
};

const DownloadProgressModal = () => {
  const {
    actions,
    progress,
    exporting,
    exportStartedAt,
    displayProgressModal,
    output,
    error,
    jobId,
    queuePosition,
    downloadStatus,
  } = useDownloadState();
  const { projectName } = useStore();
  const isCompleted = !!output;
  const isFailed = !!error;

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    actions.resumeExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!exporting || !exportStartedAt) {
      setElapsedMs(0);
      return;
    }

    const tick = () => setElapsedMs(Date.now() - exportStartedAt);
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exporting, exportStartedAt]);

  useEffect(() => {
    if (output || error) {
      actions.setDisplayProgressModal(true);
    }
  }, [output, error, actions]);

  useEffect(() => {
    if (!displayProgressModal || !output || downloadStatus !== "idle") return;

    const timeout = setTimeout(() => {
      handleDownload();
    }, 3000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProgressModal, output, downloadStatus]);

  const handleModalOpenChange = (open: boolean) => {
    const current = useDownloadState.getState();
    if (!open && current.output) {
      const completedJobId = current.jobId;
      actions.resetExport();
      if (completedJobId) {
        void fetch(`/api/render/${completedJobId}`, {
          method: "DELETE",
          keepalive: true,
          headers: { "x-user-id": useStore.getState().userId },
        }).then(response => {
          if (!response.ok && response.status !== 404) throw new Error("Cleanup request failed.");
        }).catch(error => console.error("Failed to clean up render job after closing export:", error));
      }
      return;
    }
    actions.setDisplayProgressModal(open);
  };

  const handleDownload = async () => {
    if (!output?.url || useDownloadState.getState().downloadStatus === "downloading") return;

    actions.setDownloadStatus("downloading");

    try {
      const headResponse = await fetch(output.url, { method: "HEAD" });
      const current = useDownloadState.getState();
      // Closing the modal can clean up this export while the request is pending.
      if (current.jobId !== jobId || current.output !== output || !current.displayProgressModal) return;
      if (!headResponse.ok) throw new Error("Render output is no longer available.");

      const extension = new URL(output.url).pathname.split(".").pop() || "mp4";
      download(output.url, `${sanitizeFilename(output.projectName ?? projectName)}.${extension}`);

      actions.setDownloadStatus("requested");
    } catch (error) {
      if (useDownloadState.getState().output !== output) return;
      console.error("Download failed, treating export as expired:", error);
      actions.setDownloadStatus("expired");
    }
  };

  const handleCancel = () => {
    actions.cancelExport();
  };

  const handleCloseFailed = () => {
    actions.resetExport();
  };

  return (
    <Dialog
      open={displayProgressModal}
      onOpenChange={handleModalOpenChange}
    >
      <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 overflow-hidden sm:max-w-md">
        <DialogHeader className="px-6 -mt-0.75">
          <DialogTitle className="text-md font-semibold">Export</DialogTitle>
        </DialogHeader>

        <div className="px-6">
          {downloadStatus === "expired" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleXIcon size={32} className="text-red-500" />
              <div className="space-y-1">
                <div className="font-semibold">Download expired</div>
                <div className="text-muted-foreground text-sm">
                  This export is no longer available.<br />Please export again.
                </div>
              </div>
              <Button variant="outline" onClick={() => handleModalOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleCheckIcon size={32} className="text-primary" />
              <div className="space-y-1">
                <div className="font-semibold">
                  Export ready
                </div>
                <div className="text-muted-foreground text-sm">
                  {downloadStatus === "downloading"
                    ? "Preparing your download…"
                    : "You can download the export to your device."}
                </div>
              </div>
              <Button
                onClick={handleDownload}
                disabled={downloadStatus === "downloading"}
                variant="default"
              >
                Download
              </Button>
            </div>
          ) : isFailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleXIcon size={32} className="text-red-500" />
              <div className="space-y-1">
                <div className="font-semibold">Export failed</div>
                <div className="text-muted-foreground text-sm text-pretty">
                  {error.split("\n").map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleCloseFailed}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              {queuePosition ? (
                <>
                  <div className="text-4xl font-semibold">
                    #{queuePosition.position}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    <div>Queued — {queuePosition.position} of {queuePosition.total} in line.</div>
                    <div>Your export will start rendering shortly.</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-semibold">
                    {Math.max(Math.floor(progress * 100), exporting && elapsedMs >= 1000 ? 1 : 0)}%
                  </div>
                  <div className="text-muted-foreground text-sm">
                    <div>Closing the browser will not cancel the export.</div>
                    <div>The video will be saved in your space.</div>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {millisecondsToHHMMSS(elapsedMs)}
              </div>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadProgressModal;
