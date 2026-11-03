import { useQuery } from "@tanstack/react-query";
import useStore from "../store/use-store";

export function useEditorPlan() {
  const userId = useStore(state => state.userId);
  return useQuery({
    queryKey: ["video-upload-policy", userId],
    enabled: !!userId,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/uploads/policy", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load your plan.");
      return response.json() as Promise<{
        plan: "Free" | "Premium" | "Business";
        maxHeight: number;
        upgradeUrl: string;
      }>;
    },
  });
}
