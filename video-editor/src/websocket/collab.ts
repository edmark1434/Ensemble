// video-editor/websocket/collab.ts

import type { IncomingMessage } from "http";
import { WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const HYDRATION_ORIGIN = "hydration";

interface ClientInfo {
  controlledAwarenessIds: Set<number>;
  canWrite: boolean;
}

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Map<WebSocket, ClientInfo>;
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

async function getOrCreateRoom(projectId: string): Promise<Room> {
  const existing = rooms.get(projectId);
  if (existing) return existing;

  const roomPromise = (async () => {
    const doc = new Y.Doc({ gc: false });
    const awareness = new awarenessProtocol.Awareness(doc);
    const room: Room = { doc, awareness, clients: new Map() };

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

    return room;
  })();

  rooms.set(projectId, roomPromise);
  roomPromise.catch(() => rooms.delete(projectId));
  return roomPromise;
}

export async function handleCollabConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? "", "http://collab");
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    ws.close(4000, "projectId is required");
    return;
  }

  const sessionCookie = getCookie(req.headers.cookie, EDITOR_SESSION_COOKIE);
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    ws.close(4001, "unauthorized");
    return;
  }

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();

  if (!membership) {
    ws.close(4003, "forbidden");
    return;
  }

  const canWrite = membership.role === "Owner" || membership.role === "Editor";

  const room = await getOrCreateRoom(projectId);
  if (ws.readyState !== WebSocket.OPEN) return; // client left mid-hydration

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
    if (!info) return; // message arrived after close raced in

    const decoder = decoding.createDecoder(new Uint8Array(data));
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const innerType = decoding.readVarUint(decoder);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);

      if (innerType === syncProtocol.messageYjsSyncStep1) {
        // A state-vector request. Answering it only reads room.doc, never
        // mutates it — safe for a read-only (Viewer) connection, and it's
        // exactly what lets them keep receiving "current live state."
        syncProtocol.readSyncStep1(decoder, encoder, room.doc);
      } else if (info.canWrite) {
        // syncStep2 and Update both end up calling Y.applyUpdate on
        // room.doc — the two message shapes that actually mutate project
        // data. Gate both behind write access.
        if (innerType === syncProtocol.messageYjsSyncStep2) {
          syncProtocol.readSyncStep2(decoder, room.doc, ws);
        } else if (innerType === syncProtocol.messageYjsUpdate) {
          syncProtocol.readUpdate(decoder, room.doc, ws);
        }
      }
      // A Viewer sending step2/Update falls through here and is dropped —
      // their client shouldn't be producing local edits at all, and this
      // is the server-side backstop for that assumption.

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
      room.doc.destroy();
      rooms.delete(projectId);
    }
  });
}