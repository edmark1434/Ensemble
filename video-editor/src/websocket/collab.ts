// video-editor/websocket/collab.ts

import type { IncomingMessage } from "http";
import { WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";
import { resolveProjectId } from "@/utils/resolve-ids";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const HYDRATION_ORIGIN = "hydration";

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Map<WebSocket, Set<number>>;
}

// Keyed by Promise, not Room — concurrent connections to a brand-new room
// await the same in-flight hydration instead of each kicking off its own
// applyUpdate pass on separate docs.
const rooms = new Map<string, Promise<Room>>();

function broadcast(room: Room, message: Uint8Array, origin: WebSocket | null) {
  for (const client of room.clients.keys()) {
    if (client !== origin && client.readyState === WebSocket.OPEN) client.send(message);
  }
}

async function getOrCreateRoom(publicProjectId: string): Promise<Room> {
  const existing = rooms.get(publicProjectId);
  if (existing) return existing;

  const roomPromise = (async () => {
    const doc = new Y.Doc({ gc: false });
    const awareness = new awarenessProtocol.Awareness(doc);
    const room: Room = { doc, awareness, clients: new Map() };

    const projectId = await resolveProjectId(publicProjectId);
    const { snapshot, updates } = await loadLatestProjectState(projectId);
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
    });

    awareness.on("update", (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: WebSocket | null,
    ) => {
      if (origin && room.clients.has(origin)) {
        const controlled = room.clients.get(origin)!;
        added.forEach((id) => controlled.add(id));
        removed.forEach((id) => controlled.delete(id));
      }
      const changed = [...added, ...updated, ...removed];
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      broadcast(room, encoding.toUint8Array(encoder), origin);
    });

    return room;
  })();

  rooms.set(publicProjectId, roomPromise);
  roomPromise.catch(() => rooms.delete(publicProjectId));
  return roomPromise;
}

export async function handleCollabConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? "", "http://collab");
  const projectId = url.searchParams.get("projectId");
  const userId = url.searchParams.get("userId");

  if (!projectId || !userId) {
    ws.close(4001, "projectId and userId are required");
    return;
  }

  // TODO(auth): verify userId is authorized on projectId before admitting.

  const room = await getOrCreateRoom(projectId);
  if (ws.readyState !== WebSocket.OPEN) return; // client left mid-hydration

  room.clients.set(ws, new Set());

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
    const decoder = decoding.createDecoder(new Uint8Array(data));
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
      if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
    }
  });

  ws.on("close", () => {
    const controlled = room.clients.get(ws);
    room.clients.delete(ws);
    if (controlled && controlled.size > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, [...controlled], null);
    }
    if (room.clients.size === 0) {
      room.doc.destroy();
      rooms.delete(projectId);
    }
  });
}