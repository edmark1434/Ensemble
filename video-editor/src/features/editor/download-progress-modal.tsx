"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import useStore from "./store/use-store";
import { Button } from "@/components/ui/button";
import {CircleCheckIcon, CircleXIcon, Loader2} from "lucide-react";
import { download } from "@/utils/download";
import { useEffect, useState } from "react";
import { millisecondsToHHMMSS } from "./utils/format";

const sanitizeFilename = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "Untitled";
  return trimmed.replace(/[/\\?%*:|"<>]/g, "-");
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
    if (!exporting || !exportStartedAt) return;

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
    if (!output || downloadStatus !== "idle") return;

    const timeout = setTimeout(() => {
      handleDownload();
    }, 3000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output, downloadStatus]);

  useEffect(() => {
    if (displayProgressModal) return;

    const timeout = setTimeout(() => {
      if (downloadStatus === "downloaded" || downloadStatus === "expired") {
        actions.resetExport();
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProgressModal, downloadStatus]);

  const handleDownload = async () => {
    if (!output?.url) return;

    actions.setDownloadStatus("downloading");

    try {
      const headResponse = await fetch(output.url, { method: "HEAD" });
      if (!headResponse.ok) throw new Error("Render output is no longer available.");

      const extension = new URL(output.url).pathname.split(".").pop() || "mp4";
      download(output.url, `${sanitizeFilename(output.projectName ?? projectName)}.${extension}`);

      actions.setDownloadStatus("downloaded");
    } catch (error) {
      console.error("Download failed, treating export as expired:", error);
      actions.setDownloadStatus("expired");
    } finally {
      if (jobId) {
        fetch(`/api/render/${jobId}`, {
          method: "DELETE",
          headers: { "x-user-id": useStore.getState().userId },
        }).catch((error) => {
          console.error("Failed to clean up render job after download:", error);
        });
      }
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
      onOpenChange={actions.setDisplayProgressModal}
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
                  This export is no longer available.<br/>Please export again.
                </div>
              </div>
              <Button variant="outline" onClick={() => actions.setDisplayProgressModal(false)}>
                Close
              </Button>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleCheckIcon size={32} className="text-primary" />
              <div className="space-y-1">
                <div className="font-semibold">
                  {downloadStatus === "downloaded" ? "Export saved" : "Export ready"}
                </div>
                <div className="text-muted-foreground text-sm">
                  {downloadStatus === "downloaded"
                    ? "The export is downloaded."
                    : downloadStatus === "downloading"
                      ? "Hang on while we save it to your device."
                      : "You can download the export to your device."}
                </div>
              </div>
              <Button
                onClick={downloadStatus === "downloaded" ? () => actions.setDisplayProgressModal(false) : handleDownload}
                disabled={downloadStatus === "downloading"}
                variant={downloadStatus === "downloaded" ? "outline" : "default"}
              >
                {downloadStatus === "downloading" ? "Downloading..." : downloadStatus === "downloaded" ? "Close" : "Download"}
              </Button>
            </div>
          ) : isFailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleXIcon size={32} className="text-red-500" />
              <div className="space-y-1">
                <div className="font-semibold">Export failed</div>
                <div className="text-muted-foreground text-sm">
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
                    {Math.floor(progress * 100)}%
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