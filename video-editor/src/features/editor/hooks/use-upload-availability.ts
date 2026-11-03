import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import useStore from "../store/use-store";
import { mediaSources } from "../utils/media-sources";
import { useMissingMedia } from "../store/use-missing-media";

export function useUploadAvailability() {
  const { projectId, trackItemIds, trackItemsMap } = useStore();
  const key = JSON.stringify([...new Set(mediaSources({ trackItemIds, trackItemsMap }))].sort());
  const { data } = useQuery({
    queryKey: ["upload-availability", projectId, key],
    enabled: !!projectId,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const sources: string[] = JSON.parse(key);
      const missing: string[] = [];
      for (let i = 0; i < sources.length; i += 100) {
        const response = await fetch("/api/media-assets/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({ projectId, sources: sources.slice(i, i + 100) }),
        });
        if (!response.ok) throw new Error("Unable to check media availability.");
        missing.push(...(await response.json()).missing);
      }
      return missing;
    },
  });
  useEffect(() => {
    if (data) useMissingMedia.setState({ projectId, missing: new Set(data) });
  }, [data, projectId]);
}
