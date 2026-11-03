import { create } from "zustand";
import type { CommentsPayload } from "../types/comments";

type CommentAlert = { id: string; threadId: string; kind: "reply" | "mention" };
type Checkpoint = { knownIds: string[]; unreadIds: string[]; readIds: string[] };

const storageKey = (scope: string) => `ensemble:comment-notifications:v1:${scope}`;
const checkpoints = new Map<string, Checkpoint>();

function readCheckpoint(scope: string): Checkpoint | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(scope)) ?? "null");
    if (value && Array.isArray(value.knownIds) && Array.isArray(value.unreadIds)) {
      return {
        knownIds: value.knownIds.filter((id: unknown) => typeof id === "string"),
        unreadIds: value.unreadIds.filter((id: unknown) => typeof id === "string"),
        readIds: Array.isArray(value.readIds)
          ? value.readIds.filter((id: unknown) => typeof id === "string")
          : value.knownIds.filter((id: string) => !value.unreadIds.includes(id)),
      };
    }
  } catch { /* Storage may be unavailable; keep session state instead. */ }
  return checkpoints.get(scope) ?? null;
}

function saveCheckpoint(scope: string, checkpoint: Checkpoint) {
  checkpoints.set(scope, checkpoint);
  try { localStorage.setItem(storageKey(scope), JSON.stringify(checkpoint)); } catch { /* Optional persistence. */ }
}

let audio: HTMLAudioElement | undefined;
let lastSoundAt = 0;
function playNotificationSound() {
  if (Date.now() - lastSoundAt < 700) return;
  lastSoundAt = Date.now();
  try {
    audio ??= new Audio("/sounds/notification.mp3");
    audio.currentTime = 0;
    void audio.play().catch(() => {}); // Autoplay may require a user gesture first.
  } catch { /* Sound is optional. */ }
}

interface CommentNotifications {
  scope: string | null;
  knownIds: string[] | null;
  unreadIds: string[];
  readIds: string[];
  entries: Record<string, CommentAlert>;
  notice: CommentAlert | null;
  activate: (scope: string | null) => void;
  ingest: (scope: string, data: CommentsPayload, userId: string) => void;
  markThreadRead: (scope: string, threadId: string, entryIds: string[]) => void;
  dismissNotice: () => void;
}

export const useCommentNotifications = create<CommentNotifications>((set, get) => ({
  scope: null,
  knownIds: null,
  unreadIds: [],
  readIds: [],
  entries: {},
  notice: null,
  activate: (scope) => {
    if (scope === get().scope) return;
    const saved = scope ? readCheckpoint(scope) : null;
    set({ scope, knownIds: saved?.knownIds ?? null, unreadIds: saved?.unreadIds ?? [], readIds: saved?.readIds ?? [], entries: {}, notice: null });
  },
  ingest: (scope, data, userId) => {
    const state = get();
    if (state.scope !== scope) return;
    const entries: Record<string, CommentAlert> = {};
    const knownIds: string[] = [];
    for (const thread of data.threads) {
      for (const item of [thread, ...thread.replies]) {
        knownIds.push(item.id);
        // canDelete is supplied by the server and means this user authored it.
        if (item.canDelete) continue;
        const mentioned = item.body.includes(`](${userId})`);
        if (mentioned || (item.id !== thread.id && thread.canDelete)) {
          entries[item.id] = { id: item.id, threadId: thread.id, kind: mentioned ? "mention" : "reply" };
        }
      }
    }
    const previous = new Set(state.knownIds ?? knownIds);
    const read = new Set(state.readIds);
    // First visit establishes a baseline instead of announcing historical comments.
    const incoming = knownIds.filter(id => !previous.has(id) && !read.has(id) && entries[id]);
    const unreadIds = [...new Set([...state.unreadIds, ...incoming])].filter(id => entries[id] && !read.has(id));
    // A temporarily incomplete refresh must not make previously seen replies new.
    const allKnownIds = [...new Set([...previous, ...knownIds])];
    const latest = incoming.at(-1);
    set({
      knownIds: allKnownIds, unreadIds, entries,
      notice: latest ? entries[latest] : state.notice && unreadIds.includes(state.notice.id) ? state.notice : null,
    });
    saveCheckpoint(scope, { knownIds: allKnownIds, unreadIds, readIds: state.readIds });
    if (latest) playNotificationSound();
  },
  markThreadRead: (scope, threadId, entryIds) => {
    const state = get();
    if (scope !== state.scope) return;
    // Acknowledge individual entries, not the thread's lifetime reply count.
    const read = new Set([...state.readIds, ...entryIds]);
    for (const id of state.unreadIds) {
      if (state.entries[id]?.threadId === threadId) read.add(id);
    }
    const unreadIds = state.unreadIds.filter(id => !read.has(id));
    if (read.size === state.readIds.length && unreadIds.length === state.unreadIds.length) return;
    const readIds = [...read];
    const knownIds = [...new Set([...(state.knownIds ?? []), ...entryIds])];
    set({ knownIds, readIds, unreadIds, notice: state.notice?.threadId === threadId ? null : state.notice });
    saveCheckpoint(scope, { knownIds, unreadIds, readIds });
  },
  dismissNotice: () => set({ notice: null }),
}));
