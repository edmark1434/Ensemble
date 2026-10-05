// features/editor/store/use-block-members-store.ts
//
// One shared copy of a scene's access list, so the "Access" section in the
// scene panel (summary line) and the floating access-picker (full list) never
// disagree after an add / role change / remove.

import { create } from "zustand";
import useStore from "@/features/editor/store/use-store";
import { isSceneItem, type ISceneDetails } from "@/features/editor/types/ensemble-scene";
import {
  AssignableBlockRole,
  BlockAccess,
  BlockPerson, GeneralAccessLevel, minRole, toBlockRole,
} from "@/features/editor/types/block-members";

type Status = "idle" | "loading" | "ready" | "error";

interface BlockMembersState extends BlockAccess {
  blockId: string | null;
  status: Status;
  error: string | null;

  load: (blockId: string) => Promise<void>;
  addMember: (person: BlockPerson, role: AssignableBlockRole) => Promise<void>;
  changeRole: (userId: string, role: AssignableBlockRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  setGeneralAccess: (generalAccess: GeneralAccessLevel) => Promise<void>;
}

const membersUrl = (blockId: string) => `/api/blocks/${blockId}/members`;

async function request(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

const byName = (a: BlockPerson, b: BlockPerson) => a.name.localeCompare(b.name);

let loadSeq = 0;

const useBlockMembersStore = create<BlockMembersState>((set, get) => ({
  blockId: null,
  status: "idle",
  error: null,
  owner: null,
  members: [],
  candidates: [],
  canManage: false,
  generalAccess: "Restricted",
  viewerRole: null,

  load: async (blockId) => {
    if (get().blockId !== blockId) {
      set({
        blockId,
        status: "loading",
        error: null,
        owner: null,
        members: [],
        candidates: [],
        canManage: false,
        canGrantManager: false,
        generalAccess: "Restricted",
        viewerRole: null,
      });
    }

    const seq = ++loadSeq;
    try {
      const res = await fetch(membersUrl(blockId), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BlockAccess = await res.json();
      if (get().blockId !== blockId || seq !== loadSeq) return;
      set({ ...data, status: "ready", error: null });
    } catch (err) {
      if (get().blockId !== blockId || seq !== loadSeq) return;
      console.error("Failed to load scene access", err);
      set({ status: "error", error: "Couldn't load who has access." });
    }
  },

  setGeneralAccess: async (generalAccess) => {
    const { blockId } = get();
    if (!blockId) return;
    loadSeq++;

    const previous = get().generalAccess;
    set({ error: null, generalAccess });

    const ok = await request(membersUrl(blockId), "PATCH", { generalAccess });
    if (!ok) {
      set({ generalAccess: previous, error: "Couldn't change general access." });
    }
  },

  addMember: async (person, role) => {
    const { blockId } = get();
    if (!blockId) return;
    loadSeq++;

    const applied = person.projectRole
      ? (minRole(role, person.projectRole) as AssignableBlockRole)
      : role;
    set((s) => ({
      error: null,
      members: [...s.members, { ...person, role: applied, effectiveRole: toBlockRole(applied) }],
      candidates: s.candidates.filter((c) => c.userId !== person.userId),
    }));

    const ok = await request(membersUrl(blockId), "POST", {
      userId: person.userId,
      role,
    });
    if (!ok) {
      await get().load(blockId); // resync to what the server actually has
      set({ error: `Couldn't add ${person.name}.` });
    }
  },

  changeRole: async (userId, role) => {
    const { blockId } = get();
    if (!blockId) return;
    loadSeq++;

    set((s) => ({
      error: null,
      members: s.members.map((m) => {
        if (m.userId !== userId) return m;
        const applied = m.projectRole
          ? (minRole(role, m.projectRole) as AssignableBlockRole)
          : role;
        return { ...m, role: applied, effectiveRole: toBlockRole(applied) };
      }),
    }));

    const ok = await request(membersUrl(blockId), "PATCH", { userId, role });
    if (!ok) {
      await get().load(blockId);
      set({ error: "Couldn't change that role." });
    }
  },

  removeMember: async (userId) => {
    const { blockId, members } = get();
    const removed = members.find((m) => m.userId === userId);
    if (!blockId || !removed) return;
    loadSeq++;

    // Goes back into the suggestions, since they're still a project member.
    const { role: _r, effectiveRole: _e, ...person } = removed;
    set((s) => ({
      error: null,
      members: s.members.filter((m) => m.userId !== userId),
      candidates: [...s.candidates, person].sort(byName),
    }));

    const ok = await request(
      `${membersUrl(blockId)}?userId=${encodeURIComponent(userId)}`,
      "DELETE",
    );
    if (!ok) {
      await get().load(blockId);
      set({ error: `Couldn't remove ${removed.name}.` });
    }
  },
  canGrantManager: false,
}));

export default useBlockMembersStore;

/**
 * blockId of the scene currently selected on the timeline/canvas, or null.
 * The floating access-picker has no props, so it finds its scene this way.
 */
export const useActiveSceneBlockId = (): string | null =>
  useStore((s) => {
    const activeId = s.activeIds?.[0];
    const item = activeId ? s.trackItemsMap?.[activeId] : undefined;
    if (!item || !isSceneItem(item.type)) return null;
    return (item.details as unknown as ISceneDetails).blockId ?? null;
  });