// features/editor/comments/comments-panel.tsx

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
  ArrowUpDown,
  AtSign,
  Check,
  Clock,
  Eye,
  ImageIcon,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Avatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { COMMENT_MAX_IMAGES, COMMENT_MAX_IMAGE_BYTES } from "@/features/editor/constants/comment-limits";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { millisecondsToHHMMSS } from "../utils/format";
import {
  useCommentsStore,
  type CommentFilter,
  type CommentSort,
} from "@/features/editor/store/use-comments-store";
import { ImagePreview } from "./image-preview";
import type {
  CommentAttachment,
  CommentPerson,
  CommentReply,
  CommentThread,
} from "../types/comments";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

// "Just now" / "5m" / "2h" / "3d" for the first 7 days, then "Oct 3, 2026 · 3:45 PM"
function formatCreatedAt(iso: string, now: number) {
  const d = new Date(iso);
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now"; // also covers small client/server clock skew
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}`;
}

// re-render periodically so "Just now" / "5m" don't go stale
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// seek + "ms at the playhead", shared by the panel and the thread window
export function usePlayheadControls() {
  const playerRef = useStore((s) => s.playerRef);
  const fps = useStore((s) => s.fps);
  const seek = (ms: number) => playerRef?.current?.seekTo(Math.round((ms * fps) / 1000));
  const currentMs = () => {
    const f = playerRef?.current?.getCurrentFrame?.();
    return f == null ? undefined : Math.round((f / fps) * 1000);
  };
  return { seek, currentMs };
}

// Same tooltip recipe as the navbar buttons. z-[260]: above the floating controls (210).
export function Tip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactElement;
}) {
  return (
    <Tooltip delayDuration={10}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        sideOffset={1}
        className={cn("z-[260]", shortcut && "flex items-center gap-2")}
      >
        {label}
        {shortcut && (
          <KbdGroup>
            <Kbd>{shortcut}</Kbd>
          </KbdGroup>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function OptionMenu<T extends string>({
  label,
  title,
  icon,
  value,
  active,
  options,
  onChange,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  value: T;
  active?: boolean;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip label={label}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn("hover:!bg-accent/30", (open || active) && "bg-accent/30", active && "text-primary")}
          >
            {icon}
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="z-[300] w-44 p-0">
        <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">{title}</p>
        {options.map((o) => (
          <div
            key={o.value}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
            className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
          >
            {o.label}
            {o.value === value && <Check size={14} className="shrink-0 text-muted-foreground" />}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const FILTER_OPTIONS: { value: CommentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "mentions", label: "Mentions you" },
  { value: "resolved", label: "Resolved" },
];
const SORT_OPTIONS: { value: CommentSort; label: string }[] = [
  { value: "timestamp", label: "Timestamp" },
  { value: "date", label: "Post date" },
];

// does the comment, or any reply, @mention this user
const mentionsUser = (t: CommentThread, userId: string) => {
  if (!userId) return false;
  const needle = `](${userId})`;
  return t.body.includes(needle) || t.replies.some((r) => r.body.includes(needle));
};

// ---------------------------------------------------------------------------
// Body format. Stored as plain text with two kinds of tokens:
//   {{t:12000}}            a time pill (ms), clickable, seeks the playhead
//   @[Name](userId)        a mention, shown as coloured text
// ---------------------------------------------------------------------------

const TOKEN_RE = /\{\{t:(\d+)\}\}|@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi;
const hasTimeToken = (body: string) => /\{\{t:\d+\}\}/.test(body);
const fmtPill = (ms: number) => millisecondsToHHMMSS(Math.floor(ms / 1000) * 1000);

function TimePill({
  ms,
  onSeek,
  className,
}: {
  ms: number;
  onSeek?: (ms: number) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // don't open the thread
        onSeek?.(ms);
      }}
      className={cn(
        "mx-0.5 -my-0.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 align-middle text-xs text-primary transition-colors hover:bg-primary/20",
        className,
      )}
    >
      {fmtPill(ms)}
    </button>
  );
}

function renderBody(body: string, onSeek?: (ms: number) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of body.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(body.slice(last, i));
    if (m[1] !== undefined) {
      out.push(<TimePill key={i} ms={Number(m[1])} onSeek={onSeek} />);
    } else {
      out.push(
        <span key={i} className="text-primary">
          @{m[2]}
        </span>,
      );
    }
    last = i + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

// ---------------------------------------------------------------------------
// Composer: a contentEditable box where time pills and mentions are real
// inline chips, so what you type is what gets rendered.
// ---------------------------------------------------------------------------

type Trigger = { char: "@" | "/"; query: string; start: number };
type TriggerDom = Trigger & { node: Text; end: number };
type MenuItem = { kind: "time" } | { kind: "person"; person: CommentPerson };
type Pending = {
  key: number;
  preview: string;
  status: "uploading" | "done" | "error";
  id?: string;
};

const NO_PEOPLE: CommentPerson[] = [];
const MAX_MB = COMMENT_MAX_IMAGE_BYTES / 1024 / 1024;

const EDITOR_CLASS =
  "border-input dark:bg-input/30 max-h-48 min-h-[80px] w-full overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]";

function makeTimeChip(ms: number) {
  const el = document.createElement("span");
  el.contentEditable = "false";
  el.dataset.type = "time";
  el.dataset.ms = String(Math.round(ms));
  el.className =
    "mx-0.5 inline-block select-none rounded-md bg-primary/10 px-2 py-0.5 align-middle text-xs text-primary";
  el.textContent = fmtPill(ms);
  return el;
}

function makeMentionChip(person: CommentPerson) {
  const name = person.name.replace(/[[\]]/g, "");
  const el = document.createElement("span");
  el.contentEditable = "false";
  el.dataset.type = "mention";
  el.dataset.id = person.userId;
  el.dataset.name = name;
  el.className = "select-none text-primary";
  el.textContent = `@${name}`;
  return el;
}

// editor DOM -> body string (+ the first time pill, which becomes the comment's marker).
// A pill or mention always ends up separated from neighbouring words by a space.
function readEditor(root: HTMLElement) {
  let body = "";
  let firstTime: number | undefined;
  let hasText = false;
  let afterChip = false;

  const addChip = (token: string) => {
    if (body && !/\s$/.test(body)) body += " ";
    body += token;
    afterChip = true;
  };

  const walk = (parent: Node) => {
    parent.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n.textContent ?? "").replace(/\u00a0/g, " ");
        if (!t) return;
        if (afterChip && !/^[\s.,;:!?)\]]/.test(t)) body += " ";
        afterChip = false;
        if (t.trim()) hasText = true;
        body += t;
        return;
      }
      if (!(n instanceof HTMLElement)) return;
      const type = n.dataset.type;
      if (type === "time") {
        const ms = Number(n.dataset.ms);
        addChip(`{{t:${ms}}}`);
        if (firstTime === undefined) firstTime = ms;
      } else if (type === "mention") {
        addChip(`@[${n.dataset.name}](${n.dataset.id})`);
        hasText = true;
      } else if (n.tagName === "BR") {
        body += "\n";
        afterChip = false;
      } else {
        // block wrappers some browsers insert around lines
        if (body && !body.endsWith("\n")) body += "\n";
        afterChip = false;
        walk(n);
      }
    });
  };
  walk(root);

  return { body: body.trim(), timeMs: firstTime, blank: !hasText };
}

// "@" or "/" at the start of a word, right before the caret
function readTrigger(root: HTMLElement): TriggerDom | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const offset = sel.anchorOffset;
  const before = (node.textContent ?? "").slice(0, offset);
  const m = /(?:^|\s)([@/])([^\s@/]*)$/.exec(before);
  if (!m) return null;
  return {
    char: m[1] as "@" | "/",
    query: m[2],
    start: offset - m[2].length - 1,
    end: offset,
    node: node as Text,
  };
}

function placeCaretAtEnd(el: HTMLElement) {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

export function Composer({
  placeholder,
  onSubmit,
  getTimeMs,
  autoPill,
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (p: { body: string; timeMs?: number; fileIds: string[] }) => Promise<void>;
  // Enables the "/" and "@" -> Timestamp command (any number of pills).
  getTimeMs?: () => number | undefined;
  // Also drops a pill into the box when it's focused empty (top-level comments).
  autoPill?: boolean;
  autoFocus?: boolean;
}) {
  const upload = useCommentsStore((s) => s.upload);
  const peopleData = useCommentsStore((s) => s.data?.people);
  const people = peopleData ?? NO_PEOPLE;

  const editorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TriggerDom | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const [blank, setBlank] = useState(true);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<Pending[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);

  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(
    () => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)),
    [],
  );

  const sync = () => {
    const el = editorRef.current;
    if (el) setBlank(readEditor(el).blank);
  };

  const updateTrigger = () => {
    const el = editorRef.current;
    const t = el ? readTrigger(el) : null;
    triggerRef.current = t;
    setTrigger((prev) => {
      if (!t) return prev ? null : prev;
      if (prev && prev.char === t.char && prev.query === t.query && prev.start === t.start) {
        return prev;
      }
      return { char: t.char, query: t.query, start: t.start };
    });
  };

  // caret moves (arrows, clicks) also change whether a trigger is under the caret
  useEffect(() => {
    const onSel = () => {
      if (document.activeElement === editorRef.current) updateTrigger();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, []);

  // ---- "@" / "/" menu ----
  const items = useMemo<MenuItem[]>(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    const out: MenuItem[] = [];
    if (getTimeMs && getTimeMs() != null && (!q || ["time", "timestamp", "now"].some((w) => w.startsWith(q)))) {
      out.push({ kind: "time" });
    }
    if (trigger.char === "@") {
      for (const person of people) {
        if (person.name.toLowerCase().includes(q)) out.push({ kind: "person", person });
        if (out.length >= 7) break;
      }
    }
    return out;
  }, [trigger, getTimeMs, people]);

  const menuOpen = !!trigger && items.length > 0 && dismissedStart !== trigger.start;

  useEffect(() => {
    setActiveIdx(0);
  }, [trigger?.start, trigger?.query]);

  useEffect(() => {
    if (!trigger) setDismissedStart(null);
  }, [trigger]);

  const apply = (item: MenuItem) => {
    const t = triggerRef.current;
    if (!t || !editorRef.current) return;

    const range = document.createRange();
    range.setStart(t.node, t.start);
    range.setEnd(t.node, t.end);
    range.deleteContents();

    const chip =
      item.kind === "time" ? makeTimeChip(getTimeMs?.() ?? 0) : makeMentionChip(item.person);
    const gap = document.createTextNode(" ");
    range.insertNode(gap);
    range.insertNode(chip); // lands before the gap

    const caret = document.createRange();
    caret.setStart(gap, 1);
    caret.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(caret);

    triggerRef.current = null;
    setTrigger(null);
    sync();
  };

  // the @ button just types an "@" so the menu opens
  const startMention = () => {
    const el = editorRef.current;
    if (!el) return;
    const wasFocused = document.activeElement === el;
    el.focus();
    if (!wasFocused) placeCaretAtEnd(el);

    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const prev =
      node && node.nodeType === Node.TEXT_NODE
        ? (node.textContent ?? "")[(sel?.anchorOffset ?? 0) - 1]
        : undefined;
    const needsSpace = prev !== undefined && !/\s/.test(prev);
    document.execCommand("insertText", false, needsSpace ? " @" : "@");
  };

  // ---- time pill on focus ----
  const addAutoPill = () => {
    const el = editorRef.current;
    if (!el || !autoPill || !getTimeMs) return;
    if (el.textContent?.trim() || el.querySelector("[data-type]")) return;
    const ms = getTimeMs();
    if (ms == null) return;
    el.innerHTML = "";
    el.append(makeTimeChip(ms), document.createTextNode(" "));
    placeCaretAtEnd(el);
    // a click-focus sets its own caret right after the focus event
    requestAnimationFrame(() => {
      if (document.activeElement === el) placeCaretAtEnd(el);
    });
    sync();
  };

  // ---- images ----
  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;

    const limitMsg = `You can attach ${COMMENT_MAX_IMAGES} image${COMMENT_MAX_IMAGES === 1 ? "" : "s"} per comment`;
    const room = COMMENT_MAX_IMAGES - filesRef.current.length;
    if (room <= 0) {
      setFileError(limitMsg);
      return;
    }

    let err: string | null = incoming.length > room ? limitMsg : null;
    const ok: File[] = [];
    for (const f of incoming.slice(0, room)) {
      if (f.size > COMMENT_MAX_IMAGE_BYTES) err = `Images must be under ${MAX_MB} MB`;
      else ok.push(f);
    }
    setFileError(err);

    for (const file of ok) {
      const key = ++seq.current;
      const preview = URL.createObjectURL(file);
      setFiles((prev) => [...prev, { key, preview, status: "uploading" }]);
      upload(file)
        .then((res) =>
          setFiles((prev) =>
            prev.map((f) => (f.key === key ? { ...f, status: "done", id: res.id } : f)),
          ),
        )
        .catch(() =>
          setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, status: "error" } : f))),
        );
    }
  };

  const removeFile = (key: number) => {
    setFileError(null);
    setFiles((prev) => {
      const gone = prev.find((f) => f.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((f) => f.key !== key);
    });
  };

  const uploading = files.some((f) => f.status === "uploading");
  const doneIds = files.flatMap((f) => (f.status === "done" && f.id ? [f.id] : []));
  const canSend = !busy && !uploading && (!blank || doneIds.length > 0);

  const submit = async () => {
    const el = editorRef.current;
    if (!el || !canSend) return;
    const r = readEditor(el);
    if (!r.body && doneIds.length === 0) return;

    setBusy(true);
    try {
      await onSubmit({ body: r.body, timeMs: r.timeMs, fileIds: doneIds });
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      el.innerHTML = "";
      setFiles([]);
      setFileError(null);
      setBlank(true);
    } finally {
      setBusy(false);
    }
  };

  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex flex-col gap-2">
      <Popover
        open={menuOpen}
        onOpenChange={(open) => {
          if (!open && trigger) setDismissedStart(trigger.start);
        }}
      >
        <PopoverTrigger asChild>
          <div>
            <div
              ref={editorRef}
              role="textbox"
              aria-multiline="true"
              aria-label={placeholder}
              contentEditable
              suppressContentEditableWarning
              data-placeholder={placeholder}
              className={EDITOR_CLASS}
              onInput={() => {
                const el = editorRef.current;
                if (el && !el.textContent && !el.querySelector("[data-type]")) el.innerHTML = "";
                sync();
                updateTrigger();
              }}
              onFocus={addAutoPill}
              onBlur={() => {
                triggerRef.current = null;
                setTrigger(null);
                // leaving it empty drops the auto pill again
                const el = editorRef.current;
                if (el && readEditor(el).blank && filesRef.current.length === 0) {
                  el.innerHTML = "";
                  setBlank(true);
                }
              }}
              onKeyDown={(e) => {
                // keep editor shortcuts (space, delete, ctrl+z...) from firing while typing
                e.stopPropagation();
                if (menuOpen) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => (i + 1) % items.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => (i - 1 + items.length) % items.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    apply(items[activeIdx]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (trigger) setDismissedStart(trigger.start);
                    return;
                  }
                }
                // shift+enter keeps the browser's default (a line break)
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit();
                }
              }}
              onPaste={(e) => {
                const imgs = Array.from(e.clipboardData.files).filter((f) =>
                  f.type.startsWith("image/"),
                );
                e.preventDefault();
                if (imgs.length) {
                  addFiles(imgs);
                  return;
                }
                const text = e.clipboardData.getData("text/plain");
                if (text) document.execCommand("insertText", false, text);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="z-[300] p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {items.map((item, i) => (
            <div
              key={item.kind === "time" ? "time" : item.person.userId}
              onMouseDown={keepFocus}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => apply(item)}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-3 py-2 text-zinc-200",
                i === activeIdx && "bg-zinc-800/50",
              )}
            >
              {item.kind === "time" ? (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock size={16} />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm">Timestamp</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmtPill(getTimeMs?.() ?? 0)}
                  </span>
                </>
              ) : (
                <>
                  <Avatar name={item.person.name} avatarUrl={item.person.avatarUrl} />
                  <p className="min-w-0 flex-1 truncate text-sm">{item.person.name}</p>
                </>
              )}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.key}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-md border",
                f.status === "error" ? "border-red-500" : "border-border",
              )}
            >
              <img src={f.preview} alt="" className="h-full w-full object-cover" />
              {f.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
              {f.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/40 text-xs font-semibold text-white">
                  Failed
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(f.key)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {fileError && <p className="text-xs text-red-500">{fileError}</p>}

      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={COMMENT_MAX_IMAGES > 1}
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Tip label="Mention someone" shortcut="@">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:!bg-accent/30"
            aria-label="Mention someone"
            onMouseDown={keepFocus}
            onClick={startMention}
          >
            <AtSign size={20} />
          </Button>
        </Tip>
        <Tip label="Add image">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:!bg-accent/30"
            aria-label="Add image"
            disabled={files.length >= COMMENT_MAX_IMAGES}
            onMouseDown={keepFocus}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={20} />
          </Button>
        </Tip>
        <Tip label="Send" shortcut="Enter">
          <Button
            size="sm"
            variant="default"
            className="ml-auto h-8 border border-border"
            onClick={() => void submit()}
            disabled={!canSend}
          >
            Send
          </Button>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry / Thread
// ---------------------------------------------------------------------------

export function Entry({
  item,
  onDelete,
  timeMs,
  onSeek,
}: {
  item: CommentReply;
  onDelete: () => void;
  // comment.time_ms: only used to show a leading pill on comments written before
  // pills lived inside the text
  timeMs?: number | null;
  onSeek?: (ms: number) => void;
}) {
  const now = useNow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<CommentAttachment | null>(null);
  const attachments = item.attachments ?? [];
  const legacyPill = timeMs != null && !hasTimeToken(item.body);

  return (
    <div className="flex gap-3">
      <Avatar name={item.authorName} avatarUrl={item.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            <p className="max-w-full truncate text-xs text-zinc-200">{item.authorName}</p>
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              {formatCreatedAt(item.createdAt, now)}
            </p>
          </div>
          {item.canDelete && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <Tip label="More">
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </PopoverTrigger>
              </Tip>
              <PopoverContent
                align="end"
                className="z-[300] w-32 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="cursor-pointer px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Delete
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {(item.body || legacyPill) && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-pretty">
            {legacyPill && <TimePill ms={timeMs} onSeek={onSeek} className="mr-2" />}
            {renderBody(item.body, onSeek)}
          </p>
        )}

        {attachments.length > 0 && (
          <div
            className={cn(
              "mt-3 grid gap-2",
              attachments.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {attachments.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={(e) => {
                  e.stopPropagation(); // don't open the thread
                  setPreview(a);
                }}
                className="block cursor-zoom-in overflow-hidden rounded-md border border-border"
              >
                <img
                  src={a.url}
                  alt={a.name}
                  className={cn(
                    "w-full object-cover",
                    attachments.length === 1 ? "max-h-48" : "aspect-video",
                  )}
                />
              </button>
            ))}
          </div>
        )}
        {preview && (
          <ImagePreview src={preview.url} alt={preview.name} onClose={() => setPreview(null)} />
        )}
      </div>
    </div>
  );
}

function Thread({
  thread,
  canComment,
  focused,
  onSeek,
  onOpen,
  onDeleteComment,
}: {
  thread: CommentThread;
  canComment: boolean;
  focused: boolean;
  onSeek: (ms: number) => void;
  onOpen: () => void;
  onDeleteComment: () => void;
}) {
  const n = thread.replies.length;
  const images =
    (thread.attachments ?? []).length +
    thread.replies.reduce((sum, r) => sum + (r.attachments ?? []).length, 0);
  const resolved = thread.status === "resolved";
  const clickable = n > 0 || canComment;

  const parts: string[] = [];
  if (n > 0) parts.push(`${n} ${n === 1 ? "reply" : "replies"}`);
  if (images > 0) parts.push(`${images} ${images === 1 ? "image" : "images"}`);
  const summary = parts.length ? parts.join(" · ") : canComment ? "Reply" : null;

  return (
    <div
      id={`comment-${thread.id}`}
      onClick={clickable ? onOpen : undefined}
      className={cn(
        "flex scroll-my-4 flex-col gap-4 rounded-md border p-3 shadow-xs transition-all",
        clickable && "cursor-pointer",
        focused
          ? "border-primary bg-primary/5"
          : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        resolved && !focused && "opacity-70",
      )}
    >
      <Entry
        item={thread}
        onDelete={onDeleteComment}
        timeMs={thread.timeMs}
        onSeek={onSeek}
      />

      {(summary || resolved) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {summary && <span>{summary}</span>}
          {resolved && (
            <span className="inline-flex items-center gap-1">
              <Check size={12} />
              Resolved
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function CommentsPanel() {
  const {
    data,
    error,
    post,
    remove,
    focusedId,
    setFocusedId,
    setOpenThreadId,
    filter,
    setFilter,
    sort,
    setSort,
  } = useCommentsStore();
  const { setFloatingControl, setActiveRightItem } = useLayoutStore();
  const playerRef = useStore((s) => s.playerRef);
  const fps = useStore((s) => s.fps);
  const activeIds = useStore((s) => s.activeIds);
  const userId = useStore((s) => s.userId);
  const { seek, currentMs } = usePlayheadControls();
  const [composing, setComposing] = useState(false);
  const currentFrame = useCurrentPlayerFrame(playerRef ?? null);
  // A comment is stored as ms from the exact playhead frame, so this round-trips.
  const atPlayhead = (ms: number | null) =>
    ms != null && Math.round((ms * fps) / 1000) === currentFrame;

  const visible = useMemo(() => {
    const byDate = (a: CommentThread, b: CommentThread) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest first
    const list = (data?.threads ?? []).filter((t) => {
      if (filter === "open") return t.status !== "resolved";
      if (filter === "resolved") return t.status === "resolved";
      if (filter === "mentions") return mentionsUser(t, userId);
      return true;
    });
    return list.sort(
      sort === "timestamp"
        ? // earliest first, comments without a time at the end (NaN falls through to the tie-break)
        (a, b) =>
          (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity) || -byDate(a, b)
        : byDate,
    );
  }, [data, filter, sort, userId]);

  // selecting something while comments are open goes back to the controls
  const selectionKey = activeIds.join(",");
  const lastSelection = useRef(selectionKey);
  useEffect(() => {
    if (selectionKey !== lastSelection.current && activeIds.length > 0) {
      setActiveRightItem("controls");
    }
    lastSelection.current = selectionKey;
  }, [selectionKey, activeIds.length, setActiveRightItem]);

  useEffect(() => {
    if (!focusedId || !data) return;
    document
      .getElementById(`comment-${focusedId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId, data]);

  useEffect(() => () => setFocusedId(null), [setFocusedId]);

  return (
    <div className="w-full flex-none">
      <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="m-0 flex min-w-0 flex-col gap-6 border-0 p-4">
            {data && !data.canComment && (
              <div className="flex items-center gap-2 text-sm font-normal text-primary">
                <Eye size={16} />
                <span>You only have view access to comments</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="font-sans text-sm font-semibold">Comments</Label>
                <div className="-my-1.5 flex gap-1 items-center">
                  <OptionMenu
                    label="Filter"
                    title="Filter"
                    icon={<ListFilter size={20} />}
                    value={filter}
                    active={filter !== "all"}
                    options={FILTER_OPTIONS}
                    onChange={setFilter}
                  />
                  <OptionMenu
                    label="Sort"
                    title="Sort by"
                    icon={<ArrowUpDown size={20} />}
                    value={sort}
                    options={SORT_OPTIONS}
                    onChange={setSort}
                  />
                  {data?.canComment && (
                    <Tip label={composing ? "Cancel" : "Add comment"}>
                      <Button
                        onClick={() => setComposing((v) => !v)}
                        className={cn("hover:!bg-accent/30", composing && "bg-accent/30")}
                        variant="ghost"
                        size="icon"
                        aria-label="Add comment"
                      >
                        <Plus size={20} />
                      </Button>
                    </Tip>
                  )}
                </div>
              </div>

              {data?.canComment && composing && (
                <Composer
                  autoFocus
                  autoPill
                  placeholder="Add a comment…"
                  getTimeMs={currentMs}
                  onSubmit={async ({ body, timeMs, fileIds }) => {
                    await post(body, { timeMs, fileIds });
                    setComposing(false);
                  }}
                />
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              {!error && !data && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {data && data.threads.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}
              {data && data.threads.length > 0 && visible.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments match this filter.</p>
              )}

              {data && visible.map((t) => (
                <Thread
                  key={t.id}
                  thread={t}
                  canComment={data.canComment}
                  focused={atPlayhead(t.timeMs)}
                  onSeek={seek}
                  onOpen={() => {
                    setOpenThreadId(t.id);
                    setFloatingControl("comment-thread");
                  }}
                  onDeleteComment={() => remove({ commentId: t.id })}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}