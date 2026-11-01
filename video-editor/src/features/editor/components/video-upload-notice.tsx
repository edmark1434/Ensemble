"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import useStore from "../store/use-store";

export function VideoUploadNotice() {
  const userId = useStore(state => state.userId);
  const { data: policy } = useQuery({
    queryKey: ["video-upload-policy", userId], enabled: !!userId,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/uploads/policy", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load upload limits.");
      return response.json() as Promise<{ plan: string; label: string; showNotice: boolean; upgradeUrl: string; nextPlan: string | null; nextLabel: string }>;
    },
  });
  if (!policy?.showNotice) return null;
  return <div className="rounded-md border border-border bg-muted/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold"><Clapperboard className="size-5 text-primary" />Video uploads up to {policy.label}</p>
      <Button variant="outline" className="gap-2" asChild><a href={policy.upgradeUrl} target="_blank" rel="noopener noreferrer">Upgrade <ArrowUpRight className="size-4" /></a></Button>
    </div>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
      Your {policy.plan} plan automatically downscales higher-resolution videos to {policy.label}. Smaller videos keep their resolution.{" "}
      {policy.nextPlan && <strong className="font-semibold text-foreground">Upgrade to {policy.nextPlan} to upload {policy.nextLabel} videos.</strong>}
    </p>
  </div>;
}
