import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TemplateReplaceConfirmModal({ name, onCancel, onConfirm, needsPurchase, pending, loading, error, onRetry }: {
  name: string; onCancel: () => void; onConfirm: () => void; needsPurchase: boolean; pending: boolean; loading: boolean; error: string; onRetry: () => void;
}) {
  return <Dialog open onOpenChange={open => { if (!open && !pending) onCancel(); }}>
    <DialogContent className="z-[300] border bg-card px-2 py-8 gap-6 sm:max-w-lg" onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onPointerDownOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader className="px-6 -mt-0.75">
        <DialogTitle className="text-md font-semibold">Replace project?</DialogTitle>
        <DialogDescription className="leading-relaxed text-pretty">This will replace the entire project timeline and canvas settings with “{name}”. Your current clips and markers will be removed. This affects everyone working on this project.</DialogDescription>
      </DialogHeader>
      {error && <div role="alert" className="px-6 text-xs text-red-500">{error}{loading && <Button variant="ghost" size="sm" onClick={onRetry}>Try again</Button>}</div>}
      <DialogFooter className="px-6">
        <Button variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" disabled={pending || loading} onClick={onConfirm}>{pending ? "Applying…" : needsPurchase ? "Continue to purchase" : "Continue"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
