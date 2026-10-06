import { useCallback, useEffect, useRef, useState } from "react";
import useStore from "../store/use-store";
import { PresentUser, subscribeToPresentUsers } from "../collab/live-transform";
import { onAccessChanged } from "../collab/access-events";

// Who else is in the room the editor is connected to right now: the project
// doc while browsing the project, the scene's own doc while inside a scene.
// collabSchema swaps on every project <-> scene switch, so this follows along
// with no extra wiring.
export function usePresentUsers(): PresentUser[] {
  const collabSchema = useStore((s) => s.collabSchema);
  const selfUserId = useStore((s) => s.userId);
  const [users, setUsers] = useState<PresentUser[]>([]);

  useEffect(() => {
    if (!collabSchema) {
      setUsers([]);
      return;
    }

    const unsubscribe = subscribeToPresentUsers(collabSchema.awareness, setUsers, {
      selfUserId,
      includeSelf: true,
    });

    return () => {
      unsubscribe();
      setUsers([]);
    };
  }, [collabSchema, selfUserId]);

  return users;
}

export interface MemberInfo {
  name: string;
  avatarUrl: string | null;
  // Role in the project.
  role: string;
}

interface MembersResponse {
  owner: { userId: string; name: string; avatarUrl: string | null } | null;
  members: { userId: string; name: string; avatarUrl: string | null; role: string }[];
}

// Avatar images aren't part of awareness; they come from the same members
// endpoint the share modal uses. Fetched lazily, and again only when a present
// user isn't in the last response or access changes. A failed fetch just
// leaves people on initials.
//
// memberCount is the number of active project members (the endpoint already
// filters out soft-deleted rows), or null until the first response.
export function useMemberDirectory(
  projectId: string | undefined,
  userIds: string[],
): { directory: Map<string, MemberInfo>; memberCount: number | null } {
  const [directory, setDirectory] = useState<Map<string, MemberInfo>>(() => new Map());
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const attempted = useRef<Set<string>>(new Set());
  const seq = useRef(0);
  const idsRef = useRef(userIds);
  idsRef.current = userIds;

  const load = useCallback(async () => {
    if (!projectId) return;
    const mySeq = ++seq.current;
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, { cache: "no-store" });
      if (!res.ok) return;
      const data: MembersResponse = await res.json();
      if (mySeq !== seq.current) return;

      const next = new Map<string, MemberInfo>();
      if (data.owner) {
        next.set(data.owner.userId, { name: data.owner.name, avatarUrl: data.owner.avatarUrl, role: "Owner" });
      }
      for (const m of data.members) {
        next.set(m.userId, { name: m.name, avatarUrl: m.avatarUrl, role: m.role });
      }

      setDirectory(next);
      setMemberCount(next.size);
    } catch {
      // keep whatever we had
    }
  }, [projectId]);

  useEffect(() => {
    attempted.current.clear();
    seq.current++;
    setDirectory(new Map());
    setMemberCount(null);
  }, [projectId]);

  const missing = userIds.filter((id) => !directory.has(id) && !attempted.current.has(id));
  const missingKey = missing.join(",");
  useEffect(() => {
    if (idsRef.current.length === 0 || missing.length === 0) return;
    missing.forEach((id) => attempted.current.add(id));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, load]);

  useEffect(
    () =>
      onAccessChanged(() => {
        if (idsRef.current.length === 0) return;
        void load();
      }),
    [load],
  );

  return { directory, memberCount };
}