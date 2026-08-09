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
  const { progress, exporting, exportStartedAt, displayProgressModal, output, error, jobId, queuePosition, actions } =
    useDownloadState();
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

  const handleDownload = async () => {
    if (output?.url) {
      const extension = new URL(output.url).pathname.split(".").pop() || "mp4";
      await download(output.url, `${sanitizeFilename(output.projectName ?? projectName)}.${extension}`);

      if (jobId) {
        fetch(`/api/render/${jobId}`, { method: "DELETE" }).catch((error) => {
          console.error("Failed to delete render output after download:", error);
        });
      }
    }
    actions.resetExport();
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
      <DialogContent className="border bg-card px-2 py-8 gap-6 overflow-hidden sm:max-w-md">
        <DialogHeader className="px-6 -mt-0.75">
          <DialogTitle className="text-md font-semibold">Export</DialogTitle>
        </DialogHeader>

        <div className="px-6">
          {isCompleted ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleCheckIcon size={32} className="text-primary" />
              <div className="space-y-1">
                <div className="font-semibold">Export ready</div>
                <div className="text-muted-foreground text-sm">
                  Hang on while we save it to your device.
                </div>
              </div>
              <Button onClick={handleDownload}>Download</Button>
            </div>
          ) : isFailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleXIcon size={32} className="text-red-500" />
              <div className="space-y-1">
                <div className="font-semibold">Export failed</div>
                <div className="text-muted-foreground text-sm">{error}</div>
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