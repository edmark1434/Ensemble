import { liveRooms } from "@/lib/collab/live-rooms";

type RoomLike = { clients: Map<unknown, { recheck: (force?: boolean) => Promise<void> }> };
const rooms = liveRooms as unknown as Map<string, Promise<RoomLike>>;

async function recheckOne(room: Promise<RoomLike>, force: boolean) {
  const r = await room;
  await Promise.all([...r.clients.values()].map((c) => c.recheck(force)));
}

// key = `block:${blockId}` or `project:${projectId}`
export async function recheckRoom(key: string, force = true) {
  const room = rooms.get(key);
  if (room) await recheckOne(room, force).catch((e) => console.error("recheckRoom failed", e));
}

// Project role changes affect that project's room and its scene rooms.
export async function recheckAllRooms() {
  await Promise.all([...rooms.values()].map((r) => recheckOne(r, true).catch(() => {})));
}