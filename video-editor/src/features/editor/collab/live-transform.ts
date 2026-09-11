import type * as awarenessProtocol from "y-protocols/awareness";

export interface LiveTransformPatch {
  left?: number;
  top?: number;
  transform?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  from?: number; // ms
  to?: number;   // ms
}

export type LiveTransformState = Record<string /* itemId */, LiveTransformPatch>;

// Per-client bundle: the raw gesture patches plus whatever identity info
// awareness carries for that client, so consumers don't have to go back to
// the Awareness object to label a presence border.
export interface LiveTransformClientState {
  patches: LiveTransformState;
  userId?: string;
  userName?: string;
}

export interface SelectionClientState {
  itemIds: string[];
  userId?: string;
  userName?: string;
}

const FIELD = "liveTransform";
const TIMESTAMP_FIELD = "liveTransformAt";
const MIN_INTERVAL_MS = 50; // ~20fps is plenty for a remote preview; final
// position always lands via the real Y.Doc write on *End
const STALE_MS = 2000; // if a client stops refreshing this long, treat its
// gesture as abandoned rather than trusting it forever

let lastSent = 0;

function getUserId(state: any): string | undefined {
  return state?.user?.id;
}

function getUserName(state: any): string | undefined {
  return state?.user?.name;
}

export function broadcastLiveTransform(
  awareness: awarenessProtocol.Awareness,
  patches: LiveTransformState,
) {
  const now = performance.now();
  if (now - lastSent < MIN_INTERVAL_MS) return;
  lastSent = now;
  awareness.setLocalStateField(FIELD, patches);
  awareness.setLocalStateField(TIMESTAMP_FIELD, Date.now());
}

export function clearLiveTransform(awareness: awarenessProtocol.Awareness) {
  awareness.setLocalStateField(FIELD, null);
  awareness.setLocalStateField(TIMESTAMP_FIELD, null);
}

// Fires with a merged, per-client map any time remote awareness state
// changes. Skips the local client's own entry.
export function subscribeToRemoteLiveTransforms(
  awareness: awarenessProtocol.Awareness,
  onChange: (statesByClient: Map<number, LiveTransformClientState>) => void,
): () => void {
  const handleChange = () => {
    const now = Date.now();
    const result = new Map<number, LiveTransformClientState>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const patches = state?.[FIELD] as LiveTransformState | null | undefined;
      if (!patches) return;
      const updatedAt = state?.[TIMESTAMP_FIELD] as number | undefined;
      // A live gesture refreshes this timestamp every MIN_INTERVAL_MS. If
      // it's gone stale, that client's *End handler never fired and this
      // field was left dangling — don't trust it forever.
      if (updatedAt === undefined || now - updatedAt > STALE_MS) return;
      result.set(clientId, { patches, userId: getUserId(state), userName: getUserName(state) });
    });
    onChange(result);
  };
  awareness.on("change", handleChange);
  handleChange();
  // "change" only fires when some client's state actually updates. A
  // client stuck mid-gesture won't emit any more changes, so nothing
  // would re-check staleness on its own — poll for it too.
  const interval = setInterval(handleChange, 1000);
  return () => {
    awareness.off("change", handleChange);
    clearInterval(interval);
  };
}

const PRESENCE_COLOR_PALETTE = [
  "#6366F1",
  "#EC4899",
  // "#F59E0B", not legible
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
];

