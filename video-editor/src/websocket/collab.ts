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

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
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

export async function handleCollabConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? "", "http://collab");
  const projectId = url.searchParams.get("projectId");
  const blockId = url.searchParams.get("blockId");

  if (!projectId && !blockId) {
    ws.close(4000, "projectId or blockId is required");
    return;
  }

  const sessionCookie = getCookie(req.headers.cookie, EDITOR_SESSION_COOKIE);
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    ws.close(4001, "unauthorized");
    return;
  }

  let target: CollabTarget;
  let membershipProjectId: string;

  if (projectId) {
    target = { kind: "project", id: projectId };
    membershipProjectId = projectId;
  } else {
    // ASSUMPTION: a `blocks` table with a `project_id` column — rename
    // below if yours differs, I don't have that schema in front of me.
    const block = await db
      .selectFrom("blocks")
      .where("block_id", "=", blockId!)
      .select(["project_id"])
      .executeTakeFirst();

    if (!block) {
      ws.close(4004, "block not found");
      return;
    }
    target = { kind: "block", id: blockId! };
    membershipProjectId = block.project_id;
  }

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", membershipProjectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();

  if (!membership) {
    ws.close(4003, "forbidden");
    return;
  }

  const canWrite = membership.role === "Owner" || membership.role === "Editor";

  const room = await getOrCreateRoom(target);
  if (ws.readyState !== WebSocket.OPEN) return;

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

  ws.on("message", (data: Buffer) => {
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
      } else if (info.canWrite) {
        if (innerType === syncProtocol.messageYjsSyncStep2) {
          syncProtocol.readSyncStep2(decoder, room.doc, ws);
        } else if (innerType === syncProtocol.messageYjsUpdate) {
          syncProtocol.readUpdate(decoder, room.doc, ws);
        }
      }

      if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
    }
  });

  ws.on("close", () => {
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