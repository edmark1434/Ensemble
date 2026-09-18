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
  // 0-100, same scale as every other item's own `volume`. Applied as a
  // multiplier over each inner item's own volume (see SceneContentLayer in
  // player/items/ensemble-scene.tsx) — not a standalone level. Undefined
  // behaves as 100 (no attenuation), matching every other item type's
  // `volume ?? 100` convention.
  volume?: number;
  content?: SceneRenderContent;

  // Outer track-item transform — independent of the block's own canvas
  // size (that lives on the block's project state, not here). Mirrors
  // ICommonDetails, which @designcombo/types doesn't export.
  width?: number;
  height?: number;
  top?: number | string;
  left?: number | string;
  transform?: string;
  rotate?: string;
  opacity?: number;

  // Appearance. opacity (above) rides the shared container-style path the
  // same as every other item type; these three do NOT — Scene applies
  // them itself on its own clip wrapper (see player/items/ensemble-scene.tsx),
  // because there's no media element underneath to hang a filter on.
  borderRadius?: number;
  blur?: number;
  brightness?: number;
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
  // Borrowed verbatim from ITrackItem so the animation panel and
  // getAnimations() see the same shape they do for image/video/text.
  // If ITrackItemBase already declares this, delete the line — it's
  // inherited and the redeclaration will fight the base type.
  animations?: ITrackItem["animations"];
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