import { create } from "zustand";
import useStore from "../store/use-store";
import { useEditorPlan } from "./use-editor-plan";

// Session preference only: never synced to collaborators or saved in a project.
const useWatermarkPreference = create<{
  includedByUser: Record<string, boolean>;
  setIncluded: (userId: string, included: boolean) => void;
}>((set) => ({
  includedByUser: {},
  setIncluded: (userId, included) => set(state => ({
    includedByUser: { ...state.includedByUser, [userId]: included },
  })),
}));

export function useEnsembleWatermark() {
  const userId = useStore(state => state.userId);
  const { data: policy } = useEditorPlan();
  const included = useWatermarkPreference(state => userId ? state.includedByUser[userId] : undefined);
  const setIncluded = useWatermarkPreference(state => state.setIncluded);
  const canRemove = policy?.canRemoveEnsembleWatermark === true;
  return {
    canRemove,
    showWatermark: !canRemove || included === true,
    setShowWatermark: (show: boolean) => {
      if (userId && canRemove) setIncluded(userId, show);
    },
  };
}
