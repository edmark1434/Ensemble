// src/features/editor/types/ensemble-scene.ts
import type { ITrack, ITrackItem, ITrackItemBase } from "@designcombo/types";

export interface ISceneDetails {
  blockId: string;
  name?: string;
  thumbnail?: string;
  hidden?: boolean;
  locked?: boolean;
  volume?: number;
}

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

// @designcombo/types' ItemType/ITrackType/ITrackItem are closed string-
// literal unions with no "scene" member. They're `type` aliases, not
// `interface`s, so declaration merging can't widen them the way it could
// for an interface. The library treats `type`/`details` as opaque at
// runtime (stateManager, Yjs schema, canvas registerItems all just read
// strings), so this is a compile-time-only gap — these two casts are the
// only place we paper over it.
export function makeSceneTrackItem(item: ISceneTrackItem): ITrackItem {
  return item as unknown as ITrackItem;
}

export function makeSceneTrack(
  track: Omit<ITrack, "type"> & { type: typeof SCENE_TYPE }
): ITrack {
  return track as unknown as ITrack;
}