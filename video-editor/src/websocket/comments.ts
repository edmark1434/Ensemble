import type { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { getCommentRole } from "@/lib/db/comments";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const g = globalThis as unknown as { __commentRooms?: Map<string, Set<WebSocket>> };
const rooms = (g.__commentRooms ??= new Map<string, Set<WebSocket>>());

const roomKey = (t: CollabTarget) => `${t.kind}:${t.id}`;

export function broadcastComments(target: CollabTarget) {
  const room = rooms.get(roomKey(target));
  if (!room) return;
  const msg = JSON.stringify({ type: "comments:changed" });
  for (const ws of room) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
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

async function authenticate(req: IncomingMessage): Promise<string | null> {
  const sessionCookie = getCookie(req.headers.cookie, EDITOR_SESSION_COOKIE);
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  return decoded?.userId ?? null;
}
export async function handleCommentsConnection(ws: WebSocket, req: IncomingMessage) {
  const params = new URL(req.url ?? "", "http://comments").searchParams;
  const projectId = params.get("projectId");
  const blockId = params.get("blockId");

  const target: CollabTarget | null =
    projectId && UUID.test(projectId) ? { kind: "project", id: projectId }
      : blockId && UUID.test(blockId) ? { kind: "block", id: blockId }
        : null;
  if (!target) return ws.close(4000, "bad request");

  const userId = await authenticate(req);
  if (!userId) return ws.close(4001, "no session");

  const role = await getCommentRole(target, userId);
  if (!role) return ws.close(4003, "no access");

  // the socket may have closed while we were awaiting the lookups above
  if (ws.readyState !== WebSocket.OPEN) return;

  const key = roomKey(target);
  const room = rooms.get(key) ?? new Set<WebSocket>();
  room.add(ws);
  rooms.set(key, room);

  const leave = () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(key);
  };
  ws.on("close", leave);
  ws.on("error", leave);
}