import type { ReactNode } from "react";
import { Download, FileText, Gavel } from "lucide-react";
import { chatAttachmentUrl } from "@/components/ui/inbox/inbox_functions/inbox_upload_image";

export function titleCase(value?: string | null, fallback = "") {
  const text = String(value || fallback)
    .replace(/[_-]+/g, " ")
    .trim();
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatWhen(value?: string | null, withTime = true) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function isClosedStatus(status?: string | null) {
  return String(status || "").toLowerCase() === "closed";
}

const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  disputer: {
    label: "Disputer",
    className: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  },
  disputee: {
    label: "Disputee",
    className: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200",
  },
  staff: {
    label: "Staff",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  },
  community: {
    label: "Community",
    className: "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
  },
};

export function roleKey(role?: string | null) {
  const value = String(role || "").toLowerCase();
  if (value === "public") return "community";
  return ROLE_STYLES[value] ? value : null;
}

export function RoleChip({ role }: { role?: string | null }) {
  const key = roleKey(role);
  if (!key) return null;
  const style = ROLE_STYLES[key];
  return (
    <span className={`rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}

function statusClass(status?: string | null) {
  const value = String(status || "open").toLowerCase();
  if (value === "closed") {
    return "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";
  }
  if (value === "under review" || value === "under_review") {
    return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
}

export function StatusPill({ status }: { status?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(status)}`}>
      {titleCase(status, "Open")}
    </span>
  );
}

export function VisibilityPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isPublic
          ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
          : "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
      }`}
    >
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

export type ViewerRole = "disputer" | "disputee" | "community" | null | undefined;

/**
 * Who can read a dispute message, written from the reader's own point of view.
 * `null` means the message carries no restriction worth announcing (it is public).
 */
export function audienceNotice(audience?: string | null, viewerRole?: ViewerRole) {
  const value = String(audience || "").toLowerCase();
  const otherParty = viewerRole === "disputee" ? "the disputer" : "the disputee";
  if (value === "public" || value === "") return null;
  if (value === "staff") {
    return { label: "Staff only", detail: "Only staff can see this message.", private: true };
  }
  if (value === "author_and_staff") {
    return {
      label: "Only you and staff",
      detail: `Only you and staff can see this. ${
        viewerRole === "community" ? "It stays hidden until staff publish it." : "The other party can’t read it."
      }`,
      private: true,
    };
  }
  if (value === "disputer" || value === "disputee") {
    const aimedAtViewer =
      (value === "disputer" && viewerRole === "disputer") ||
      (value === "disputee" && viewerRole === "disputee");
    if (aimedAtViewer) {
      return {
        label: "Only you and staff",
        detail: `Staff sent this to you alone. ${titleCase(otherParty)} can’t see it.`,
        private: true,
      };
    }
    return {
      label: value === "disputer" ? "Disputer and staff" : "Disputee and staff",
      detail: `Staff sent this to ${value === "disputer" ? "the disputer" : "the disputee"} only.`,
      private: true,
    };
  }
  if (value === "parties") {
    return {
      label: "Both parties and staff",
      detail: "The disputer, the disputee, and staff can see this. It is not on the public page.",
      private: true,
    };
  }
  return null;
}

/** Badge naming who can read a message. Renders nothing for public messages. */
export function AudiencePill({
  audience,
  viewerRole,
}: {
  audience?: string | null;
  viewerRole?: ViewerRole;
}) {
  const notice = audienceNotice(audience, viewerRole);
  if (!notice) return null;
  return (
    <span
      title={notice.detail}
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <LockIcon />
      {notice.label}
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function Avatar({ name, role }: { name?: string | null; role?: string | null }) {
  const key = roleKey(role);
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  const tone =
    key === "disputer"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
      : key === "disputee"
        ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200"
        : key === "staff"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-200";
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {initial}
    </span>
  );
}

export type DisputeAttachment = {
  attachment_id?: string;
  attachment_type?: string;
  attachment_key?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
};

function formatBytes(size?: number) {
  const bytes = Number(size || 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Images, video and files posted with a dispute message. */
export function DisputeAttachments({
  attachments,
  onPreview,
}: {
  attachments?: DisputeAttachment[] | null;
  onPreview?: (url: string, type: string) => void;
}) {
  const files = (attachments || []).filter((file) => file?.attachment_key || file?.attachment_url);
  if (!files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const key = file.attachment_key || file.attachment_url || "";
        const url = chatAttachmentUrl(key);
        const type = String(file.attachment_type || "file").toLowerCase();
        const name = file.attachment_name || "Attachment";
        const id = file.attachment_id || `${key}-${index}`;

        if (type === "image" || type === "gif") {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPreview?.(url, "image")}
              title={name}
              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
            >
              <img src={url} alt={name} loading="lazy" className="h-full w-full object-cover" />
            </button>
          );
        }

        if (type === "video") {
          return (
            <video
              key={id}
              src={url}
              controls
              preload="metadata"
              className="h-32 max-w-full rounded-xl border border-gray-200 bg-black dark:border-white/10"
            />
          );
        }

        return (
          <a
            key={id}
            href={url}
            target="_blank"
            rel="noreferrer"
            download={name}
            className="flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs transition hover:border-gray-400 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30 dark:hover:bg-white/10"
          >
            <FileText className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
            <span className="min-w-0">
              <span className="block max-w-[14rem] truncate font-semibold text-gray-800 dark:text-zinc-200">
                {name}
              </span>
              {file.attachment_size ? (
                <span className="block text-[10px] text-gray-500 dark:text-zinc-500">
                  {formatBytes(file.attachment_size)}
                </span>
              ) : null}
            </span>
            <Download className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          </a>
        );
      })}
    </div>
  );
}

/**
 * A ruling posted by the platform when a case is resolved or reopened.
 * Attributed to the Dispute Resolution service, never to an individual staff member.
 */
export function isDisputeDecision(message?: {
  authorRole?: string | null;
  authorType?: string | null;
}) {
  const role = String(message?.authorRole || "").toLowerCase();
  const type = String(message?.authorType || "").toLowerCase();
  return role === "resolution" || type === "system";
}

/** Header strip for a decision message, so the outcome reads as final, not as a chat line. */
export function DecisionHeader({ title = "Final decision" }: { title?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200">
      <Gavel className="h-3 w-3" />
      {title}
    </span>
  );
}

export const DECISION_CARD_CLASS =
  "border-l-4 border-l-indigo-500 bg-indigo-50/70 dark:border-l-indigo-400 dark:bg-indigo-500/[0.08]";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-dark-surface ${className}`}
    >
      {children}
    </div>
  );
}
