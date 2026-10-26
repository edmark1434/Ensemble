"use client";

import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AssetReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  busy?: boolean;
  onSubmit: (report: { type: string; description: string }) => Promise<unknown>;
}

const REPORT_REASONS = [
  "Copyright infringement",
  "Inappropriate content",
  "Misleading listing",
  "Spam",
  "Other",
];

export function AssetReportModal({ open, onOpenChange, assetName, busy = false, onSubmit }: AssetReportModalProps) {
  const fieldId = useId();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pending = busy || submitting;

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || description.trim().length < 20) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ type: reason, description });
      onOpenChange(false);
      setDescription("");
      toast.success("Report submitted to marketplace moderators.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value); }}>
      <DialogContent className="z-[300] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}>
        <DialogHeader className="px-6 -mt-0.75">
          <DialogTitle className="text-md font-semibold">Report asset</DialogTitle>
          <DialogDescription className="break-words leading-relaxed">
            Describe the issue with <strong className="font-semibold text-foreground">{assetName}</strong> for the marketplace moderators.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6 px-6" onSubmit={(event) => { void submitReport(event); }}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${fieldId}-reason`}>Reason</Label>
            <Select value={reason} onValueChange={setReason} disabled={pending}>
              <SelectTrigger id={`${fieldId}-reason`} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[1000]">
                {REPORT_REASONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${fieldId}-details`}>Details (at least 20 characters)</Label>
            <Textarea id={`${fieldId}-details`} required minLength={20} maxLength={2000} rows={4}
              value={description} onChange={(event) => setDescription(event.target.value)} disabled={pending} />
          </div>
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || description.trim().length < 20}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
