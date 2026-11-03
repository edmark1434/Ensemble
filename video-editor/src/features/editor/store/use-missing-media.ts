import { create } from "zustand";
export const useMissingMedia = create<{ projectId: string; missing: Set<string> }>(() => ({
  projectId: "",
  missing: new Set(),
}));
