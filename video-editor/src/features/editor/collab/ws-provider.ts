import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { CollabSchema } from "./ydoc-schema";
import { CollabTarget } from "./collab-target";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_SYNC_DONE = 2;
const remoteOrigin = "ws-remote";

const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 15_000;

export function attachWsProvider(
  schema: CollabSchema,
  target: CollabTarget,
  userId: string,
  userName?: string,
  options?: { announcePresence?: boolean; onFirstSync?: () => void },
): () => void {
  const announcePresence = options?.announcePresence ?? true;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const targetParam = target.kind === "project"
    ? `projectId=${encodeURIComponent(target.id)}`
    : `blockId=${encodeURIComponent(target.id)}`;
  const wsUrl = `${proto}//${window.location.host}/collab?${targetParam}&userId=${encodeURIComponent(userId)}`;

  const { awareness } = schema;

  if (announcePresence) {
    awareness.setLocalStateField("user", { id: userId, name: userName });
  }

  let ws: WebSocket | null = null;
  let outbox: Uint8Array[] = [];
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;

  const send = (message: Uint8Array) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      outbox.push(message);
    }
  };

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return;
    // Full jitter: multiple clients reconnecting after the same server
    // restart/blip shouldn't all retry in lockstep.
    const delay = Math.random() * Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (destroyed) return;

    const socket = new WebSocket(wsUrl);
    socket.binaryType = "arraybuffer";
    ws = socket;

    socket.onopen = () => {
      reconnectAttempt = 0;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, schema.doc);
      socket.send(encoding.toUint8Array(encoder));

      // Re-announce presence/awareness — the server clears this client's
      // awareness states on disconnect (see collab.ts's ws close handler),
      // so a reconnect needs to resend them, not just rely on the doc sync.
      const localState = awareness.getLocalState();
      if (localState !== null) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, [schema.doc.clientID]),
        );
        socket.send(encoding.toUint8Array(awarenessEncoder));
      }

      const queued = outbox;
      outbox = [];
      queued.forEach((message) => socket.send(message));
    };

    socket.onmessage = (event) => {
      const decoder = decoding.createDecoder(new Uint8Array(event.data as ArrayBuffer));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const beforeIds = target.kind === "project" ? [...schema.trackItems.keys()] : [];
        syncProtocol.readSyncMessage(decoder, encoder, schema.doc, remoteOrigin);
        if (target.kind === "project") {
          console.debug("[ws-provider] project sync applied", { before: beforeIds.length, after: schema.trackItems.size });
        }
        if (encoding.length(encoder) > 1) send(encoding.toUint8Array(encoder));
      } else if (messageType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), remoteOrigin);
      } else if (messageType === MESSAGE_SYNC_DONE) {
        options?.onFirstSync?.();
      }
    };

    socket.onclose = () => {
      if (ws === socket) ws = null;
      if (destroyed) return;
      scheduleReconnect();
    };

    // Most browsers fire close right after error, but force it so a
    // connection stuck half-open doesn't stall reconnection.
    socket.onerror = () => {
      socket.close();
    };
  };

  connect();

  const sendUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === remoteOrigin) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    send(encoding.toUint8Array(encoder));
  };
  schema.doc.on("update", sendUpdate);

  const sendAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === remoteOrigin) return;
    const changed = [...added, ...updated, ...removed];
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
    send(encoding.toUint8Array(encoder));
  };
  awareness.on("update", sendAwarenessUpdate);

  return () => {
    destroyed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    schema.doc.off("update", sendUpdate);
    awareness.off("update", sendAwarenessUpdate);
    awarenessProtocol.removeAwarenessStates(awareness, [schema.doc.clientID], "window-unload");
    ws?.close();
  };
}