// video-editor/websocket/collab.ts

import type { IncomingMessage } from "http";
import { WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { loadLatestProjectState, compactProject } from "@/lib/collab/persistence-store";
import { withProjectSnapshotLock } from "@/lib/collab/snapshot-lock";
import {CollabTarget} from "@/features/editor/collab/collab-target";
import {compactBlock, loadLatestBlockState, withBlockSnapshotLock} from "@/lib/collab/block-persistence-store";
import { getEffectiveBlockRole } from "@/lib/db/block-members";
import { canEditWithRole } from "@/features/editor/types/editor-role";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_SYNC_DONE = 2;
const HYDRATION_ORIGIN = "hydration";

// Independent of any client's own flush cadence — this is the backstop
// that persists the room's canonical merged state on a fixed schedule,
// so durability doesn't depend on whichever client authored a given edit
// staying connected long enough to successfully flush it themselves.
const SNAPSHOT_INTERVAL_MS = 60_000;

// A project<->scene transition on a single client closes its one WS
// connection and opens a new one within the same tick or two (see
// use-scene-duration-broadcast.ts / use-collab-doc.ts). Destroying the
// room the instant clients.size hits 0 forces that reconnect to rebuild
// from Postgres, racing the async snapshot-on-disconnect flush below —
// losing that race is why scene edits were vanishing for a single
// client. Give a genuinely-empty room a short grace period before real
// teardown so a same-session reconnect resumes the still-live doc
// instead, letting Yjs's own sync handshake resolve it, not a REST race.
const ROOM_EMPTY_GRACE_MS = 5_000;

// Access can change while a socket stays open (project role changed, scene
// general access changed, member removed). Every connection re-resolves its
// access on this interval, so write permission follows and a connection that
// lost access entirely gets closed.
const ACCESS_RECHECK_MS = 15_000;

interface ClientInfo {
  controlledAwarenessIds: Set<number>;
  canWrite: boolean;
}

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Map<WebSocket, ClientInfo>;
  dirty: boolean;
  snapshotInterval: ReturnType<typeof setInterval> | null;
  emptyTimeout: ReturnType<typeof setTimeout> | null;
  snapshotIfDirty: () => Promise<void>;
}

const rooms = new Map<string, Promise<Room>>();

function broadcast(room: Room, message: Uint8Array, origin: WebSocket | null) {
  for (const client of room.clients.keys()) {
    if (client !== origin && client.readyState === WebSocket.OPEN) client.send(message);
  }
}

function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

function roomKey(target: CollabTarget): string {
  return `${target.kind}:${target.id}`;
}

async function getOrCreateRoom(target: CollabTarget): Promise<Room> {
  const key = roomKey(target);
  const existing = rooms.get(key);
  if (existing) {
    const room = await existing;
    if (room.emptyTimeout) {
      clearTimeout(room.emptyTimeout);
      room.emptyTimeout = null;
      if (!room.snapshotInterval) {
        room.snapshotInterval = setInterval(room.snapshotIfDirty, SNAPSHOT_INTERVAL_MS);
      }
    }
    return existing;
  }

  const roomPromise = (async () => {
    const doc = new Y.Doc({ gc: false });
    const awareness = new awarenessProtocol.Awareness(doc);
    const room: Room = {
      doc, awareness, clients: new Map(), dirty: false,
      snapshotInterval: null, emptyTimeout: null,
      snapshotIfDirty: async () => {},
    };

    const { snapshot, updates } =
      target.kind === "project"
        ? await loadLatestProjectState(target.id)
        : await loadLatestBlockState(target.id);

    if (snapshot || updates.length > 0) {
      doc.transact(() => {
        if (snapshot) Y.applyUpdate(doc, snapshot, HYDRATION_ORIGIN);
        for (const update of updates) Y.applyUpdate(doc, update, HYDRATION_ORIGIN);
      }, HYDRATION_ORIGIN);
    }

    doc.on("update", (update: Uint8Array, origin: WebSocket | null) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      broadcast(room, encoding.toUint8Array(encoder), origin);
      if ((origin as unknown) !== HYDRATION_ORIGIN) room.dirty = true;
    });

    awareness.on("update", (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: WebSocket | null,
    ) => {
      if (origin && room.clients.has(origin)) {
        const info = room.clients.get(origin)!;
        added.forEach((id) => info.controlledAwarenessIds.add(id));
        removed.forEach((id) => info.controlledAwarenessIds.delete(id));
      }
      const changed = [...added, ...updated, ...removed];
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      broadcast(room, encoding.toUint8Array(encoder), origin);
    });

    room.snapshotIfDirty = async () => {
      if (!room.dirty) return;
      room.dirty = false;
      try {
        const roomState = Y.encodeStateAsUpdate(doc);
        if (target.kind === "project") {
          await withProjectSnapshotLock(target.id, () => compactProject(target.id, roomState));
        } else {
          await withBlockSnapshotLock(target.id, () => compactBlock(target.id, Buffer.from(roomState)));
        }
      } catch (err) {
        console.error(`collab: periodic snapshot failed for ${key}`, err);
        room.dirty = true;
      }
    };

    room.snapshotInterval = setInterval(room.snapshotIfDirty, SNAPSHOT_INTERVAL_MS);
    return room;
  })();

  rooms.set(key, roomPromise);
  roomPromise.catch(() => rooms.delete(key));
  return roomPromise;
}

