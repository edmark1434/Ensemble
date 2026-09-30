import type * as Y from "yjs";

// Shared between the ws server (collab.ts) and Next route handlers, which
// get separate module instances, so it has to live on globalThis.
const g = globalThis as unknown as {
  collabRooms?: Map<string, Promise<{ doc: Y.Doc }>>;
};
export const liveRooms = (g.collabRooms ??= new Map());

export async function setProjectNameInLiveRoom(projectId: string, name: string): Promise<void> {
  const pending = liveRooms.get(`project:${projectId}`);
  // No live room: nobody has it open. The next open takes the DB name.
  if (!pending) return;

  const { doc } = await pending;
  const meta = doc.getMap("meta");
  if (meta.get("projectName") === name) return;

  // Origin is neither HYDRATION nor a socket, so the room broadcasts it to
  // every client and marks itself dirty for the next snapshot.
  doc.transact(() => meta.set("projectName", name), "server-rename");
}