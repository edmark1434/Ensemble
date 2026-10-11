import { useCallback, useEffect, useRef, useState } from "react";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import type {
  CommentAttachment,
  CommentStatus,
  CommentsPayload,
} from "@/features/editor/types/comments";

const REJECTED_CLOSE_CODES = new Set([4000, 4001, 4003, 4004]);

export function useComments(target: CollabTarget | null) {
  const [data, setData] = useState<CommentsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kind = target?.kind;
  const id = target?.id;
  const base = kind && id ? `/api/comments/${kind}s/${id}` : null;

  const baseRef = useRef(base);
  baseRef.current = base;

  const load = useCallback(async () => {
    if (!base) return;
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as CommentsPayload;
      if (baseRef.current !== base) return; // target changed while in flight
      setData(json);
      setError(null);
    } catch {
      if (baseRef.current === base) setError("Couldn't load comments");
    }
  }, [base]);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!base || !kind || !id) return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const param = kind === "project" ? "projectId" : "blockId";
    const url = `${proto}//${window.location.host}/comments?${param}=${encodeURIComponent(id)}`;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(url);
      ws.onopen = () => {
        attempt = 0;
        load(); // catch anything missed while disconnected
      };
      ws.onmessage = () => load();
      ws.onclose = (e) => {
        if (cancelled || REJECTED_CLOSE_CODES.has(e.code)) return;
        const delay = Math.random() * Math.min(500 * 2 ** attempt++, 15_000);
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws?.close();
    };

    load();
    connect();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [base, kind, id, load]);

  const post = useCallback(
    async (
      body: string,
      opts?: { parentId?: string; timeMs?: number; fileIds?: string[] },
    ) => {
      if (!base) return;
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          parentId: opts?.parentId,
          timeMs: opts?.timeMs,
          fileIds: opts?.fileIds,
        }),
      });
      if (!res.ok) throw new Error(`comment failed (${res.status})`);
      await load();
    },
    [base, load],
  );

  const remove = useCallback(
    async (params: { commentId: string } | { replyId: string }) => {
      if (!base) return;
      const res = await fetch(`${base}?${new URLSearchParams(params)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      await load();
    },
    [base, load],
  );

  const setStatus = useCallback(
    async (commentId: string, status: CommentStatus) => {
      if (!base) return;
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, status }),
      });
      if (!res.ok) throw new Error(`status change failed (${res.status})`);
      await load();
    },
    [base, load],
  );

  const upload = useCallback(
    async (file: File): Promise<CommentAttachment> => {
      if (!base) throw new Error("no comments target");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${base}/attachments`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`upload failed (${res.status})`);
      return (await res.json()) as CommentAttachment;
    },
    [base],
  );

  return { data, error, post, remove, setStatus, upload };
}