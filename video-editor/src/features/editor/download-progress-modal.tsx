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
  const { progress, exporting, exportStartedAt, displayProgressModal, output, error, actions } =
    useDownloadState();
  const { projectName } = useStore();
  const isCompleted = !!output;
  const isFailed = !!error;

  const [elapsedMs, setElapsedMs] = useState(0);

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
      await download(output.url, `${sanitizeFilename(projectName)}`);
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
                <div className="font-semibold">Export ready for download</div>
                <div className="text-muted-foreground text-sm">
                  You can download the video to your device.
                </div>
              </div>
              <Button onClick={handleDownload}>Download</Button>
            </div>
          ) : isFailed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
              <CircleXIcon size={32} className="text-destructive" />
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
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-4xl font-semibold">
                {Math.floor(progress * 100)}%
              </div>
              <div className="text-muted-foreground text-sm">
                <div>Closing the browser will not cancel the export.</div>
                <div>The video will be saved in your space.</div>
              </div>
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