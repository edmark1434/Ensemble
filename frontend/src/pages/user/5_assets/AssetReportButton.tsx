import { useState } from "react";
import { Flag } from "lucide-react";
import api from "@/lib/axios";
import ReportDialog from "@/components/report/ReportDialog";
import type { AssetRecord } from "./assetTypes";

const REPORT_REASONS = ["Copyright infringement", "Inappropriate content", "Misleading listing", "Spam", "Other"];

export default function AssetReportButton({ asset, isGuest, onGuest }: { asset: AssetRecord; isGuest: boolean; onGuest: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => isGuest ? onGuest() : setOpen(true)} aria-label="Report asset" title="Report asset" className="rounded-xl border border-gray-300 p-3 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"><Flag className="h-4 w-4" /></button>
    <ReportDialog
      isOpen={open}
      title="Report asset"
      subjectName={asset.name}
      reasons={REPORT_REASONS}
      subjectWord="asset"
      reviewer="marketplace moderators"
      onClose={() => setOpen(false)}
      onSubmit={async (reason, description) => {
        await api.post(`/api/assets/${asset.market_asset_id}/report`, { type: reason, description });
      }}
    />
  </>;
}
