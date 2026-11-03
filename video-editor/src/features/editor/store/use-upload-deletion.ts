import { create } from "zustand";

// Kept outside upload rows: refreshing the library must not unmount an open dialog.
export const useUploadDeletion = create<{
  upload: { id: string; fileName: string; url: string } | null;
  open: boolean;
}>(() => ({ upload: null, open: false }));
