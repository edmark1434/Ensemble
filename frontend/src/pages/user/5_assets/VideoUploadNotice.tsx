import { useEffect, useState } from "react";
import { ArrowUpRight, Clapperboard } from "lucide-react";
import api from "@/lib/axios";

type VideoUploadPolicy = {
  plan: string;
  label: string;
  showNotice: boolean;
  nextPlan: string | null;
  nextLabel: string;
};

let cachedPolicy: VideoUploadPolicy | null = null;

export default function VideoUploadNotice() {
  const [policy, setPolicy] = useState<VideoUploadPolicy | null>(cachedPolicy);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api.get<VideoUploadPolicy>("/api/files/video-upload-policy")
        .then(({ data }) => {
          cachedPolicy = data;
          if (active) setPolicy(data);
        })
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, []);
  if (!policy?.showNotice) return null;
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-400/20 dark:bg-blue-500/5">
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500"><Clapperboard className="h-5 w-5" /></span>Video uploads up to {policy.label}</p>
      <a href="/credits-subscriptions" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-400/20 dark:bg-white/5 dark:text-blue-300 dark:hover:bg-white/10">Upgrade <ArrowUpRight className="h-4 w-4" /></a>
    </div>
    <p className="mt-0 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
      Your {policy.plan} plan automatically downscales higher-resolution videos to {policy.label}. Smaller videos keep their resolution.{" "}
      {policy.nextPlan && <strong className="font-semibold text-gray-900 dark:text-zinc-200">Upgrade to {policy.nextPlan} to upload {policy.nextLabel} videos.</strong>}
    </p>
  </div>;
}