// What this user may do in a room right now. allowed=false means no access at
// all: not in the project, or a scene they hold no role in (e.g. Restricted).
async function resolveRoomAccess(
  target: CollabTarget,
  projectId: string,
  userId: string,
): Promise<{ allowed: boolean; canWrite: boolean }> {
  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();

  if (!membership) return { allowed: false, canWrite: false };

  if (target.kind === "project") {
    return { allowed: true, canWrite: canEditWithRole(membership.role) };
  }

  const blockRole = await getEffectiveBlockRole(target.id, projectId, userId);
  return { allowed: blockRole !== null, canWrite: canEditWithRole(blockRole) };
}

export async function handleCollabConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? "", "http://collab");
  const projectId = url.searchParams.get("projectId");
  const blockId = url.searchParams.get("blockId");

  if (!projectId && !blockId) {
    ws.close(4000, "projectId or blockId is required");
    return;
  }

  // ws-provider.ts sends its initial syncStep1 the instant the socket's
  // onopen fires, which can (and does, especially under concurrent
  // connections) beat the auth/room-loading work below. `ws` emits
  // 'message' synchronously and does not buffer for a listener attached
  // later, so without this, that first request — and the room's real
  // content, which only it triggers — gets silently dropped, leaving the
  // client's doc permanently missing baseline state.
  const pendingMessages: Buffer[] = [];
  let setupDone = false;
  let closedDuringSetup = false;
  const bufferDuringSetup = (data: Buffer) => pendingMessages.push(data);
  const markClosedDuringSetup = () => {
    if (!setupDone) closedDuringSetup = true;
  };
  ws.on("message", bufferDuringSetup);
  ws.on("close", markClosedDuringSetup);

  const sessionCookie = getCookie(req.headers.cookie, EDITOR_SESSION_COOKIE);
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    ws.off("message", bufferDuringSetup);
    ws.off("close", markClosedDuringSetup);
    ws.close(4001, "unauthorized");
    return;
  }

  let target: CollabTarget;
  let membershipProjectId: string;

  if (projectId) {
    target = { kind: "project", id: projectId };
    membershipProjectId = projectId;
  } else {
    const block = await db
      .selectFrom("blocks")
      .where("block_id", "=", blockId!)
      .select(["project_id"])
      .executeTakeFirst();

    if (!block) {
      ws.off("message", bufferDuringSetup);
      ws.off("close", markClosedDuringSetup);
      ws.close(4004, "block not found");
      return;
    }
    target = { kind: "block", id: blockId! };
    membershipProjectId = block.project_id;
  }

  // Project doc: the project role decides. Scene doc: the effective scene role
  // (project role capped by the scene's general access, raised by a
  // block_members row). No write access = read-only: the client still syncs
  // down, its own updates are just dropped below. No role at all = refused.
  const access = await resolveRoomAccess(target, membershipProjectId, decoded.userId);

  if (!access.allowed) {
    ws.off("message", bufferDuringSetup);
    ws.off("close", markClosedDuringSetup);
    ws.close(4003, "forbidden");
    return;
  }

  const canWrite = access.canWrite;

  const room = await getOrCreateRoom(target);

  ws.off("message", bufferDuringSetup);
  ws.off("close", markClosedDuringSetup);
  setupDone = true;

  if (closedDuringSetup || ws.readyState !== WebSocket.OPEN) return;

  room.clients.set(ws, { controlledAwarenessIds: new Set(), canWrite });

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncEncoder, room.doc);
  ws.send(encoding.toUint8Array(syncEncoder));

  const states = room.awareness.getStates();
  if (states.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]),
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));
  }

  const handleMessage = (data: Buffer) => {
    const info = room.clients.get(ws);
    if (!info) return;

    const decoder = decoding.createDecoder(new Uint8Array(data));
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const innerType = decoding.readVarUint(decoder);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);

      if (innerType === syncProtocol.messageYjsSyncStep1) {
        syncProtocol.readSyncStep1(decoder, encoder, room.doc);
        if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));

        // Sent unconditionally, even when the step2 reply above was empty —
        // gives the client a definitive "caught up with the live room" signal
        // instead of guessing from whether any bytes came back.
        const doneEncoder = encoding.createEncoder();
        encoding.writeVarUint(doneEncoder, MESSAGE_SYNC_DONE);
        ws.send(encoding.toUint8Array(doneEncoder));
      } else if (info.canWrite) {
        if (innerType === syncProtocol.messageYjsSyncStep2) {
          syncProtocol.readSyncStep2(decoder, room.doc, ws);
        } else if (innerType === syncProtocol.messageYjsUpdate) {
          syncProtocol.readUpdate(decoder, room.doc, ws);
        }
        if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
      }
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
    }
  };

  // Replay whatever arrived while we were still verifying auth / loading
  // the room, in order, before listening for anything new.
  for (const data of pendingMessages) handleMessage(data);
  ws.on("message", handleMessage);

  const recheckTimer = setInterval(async () => {
    try {
      const next = await resolveRoomAccess(target, membershipProjectId, decoded.userId);
      if (!next.allowed) {
        ws.close(4003, "forbidden");
        return;
      }
      const info = room.clients.get(ws);
      if (info) info.canWrite = next.canWrite;
    } catch (err) {
      console.error(`collab: access recheck failed for ${roomKey(target)}`, err);
    }
  }, ACCESS_RECHECK_MS);

  ws.on("close", () => {
    clearInterval(recheckTimer);
    const info = room.clients.get(ws);
    room.clients.delete(ws);
    if (info && info.controlledAwarenessIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, [...info.controlledAwarenessIds], null);
    }
    if (room.clients.size === 0) {
      if (room.snapshotInterval) {
        clearInterval(room.snapshotInterval);
        room.snapshotInterval = null;
      }

      room.emptyTimeout = setTimeout(() => {
        if (room.clients.size !== 0) return;
        room.emptyTimeout = null;

        const finalSnapshot: Promise<void> = !room.dirty
          ? Promise.resolve()
          : target.kind === "project"
            ? withProjectSnapshotLock(target.id, () =>
              compactProject(target.id, Y.encodeStateAsUpdate(room.doc)),
            )
            : withBlockSnapshotLock(target.id, () =>
              compactBlock(target.id, Buffer.from(Y.encodeStateAsUpdate(room.doc))),
            );

        finalSnapshot
          .catch((err) => {
            console.error(`collab: final snapshot failed for ${roomKey(target)}`, err);
          })
          .finally(() => {
            room.doc.destroy();
            rooms.delete(roomKey(target));
          });
      }, ROOM_EMPTY_GRACE_MS);
    }
  });
}