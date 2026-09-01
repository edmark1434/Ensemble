import { useState } from "react";
import { ExternalLink, Link2, Loader2, LockKeyhole } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast } from "@/components/utility/toast";
import type { AssetProjectLink } from "./assetTypes";

interface Props {
  assetId: string;
  links: AssetProjectLink[];
  canAccess: boolean;
  onRequirePurchase: () => void;
}

export default function AssetProjectLinks({ assetId, links, canAccess, onRequirePurchase }: Props) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  if (!links.length) return null;

  const openLink = async (link: AssetProjectLink) => {
    if (!canAccess) { onRequirePurchase(); return; }
    if (openingId) return;
    setOpeningId(link.media_asset_project_link_id);
    try {
      const response = await api.get<{ url: string }>(`/api/assets/${assetId}/project-links/${link.media_asset_project_link_id}/access`);
      const url = response.data.url;
      if (!url) throw new Error("Project link was not returned.");
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) opened.opener = null;
    } catch (error) {
      const message = typeof error === "object" && error && "response" in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      showErrorToast(message || "Unable to open this project link.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div><h2 className="text-sm font-bold">Project links</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{links.length} protected project {links.length === 1 ? "link" : "links"}</p></div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400">{canAccess ? <ExternalLink className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{canAccess ? "Available to open" : "Purchase required"}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => <button key={link.media_asset_project_link_id} type="button" onClick={() => void openLink(link)} disabled={Boolean(openingId)} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-60 dark:border-white/10 dark:bg-[#080a12] dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">{openingId === link.media_asset_project_link_id ? <Loader2 className="h-4 w-4 animate-spin" /> : canAccess ? <ExternalLink className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{link.label}</span><span className="mt-1 block truncate text-xs text-gray-500 dark:text-zinc-500">{link.provider}</span></span>
        </button>)}
      </div>
    </section>
  );
}

