import { create } from "zustand";

import type { ISceneTrackItem } from "../types/ensemble-scene";
import type { CommentAttachment, CommentThread } from "../types/comments";

export const tourBlockId = "walkthrough-scene";
export const tourThreadId = "walkthrough-comment";
export async function uploadTourAttachment(file: File): Promise<CommentAttachment> {
  const attachment = { id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name, mimeType: file.type };
  useTourDemo.setState(s => ({ attachments: [...s.attachments, attachment] }));
  return attachment;
}
type TourAction = "enter-scene" | "leave-scene" | "scene" | "comment" | "comments-button" | "shortcuts" | "export" | "share" | "close";
export type TourSurface = "shortcuts" | "export" | "share";

export const useTourDemo = create<{
  scene: ISceneTrackItem | null;
  attachments: CommentAttachment[];
  access: boolean;
  insideScene: boolean;
  comment: CommentThread | null;
  commentTarget: string | null;
  exportIntro?: boolean;
  surface?: TourSurface;
  act?: (action: TourAction) => boolean;
}>(() => ({ scene: null, insideScene: false, attachments: [], access: false, comment: null, commentTarget: null }));

export const tourAction = (action: TourAction) => useTourDemo.getState().act?.(action) ?? false;
