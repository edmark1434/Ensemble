"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleXIcon } from "lucide-react";

interface SceneRemovedModalProps {
  // null = closed
  sceneName: string | null;
  onClose: () => void;
}

const SceneRemovedModal = ({ sceneName, onClose }: SceneRemovedModalProps) => (
  <Dialog
    open={sceneName !== null}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 overflow-hidden sm:max-w-md">
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Access removed</DialogTitle>
      </DialogHeader>

      <div className="px-6">
        <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
          <CircleXIcon size={32} className="text-red-500" />
          <div className="space-y-1">
            <div className="font-semibold text-pretty">You have been removed from the scene: {sceneName}</div>
            <div className="text-muted-foreground text-sm break-words">We moved you back to the project timeline.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default SceneRemovedModal;