function hashIdentity(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Colors by person, not by connection — the same user shows up under a
// different Yjs clientId depending on which Y.Doc is reporting them (their
// normal connection vs. the synthetic scene-content-broadcast one used
// while inside a scene). Falls back to clientId only if a state has no
// userId at all.
export function getColorForIdentity(userId: string | undefined, clientId: number): string {
  const key = userId ? hashIdentity(userId) : Math.abs(clientId);
  return PRESENCE_COLOR_PALETTE[key % PRESENCE_COLOR_PALETTE.length];
}

export interface RemoteActiveEditor {
  clientId: number;
  color: string;
  userId?: string;
  userName?: string;
}

// An item id present in some other client's liveTransform patches means
// that client is actively gesturing on it right now — this derives the
// per-item "who's touching this" map straight from presence, no separate
// signal to keep in sync.
export function getRemoteActiveEditors(
  statesByClient: Map<number, LiveTransformClientState>,
): Map<string, RemoteActiveEditor> {
  const editors = new Map<string, RemoteActiveEditor>();
  statesByClient.forEach(({ patches, userId, userName }, clientId) => {
    Object.keys(patches).forEach((itemId) => {
      if (!editors.has(itemId)) {
        editors.set(itemId, { clientId, color: getColorForIdentity(userId, clientId), userId, userName });
      }
    });
  });
  return editors;
}

const SELECTION_FIELD = "selection";

export function broadcastSelection(
  awareness: awarenessProtocol.Awareness,
  itemIds: string[],
) {
  awareness.setLocalStateField(SELECTION_FIELD, itemIds.length > 0 ? itemIds : null);
}

export function clearSelection(awareness: awarenessProtocol.Awareness) {
  awareness.setLocalStateField(SELECTION_FIELD, null);
}

// Fires with a merged, per-client map of which item ids each remote client
// currently has selected (not necessarily gesturing on). No staleness check
// here — unlike liveTransform this isn't a per-frame signal with a *End
// handler that might not fire; it's a discrete "current selection" value,
// and awareness's own disconnect timeout clears it when a client drops.
export function subscribeToRemoteSelections(
  awareness: awarenessProtocol.Awareness,
  onChange: (statesByClient: Map<number, SelectionClientState>) => void,
): () => void {
  const handleChange = () => {
    const result = new Map<number, SelectionClientState>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const ids = state?.[SELECTION_FIELD] as string[] | null | undefined;
      if (!ids || ids.length === 0) return;
      result.set(clientId, { itemIds: ids, userId: getUserId(state), userName: getUserName(state) });
    });
    onChange(result);
  };
  awareness.on("change", handleChange);
  handleChange();
  return () => {
    awareness.off("change", handleChange);
  };
}

// Same derivation as getRemoteActiveEditors, sourced from plain selection
// presence rather than live gesture patches.
export function getRemoteSelectionOwners(
  statesByClient: Map<number, SelectionClientState>,
): Map<string, RemoteActiveEditor> {
  const owners = new Map<string, RemoteActiveEditor>();
  statesByClient.forEach(({ itemIds, userId, userName }, clientId) => {
    itemIds.forEach((itemId) => {
      if (!owners.has(itemId)) {
        owners.set(itemId, { clientId, color: getColorForIdentity(userId, clientId), userId, userName });
      }
    });
  });
  return owners;
}

const WORKING_INSIDE_FIELD = "workingInsideSceneItemId";

export interface WorkingInsideState {
  sceneItemId: string;
  userId?: string;
  userName?: string;
}

// Set once on scene entry by the synthetic project-room connection that
// useSceneContentBroadcast opens while a user is inside a block/scene, and
// cleared once on exit. Not a per-frame signal like liveTransform, so no
// staleness check — a disconnect clears it via awareness's own removal on
// teardown, same as selection.
export function broadcastWorkingInsideScene(
  awareness: awarenessProtocol.Awareness,
  sceneItemId: string,
  userId?: string,
  userName?: string,
) {
  awareness.setLocalStateField(WORKING_INSIDE_FIELD, { sceneItemId, userId, userName });
}

export function clearWorkingInsideScene(awareness: awarenessProtocol.Awareness) {
  awareness.setLocalStateField(WORKING_INSIDE_FIELD, null);
}

// Fires with a per-scene-item map of which remote client (if any) currently
// has that item's block open for editing.
export function subscribeToRemoteWorkingInside(
  awareness: awarenessProtocol.Awareness,
  onChange: (byItemId: Map<string, RemoteActiveEditor>) => void,
): () => void {
  const handleChange = () => {
    const result = new Map<string, RemoteActiveEditor>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const working = state?.[WORKING_INSIDE_FIELD] as WorkingInsideState | null | undefined;
      if (!working?.sceneItemId) return;
      result.set(working.sceneItemId, {
        clientId,
        color: getColorForIdentity(working.userId, clientId),
        userId: working.userId,
        userName: working.userName,
      });
    });
    onChange(result);
  };
  awareness.on("change", handleChange);
  handleChange();
  return () => awareness.off("change", handleChange);
}