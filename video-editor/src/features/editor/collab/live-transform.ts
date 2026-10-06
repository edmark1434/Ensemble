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

// Fires with a per-scene-item list of every remote client currently inside
// that item's block editor — plural, since more than one person can be in
// the same scene at once and the presence label needs an accurate count.
export function subscribeToRemoteWorkingInside(
  awareness: awarenessProtocol.Awareness,
  onChange: (byItemId: Map<string, RemoteActiveEditor[]>) => void,
): () => void {
  const handleChange = () => {
    const result = new Map<string, RemoteActiveEditor[]>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const working = state?.[WORKING_INSIDE_FIELD] as WorkingInsideState | null | undefined;
      if (!working?.sceneItemId) return;
      const editor: RemoteActiveEditor = {
        clientId,
        color: getColorForIdentity(working.userId, clientId),
        userId: working.userId,
        userName: working.userName,
      };
      const list = result.get(working.sceneItemId);
      if (list) {
        // One person with the scene open in two tabs/windows is still one
        // person: awareness holds one state per connection, so count by
        // userId. (A state with no userId can't be matched; it stays its own
        // entry.)
        if (working.userId && list.some((e) => e.userId === working.userId)) return;
        list.push(editor);
      } else {
        result.set(working.sceneItemId, [editor]);
      }
    });
    onChange(result);
  };
  awareness.on("change", handleChange);
  handleChange();
  return () => awareness.off("change", handleChange);
}
// ---------------------------------------------------------------------------
// Who is in this room right now (navbar avatar group)
// ---------------------------------------------------------------------------

export interface PresentUser {
  userId: string;
  name: string;
  // Role in THIS room: the project role in a project doc, the effective scene
  // role in a block doc. Published by the client itself (see
  // broadcastUserRole); absent for people we only know from "working inside".
  role?: string;
  color: string;
  isSelf?: boolean;
}

// Adds the room-specific role to the identity attachWsProvider already
// announces ({ id, name }). Does nothing until that identity exists.
export function broadcastUserRole(
  awareness: awarenessProtocol.Awareness,
  role: string | null | undefined,
) {
  const current = awareness.getLocalState()?.user;
  if (!current) return;
  const next = role ?? undefined;
  if (current.role === next) return;
  awareness.setLocalStateField("user", { ...current, role: next });
}

// Fires with the distinct USERS (not connections) present in this awareness
// room, excluding the local user. Awareness holds one state per connection, so
// the same person in two tabs, or on both their normal connection and the
// synthetic "working inside" one, collapses into a single entry keyed by
// userId.
//
// includeWorkingInside: a project room also hears from people who are inside
// one of its scenes (they're connected to the block room for editing, plus
// this synthetic project connection that carries WORKING_INSIDE_FIELD), so
// they still count as being in the project. A block room never has that
// field, so this has no effect there.
export function subscribeToPresentUsers(
  awareness: awarenessProtocol.Awareness,
  onChange: (users: PresentUser[]) => void,
  options: { selfUserId?: string; includeWorkingInside?: boolean; includeSelf?: boolean } = {},
): () => void {
  const { selfUserId, includeWorkingInside = true, includeSelf = false } = options;
  let lastKey: string | null = null;

  const handleChange = () => {
    const byUser = new Map<string, { name?: string; role?: string; color: string }>();

    const add = (userId: string | undefined, name: string | undefined, role: string | undefined, clientId: number) => {
      if (!userId) return;
      if (userId === selfUserId && !includeSelf) return;
      const existing = byUser.get(userId);
      if (!existing) {
        byUser.set(userId, { name, role, color: getColorForIdentity(userId, clientId) });
        return;
      }
      if (!existing.name && name) existing.name = name;
      if (!existing.role && role) existing.role = role;
    };

    awareness.getStates().forEach((state, clientId) => {
      const isLocal = clientId === awareness.clientID;
      if (isLocal && !includeSelf) return;
      // The local state can be missing user.id for a moment (before
      // attachWsProvider announces), so fall back to selfUserId for it.
      add(state?.user?.id ?? (isLocal ? selfUserId : undefined), state?.user?.name, state?.user?.role, clientId);
      if (includeWorkingInside) {
        const working = state?.[WORKING_INSIDE_FIELD] as WorkingInsideState | null | undefined;
        if (working?.sceneItemId) add(working.userId, working.userName, undefined, clientId);
      }
    });

    const users: PresentUser[] = [...byUser.entries()]
      .map(([userId, u]) => ({
        userId,
        name: u.name || "Someone",
        role: u.role,
        color: u.color,
        isSelf: !!selfUserId && userId === selfUserId,
      }))
      // You first, then a stable order so avatars don't reshuffle every time awareness ticks.
      .sort(
        (a, b) =>
          Number(!!b.isSelf) - Number(!!a.isSelf) ||
          a.name.localeCompare(b.name) ||
          a.userId.localeCompare(b.userId),
      );

    // "change" also fires for every liveTransform frame during someone's drag;
    // only wake React when the visible list actually differs.
    const key = users.map((u) => `${u.userId}|${u.name}|${u.role ?? ""}|${u.isSelf ? 1 : 0}`).join("\n");
    if (key === lastKey) return;
    lastKey = key;
    onChange(users);
  };

  awareness.on("change", handleChange);
  handleChange();
  return () => awareness.off("change", handleChange);
}