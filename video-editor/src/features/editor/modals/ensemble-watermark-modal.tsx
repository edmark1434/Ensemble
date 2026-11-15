import { useEffect } from "react";
import { Check, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditorPlan } from "../hooks/use-editor-plan";
import { useEnsembleWatermark } from "../hooks/use-ensemble-watermark";

export function EnsembleWatermarkModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: policy, isError, isFetching, refetch } = useEditorPlan();
  const { canRemove, setShowWatermark } = useEnsembleWatermark();
  useEffect(() => { if (open) void refetch(); }, [open, refetch]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-ensemble-watermark-control="" className="z-[300] gap-6 border bg-card p-8 sm:max-w-md"
      onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      <DialogHeader className="gap-3 text-left">
        <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Sparkles className="size-5" /></div>
        <DialogTitle className="text-lg font-semibold">Remove Ensemble watermark</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          {canRemove ? "Your plan includes watermark-free exports. Remove the Ensemble branding from your preview and exports." : "Your current plan requires the Made in Ensemble watermark. View plans to find one that includes watermark-free exports."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1"><p className="text-sm font-medium">Your work, without the branding</p><p className="text-xs leading-relaxed text-muted-foreground">Applies to videos, GIFs, images and image sequences. Paid marketplace assets require their own licenses.</p></div>
        </div>
        <div className="flex items-start gap-3 px-1">
          <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">In shared projects, your own plan determines the watermark on your exports. Removing it here won’t change your collaborators’ previews or exports.</p>
        </div>
        {isError && <p role="alert" className="text-xs text-red-500">Unable to refresh your plan. <button type="button" className="underline" onClick={() => void refetch()}>Try again</button></p>}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Keep watermark</Button>
        <Button disabled={!policy || isFetching || isError} onClick={() => {
          if (canRemove) { setShowWatermark(false); onOpenChange(false); }
          else if (policy) window.open(policy.upgradeUrl, "_blank", "noopener,noreferrer");
        }}>
          {!canRemove && <Sparkles className="size-4" />}
          {isFetching ? "Checking your plan…" : canRemove ? "Remove watermark" : "View plans"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
