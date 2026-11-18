import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SaveApplyConfirmModal({ savedAt, onCancel, onConfirm, pending, error }: {
  savedAt: string; onCancel: () => void; onConfirm: () => void; pending: boolean; error: string;
}) {
  return <Dialog open onOpenChange={open => { if (!open && !pending) onCancel(); }}>
    <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 sm:max-w-lg" onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Apply save?</DialogTitle>
        <DialogDescription className="leading-relaxed text-pretty">This will replace the entire project timeline, its scenes, and canvas settings with the save from {savedAt}. Your current clips and markers will be removed. This affects everyone working on this project. Save first if you want to keep the current version.</DialogDescription>
      </DialogHeader>
      {error && <div role="alert" className="px-6 text-xs text-red-500">{error}</div>}
      <DialogFooter className="px-6">
        <Button variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" disabled={pending} onClick={onConfirm}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Applying…" : "Apply save"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
