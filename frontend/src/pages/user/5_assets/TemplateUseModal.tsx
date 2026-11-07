import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import type { AssetPurchaseResponse, AssetRecord } from "./assetTypes";

interface Props {
  open: boolean;
  asset: AssetRecord;
  onClose: () => void;
  onCreated: (result: AssetPurchaseResponse & { projectId: string }) => void | Promise<void>;
}
function message(error: unknown) {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    || "Unable to create your project. Please try again.";
}
export default function TemplateUseModal(props: Props) {
  return props.open ? <TemplateUseConfirmation key={props.asset.market_asset_id} {...props} /> : null;
}

function TemplateUseConfirmation({ asset, onClose, onCreated }: Props) {
  // Retained across retries; the server uses it only to create or recover this new project.
  const [projectId] = useState(() => crypto.randomUUID());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !creating) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating, onClose]);

  const confirm = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post<AssetPurchaseResponse & { projectId: string }>(`/api/assets/${asset.market_asset_id}/template-use`, {
        projectId, expectedPrice: asset.price_credits, expectedCharge: 0,
      });
      await onCreated(data);
    } catch (err) {
      setError(message(err));
    } finally { setCreating(false); }
  };
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="template-use-title" aria-describedby="template-use-description">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#10131e]">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
          <div><h2 id="template-use-title" className="text-lg font-bold">Use in a project</h2><p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{asset.name}</p></div>
          <button type="button" onClick={onClose} disabled={creating} aria-label="Close template confirmation" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/5"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div id="template-use-description" className="space-y-2 text-sm leading-6 text-gray-600 dark:text-zinc-300">
            <p>{asset.is_owner
              ? "This will create a new, editable project from your template."
              : "This will create a new, editable project and use one of your purchased template licenses. That license will be permanently assigned to the new project."}</p>
            <p>To use this template in an existing project, open that project and you will find it in there.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} disabled={creating} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-white/10">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{creating && <Loader2 className="h-4 w-4 animate-spin" />}{creating ? "Creating project…" : "Create new project"}</button>
        </div>
      </div>
    </div>
  );
}
