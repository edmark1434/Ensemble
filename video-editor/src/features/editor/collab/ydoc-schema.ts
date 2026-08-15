import * as Y from "yjs";
import type {
  ITrack,
  ITrackItem,
  ITransition,
  ISize,
  State,
} from "@designcombo/types";
import type { IMarker } from "../store/use-store";

export interface CollabSchema {
  doc: Y.Doc;
  trackItems: Y.Map<Y.Map<any>>;
  trackItemIds: Y.Array<string>;
  transitions: Y.Map<Y.Map<any>>;
  transitionIds: Y.Array<string>;
  tracks: Y.Array<Y.Map<any>>;
  markers: Y.Map<Y.Map<any>>;
  meta: Y.Map<any>;
}

export function createCollabSchema(doc: Y.Doc): CollabSchema {
  return {
    doc,
    trackItems: doc.getMap("trackItems"),
    trackItemIds: doc.getArray("trackItemIds"),
    transitions: doc.getMap("transitions"),
    transitionIds: doc.getArray("transitionIds"),
    tracks: doc.getArray("tracks"),
    markers: doc.getMap("markers"),
    meta: doc.getMap("meta"),
  };
}

// video/audio items can carry live-upload handles (ReadableStream, Blob) that
// aren't JSON-serializable and have no business being persisted anyway — the
// durable reference is `src` once the S3 upload completes.
const NON_SERIALIZABLE_DETAIL_KEYS = ["stream", "blob"];

function sanitizeDetails(details: any): any {
  if (!details || typeof details !== "object") return details;
  const clean: any = {};
  for (const [key, value] of Object.entries(details)) {
    if (NON_SERIALIZABLE_DETAIL_KEYS.includes(key)) continue;
    clean[key] = value;
  }
  return clean;
}

const NON_SYNCED_ITEM_KEYS = ["isMain"];

// item-level granularity (see earlier decision): details stored as a plain
// value, not a nested Y.Map. Two users editing the same item's details at the
// same instant last-write-wins on the whole details blob.
export function itemToY(item: ITrackItem): Y.Map<any> {
  const y = new Y.Map<any>();
  for (const [key, value] of Object.entries(item)) {
    if (NON_SYNCED_ITEM_KEYS.includes(key)) continue;
    y.set(key, key === "details" ? sanitizeDetails(value) : value);
  }
  return y;
}

export function transitionToY(transition: ITransition): Y.Map<any> {
  const y = new Y.Map<any>();
  for (const [key, value] of Object.entries(transition)) {
    y.set(key, value);
  }
  return y;
}

export function markerToY(marker: IMarker): Y.Map<any> {
  const y = new Y.Map<any>();
  for (const [key, value] of Object.entries(marker)) {
    y.set(key, value);
  }
  return y;
}

// tracks need one nested Y.Array (`items`) since track membership changes
// concurrently; everything else on a track is a plain value.
export function trackToY(track: ITrack): Y.Map<any> {
  const y = new Y.Map<any>();
  y.set("id", track.id);
  y.set("type", track.type);
  const items = new Y.Array<string>();
  items.push(track.items ?? []);
  y.set("items", items);
  y.set("metadata", track.metadata ?? {});
  y.set("accepts", track.accepts ?? []);
  y.set("index", track.index);
  y.set("magnetic", track.magnetic ?? false);
  y.set("static", track.static ?? false);
  return y;
}

// Y.Map#toJSON() deep-converts nested Y types automatically, so this also
// correctly unwraps a track's nested `items` Y.Array back to a plain array.
function fromY<T>(y: Y.Map<any>): T {
  return y.toJSON() as T;
}

export interface DocSnapshot {
  trackItemsMap: Record<string, ITrackItem>;
  trackItemIds: string[];
  transitionsMap: Record<string, ITransition>;
  transitionIds: string[];
  tracks: ITrack[];
  markers: IMarker[];
  size?: ISize;
  fps?: number;
  duration?: number;
  background?: State["background"];
  projectName?: string;
}

export function readStateFromDoc(schema: CollabSchema): DocSnapshot {
  const trackItemsMap: Record<string, ITrackItem> = {};
  schema.trackItems.forEach((y, id) => {
    trackItemsMap[id] = fromY<ITrackItem>(y);
  });

  const transitionsMap: Record<string, ITransition> = {};
  schema.transitions.forEach((y, id) => {
    transitionsMap[id] = fromY<ITransition>(y);
  });

  const markers: IMarker[] = [];
  schema.markers.forEach((y) => {
    markers.push(fromY<IMarker>(y));
  });

  return {
    trackItemsMap,
    trackItemIds: schema.trackItemIds.toArray(),
    transitionsMap,
    transitionIds: schema.transitionIds.toArray(),
    tracks: schema.tracks.toArray().map((y) => fromY<ITrack>(y)),
    markers,
    size: schema.meta.get("size"),
    fps: schema.meta.get("fps"),
    duration: schema.meta.get("duration"),
    background: schema.meta.get("background"),
    projectName: schema.meta.get("projectName"),
  };
}

// Wipes and repopulates the doc from a plain snapshot — used on initial load
// (brand new project, or hydrating from a Postgres-persisted Y update).
// Caller decides the transact origin; use-collab-doc.ts should call this
// with an origin that mirror-in treats as "already applied" (see localOrigin
// note in mirror-in.ts) so it doesn't get redundantly echoed back.
export function hydrateDocFromState(
  schema: CollabSchema,
  state: Pick<
    State,
    | "trackItemsMap"
    | "trackItemIds"
    | "transitionsMap"
    | "transitionIds"
    | "tracks"
    | "size"
    | "fps"
    | "duration"
    | "background"
  >,
  markers: IMarker[],
  projectName: string,
  origin: unknown,
) {
  schema.doc.transact(() => {
    schema.trackItems.clear();
    for (const [id, item] of Object.entries(state.trackItemsMap)) {
      schema.trackItems.set(id, itemToY(item));
    }
    schema.trackItemIds.delete(0, schema.trackItemIds.length);
    schema.trackItemIds.push([...state.trackItemIds]);

    schema.transitions.clear();
    for (const [id, t] of Object.entries(state.transitionsMap)) {
      schema.transitions.set(id, transitionToY(t));
    }
    schema.transitionIds.delete(0, schema.transitionIds.length);
    schema.transitionIds.push([...state.transitionIds]);

    schema.tracks.delete(0, schema.tracks.length);
    schema.tracks.push(state.tracks.map(trackToY));

    schema.markers.clear();
    for (const m of markers) {
      schema.markers.set(m.id, markerToY(m));
    }

    schema.meta.set("size", state.size);
    schema.meta.set("fps", state.fps);
    schema.meta.set("duration", state.duration);
    schema.meta.set("background", state.background);
    schema.meta.set("projectName", projectName);
  }, origin);
}