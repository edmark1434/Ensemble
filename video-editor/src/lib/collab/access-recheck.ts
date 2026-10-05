import { liveRooms } from "@/lib/collab/live-rooms";

type ClientLike = {
  projectId: string;
  notify: () => void;
  recheck: (force?: boolean) => Promise<void>;
};
type RoomLike = { clients: Map<unknown, ClientLike> };
const rooms = liveRooms as unknown as Map<string, Promise<RoomLike>>;

async function clientsOf(filter: (c: ClientLike) => boolean): Promise<ClientLike[]> {
  const settled = await Promise.all([...rooms.values()].map((r) => r.catch(() => null)));
  return settled.flatMap((r) => (r ? [...r.clients.values()].filter(filter) : []));
}

// key = `block:${blockId}` or `project:${projectId}`
export async function recheckRoom(key: string, force = true) {
  const room = rooms.get(key);
  if (!room) return;
  try {
    const r = await room;
    await Promise.all([...r.clients.values()].map((c) => c.recheck(force)));
  } catch (e) {
    console.error("recheckRoom failed", e);
  }
}

// Everyone connected to this project, in its room and its scene rooms.
export async function recheckProject(projectId: string) {
  try {
    const clients = await clientsOf((c) => c.projectId === projectId);
    clients.forEach((c) => c.notify());                      // open modals and pickers refetch now
    await Promise.all(clients.map((c) => c.recheck(false))); // enforce; closes revoked sockets
  } catch (e) {
    console.error("recheckProject failed", e);
  }
}

export async function recheckAllRooms() {
  try {
    const clients = await clientsOf(() => true);
    await Promise.all(clients.map((c) => c.recheck(true)));
  } catch (e) {
    console.error("recheckAllRooms failed", e);
  }
}