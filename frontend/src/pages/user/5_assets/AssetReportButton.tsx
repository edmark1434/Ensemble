import { useState } from "react";
import { Dialog } from "radix-ui";
import { Flag, Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import { showSuccessToast } from "@/components/utility/toast";
import type { AssetRecord } from "./assetTypes";

export default function AssetReportButton({ asset, isGuest, onGuest }: { asset: AssetRecord; isGuest: boolean; onGuest: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Copyright infringement");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
    <button type="button" onClick={() => isGuest ? onGuest() : setOpen(true)} aria-label="Report asset" title="Report asset" className="rounded-xl border border-gray-300 p-3 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"><Flag className="h-4 w-4" /></button>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[130] bg-black/75" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[131] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-dark-surface dark:text-white">
        <Dialog.Title className="pr-8 text-lg font-bold">Report asset</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-gray-500 dark:text-zinc-400">Describe the issue with <strong className="font-semibold text-gray-900 dark:text-white">{asset.name}</strong> for the marketplace moderators.</Dialog.Description>
        <Dialog.Close disabled={pending} aria-label="Close report" className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><X className="h-4 w-4" /></Dialog.Close>
        <form className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (pending || description.trim().length < 20) return;
          setPending(true); setError("");
          try {
            await api.post(`/api/assets/${asset.market_asset_id}/report`, { type: reason, description });
            setOpen(false); setDescription(""); showSuccessToast("Report submitted to marketplace moderators.");
          } catch (error) {
            setError((error as { response?: { data?: { error?: string } } }).response?.data?.error || "Unable to submit your report. Please try again.");
          } finally { setPending(false); }
        }}>
          <label className="block space-y-2 text-sm"><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-2 dark:border-white/10 dark:bg-dark-base">{["Copyright infringement", "Inappropriate content", "Misleading listing", "Spam", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block space-y-2 text-sm"><span>Details (at least 20 characters)</span><textarea required minLength={20} maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-2 dark:border-white/10 dark:bg-dark-base" /></label>
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={pending || description.trim().length < 20} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Submit report</button>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
