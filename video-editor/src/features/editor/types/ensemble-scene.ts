// features/editor/types/ensemble-scene.ts

import type { ITrack, ITrackItem, ITrackItemBase, ITransition, ISize, State } from "@designcombo/types";

export interface SceneRenderContent {
  trackItemsMap: Record<string, ITrackItem>;
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  size?: ISize;
  background?: State["background"];
}

export interface ISceneDetails {
  blockId: string;
  name?: string;
  thumbnail?: string;
  hidden?: boolean;
  locked?: boolean;
  volume?: number;
  // Live-pushed by useSceneContentBroadcast on every relevant edit while
  // this scene's block is open (see scene-content-sync.ts's
  // applySceneContentToDoc). Delivered to every viewer through the same
  // project-doc live sync that already delivers display/duration — never
  // fetched separately.
  content?: SceneRenderContent;
}

// A brand-new empty scene has no content yet, so this is what it displays
// at until something's added. Not a floor — if the block's actual content
// is shorter than this, the scene reflects that real (smaller) duration.
export const DEFAULT_SCENE_DURATION_MS = 5000;

// Our real shape. Not assignable to ITrackItem — that's expected, see
// note below. Everywhere in our own code, work with this type directly;
// only cross into the library's types via the two functions below.
export interface ISceneTrackItem extends Omit<ITrackItemBase, "type" | "details"> {
  type: "scene";
  details: ISceneDetails;
}

export const SCENE_TYPE = "scene";

export function isSceneItem(type: string | undefined | null): boolean {
  return type === SCENE_TYPE;
}

export function makeSceneTrackItem(item: ISceneTrackItem): ITrackItem {
  return item as unknown as ITrackItem;
}

export function makeSceneTrack(
  track: Omit<ITrack, "type"> & { type: typeof SCENE_TYPE }
): ITrack {
  return track as unknown as ITrack;
}