// video-editor/src/features/editor/collab/ws-provider.ts

import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { CollabSchema } from "./ydoc-schema";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const remoteOrigin = "ws-remote";

export function attachWsProvider(schema: CollabSchema, projectId: string, userId: string): () => void {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${proto}//${window.location.host}/collab?projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`;

  const ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  const { awareness } = schema;

  // setLocalStateField() is a no-op until local state exists at all —
  // seed it once so awareness actually starts broadcasting.
  if (awareness.getLocalState() === null) {
    awareness.setLocalState({ user: { id: userId } });
  }

  // Updates that fire before the socket is OPEN (e.g. hydrateDocFromState
  // on mount) get buffered here instead of dropped, then flushed on open.
  let outbox: Uint8Array[] = [];

  const send = (message: Uint8Array) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      outbox.push(message);
    }
  };

  ws.onopen = () => {
    // Request the server's state: this is the half of the handshake that
    // was missing. Server responds with syncStep2 containing whatever the
    // room doc has that our state vector says we're missing.
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, schema.doc);
    ws.send(encoding.toUint8Array(encoder));

    // Announce local awareness state if any is already set.
    const localState = awareness.getLocalState();
    if (localState !== null) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, [schema.doc.clientID]),
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }

    outbox.forEach((message) => ws.send(message));
    outbox = [];
  };

  ws.onmessage = (event) => {
    const decoder = decoding.createDecoder(new Uint8Array(event.data as ArrayBuffer));
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, schema.doc, remoteOrigin);
      if (encoding.length(encoder) > 1) send(encoding.toUint8Array(encoder));
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), remoteOrigin);
    }
  };

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
    schema.doc.off("update", sendUpdate);
    awareness.off("update", sendAwarenessUpdate);
    awarenessProtocol.removeAwarenessStates(awareness, [schema.doc.clientID], "window-unload");
    ws.close();
  };
}